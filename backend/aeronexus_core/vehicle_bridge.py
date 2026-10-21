from __future__ import annotations

import asyncio

from typing import Final

from missionnexus.vehicle_registry import (
    vehicle_registry,
)

from .data_models import (
    AeronexusDataType,
    AeronexusEvent,
    AeronexusSeverity,
    GeoContext,
)

from .event_bus import (
    aeronexus_event_bus,
)


# ============================================================
# Vehicle Data Fabric Bridge
# ============================================================


class VehicleDataFabricBridge:
    """
    Bridges normalized MissionNexus VehicleState snapshots
    into the shared Aeronexus Data Fabric.

    MissionNexus VehicleRegistry may update at a high rate
    such as 10 Hz.

    The Aeronexus Data Fabric intentionally receives a lower
    rate normalized stream suitable for:

        intelligence correlation
        mission history
        GoblinWisp integration
        GeoFusion integration
        sensor fusion
        mission debrief

    Live dashboards may continue consuming the original
    VehicleRegistry WebSocket at full telemetry rate.
    """

    def __init__(
        self,
        publish_interval_seconds: float = 1.0,
    ) -> None:
        self.publish_interval_seconds = max(
            0.1,
            publish_interval_seconds,
        )

        self._task: asyncio.Task | None = None

        self._running = False


    # ========================================================
    # Start
    # ========================================================

    async def start(
        self,
    ) -> None:
        if (
            self._task is not None
            and not self._task.done()
        ):
            return

        self._running = True

        self._task = asyncio.create_task(
            self._run(),
            name="aeronexus-vehicle-data-bridge",
        )


    # ========================================================
    # Stop
    # ========================================================

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


    # ========================================================
    # Worker
    # ========================================================

    async def _run(
        self,
    ) -> None:
        while self._running:
            try:
                vehicles = (
                    await vehicle_registry.list()
                )

                for vehicle in vehicles:
                    if not vehicle.connected:
                        continue

                    event = (
                        self._build_vehicle_event(
                            vehicle
                        )
                    )

                    await aeronexus_event_bus.publish(
                        event
                    )

            except asyncio.CancelledError:
                raise

            except Exception:
                # The bridge must not terminate the backend
                # because of one malformed telemetry cycle.
                pass

            await asyncio.sleep(
                self.publish_interval_seconds
            )


    # ========================================================
    # Event Builder
    # ========================================================

    @staticmethod
    def _build_vehicle_event(
        vehicle,
    ) -> AeronexusEvent:
        mission_id = (
            vehicle.mission.mission_id
        )

        location = GeoContext(
            latitude_deg=
                vehicle.position.latitude_deg,

            longitude_deg=
                vehicle.position.longitude_deg,

            altitude_m=
                vehicle.position.altitude_relative_m,

            heading_deg=
                vehicle.motion.heading_deg,
        )

        payload = {
            "callsign":
                vehicle.callsign,

            "source":
                vehicle.source,

            "vehicle_type":
                vehicle.vehicle_type,

            "connected":
                vehicle.connected,

            "armed":
                vehicle.armed,

            "flight_mode":
                vehicle.flight_mode,

            "position": {
                "latitude_deg":
                    vehicle.position.latitude_deg,

                "longitude_deg":
                    vehicle.position.longitude_deg,

                "altitude_msl_m":
                    vehicle.position.altitude_msl_m,

                "altitude_relative_m":
                    vehicle.position.altitude_relative_m,
            },

            "attitude": {
                "roll_deg":
                    vehicle.attitude.roll_deg,

                "pitch_deg":
                    vehicle.attitude.pitch_deg,

                "yaw_deg":
                    vehicle.attitude.yaw_deg,
            },

            "motion": {
                "north_mps":
                    vehicle.motion.north_mps,

                "east_mps":
                    vehicle.motion.east_mps,

                "down_mps":
                    vehicle.motion.down_mps,

                "ground_speed_mps":
                    vehicle.motion.ground_speed_mps,

                "air_speed_mps":
                    vehicle.motion.air_speed_mps,

                "vertical_speed_mps":
                    vehicle.motion.vertical_speed_mps,

                "heading_deg":
                    vehicle.motion.heading_deg,
            },

            "battery": {
                "voltage_v":
                    vehicle.battery.voltage_v,

                "current_a":
                    vehicle.battery.current_a,

                "remaining_percent":
                    vehicle.battery.remaining_percent,

                "consumed_mah":
                    vehicle.battery.consumed_mah,
            },

            "gps": {
                "fix_type":
                    vehicle.gps.fix_type,

                "satellites_visible":
                    vehicle.gps.satellites_visible,

                "hdop":
                    vehicle.gps.hdop,

                "vdop":
                    vehicle.gps.vdop,
            },

            "link": {
                "state":
                    vehicle.link.state,

                "heartbeat_age_ms":
                    vehicle.link.heartbeat_age_ms,

                "rssi_dbm":
                    vehicle.link.rssi_dbm,

                "quality_percent":
                    vehicle.link.quality_percent,

                "packet_loss_percent":
                    vehicle.link.packet_loss_percent,
            },

            "health": {
                "overall":
                    vehicle.health.overall,

                "gps_ok":
                    vehicle.health.gps_ok,

                "battery_ok":
                    vehicle.health.battery_ok,

                "attitude_ok":
                    vehicle.health.attitude_ok,

                "link_ok":
                    vehicle.health.link_ok,

                "failsafe_active":
                    vehicle.health.failsafe_active,

                "warnings":
                    list(
                        vehicle.health.warnings
                    ),
            },

            "mission": {
                "mission_id":
                    vehicle.mission.mission_id,

                "state":
                    vehicle.mission.state,

                "current_waypoint":
                    vehicle.mission.current_waypoint,

                "total_waypoints":
                    vehicle.mission.total_waypoints,
            },
        }

        severity = (
            AeronexusSeverity.INFO
        )

        if (
            vehicle.health.failsafe_active
            or vehicle.health.overall
            in {
                "CRITICAL",
                "FAULT",
            }
        ):
            severity = (
                AeronexusSeverity.CRITICAL
            )

        elif (
            vehicle.health.warnings
            or not vehicle.health.battery_ok
            or not vehicle.health.gps_ok
            or not vehicle.health.link_ok
        ):
            severity = (
                AeronexusSeverity.MEDIUM
            )

        return AeronexusEvent(
            source_system=
                "MISSIONNEXUS",

            source_component=
                vehicle.source,

            data_type=
                AeronexusDataType.VEHICLE_TELEMETRY,

            payload=
                payload,

            vehicle_id=
                vehicle.vehicle_id,

            mission_id=
                mission_id,

            device_id=
                (
                    f"{vehicle.vehicle_id}"
                    "-FLIGHT-CONTROLLER"
                ),

            severity=
                severity,

            location=
                location,

            tags=[
                "vehicle",
                "telemetry",
                vehicle.vehicle_type.lower(),
            ],

            metadata={
                "vehicle_profile":
                    vehicle.metadata.get(
                        "vehicle_profile"
                    ),

                "airframe":
                    vehicle.metadata.get(
                        "airframe"
                    ),

                "telemetry_source":
                    vehicle.metadata.get(
                        "telemetry_source"
                    ),

                "system_id":
                    vehicle.system_id,

                "component_id":
                    vehicle.component_id,
            },
        )


# ============================================================
# Shared Singleton
# ============================================================


vehicle_data_fabric_bridge: Final[
    VehicleDataFabricBridge
] = VehicleDataFabricBridge(
    publish_interval_seconds=1.0
)