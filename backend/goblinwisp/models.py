from __future__ import annotations

from dataclasses import (
    asdict,
    dataclass,
    field,
)

from time import time
from typing import Any
from uuid import uuid4


# ============================================================
# GoblinWisp Constants
# ============================================================


class GoblinWispNodeRole:
    AIRCRAFT = "AIRCRAFT"
    GROUND = "GROUND"
    GATEWAY = "GATEWAY"
    PEER = "PEER"
    SENSOR_NODE = "SENSOR_NODE"
    COMPANION = "COMPANION"


class GoblinWispPlatform:
    ESP32_S3 = "ESP32-S3"
    ESP32 = "ESP32"
    LINUX_SBC = "LINUX_SBC"
    RASPBERRY_PI = "RASPBERRY_PI"
    MISSIONNEXUS_HOST = "MISSIONNEXUS_HOST"
    CUSTOM_MCU = "CUSTOM_MCU"
    CUSTOM_DEVICE = "CUSTOM_DEVICE"


class GoblinWispTransportType:
    ESP_NOW = "ESP-NOW"
    WIFI = "WIFI"
    UDP = "UDP"
    TCP = "TCP"
    SERIAL = "SERIAL"
    RF_RADIO = "RF_RADIO"
    LORA = "LORA"
    MESH = "MESH"
    SATELLITE = "SATELLITE"
    CUSTOM = "CUSTOM"


class GoblinWispTrustState:
    UNKNOWN = "UNKNOWN"
    UNPAIRED = "UNPAIRED"
    PAIRING = "PAIRING"
    TRUSTED = "TRUSTED"
    REJECTED = "REJECTED"
    RESET_REQUIRED = "RESET_REQUIRED"


class GoblinWispSessionStatus:
    IDLE = "IDLE"
    ESTABLISHING = "ESTABLISHING"
    ACTIVE = "ACTIVE"
    REKEYING = "REKEYING"
    INVALIDATED = "INVALIDATED"
    FAILED = "FAILED"


class GoblinWispContextStatus:
    INACTIVE = "INACTIVE"
    ACTIVE = "ACTIVE"
    RETIRED = "RETIRED"
    INVALIDATED = "INVALIDATED"


class GoblinWispDirection:
    TX = "TX"
    RX = "RX"


class GoblinWispPayloadType:
    """
    Logical application payload classes that GoblinWisp
    may transport securely.

    GoblinWisp remains independent of any one application
    protocol or physical transport.
    """

    VEHICLE_TELEMETRY = "VEHICLE_TELEMETRY"

    MAVLINK = "MAVLINK"

    SENSOR_TELEMETRY = "SENSOR_TELEMETRY"

    VISION_EVENT = "VISION_EVENT"

    VIDEO_METADATA = "VIDEO_METADATA"

    MEDIA_STREAM = "MEDIA_STREAM"

    MEDIA_REFERENCE = "MEDIA_REFERENCE"

    FILE_TRANSFER = "FILE_TRANSFER"

    MISSION_EVENT = "MISSION_EVENT"

    MISSION_CONTROL = "MISSION_CONTROL"

    GEOFUSION_EVENT = "GEOFUSION_EVENT"

    DEVICE_HEALTH = "DEVICE_HEALTH"

    SECURE_CONTROL = "SECURE_CONTROL"

    CUSTOM = "CUSTOM"


# ============================================================
# GoblinWisp Node
# ============================================================


@dataclass(slots=True)
class GoblinWispNode:
    """
    Represents one GoblinWisp peer.

    Secret/private identity material is intentionally NOT
    stored in this dashboard-facing model.
    """

    node_id: str

    name: str

    role: str

    platform: str

    vehicle_id: str | None = None

    hardware_uid: str | None = None

    public_identity_fingerprint: str | None = None

    trust_state: str = GoblinWispTrustState.UNPAIRED

    identity_verified: bool = False

    online: bool = False

    firmware_version: str | None = None

    last_seen_unix: float | None = None

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def mark_seen(
        self,
    ) -> None:
        self.online = True

        self.last_seen_unix = time()

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )


