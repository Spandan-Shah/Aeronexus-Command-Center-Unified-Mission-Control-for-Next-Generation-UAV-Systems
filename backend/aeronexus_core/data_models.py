from __future__ import annotations

from dataclasses import asdict, dataclass, field
from time import time
from typing import Any
from uuid import uuid4


# ============================================================
# Data Type Constants
# ============================================================


class AeronexusDataType:
    """
    Canonical Aeronexus data classes.

    These identifiers are shared between MissionNexus,
    GoblinWisp, GeoFusion, sensor ingestion and media /
    intelligence services.
    """

    VEHICLE_TELEMETRY = "VEHICLE_TELEMETRY"

    SENSOR_READING = "SENSOR_READING"

    VISION_EVENT = "VISION_EVENT"

    VIDEO_METADATA = "VIDEO_METADATA"

    MEDIA_REFERENCE = "MEDIA_REFERENCE"

    MISSION_COMMAND = "MISSION_COMMAND"

    MISSION_EVENT = "MISSION_EVENT"

    DEVICE_HEALTH = "DEVICE_HEALTH"

    GEOFUSION_EVENT = "GEOFUSION_EVENT"

    SECURE_CONTROL = "SECURE_CONTROL"

    SECURITY_EVENT = "SECURITY_EVENT"

    SYSTEM_EVENT = "SYSTEM_EVENT"


# ============================================================
# Severity
# ============================================================


class AeronexusSeverity:
    INFO = "INFO"

    LOW = "LOW"

    MEDIUM = "MEDIUM"

    HIGH = "HIGH"

    CRITICAL = "CRITICAL"


# ============================================================
# Geographic Context
# ============================================================


@dataclass(slots=True)
class GeoContext:
    latitude_deg: float | None = None

    longitude_deg: float | None = None

    altitude_m: float | None = None

    heading_deg: float | None = None

    accuracy_m: float | None = None


# ============================================================
# Security Context
# ============================================================


@dataclass(slots=True)
class SecurityContext:
    """
    Security metadata attached to an Aeronexus event.

    This does NOT implement GoblinWisp cryptography itself.

    It describes the security state associated with the
    received or transmitted application data.
    """

    provider: str = "NONE"

    session_id: str | None = None

    local_peer_id: str | None = None

    remote_peer_id: str | None = None

    direction: str | None = None

    authenticated: bool = False

    identity_verified: bool = False

    replay_validated: bool = False

    secure_session_active: bool = False

    metadata: dict[str, Any] = field(
        default_factory=dict
    )


# ============================================================
# Aeronexus Event
# ============================================================


@dataclass(slots=True)
class AeronexusEvent:
    """
    Common data envelope used across the Aeronexus platform.

    Producers may include:

        MissionNexus
        GoblinWisp
        ESP32-S3
        MAVLink
        Camera / Vision
        Sensor Intelligence
        GeoFusion

    Consumers may include:

        Live Operations
        Mission Debrief
        Vision Intelligence
        Sensor Intelligence
        Security
        GeoFusion
        Fusion Engine
    """

    source_system: str

    source_component: str

    data_type: str

    payload: dict[str, Any]

    event_id: str = field(
        default_factory=lambda: str(
            uuid4()
        )
    )

    timestamp_unix: float = field(
        default_factory=time
    )

    vehicle_id: str | None = None

    mission_id: str | None = None

    device_id: str | None = None

    sensor_id: str | None = None

    camera_id: str | None = None

    severity: str = AeronexusSeverity.INFO

    confidence: float | None = None

    location: GeoContext | None = None

    security: SecurityContext | None = None

    tags: list[str] = field(
        default_factory=list
    )

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def touch(self) -> None:
        self.timestamp_unix = time()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)