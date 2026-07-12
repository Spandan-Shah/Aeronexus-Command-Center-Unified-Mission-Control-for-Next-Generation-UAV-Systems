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

_last_camera_analysis: dict[str, Any] | None = None


class AnalyzeVideoRequest(BaseModel):
    source_id: str = "city-surveillance"
    sample_every: int = 8
    max_frames: int = 90


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def require_opencv() -> None:
    if cv2 is None or np is None:
        raise RuntimeError(
            "OpenCV is not installed. Run: pip install opencv-python-headless numpy"
        )


def calculate_fire_score(hsv_frame: Any) -> float:
    require_opencv()

    lower_red_1 = np.array([0, 90, 90])
    upper_red_1 = np.array([12, 255, 255])

    lower_red_2 = np.array([170, 90, 90])
    upper_red_2 = np.array([180, 255, 255])

    lower_orange = np.array([13, 80, 110])
    upper_orange = np.array([35, 255, 255])

    red_mask_1 = cv2.inRange(hsv_frame, lower_red_1, upper_red_1)
    red_mask_2 = cv2.inRange(hsv_frame, lower_red_2, upper_red_2)
    orange_mask = cv2.inRange(hsv_frame, lower_orange, upper_orange)

    fire_mask = cv2.bitwise_or(red_mask_1, red_mask_2)
    fire_mask = cv2.bitwise_or(fire_mask, orange_mask)

    fire_pixels = cv2.countNonZero(fire_mask)
    total_pixels = hsv_frame.shape[0] * hsv_frame.shape[1]

    return (fire_pixels / total_pixels) * 100


def calculate_smoke_score(hsv_frame: Any, gray_frame: Any) -> float:
    require_opencv()

    saturation = hsv_frame[:, :, 1]
    value = hsv_frame[:, :, 2]

    low_saturation_mask = saturation < 65
    medium_brightness_mask = (value > 80) & (value < 230)
    gray_texture_mask = (gray_frame > 70) & (gray_frame < 225)

    smoke_mask = low_saturation_mask & medium_brightness_mask & gray_texture_mask

    smoke_pixels = int(np.count_nonzero(smoke_mask))
    total_pixels = hsv_frame.shape[0] * hsv_frame.shape[1]

    return (smoke_pixels / total_pixels) * 100


def calculate_edge_density(gray_frame: Any) -> float:
    require_opencv()

    edges = cv2.Canny(gray_frame, 80, 160)
    edge_pixels = cv2.countNonZero(edges)
    total_pixels = gray_frame.shape[0] * gray_frame.shape[1]

    return (edge_pixels / total_pixels) * 100


def calculate_motion_score(
    previous_gray_frame: Any | None,
    current_gray_frame: Any,
) -> float:
    require_opencv()

    if previous_gray_frame is None:
        return 0.0

    difference = cv2.absdiff(previous_gray_frame, current_gray_frame)
    motion_value = float(np.mean(difference))

    return motion_value


def calculate_risk_level(
    fire_detected: bool,
    smoke_detected: bool,
    motion_score: float,
    brightness: float,
) -> str:
    if fire_detected and smoke_detected:
        return "critical"

    if fire_detected or smoke_detected:
        return "high"

    if motion_score > 18:
        return "medium"

    if brightness < 35:
        return "medium"

    return "low"


