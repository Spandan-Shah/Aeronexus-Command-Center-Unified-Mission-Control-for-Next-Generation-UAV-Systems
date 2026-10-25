from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from time import time
from typing import Any

from .host_security import (
    AIRCRAFT_ID,
    HANDSHAKE_CONFIRM_B,
    HANDSHAKE_MAGIC,
    HANDSHAKE_REPLY,
    DATA_MAGIC,
    REKEY_MAGIC,
    SECURE_ACK,
    SECURE_DATA,
    SECURE_FRAGMENT,
    GoblinWispAuthenticationError,
    GoblinWispHostSecurity,
    GoblinWispProtocolError,
    GoblinWispReplayError,
    GoblinWispSecurityError,
    GoblinWispTrustError,
)

GW_UDP_PORT = 42381
GW_HOST_ID = 0xA1
GW_HOST_SIDE = 1
GW_HOST_NAME = "MISSIONNEXUS"
GW_HOST_LINK_TAG = bytes([0x02, 0x47, 0x57, 0xA1, 0x00, 0x01])
GW_DISCOVERY_MAGIC = b"GWPD"
GW_DISCOVERY_VERSION = 1

# Pin GoblinWisp UDP to the Windows Mobile Hotspot interface.
# Current verified adapter:
#   Local Area Connection* 2 -> 192.168.137.1/24
GW_WIFI_BIND_HOST = os.environ.get("GW_WIFI_BIND_HOST", "192.168.137.1")
GW_WIFI_BROADCAST = os.environ.get("GW_WIFI_BROADCAST", "192.168.137.255")


@dataclass
class RuntimeEvent:
    kind: str
    payload: dict[str, Any]
    timestamp_unix: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "payload": self.payload,
            "timestamp_unix": self.timestamp_unix,
        }


class _Protocol(asyncio.DatagramProtocol):
    def __init__(self, owner: "GoblinWispWifiRuntime") -> None:
        self.owner = owner

    def connection_made(self, transport: asyncio.BaseTransport) -> None:
        self.owner._transport = transport  # type: ignore[assignment]

    def datagram_received(self, data: bytes, addr: tuple[str, int]) -> None:
        asyncio.create_task(
            self.owner._handle_datagram(bytes(data), (addr[0], int(addr[1])))
        )

    def error_received(self, exc: Exception) -> None:
        self.owner.last_error = str(exc)

    def connection_lost(self, exc: Exception | None) -> None:
        if exc:
            self.owner.last_error = str(exc)
        self.owner._transport = None


