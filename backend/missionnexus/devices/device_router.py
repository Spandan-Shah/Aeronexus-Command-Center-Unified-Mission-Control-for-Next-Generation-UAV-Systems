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

from .device_manager import (
    DeviceManagerError,
    device_manager,
)

from .device_models import (
    DeviceConnectionConfig,
)


# ============================================================
# REST Router
# ============================================================


router = APIRouter(
    prefix="/api/missionnexus",
    tags=[
        "MissionNexus Hardware Integration"
    ],
)


# ============================================================
# Pair Request
# ============================================================


class DevicePairRequest(BaseModel):
    connection_type: str = "SIMULATOR"

    vehicle_id: str = "MN-001-SIM"
    callsign: str = "MN-001"

    serial_port: str | None = None
    baud_rate: int | None = None

    host: str | None = None
    network_port: int | None = None

    auto_reconnect: bool = True

    metadata: dict[str, Any] = Field(
        default_factory=dict
    )


# ============================================================
# Connection Options
# ============================================================


@router.get(
    "/devices/options"
)
async def device_connection_options():
    return {
        "options": [
            option.to_dict()
            for option
            in device_manager.connection_options()
        ],
    }


# ============================================================
# Device List
# ============================================================


@router.get(
    "/devices"
)
async def list_devices():
    return await device_manager.snapshot()


# ============================================================
# Device Details
# ============================================================


@router.get(
    "/devices/{device_id}"
)
async def get_device(
    device_id: str,
):
    device = await device_manager.get_device(
        device_id
    )

    if device is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Device {device_id!r} "
                "was not found."
            ),
        )

    return device.to_dict()


# ============================================================
# Pair Device
# ============================================================


@router.post(
    "/devices/pair"
)
async def pair_device(
    request: DevicePairRequest,
):
    config = DeviceConnectionConfig(
        connection_type=request.connection_type,
        vehicle_id=request.vehicle_id,
        callsign=request.callsign,
        serial_port=request.serial_port,
        baud_rate=request.baud_rate,
        host=request.host,
        network_port=request.network_port,
        auto_reconnect=request.auto_reconnect,
        metadata=request.metadata,
    )

    try:
        device = await device_manager.pair(
            config
        )

    except DeviceManagerError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "ok": True,
        "device": device.to_dict(),
    }


# ============================================================
# Disconnect
# ============================================================


@router.post(
    "/devices/{device_id}/disconnect"
)
async def disconnect_device(
    device_id: str,
):
    try:
        device = await device_manager.disconnect(
            device_id
        )

    except DeviceManagerError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    return {
        "ok": True,
        "device": device.to_dict(),
    }


# ============================================================
# Reconnect
# ============================================================


@router.post(
    "/devices/{device_id}/reconnect"
)
async def reconnect_device(
    device_id: str,
):
    try:
        device = await device_manager.reconnect(
            device_id
        )

    except DeviceManagerError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "ok": True,
        "device": device.to_dict(),
    }


# ============================================================
# Device WebSocket
# ============================================================


websocket_router = APIRouter(
    tags=[
        "MissionNexus Hardware Integration"
    ]
)


@websocket_router.websocket(
    "/ws/missionnexus/devices"
)
async def device_stream(
    websocket: WebSocket,
):
    await websocket.accept()

    try:
        while True:
            snapshot = await device_manager.snapshot()

            await websocket.send_json(
                snapshot
            )

            await asyncio.sleep(
                1.0
            )

    except WebSocketDisconnect:
        pass