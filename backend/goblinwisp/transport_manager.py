from __future__ import annotations

import asyncio

from copy import deepcopy
from typing import Any, Final

from .espnow_adapter import (
    DEFAULT_BAUD_RATE,
    GoblinWispEspNowAdapter,
    goblinwisp_espnow_adapter,
)

from .manager import (
    GoblinWispManagerError,
    goblinwisp_manager,
)

from .models import (
    GoblinWispProfile,
    GoblinWispTransportType,
)

from .transport_adapter import (
    GoblinWispTransportAdapter,
    GoblinWispTransportAdapterSnapshot,
    GoblinWispTransportConfig,
    GoblinWispTransportError,
    GoblinWispTransportPacket,
)


# ============================================================
# Exceptions
# ============================================================


class GoblinWispTransportManagerError(
    RuntimeError
):
    """
    Raised when GoblinWisp transport orchestration fails.
    """


# ============================================================
# GoblinWisp Transport Manager
# ============================================================


class GoblinWispTransportManager:
    """
    Coordinates physical GoblinWisp transport adapters with
    GoblinWisp deployment profiles.

    Current physical architecture:

        MissionNexus
            │
            │ USB Serial
            ▼
        Ground ESP32-S3
            │
            │ ESP-NOW
            ▼
        Aircraft ESP32-S3

    Important separation:

        adapter.connected
            means MissionNexus can communicate with the
            ground ESP32-S3 bridge.

        logical transport connected
            means the ground bridge is ready AND the
            ESP-NOW air link reports a connected peer.

        GoblinWisp secure_session_active
            is separate again and becomes true only after
            authenticated GoblinWisp session establishment.

    Therefore:

        USB connected
            DOES NOT mean
        ESP-NOW peer connected

    and:

        ESP-NOW peer connected
            DOES NOT mean
        GoblinWisp secure session active.
    """

    def __init__(
        self,
    ) -> None:
        self._lock = asyncio.Lock()

        self._started = False

        self._adapters: dict[
            str,
            GoblinWispTransportAdapter,
        ] = {
            GoblinWispTransportType.ESP_NOW:
                goblinwisp_espnow_adapter,
        }

        self._profile_transport_types: dict[
            str,
            str,
        ] = {}

        self._monitor_tasks: dict[
            str,
            asyncio.Task,
        ] = {}

        self._monitor_interval_seconds = (
            1.0
        )


    # ========================================================
    # Startup
    # ========================================================

    async def startup(
        self,
    ) -> None:
        """
        Start GoblinWisp transport orchestration.

        No hardware connection is opened automatically.

        Physical connections are established only when a
        specific profile is explicitly connected.
        """

        async with self._lock:
            if self._started:
                return

            self._started = True


    # ========================================================
    # Shutdown
    # ========================================================

    async def shutdown(
        self,
    ) -> None:
        """
        Stop transport monitoring and disconnect all currently
        assigned GoblinWisp transport adapters.
        """

        async with self._lock:
            if not self._started:
                return

            profile_ids = list(
                self._profile_transport_types.keys()
            )

            monitor_tasks = list(
                self._monitor_tasks.values()
            )

            self._monitor_tasks.clear()

            self._started = False

        # ----------------------------------------------------
        # Stop monitor tasks first
        # ----------------------------------------------------

        for task in monitor_tasks:
            if not task.done():
                task.cancel()

        for task in monitor_tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass

        # ----------------------------------------------------
        # Disconnect assigned profiles
        # ----------------------------------------------------

        for profile_id in profile_ids:
            try:
                await self.disconnect_profile(
                    profile_id
                )

            except Exception:
                # Shutdown must continue even if one physical
                # adapter is already unavailable.
                pass

        async with self._lock:
            self._profile_transport_types.clear()


    # ========================================================
    # Runtime State
    # ========================================================

    async def is_started(
        self,
    ) -> bool:
        async with self._lock:
            return self._started


    # ========================================================
    # Adapter Registration
    # ========================================================

    async def register_adapter(
        self,
        transport_type: str,
        adapter: GoblinWispTransportAdapter,
    ) -> None:
        """
        Register a future GoblinWisp transport implementation.

        Examples:

            ESP-NOW
            UDP
            TCP
            Serial
            RF
            LoRa
            Mesh
            Satellite
        """

        normalized_type = (
            transport_type.strip().upper()
        )

        if not normalized_type:
            raise GoblinWispTransportManagerError(
                "transport_type is required"
            )

        async with self._lock:
            self._adapters[
                normalized_type
            ] = adapter


    # ========================================================
    # Connect Profile
    # ========================================================

    async def connect_profile(
        self,
        profile_id: str,
        serial_port: str | None = None,
        baud_rate: int | None = None,
        interface_name: str | None = None,
        peer_address: str | None = None,
        channel: int | None = None,
        host: str | None = None,
        port: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Connect the transport associated with a GoblinWisp
        profile.

        For the current ESP-NOW profile:

            serial_port
                is the Windows COM port belonging to the
                ground ESP32-S3.

            baud_rate
                is the USB serial bridge baud rate.

        Example:

            profile_id:
                GW-ESP32-ESPNOW-001

            serial_port:
                COM7

            baud_rate:
                115200
        """

        if not await self.is_started():
            raise GoblinWispTransportManagerError(
                "GoblinWisp transport manager is not started"
            )

        try:
            profile = (
                await goblinwisp_manager.get_profile(
                    profile_id
                )
            )

        except GoblinWispManagerError as error:
            raise GoblinWispTransportManagerError(
                str(
                    error
                )
            ) from error

        transport_type = (
            profile.transport.transport_type
        )

        adapter = await self._get_adapter(
            transport_type
        )

        await self._ensure_adapter_available(
            profile_id=
                profile_id,

            adapter=
                adapter,
        )

        config = (
            self._build_transport_config(
                profile=
                    profile,

                serial_port=
                    serial_port,

                baud_rate=
                    baud_rate,

                interface_name=
                    interface_name,

                peer_address=
                    peer_address,

                channel=
                    channel,

                host=
                    host,

                port=
                    port,

                metadata=
                    metadata,
            )
        )

        try:
            adapter_snapshot = (
                await adapter.connect(
                    config
                )
            )

        except GoblinWispTransportError:
            raise

        except Exception as error:
            raise GoblinWispTransportManagerError(
                "Failed to connect GoblinWisp transport: "
                f"{error}"
            ) from error

        async with self._lock:
            self._profile_transport_types[
                profile_id
            ] = transport_type

        # ----------------------------------------------------
        # At this point the USB bridge may be connected while
        # ESP-NOW peer connectivity is still false.
        #
        # Synchronize only the actual logical peer-link state.
        # ----------------------------------------------------

        await self._synchronize_profile_link_state(
            profile_id=
                profile_id,

            adapter_snapshot=
                adapter_snapshot,
        )

        await self._start_monitor(
            profile_id
        )

        return await self.profile_transport_snapshot(
            profile_id
        )


    # ========================================================
    # Disconnect Profile
    # ========================================================

    async def disconnect_profile(
        self,
        profile_id: str,
    ) -> dict[str, Any]:
        """
        Disconnect a profile's physical transport.

        If a GoblinWisp secure session is active,
        GoblinWispManager will invalidate it when its
        transport state becomes disconnected.
        """

        await self._stop_monitor(
            profile_id
        )

        adapter = await self._get_profile_adapter(
            profile_id
        )

        try:
            adapter_snapshot = (
                await adapter.disconnect()
            )

        except Exception as error:
            raise GoblinWispTransportManagerError(
                "Failed to disconnect GoblinWisp transport: "
                f"{error}"
            ) from error

        try:
            await goblinwisp_manager.set_transport_state(
                profile_id=
                    profile_id,

                connected=
                    False,
            )

        except GoblinWispManagerError as error:
            raise GoblinWispTransportManagerError(
                str(
                    error
                )
            ) from error

        async with self._lock:
            self._profile_transport_types.pop(
                profile_id,
                None,
            )

        return {
            "type":
                "goblinwisp_transport_profile",

            "profile_id":
                profile_id,

            "logical_connected":
                False,

            "adapter":
                adapter_snapshot.to_dict(),
        }


    # ========================================================
    # Reconnect Profile
    # ========================================================

    async def reconnect_profile(
        self,
        profile_id: str,
    ) -> dict[str, Any]:
        """
        Reconnect using the adapter's previous configuration.
        """

        if not await self.is_started():
            raise GoblinWispTransportManagerError(
                "GoblinWisp transport manager is not started"
            )

        adapter = await self._get_profile_adapter(
            profile_id
        )

        await self._stop_monitor(
            profile_id
        )

        try:
            adapter_snapshot = (
                await adapter.reconnect()
            )

        except Exception as error:
            raise GoblinWispTransportManagerError(
                "Failed to reconnect GoblinWisp transport: "
                f"{error}"
            ) from error

        await self._synchronize_profile_link_state(
            profile_id=
                profile_id,

            adapter_snapshot=
                adapter_snapshot,
        )

        await self._start_monitor(
            profile_id
        )

        return await self.profile_transport_snapshot(
            profile_id
        )


    # ========================================================
    # Request Physical Transport Status
    # ========================================================

    async def request_status(
        self,
        profile_id: str,
    ) -> dict[str, Any]:
        """
        Request updated diagnostics from a physical bridge.

        The current ESP-NOW implementation sends a
        STATUS_REQUEST frame to the ground ESP32-S3.
        """

        adapter = await self._get_profile_adapter(
            profile_id
        )

        if isinstance(
            adapter,
            GoblinWispEspNowAdapter,
        ):
            await adapter.request_status()

        adapter_snapshot = (
            await adapter.snapshot()
        )

        await self._synchronize_profile_link_state(
            profile_id=
                profile_id,

            adapter_snapshot=
                adapter_snapshot,
        )

        return await self.profile_transport_snapshot(
            profile_id
        )


    # ========================================================
    # Ping Physical Bridge
    # ========================================================

    async def ping(
        self,
        profile_id: str,
    ) -> dict[str, Any]:
        """
        Ping the physical bridge.

        This tests the MissionNexus ↔ bridge transport only.

        It does NOT prove a GoblinWisp secure session.
        """

        adapter = await self._get_profile_adapter(
            profile_id
        )

        if not isinstance(
            adapter,
            GoblinWispEspNowAdapter,
        ):
            raise GoblinWispTransportManagerError(
                "Ping is not implemented for this "
                "GoblinWisp transport adapter"
            )

        await adapter.ping()

        return await self.profile_transport_snapshot(
            profile_id
        )


    # ========================================================
    # Send Opaque Packet
    # ========================================================

    async def send_packet(
        self,
        profile_id: str,
        packet: GoblinWispTransportPacket,
    ) -> None:
        """
        Send opaque bytes through the physical transport.

        Important:

        The payload supplied here is expected to have already
        passed through the future GoblinWisp secure-session
        packet processor.

        This method does NOT encrypt application data.
        """

        adapter = await self._get_profile_adapter(
            profile_id
        )

        snapshot = (
            await adapter.snapshot()
        )

        logical_connected = (
            self._logical_link_connected(
                snapshot
            )
        )

        if not logical_connected:
            raise GoblinWispTransportManagerError(
                "GoblinWisp peer transport is not connected"
            )

        try:
            await adapter.send(
                packet
            )

        except GoblinWispTransportError:
            raise

        except Exception as error:
            raise GoblinWispTransportManagerError(
                "Failed to send GoblinWisp transport packet: "
                f"{error}"
            ) from error


    # ========================================================
    # Send Opaque Payload Convenience Method
    # ========================================================

    async def send_payload(
        self,
        profile_id: str,
        payload: bytes,
        metadata: dict[str, Any] | None = None,
    ) -> GoblinWispTransportPacket:
        """
        Convenience wrapper for already-protected opaque
        GoblinWisp bytes.

        Do not pass unprotected sensitive application data
        here once the security engine is implemented.
        """

        try:
            profile = (
                await goblinwisp_manager.get_profile(
                    profile_id
                )
            )

        except GoblinWispManagerError as error:
            raise GoblinWispTransportManagerError(
                str(
                    error
                )
            ) from error

        packet = GoblinWispTransportPacket(
            payload=
                payload,

            source_node_id=
                profile.local_node.node_id,

            destination_node_id=
                profile.remote_node.node_id,

            metadata=(
                metadata
                if metadata is not None
                else {}
            ),
        )

        await self.send_packet(
            profile_id=
                profile_id,

            packet=
                packet,
        )

        return packet


    # ========================================================
    # Receive Opaque Packet
    # ========================================================

    async def receive_packet(
        self,
        profile_id: str,
        timeout_seconds: float | None = None,
    ) -> GoblinWispTransportPacket | None:
        """
        Receive one opaque packet from the physical transport.

        Receiving a packet here does NOT mean it has been
        authenticated.

        The future GoblinWisp secure packet processor must
        validate it before application delivery or RX counter
        progression.
        """

        adapter = await self._get_profile_adapter(
            profile_id
        )

        try:
            return await adapter.receive(
                timeout_seconds=
                    timeout_seconds
            )

        except GoblinWispTransportError:
            raise

        except Exception as error:
            raise GoblinWispTransportManagerError(
                "Failed to receive GoblinWisp transport "
                f"packet: {error}"
            ) from error


    # ========================================================
    # Profile Transport Snapshot
    # ========================================================

    async def profile_transport_snapshot(
        self,
        profile_id: str,
    ) -> dict[str, Any]:
        """
        Return both:

            physical adapter state
            logical ESP-NOW peer-link state

        so MissionNexus can display them separately.
        """

        adapter = await self._get_profile_adapter(
            profile_id
        )

        adapter_snapshot = (
            await adapter.snapshot()
        )

        logical_connected = (
            self._logical_link_connected(
                adapter_snapshot
            )
        )

        try:
            profile = (
                await goblinwisp_manager.get_profile(
                    profile_id
                )
            )

        except GoblinWispManagerError as error:
            raise GoblinWispTransportManagerError(
                str(
                    error
                )
            ) from error

        bridge_status = None

        if isinstance(
            adapter,
            GoblinWispEspNowAdapter,
        ):
            bridge_status = (
                await adapter.bridge_status()
            )

        return {
            "type":
                "goblinwisp_transport_profile",

            "profile_id":
                profile.profile_id,

            "transport_type":
                profile.transport.transport_type,

            "logical_connected":
                logical_connected,

            "secure_session_active": (
                profile.session.secure_session_active
                if profile.session is not None
                else False
            ),

            "adapter":
                adapter_snapshot.to_dict(),

            "bridge":
                bridge_status,

            "profile_transport":
                profile.transport.to_dict(),
        }


    # ========================================================
    # Full Manager Snapshot
    # ========================================================

    async def snapshot(
        self,
    ) -> dict[str, Any]:
        async with self._lock:
            started = (
                self._started
            )

            assignments = deepcopy(
                self._profile_transport_types
            )

            adapters = dict(
                self._adapters
            )

        adapter_snapshots: list[
            dict[str, Any]
        ] = []

        for (
            transport_type,
            adapter,
        ) in adapters.items():
            snapshot = (
                await adapter.snapshot()
            )

            adapter_snapshots.append(
                {
                    "transport_type":
                        transport_type,

                    "adapter":
                        snapshot.to_dict(),

                    "logical_connected":
                        self._logical_link_connected(
                            snapshot
                        ),
                }
            )

        connected_adapters = sum(
            1
            for item
            in adapter_snapshots
            if item["adapter"]["connected"]
        )

        logical_links = sum(
            1
            for item
            in adapter_snapshots
            if item["logical_connected"]
        )

        return {
            "type":
                "goblinwisp_transport_manager_snapshot",

            "manager_started":
                started,

            "adapter_count":
                len(
                    adapter_snapshots
                ),

            "connected_adapter_count":
                connected_adapters,

            "logical_link_count":
                logical_links,

            "profile_assignments":
                assignments,

            "adapters":
                adapter_snapshots,
        }


    # ========================================================
    # Transport Configuration Builder
    # ========================================================

    @staticmethod
    def _build_transport_config(
        profile: GoblinWispProfile,
        serial_port: str | None,
        baud_rate: int | None,
        interface_name: str | None,
        peer_address: str | None,
        channel: int | None,
        host: str | None,
        port: int | None,
        metadata: dict[str, Any] | None,
    ) -> GoblinWispTransportConfig:
        transport_type = (
            profile.transport.transport_type
        )

        resolved_metadata: dict[
            str,
            Any,
        ] = {
            "profile_id":
                profile.profile_id,

            "profile_name":
                profile.name,

            "local_platform":
                profile.local_node.platform,

            "remote_platform":
                profile.remote_node.platform,
        }

        if metadata is not None:
            resolved_metadata.update(
                metadata
            )

        if (
            transport_type
            == GoblinWispTransportType.ESP_NOW
        ):
            if (
                serial_port is None
                or not serial_port.strip()
            ):
                raise GoblinWispTransportManagerError(
                    "serial_port is required for the "
                    "ESP32-S3 ESP-NOW bridge"
                )

            resolved_metadata[
                "architecture"
            ] = (
                "MissionNexus USB Serial -> "
                "Ground ESP32-S3 -> ESP-NOW -> "
                "Aircraft ESP32-S3"
            )

        return GoblinWispTransportConfig(
            transport_type=
                transport_type,

            local_node_id=
                profile.local_node.node_id,

            remote_node_id=
                profile.remote_node.node_id,

            interface_name=(
                interface_name
                or profile.transport.interface_name
            ),

            peer_address=(
                peer_address
                or profile.transport.peer_address
            ),

            channel=(
                channel
                if channel is not None
                else profile.transport.channel
            ),

            host=
                host,

            port=(
                port
                if port is not None
                else profile.transport.port
            ),

            serial_port=
                serial_port,

            baud_rate=(
                baud_rate
                or profile.transport.baud_rate
                or DEFAULT_BAUD_RATE
            ),

            auto_reconnect=
                True,

            metadata=
                resolved_metadata,
        )


    # ========================================================
    # Adapter Lookup
    # ========================================================

    async def _get_adapter(
        self,
        transport_type: str,
    ) -> GoblinWispTransportAdapter:
        normalized_type = (
            transport_type.strip().upper()
        )

        async with self._lock:
            adapter = (
                self._adapters.get(
                    normalized_type
                )
            )

        if adapter is None:
            raise GoblinWispTransportManagerError(
                "No GoblinWisp transport adapter is "
                "registered for "
                f"{transport_type}"
            )

        return adapter


    async def _get_profile_adapter(
        self,
        profile_id: str,
    ) -> GoblinWispTransportAdapter:
        async with self._lock:
            transport_type = (
                self._profile_transport_types.get(
                    profile_id
                )
            )

        if transport_type is None:
            raise GoblinWispTransportManagerError(
                "GoblinWisp profile does not currently have "
                "an assigned physical transport adapter: "
                f"{profile_id}"
            )

        return await self._get_adapter(
            transport_type
        )


    # ========================================================
    # Prevent Adapter Collision
    # ========================================================

    async def _ensure_adapter_available(
        self,
        profile_id: str,
        adapter: GoblinWispTransportAdapter,
    ) -> None:
        """
        Current ESP-NOW implementation uses one physical
        adapter instance.

        Prevent multiple profiles from trying to own the same
        serial bridge simultaneously.
        """

        async with self._lock:
            assignments = dict(
                self._profile_transport_types
            )

        for (
            assigned_profile_id,
            assigned_transport_type,
        ) in assignments.items():
            if (
                assigned_profile_id
                == profile_id
            ):
                continue

            assigned_adapter = (
                await self._get_adapter(
                    assigned_transport_type
                )
            )

            if (
                assigned_adapter is adapter
                and assigned_adapter.connected
            ):
                raise GoblinWispTransportManagerError(
                    "GoblinWisp transport adapter is already "
                    "assigned to another connected profile: "
                    f"{assigned_profile_id}"
                )


    # ========================================================
    # Logical ESP-NOW Link State
    # ========================================================

    @staticmethod
    def _logical_link_connected(
        snapshot:
            GoblinWispTransportAdapterSnapshot,
    ) -> bool:
        """
        Physical serial connection is insufficient.

        For ESP-NOW, logical connectivity requires:

            serial adapter connected
            bridge ready
            ESP-NOW peer link connected
        """

        if not snapshot.connected:
            return False

        metadata = (
            snapshot.diagnostics.get(
                "metadata",
                {}
            )
        )

        if not isinstance(
            metadata,
            dict,
        ):
            return False

        bridge_ready = bool(
            metadata.get(
                "bridge_ready",
                False,
            )
        )

        air_link_connected = bool(
            metadata.get(
                "air_link_connected",
                False,
            )
        )

        return (
            bridge_ready
            and air_link_connected
        )


    # ========================================================
    # Synchronize Profile Link State
    # ========================================================

    async def _synchronize_profile_link_state(
        self,
        profile_id: str,
        adapter_snapshot:
            GoblinWispTransportAdapterSnapshot,
    ) -> None:
        """
        Propagate actual peer-link connection transitions into
        GoblinWispManager.

        We intentionally synchronize on state transitions
        rather than every RSSI update so the Aeronexus Data
        Fabric does not receive a fake CONNECTED event every
        second.
        """

        logical_connected = (
            self._logical_link_connected(
                adapter_snapshot
            )
        )

        try:
            profile = (
                await goblinwisp_manager.get_profile(
                    profile_id
                )
            )

        except GoblinWispManagerError as error:
            raise GoblinWispTransportManagerError(
                str(
                    error
                )
            ) from error

        if (
            profile.transport.connected
            == logical_connected
        ):
            return

        diagnostics = (
            adapter_snapshot.diagnostics
        )

        try:
            await goblinwisp_manager.set_transport_state(
                profile_id=
                    profile_id,

                connected=
                    logical_connected,

                rssi_dbm=
                    self._optional_float(
                        diagnostics.get(
                            "rssi_dbm"
                        )
                    ),

                quality_percent=
                    self._optional_float(
                        diagnostics.get(
                            "quality_percent"
                        )
                    ),

                packet_loss_percent=
                    self._optional_float(
                        diagnostics.get(
                            "packet_loss_percent"
                        )
                    ),
            )

        except GoblinWispManagerError as error:
            raise GoblinWispTransportManagerError(
                str(
                    error
                )
            ) from error


    # ========================================================
    # Monitor
    # ========================================================

    async def _start_monitor(
        self,
        profile_id: str,
    ) -> None:
        await self._stop_monitor(
            profile_id
        )

        task = asyncio.create_task(
            self._monitor_profile(
                profile_id
            ),
            name=(
                "goblinwisp-transport-monitor-"
                f"{profile_id}"
            ),
        )

        async with self._lock:
            self._monitor_tasks[
                profile_id
            ] = task


    async def _stop_monitor(
        self,
        profile_id: str,
    ) -> None:
        async with self._lock:
            task = (
                self._monitor_tasks.pop(
                    profile_id,
                    None,
                )
            )

        if (
            task is None
            or task.done()
        ):
            return

        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass


    async def _monitor_profile(
        self,
        profile_id: str,
    ) -> None:
        """
        Monitor bridge / air-link state.

        Dynamic RSSI and packet diagnostics remain available
        directly from the adapter snapshot.

        GoblinWispManager receives connection transitions,
        because those transitions affect secure-session
        validity.
        """

        while True:
            try:
                adapter = (
                    await self._get_profile_adapter(
                        profile_id
                    )
                )

                if isinstance(
                    adapter,
                    GoblinWispEspNowAdapter,
                ):
                    try:
                        await adapter.request_status()

                    except Exception:
                        # The subsequent adapter snapshot
                        # determines actual current state.
                        pass

                await asyncio.sleep(
                    0.15
                )

                adapter_snapshot = (
                    await adapter.snapshot()
                )

                await self._synchronize_profile_link_state(
                    profile_id=
                        profile_id,

                    adapter_snapshot=
                        adapter_snapshot,
                )

                await asyncio.sleep(
                    self._monitor_interval_seconds
                )

            except asyncio.CancelledError:
                raise

            except Exception:
                # Hardware monitoring must not terminate the
                # Aeronexus backend because of a temporary
                # serial/radio failure.
                await asyncio.sleep(
                    self._monitor_interval_seconds
                )


    # ========================================================
    # Utility
    # ========================================================

    @staticmethod
    def _optional_float(
        value: Any,
    ) -> float | None:
        if value is None:
            return None

        try:
            return float(
                value
            )

        except (
            TypeError,
            ValueError,
        ):
            return None


# ============================================================
# Shared Runtime Singleton
# ============================================================


goblinwisp_transport_manager: Final[
    GoblinWispTransportManager
] = GoblinWispTransportManager()
