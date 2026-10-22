from __future__ import annotations

import asyncio
from typing import Any

from fastapi import (
    APIRouter,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)

from pydantic import (
    BaseModel,
    Field,
)

try:
    from serial.tools import list_ports
except ImportError:
    list_ports = None

from .transport_adapter import (
    GoblinWispTransportError,
)

from .transport_manager import (
    GoblinWispTransportManagerError,
    goblinwisp_transport_manager,
)


# ============================================================
# REST Router
# ============================================================


router = APIRouter(
    prefix="/api/goblinwisp/transports",
    tags=[
        "GoblinWisp Transport",
    ],
)


# ============================================================
# WebSocket Router
# ============================================================


websocket_router = APIRouter(
    tags=[
        "GoblinWisp Transport",
    ],
)


# ============================================================
# Request Models
# ============================================================


class ConnectTransportRequest(
    BaseModel
):
    """
    Request used to connect a GoblinWisp deployment profile
    to its physical transport adapter.

    For the current ESP32-S3 + ESP-NOW architecture:

        serial_port:
            Windows COM port connected to the
            ground ESP32-S3.

        baud_rate:
            USB serial bridge baud rate.

    Other fields are included now so the same API can later
    support additional GoblinWisp transports.
    """

    serial_port: str | None = None

    baud_rate: int | None = Field(
        default=115200,
        ge=1200,
        le=4_000_000,
    )

    interface_name: str | None = None

    peer_address: str | None = None

    channel: int | None = Field(
        default=None,
        ge=0,
        le=255,
    )

    host: str | None = None

    port: int | None = Field(
        default=None,
        ge=1,
        le=65535,
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict
    )


# ============================================================
# Error Translation
# ============================================================


def _raise_transport_http_error(
    error: Exception,
) -> None:
    """
    Convert internal GoblinWisp transport exceptions into
    predictable HTTP responses for MissionNexus.
    """

    message = str(
        error
    )

    lowered = (
        message.lower()
    )

    if (
        "unknown goblinwisp profile"
        in lowered
    ):
        raise HTTPException(
            status_code=404,
            detail=message,
        )

    if (
        "does not currently have an assigned"
        in lowered
        or
        "not connected"
        in lowered
        or
        "already assigned"
        in lowered
        or
        "already connected"
        in lowered
    ):
        raise HTTPException(
            status_code=409,
            detail=message,
        )

    if (
        "serial_port is required"
        in lowered
        or
        "transport manager is not started"
        in lowered
        or
        "no goblinwisp transport adapter"
        in lowered
    ):
        raise HTTPException(
            status_code=400,
            detail=message,
        )

    raise HTTPException(
        status_code=500,
        detail=message,
    )


# ============================================================
# Transport Manager Status
# ============================================================


@router.get(
    "/status"
)
async def transport_manager_status():
    """
    Return all registered GoblinWisp transport adapters and
    their current runtime state.
    """

    return (
        await goblinwisp_transport_manager.snapshot()
    )


# ============================================================
# Serial Port Discovery
# ============================================================


@router.get(
    "/ports"
)
async def discover_serial_ports():
    """
    Discover serial / COM ports visible to MissionNexus.

    On the current Windows setup this allows the dashboard to
    display the ESP32-S3 USB serial device without requiring
    the user to manually type COM3 / COM7 / etc.

    pyserial must be installed before physical hardware
    discovery can be used.
    """

    if list_ports is None:
        return {
            "type":
                "serial_port_list",

            "available":
                False,

            "reason":
                "pyserial is not installed",

            "port_count":
                0,

            "ports":
                [],
        }

    try:
        ports = list(
            list_ports.comports()
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to enumerate serial ports: "
                f"{error}"
            ),
        ) from error

    results: list[
        dict[str, Any]
    ] = []

    for port in ports:
        results.append(
            {
                "device":
                    port.device,

                "name":
                    port.name,

                "description":
                    port.description,

                "hardware_id":
                    port.hwid,

                "manufacturer":
                    port.manufacturer,

                "product":
                    port.product,

                "serial_number":
                    port.serial_number,

                "vid":
                    port.vid,

                "pid":
                    port.pid,

                "location":
                    port.location,

                "interface":
                    port.interface,
            }
        )

    results.sort(
        key=lambda item:
            str(
                item.get(
                    "device",
                    "",
                )
            )
    )

    return {
        "type":
            "serial_port_list",

        "available":
            True,

        "port_count":
            len(
                results
            ),

        "ports":
            results,
    }


