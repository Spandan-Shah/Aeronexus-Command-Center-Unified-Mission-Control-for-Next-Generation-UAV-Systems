from __future__ import annotations

from dataclasses import asdict, dataclass, field
from time import time
from typing import Any


@dataclass(slots=True)
class GeoPosition:
    latitude_deg: float = 0.0
    longitude_deg: float = 0.0

    altitude_msl_m: float = 0.0
    altitude_relative_m: float = 0.0


@dataclass(slots=True)
class AttitudeState:
    roll_deg: float = 0.0
    pitch_deg: float = 0.0
    yaw_deg: float = 0.0


@dataclass(slots=True)
class MotionState:
    north_mps: float = 0.0
    east_mps: float = 0.0
    down_mps: float = 0.0

    ground_speed_mps: float = 0.0
    air_speed_mps: float | None = None
    vertical_speed_mps: float = 0.0

    heading_deg: float = 0.0


@dataclass(slots=True)
class BatteryState:
    voltage_v: float | None = None
    current_a: float | None = None
    remaining_percent: float | None = None
    consumed_mah: float | None = None


@dataclass(slots=True)
class GpsState:
    fix_type: int = 0
    satellites_visible: int = 0

    hdop: float | None = None
    vdop: float | None = None


@dataclass(slots=True)
class LinkState:
    state: str = "DISCONNECTED"

    heartbeat_age_ms: float | None = None

    rssi_dbm: float | None = None
    quality_percent: float | None = None
    packet_loss_percent: float | None = None


@dataclass(slots=True)
class HealthState:
    overall: str = "UNKNOWN"

    gps_ok: bool = False
    battery_ok: bool = True
    attitude_ok: bool = True
    link_ok: bool = False

    failsafe_active: bool = False

    warnings: list[str] = field(
        default_factory=list
    )


@dataclass(slots=True)
class MissionState:
    mission_id: str | None = None

    state: str = "IDLE"

    current_waypoint: int = 0
    total_waypoints: int = 0


@dataclass(slots=True)
class VehicleCapabilities:
    mavlink: bool = False

    manual_control: bool = False
    autonomous_navigation: bool = False

    camera: bool = False
    computer_vision: bool = False
    companion_computer: bool = False

    multi_vehicle: bool = False


@dataclass(slots=True)
class VehicleState:
    vehicle_id: str
    callsign: str

    source: str

    vehicle_type: str = "MULTIROTOR"

    connected: bool = False
    armed: bool = False

    flight_mode: str = "UNKNOWN"

    position: GeoPosition = field(
        default_factory=GeoPosition
    )

    attitude: AttitudeState = field(
        default_factory=AttitudeState
    )

    motion: MotionState = field(
        default_factory=MotionState
    )

    battery: BatteryState = field(
        default_factory=BatteryState
    )

    gps: GpsState = field(
        default_factory=GpsState
    )

    link: LinkState = field(
        default_factory=LinkState
    )

    health: HealthState = field(
        default_factory=HealthState
    )

    mission: MissionState = field(
        default_factory=MissionState
    )

    capabilities: VehicleCapabilities = field(
        default_factory=VehicleCapabilities
    )

    home_position: GeoPosition | None = None

    system_id: int | None = None
    component_id: int | None = None

    last_heartbeat_unix: float | None = None

    updated_at_unix: float = field(
        default_factory=time
    )

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def touch(self) -> None:
        self.updated_at_unix = time()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)