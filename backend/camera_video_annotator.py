from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
from fastapi import APIRouter, HTTPException
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

OUTPUT_DIR = PROJECT_ROOT / "public" / "camera-analysis"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CUSTOM_MODEL_PATH = (
    PROJECT_ROOT
    / "runs"
    / "aeronexus"
    / "disaster_yolo_v1"
    / "weights"
    / "best.pt"
)

DEFAULT_MODEL_PATH = (
    str(CUSTOM_MODEL_PATH) if CUSTOM_MODEL_PATH.exists() else "yolov8n.pt"
)

_MODEL: YOLO | None = None


class AnnotateVideoRequest(BaseModel):
    source_id: str
    confidence_threshold: float = 0.35
    max_frames: int = 900


def get_model() -> YOLO:
    global _MODEL

    if _MODEL is None:
        _MODEL = YOLO(DEFAULT_MODEL_PATH)

    return _MODEL


def get_color_for_label(label: str) -> tuple[int, int, int]:
    label = label.lower()

    if label == "person":
        return (255, 211, 41)

    if label == "vehicle":
        return (60, 178, 246)

    if label == "fire":
        return (77, 77, 255)

    if label == "smoke":
        return (180, 180, 180)

    if label == "flood":
        return (255, 180, 41)

    if label == "blocked_road":
        return (80, 120, 255)

    return (143, 229, 73)


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


def draw_hud(frame: Any, source_id: str, frame_index: int, detections: int) -> None:
    height, width = frame.shape[:2]

    cv2.rectangle(frame, (0, 0), (width, 42), (5, 13, 24), -1)

    hud_text = (
        f"AERONEXUS YOLO LIVE ANALYSIS | {source_id} | "
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
        imgsz=640,
        verbose=False,
    )

    detection_count = 0

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

        label = str(names.get(class_id, class_id)).lower().strip()

        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()

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


@router.post("/annotate-video")
def annotate_video(payload: AnnotateVideoRequest) -> dict[str, Any]:
    if payload.source_id not in VIDEO_SOURCES:
        raise HTTPException(
            status_code=400,
            detail="Only local video files can be annotated. Select city, disaster, or forest video.",
        )

    video_path = VIDEO_SOURCES[payload.source_id]

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

    fps = capture.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 25

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_name = f"annotated_{payload.source_id}_{timestamp}.mp4"
    output_path = OUTPUT_DIR / output_name

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    if not writer.isOpened():
        capture.release()
        raise HTTPException(
            status_code=500,
            detail="Could not create annotated MP4 video.",
        )

    frame_index = 0
    processed_frames = 0
    total_detections = 0

    while True:
        success, frame = capture.read()

        if not success:
            break

        if processed_frames >= payload.max_frames:
            break

        detection_count = detect_and_draw_frame(
            frame=frame,
            source_id=payload.source_id,
            frame_index=frame_index,
            confidence_threshold=payload.confidence_threshold,
        )

        total_detections += detection_count

        writer.write(frame)

        frame_index += 1
        processed_frames += 1

    capture.release()
    writer.release()

    return {
        "ok": True,
        "source_id": payload.source_id,
        "model": DEFAULT_MODEL_PATH,
        "custom_model_exists": CUSTOM_MODEL_PATH.exists(),
        "processed_frames": processed_frames,
        "total_detections": total_detections,
        "annotated_video_url": f"/camera-analysis/{output_name}",
    }