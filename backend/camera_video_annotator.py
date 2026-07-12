from pathlib import Path
from typing import Any, Generator

import cv2
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
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
    / "disaster_yolo_v1"
    / "weights"
    / "best.pt"
)

# Base YOLO is currently better for live person/vehicle stream.
# The custom model needs more manually corrected labels before using it live.
DEFAULT_MODEL_PATH = "yolov8n.pt"

_MODEL: YOLO | None = None


class AnnotateVideoRequest(BaseModel):
    source_id: str
    confidence_threshold: float = 0.45
    max_frames: int = 900


def get_model() -> YOLO:
    global _MODEL

    if _MODEL is None:
        _MODEL = YOLO(DEFAULT_MODEL_PATH)

    return _MODEL


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
        "train",
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

    box_area_ratio = (box_width * box_height) / max(
        float(frame_width * frame_height),
        1.0,
    )

    aspect_ratio = box_width / max(box_height, 1.0)

    if label == "vehicle":
        if box_area_ratio < 0.00001:
            return False

        if box_area_ratio > 0.08:
            return False

        if aspect_ratio < 0.25 or aspect_ratio > 5.0:
            return False

    if label == "person":
        if box_area_ratio < 0.00001:
            return False

        if box_area_ratio > 0.15:
            return False

        if aspect_ratio < 0.15 or aspect_ratio > 2.5:
            return False

    return True


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

    hud_text = (
        f"AERONEXUS LIVE YOLO STREAM | {source_id} | "
        f"FRAME {frame_index} | DETECTIONS {detections}"
    )

    cv2.putText(
        frame,
        hud_text,
        (14, 27),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.58,
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
        imgsz=960,
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


def mjpeg_frame_generator(
    source_id: str,
    confidence_threshold: float,
    frame_skip: int,
) -> Generator[bytes, None, None]:
    if source_id not in VIDEO_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid source_id")

    video_path = VIDEO_SOURCES[source_id]

    if not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Video file not found: {video_path}",
        )

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        raise HTTPException(
            status_code=500,
            detail=f"Could not open video: {video_path}",
        )

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

            encode_success, encoded_frame = cv2.imencode(
                ".jpg",
                frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), 82],
            )

            if not encode_success:
                frame_index += 1
                continue

            jpg_bytes = encoded_frame.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n"
            )

            frame_index += 1
    finally:
        capture.release()


@router.get("/annotated-stream/{source_id}")
def annotated_stream(
    source_id: str,
    confidence_threshold: float = Query(default=0.45, ge=0.1, le=0.95),
    frame_skip: int = Query(default=3, ge=1, le=10),
) -> StreamingResponse:
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
    if payload.source_id not in VIDEO_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid source_id")

    stream_url = (
        f"/api/camera-ai/annotated-stream/{payload.source_id}"
        f"?confidence_threshold={payload.confidence_threshold}"
        f"&frame_skip=3"
    )

    return {
        "ok": True,
        "source_id": payload.source_id,
        "model": DEFAULT_MODEL_PATH,
        "custom_model_exists": CUSTOM_MODEL_PATH.exists(),
        "mode": "mjpeg_stream",
        "annotated_video_url": stream_url,
    }