from __future__ import annotations

import asyncio
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None


router = APIRouter(prefix="/api/camera-ai", tags=["camera-video-annotator"])

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = Path(__file__).resolve().parent

VIDEO_SOURCES = {
    "city-surveillance": {
        "title": "Drone City Surveillance",
        "path": PROJECT_ROOT / "public" / "videos" / "drone-city-surveillance.mp4",
    },
    "disaster-response": {
        "title": "Disaster Response Flight",
        "path": PROJECT_ROOT / "public" / "videos" / "drone-disaster-response.mp4",
    },
    "forest-patrol": {
        "title": "Forest Patrol Flight",
        "path": PROJECT_ROOT / "public" / "videos" / "drone-forest-patrol.mp4",
    },
    "fire-response-demo": {
        "title": "Generated Fire EO/IR Simulation",
        "path": PROJECT_ROOT / "public" / "videos" / "fire-response-demo.mp4",
    },
    "fire-response-1": {
        "title": "Fire Response 1",
        "path": PROJECT_ROOT / "public" / "videos" / "Fire_Response_1.MP4",
    },
}

LOCAL_MODELS = [
    BACKEND_ROOT / "yolo26m.pt",
    BACKEND_ROOT / "yolov8n.pt",
    PROJECT_ROOT / "runs" / "aeronexus" / "disaster_yolo_v1" / "weights" / "best.pt",
]

FIRE_LABELS = {
    "fire",
    "flame",
    "wildfire",
    "blaze",
    "burning",
    "flame-signature",
    "fire-color-signature",
}

SMOKE_LABELS = {
    "smoke",
    "haze",
    "smoke-signature",
    "smoke-haze-signature",
}

VEHICLE_LABELS = {
    "car",
    "truck",
    "bus",
    "motorcycle",
    "motorbike",
    "bicycle",
    "boat",
    "train",
    "vehicle",
}

_yolo_model: Any | None = None


class AnnotateVideoRequest(BaseModel):
    source_id: str
    confidence_threshold: float = 0.3
    max_frames: int = 900


def require_cv() -> None:
    if cv2 is None or np is None:
        raise RuntimeError("OpenCV is not installed. Run: pip install opencv-python numpy")


def normalize_label(label: str) -> str:
    return label.strip().lower().replace(" ", "-")


def get_model_path() -> str:
    for model_path in LOCAL_MODELS:
        if model_path.exists():
            return str(model_path)

    return "yolov8n.pt"


def get_yolo_model() -> Any | None:
    global _yolo_model

    if YOLO is None:
        return None

    if _yolo_model is None:
        _yolo_model = YOLO(get_model_path())

    return _yolo_model


def resize_frame(frame: Any, width: int = 640) -> Any:
    height, current_width = frame.shape[:2]

    if current_width <= width:
        return frame

    ratio = width / current_width
    new_height = int(height * ratio)

    return cv2.resize(frame, (width, new_height))


def get_box_color(label: str) -> tuple[int, int, int]:
    clean_label = normalize_label(label)

    if clean_label in FIRE_LABELS:
        return (0, 75, 255)

    if clean_label in SMOKE_LABELS:
        return (180, 180, 180)

    if clean_label == "person":
        return (255, 170, 40)

    if clean_label in VEHICLE_LABELS:
        return (40, 210, 255)

    return (90, 169, 255)


