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


def calculate_mask_stats(mask: Any) -> dict[str, float]:
    require_opencv()

    total_pixels = mask.shape[0] * mask.shape[1]
    active_pixels = cv2.countNonZero(mask)
    active_percent = (active_pixels / total_pixels) * 100

    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(
        mask,
        connectivity=8,
    )

    largest_component_area = 0

    for component_index in range(1, component_count):
        area = int(stats[component_index, cv2.CC_STAT_AREA])
        largest_component_area = max(largest_component_area, area)

    largest_component_percent = (largest_component_area / total_pixels) * 100

    return {
        "active_percent": round(active_percent, 4),
        "largest_component_percent": round(largest_component_percent, 4),
    }


def calculate_fire_features(hsv_frame: Any, frame_bgr: Any) -> dict[str, float]:
    require_opencv()

    lower_red_1 = np.array([0, 120, 130])
    upper_red_1 = np.array([10, 255, 255])

    lower_red_2 = np.array([170, 120, 130])
    upper_red_2 = np.array([180, 255, 255])

    lower_orange = np.array([11, 110, 140])
    upper_orange = np.array([28, 255, 255])

    lower_yellow = np.array([29, 100, 150])
    upper_yellow = np.array([38, 255, 255])

    red_mask_1 = cv2.inRange(hsv_frame, lower_red_1, upper_red_1)
    red_mask_2 = cv2.inRange(hsv_frame, lower_red_2, upper_red_2)
    orange_mask = cv2.inRange(hsv_frame, lower_orange, upper_orange)
    yellow_mask = cv2.inRange(hsv_frame, lower_yellow, upper_yellow)

    fire_mask = cv2.bitwise_or(red_mask_1, red_mask_2)
    fire_mask = cv2.bitwise_or(fire_mask, orange_mask)
    fire_mask = cv2.bitwise_or(fire_mask, yellow_mask)

    kernel = np.ones((5, 5), np.uint8)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_OPEN, kernel)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_CLOSE, kernel)

    stats = calculate_mask_stats(fire_mask)

    masked_pixels = frame_bgr[fire_mask > 0]

    if masked_pixels.size == 0:
        mean_red_dominance = 0.0
    else:
        blue = masked_pixels[:, 0].astype(float)
        green = masked_pixels[:, 1].astype(float)
        red = masked_pixels[:, 2].astype(float)
        mean_red_dominance = float(np.mean(red - ((green + blue) / 2)))

    area_score = clamp(stats["active_percent"] / 2.5, 0.0, 1.0)
    component_score = clamp(stats["largest_component_percent"] / 1.2, 0.0, 1.0)
    red_dominance_score = clamp(mean_red_dominance / 90, 0.0, 1.0)

    fire_score = (
        area_score * 0.35
        + component_score * 0.45
        + red_dominance_score * 0.20
    )

    return {
        "fire_area_percent": stats["active_percent"],
        "fire_largest_component_percent": stats["largest_component_percent"],
        "fire_red_dominance": round(mean_red_dominance, 3),
        "fire_score": round(fire_score, 3),
    }


def calculate_smoke_features(hsv_frame: Any, gray_frame: Any) -> dict[str, float]:
    require_opencv()

    saturation = hsv_frame[:, :, 1]
    value = hsv_frame[:, :, 2]

    low_saturation = saturation < 45
    medium_brightness = (value > 75) & (value < 215)
    gray_region = (gray_frame > 70) & (gray_frame < 220)

    smoke_mask = low_saturation & medium_brightness & gray_region
    smoke_mask = smoke_mask.astype("uint8") * 255

    kernel = np.ones((7, 7), np.uint8)
    smoke_mask = cv2.morphologyEx(smoke_mask, cv2.MORPH_OPEN, kernel)
    smoke_mask = cv2.morphologyEx(smoke_mask, cv2.MORPH_CLOSE, kernel)

    stats = calculate_mask_stats(smoke_mask)

    edges = cv2.Canny(gray_frame, 80, 160)
    edge_density = (cv2.countNonZero(edges) / (gray_frame.shape[0] * gray_frame.shape[1])) * 100

    contrast = float(np.std(gray_frame))

    area_score = clamp(stats["active_percent"] / 22, 0.0, 1.0)
    component_score = clamp(stats["largest_component_percent"] / 10, 0.0, 1.0)

    low_edge_bonus = 1.0 if edge_density < 7.5 else 0.45
    contrast_bonus = 1.0 if 18 <= contrast <= 75 else 0.55

    smoke_score = (
        area_score * 0.35
        + component_score * 0.45
        + low_edge_bonus * 0.10
        + contrast_bonus * 0.10
    )

    return {
        "smoke_area_percent": stats["active_percent"],
        "smoke_largest_component_percent": stats["largest_component_percent"],
        "edge_density": round(edge_density, 3),
        "contrast": round(contrast, 3),
        "smoke_score": round(smoke_score, 3),
    }


def calculate_motion_score(
    previous_gray_frame: Any | None,
    current_gray_frame: Any,
) -> float:
    require_opencv()

    if previous_gray_frame is None:
        return 0.0

    difference = cv2.absdiff(previous_gray_frame, current_gray_frame)
    _, threshold = cv2.threshold(difference, 25, 255, cv2.THRESH_BINARY)

    motion_pixels = cv2.countNonZero(threshold)
    total_pixels = current_gray_frame.shape[0] * current_gray_frame.shape[1]

    return round((motion_pixels / total_pixels) * 100, 3)


