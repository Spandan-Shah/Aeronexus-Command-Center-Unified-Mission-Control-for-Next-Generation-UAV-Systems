from __future__ import annotations

from dataclasses import (
    asdict,
    dataclass,
    field,
)

from time import time
from typing import Any


# ============================================================
# Device Connection Configuration
# ============================================================

@dataclass(slots=True)
class DeviceConnectionConfig:
    """
    Normalized connection configuration used by MissionNexus
    device adapters.

    Different adapters may use different subsets:

        SIMULATOR
            vehicle_id
            callsign

        MAVLINK_SERIAL
            serial_port
            baud_rate

        MAVLINK_UDP
            host
            network_port

        MAVLINK_TCP
            host
            network_port
    """

    connection_type: str

    vehicle_id: str = "MN-001-SIM"
    callsign: str = "MN-001"

    serial_port: str | None = None
    baud_rate: int | None = None

    host: str | None = None
    network_port: int | None = None

    auto_reconnect: bool = True

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def normalized_connection_type(
        self,
    ) -> str:
        return (
            self.connection_type
            .strip()
            .upper()
        )

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )


# ============================================================
# Device Diagnostics
# ============================================================

@dataclass(slots=True)
class DeviceDiagnostics:
    """
    Common diagnostic information shown by the future
    Hardware Integration page.
    """

    heartbeat_age_ms: float | None = None

    packets_per_second: float | None = None

    latency_ms: float | None = None

    rssi_dbm: float | None = None

    quality_percent: float | None = None

    packet_loss_percent: float | None = None

    last_message_unix: float | None = None

    details: dict[str, Any] = field(
        default_factory=dict
    )


# ============================================================
# Device State
# ============================================================

@dataclass(slots=True)
class DeviceState:
    """
    Canonical MissionNexus hardware/device state.

    This is intentionally separate from VehicleState.

    DeviceState describes the physical/logical connection.

    VehicleState describes the normalized aircraft telemetry
    produced by that connection.
    """

    device_id: str

    name: str

    device_type: str

    connection_type: str

    transport: str

    protocol: str

    vehicle_id: str | None = None

    status: str = "DISCONNECTED"

    paired: bool = False

    connected: bool = False

    healthy: bool = False

    diagnostics: DeviceDiagnostics = field(
        default_factory=DeviceDiagnostics
    )

    config: DeviceConnectionConfig | None = None

    last_error: str | None = None

    connected_at_unix: float | None = None

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
# Connection Option
# ============================================================

@dataclass(slots=True)
class DeviceConnectionOption:
    """
    Describes an option that can be displayed in the
    Hardware Integration connection selector.
    """

    connection_type: str

    label: str

    description: str

    transport: str

    protocol: str

    supported: bool

    config_fields: list[str] = field(
        default_factory=list
    )

    status: str = "AVAILABLE"

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return asdict(
            self
        )