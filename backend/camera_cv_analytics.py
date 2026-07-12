from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from telemetry_hub import ingest_telemetry

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


router = APIRouter(prefix="/api/camera-ai", tags=["camera-ai"])

PROJECT_ROOT = Path(__file__).resolve().parents[1]

VIDEO_SOURCES = {
    "city-surveillance": {
        "title": "Drone City Surveillance",
        "path": PROJECT_ROOT / "public" / "videos" / "drone-city-surveillance.mp4",
        "category": "surveillance",
    },
    "disaster-response": {
        "title": "Disaster Response Flight",
        "path": PROJECT_ROOT / "public" / "videos" / "drone-disaster-response.mp4",
        "category": "disaster",
    },
    "forest-patrol": {
        "title": "Forest Patrol Flight",
        "path": PROJECT_ROOT / "public" / "videos" / "drone-forest-patrol.mp4",
        "category": "patrol",
    },
}

DEFAULT_MODEL_PATH = "yolov8n.pt"

_last_camera_analysis: dict[str, Any] | None = None
_yolo_model: Any | None = None


class AnalyzeVideoRequest(BaseModel):
    source_id: str = "city-surveillance"
    sample_every: int = 8
    max_frames: int = 90
    confidence_threshold: float = 0.35


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def require_opencv() -> None:
    if cv2 is None or np is None:
        raise RuntimeError(
            "OpenCV is not installed. Run: pip install opencv-python-headless numpy"
        )


def require_yolo() -> None:
    if YOLO is None:
        raise RuntimeError("Ultralytics is not installed. Run: pip install ultralytics")


def get_yolo_model() -> Any:
    global _yolo_model

    require_yolo()

    if _yolo_model is None:
        _yolo_model = YOLO(DEFAULT_MODEL_PATH)

    return _yolo_model


def normalize_label(label: str) -> str:
    return label.strip().lower().replace(" ", "-")


def is_vehicle_label(label: str) -> bool:
    return label in {
        "car",
        "truck",
        "bus",
        "motorcycle",
        "bicycle",
        "boat",
        "train",
    }


def is_threat_label(label: str) -> bool:
    return label in {
        "fire",
        "smoke",
        "flood",
        "flame",
        "water-flood",
    }


def calculate_frame_metrics(frame_bgr: Any) -> dict[str, float]:
    require_opencv()

    gray_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray_frame))
    contrast = float(np.std(gray_frame))

    edges = cv2.Canny(gray_frame, 80, 160)
    edge_density = (
        cv2.countNonZero(edges) / (gray_frame.shape[0] * gray_frame.shape[1])
    ) * 100

    return {
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "edge_density": round(edge_density, 3),
    }


def extract_yolo_detections(
    frame_bgr: Any,
    confidence_threshold: float,
) -> list[dict[str, Any]]:
    model = get_yolo_model()

    results = model.predict(
        source=frame_bgr,
        conf=confidence_threshold,
        verbose=False,
    )

    if not results:
        return []

    result = results[0]
    names = result.names

    detections: list[dict[str, Any]] = []

    if result.boxes is None:
        return detections

    for box in result.boxes:
        xyxy = box.xyxy[0].cpu().numpy().tolist()
        confidence = float(box.conf[0].cpu().item())
        class_id = int(box.cls[0].cpu().item())

        raw_label = str(names.get(class_id, class_id))
        label = normalize_label(raw_label)

        x1, y1, x2, y2 = xyxy

        detections.append(
            {
                "label": label,
                "display_label": raw_label,
                "confidence": round(confidence, 3),
                "box": {
                    "x1": round(float(x1), 2),
                    "y1": round(float(y1), 2),
                    "x2": round(float(x2), 2),
                    "y2": round(float(y2), 2),
                },
                "category": get_detection_category(label),
            }
        )

    detections.sort(key=lambda item: item["confidence"], reverse=True)

    return detections