def draw_detection_box(
    frame: Any,
    label: str,
    confidence: float,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
) -> None:
    color = get_box_color(label)

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    text = f"{label.upper()} {round(confidence * 100)}%"
    text_size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)

    label_w = text_size[0] + 12
    label_h = text_size[1] + 12

    cv2.rectangle(frame, (x1, max(0, y1 - label_h)), (x1 + label_w, y1), color, -1)
    cv2.putText(
        frame,
        text,
        (x1 + 6, max(12, y1 - 7)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (0, 0, 0),
        1,
        cv2.LINE_AA,
    )


def draw_hud(frame: Any, source_title: str, mode: str) -> None:
    _height, width = frame.shape[:2]

    cv2.rectangle(frame, (12, 12), (410, 48), (5, 8, 14), -1)
    cv2.rectangle(frame, (12, 12), (410, 48), (0, 190, 255), 1)
    cv2.putText(
        frame,
        f"AERONEXUS · {source_title[:26]}",
        (24, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.47,
        (0, 210, 255),
        1,
        cv2.LINE_AA,
    )

    cv2.rectangle(frame, (width - 265, 12), (width - 12, 48), (5, 8, 14), -1)
    cv2.rectangle(frame, (width - 265, 12), (width - 12, 48), (73, 229, 143), 1)
    cv2.putText(
        frame,
        mode,
        (width - 252, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.46,
        (73, 229, 143),
        1,
        cv2.LINE_AA,
    )


def extract_yolo_boxes(frame: Any, confidence_threshold: float) -> list[dict[str, Any]]:
    model = get_yolo_model()

    if model is None:
        return []

    try:
        results = model.predict(
            source=frame,
            conf=confidence_threshold,
            verbose=False,
        )
    except Exception:
        return []

    if not results or results[0].boxes is None:
        return []

    result = results[0]
    names = result.names

    boxes: list[dict[str, Any]] = []

    for box in result.boxes:
        confidence = float(box.conf[0].cpu().item())
        class_id = int(box.cls[0].cpu().item())
        raw_label = str(names.get(class_id, class_id))
        label = normalize_label(raw_label)

        if confidence < confidence_threshold:
            continue

        xyxy = box.xyxy[0].cpu().numpy().tolist()
        x1, y1, x2, y2 = [int(value) for value in xyxy]

        boxes.append(
            {
                "label": label,
                "display_label": raw_label,
                "confidence": confidence,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
            }
        )

    return boxes


def create_fire_mask(frame: Any) -> Any:
    require_cv()

    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    blue, green, red = cv2.split(frame)

    lower_red_1 = np.array([0, 90, 130])
    upper_red_1 = np.array([18, 255, 255])

    lower_red_2 = np.array([170, 90, 130])
    upper_red_2 = np.array([180, 255, 255])

    lower_orange = np.array([10, 90, 135])
    upper_orange = np.array([35, 255, 255])

    lower_yellow = np.array([22, 95, 145])
    upper_yellow = np.array([48, 255, 255])

    red_mask_1 = cv2.inRange(hsv, lower_red_1, upper_red_1)
    red_mask_2 = cv2.inRange(hsv, lower_red_2, upper_red_2)
    orange_mask = cv2.inRange(hsv, lower_orange, upper_orange)
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    warm_mask = cv2.bitwise_or(red_mask_1, red_mask_2)
    warm_mask = cv2.bitwise_or(warm_mask, orange_mask)
    warm_mask = cv2.bitwise_or(warm_mask, yellow_mask)

    red_dominant = (
        (red.astype("float32") > green.astype("float32") * 1.05)
        & (red.astype("float32") > blue.astype("float32") * 1.25)
    ).astype("uint8") * 255

    fire_mask = cv2.bitwise_and(warm_mask, red_dominant)

    kernel = np.ones((5, 5), np.uint8)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_OPEN, kernel)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_CLOSE, kernel)
    fire_mask = cv2.dilate(fire_mask, kernel, iterations=1)

    return fire_mask


def extract_fire_boxes(frame: Any) -> list[dict[str, Any]]:
    require_cv()

    height, width = frame.shape[:2]
    frame_area = float(width * height)

    fire_mask = create_fire_mask(frame)

    contours, _ = cv2.findContours(
        fire_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    boxes: list[dict[str, Any]] = []

    for contour in contours[:5]:
        area = float(cv2.contourArea(contour))
        area_pct = (area / frame_area) * 100

        if area_pct < 0.55:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        if w < 16 or h < 16:
            continue

        confidence = min(0.96, 0.62 + area_pct / 12)

        boxes.append(
            {
                "label": "flame-signature",
                "display_label": "Fire / Flame",
                "confidence": confidence,
                "x1": x,
                "y1": y,
                "x2": x + w,
                "y2": y + h,
            }
        )

    return boxes


def encode_jpeg(frame: Any) -> bytes:
    success, buffer = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), 82],
    )

    if not success:
        raise RuntimeError("Could not encode frame")

    return buffer.tobytes()


