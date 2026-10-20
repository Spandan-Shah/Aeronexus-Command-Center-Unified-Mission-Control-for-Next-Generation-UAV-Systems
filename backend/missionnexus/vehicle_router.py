from __future__ import annotations

import asyncio

from fastapi import (
    APIRouter,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)

from .vehicle_registry import (
    vehicle_registry,
)


router = APIRouter(
    prefix="/api/missionnexus",
    tags=[
        "MissionNexus Vehicles"
    ],
)


@router.get(
    "/vehicles"
)
async def list_vehicles():
    return (
        await vehicle_registry.snapshot()
    )


@router.get(
    "/vehicles/{vehicle_id}"
)
async def get_vehicle(
    vehicle_id: str,
):
    vehicle = (
        await vehicle_registry.get(
            vehicle_id
        )
    )

    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Vehicle "
                f"{vehicle_id!r} "
                "was not found."
            ),
        )

    return vehicle.to_dict()


websocket_router = APIRouter(
    tags=[
        "MissionNexus Vehicles"
    ]
)


@websocket_router.websocket(
    "/ws/missionnexus/vehicles"
)
async def vehicle_stream(
    websocket: WebSocket,
):
    await websocket.accept()

    queue = (
        vehicle_registry.subscribe()
    )

    try:
        await websocket.send_json(
            await vehicle_registry.snapshot()
        )

        while True:
            try:
                snapshot = (
                    await asyncio.wait_for(
                        queue.get(),
                        timeout=5.0,
                    )
                )

                await websocket.send_json(
                    snapshot
                )

            except asyncio.TimeoutError:
                await websocket.send_json(
                    {
                        "type":
                            "missionnexus_heartbeat"
                    }
                )

    except WebSocketDisconnect:
        pass

    finally:
        vehicle_registry.unsubscribe(
            queue
        )