from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, TypedDict


RiskLevel = Literal["low", "medium", "high", "critical"]
SourceType = Literal[
    "simulator",
    "esp32_usb",
    "esp32_wifi",
    "mavlink",
    "lora",
    "camera_ml",
]


class GpsData(TypedDict, total=False):
    lat: float
    lng: float


class MlData(TypedDict, total=False):
    person: bool
    fire: bool
    smoke: bool
    confidence: float


class UnifiedTelemetry(TypedDict, total=False):
    source: SourceType
    device: str
    timestamp: str
    gps: GpsData
    temperature: float
    smoke: float
    motion: str
    tilt: str
    altitude: float
    speed: float
    battery: float
    link: float
    flightMode: str
    ml: MlData
    secureSession: bool
    risk: RiskLevel
    raw: dict[str, Any]


class SourceStatus(TypedDict):
    source: SourceType
    connected: bool
    lastSeen: str | None
    packets: int
    label: str


source_status: dict[SourceType, SourceStatus] = {
    "simulator": {
        "source": "simulator",
        "connected": False,
        "lastSeen": None,
        "packets": 0,
        "label": "Simulator",
    },
    "esp32_usb": {
        "source": "esp32_usb",
        "connected": False,
        "lastSeen": None,
        "packets": 0,
        "label": "ESP32 USB Serial",
    },
    "esp32_wifi": {
        "source": "esp32_wifi",
        "connected": False,
        "lastSeen": None,
        "packets": 0,
        "label": "ESP32 Wi-Fi JSON",
    },
    "mavlink": {
        "source": "mavlink",
        "connected": False,
        "lastSeen": None,
        "packets": 0,
        "label": "Pixhawk MAVLink",
    },
    "lora": {
        "source": "lora",
        "connected": False,
        "lastSeen": None,
        "packets": 0,
        "label": "Secure Payload Telemetry",
    },
    "camera_ml": {
        "source": "camera_ml",
        "connected": False,
        "lastSeen": None,
        "packets": 0,
        "label": "Camera ML",
    },
}

latest_telemetry: UnifiedTelemetry = {
    "source": "simulator",
    "device": "AeroNexus-SIM",
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "gps": {
        "lat": 23.0225,
        "lng": 72.5714,
    },
    "temperature": 32.0,
    "smoke": 0,
    "motion": "stable",
    "tilt": "normal",
    "altitude": 0,
    "speed": 0,
    "battery": 92,
    "link": 98,
    "flightMode": "STANDBY",
    "ml": {
        "person": False,
        "fire": False,
        "smoke": False,
        "confidence": 0,
    },
    "secureSession": False,
    "risk": "low",
    "raw": {},
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def calculate_risk(data: UnifiedTelemetry) -> RiskLevel:
    temperature = float(data.get("temperature", 0) or 0)
    smoke = float(data.get("smoke", 0) or 0)
    ml = data.get("ml", {})
    person_detected = bool(ml.get("person", False))
    fire_detected = bool(ml.get("fire", False))

    if fire_detected or temperature >= 60 or smoke >= 850:
        return "critical"

    if temperature >= 45 or smoke >= 650:
        return "high"

    if person_detected or temperature >= 38 or smoke >= 400:
        return "medium"

    return "low"


def update_source_status(source: SourceType) -> None:
    status = source_status[source]
    status["connected"] = True
    status["lastSeen"] = now_iso()
    status["packets"] += 1


def normalize_telemetry(payload: dict[str, Any], source: SourceType) -> UnifiedTelemetry:
    gps_payload = payload.get("gps") or {}

    normalized: UnifiedTelemetry = {
        "source": source,
        "device": str(payload.get("device") or "Unknown Device"),
        "timestamp": now_iso(),
        "gps": {
            "lat": float(gps_payload.get("lat", payload.get("lat", 23.0225)) or 23.0225),
            "lng": float(gps_payload.get("lng", payload.get("lng", 72.5714)) or 72.5714),
        },
        "temperature": float(payload.get("temperature", 0) or 0),
        "smoke": float(payload.get("smoke", 0) or 0),
        "motion": str(payload.get("motion") or "unknown"),
        "tilt": str(payload.get("tilt") or "unknown"),
        "altitude": float(payload.get("altitude", 0) or 0),
        "speed": float(payload.get("speed", 0) or 0),
        "battery": float(payload.get("battery", 0) or 0),
        "link": float(payload.get("link", 0) or 0),
        "flightMode": str(payload.get("flightMode") or payload.get("mode") or "UNKNOWN"),
        "ml": {
            "person": bool((payload.get("ml") or {}).get("person", False)),
            "fire": bool((payload.get("ml") or {}).get("fire", False)),
            "smoke": bool((payload.get("ml") or {}).get("smoke", False)),
            "confidence": float((payload.get("ml") or {}).get("confidence", 0) or 0),
        },
        "secureSession": bool(payload.get("secureSession", False)),
        "raw": payload,
    }

    normalized["risk"] = calculate_risk(normalized)
    return normalized


def ingest_telemetry(payload: dict[str, Any], source: SourceType) -> UnifiedTelemetry:
    global latest_telemetry

    latest_telemetry = normalize_telemetry(payload, source)
    update_source_status(source)

    return latest_telemetry


def get_latest_telemetry() -> UnifiedTelemetry:
    return latest_telemetry


def get_source_statuses() -> list[SourceStatus]:
    return list(source_status.values())