def build_detection_events(
    fire_detected: bool,
    smoke_detected: bool,
    motion_score: float,
    confidence: float,
    source_title: str,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []

    if fire_detected:
        events.append(
            {
                "type": "fire",
                "severity": "critical",
                "confidence": confidence,
                "title": "Fire pattern detected",
                "message": f"OpenCV detected fire-like color signature in {source_title}.",
                "created_at": now_iso(),
            }
        )

    if smoke_detected:
        events.append(
            {
                "type": "smoke",
                "severity": "high",
                "confidence": confidence,
                "title": "Smoke pattern detected",
                "message": f"OpenCV detected smoke-like low-saturation region in {source_title}.",
                "created_at": now_iso(),
            }
        )

    if motion_score > 18:
        events.append(
            {
                "type": "motion",
                "severity": "medium",
                "confidence": min(0.95, motion_score / 40),
                "title": "Motion activity detected",
                "message": f"OpenCV detected motion activity in {source_title}.",
                "created_at": now_iso(),
            }
        )

    return events


def analyze_video_file(
    source_id: str,
    sample_every: int,
    max_frames: int,
) -> dict[str, Any]:
    require_opencv()

    if source_id not in VIDEO_SOURCES:
        raise ValueError("Unknown video source")

    source = VIDEO_SOURCES[source_id]
    video_path = source["path"]

    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    sample_every = max(1, min(sample_every, 30))
    max_frames = max(10, min(max_frames, 300))

    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        raise RuntimeError(
            "OpenCV could not open the video. The file may be corrupted or codec may be unsupported."
        )

    source_fps = capture.get(cv2.CAP_PROP_FPS) or 0
    total_video_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    sampled_frames = 0
    frame_index = 0

    brightness_values: list[float] = []
    contrast_values: list[float] = []
    fire_scores: list[float] = []
    smoke_scores: list[float] = []
    edge_scores: list[float] = []
    motion_scores: list[float] = []

    previous_gray_frame = None

    while sampled_frames < max_frames:
        success, frame = capture.read()

        if not success:
            break

        if frame_index % sample_every != 0:
            frame_index += 1
            continue

        resized_frame = cv2.resize(frame, (640, 360))
        gray_frame = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2GRAY)
        hsv_frame = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2HSV)

        brightness_values.append(float(np.mean(gray_frame)))
        contrast_values.append(float(np.std(gray_frame)))
        fire_scores.append(calculate_fire_score(hsv_frame))
        smoke_scores.append(calculate_smoke_score(hsv_frame, gray_frame))
        edge_scores.append(calculate_edge_density(gray_frame))
        motion_scores.append(calculate_motion_score(previous_gray_frame, gray_frame))

        previous_gray_frame = gray_frame
        sampled_frames += 1
        frame_index += 1

    capture.release()

    if sampled_frames == 0:
        raise RuntimeError("No frames were analyzed from the video")

    brightness = float(np.mean(brightness_values))
    contrast = float(np.mean(contrast_values))
    fire_score = float(np.mean(fire_scores))
    smoke_score = float(np.mean(smoke_scores))
    edge_density = float(np.mean(edge_scores))
    motion_score = float(np.mean(motion_scores))

    fire_detected = fire_score > 1.8
    smoke_detected = smoke_score > 18

    confidence = clamp(
        max(
            fire_score / 7,
            smoke_score / 45,
            motion_score / 35,
            edge_density / 18,
        ),
        0.05,
        0.99,
    )

    risk = calculate_risk_level(
        fire_detected=fire_detected,
        smoke_detected=smoke_detected,
        motion_score=motion_score,
        brightness=brightness,
    )

    events = build_detection_events(
        fire_detected=fire_detected,
        smoke_detected=smoke_detected,
        motion_score=motion_score,
        confidence=confidence,
        source_title=source["title"],
    )

    telemetry_payload = {
        "device": f"CameraAI-{source_id}",
        "flightMode": "OPENCV_ANALYSIS",
        "ml": {
            "person": False,
            "fire": fire_detected,
            "smoke": smoke_detected,
            "confidence": round(confidence, 3),
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
        "frames": {
            "source_fps": round(source_fps, 2),
            "total_video_frames": total_video_frames,
            "sampled_frames": sampled_frames,
            "sample_every": sample_every,
        },
        "metrics": {
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "fire_score": round(fire_score, 3),
            "smoke_score": round(smoke_score, 3),
            "edge_density": round(edge_density, 3),
            "motion_score": round(motion_score, 3),
        },
        "detections": {
            "person": False,
            "fire": fire_detected,
            "smoke": smoke_detected,
            "confidence": round(confidence, 3),
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