from __future__ import annotations

import asyncio
import base64
import json

from time import time
from typing import Any
from uuid import uuid4

try:
    import serial as pyserial
except ImportError:
    pyserial = None

from .models import (
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
# Constants
# ============================================================


GOBLINWISP_ESPNOW_BRIDGE_PROTOCOL = "GW-ESPNOW-BRIDGE"

GOBLINWISP_ESPNOW_BRIDGE_VERSION = 1

DEFAULT_BAUD_RATE = 115200

DEFAULT_READ_TIMEOUT_SECONDS = 0.25

DEFAULT_WRITE_TIMEOUT_SECONDS = 1.0

DEFAULT_RX_QUEUE_SIZE = 256


# ============================================================
# ESP-NOW Serial Bridge Adapter
# ============================================================


class GoblinWispEspNowAdapter(
    GoblinWispTransportAdapter
):
    """
    GoblinWisp ESP-NOW adapter for MissionNexus.

    IMPORTANT ARCHITECTURE:

        MissionNexus PC
              │
              │ USB Serial
              ▼
        Ground ESP32-S3
              │
              │ ESP-NOW
              ▼
        Aircraft ESP32-S3

    A Windows PC normally does not directly participate in
    ESP-NOW.

    Therefore this adapter communicates with a ground
    ESP32-S3 bridge over USB serial.

    The ESP32-S3 firmware is responsible for:

        ESP-NOW initialization
        peer registration
        radio transmission
        radio reception
        ESP-NOW link diagnostics

    This Python adapter is responsible for:

        serial bridge connection
        bridge message framing
        opaque GoblinWisp packet transfer
        transport diagnostics
        packet queues
        bridge status reporting

    GoblinWisp cryptography remains ABOVE this adapter.

    This adapter does not:

        derive session keys
        encrypt payloads
        decrypt payloads
        verify identity
        construct cryptographic nonces
        perform replay validation

    It only transports opaque bytes.
    """

    adapter_id = (
        "GW-ESPNOW-SERIAL-BRIDGE"
    )

    adapter_name = (
        "GoblinWisp ESP-NOW ESP32-S3 Bridge"
    )

    transport_type = (
        GoblinWispTransportType.ESP_NOW
    )


    # ========================================================
    # Initialization
    # ========================================================

    def __init__(
        self,
    ) -> None:
        super().__init__()

        self._serial: Any | None = None

        self._reader_task: asyncio.Task | None = None

        self._stop_event = (
            asyncio.Event()
        )

        self._write_lock = (
            asyncio.Lock()
        )

        self._rx_queue: asyncio.Queue[
            GoblinWispTransportPacket
        ] = asyncio.Queue(
            maxsize=
                DEFAULT_RX_QUEUE_SIZE
        )

        self._bridge_ready = False

        self._air_link_connected = False

        self._bridge_firmware_version: (
            str | None
        ) = None

        self._bridge_hardware: (
            str | None
        ) = None

        self._last_bridge_status_unix: (
            float | None
        ) = None

        self._last_bridge_message_unix: (
            float | None
        ) = None


    # ========================================================
    # Connect
    # ========================================================

    async def connect(
        self,
        config: GoblinWispTransportConfig,
    ) -> GoblinWispTransportAdapterSnapshot:
        """
        Open the USB serial connection to the ground
        ESP32-S3 GoblinWisp bridge.
        """

        if pyserial is None:
            raise GoblinWispTransportError(
                "pyserial is not installed. "
                "Install it with: pip install pyserial"
            )

        if (
            config.transport_type
            != GoblinWispTransportType.ESP_NOW
        ):
            raise GoblinWispTransportError(
                "GoblinWispEspNowAdapter requires "
                "transport_type ESP-NOW"
            )

        if (
            config.serial_port is None
            or not config.serial_port.strip()
        ):
            raise GoblinWispTransportError(
                "serial_port is required for the "
                "ESP-NOW ESP32-S3 bridge"
            )

        # ----------------------------------------------------
        # Clean Previous Connection
        # ----------------------------------------------------

        if (
            self._serial is not None
            or self.connected
        ):
            await self.disconnect()

        await self._set_connecting(
            config
        )

        self._stop_event.clear()

        self._bridge_ready = False

        self._air_link_connected = False

        self._bridge_firmware_version = None

        self._bridge_hardware = None

        self._last_bridge_status_unix = None

        self._last_bridge_message_unix = None

        self._clear_rx_queue()

        baud_rate = (
            config.baud_rate
            or DEFAULT_BAUD_RATE
        )

        read_timeout = float(
            config.metadata.get(
                "read_timeout_seconds",
                DEFAULT_READ_TIMEOUT_SECONDS,
            )
        )

        write_timeout = float(
            config.metadata.get(
                "write_timeout_seconds",
                DEFAULT_WRITE_TIMEOUT_SECONDS,
            )
        )

        try:
            serial_connection = (
                await asyncio.to_thread(
                    self._open_serial_connection,
                    config.serial_port,
                    baud_rate,
                    read_timeout,
                    write_timeout,
                )
            )

            self._serial = (
                serial_connection
            )

            await self._set_connected()

            await self._update_bridge_metadata()

            self._reader_task = (
                asyncio.create_task(
                    self._reader_loop(),
                    name=(
                        "goblinwisp-"
                        "espnow-serial-reader"
                    ),
                )
            )

            # ------------------------------------------------
            # Tell the ESP32 bridge who MissionNexus is.
            #
            # The bridge firmware may respond with READY.
            # ------------------------------------------------

            await self._send_control_frame(
                frame_type="HELLO",

                payload={
                    "adapter_id":
                        self.adapter_id,

                    "local_node_id":
                        config.local_node_id,

                    "remote_node_id":
                        config.remote_node_id,

                    "protocol":
                        GOBLINWISP_ESPNOW_BRIDGE_PROTOCOL,

                    "version":
                        GOBLINWISP_ESPNOW_BRIDGE_VERSION,
                },
            )

            await self.request_status()

            return await self.snapshot()

        except Exception as error:
            await self._close_serial_connection()

            await self._set_error(
                str(
                    error
                )
            )

            raise GoblinWispTransportError(
                "Failed to connect GoblinWisp "
                "ESP-NOW serial bridge: "
                f"{error}"
            ) from error


    # ========================================================
    # Disconnect
    # ========================================================

    async def disconnect(
        self,
    ) -> GoblinWispTransportAdapterSnapshot:
        """
        Disconnect MissionNexus from the ground ESP32-S3
        serial bridge.
        """

        self._stop_event.set()

        reader_task = (
            self._reader_task
        )

        self._reader_task = None

        if (
            reader_task is not None
            and not reader_task.done()
        ):
            reader_task.cancel()

            try:
                await reader_task
            except asyncio.CancelledError:
                pass

        await self._close_serial_connection()

        self._bridge_ready = False

        self._air_link_connected = False

        self._last_bridge_status_unix = None

        self._last_bridge_message_unix = None

        self._clear_rx_queue()

        await self._set_disconnected()

        await self._update_bridge_metadata()

        return await self.snapshot()


    # ========================================================
    # Send GoblinWisp Packet
    # ========================================================

    async def send(
        self,
        packet: GoblinWispTransportPacket,
    ) -> None:
        """
        Send one opaque GoblinWisp packet to the ground
        ESP32-S3 bridge.

        The ESP32 firmware forwards the payload through
        ESP-NOW to the destination peer.
        """

        await self.require_connected()

        config = (
            self.config
        )

        if config is None:
            raise GoblinWispTransportError(
                "ESP-NOW adapter has no active configuration"
            )

        # ----------------------------------------------------
        # Optional Payload Limit
        #
        # Different ESP-NOW firmware versions/configurations
        # may use different fragmentation strategies.
        #
        # Therefore MissionNexus does NOT assume one fixed
        # ESP-NOW payload limit.
        #
        # A deployment may enforce its own safe maximum using:
        #
        # metadata:
        #     max_payload_bytes
        # ----------------------------------------------------

        max_payload_bytes = (
            config.metadata.get(
                "max_payload_bytes"
            )
        )

        if max_payload_bytes is not None:
            try:
                max_payload = int(
                    max_payload_bytes
                )

            except (
                TypeError,
                ValueError,
            ) as error:
                raise GoblinWispTransportError(
                    "max_payload_bytes must be an integer"
                ) from error

            if (
                max_payload > 0
                and packet.size_bytes
                > max_payload
            ):
                raise GoblinWispTransportError(
                    "GoblinWisp packet exceeds configured "
                    "ESP-NOW bridge payload limit: "
                    f"{packet.size_bytes} > {max_payload}"
                )

        frame = {
            "protocol":
                GOBLINWISP_ESPNOW_BRIDGE_PROTOCOL,

            "version":
                GOBLINWISP_ESPNOW_BRIDGE_VERSION,

            "type":
                "DATA",

            "packet_id":
                packet.packet_id,

            "timestamp_unix":
                packet.timestamp_unix,

            "source_node_id":
                packet.source_node_id,

            "destination_node_id":
                packet.destination_node_id,

            "payload_base64":
                base64.b64encode(
                    packet.payload
                ).decode(
                    "ascii"
                ),

            "metadata":
                packet.metadata,
        }

        try:
            await self._write_json_frame(
                frame
            )

            await self._record_tx_success(
                packet.size_bytes
            )

        except Exception as error:
            await self._record_tx_failure(
                str(
                    error
                )
            )

            raise GoblinWispTransportError(
                "Failed to transmit GoblinWisp "
                "packet through ESP-NOW bridge: "
                f"{error}"
            ) from error


    # ========================================================
    # Receive GoblinWisp Packet
    # ========================================================

    async def receive(
        self,
        timeout_seconds: float | None = None,
    ) -> GoblinWispTransportPacket | None:
        """
        Receive one GoblinWisp packet delivered from the
        aircraft ESP32-S3 through the ground ESP32-S3 bridge.
        """

        await self.require_connected()

        if timeout_seconds is None:
            return await self._rx_queue.get()

        timeout = max(
            0.0,
            timeout_seconds,
        )

        try:
            return await asyncio.wait_for(
                self._rx_queue.get(),
                timeout=
                    timeout,
            )

        except asyncio.TimeoutError:
            return None


    # ========================================================
    # Bridge Status
    # ========================================================

    async def bridge_status(
        self,
    ) -> dict[str, Any]:
        """
        Return diagnostics specific to the ESP32-S3 bridge.

        These fields describe transport state only and must
        not be interpreted as proof of GoblinWisp secure
        session establishment.
        """

        snapshot = (
            await self.snapshot()
        )

        return {
            "adapter_id":
                self.adapter_id,

            "adapter_name":
                self.adapter_name,

            "connected":
                snapshot.connected,

            "healthy":
                snapshot.healthy,

            "status":
                snapshot.status,

            "bridge_ready":
                self._bridge_ready,

            "air_link_connected":
                self._air_link_connected,

            "bridge_firmware_version":
                self._bridge_firmware_version,

            "bridge_hardware":
                self._bridge_hardware,

            "last_bridge_status_unix":
                self._last_bridge_status_unix,

            "last_bridge_message_unix":
                self._last_bridge_message_unix,

            "diagnostics":
                snapshot.diagnostics,

            "last_error":
                snapshot.last_error,
        }


    # ========================================================
    # Request Bridge Status
    # ========================================================

    async def request_status(
        self,
    ) -> None:
        """
        Ask the ESP32-S3 bridge to report current ESP-NOW
        link state and diagnostics.
        """

        await self.require_connected()

        await self._send_control_frame(
            frame_type=
                "STATUS_REQUEST",

            payload={
                "requested_at_unix":
                    time(),
            },
        )


    # ========================================================
    # Ping Bridge
    # ========================================================

    async def ping(
        self,
    ) -> None:
        """
        Send a bridge-level ping.

        This is transport diagnostics only.
        """

        await self.require_connected()

        await self._send_control_frame(
            frame_type=
                "PING",

            payload={
                "timestamp_unix":
                    time(),
            },
        )


    # ========================================================
    # Serial Reader
    # ========================================================

    async def _reader_loop(
        self,
    ) -> None:
        """
        Continuously read newline-delimited JSON frames from
        the ESP32-S3 bridge.
        """

        while not self._stop_event.is_set():
            serial_connection = (
                self._serial
            )

            if serial_connection is None:
                break

            try:
                raw_line = (
                    await asyncio.to_thread(
                        serial_connection.readline
                    )
                )

                if not raw_line:
                    continue

                self._last_bridge_message_unix = (
                    time()
                )

                try:
                    line = (
                        raw_line.decode(
                            "utf-8"
                        )
                        .strip()
                    )

                except UnicodeDecodeError:
                    await self._record_rx_failure(
                        "ESP-NOW bridge returned "
                        "non-UTF-8 serial data"
                    )

                    continue

                if not line:
                    continue

                try:
                    frame = (
                        json.loads(
                            line
                        )
                    )

                except json.JSONDecodeError:
                    # ----------------------------------------
                    # ESP32 boot logs / debug serial output
                    # may also arrive on the same port.
                    #
                    # Preserve the latest log without treating
                    # it as a GoblinWisp DATA packet.
                    # ----------------------------------------

                    await self._record_bridge_log(
                        line
                    )

                    continue

                if not isinstance(
                    frame,
                    dict,
                ):
                    continue

                await self._handle_bridge_frame(
                    frame
                )

            except asyncio.CancelledError:
                raise

            except Exception as error:
                if self._stop_event.is_set():
                    break

                await self._record_rx_failure(
                    str(
                        error
                    )
                )

                await self._set_error(
                    "ESP-NOW bridge reader failed: "
                    f"{error}"
                )

                break


    # ========================================================
    # Bridge Frame Handler
    # ========================================================

    async def _handle_bridge_frame(
        self,
        frame: dict[str, Any],
    ) -> None:
        frame_type = str(
            frame.get(
                "type",
                "",
            )
        ).strip().upper()

        if not frame_type:
            return

        if frame_type == "READY":
            await self._handle_ready_frame(
                frame
            )

            return

        if frame_type == "LINK_STATUS":
            await self._handle_link_status_frame(
                frame
            )

            return

        if frame_type == "DATA":
            await self._handle_data_frame(
                frame
            )

            return

        if frame_type == "PONG":
            await self._handle_pong_frame(
                frame
            )

            return

        if frame_type == "LOG":
            message = str(
                frame.get(
                    "message",
                    "",
                )
            )

            await self._record_bridge_log(
                message
            )

            return

        if frame_type == "ERROR":
            message = str(
                frame.get(
                    "message",
                    "ESP-NOW bridge reported an error",
                )
            )

            await self._record_rx_failure(
                message
            )

            await self._set_degraded(
                message
            )

            await self._update_bridge_metadata()

            return

        if frame_type == "ACK":
            await self._record_bridge_ack(
                frame
            )

            return

        # ----------------------------------------------------
        # Unknown control frames are retained for diagnostics
        # but do not terminate the transport.
        # ----------------------------------------------------

        await self._record_unknown_frame(
            frame_type
        )


    # ========================================================
    # READY Frame
    # ========================================================

    async def _handle_ready_frame(
        self,
        frame: dict[str, Any],
    ) -> None:
        self._bridge_ready = True

        self._bridge_firmware_version = (
            self._optional_string(
                frame.get(
                    "firmware_version"
                )
            )
        )

        self._bridge_hardware = (
            self._optional_string(
                frame.get(
                    "hardware"
                )
            )
            or
            "ESP32-S3"
        )

        if "air_link_connected" in frame:
            self._air_link_connected = bool(
                frame.get(
                    "air_link_connected"
                )
            )

        self._last_bridge_status_unix = (
            time()
        )

        await self._apply_link_metrics(
            frame
        )

        await self._update_bridge_metadata()


    # ========================================================
    # LINK_STATUS Frame
    # ========================================================

    async def _handle_link_status_frame(
        self,
        frame: dict[str, Any],
    ) -> None:
        if "connected" in frame:
            self._air_link_connected = bool(
                frame.get(
                    "connected"
                )
            )

        elif "air_link_connected" in frame:
            self._air_link_connected = bool(
                frame.get(
                    "air_link_connected"
                )
            )

        self._last_bridge_status_unix = (
            time()
        )

        await self._apply_link_metrics(
            frame
        )

        await self._update_bridge_metadata()


    # ========================================================
    # DATA Frame
    # ========================================================

    async def _handle_data_frame(
        self,
        frame: dict[str, Any],
    ) -> None:
        payload_base64 = (
            frame.get(
                "payload_base64"
            )
        )

        if not isinstance(
            payload_base64,
            str,
        ):
            await self._record_rx_failure(
                "ESP-NOW DATA frame missing payload_base64"
            )

            return

        try:
            payload = (
                base64.b64decode(
                    payload_base64,
                    validate=True,
                )
            )

        except Exception as error:
            await self._record_rx_failure(
                "Invalid base64 payload received from "
                f"ESP-NOW bridge: {error}"
            )

            return

        config = (
            self.config
        )

        default_source = (
            config.remote_node_id
            if config is not None
            else "UNKNOWN"
        )

        default_destination = (
            config.local_node_id
            if config is not None
            else "UNKNOWN"
        )

        source_node_id = str(
            frame.get(
                "source_node_id",
                default_source,
            )
        )

        destination_node_id = str(
            frame.get(
                "destination_node_id",
                default_destination,
            )
        )

        packet_id = (
            self._optional_string(
                frame.get(
                    "packet_id"
                )
            )
            or str(
                uuid4()
            )
        )

        timestamp_unix = (
            self._safe_float(
                frame.get(
                    "timestamp_unix"
                )
            )
            or time()
        )

        metadata = (
            frame.get(
                "metadata"
            )
        )

        if not isinstance(
            metadata,
            dict,
        ):
            metadata = {}

        packet = (
            GoblinWispTransportPacket(
                payload=
                    payload,

                source_node_id=
                    source_node_id,

                destination_node_id=
                    destination_node_id,

                packet_id=
                    packet_id,

                timestamp_unix=
                    timestamp_unix,

                metadata={
                    **metadata,

                    "transport":
                        "ESP-NOW",

                    "bridge":
                        "ESP32-S3",

                    "received_via":
                        self.adapter_id,
                },
            )
        )

        await self._record_rx_success(
            packet.size_bytes
        )

        self._queue_received_packet(
            packet
        )


    # ========================================================
    # PONG Frame
    # ========================================================

    async def _handle_pong_frame(
        self,
        frame: dict[str, Any],
    ) -> None:
        sent_timestamp = (
            self._safe_float(
                frame.get(
                    "timestamp_unix"
                )
            )
        )

        if sent_timestamp is not None:
            latency_ms = max(
                0.0,
                (
                    time()
                    - sent_timestamp
                )
                * 1000.0,
            )

            await self.update_link_diagnostics(
                latency_ms=
                    latency_ms
            )

        self._last_bridge_status_unix = (
            time()
        )

        await self._update_bridge_metadata()


    # ========================================================
    # Link Metric Processing
    # ========================================================

    async def _apply_link_metrics(
        self,
        frame: dict[str, Any],
    ) -> None:
        rssi_dbm = (
            self._safe_float(
                frame.get(
                    "rssi_dbm"
                )
            )
        )

        quality_percent = (
            self._safe_float(
                frame.get(
                    "quality_percent"
                )
            )
        )

        packet_loss_percent = (
            self._safe_float(
                frame.get(
                    "packet_loss_percent"
                )
            )
        )

        latency_ms = (
            self._safe_float(
                frame.get(
                    "latency_ms"
                )
            )
        )

        await self.update_link_diagnostics(
            rssi_dbm=
                rssi_dbm,

            quality_percent=
                quality_percent,

            packet_loss_percent=
                packet_loss_percent,

            latency_ms=
                latency_ms,
        )


    # ========================================================
    # Control Frame Transmission
    # ========================================================

    async def _send_control_frame(
        self,
        frame_type: str,
        payload: dict[str, Any] | None = None,
    ) -> None:
        frame = {
            "protocol":
                GOBLINWISP_ESPNOW_BRIDGE_PROTOCOL,

            "version":
                GOBLINWISP_ESPNOW_BRIDGE_VERSION,

            "type":
                frame_type,

            "timestamp_unix":
                time(),
        }

        if payload:
            frame.update(
                payload
            )

        await self._write_json_frame(
            frame
        )


    # ========================================================
    # Serial Frame Writer
    # ========================================================

    async def _write_json_frame(
        self,
        frame: dict[str, Any],
    ) -> None:
        await self.require_connected()

        serial_connection = (
            self._serial
        )

        if serial_connection is None:
            raise GoblinWispTransportError(
                "ESP-NOW serial bridge is unavailable"
            )

        encoded = (
            json.dumps(
                frame,
                separators=(
                    ",",
                    ":",
                ),
                ensure_ascii=False,
            )
            + "\n"
        ).encode(
            "utf-8"
        )

        async with self._write_lock:
            try:
                await asyncio.to_thread(
                    serial_connection.write,
                    encoded,
                )

                await asyncio.to_thread(
                    serial_connection.flush
                )

            except Exception as error:
                raise GoblinWispTransportError(
                    "Failed writing to ESP32-S3 bridge: "
                    f"{error}"
                ) from error


    # ========================================================
    # Serial Open
    # ========================================================

    @staticmethod
    def _open_serial_connection(
        serial_port: str,
        baud_rate: int,
        read_timeout: float,
        write_timeout: float,
    ):
        if pyserial is None:
            raise GoblinWispTransportError(
                "pyserial is unavailable"
            )

        connection = (
            pyserial.Serial(
                port=
                    serial_port,

                baudrate=
                    baud_rate,

                timeout=
                    read_timeout,

                write_timeout=
                    write_timeout,
            )
        )

        try:
            connection.reset_input_buffer()

            connection.reset_output_buffer()

        except Exception:
            pass

        return connection


    # ========================================================
    # Serial Close
    # ========================================================

    async def _close_serial_connection(
        self,
    ) -> None:
        serial_connection = (
            self._serial
        )

        self._serial = None

        if serial_connection is None:
            return

        try:
            await asyncio.to_thread(
                serial_connection.close
            )

        except Exception:
            pass


    # ========================================================
    # Receive Queue
    # ========================================================

    def _queue_received_packet(
        self,
        packet: GoblinWispTransportPacket,
    ) -> None:
        if self._rx_queue.full():
            try:
                self._rx_queue.get_nowait()

            except asyncio.QueueEmpty:
                pass

        try:
            self._rx_queue.put_nowait(
                packet
            )

        except asyncio.QueueFull:
            pass


    def _clear_rx_queue(
        self,
    ) -> None:
        while True:
            try:
                self._rx_queue.get_nowait()

            except asyncio.QueueEmpty:
                break


    # ========================================================
    # Bridge Diagnostics Metadata
    # ========================================================

    async def _update_bridge_metadata(
        self,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.metadata.update(
                {
                    "bridge_type":
                        "ESP32-S3",

                    "air_transport":
                        "ESP-NOW",

                    "bridge_protocol":
                        GOBLINWISP_ESPNOW_BRIDGE_PROTOCOL,

                    "bridge_protocol_version":
                        GOBLINWISP_ESPNOW_BRIDGE_VERSION,

                    "bridge_ready":
                        self._bridge_ready,

                    "air_link_connected":
                        self._air_link_connected,

                    "bridge_firmware_version":
                        self._bridge_firmware_version,

                    "bridge_hardware":
                        self._bridge_hardware,

                    "last_bridge_status_unix":
                        self._last_bridge_status_unix,

                    "last_bridge_message_unix":
                        self._last_bridge_message_unix,
                }
            )


    async def _record_bridge_log(
        self,
        message: str,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.metadata[
                "last_bridge_log"
            ] = message

            self._diagnostics.metadata[
                "last_bridge_log_unix"
            ] = time()


    async def _record_bridge_ack(
        self,
        frame: dict[str, Any],
    ) -> None:
        async with self._state_lock:
            self._diagnostics.metadata[
                "last_ack"
            ] = frame

            self._diagnostics.metadata[
                "last_ack_unix"
            ] = time()


    async def _record_unknown_frame(
        self,
        frame_type: str,
    ) -> None:
        async with self._state_lock:
            self._diagnostics.metadata[
                "last_unknown_frame_type"
            ] = frame_type

            self._diagnostics.metadata[
                "last_unknown_frame_unix"
            ] = time()


    # ========================================================
    # Helpers
    # ========================================================

    @staticmethod
    def _optional_string(
        value: Any,
    ) -> str | None:
        if value is None:
            return None

        result = str(
            value
        ).strip()

        if not result:
            return None

        return result


    @staticmethod
    def _safe_float(
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
# Shared ESP-NOW Adapter Instance
# ============================================================


goblinwisp_espnow_adapter = (
    GoblinWispEspNowAdapter()
)