# ============================================================
# Profile Transport Snapshot
# ============================================================


@router.get(
    "/profiles/{profile_id}"
)
async def get_profile_transport(
    profile_id: str,
):
    """
    Return the complete physical + logical transport state
    associated with one GoblinWisp profile.
    """

    try:
        return (
            await goblinwisp_transport_manager
            .profile_transport_snapshot(
                profile_id
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )


# ============================================================
# Connect Profile Transport
# ============================================================


@router.post(
    "/profiles/{profile_id}/connect"
)
async def connect_profile_transport(
    profile_id: str,
    request: ConnectTransportRequest,
):
    """
    Connect MissionNexus to the physical GoblinWisp
    transport.

    For GW-ESP32-ESPNOW-001 the expected topology is:

        MissionNexus
            ↓ USB Serial
        Ground ESP32-S3
            ↓ ESP-NOW
        Aircraft ESP32-S3

    Important:

    Successful completion means MissionNexus connected to the
    configured transport adapter.

    It does NOT automatically mean:

        ESP-NOW peer is connected
        GoblinWisp trust is established
        GoblinWisp handshake is complete
        secure session is active
    """

    try:
        snapshot = (
            await goblinwisp_transport_manager
            .connect_profile(
                profile_id=
                    profile_id,

                serial_port=
                    request.serial_port,

                baud_rate=
                    request.baud_rate,

                interface_name=
                    request.interface_name,

                peer_address=
                    request.peer_address,

                channel=
                    request.channel,

                host=
                    request.host,

                port=
                    request.port,

                metadata=
                    request.metadata,
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp physical transport connected",

        "transport":
            snapshot,
    }


# ============================================================
# Disconnect Profile Transport
# ============================================================


@router.post(
    "/profiles/{profile_id}/disconnect"
)
async def disconnect_profile_transport(
    profile_id: str,
):
    """
    Disconnect the physical transport.

    If an authenticated GoblinWisp session was active, the
    corresponding GoblinWisp manager transport transition
    invalidates that session rather than permitting stale
    session continuation.
    """

    try:
        snapshot = (
            await goblinwisp_transport_manager
            .disconnect_profile(
                profile_id
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp physical transport disconnected",

        "transport":
            snapshot,
    }


# ============================================================
# Reconnect Profile Transport
# ============================================================


@router.post(
    "/profiles/{profile_id}/reconnect"
)
async def reconnect_profile_transport(
    profile_id: str,
):
    """
    Reconnect using the previously stored adapter
    configuration.
    """

    try:
        snapshot = (
            await goblinwisp_transport_manager
            .reconnect_profile(
                profile_id
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp physical transport reconnected",

        "transport":
            snapshot,
    }


# ============================================================
# Request Bridge / Air-Link Status
# ============================================================


@router.post(
    "/profiles/{profile_id}/request-status"
)
async def request_profile_transport_status(
    profile_id: str,
):
    """
    Request updated diagnostics from the current transport
    adapter.

    For ESP-NOW this causes MissionNexus to send a
    STATUS_REQUEST to the ground ESP32-S3 bridge.
    """

    try:
        snapshot = (
            await goblinwisp_transport_manager
            .request_status(
                profile_id
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp transport status requested",

        "transport":
            snapshot,
    }


# ============================================================
# Bridge Ping
# ============================================================


@router.post(
    "/profiles/{profile_id}/ping"
)
async def ping_profile_transport(
    profile_id: str,
):
    """
    Ping the physical ground bridge.

    This checks:

        MissionNexus
            ↕
        Ground ESP32-S3

    It does NOT prove:

        aircraft ESP-NOW connectivity
        GoblinWisp authentication
        secure session validity
    """

    try:
        snapshot = (
            await goblinwisp_transport_manager.ping(
                profile_id
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp bridge ping sent",

        "transport":
            snapshot,
    }


# ============================================================
# Development State Summary
# ============================================================


@router.get(
    "/profiles/{profile_id}/link-summary"
)
async def link_summary(
    profile_id: str,
):
    """
    Return a simplified view specifically useful for the
    MissionNexus GoblinWisp Secure Link page.

    This deliberately exposes each connection layer
    separately.
    """

    try:
        snapshot = (
            await goblinwisp_transport_manager
            .profile_transport_snapshot(
                profile_id
            )
        )

    except (
        GoblinWispTransportManagerError,
        GoblinWispTransportError,
    ) as error:
        _raise_transport_http_error(
            error
        )

    adapter = (
        snapshot.get(
            "adapter",
            {}
        )
    )

    bridge = (
        snapshot.get(
            "bridge"
        )
        or {}
    )

    profile_transport = (
        snapshot.get(
            "profile_transport",
            {}
        )
    )

    adapter_connected = bool(
        adapter.get(
            "connected",
            False,
        )
    )

    bridge_ready = bool(
        bridge.get(
            "bridge_ready",
            False,
        )
    )

    air_link_connected = bool(
        bridge.get(
            "air_link_connected",
            False,
        )
    )

    secure_session_active = bool(
        snapshot.get(
            "secure_session_active",
            False,
        )
    )

    return {
        "type":
            "goblinwisp_link_summary",

        "profile_id":
            profile_id,

        "pc_bridge": {
            "transport":
                "USB_SERIAL",

            "connected":
                adapter_connected,

            "status":
                adapter.get(
                    "status"
                ),
        },

        "ground_bridge": {
            "hardware":
                bridge.get(
                    "bridge_hardware"
                )
                or "ESP32-S3",

            "ready":
                bridge_ready,

            "firmware_version":
                bridge.get(
                    "bridge_firmware_version"
                ),
        },

        "air_link": {
            "transport":
                profile_transport.get(
                    "transport_type",
                    "ESP-NOW",
                ),

            "connected":
                air_link_connected,

            "rssi_dbm":
                (
                    bridge.get(
                        "diagnostics",
                        {}
                    )
                    .get(
                        "rssi_dbm"
                    )
                ),

            "quality_percent":
                (
                    bridge.get(
                        "diagnostics",
                        {}
                    )
                    .get(
                        "quality_percent"
                    )
                ),

            "packet_loss_percent":
                (
                    bridge.get(
                        "diagnostics",
                        {}
                    )
                    .get(
                        "packet_loss_percent"
                    )
                ),
        },

        "goblinwisp": {
            "logical_transport_connected":
                snapshot.get(
                    "logical_connected",
                    False,
                ),

            "secure_session_active":
                secure_session_active,
        },
    }


# ============================================================
# WebSocket
# ============================================================


@websocket_router.websocket(
    "/ws/goblinwisp/transports"
)
async def goblinwisp_transport_websocket(
    websocket: WebSocket,
):
    """
    Stream GoblinWisp transport state for the MissionNexus
    Hardware Integration and GoblinWisp Secure Link pages.

    Current refresh rate:
        1 Hz

    The physical adapter itself may operate at a much higher
    packet rate.
    """

    await websocket.accept()

    try:
        while True:
            snapshot = (
                await goblinwisp_transport_manager.snapshot()
            )

            await websocket.send_json(
                snapshot
            )

            await asyncio.sleep(
                1.0
            )

    except WebSocketDisconnect:
        pass