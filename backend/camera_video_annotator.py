from pathlib import Path
from typing import Any, Generator

import cv2
import numpy as np
import torch
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from ultralytics import YOLO


router = APIRouter(prefix="/api/camera-ai", tags=["camera-ai-annotator"])

PROJECT_ROOT = Path(__file__).resolve().parents[1]

VIDEO_SOURCES = {
    "city-surveillance": PROJECT_ROOT
    / "public"
    / "videos"
    / "drone-city-surveillance.mp4",
    "disaster-response": PROJECT_ROOT
    / "public"
    / "videos"
    / "drone-disaster-response.mp4",
    "forest-patrol": PROJECT_ROOT
    / "public"
    / "videos"
    / "drone-forest-patrol.mp4",
}

CUSTOM_MODEL_PATH = (
    PROJECT_ROOT
    / "runs"
    / "aeronexus"
    / "disaster_yolo26m_gpu_v1"
    / "weights"
    / "best.pt"
)

PREFERRED_MODEL_PATH = (
    str(CUSTOM_MODEL_PATH) if CUSTOM_MODEL_PATH.exists() else "yolo26m.pt"
)

FALLBACK_MODEL_PATH = "yolo11m.pt"

# COCO class IDs:
# 0 person, 1 bicycle, 2 car, 3 motorcycle, 5 bus, 7 truck
COCO_ALLOWED_CLASSES = [0, 1, 2, 3, 5, 7]

_MODEL: Any | None = None
_LOADED_MODEL_NAME = PREFERRED_MODEL_PATH
_MODEL_LOAD_ERROR: str | None = None


class AnnotateVideoRequest(BaseModel):
    source_id: str
    confidence_threshold: float = 0.30
    max_frames: int = 900


def get_device() -> int | str:
    return 0 if torch.cuda.is_available() else "cpu"


def use_half_precision() -> bool:
    return torch.cuda.is_available()


def get_model() -> Any:
    global _MODEL
    global _LOADED_MODEL_NAME
    global _MODEL_LOAD_ERROR

    if _MODEL is not None:
        return _MODEL

    try:
        _MODEL = YOLO(PREFERRED_MODEL_PATH)
        _LOADED_MODEL_NAME = PREFERRED_MODEL_PATH
        _MODEL_LOAD_ERROR = None
        return _MODEL
    except Exception as preferred_error:
        _MODEL_LOAD_ERROR = f"Preferred model failed: {preferred_error}"

    try:
        _MODEL = YOLO(FALLBACK_MODEL_PATH)
        _LOADED_MODEL_NAME = FALLBACK_MODEL_PATH
        return _MODEL
    except Exception as fallback_error:
        _MODEL_LOAD_ERROR = (
            f"{_MODEL_LOAD_ERROR}; fallback model failed: {fallback_error}"
        )
        raise RuntimeError(_MODEL_LOAD_ERROR) from fallback_error


def normalize_yolo_label(raw_label: str) -> str | None:
    raw_label = raw_label.lower().strip()

    if raw_label == "person":
        return "person"

    if raw_label in {
        "car",
        "truck",
        "bus",
        "motorcycle",
        "bicycle",
    }:
        return "vehicle"

    return None


def get_color_for_label(label: str) -> tuple[int, int, int]:
    if label == "person":
        return (255, 211, 41)

    if label == "vehicle":
        return (60, 178, 246)

    return (143, 229, 73)


def is_valid_box(
    label: str,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    frame_width: int,
    frame_height: int,
) -> bool:
    box_width = max(0.0, x2 - x1)
    box_height = max(0.0, y2 - y1)

    if box_width <= 0 or box_height <= 0:
        return False

    frame_area = max(float(frame_width * frame_height), 1.0)
    box_area_ratio = (box_width * box_height) / frame_area
    aspect_ratio = box_width / max(box_height, 1.0)

    if label == "vehicle":
        if box_area_ratio < 0.000003:
            return False

        if box_area_ratio > 0.15:
            return False

        if aspect_ratio < 0.18 or aspect_ratio > 7.0:
            return False

    if label == "person":
        if box_area_ratio < 0.000003:
            return False

        if box_area_ratio > 0.18:
            return False

        if aspect_ratio < 0.10 or aspect_ratio > 3.2:
            return False

    return True


