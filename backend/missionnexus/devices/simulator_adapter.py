from __future__ import annotations

import asyncio

from time import time

from .base_adapter import BaseDeviceAdapter

from .device_models import (
    DeviceConnectionConfig,
    DeviceDiagnostics,
    DeviceState,
)

from ..sim_vehicle_source import sim_vehicle_source

from ..vehicle_registry import vehicle_registry


# ============================================================
# MissionNexus Simulator Device Adapter
# ============================================================


class SimulatorDeviceAdapter(BaseDeviceAdapter):
    """
    Hardware Integration adapter for MN-001-SIM.

    The simulator is intentionally treated as a normal
    MissionNexus device connection.

    This lets the Device Manager later replace the simulator
    with MAVLink Serial, UDP, TCP, or real hardware without
    changing dashboard telemetry consumers.
    """

    device_id = "MN-001-SIM-ADAPTER"
    connection_type = "SIMULATOR"

    def __init__(self) -> None:
        super().__init__()

        self._paired = False
        self._connected = False

        self._connected_at_unix: float | None = None
        self._last_error: str | None = None

    # ========================================================
    # Connect
    # ========================================================

    async def connect(
        self,
        config: DeviceConnectionConfig,
    ) -> DeviceState:
        previous_config = self._config

        try:
            if (
                self._connected
                and previous_config is not None
                and previous_config.vehicle_id != config.vehicle_id
            ):
                await sim_vehicle_source.stop()

                await vehicle_registry.remove(
                    previous_config.vehicle_id
                )

            self._config = config

            sim_vehicle_source.vehicle_id = config.vehicle_id
            sim_vehicle_source.callsign = config.callsign

            await sim_vehicle_source.start()

            self._paired = True
            self._connected = True
            self._connected_at_unix = time()
            self._last_error = None

            # Wait briefly for the simulator to publish its
            # first normalized VehicleState.
            for _ in range(25):
                vehicle = await vehicle_registry.get(
                    config.vehicle_id
                )

                if vehicle is not None:
                    break

                await asyncio.sleep(0.02)

            return await self.snapshot()

        except Exception as error:
            self._connected = False
            self._last_error = str(error)
            raise

    # ========================================================
    # Disconnect
    # ========================================================

    async def disconnect(self) -> DeviceState:
        vehicle_id = (
            self._config.vehicle_id
            if self._config is not None
            else sim_vehicle_source.vehicle_id
        )

        try:
            await sim_vehicle_source.stop()

            await vehicle_registry.remove(
                vehicle_id
            )

            self._connected = False
            self._connected_at_unix = None
            self._last_error = None

        except Exception as error:
            self._last_error = str(error)
            raise

        return await self.snapshot()

    # ========================================================
    # Snapshot
    # ========================================================

    async def snapshot(self) -> DeviceState:
        config = self._config

        vehicle_id = (
            config.vehicle_id
            if config is not None
            else sim_vehicle_source.vehicle_id
        )

        vehicle = await vehicle_registry.get(
            vehicle_id
        )

        vehicle_available = vehicle is not None

        connected = (
            self._connected
            and vehicle_available
        )

        if not self._paired:
            status = "UNPAIRED"

        elif self._connected and not vehicle_available:
            status = "CONNECTING"

        elif connected:
            status = "CONNECTED"

        else:
            status = "DISCONNECTED"

        healthy = False

        diagnostics = DeviceDiagnostics()

        metadata: dict[str, object] = {
            "development_only": True,
            "adapter": "SimulatorDeviceAdapter",
        }

        if vehicle is not None:
            heartbeat_age_ms: float | None = None

            if vehicle.last_heartbeat_unix is not None:
                heartbeat_age_ms = max(
                    0.0,
                    (
                        time()
                        - vehicle.last_heartbeat_unix
                    )
                    * 1000.0,
                )

            healthy = (
                vehicle.connected
                and vehicle.health.link_ok
                and vehicle.health.overall
                in {
                    "NOMINAL",
                    "OK",
                    "HEALTHY",
                }
            )

            if connected and not healthy:
                status = "DEGRADED"

            diagnostics = DeviceDiagnostics(
                heartbeat_age_ms=heartbeat_age_ms,
                packets_per_second=sim_vehicle_source.update_hz,
                latency_ms=heartbeat_age_ms,
                rssi_dbm=vehicle.link.rssi_dbm,
                quality_percent=vehicle.link.quality_percent,
                packet_loss_percent=vehicle.link.packet_loss_percent,
                last_message_unix=vehicle.updated_at_unix,
                details={
                    "source": vehicle.source,
                    "flight_mode": vehicle.flight_mode,
                    "armed": vehicle.armed,
                    "vehicle_type": vehicle.vehicle_type,
                    "system_id": vehicle.system_id,
                    "component_id": vehicle.component_id,
                    "update_hz": sim_vehicle_source.update_hz,
                    "airframe": vehicle.metadata.get(
                        "airframe"
                    ),
                },
            )

            metadata.update(
                {
                    "callsign": vehicle.callsign,
                    "vehicle_source": vehicle.source,
                    "vehicle_profile": vehicle.metadata.get(
                        "vehicle_profile"
                    ),
                }
            )

        state = DeviceState(
            device_id=self.device_id,
            name="MissionNexus Simulator",
            device_type="FLIGHT_CONTROLLER",
            connection_type=self.connection_type,
            transport="INTERNAL",
            protocol="MISSIONNEXUS_SIM",
            vehicle_id=vehicle_id,
            status=status,
            paired=self._paired,
            connected=connected,
            healthy=healthy,
            diagnostics=diagnostics,
            config=config,
            last_error=self._last_error,
            connected_at_unix=self._connected_at_unix,
            metadata=metadata,
        )

        state.touch()

        return state