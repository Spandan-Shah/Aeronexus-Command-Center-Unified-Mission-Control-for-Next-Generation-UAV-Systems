from __future__ import annotations

import asyncio

from typing import Any

from fastapi import (
    APIRouter,
    Query,
    WebSocket,
    WebSocketDisconnect,
)

from pydantic import (
    BaseModel,
    Field,
)

from .data_models import (
    AeronexusEvent,
    GeoContext,
    SecurityContext,
)

from .event_bus import (
    aeronexus_event_bus,
)


# ============================================================
# REST Router
# ============================================================

router = APIRouter(
    prefix="/api/aeronexus",
    tags=[
        "Aeronexus Data Fabric",
    ],
)


# ============================================================
# Request Models
# ============================================================


class GeoContextRequest(BaseModel):
    latitude_deg: float | None = None

    longitude_deg: float | None = None

    altitude_m: float | None = None

    heading_deg: float | None = None

    accuracy_m: float | None = None


class SecurityContextRequest(BaseModel):
    provider: str = "NONE"

    session_id: str | None = None

    local_peer_id: str | None = None

    remote_peer_id: str | None = None

    direction: str | None = None

    authenticated: bool = False

    identity_verified: bool = False

    replay_validated: bool = False

    secure_session_active: bool = False

    metadata: dict[str, Any] = Field(
        default_factory=dict
    )


class AeronexusEventRequest(BaseModel):
    source_system: str

    source_component: str

    data_type: str

    payload: dict[str, Any] = Field(
        default_factory=dict
    )

    vehicle_id: str | None = None

    mission_id: str | None = None

    device_id: str | None = None

    sensor_id: str | None = None

    camera_id: str | None = None

    severity: str = "INFO"

    confidence: float | None = None

    location: GeoContextRequest | None = None

    security: SecurityContextRequest | None = None

    tags: list[str] = Field(
        default_factory=list
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict
    )


# ============================================================
# Health
# ============================================================


@router.get(
    "/fabric/status"
)
async def data_fabric_status():
    snapshot = (
        await aeronexus_event_bus.snapshot(
            limit=1
        )
    )

    return {
        "status": "running",

        "service":
            "Aeronexus Data Fabric",

        "event_bus":
            "active",

        "stored_events":
            snapshot["event_count"],
    }


# ============================================================
# Event History
# ============================================================


@router.get(
    "/events"
)
async def get_events(
    limit: int = Query(
        default=100,
        ge=1,
        le=1000,
    ),

    source_system: str | None = None,

    data_type: str | None = None,

    vehicle_id: str | None = None,

    mission_id: str | None = None,
):
    events = (
        await aeronexus_event_bus.history(
            limit=limit,
            source_system=source_system,
            data_type=data_type,
            vehicle_id=vehicle_id,
            mission_id=mission_id,
        )
    )

    return {
        "type":
            "aeronexus_event_history",

        "event_count":
            len(events),

        "events": [
            event.to_dict()
            for event in events
        ],
    }


# ============================================================
# Event Snapshot
# ============================================================


@router.get(
    "/events/snapshot"
)
async def event_snapshot(
    limit: int = Query(
        default=100,
        ge=1,
        le=1000,
    ),
):
    return (
        await aeronexus_event_bus.snapshot(
            limit=limit
        )
    )


# ============================================================
# Publish Event
# ============================================================


@router.post(
    "/events"
)
async def publish_event(
    request: AeronexusEventRequest,
):
    location = None

    if request.location is not None:
        location = GeoContext(
            latitude_deg=
                request.location.latitude_deg,

            longitude_deg=
                request.location.longitude_deg,

            altitude_m=
                request.location.altitude_m,

            heading_deg=
                request.location.heading_deg,

            accuracy_m=
                request.location.accuracy_m,
        )

    security = None

    if request.security is not None:
        security = SecurityContext(
            provider=
                request.security.provider,

            session_id=
                request.security.session_id,

            local_peer_id=
                request.security.local_peer_id,

            remote_peer_id=
                request.security.remote_peer_id,

            direction=
                request.security.direction,

            authenticated=
                request.security.authenticated,

            identity_verified=
                request.security.identity_verified,

            replay_validated=
                request.security.replay_validated,

            secure_session_active=
                request.security.secure_session_active,

            metadata=
                request.security.metadata,
        )

    event = AeronexusEvent(
        source_system=
            request.source_system,

        source_component=
            request.source_component,

        data_type=
            request.data_type,

        payload=
            request.payload,

        vehicle_id=
            request.vehicle_id,

        mission_id=
            request.mission_id,

        device_id=
            request.device_id,

        sensor_id=
            request.sensor_id,

        camera_id=
            request.camera_id,

        severity=
            request.severity,

        confidence=
            request.confidence,

        location=
            location,

        security=
            security,

        tags=
            request.tags,

        metadata=
            request.metadata,
    )

    stored_event = (
        await aeronexus_event_bus.publish(
            event
        )
    )

    return {
        "ok":
            True,

        "event":
            stored_event.to_dict(),
    }


# ============================================================
# WebSocket Router
# ============================================================


websocket_router = APIRouter(
    tags=[
        "Aeronexus Data Fabric",
    ]
)


@websocket_router.websocket(
    "/ws/aeronexus/events"
)
async def aeronexus_event_stream(
    websocket: WebSocket,
):
    await websocket.accept()

    queue = (
        aeronexus_event_bus.subscribe()
    )

    try:
        await websocket.send_json(
            await aeronexus_event_bus.snapshot(
                limit=50
            )
        )

        while True:
            try:
                message = (
                    await asyncio.wait_for(
                        queue.get(),
                        timeout=5.0,
                    )
                )

                await websocket.send_json(
                    message
                )

            except asyncio.TimeoutError:
                await websocket.send_json(
                    {
                        "type":
                            "aeronexus_heartbeat",
                    }
                )

    except WebSocketDisconnect:
        pass

    finally:
        aeronexus_event_bus.unsubscribe(
            queue
        )