# ============================================================
# Transport Configuration
# ============================================================


@dataclass(slots=True)
class GoblinWispTransport:
    """
    Describes the underlying communication medium.

    Security/session logic remains logically independent
    from this transport.
    """

    transport_type: str

    label: str

    interface_name: str | None = None

    peer_address: str | None = None

    channel: int | None = None

    port: int | None = None

    baud_rate: int | None = None

    connected: bool = False

    rssi_dbm: float | None = None

    quality_percent: float | None = None

    packet_loss_percent: float | None = None

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )


# ============================================================
# Directional Context State
# ============================================================


@dataclass(slots=True)
class GoblinWispDirectionalContext:
    """
    Dashboard-safe representation of a directional
    GoblinWisp cryptographic context.

    Actual cryptographic key material and nonce bases are
    never exposed here.
    """

    direction: str

    context_id: str = field(
        default_factory=lambda: str(
            uuid4()
        )
    )

    status: str = (
        GoblinWispContextStatus.INACTIVE
    )

    key_epoch: int = 0

    message_counter: int = 0

    replay_state_valid: bool = False

    nonce_state_valid: bool = False

    authentication_failures: int = 0

    replay_rejections: int = 0

    counter_errors: int = 0

    created_at_unix: float = field(
        default_factory=time
    )

    updated_at_unix: float = field(
        default_factory=time
    )

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def touch(
        self,
    ) -> None:
        self.updated_at_unix = time()

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )


# ============================================================
# Secure Session State
# ============================================================


@dataclass(slots=True)
class GoblinWispSession:
    """
    Represents GoblinWisp secure-session lifecycle state.

    This is the operational/session model only.

    Cryptographic primitives and private key handling will
    live in dedicated security modules later.
    """

    local_node_id: str

    remote_node_id: str

    session_id: str = field(
        default_factory=lambda: str(
            uuid4()
        )
    )

    status: str = (
        GoblinWispSessionStatus.IDLE
    )

    trust_state: str = (
        GoblinWispTrustState.UNPAIRED
    )

    handshake_complete: bool = False

    identity_verified: bool = False

    forward_secure: bool = False

    replay_protection_active: bool = False

    directional_isolation_active: bool = False

    secure_session_active: bool = False

    protocol_version: str = "GW-DEV-1"

    tx_context: GoblinWispDirectionalContext = field(
        default_factory=lambda:
        GoblinWispDirectionalContext(
            direction=GoblinWispDirection.TX
        )
    )

    rx_context: GoblinWispDirectionalContext = field(
        default_factory=lambda:
        GoblinWispDirectionalContext(
            direction=GoblinWispDirection.RX
        )
    )

    established_at_unix: float | None = None

    last_rekey_at_unix: float | None = None

    rekey_count: int = 0

    reset_generation: int = 0

    last_error: str | None = None

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def activate(
        self,
    ) -> None:
        now = time()

        self.status = (
            GoblinWispSessionStatus.ACTIVE
        )

        self.handshake_complete = True

        self.identity_verified = True

        self.forward_secure = True

        self.replay_protection_active = True

        self.directional_isolation_active = True

        self.secure_session_active = True

        self.established_at_unix = now

        self.tx_context.status = (
            GoblinWispContextStatus.ACTIVE
        )

        self.rx_context.status = (
            GoblinWispContextStatus.ACTIVE
        )

        self.tx_context.replay_state_valid = True

        self.rx_context.replay_state_valid = True

        self.tx_context.nonce_state_valid = True

        self.rx_context.nonce_state_valid = True

        self.tx_context.touch()

        self.rx_context.touch()

    def invalidate(
        self,
        reason: str | None = None,
    ) -> None:
        self.status = (
            GoblinWispSessionStatus.INVALIDATED
        )

        self.secure_session_active = False

        self.handshake_complete = False

        self.directional_isolation_active = False

        self.replay_protection_active = False

        self.tx_context.status = (
            GoblinWispContextStatus.INVALIDATED
        )

        self.rx_context.status = (
            GoblinWispContextStatus.INVALIDATED
        )

        self.tx_context.nonce_state_valid = False

        self.rx_context.nonce_state_valid = False

        self.tx_context.replay_state_valid = False

        self.rx_context.replay_state_valid = False

        self.reset_generation += 1

        self.last_error = reason

        self.tx_context.touch()

        self.rx_context.touch()

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )


