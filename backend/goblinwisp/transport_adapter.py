from __future__ import annotations

import asyncio
import base64

from abc import (
    ABC,
    abstractmethod,
)

from dataclasses import (
    asdict,
    dataclass,
    field,
)

from time import time
from typing import Any
from uuid import uuid4

from .models import (
    GoblinWispTransportType,
)


# ============================================================
# Exceptions
# ============================================================


class GoblinWispTransportError(
    RuntimeError
):
    """
    Base exception for GoblinWisp transport adapter errors.
    """


class GoblinWispTransportNotConnectedError(
    GoblinWispTransportError
):
    """
    Raised when a transport operation is attempted while
    the underlying transport is disconnected.
    """


# ============================================================
# Transport Adapter Status
# ============================================================


class GoblinWispTransportAdapterStatus:
    DISCONNECTED = "DISCONNECTED"

    CONNECTING = "CONNECTING"

    CONNECTED = "CONNECTED"

    DEGRADED = "DEGRADED"

    ERROR = "ERROR"


# ============================================================
# Transport Configuration
# ============================================================


@dataclass(slots=True)
class GoblinWispTransportConfig:
    """
    Generic configuration shared by GoblinWisp transport
    adapters.

    Transport-specific settings belong in metadata.
    """

    transport_type: str

    local_node_id: str

    remote_node_id: str

    interface_name: str | None = None

    peer_address: str | None = None

    channel: int | None = None

    host: str | None = None

    port: int | None = None

    serial_port: str | None = None

    baud_rate: int | None = None

    auto_reconnect: bool = True

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
# Transport Diagnostics
# ============================================================


@dataclass(slots=True)
class GoblinWispTransportDiagnostics:
    """
    Runtime diagnostics for the underlying communication
    transport.

    These values describe the transport only.

    They do NOT represent GoblinWisp cryptographic
    authentication or session security.
    """

    packets_sent: int = 0

    packets_received: int = 0

    bytes_sent: int = 0

    bytes_received: int = 0

    send_failures: int = 0

    receive_failures: int = 0

    rssi_dbm: float | None = None

    quality_percent: float | None = None

    packet_loss_percent: float | None = None

    latency_ms: float | None = None

    last_tx_unix: float | None = None

    last_rx_unix: float | None = None

    connected_at_unix: float | None = None

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
# Transport Packet
# ============================================================


@dataclass(slots=True)
class GoblinWispTransportPacket:
    """
    Raw packet exchanged through a GoblinWisp transport.

    The packet payload at this layer is opaque bytes.

    Important:

    This class does NOT perform encryption or decryption.

    GoblinWisp secure-session processing sits above the
    transport adapter.
    """

    payload: bytes

    source_node_id: str

    destination_node_id: str

    packet_id: str = field(
        default_factory=lambda: str(
            uuid4()
        )
    )

    timestamp_unix: float = field(
        default_factory=time
    )

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    @property
    def size_bytes(
        self,
    ) -> int:
        return len(
            self.payload
        )

    def to_dict(
        self,
        include_payload: bool = False,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "packet_id":
                self.packet_id,

            "source_node_id":
                self.source_node_id,

            "destination_node_id":
                self.destination_node_id,

            "timestamp_unix":
                self.timestamp_unix,

            "size_bytes":
                self.size_bytes,

            "metadata":
                self.metadata,
        }

        if include_payload:
            result["payload_base64"] = (
                base64.b64encode(
                    self.payload
                ).decode(
                    "ascii"
                )
            )

        return result


# ============================================================
# Transport Adapter Snapshot
# ============================================================


@dataclass(slots=True)
class GoblinWispTransportAdapterSnapshot:
    adapter_id: str

    adapter_name: str

    transport_type: str

    status: str

    connected: bool

    healthy: bool

    config: dict[str, Any] | None

    diagnostics: dict[str, Any]

    last_error: str | None

    updated_at_unix: float = field(
        default_factory=time
    )

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
# Base Transport Adapter
# ============================================================