@router.post("/annotate-video")
def annotate_video(payload: AnnotateVideoRequest):
    if payload.source_id not in VIDEO_SOURCES:
        return {
            "ok": False,
            "error": f"Unknown video source: {payload.source_id}",
        }

    source = VIDEO_SOURCES[payload.source_id]

    if not source["path"].exists():
        return {
            "ok": False,
            "error": f"Video file not found: {source['path']}",
        }

    session_id = uuid.uuid4().hex[:12]
    threshold = max(0.1, min(float(payload.confidence_threshold), 0.9))

    return {
        "ok": True,
        "mode": "live_mjpeg_stream",
        "session_id": session_id,
        "source_id": payload.source_id,
        "source_title": source["title"],
        "annotated_video_url": (
            f"/api/camera-ai/annotated-stream/{payload.source_id}"
            f"?confidence_threshold={threshold}"
            f"&frame_skip=3"
            f"&infer_every=3"
            f"&session={session_id}"
        ),
        "yolo_available": YOLO is not None,
        "model": get_model_path(),
    }


@router.get("/annotated-stream/{source_id}")
async def annotated_stream(
    request: Request,
    source_id: str,
    confidence_threshold: float = 0.3,
    frame_skip: int = 3,
    infer_every: int = 3,
    max_seconds: int = 120,
):
    require_cv()

    if source_id not in VIDEO_SOURCES:
        raise RuntimeError(f"Unknown video source: {source_id}")

    source = VIDEO_SOURCES[source_id]
    video_path = source["path"]

    if not video_path.exists():
        raise RuntimeError(f"Video file not found: {video_path}")

    threshold = max(0.1, min(float(confidence_threshold), 0.9))
    safe_frame_skip = max(1, min(int(frame_skip), 10))
    safe_infer_every = max(1, min(int(infer_every), 10))
    safe_max_seconds = max(20, min(int(max_seconds), 300))

    async def frame_generator():
        capture = cv2.VideoCapture(str(video_path))

        frame_index = 0
        emitted_frames = 0
        started_at = time.monotonic()
        last_boxes: list[dict[str, Any]] = []

        try:
            while True:
                if await request.is_disconnected():
                    break

                if time.monotonic() - started_at > safe_max_seconds:
                    break

                success, frame = capture.read()

                if not success:
                    capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    frame_index = 0
                    await asyncio.sleep(0.02)
                    continue

                if frame_index % safe_frame_skip != 0:
                    frame_index += 1
                    continue

                frame = resize_frame(frame, width=640)

                should_infer = emitted_frames % safe_infer_every == 0

                if should_infer:
                    yolo_boxes = extract_yolo_boxes(frame, threshold)
                    fire_boxes = extract_fire_boxes(frame)

                    merged_boxes = yolo_boxes + fire_boxes
                    merged_boxes.sort(key=lambda item: item["confidence"], reverse=True)
                    last_boxes = merged_boxes[:12]

                for detection in last_boxes:
                    draw_detection_box(
                        frame,
                        detection["display_label"],
                        float(detection["confidence"]),
                        int(detection["x1"]),
                        int(detection["y1"]),
                        int(detection["x2"]),
                        int(detection["y2"]),
                    )

                draw_hud(
                    frame,
                    source_title=source["title"],
                    mode="YOLO + FIRE MODE",
                )

                jpeg_frame = encode_jpeg(frame)

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Cache-Control: no-store\r\n\r\n"
                    + jpeg_frame
                    + b"\r\n"
                )

                emitted_frames += 1
                frame_index += 1

                await asyncio.sleep(1 / 24)

        finally:
            capture.release()

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )