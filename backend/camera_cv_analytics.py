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
    "fire-response-demo": {
        "title": "Generated Fire EO/IR Simulation",
        "path": PROJECT_ROOT / "public" / "videos" / "fire-response-demo.mp4",
        "category": "disaster",
    },
    "fire-response-1": {
        "title": "Fire Response 1",
        "path": PROJECT_ROOT / "public" / "videos" / "Fire_Response_1.MP4",
        "category": "disaster",
    },
}

CUSTOM_MODEL_PATH = (
    PROJECT_ROOT
    / "runs"
    / "aeronexus"
    / "disaster_yolo_v1"
    / "weights"
    / "best.pt"
)

DEFAULT_MODEL_PATH = str(CUSTOM_MODEL_PATH) if CUSTOM_MODEL_PATH.exists() else "yolov8n.pt"

FIRE_LABELS = {
    "fire",
    "flame",
    "wildfire",
    "blaze",
    "burning",
    "fire-color-signature",
    "flame-signature",
}

SMOKE_LABELS = {
    "smoke",
    "haze",
    "smoke-signature",
    "smoke-haze-signature",
}

FLOOD_LABELS = {
    "flood",
    "water-flood",
    "floodwater",
    "water",
    "waterlogging",
}

VEHICLE_LABELS = {
    "vehicle",
    "car",
    "truck",
    "bus",
    "motorcycle",
    "motorbike",
    "bicycle",
    "boat",
    "train",
}

DISASTER_LABEL_MIN_CONFIDENCE = 0.72
OPENCV_FIRE_CONFIRMATION_CONFIDENCE = 0.82
OPENCV_SMOKE_CONFIRMATION_CONFIDENCE = 0.80

_last_camera_analysis: dict[str, Any] | None = None
_yolo_model: Any | None = None


class AnalyzeVideoRequest(BaseModel):
    source_id: str = "city-surveillance"
    sample_every: int = 5
    max_frames: int = 160
    confidence_threshold: float = 0.25


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def mean_or_zero(values: list[float]) -> float:
    if not values:
        return 0.0

    return float(np.mean(values)) if np is not None else 0.0


def require_opencv() -> None:
    if cv2 is None or np is None:
        raise RuntimeError(
            "OpenCV is not installed. Run: pip install opencv-python numpy"
        )


def normalize_label(label: str) -> str:
    return label.strip().lower().replace(" ", "-")


def is_vehicle_label(label: str) -> bool:
    return normalize_label(label) in VEHICLE_LABELS


def is_fire_label(label: str) -> bool:
    return normalize_label(label) in FIRE_LABELS


def is_smoke_label(label: str) -> bool:
    return normalize_label(label) in SMOKE_LABELS


def is_flood_label(label: str) -> bool:
    return normalize_label(label) in FLOOD_LABELS


def is_disaster_label(label: str) -> bool:
    return is_fire_label(label) or is_smoke_label(label) or is_flood_label(label)


def get_detection_category(label: str) -> str:
    clean_label = normalize_label(label)

    if clean_label == "person":
        return "person"

    if is_vehicle_label(clean_label):
        return "vehicle"

    if is_disaster_label(clean_label):
        return "threat"

    return "object"


def get_yolo_model() -> Any | None:
    global _yolo_model

    if YOLO is None:
        return None

    if _yolo_model is None:
        _yolo_model = YOLO(DEFAULT_MODEL_PATH)

    return _yolo_model


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


def build_box(
    label: str,
    display_label: str,
    confidence: float,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    category: str | None = None,
) -> dict[str, Any]:
    normalized_label = normalize_label(label)

    return {
        "label": normalized_label,
        "display_label": display_label,
        "confidence": round(float(clamp(confidence, 0.0, 1.0)), 3),
        "box": {
            "x1": round(float(x1), 2),
            "y1": round(float(y1), 2),
            "x2": round(float(x2), 2),
            "y2": round(float(y2), 2),
        },
        "category": category or get_detection_category(normalized_label),
    }


def should_keep_yolo_detection(label: str, confidence: float, threshold: float) -> bool:
    clean_label = normalize_label(label)

    if confidence < threshold:
        return False

    if is_fire_label(clean_label) or is_smoke_label(clean_label) or is_flood_label(clean_label):
        return confidence >= DISASTER_LABEL_MIN_CONFIDENCE

    return True


def extract_yolo_detections(
    frame_bgr: Any,
    confidence_threshold: float,
) -> list[dict[str, Any]]:
    model = get_yolo_model()

    if model is None:
        return []

    try:
        results = model.predict(
            source=frame_bgr,
            conf=confidence_threshold,
            verbose=False,
        )
    except Exception:
        return []

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

        if not should_keep_yolo_detection(label, confidence, confidence_threshold):
            continue

        x1, y1, x2, y2 = xyxy

        detections.append(
            build_box(
                label=label,
                display_label=raw_label,
                confidence=confidence,
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
                category=get_detection_category(label),
            )
        )

    detections.sort(key=lambda item: item["confidence"], reverse=True)

    return detections


def create_fire_candidate_mask(frame_bgr: Any) -> Any:
    require_opencv()

    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    blue, green, red = cv2.split(frame_bgr)

    lower_red_1 = np.array([0, 100, 145])
    upper_red_1 = np.array([15, 255, 255])

    lower_red_2 = np.array([170, 100, 145])
    upper_red_2 = np.array([180, 255, 255])

    lower_orange = np.array([10, 105, 150])
    upper_orange = np.array([32, 255, 255])

    lower_yellow = np.array([22, 110, 165])
    upper_yellow = np.array([43, 255, 255])

    red_mask_1 = cv2.inRange(hsv, lower_red_1, upper_red_1)
    red_mask_2 = cv2.inRange(hsv, lower_red_2, upper_red_2)
    orange_mask = cv2.inRange(hsv, lower_orange, upper_orange)
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    warm_mask = cv2.bitwise_or(red_mask_1, red_mask_2)
    warm_mask = cv2.bitwise_or(warm_mask, orange_mask)
    warm_mask = cv2.bitwise_or(warm_mask, yellow_mask)

    red_dominant = (
        (red.astype("float32") > green.astype("float32") * 1.08)
        & (red.astype("float32") > blue.astype("float32") * 1.35)
    ).astype("uint8") * 255

    fire_candidate = cv2.bitwise_and(warm_mask, red_dominant)

    kernel = np.ones((5, 5), np.uint8)
    fire_candidate = cv2.morphologyEx(fire_candidate, cv2.MORPH_OPEN, kernel)
    fire_candidate = cv2.morphologyEx(fire_candidate, cv2.MORPH_CLOSE, kernel)

    return fire_candidate


def create_smoke_candidate_mask(frame_bgr: Any) -> Any:
    require_opencv()

    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)

    lower_smoke = np.array([0, 0, 95])
    upper_smoke = np.array([180, 45, 220])

    smoke_candidate = cv2.inRange(hsv, lower_smoke, upper_smoke)

    kernel = np.ones((9, 9), np.uint8)
    smoke_candidate = cv2.morphologyEx(smoke_candidate, cv2.MORPH_OPEN, kernel)
    smoke_candidate = cv2.morphologyEx(smoke_candidate, cv2.MORPH_CLOSE, kernel)

    return smoke_candidate


def contour_edge_density(frame_bgr: Any, contour: Any) -> float:
    require_opencv()

    mask = np.zeros(frame_bgr.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, thickness=cv2.FILLED)

    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 80, 160)

    mask_pixels = max(cv2.countNonZero(mask), 1)
    edge_pixels = cv2.countNonZero(cv2.bitwise_and(edges, edges, mask=mask))

    return (edge_pixels / mask_pixels) * 100


def contour_color_stats(frame_bgr: Any, contour: Any) -> dict[str, float]:
    require_opencv()

    mask = np.zeros(frame_bgr.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, thickness=cv2.FILLED)

    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    blue, green, red = cv2.split(frame_bgr)

    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    red_mean = float(cv2.mean(red, mask=mask)[0])
    green_mean = float(cv2.mean(green, mask=mask)[0])
    blue_mean = float(cv2.mean(blue, mask=mask)[0])

    return {
        "avg_saturation": float(cv2.mean(saturation, mask=mask)[0]),
        "avg_value": float(cv2.mean(value, mask=mask)[0]),
        "red_green_ratio": red_mean / max(green_mean, 1.0),
        "red_blue_ratio": red_mean / max(blue_mean, 1.0),
        "edge_density": contour_edge_density(frame_bgr, contour),
    }


