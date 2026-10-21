from __future__ import annotations

import asyncio

from typing import Final

from .base_adapter import (
    BaseDeviceAdapter,
    DeviceAdapterError,
)

from .device_models import (
    DeviceConnectionConfig,
    DeviceConnectionOption,
    DeviceState,
)

from .simulator_adapter import SimulatorDeviceAdapter


# ============================================================
# Device Manager Error
# ============================================================


class DeviceManagerError(RuntimeError):
    """
    Raised when MissionNexus cannot complete a requested
    hardware integration operation.
    """


# ============================================================
# Device Manager
# ============================================================


class DeviceManager:
    """
    MissionNexus Hardware Integration manager.

    Responsibilities:
        connection discovery/options
        device pairing
        device lifecycle
        reconnection
        diagnostics
        adapter abstraction

    Vehicle telemetry continues to be normalized into the
    existing VehicleRegistry.
    """

    def __init__(self) -> None:
        simulator_adapter = SimulatorDeviceAdapter()

        self._adapters: dict[str, BaseDeviceAdapter] = {
            simulator_adapter.device_id: simulator_adapter,
        }

        self._lock = asyncio.Lock()

    # ========================================================
    # Startup
    # ========================================================

    async def startup(self) -> None:
        """
        Preserve the current MissionNexus development behavior.

        MN-001-SIM automatically connects when the backend
        starts.

        Later this can come from saved hardware profiles.
        """

        await self.pair(
            DeviceConnectionConfig(
                connection_type="SIMULATOR",
                vehicle_id="MN-001-SIM",
                callsign="MN-001",
                auto_reconnect=True,
                metadata={
                    "startup_profile": True,
                },
            )
        )

    # ========================================================
    # Shutdown
    # ========================================================

    async def shutdown(self) -> None:
        for adapter in self._adapters.values():
            try:
                await adapter.disconnect()
            except Exception:
                # Shutdown must continue even if an adapter
                # fails to disconnect cleanly.
                pass

    # ========================================================
    # Connection Options
    # ========================================================

    def connection_options(
        self,
    ) -> list[DeviceConnectionOption]:
        return [
            DeviceConnectionOption(
                connection_type="SIMULATOR",
                label="MissionNexus Simulator",
                description=(
                    "Built-in MN-001 development vehicle source."
                ),
                transport="INTERNAL",
                protocol="MISSIONNEXUS_SIM",
                supported=True,
                config_fields=[
                    "vehicle_id",
                    "callsign",
                ],
                status="AVAILABLE",
            ),

            DeviceConnectionOption(
                connection_type="MAVLINK_SERIAL",
                label="MAVLink Serial / USB",
                description=(
                    "Flight controller connected through "
                    "USB or telemetry serial."
                ),
                transport="SERIAL",
                protocol="MAVLINK",
                supported=False,
                config_fields=[
                    "serial_port",
                    "baud_rate",
                    "vehicle_id",
                    "callsign",
                ],
                status="COMING_NEXT",
            ),

            DeviceConnectionOption(
                connection_type="MAVLINK_UDP",
                label="MAVLink UDP",
                description=(
                    "MAVLink connection over a UDP "
                    "network endpoint."
                ),
                transport="UDP",
                protocol="MAVLINK",
                supported=False,
                config_fields=[
                    "host",
                    "network_port",
                    "vehicle_id",
                    "callsign",
                ],
                status="COMING_NEXT",
            ),

            DeviceConnectionOption(
                connection_type="MAVLINK_TCP",
                label="MAVLink TCP",
                description=(
                    "MAVLink connection over a TCP "
                    "network endpoint."
                ),
                transport="TCP",
                protocol="MAVLINK",
                supported=False,
                config_fields=[
                    "host",
                    "network_port",
                    "vehicle_id",
                    "callsign",
                ],
                status="COMING_NEXT",
            ),
        ]

    # ========================================================
    # Pair
    # ========================================================

    async def pair(
        self,
        config: DeviceConnectionConfig,
    ) -> DeviceState:
        connection_type = (
            config.normalized_connection_type()
        )

        adapter = self._adapter_for_connection_type(
            connection_type
        )

        if adapter is None:
            option = self._option_for_connection_type(
                connection_type
            )

            if (
                option is not None
                and not option.supported
            ):
                raise DeviceManagerError(
                    (
                        f"{connection_type} is listed in "
                        "MissionNexus but its adapter has "
                        "not been enabled yet."
                    )
                )

            raise DeviceManagerError(
                (
                    "Unknown connection type: "
                    f"{connection_type!r}"
                )
            )

        async with self._lock:
            try:
                return await adapter.connect(
                    config
                )

            except DeviceAdapterError:
                raise

            except Exception as error:
                raise DeviceManagerError(
                    str(error)
                ) from error

    # ========================================================
    # Disconnect
    # ========================================================

    async def disconnect(
        self,
        device_id: str,
    ) -> DeviceState:
        adapter = self._adapters.get(
            device_id
        )

        if adapter is None:
            raise DeviceManagerError(
                (
                    f"Device {device_id!r} "
                    "was not found."
                )
            )

        async with self._lock:
            try:
                return await adapter.disconnect()

            except Exception as error:
                raise DeviceManagerError(
                    str(error)
                ) from error

    # ========================================================
    # Reconnect
    # ========================================================

    async def reconnect(
        self,
        device_id: str,
    ) -> DeviceState:
        adapter = self._adapters.get(
            device_id
        )

        if adapter is None:
            raise DeviceManagerError(
                (
                    f"Device {device_id!r} "
                    "was not found."
                )
            )

        async with self._lock:
            try:
                return await adapter.reconnect()

            except DeviceAdapterError as error:
                raise DeviceManagerError(
                    str(error)
                ) from error

            except Exception as error:
                raise DeviceManagerError(
                    str(error)
                ) from error

    # ========================================================
    # Get Device
    # ========================================================

    async def get_device(
        self,
        device_id: str,
    ) -> DeviceState | None:
        adapter = self._adapters.get(
            device_id
        )

        if adapter is None:
            return None

        return await adapter.snapshot()

    # ========================================================
    # List Devices
    # ========================================================

    async def list_devices(
        self,
    ) -> list[DeviceState]:
        devices: list[DeviceState] = []

        for adapter in self._adapters.values():
            devices.append(
                await adapter.snapshot()
            )

        return devices

    # ========================================================
    # Snapshot
    # ========================================================

    async def snapshot(self) -> dict:
        devices = await self.list_devices()

        connected_count = sum(
            1
            for device in devices
            if device.connected
        )

        healthy_count = sum(
            1
            for device in devices
            if device.healthy
        )

        return {
            "type": "device_snapshot",
            "device_count": len(devices),
            "connected_count": connected_count,
            "healthy_count": healthy_count,
            "devices": [
                device.to_dict()
                for device in devices
            ],
        }

    # ========================================================
    # Adapter Lookup
    # ========================================================

    def _adapter_for_connection_type(
        self,
        connection_type: str,
    ) -> BaseDeviceAdapter | None:
        for adapter in self._adapters.values():
            if (
                adapter.connection_type
                == connection_type
            ):
                return adapter

        return None

    # ========================================================
    # Connection Option Lookup
    # ========================================================

    def _option_for_connection_type(
        self,
        connection_type: str,
    ) -> DeviceConnectionOption | None:
        for option in self.connection_options():
            if (
                option.connection_type
                == connection_type
            ):
                return option

        return None


# ============================================================
# Singleton
# ============================================================


device_manager: Final[DeviceManager] = (
    DeviceManager()
)