def make_error_frame(message: str) -> bytes:
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    frame[:, :] = (5, 13, 24)

    cv2.putText(
        frame,
        "AERONEXUS STREAM ERROR",
        (30, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (41, 211, 255),
        2,
        cv2.LINE_AA,
    )

    lines = [message[i : i + 58] for i in range(0, len(message), 58)]

    y = 130
    for line in lines[:6]:
        cv2.putText(
            frame,
            line,
            (30, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.48,
            (80, 120, 255),
            1,
            cv2.LINE_AA,
        )
        y += 30

    ok, encoded_frame = cv2.imencode(".jpg", frame)

    if not ok:
        return b""

    return encoded_frame.tobytes()


def draw_detection_box(
    frame: Any,
    label: str,
    confidence: float,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
) -> None:
    color = get_color_for_label(label)

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    caption = f"{label.upper()} {confidence * 100:.0f}%"

    text_size, _ = cv2.getTextSize(
        caption,
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        1,
    )

    text_width, text_height = text_size
    box_top = max(0, y1 - text_height - 10)

    cv2.rectangle(
        frame,
        (x1, box_top),
        (x1 + text_width + 8, box_top + text_height + 8),
        color,
        -1,
    )

    cv2.putText(
        frame,
        caption,
        (x1 + 4, box_top + text_height + 3),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (5, 13, 24),
        1,
        cv2.LINE_AA,
    )


def draw_hud(
    frame: Any,
    source_id: str,
    frame_index: int,
    detections: int,
) -> None:
    _, width = frame.shape[:2]

    cv2.rectangle(frame, (0, 0), (width, 42), (5, 13, 24), -1)

    device_name = (
        torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    )

    hud_text = (
        f"AERONEXUS LIVE YOLO STREAM | {source_id} | "
        f"FRAME {frame_index} | DETECTIONS {detections} | "
        f"{_LOADED_MODEL_NAME} | {device_name}"
    )

    cv2.putText(
        frame,
        hud_text[:135],
        (14, 27),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (41, 211, 255),
        1,
        cv2.LINE_AA,
    )


def detect_and_draw_frame(
    frame: Any,
    source_id: str,
    frame_index: int,
    confidence_threshold: float,
) -> int:
    model = get_model()

    results = model.predict(
        source=frame,
        conf=confidence_threshold,
        imgsz=1280,
        device=get_device(),
        half=use_half_precision(),
        classes=COCO_ALLOWED_CLASSES,
        max_det=100,
        verbose=False,
    )

    detection_count = 0
    frame_height, frame_width = frame.shape[:2]

    if not results:
        draw_hud(frame, source_id, frame_index, detection_count)
        return detection_count

    result = results[0]
    names = result.names

    if result.boxes is None:
        draw_hud(frame, source_id, frame_index, detection_count)
        return detection_count

    for box in result.boxes:
        class_id = int(box.cls[0].cpu().item())
        confidence = float(box.conf[0].cpu().item())

        raw_label = str(names.get(class_id, class_id)).lower().strip()
        label = normalize_yolo_label(raw_label)

        if label is None:
            continue

        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()

        if not is_valid_box(
            label=label,
            x1=x1,
            y1=y1,
            x2=x2,
            y2=y2,
            frame_width=frame_width,
            frame_height=frame_height,
        ):
            continue

        draw_detection_box(
            frame=frame,
            label=label,
            confidence=confidence,
            x1=int(x1),
            y1=int(y1),
            x2=int(x2),
            y2=int(y2),
        )

        detection_count += 1

    draw_hud(frame, source_id, frame_index, detection_count)

    return detection_count


def validate_source(source_id: str) -> Path:
    if source_id not in VIDEO_SOURCES:
        raise HTTPException(status_code=400, detail=f"Invalid source_id: {source_id}")

    video_path = VIDEO_SOURCES[source_id]

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Video file not found: {video_path}",
        )

    return video_path


def encode_frame_as_jpeg(frame: Any) -> bytes:
    encode_success, encoded_frame = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), 82],
    )

    if not encode_success:
        raise RuntimeError("Could not encode frame as JPEG")

    return encoded_frame.tobytes()


