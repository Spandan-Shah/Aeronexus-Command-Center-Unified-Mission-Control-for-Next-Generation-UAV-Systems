from __future__ import annotations

import asyncio
import math

from time import monotonic, time

from .vehicle_models import (
    AttitudeState,
    BatteryState,
    GeoPosition,
    GpsState,
    HealthState,
    LinkState,
    MissionState,
    MotionState,
    VehicleCapabilities,
    VehicleState,
)

from .vehicle_registry import (
    vehicle_registry,
)


DEMO_ORIGIN_LATITUDE = 23.0225
DEMO_ORIGIN_LONGITUDE = 72.5714


class SimVehicleSource:
    """
    Development-only telemetry source.

    The important part is not the simulator itself.

    The important part is that this simulator outputs the same
    VehicleState contract that ArduPilot SITL and real MAVLink
    hardware will use later.
    """

    def __init__(
        self,
        vehicle_id: str = "MN-001-SIM",
        callsign: str = "MN-001",
        update_hz: float = 10.0,
    ) -> None:
        self.vehicle_id = vehicle_id
        self.callsign = callsign

        self.update_hz = max(
            1.0,
            update_hz,
        )

        self._task: asyncio.Task | None = None

        self._running = False

    async def start(
        self,
    ) -> None:
        if (
            self._task is not None
            and not self._task.done()
        ):
            return

        self._running = True

        self._task = (
            asyncio.create_task(
                self._run(),
                name="missionnexus-sim-vehicle",
            )
        )

    async def stop(
        self,
    ) -> None:
        self._running = False

        if self._task is None:
            return

        self._task.cancel()

        try:
            await self._task
        except asyncio.CancelledError:
            pass

        self._task = None

    async def _run(
        self,
    ) -> None:
        started_at = monotonic()

        interval = (
            1.0 /
            self.update_hz
        )

        while self._running:
            elapsed = (
                monotonic()
                - started_at
            )

            vehicle = (
                self._build_vehicle_state(
                    elapsed
                )
            )

            await vehicle_registry.upsert(
                vehicle
            )

            await asyncio.sleep(
                interval
            )

    def _build_vehicle_state(
        self,
        elapsed: float,
    ) -> VehicleState:
        radius_m = 320.0

        angular_rate_rad_s = 0.015

        angle = (
            elapsed *
            angular_rate_rad_s
        )

        east_m = (
            math.cos(angle)
            * radius_m
        )

        north_m = (
            math.sin(angle)
            * radius_m
        )

        meters_per_degree_latitude = (
            111_320.0
        )

        meters_per_degree_longitude = (
            meters_per_degree_latitude
            * math.cos(
                math.radians(
                    DEMO_ORIGIN_LATITUDE
                )
            )
        )

        latitude = (
            DEMO_ORIGIN_LATITUDE
            + (
                north_m
                / meters_per_degree_latitude
            )
        )

        longitude = (
            DEMO_ORIGIN_LONGITUDE
            + (
                east_m
                / meters_per_degree_longitude
            )
        )

        ground_speed = (
            radius_m
            * angular_rate_rad_s
        )

        heading_deg = (
            math.degrees(angle)
            + 90.0
        ) % 360.0

        north_velocity = (
            math.cos(angle)
            * ground_speed
        )

        east_velocity = (
            -math.sin(angle)
            * ground_speed
        )

        relative_altitude = (
            60.0
            + math.sin(
                elapsed * 0.08
            ) * 8.0
        )

        vertical_speed = (
            math.cos(
                elapsed * 0.08
            )
            * 0.64
        )

        battery_remaining = max(
            0.0,
            100.0
            - elapsed * 0.02,
        )

        voltage = (
            16.6
            - (
                1.8
                * (
                    1.0
                    - battery_remaining
                    / 100.0
                )
            )
        )

        current = (
            7.5
            + abs(
                math.sin(
                    elapsed * 0.17
                )
            ) * 2.5
        )

        now = time()

        return VehicleState(
            vehicle_id=
                self.vehicle_id,

            callsign=
                self.callsign,

            source=
                "SIM",

            vehicle_type=
                "MULTIROTOR",

            connected=
                True,

            armed=
                True,

            flight_mode=
                "AUTO",

            position=
                GeoPosition(
                    latitude_deg=
                        latitude,

                    longitude_deg=
                        longitude,

                    altitude_msl_m=
                        165.0
                        + relative_altitude,

                    altitude_relative_m=
                        relative_altitude,
                ),

            attitude=
                AttitudeState(
                    roll_deg=
                        math.sin(
                            elapsed * 0.24
                        ) * 5.0,

                    pitch_deg=
                        math.sin(
                            elapsed * 0.15
                        ) * 2.0,

                    yaw_deg=
                        heading_deg,
                ),

            motion=
                MotionState(
                    north_mps=
                        north_velocity,

                    east_mps=
                        east_velocity,

                    down_mps=
                        -vertical_speed,

                    ground_speed_mps=
                        ground_speed,

                    air_speed_mps=
                        None,

                    vertical_speed_mps=
                        vertical_speed,

                    heading_deg=
                        heading_deg,
                ),

            battery=
                BatteryState(
                    voltage_v=
                        voltage,

                    current_a=
                        current,

                    remaining_percent=
                        battery_remaining,

                    consumed_mah=
                        elapsed
                        * current
                        / 3.6,
                ),

            gps=
                GpsState(
                    fix_type=
                        3,

                    satellites_visible=
                        16,

                    hdop=
                        0.8,

                    vdop=
                        1.1,
                ),

            link=
                LinkState(
                    state=
                        "CONNECTED",

                    heartbeat_age_ms=
                        0.0,

                    rssi_dbm=
                        -63.0,

                    quality_percent=
                        96.0,

                    packet_loss_percent=
                        0.0,
                ),

            health=
                HealthState(
                    overall=
                        "NOMINAL",

                    gps_ok=
                        True,

                    battery_ok=
                        battery_remaining
                        > 25.0,

                    attitude_ok=
                        True,

                    link_ok=
                        True,

                    failsafe_active=
                        False,

                    warnings=
                        [],
                ),

            mission=
                MissionState(
                    mission_id=
                        "MN-DEV-001",

                    state=
                        "ACTIVE",

                    current_waypoint=
                        2,

                    total_waypoints=
                        6,
                ),

            capabilities=
                VehicleCapabilities(
                    mavlink=
                        False,

                    manual_control=
                        True,

                    autonomous_navigation=
                        True,

                    camera=
                        False,

                    computer_vision=
                        False,

                    companion_computer=
                        False,

                    multi_vehicle=
                        True,
                ),

            home_position=
                GeoPosition(
                    latitude_deg=
                        DEMO_ORIGIN_LATITUDE,

                    longitude_deg=
                        DEMO_ORIGIN_LONGITUDE,

                    altitude_msl_m=
                        165.0,

                    altitude_relative_m=
                        0.0,
                ),

            system_id=
                1,

            component_id=
                1,

            last_heartbeat_unix=
                now,

            metadata={
                "development_only":
                    True,

                "vehicle_profile":
                    "MN-001",

                "airframe":
                    "S500 development platform",

                "telemetry_source":
                    "MissionNexus simulator",
            },
        )


sim_vehicle_source = SimVehicleSource()