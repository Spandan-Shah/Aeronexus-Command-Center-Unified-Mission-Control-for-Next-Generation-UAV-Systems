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

# For live annotated video, use base YOLO for now.
# Your custom model is still weak because it was trained with very few pseudo labels.
# Later, after manually corrected labels and disaster data, we can switch to best.pt.
DEFAULT_MODEL_PATH = "yolov8n.pt"

_MODEL: YOLO | None = None


class AnnotateVideoRequest(BaseModel):
    source_id: str
    confidence_threshold: float = 0.65
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
        if box_area_ratio < 0.00005:
            return False

        if box_area_ratio > 0.08:
            return False

        if aspect_ratio < 0.25 or aspect_ratio > 5.0:
            return False

    if label == "person":
        if box_area_ratio < 0.00003:
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
    model_name: str,
) -> None:
    _, width = frame.shape[:2]

    cv2.rectangle(frame, (0, 0), (width, 42), (5, 13, 24), -1)

    hud_text = (
        f"AERONEXUS YOLO LIVE ANALYSIS | {source_id} | "
        f"FRAME {frame_index} | DETECTIONS {detections} | MODEL {model_name}"
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
    frame_height, frame_width = frame.shape[:2]

    if not results:
        draw_hud(
            frame=frame,
            source_id=source_id,
            frame_index=frame_index,
            detections=detection_count,
            model_name=DEFAULT_MODEL_PATH,
        )
        return detection_count

    result = results[0]
    names = result.names

    if result.boxes is None:
        draw_hud(
            frame=frame,
            source_id=source_id,
            frame_index=frame_index,
            detections=detection_count,
            model_name=DEFAULT_MODEL_PATH,
        )
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

    draw_hud(
        frame=frame,
        source_id=source_id,
        frame_index=frame_index,
        detections=detection_count,
        model_name=DEFAULT_MODEL_PATH,
    )

    return detection_count


@router.post("/annotate-video")
def annotate_video(payload: AnnotateVideoRequest) -> dict[str, Any]:
    if payload.source_id not in VIDEO_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only local video files can be annotated. "
                "Select city, disaster, or forest video."
            ),
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

    if width <= 0 or height <= 0:
        capture.release()
        raise HTTPException(
            status_code=500,
            detail="Could not read source video size.",
        )

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

    try:
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
    finally:
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