def get_detection_category(label: str) -> str:
    if label == "person":
        return "person"

    if is_vehicle_label(label):
        return "vehicle"

    if is_threat_label(label):
        return "threat"

    return "object"


def calculate_risk_level(detections: list[dict[str, Any]]) -> str:
    threat_detections = [
        detection for detection in detections if detection["category"] == "threat"
    ]
    person_detections = [
        detection for detection in detections if detection["category"] == "person"
    ]
    vehicle_detections = [
        detection for detection in detections if detection["category"] == "vehicle"
    ]

    if threat_detections:
        return "critical"

    if len(person_detections) >= 3 and vehicle_detections:
        return "high"

    if person_detections or vehicle_detections:
        return "medium"

    return "low"


def build_detection_events(
    detections: list[dict[str, Any]],
    source_title: str,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []

    for detection in detections[:8]:
        label = detection["display_label"]
        confidence = detection["confidence"]
        category = detection["category"]

        if category == "threat":
            severity = "critical"
            title = f"{label} detected"
        elif category == "person":
            severity = "medium"
            title = "Person detected"
        elif category == "vehicle":
            severity = "medium"
            title = f"{label} detected"
        else:
            severity = "info"
            title = f"{label} detected"

        events.append(
            {
                "type": detection["label"],
                "severity": severity,
                "confidence": confidence,
                "title": title,
                "message": f"YOLO detected {label} in {source_title} with {round(confidence * 100)}% confidence.",
                "created_at": now_iso(),
            }
        )

    return events


def choose_best_frame_result(
    frame_results: list[dict[str, Any]],
) -> dict[str, Any]:
    if not frame_results:
        raise RuntimeError("No frame results available")

    def score_frame(frame_result: dict[str, Any]) -> float:
        detections = frame_result["detections"]

        if not detections:
            return 0.0

        confidence_sum = sum(detection["confidence"] for detection in detections)
        important_count = sum(
            1
            for detection in detections
            if detection["category"] in {"person", "vehicle", "threat"}
        )

        return confidence_sum + important_count

    return max(frame_results, key=score_frame)


def analyze_video_file(
    source_id: str,
    sample_every: int,
    max_frames: int,
    confidence_threshold: float,
) -> dict[str, Any]:
    require_opencv()
    require_yolo()

    if source_id not in VIDEO_SOURCES:
        raise ValueError("Unknown video source")

    source = VIDEO_SOURCES[source_id]
    video_path = source["path"]

    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    sample_every = max(1, min(sample_every, 30))
    max_frames = max(5, min(max_frames, 300))
    confidence_threshold = clamp(confidence_threshold, 0.10, 0.90)

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        raise RuntimeError(
            "OpenCV could not open the video. The file may be corrupted or codec may be unsupported."
        )

    source_fps = capture.get(cv2.CAP_PROP_FPS) or 0
    total_video_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    sampled_frames = 0
    frame_index = 0
    frame_width = 640
    frame_height = 360

    brightness_values: list[float] = []
    contrast_values: list[float] = []
    edge_values: list[float] = []

    all_detections: list[dict[str, Any]] = []
    frame_results: list[dict[str, Any]] = []

    while sampled_frames < max_frames:
        success, frame = capture.read()

        if not success:
            break

        if frame_index % sample_every != 0:
            frame_index += 1
            continue

        resized_frame = cv2.resize(frame, (frame_width, frame_height))
        metrics = calculate_frame_metrics(resized_frame)

        detections = extract_yolo_detections(
            resized_frame,
            confidence_threshold=confidence_threshold,
        )

        brightness_values.append(metrics["brightness"])
        contrast_values.append(metrics["contrast"])
        edge_values.append(metrics["edge_density"])

        for detection in detections:
            detection_with_frame = {
                **detection,
                "frame_index": frame_index,
            }
            all_detections.append(detection_with_frame)

        frame_results.append(
            {
                "frame_index": frame_index,
                "detections": detections,
                "metrics": metrics,
            }
        )

        sampled_frames += 1
        frame_index += 1

    capture.release()

    if sampled_frames == 0:
        raise RuntimeError("No frames were analyzed from the video")

    best_frame = choose_best_frame_result(frame_results)
    best_detections = best_frame["detections"][:20]

    person_detected = any(
        detection["category"] == "person" for detection in all_detections
    )
    vehicle_detected = any(
        detection["category"] == "vehicle" for detection in all_detections
    )

    fire_detected = any(
        detection["label"] in {"fire", "flame"} for detection in all_detections
    )
    smoke_detected = any(
        detection["label"] == "smoke" for detection in all_detections
    )
    flood_detected = any(
        detection["label"] in {"flood", "water-flood"} for detection in all_detections
    )

    max_confidence = max(
        [detection["confidence"] for detection in all_detections],
        default=0.0,
    )

    risk = calculate_risk_level(all_detections)
    events = build_detection_events(best_detections, source["title"])

    telemetry_payload = {
        "device": f"CameraAI-{source_id}",
        "flightMode": "YOLO_ANALYSIS",
        "ml": {
            "person": person_detected,
            "vehicle": vehicle_detected,
            "fire": fire_detected,
            "smoke": smoke_detected,
            "flood": flood_detected,
            "confidence": round(max_confidence, 3),
        },
        "risk": risk,
        "secureSession": True,
        "sourceVideo": source_id,
    }

    ingest_telemetry(telemetry_payload, "camera_ml")

    return {
        "source_id": source_id,
        "title": source["title"],
        "category": source["category"],
        "video_path": str(video_path),
        "analyzed_at": now_iso(),
        "model": {
            "provider": "ultralytics",
            "model": DEFAULT_MODEL_PATH,
            "mode": "object_detection",
            "confidence_threshold": round(confidence_threshold, 2),
        },
        "frame": {
            "width": frame_width,
            "height": frame_height,
            "best_frame_index": best_frame["frame_index"],
        },
        "frames": {
            "source_fps": round(source_fps, 2),
            "total_video_frames": total_video_frames,
            "sampled_frames": sampled_frames,
            "sample_every": sample_every,
        },
        "metrics": {
            "brightness": round(float(np.mean(brightness_values)), 2),
            "contrast": round(float(np.mean(contrast_values)), 2),
            "edge_density": round(float(np.mean(edge_values)), 3),
            "detection_count": len(all_detections),
            "best_frame_detection_count": len(best_detections),
        },
        "detections": {
            "person": person_detected,
            "vehicle": vehicle_detected,
            "fire": fire_detected,
            "smoke": smoke_detected,
            "flood": flood_detected,
            "confidence": round(max_confidence, 3),
            "boxes": best_detections,
        },
        "risk": risk,
        "events": events,
    }


@router.get("/sources")
def camera_ai_sources():
    sources = []

    for source_id, source in VIDEO_SOURCES.items():
        sources.append(
            {
                "id": source_id,
                "title": source["title"],
                "category": source["category"],
                "path": str(source["path"]),
                "exists": source["path"].exists(),
            }
        )

    return {
        "opencv_available": cv2 is not None and np is not None,
        "yolo_available": YOLO is not None,
        "model": DEFAULT_MODEL_PATH,
        "sources": sources,
    }


@router.post("/analyze")
def analyze_camera_video(request: AnalyzeVideoRequest):
    global _last_camera_analysis

    try:
        result = analyze_video_file(
            source_id=request.source_id,
            sample_every=request.sample_every,
            max_frames=request.max_frames,
            confidence_threshold=request.confidence_threshold,
        )

        _last_camera_analysis = result

        return {
            "ok": True,
            "analysis": result,
        }

    except Exception as error:
        return {
            "ok": False,
            "error": str(error),
        }


@router.get("/last")
def last_camera_analysis():
    return {
        "analysis": _last_camera_analysis,
    }