class GoblinWispTransportAdapter(
    ABC
):
    """
    Base interface for every GoblinWisp communication
    transport.

    Implementations may include:

        ESP-NOW
        Wi-Fi
        Serial
        UDP
        TCP
        RF radio
        LoRa
        Mesh
        Satellite
        custom hardware links

    GoblinWisp secure-session logic remains independent of
    this class.

    The adapter's responsibility is only:

        connect
        disconnect
        transmit opaque bytes
        receive opaque bytes
        expose transport diagnostics
    """

    adapter_id: str = "UNKNOWN"

    adapter_name: str = "Unknown GoblinWisp Transport"

    transport_type: str = (
        GoblinWispTransportType.CUSTOM
    )

    def __init__(
        self,
    ) -> None:
        self._config: (
            GoblinWispTransportConfig | None
        ) = None

        self._status = (
            GoblinWispTransportAdapterStatus.DISCONNECTED
        )

        self._connected = False

        self._healthy = False

        self._last_error: str | None = None

        self._diagnostics = (
            GoblinWispTransportDiagnostics()
        )

        self._state_lock = (
            asyncio.Lock()
        )


    # ========================================================
    # Abstract Lifecycle
    # ========================================================

    @abstractmethod
    async def connect(
        self,
        config: GoblinWispTransportConfig,
    ) -> GoblinWispTransportAdapterSnapshot:
        """
        Connect the underlying transport.
        """

        raise NotImplementedError


    @abstractmethod
    async def disconnect(
        self,
    ) -> GoblinWispTransportAdapterSnapshot:
        """
        Disconnect the underlying transport.
        """

        raise NotImplementedError


    # ========================================================
    # Abstract Data Plane
    # ========================================================

    @abstractmethod
    async def send(
        self,
        packet: GoblinWispTransportPacket,
    ) -> None:
        """
        Send one opaque GoblinWisp transport packet.
        """

        raise NotImplementedError


    @abstractmethod
    async def receive(
        self,
        timeout_seconds: float | None = None,
    ) -> GoblinWispTransportPacket | None:
        """
        Receive one opaque GoblinWisp transport packet.

        None may be returned when no packet arrives before
        the requested timeout.
        """

        raise NotImplementedError


    # ========================================================
    # Reconnect
    # ========================================================

    async def reconnect(
        self,
    ) -> GoblinWispTransportAdapterSnapshot:
        """
        Reconnect using the most recently supplied transport
        configuration.
        """

        config = (
            self._config
        )

        if config is None:
            raise GoblinWispTransportError(
                "Cannot reconnect GoblinWisp transport: "
                "no previous configuration exists"
            )

        await self.disconnect()

        return await self.connect(
            config
        )


    # ========================================================
    # Snapshot
    # ========================================================

    async def snapshot(
        self,
    ) -> GoblinWispTransportAdapterSnapshot:
        async with self._state_lock:
            config = (
                self._config.to_dict()
                if self._config is not None
                else None
            )

            return GoblinWispTransportAdapterSnapshot(
                adapter_id=
                    self.adapter_id,

                adapter_name=
                    self.adapter_name,

                transport_type=
                    self.transport_type,

                status=
                    self._status,

                connected=
                    self._connected,

                healthy=
                    self._healthy,

                config=
                    config,

                diagnostics=
                    self._diagnostics.to_dict(),

                last_error=
                    self._last_error,
            )


    # ========================================================
    # State Helpers
    # ========================================================

    async def _set_connecting(
        self,
        config: GoblinWispTransportConfig,
    ) -> None:
        async with self._state_lock:
            self._config = (
                config
            )

            self._status = (
                GoblinWispTransportAdapterStatus.CONNECTING
            )

            self._connected = False

            self._healthy = False

            self._last_error = None


    async def _set_connected(
        self,
    ) -> None:
        async with self._state_lock:
            self._status = (
                GoblinWispTransportAdapterStatus.CONNECTED
            )

            self._connected = True

            self._healthy = True

            self._last_error = None

            self._diagnostics.connected_at_unix = (
                time()
            )


    async def _set_disconnected(
        self,
    ) -> None:
        async with self._state_lock:
            self._status = (
                GoblinWispTransportAdapterStatus.DISCONNECTED
            )

            self._connected = False

            self._healthy = False


    async def _set_error(
        self,
        error: str,
    ) -> None:
        async with self._state_lock:
            self._status = (
                GoblinWispTransportAdapterStatus.ERROR
            )

            self._connected = False

            self._healthy = False

            self._last_error = (
                error
            )


    async def _set_degraded(
        self,
        error: str | None = None,
    ) -> None:
        async with self._state_lock:
            self._status = (
                GoblinWispTransportAdapterStatus.DEGRADED
            )

            self._connected = True

            self._healthy = False

            if error is not None:
                self._last_error = (
                    error
                )


    # ========================================================
    # TX Diagnostics
    # ========================================================

    async def _record_tx_success(
        self,
        size_bytes: int,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.packets_sent += 1

            self._diagnostics.bytes_sent += (
                max(
                    0,
                    size_bytes,
                )
            )

            self._diagnostics.last_tx_unix = (
                time()
            )


    async def _record_tx_failure(
        self,
        error: str | None = None,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.send_failures += 1

            if error is not None:
                self._last_error = (
                    error
                )


    # ========================================================
    # RX Diagnostics
    # ========================================================

    async def _record_rx_success(
        self,
        size_bytes: int,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.packets_received += 1

            self._diagnostics.bytes_received += (
                max(
                    0,
                    size_bytes,
                )
            )

            self._diagnostics.last_rx_unix = (
                time()
            )


    async def _record_rx_failure(
        self,
        error: str | None = None,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.receive_failures += 1

            if error is not None:
                self._last_error = (
                    error
                )


    # ========================================================
    # Link Diagnostics
    # ========================================================

    async def update_link_diagnostics(
        self,
        rssi_dbm: float | None = None,
        quality_percent: float | None = None,
        packet_loss_percent: float | None = None,
        latency_ms: float | None = None,
    ) -> None:
        async with self._state_lock:
            if rssi_dbm is not None:
                self._diagnostics.rssi_dbm = (
                    rssi_dbm
                )

            if quality_percent is not None:
                self._diagnostics.quality_percent = (
                    max(
                        0.0,
                        min(
                            100.0,
                            quality_percent,
                        ),
                    )
                )

            if packet_loss_percent is not None:
                self._diagnostics.packet_loss_percent = (
                    max(
                        0.0,
                        min(
                            100.0,
                            packet_loss_percent,
                        ),
                    )
                )

            if latency_ms is not None:
                self._diagnostics.latency_ms = (
                    max(
                        0.0,
                        latency_ms,
                    )
                )


    # ========================================================
    # Assertions
    # ========================================================

    async def require_connected(
        self,
    ) -> None:
        async with self._state_lock:
            connected = (
                self._connected
            )

        if not connected:
            raise (
                GoblinWispTransportNotConnectedError(
                    "GoblinWisp transport is not connected"
                )
            )


    # ========================================================
    # Public State Properties
    # ========================================================

    @property
    def connected(
        self,
    ) -> bool:
        return (
            self._connected
        )


    @property
    def healthy(
        self,
    ) -> bool:
        return (
            self._healthy
        )


    @property
    def status(
        self,
    ) -> str:
        return (
            self._status
        )


    @property
    def config(
        self,
    ) -> GoblinWispTransportConfig | None:
        return (
            self._config
        )