def extract_confirmed_fire_smoke_detections(
    frame_bgr: Any,
    confidence_threshold: float,
) -> tuple[list[dict[str, Any]], dict[str, float]]:
    require_opencv()

    height, width = frame_bgr.shape[:2]
    frame_area = float(width * height)

    fire_mask = create_fire_candidate_mask(frame_bgr)
    smoke_mask = create_smoke_candidate_mask(frame_bgr)

    fire_pixels = cv2.countNonZero(fire_mask)
    smoke_pixels = cv2.countNonZero(smoke_mask)

    fire_pixels_pct = (fire_pixels / frame_area) * 100
    smoke_pixels_pct = (smoke_pixels / frame_area) * 100

    detections: list[dict[str, Any]] = []

    fire_contours, _ = cv2.findContours(
        fire_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    fire_contours = sorted(fire_contours, key=cv2.contourArea, reverse=True)

    confirmed_fire_count = 0

    for contour in fire_contours[:6]:
        area = float(cv2.contourArea(contour))
        area_pct = (area / frame_area) * 100

        if area_pct < 1.8:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        if w <= 0 or h <= 0:
            continue

        aspect_ratio = w / h
        extent = area / max(float(w * h), 1.0)
        stats = contour_color_stats(frame_bgr, contour)

        if aspect_ratio > 3.8 or aspect_ratio < 0.18:
            continue

        if extent > 0.78:
            continue

        if stats["avg_saturation"] < 145 or stats["avg_value"] < 155:
            continue

        if stats["red_green_ratio"] < 1.12 or stats["red_blue_ratio"] < 1.55:
            continue

        confidence = clamp(
            0.30
            + (area_pct / 10.0)
            + ((stats["avg_saturation"] - 145) / 260.0)
            + ((stats["avg_value"] - 155) / 280.0)
            + ((stats["red_blue_ratio"] - 1.55) / 2.6),
            0.0,
            0.95,
        )

        if confidence < max(OPENCV_FIRE_CONFIRMATION_CONFIDENCE, confidence_threshold + 0.45):
            continue

        confirmed_fire_count += 1

        detections.append(
            build_box(
                label="flame-signature",
                display_label="Confirmed Flame Signature",
                confidence=confidence,
                x1=x,
                y1=y,
                x2=x + w,
                y2=y + h,
                category="threat",
            )
        )

    smoke_contours, _ = cv2.findContours(
        smoke_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    smoke_contours = sorted(smoke_contours, key=cv2.contourArea, reverse=True)

    confirmed_smoke_count = 0

    for contour in smoke_contours[:4]:
        area = float(cv2.contourArea(contour))
        area_pct = (area / frame_area) * 100

        if area_pct < 12.0:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        if y > height * 0.72:
            continue

        stats = contour_color_stats(frame_bgr, contour)

        if stats["avg_saturation"] > 42:
            continue

        if stats["edge_density"] > 5.0:
            continue

        confidence = clamp(
            0.25
            + (area_pct / 35.0)
            + ((42 - stats["avg_saturation"]) / 160.0)
            + ((5.0 - stats["edge_density"]) / 18.0),
            0.0,
            0.90,
        )

        smoke_requires_fire_or_large_plume = confirmed_fire_count > 0 or area_pct >= 22.0

        if not smoke_requires_fire_or_large_plume:
            continue

        if confidence < max(OPENCV_SMOKE_CONFIRMATION_CONFIDENCE, confidence_threshold + 0.48):
            continue

        confirmed_smoke_count += 1

        detections.append(
            build_box(
                label="smoke-haze-signature",
                display_label="Confirmed Smoke / Haze Signature",
                confidence=confidence,
                x1=x,
                y1=y,
                x2=x + w,
                y2=y + h,
                category="threat",
            )
        )

    return detections, {
        "fire_pixels_pct": round(fire_pixels_pct, 3),
        "smoke_pixels_pct": round(smoke_pixels_pct, 3),
        "confirmed_fire_regions": confirmed_fire_count,
        "confirmed_smoke_regions": confirmed_smoke_count,
    }


def calculate_risk_level(detections: list[dict[str, Any]]) -> str:
    fire_detections = [
        detection
        for detection in detections
        if is_fire_label(str(detection["label"]))
    ]

    smoke_detections = [
        detection
        for detection in detections
        if is_smoke_label(str(detection["label"]))
    ]

    flood_detections = [
        detection
        for detection in detections
        if is_flood_label(str(detection["label"]))
    ]

    person_detections = [
        detection
        for detection in detections
        if detection["category"] == "person"
    ]

    vehicle_detections = [
        detection
        for detection in detections
        if detection["category"] == "vehicle"
    ]

    if fire_detections and smoke_detections:
        return "critical"

    if fire_detections:
        return "high"

    if smoke_detections or flood_detections:
        return "high"

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

    for detection in detections[:10]:
        label = str(detection["display_label"])
        normalized_label = str(detection["label"])
        confidence = float(detection["confidence"])
        category = str(detection["category"])

        if is_fire_label(normalized_label):
            severity = "high"
            title = "Confirmed fire / flame signature"
            message = (
                f"Confirmed fire-like signature in {source_title} "
                f"with {round(confidence * 100)}% confidence."
            )
        elif is_smoke_label(normalized_label):
            severity = "high"
            title = "Confirmed smoke / haze signature"
            message = (
                f"Confirmed smoke-like haze in {source_title} "
                f"with {round(confidence * 100)}% confidence."
            )
        elif is_flood_label(normalized_label):
            severity = "high"
            title = "Flood / water risk detected"
            message = (
                f"YOLO/OpenCV detected flood or water-risk evidence in {source_title} "
                f"with {round(confidence * 100)}% confidence."
            )
        elif category == "person":
            severity = "medium"
            title = "Person detected"
            message = (
                f"YOLO detected a person in {source_title} "
                f"with {round(confidence * 100)}% confidence."
            )
        elif category == "vehicle":
            severity = "medium"
            title = f"{label} detected"
            message = (
                f"YOLO detected {label} in {source_title} "
                f"with {round(confidence * 100)}% confidence."
            )
        else:
            severity = "info"
            title = f"{label} detected"
            message = (
                f"YOLO detected {label} in {source_title} "
                f"with {round(confidence * 100)}% confidence."
            )

        events.append(
            {
                "type": normalized_label,
                "severity": severity,
                "confidence": confidence,
                "title": title,
                "message": message,
                "created_at": now_iso(),
            }
        )

    return events


def choose_best_frame_result(frame_results: list[dict[str, Any]]) -> dict[str, Any]:
    if not frame_results:
        raise RuntimeError("No frame results available")

    def score_frame(frame_result: dict[str, Any]) -> float:
        detections = frame_result["detections"]
        visual_cues = frame_result["visual_cues"]

        if not detections:
            return (
                visual_cues["confirmed_fire_regions"] * 3.0
                + visual_cues["confirmed_smoke_regions"] * 2.0
            )

        confidence_sum = sum(detection["confidence"] for detection in detections)

        important_count = sum(
            1
            for detection in detections
            if detection["category"] in {"person", "vehicle", "threat"}
        )

        disaster_bonus = sum(
            2.0
            for detection in detections
            if is_disaster_label(str(detection["label"]))
        )

        return confidence_sum + important_count + disaster_bonus

    return max(frame_results, key=score_frame)


def count_detections(detections: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "person": sum(1 for item in detections if item["category"] == "person"),
        "vehicle": sum(1 for item in detections if item["category"] == "vehicle"),
        "fire": sum(1 for item in detections if is_fire_label(str(item["label"]))),
        "smoke": sum(1 for item in detections if is_smoke_label(str(item["label"]))),
        "flood": sum(1 for item in detections if is_flood_label(str(item["label"]))),
        "threat": sum(1 for item in detections if item["category"] == "threat"),
        "object": sum(1 for item in detections if item["category"] == "object"),
    }


def analyze_video_file(
    source_id: str,
    sample_every: int,
    max_frames: int,
    confidence_threshold: float,
) -> dict[str, Any]:
    require_opencv()

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
    fire_pixel_values: list[float] = []
    smoke_pixel_values: list[float] = []
    confirmed_fire_region_values: list[int] = []
    confirmed_smoke_region_values: list[int] = []

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

        yolo_detections = extract_yolo_detections(
            resized_frame,
            confidence_threshold=confidence_threshold,
        )

        confirmed_visual_detections, visual_cues = extract_confirmed_fire_smoke_detections(
            resized_frame,
            confidence_threshold=confidence_threshold,
        )

        detections = yolo_detections + confirmed_visual_detections
        detections.sort(key=lambda item: item["confidence"], reverse=True)

        brightness_values.append(metrics["brightness"])
        contrast_values.append(metrics["contrast"])
        edge_values.append(metrics["edge_density"])
        fire_pixel_values.append(visual_cues["fire_pixels_pct"])
        smoke_pixel_values.append(visual_cues["smoke_pixels_pct"])
        confirmed_fire_region_values.append(int(visual_cues["confirmed_fire_regions"]))
        confirmed_smoke_region_values.append(int(visual_cues["confirmed_smoke_regions"]))

        for detection in detections:
            all_detections.append(
                {
                    **detection,
                    "frame_index": frame_index,
                }
            )

        frame_results.append(
            {
                "frame_index": frame_index,
                "detections": detections,
                "metrics": metrics,
                "visual_cues": visual_cues,
            }
        )

        sampled_frames += 1
        frame_index += 1

    capture.release()

    if sampled_frames == 0:
        raise RuntimeError("No frames were analyzed from the video")

    best_frame = choose_best_frame_result(frame_results)
    best_detections = best_frame["detections"][:24]
    counts = count_detections(all_detections)

    person_detected = counts["person"] > 0
    vehicle_detected = counts["vehicle"] > 0
    fire_detected = counts["fire"] > 0
    flame_detected = counts["fire"] > 0
    smoke_detected = counts["smoke"] > 0
    flood_detected = counts["flood"] > 0

    max_confidence = max(
        [detection["confidence"] for detection in all_detections],
        default=0.0,
    )

    risk = calculate_risk_level(all_detections)
    events = build_detection_events(best_detections, source["title"])

    telemetry_payload = {
        "device": f"CameraAI-{source_id}",
        "flightMode": "YOLO_OPENCV_STRICT_ANALYSIS",
        "ml": {
            "person": person_detected,
            "vehicle": vehicle_detected,
            "fire": fire_detected,
            "flame": flame_detected,
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
            "provider": "ultralytics + opencv",
            "model": DEFAULT_MODEL_PATH,
            "mode": "object_detection + strict_fire_smoke_confirmation",
            "confidence_threshold": round(confidence_threshold, 2),
            "opencv_fire_mode": True,
            "opencv_fire_confirmation": "strict",
            "yolo_available": YOLO is not None,
            "disaster_label_min_confidence": DISASTER_LABEL_MIN_CONFIDENCE,
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
            "brightness": round(mean_or_zero(brightness_values), 2),
            "contrast": round(mean_or_zero(contrast_values), 2),
            "edge_density": round(mean_or_zero(edge_values), 3),
            "detection_count": len(all_detections),
            "best_frame_detection_count": len(best_detections),
            "fire_detection_count": counts["fire"],
            "smoke_detection_count": counts["smoke"],
            "flood_detection_count": counts["flood"],
        },
        "fire_analysis": {
            "mode": "strict HSV colour cue + confirmed disaster labels",
            "note": "Colour pixels are supporting cues only. They do not become fire/smoke detections unless strict confirmation passes.",
            "max_fire_pixels_pct": round(max(fire_pixel_values, default=0.0), 3),
            "avg_fire_pixels_pct": round(mean_or_zero(fire_pixel_values), 3),
            "max_smoke_pixels_pct": round(max(smoke_pixel_values, default=0.0), 3),
            "avg_smoke_pixels_pct": round(mean_or_zero(smoke_pixel_values), 3),
            "best_frame_fire_pixels_pct": best_frame["visual_cues"]["fire_pixels_pct"],
            "best_frame_smoke_pixels_pct": best_frame["visual_cues"]["smoke_pixels_pct"],
            "confirmed_fire_regions": sum(confirmed_fire_region_values),
            "confirmed_smoke_regions": sum(confirmed_smoke_region_values),
        },
        "counts": counts,
        "detections": {
            "person": person_detected,
            "vehicle": vehicle_detected,
            "fire": fire_detected,
            "flame": flame_detected,
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
        "custom_model_exists": CUSTOM_MODEL_PATH.exists(),
        "model": DEFAULT_MODEL_PATH,
        "strict_fire_mode": True,
        "disaster_label_min_confidence": DISASTER_LABEL_MIN_CONFIDENCE,
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