# ============================================================
# GoblinWisp Deployment Profile
# ============================================================


@dataclass(slots=True)
class GoblinWispProfile:
    """
    Defines how GoblinWisp is deployed for a system.

    A profile binds:

        nodes
        platform
        transport
        application payload classes

    without making GoblinWisp dependent on any single
    transport or drone protocol.
    """

    profile_id: str

    name: str

    local_node: GoblinWispNode

    remote_node: GoblinWispNode

    transport: GoblinWispTransport

    payload_types: list[str] = field(
        default_factory=list
    )

    active: bool = False

    session: GoblinWispSession | None = None

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )


# ============================================================
# Current Development Profile
# ESP32-S3 + ESP-NOW
# ============================================================


def build_esp32_s3_esp_now_profile(
    vehicle_id: str = "MN-001",
) -> GoblinWispProfile:
    """
    Current Aeronexus GoblinWisp development configuration.

    Ground:
        ESP32-S3

    Aircraft:
        ESP32-S3

    Transport:
        ESP-NOW

    Security:
        GoblinWisp session architecture

    Payloads:
        sensor telemetry
        vehicle telemetry
        future MAVLink
        vision metadata
        future media integration
    """

    ground_node = GoblinWispNode(
        node_id="GW-GROUND-001",

        name="GoblinWisp Ground Peer",

        role=GoblinWispNodeRole.GROUND,

        platform=GoblinWispPlatform.ESP32_S3,

        trust_state=GoblinWispTrustState.UNPAIRED,

        metadata={
            "development_profile":
                True,

            "system":
                "MissionNexus",
        },
    )

    aircraft_node = GoblinWispNode(
        node_id="GW-MN001",

        name="MN-001 GoblinWisp Aircraft Peer",

        role=GoblinWispNodeRole.AIRCRAFT,

        platform=GoblinWispPlatform.ESP32_S3,

        vehicle_id=vehicle_id,

        trust_state=GoblinWispTrustState.UNPAIRED,

        metadata={
            "development_profile":
                True,

            "vehicle":
                vehicle_id,
        },
    )

    transport = GoblinWispTransport(
        transport_type=
            GoblinWispTransportType.ESP_NOW,

        label=
            "ESP-NOW Peer Link",

        interface_name=
            "ESP32-S3",

        metadata={
            "infrastructure_free":
                True,

            "current_hardware":
                True,
        },
    )

    session = GoblinWispSession(
        local_node_id=
            ground_node.node_id,

        remote_node_id=
            aircraft_node.node_id,

        metadata={
            "development_profile":
                True,
        },
    )

    return GoblinWispProfile(
        profile_id=
            "GW-ESP32-ESPNOW-001",

        name=
            "ESP32-S3 ESP-NOW Drone Link",

        local_node=
            ground_node,

        remote_node=
            aircraft_node,

        transport=
            transport,

        payload_types=[
            GoblinWispPayloadType.SENSOR_TELEMETRY,

            GoblinWispPayloadType.VEHICLE_TELEMETRY,

            GoblinWispPayloadType.MAVLINK,

            GoblinWispPayloadType.VISION_EVENT,

            GoblinWispPayloadType.VIDEO_METADATA,

            GoblinWispPayloadType.MEDIA_REFERENCE,

            GoblinWispPayloadType.MISSION_EVENT,

            GoblinWispPayloadType.DEVICE_HEALTH,

            GoblinWispPayloadType.SECURE_CONTROL,
        ],

        active=False,

        session=
            session,

        metadata={
            "project":
                "Aeronexus",

            "application":
                "MissionNexus",

            "security_architecture":
                "GoblinWisp",

            "transport":
                "ESP-NOW",

            "hardware":
                "ESP32-S3",
        },
    )