def mjpeg_frame_generator(
    source_id: str,
    confidence_threshold: float,
    frame_skip: int,
) -> Generator[bytes, None, None]:
    try:
        video_path = validate_source(source_id)
        capture = cv2.VideoCapture(str(video_path))

        if not capture.isOpened():
            raise RuntimeError(f"Could not open video: {video_path}")

        frame_index = 0

        try:
            while True:
                success, frame = capture.read()

                if not success:
                    capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    frame_index = 0
                    continue

                if frame_skip > 1 and frame_index % frame_skip != 0:
                    frame_index += 1
                    continue

                detect_and_draw_frame(
                    frame=frame,
                    source_id=source_id,
                    frame_index=frame_index,
                    confidence_threshold=confidence_threshold,
                )

                jpg_bytes = encode_frame_as_jpeg(frame)

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n"
                )

                frame_index += 1
        finally:
            capture.release()

    except Exception as error:
        jpg_bytes = make_error_frame(str(error))

        while True:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n"
            )


@router.get("/annotator-health")
def annotator_health() -> dict[str, Any]:
    return {
        "ok": True,
        "project_root": str(PROJECT_ROOT),
        "preferred_model": PREFERRED_MODEL_PATH,
        "loaded_model": _LOADED_MODEL_NAME,
        "fallback_model": FALLBACK_MODEL_PATH,
        "model_load_error": _MODEL_LOAD_ERROR,
        "custom_model_exists": CUSTOM_MODEL_PATH.exists(),
        "cuda_available": torch.cuda.is_available(),
        "torch_version": torch.__version__,
        "device": get_device(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "sources": {
            source_id: {
                "path": str(path),
                "exists": path.exists(),
            }
            for source_id, path in VIDEO_SOURCES.items()
        },
    }


@router.get("/annotated-frame/{source_id}")
def annotated_frame(
    source_id: str,
    confidence_threshold: float = Query(default=0.30, ge=0.1, le=0.95),
) -> Response:
    video_path = validate_source(source_id)

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        raise HTTPException(
            status_code=500,
            detail=f"Could not open video: {video_path}",
        )

    try:
        success, frame = capture.read()

        if not success:
            raise HTTPException(status_code=500, detail="Could not read first frame")

        detect_and_draw_frame(
            frame=frame,
            source_id=source_id,
            frame_index=0,
            confidence_threshold=confidence_threshold,
        )

        jpg_bytes = encode_frame_as_jpeg(frame)

        return Response(content=jpg_bytes, media_type="image/jpeg")
    finally:
        capture.release()


@router.get("/annotated-stream/{source_id}")
def annotated_stream(
    source_id: str,
    confidence_threshold: float = Query(default=0.30, ge=0.1, le=0.95),
    frame_skip: int = Query(default=2, ge=1, le=10),
) -> StreamingResponse:
    validate_source(source_id)

    return StreamingResponse(
        mjpeg_frame_generator(
            source_id=source_id,
            confidence_threshold=confidence_threshold,
            frame_skip=frame_skip,
        ),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.post("/annotate-video")
def annotate_video(payload: AnnotateVideoRequest) -> dict[str, Any]:
    validate_source(payload.source_id)

    stream_url = (
        f"/api/camera-ai/annotated-stream/{payload.source_id}"
        f"?confidence_threshold={payload.confidence_threshold}"
        f"&frame_skip=2"
    )

    return {
        "ok": True,
        "source_id": payload.source_id,
        "preferred_model": PREFERRED_MODEL_PATH,
        "loaded_model": _LOADED_MODEL_NAME,
        "fallback_model": FALLBACK_MODEL_PATH,
        "model_load_error": _MODEL_LOAD_ERROR,
        "custom_model_exists": CUSTOM_MODEL_PATH.exists(),
        "cuda_available": torch.cuda.is_available(),
        "torch_version": torch.__version__,
        "device": get_device(),
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "mode": "mjpeg_stream",
        "annotated_video_url": stream_url,
    }