def calculate_risk_level(
    fire_detected: bool,
    smoke_detected: bool,
    motion_detected: bool,
) -> str:
    if fire_detected and smoke_detected:
        return "critical"

    if fire_detected:
        return "high"

    if smoke_detected:
        return "high"

    if motion_detected:
        return "medium"

    return "low"


def build_detection_events(
    fire_detected: bool,
    smoke_detected: bool,
    motion_detected: bool,
    confidence: float,
    source_title: str,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []

    if fire_detected:
        events.append(
            {
                "type": "fire",
                "severity": "high",
                "confidence": confidence,
                "title": "Fire-like region detected",
                "message": f"OpenCV detected a connected fire-colored region in {source_title}.",
                "created_at": now_iso(),
            }
        )

    if smoke_detected:
        events.append(
            {
                "type": "smoke",
                "severity": "high",
                "confidence": confidence,
                "title": "Smoke-like region detected",
                "message": f"OpenCV detected a large low-saturation smoke-like region in {source_title}.",
                "created_at": now_iso(),
            }
        )

    if motion_detected:
        events.append(
            {
                "type": "motion",
                "severity": "medium",
                "confidence": confidence,
                "title": "Motion activity detected",
                "message": f"OpenCV detected significant frame-to-frame movement in {source_title}.",
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
    fire_scores: list[float] = []
    fire_area_values: list[float] = []
    fire_component_values: list[float] = []
    smoke_scores: list[float] = []
    smoke_area_values: list[float] = []
    smoke_component_values: list[float] = []
    edge_values: list[float] = []
    contrast_values: list[float] = []
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

        fire_features = calculate_fire_features(hsv_frame, resized_frame)
        smoke_features = calculate_smoke_features(hsv_frame, gray_frame)

        brightness_values.append(float(np.mean(gray_frame)))

        fire_scores.append(fire_features["fire_score"])
        fire_area_values.append(fire_features["fire_area_percent"])
        fire_component_values.append(fire_features["fire_largest_component_percent"])

        smoke_scores.append(smoke_features["smoke_score"])
        smoke_area_values.append(smoke_features["smoke_area_percent"])
        smoke_component_values.append(smoke_features["smoke_largest_component_percent"])

        edge_values.append(smoke_features["edge_density"])
        contrast_values.append(smoke_features["contrast"])
        motion_scores.append(calculate_motion_score(previous_gray_frame, gray_frame))

        previous_gray_frame = gray_frame
        sampled_frames += 1
        frame_index += 1

    capture.release()

    if sampled_frames == 0:
        raise RuntimeError("No frames were analyzed from the video")

    brightness = float(np.mean(brightness_values))

    fire_score = float(np.percentile(fire_scores, 85))
    fire_area_percent = float(np.percentile(fire_area_values, 85))
    fire_largest_component_percent = float(np.percentile(fire_component_values, 85))

    smoke_score = float(np.percentile(smoke_scores, 85))
    smoke_area_percent = float(np.percentile(smoke_area_values, 85))
    smoke_largest_component_percent = float(np.percentile(smoke_component_values, 85))

    edge_density = float(np.mean(edge_values))
    contrast = float(np.mean(contrast_values))
    motion_score = float(np.percentile(motion_scores, 90))

    fire_detected = (
        fire_score >= 0.62
        and fire_area_percent >= 0.18
        and fire_largest_component_percent >= 0.08
    )

    smoke_detected = (
        smoke_score >= 0.70
        and smoke_area_percent >= 8.0
        and smoke_largest_component_percent >= 3.0
        and edge_density <= 10.5
    )

    motion_detected = motion_score >= 6.0

    confidence = clamp(
        max(
            fire_score if fire_detected else 0,
            smoke_score if smoke_detected else 0,
            motion_score / 18 if motion_detected else 0,
            0.08,
        ),
        0.08,
        0.98,
    )

    risk = calculate_risk_level(
        fire_detected=fire_detected,
        smoke_detected=smoke_detected,
        motion_detected=motion_detected,
    )

    events = build_detection_events(
        fire_detected=fire_detected,
        smoke_detected=smoke_detected,
        motion_detected=motion_detected,
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
            "fire_area_percent": round(fire_area_percent, 3),
            "fire_largest_component_percent": round(
                fire_largest_component_percent,
                3,
            ),
            "smoke_score": round(smoke_score, 3),
            "smoke_area_percent": round(smoke_area_percent, 3),
            "smoke_largest_component_percent": round(
                smoke_largest_component_percent,
                3,
            ),
            "edge_density": round(edge_density, 3),
            "motion_score": round(motion_score, 3),
        },
        "thresholds": {
            "fire_score_min": 0.62,
            "fire_area_percent_min": 0.18,
            "fire_component_percent_min": 0.08,
            "smoke_score_min": 0.70,
            "smoke_area_percent_min": 8.0,
            "smoke_component_percent_min": 3.0,
            "smoke_edge_density_max": 10.5,
            "motion_score_min": 6.0,
        },
        "detections": {
            "person": False,
            "fire": fire_detected,
            "smoke": smoke_detected,
            "motion": motion_detected,
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