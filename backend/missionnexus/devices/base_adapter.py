from __future__ import annotations

from abc import ABC, abstractmethod

from .device_models import (
    DeviceConnectionConfig,
    DeviceState,
)


# ============================================================
# Adapter Error
# ============================================================


class DeviceAdapterError(RuntimeError):
    """
    Base error raised by a MissionNexus device adapter.
    """


# ============================================================
# Base Device Adapter
# ============================================================


class BaseDeviceAdapter(ABC):
    """
    Base interface for every MissionNexus hardware adapter.

    Examples:
        SimulatorDeviceAdapter
        MavlinkSerialAdapter
        MavlinkUdpAdapter
        MavlinkTcpAdapter

    Every adapter exposes the same lifecycle:
        connect
        disconnect
        reconnect
        snapshot
    """

    device_id: str = "UNKNOWN"
    connection_type: str = "UNKNOWN"

    def __init__(self) -> None:
        self._config: DeviceConnectionConfig | None = None

    @property
    def config(self) -> DeviceConnectionConfig | None:
        return self._config

    @abstractmethod
    async def connect(
        self,
        config: DeviceConnectionConfig,
    ) -> DeviceState:
        raise NotImplementedError

    @abstractmethod
    async def disconnect(self) -> DeviceState:
        raise NotImplementedError

    @abstractmethod
    async def snapshot(self) -> DeviceState:
        raise NotImplementedError

    async def reconnect(self) -> DeviceState:
        """
        Default reconnect implementation.

        Individual hardware adapters may override this later
        if they require specialized reconnection behavior.
        """

        if self._config is None:
            raise DeviceAdapterError(
                "Device has no previous connection configuration."
            )

        config = self._config

        await self.disconnect()

        return await self.connect(config)