class GoblinWispWifiRuntime:
    """MissionNexus SIDE_A GoblinWisp peer over transport-only UDP."""

    def __init__(self, state_dir: str | Path = "./data/goblinwisp") -> None:
        self.security = GoblinWispHostSecurity(state_dir)

        self._transport: asyncio.DatagramTransport | None = None
        self._protocol: _Protocol | None = None
        self._peer_endpoint: tuple[str, int] | None = None
        self._subscribers: set[asyncio.Queue[RuntimeEvent]] = set()
        self._scan_task: asyncio.Task[None] | None = None
        self._rekey_task: asyncio.Task[None] | None = None

        self.started = False
        self.active_transport = "WIFI_UDP"
        self.transport_connected = False

        self.bind_host = GW_WIFI_BIND_HOST
        self.broadcast_host = GW_WIFI_BROADCAST

        self.last_error: str | None = None
        self.last_rx_unix: float | None = None
        self.last_tx_unix: float | None = None
        self.aircraft_last_rx_unix: float | None = None

        self.rx_packets = 0
        self.tx_packets = 0
        self.self_packets_ignored = 0
        self.rejected_discovery_packets = 0

        # Authenticated reliability/control-plane diagnostics.
        self.acks_sent = 0
        self.acks_received = 0
        self.duplicate_packets_acked = 0
        self.last_acknowledged_tx_counter: int | None = None

        self.last_application: dict[str, Any] | None = None

    @staticmethod
    def catalog() -> list[dict[str, Any]]:
        return [
            {
                "id": "WIFI_UDP",
                "name": "Wi-Fi UDP",
                "available": True,
                "implemented": True,
            },
            {
                "id": "ESP_NOW",
                "name": "ESP-NOW",
                "available": False,
                "implemented": False,
            },
            {
                "id": "LONG_RANGE_SERIAL",
                "name": "Long-range serial radio",
                "available": False,
                "implemented": False,
            },
            {
                "id": "LTE_IP",
                "name": "LTE / IP",
                "available": False,
                "implemented": False,
            },
            {
                "id": "BLE_GATT",
                "name": "BLE GATT",
                "available": False,
                "implemented": False,
            },
        ]

    async def start(
        self,
        bind_host: str = GW_WIFI_BIND_HOST,
        port: int = GW_UDP_PORT,
    ) -> None:
        if self.started:
            return

        # Do not bind GoblinWisp to every Windows interface. On this machine,
        # 0.0.0.0 caused broadcast/self-echo traffic through 192.168.56.1.
        if not bind_host or bind_host == "0.0.0.0":
            bind_host = GW_WIFI_BIND_HOST

        self.bind_host = bind_host
        self.broadcast_host = GW_WIFI_BROADCAST
        self.last_error = None

        loop = asyncio.get_running_loop()

        transport, protocol = await loop.create_datagram_endpoint(
            lambda: _Protocol(self),
            local_addr=(self.bind_host, port),
            allow_broadcast=True,
        )

        self._transport = transport  # type: ignore[assignment]
        self._protocol = protocol  # type: ignore[assignment]

        self.started = True
        self.transport_connected = True

        await self._emit(
            "transport.connected",
            {
                "transport": self.active_transport,
                "port": port,
                "bind_host": self.bind_host,
                "broadcast_host": self.broadcast_host,
            },
        )

    async def stop(self) -> None:
        self.security.invalidate_session("transport stopped")

        if self._scan_task:
            self._scan_task.cancel()
            self._scan_task = None

        if self._transport:
            self._transport.close()

        self._transport = None
        self._protocol = None
        self._peer_endpoint = None
        self.aircraft_last_rx_unix = None

        self.started = False
        self.transport_connected = False

        await self._emit(
            "transport.disconnected",
            {"transport": self.active_transport},
        )

    async def select_transport(self, transport_id: str) -> None:
        transport_id = transport_id.upper().strip()

        entry = next(
            (x for x in self.catalog() if x["id"] == transport_id),
            None,
        )

        if not entry:
            raise ValueError("unknown transport")

        if not entry["implemented"]:
            raise ValueError(
                f"{transport_id} is reserved but not implemented yet"
            )

        if transport_id != self.active_transport:
            self.security.invalidate_session("transport changed")
            self._peer_endpoint = None
            self.aircraft_last_rx_unix = None
            self.active_transport = transport_id

            await self._emit(
                "transport.selected",
                {"transport": transport_id},
            )

    def _build_host_discovery(self) -> bytes:
        name = GW_HOST_NAME.encode("ascii")[:23]
        name_field = name + b"\x00" * (24 - len(name))

        beacon = (
            GW_DISCOVERY_MAGIC
            + bytes(
                [
                    GW_DISCOVERY_VERSION,
                    GW_HOST_SIDE,
                    GW_HOST_ID,
                ]
            )
            + name_field
        )

        assert len(beacon) == 31
        return beacon + GW_HOST_LINK_TAG

    async def scan(self, seconds: float = 5.0) -> None:
        if not self.started or self._transport is None:
            raise RuntimeError("Wi-Fi UDP transport is not started")

        if self._scan_task and not self._scan_task.done():
            return

        async def worker() -> None:
            deadline = (
                asyncio.get_running_loop().time()
                + max(1.0, min(seconds, 30.0))
            )

            discovery = self._build_host_discovery()

            while asyncio.get_running_loop().time() < deadline:
                self._transport.sendto(
                    discovery,
                    (self.broadcast_host, GW_UDP_PORT),
                )
                self.tx_packets += 1
                self.last_tx_unix = time()

                await asyncio.sleep(0.8)

        self._scan_task = asyncio.create_task(worker())

        await self._emit(
            "transport.scan_started",
            {"seconds": seconds},
        )

    async def start_secure_session(self) -> None:
        if not self.started or self._transport is None:
            raise RuntimeError("transport not started")

        # Prime the Aircraft with our endpoint. This remains transport metadata
        # only; public-key authentication happens during the handshake.
        self._transport.sendto(
            self._build_host_discovery(),
            (self.broadcast_host, GW_UDP_PORT),
        )

        self.tx_packets += 1
        self.last_tx_unix = time()

        await asyncio.sleep(0.10)

        hello = self.security.start_handshake()
        self.last_acknowledged_tx_counter = None

        destination = (
            self._peer_endpoint
            or (self.broadcast_host, GW_UDP_PORT)
        )

        self._transport.sendto(hello, destination)
        self.tx_packets += 1
        self.last_tx_unix = time()

        await self._emit(
            "security.handshake_started",
            {"destination": list(destination)},
        )

    async def start_rekey(self) -> None:
        if not self.started or self._transport is None:
            raise RuntimeError("transport not started")
        if self._peer_endpoint is None:
            raise RuntimeError("aircraft UDP endpoint is unknown")
        if not self.security.session_active():
            raise RuntimeError("GoblinWisp secure session is not active")
        if self.security.rekey_blocks_application():
            raise RuntimeError(
                f"GoblinWisp rekey unavailable in state {self.security.rekey_state()}"
            )

        packet = self.security.begin_rekey()
        self._transport.sendto(packet, self._peer_endpoint)
        self.security.note_rekey_frame_sent()
        self.tx_packets += 1
        self.last_tx_unix = time()
        self.last_acknowledged_tx_counter = None

        self._ensure_rekey_worker()

        await self._emit(
            "security.rekey_started",
            {
                "endpoint": list(self._peer_endpoint),
                "old_epoch": self.security.rekey.old_epoch
                    if self.security.rekey is not None else None,
                "next_epoch": self.security.rekey.next_epoch
                    if self.security.rekey is not None else None,
            },
        )

    def _ensure_rekey_worker(self) -> None:
        if self._rekey_task is not None and not self._rekey_task.done():
            return

        async def worker() -> None:
            try:
                while self.started:
                    await asyncio.sleep(0.20)
                    try:
                        retry = self.security.rekey_tick()
                    except GoblinWispSecurityError as exc:
                        self.last_error = str(exc)
                        await self._emit(
                            "security.rekey_failed",
                            {"reason": str(exc)},
                        )
                        return

                    if (
                        retry is not None
                        and self._transport is not None
                        and self._peer_endpoint is not None
                    ):
                        self._transport.sendto(retry, self._peer_endpoint)
                        self.security.note_rekey_frame_sent()
                        self.tx_packets += 1
                        self.last_tx_unix = time()
                        await self._emit(
                            "security.rekey_retry",
                            {
                                "state": self.security.rekey_state(),
                                "endpoint": list(self._peer_endpoint),
                            },
                        )

                    if (
                        not self.security.rekey_in_progress()
                        and self.security.rekey_state() == "IDLE"
                    ):
                        return
            finally:
                self._rekey_task = None

        self._rekey_task = asyncio.create_task(worker())

    async def send_application(
        self,
        payload: dict[str, Any] | bytes,
    ) -> int:
        if not self.security.session_active():
            raise RuntimeError(
                "GoblinWisp secure session is not active"
            )

        if self._transport is None or self._peer_endpoint is None:
            raise RuntimeError(
                "aircraft UDP endpoint is unknown"
            )

        if isinstance(payload, dict):
            raw = json.dumps(
                payload,
                separators=(",", ":"),
            ).encode("utf-8")
        else:
            raw = bytes(payload)

        packet, counter = self.security.encrypt_application(raw)

        self._transport.sendto(
            packet,
            self._peer_endpoint,
        )

        self.tx_packets += 1
        self.last_tx_unix = time()

        await self._emit(
            "application.tx",
            {
                "counter": counter,
                "bytes": len(raw),
            },
        )

        return counter

    async def _handle_datagram(
        self,
        data: bytes,
        addr: tuple[str, int],
    ) -> None:
        if not data:
            return

        # Never let the host consume a locally echoed UDP packet as Aircraft
        # traffic.
        if addr[0] in {
            self.bind_host,
            "127.0.0.1",
        }:
            self.self_packets_ignored += 1
            return

        self.rx_packets += 1
        self.last_rx_unix = time()

        try:
            if data.startswith(GW_DISCOVERY_MAGIC):
                await self._handle_discovery(data, addr)
                return

            if data.startswith(HANDSHAKE_MAGIC):
                await self._handle_handshake(data, addr)
                return

            if data.startswith(REKEY_MAGIC):
                await self._handle_rekey(data, addr)
                return

            if data.startswith(DATA_MAGIC):
                await self._handle_secure(data, addr)
                return

            await self._emit(
                "transport.unknown_packet",
                {
                    "endpoint": list(addr),
                    "bytes": len(data),
                },
            )

        except (
            GoblinWispTrustError,
            GoblinWispAuthenticationError,
            GoblinWispReplayError,
            GoblinWispProtocolError,
            GoblinWispSecurityError,
        ) as exc:
            self.last_error = str(exc)

            await self._emit(
                "security.reject",
                {
                    "reason": str(exc),
                    "endpoint": list(addr),
                },
            )

    async def _handle_discovery(
        self,
        data: bytes,
        addr: tuple[str, int],
    ) -> None:
        if len(data) < 31:
            self.rejected_discovery_packets += 1

            await self._emit(
                "transport.discovery_rejected",
                {
                    "endpoint": list(addr),
                    "reason": "short discovery frame",
                },
            )
            return

        version = data[4]
        side = data[5]
        peer_id = data[6]

        # Reject any reflected MissionNexus beacon, even if Windows reports it
        # with an unexpected source address.
        if side == GW_HOST_SIDE or peer_id == GW_HOST_ID:
            self.self_packets_ignored += 1
            return

        # Endpoint discovery is accepted only for the configured Aircraft.
        # This still does NOT establish cryptographic trust.
        if (
            version != GW_DISCOVERY_VERSION
            or peer_id != AIRCRAFT_ID
        ):
            self.rejected_discovery_packets += 1

            await self._emit(
                "transport.discovery_rejected",
                {
                    "endpoint": list(addr),
                    "version": version,
                    "side": side,
                    "peer_id": peer_id,
                },
            )
            return

        self._peer_endpoint = addr
        self.aircraft_last_rx_unix = time()

        await self._emit(
            "transport.discovery",
            {
                "endpoint": list(addr),
                "bytes": len(data),
                "version": version,
                "side": side,
                "peer_id": peer_id,
            },
        )

    async def _handle_handshake(
        self,
        data: bytes,
        addr: tuple[str, int],
    ) -> None:
        if len(data) < 8:
            raise GoblinWispProtocolError(
                "short handshake frame"
            )

        kind = data[6]

        if kind == HANDSHAKE_REPLY:
            # Only after cryptographic reply verification may this endpoint
            # become authoritative.
            confirm_a = self.security.handle_reply(data)

            assert self._transport is not None

            self._peer_endpoint = addr
            self.aircraft_last_rx_unix = time()
            self.last_error = None

            self._transport.sendto(
                confirm_a,
                addr,
            )

            self.tx_packets += 1
            self.last_tx_unix = time()

            await self._emit(
                "security.reply_authenticated",
                {"endpoint": list(addr)},
            )
            return

        if kind == HANDSHAKE_CONFIRM_B:
            session = self.security.handle_confirm_b(data)

            self._peer_endpoint = addr
            self.aircraft_last_rx_unix = time()
            self.last_error = None

            await self._emit(
                "security.session_active",
                {
                    "session_id":
                        f"{session.session_id:016X}",
                    "key_epoch": session.key_epoch,
                },
            )
            return

        raise GoblinWispProtocolError(
            f"unexpected host-side handshake kind {kind}"
        )

    async def _send_authenticated_ack(
        self,
        acknowledged_counter: int,
        addr: tuple[str, int],
        *,
        duplicate: bool = False,
    ) -> None:
        if self._transport is None:
            raise RuntimeError("transport not started")

        packet, ack_packet_counter = self.security.build_ack(
            acknowledged_counter
        )
        self._transport.sendto(packet, addr)

        self.tx_packets += 1
        self.acks_sent += 1
        if duplicate:
            self.duplicate_packets_acked += 1
        self.last_tx_unix = time()

        await self._emit(
            "security.ack_tx",
            {
                "ack_packet_counter": ack_packet_counter,
                "acknowledged_counter": acknowledged_counter,
                "duplicate": duplicate,
                "endpoint": list(addr),
            },
        )

    async def _handle_rekey(
        self,
        data: bytes,
        addr: tuple[str, int],
    ) -> None:
        if self._peer_endpoint is not None and addr != self._peer_endpoint:
            raise GoblinWispProtocolError(
                "rekey frame arrived from non-authoritative endpoint"
            )

        before_epoch = (
            self.security.session.key_epoch
            if self.security.session is not None
            else 0
        )
        before_sid = (
            self.security.session.session_id
            if self.security.session is not None
            else 0
        )

        response = self.security.handle_rekey(data)

        self._peer_endpoint = addr
        self.aircraft_last_rx_unix = time()
        self.last_error = None

        if response is not None:
            if self._transport is None:
                raise RuntimeError("transport not started")
            self._transport.sendto(response, addr)
            self.security.note_rekey_frame_sent()
            self.tx_packets += 1
            self.last_tx_unix = time()

        if self.security.rekey_in_progress():
            self._ensure_rekey_worker()

        after_epoch = (
            self.security.session.key_epoch
            if self.security.session is not None
            else 0
        )
        after_sid = (
            self.security.session.session_id
            if self.security.session is not None
            else 0
        )

        await self._emit(
            "security.rekey_rx",
            {
                "message_type": data[6] if len(data) > 6 else None,
                "state": self.security.rekey_state(),
                "old_epoch": before_epoch,
                "current_epoch": after_epoch,
                "session_changed": (
                    after_sid != 0
                    and before_sid != 0
                    and after_sid != before_sid
                ),
                "endpoint": list(addr),
            },
        )

    async def _handle_secure(
        self,
        data: bytes,
        addr: tuple[str, int],
    ) -> None:
        # decrypt_secure() always authenticates AES-GCM before evaluating replay.
        # Authenticated DATA/FRAGMENT duplicates are reliability retransmissions:
        # ACK them again, but never commit replay state or redeliver plaintext.
        try:
            result = self.security.decrypt_secure(data)
        except GoblinWispReplayError as exc:
            if (
                exc.reason == "DUPLICATE"
                and exc.packet_type in {SECURE_DATA, SECURE_FRAGMENT}
                and exc.counter is not None
            ):
                self._peer_endpoint = addr
                self.aircraft_last_rx_unix = time()
                self.last_error = None

                await self._send_authenticated_ack(
                    exc.counter,
                    addr,
                    duplicate=True,
                )

                await self._emit(
                    "security.authenticated_duplicate",
                    {
                        "counter": exc.counter,
                        "packet_type": exc.packet_type,
                        "endpoint": list(addr),
                    },
                )
                return
            raise

        # Only successfully authenticated + replay-accepted packets may refresh
        # the authoritative Aircraft endpoint.
        self._peer_endpoint = addr
        self.aircraft_last_rx_unix = time()
        self.last_error = None

        if result.packet_type == SECURE_ACK:
            acknowledged = result.acknowledged_counter
            if acknowledged is None or acknowledged <= 0:
                raise GoblinWispProtocolError(
                    "authenticated ACK omitted acknowledged counter"
                )

            session = self.security.session
            if (
                session is None
                or acknowledged > session.a_to_b.tx_counter
            ):
                raise GoblinWispProtocolError(
                    "authenticated ACK references unsent host counter"
                )

            self.acks_received += 1
            self.last_acknowledged_tx_counter = acknowledged

            await self._emit(
                "security.ack_rx",
                {
                    "ack_packet_counter": result.counter,
                    "acknowledged_counter": acknowledged,
                    "endpoint": list(addr),
                },
            )
            # Never ACK an ACK and never surface ACK plaintext as application data.
            return

        if result.packet_type not in {SECURE_DATA, SECURE_FRAGMENT}:
            raise GoblinWispProtocolError(
                "unexpected replay-accepted secure packet type"
            )

        # Match the Aircraft: accepted DATA/FRAGMENT is ACKed only after
        # authentication/replay/semantic validation has succeeded.
        await self._send_authenticated_ack(
            result.counter,
            addr,
            duplicate=False,
        )

        if result.packet_type == SECURE_FRAGMENT:
            # Each valid fragment is ACKed, but application delivery happens only
            # once the full message has been authenticated and reassembled.
            if result.reassembled_payload is None:
                return
            payload = result.reassembled_payload
        else:
            payload = result.plaintext

        app: dict[str, Any] | None = None

        try:
            decoded = json.loads(
                payload.decode("utf-8")
            )
            if isinstance(decoded, dict):
                app = decoded
        except Exception:
            app = {
                "type": "BINARY",
                "bytes": len(payload),
                "hex": payload.hex().upper(),
            }

        self.last_application = app

        await self._emit(
            "application.rx",
            {
                "counter": result.counter,
                "endpoint": list(addr),
                "data": app,
            },
        )

    async def enroll_aircraft(
        self,
        public_key_hex: str,
    ) -> dict[str, Any]:
        try:
            public_key = bytes.fromhex(
                public_key_hex.strip()
            )
        except ValueError as exc:
            raise ValueError(
                "aircraft public key must be hexadecimal"
            ) from exc

        peer = self.security.enroll_aircraft(
            public_key,
            locally_authorized=True,
        )

        await self._emit(
            "security.peer_enrolled",
            {"peer_id": peer.peer_id},
        )

        return self.security.snapshot()

    async def reset_trust(self) -> dict[str, Any]:
        self.security.forget_aircraft(
            locally_authorized=True
        )

        await self._emit(
            "security.trust_reset",
            {},
        )

        return self.security.snapshot()

    def subscribe(self) -> asyncio.Queue[RuntimeEvent]:
        q: asyncio.Queue[RuntimeEvent] = asyncio.Queue(
            maxsize=128
        )
        self._subscribers.add(q)
        return q

    def unsubscribe(
        self,
        q: asyncio.Queue[RuntimeEvent],
    ) -> None:
        self._subscribers.discard(q)

    async def _emit(
        self,
        kind: str,
        payload: dict[str, Any],
    ) -> None:
        event = RuntimeEvent(
            kind=kind,
            payload=payload,
            timestamp_unix=time(),
        )

        dead: list[
            asyncio.Queue[RuntimeEvent]
        ] = []

        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)

        for q in dead:
            self._subscribers.discard(q)

    def status(self) -> dict[str, Any]:
        security = self.security.snapshot()

        return {
            "transport": {
                "selected": self.active_transport,
                "started": self.started,
                "connected": self.transport_connected,
                "local_udp_port": GW_UDP_PORT,
                "bind_host": self.bind_host,
                "broadcast_host": self.broadcast_host,
                "peer_endpoint":
                    list(self._peer_endpoint)
                    if self._peer_endpoint
                    else None,
                "last_rx_unix": self.last_rx_unix,
                "last_tx_unix": self.last_tx_unix,
                "rx_packets": self.rx_packets,
                "tx_packets": self.tx_packets,
                "self_packets_ignored":
                    self.self_packets_ignored,
                "rejected_discovery_packets":
                    self.rejected_discovery_packets,
                "acks_sent": self.acks_sent,
                "acks_received": self.acks_received,
                "duplicate_packets_acked":
                    self.duplicate_packets_acked,
                "last_acknowledged_tx_counter":
                    self.last_acknowledged_tx_counter,
                "last_error": self.last_error,
            },
            "security": security,
            "aircraft": {
                "node_id": "GW-MN001",
                "last_application":
                    self.last_application,
                "last_rx_unix":
                    self.aircraft_last_rx_unix,
                "online":
                    self.aircraft_last_rx_unix
                    is not None
                    and (
                        time()
                        - self.aircraft_last_rx_unix
                    )
                    < 10.0,
            },
        }


goblinwisp_wifi_runtime = GoblinWispWifiRuntime()
