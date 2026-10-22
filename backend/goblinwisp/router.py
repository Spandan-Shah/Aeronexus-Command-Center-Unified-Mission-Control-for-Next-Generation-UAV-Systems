from __future__ import annotations

import asyncio

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

from .manager import (
    GoblinWispManagerError,
    goblinwisp_manager,
)

from .models import (
    GoblinWispDirection,
)


# ============================================================
# REST Router
# ============================================================

router = APIRouter(
    prefix="/api/goblinwisp",
    tags=[
        "GoblinWisp Secure Link",
    ],
)


# ============================================================
# WebSocket Router
# ============================================================

websocket_router = APIRouter(
    tags=[
        "GoblinWisp Secure Link",
    ],
)


# ============================================================
# Request Models
# ============================================================


class TransportStateRequest(
    BaseModel
):
    connected: bool

    rssi_dbm: float | None = None

    quality_percent: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
    )

    packet_loss_percent: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
    )


class TrustedPairingRequest(
    BaseModel
):
    local_identity_fingerprint: str = Field(
        min_length=1
    )

    remote_identity_fingerprint: str = Field(
        min_length=1
    )


class TrustResetRequest(
    BaseModel
):
    reason: str = (
        "Authorized trust reset"
    )


class SessionActivationRequest(
    BaseModel
):
    """
    This request does NOT perform cryptography.

    verified_by_security_engine must only be set True by
    the future GoblinWisp security engine after successful:

        identity verification
        authenticated key establishment
        context-bound key derivation
        directional context creation
        nonce-state initialization
        replay-state initialization
    """

    verified_by_security_engine: bool

    protocol_version: str | None = None


class SessionInvalidationRequest(
    BaseModel
):
    reason: str = Field(
        min_length=1
    )


class RekeyCompletionRequest(
    BaseModel
):
    verified_by_security_engine: bool


class MessageCounterRequest(
    BaseModel
):
    message_count: int = Field(
        default=1,
        ge=1,
        le=1_000_000,
    )


class PacketRejectionRequest(
    BaseModel
):
    direction: str

    rejection_type: str


# ============================================================
# Error Translation
# ============================================================


def _raise_manager_http_error(
    error: GoblinWispManagerError,
) -> None:
    message = str(
        error
    )

    if message.startswith(
        "Unknown GoblinWisp profile"
    ):
        raise HTTPException(
            status_code=404,
            detail=message,
        )

    if (
        "already active" in message
        or
        "not active" in message
        or
        "must be in" in message
        or
        "not currently rekeying" in message
        or
        "transport is disconnected" in message
        or
        "transport is not connected" in message
        or
        "relationship is not trusted" in message
        or
        "Trusted peer identity is required" in message
    ):
        raise HTTPException(
            status_code=409,
            detail=message,
        )

    raise HTTPException(
        status_code=400,
        detail=message,
    )


# ============================================================
# GoblinWisp Runtime Status
# ============================================================


@router.get(
    "/status"
)
async def goblinwisp_status():
    """
    Return the complete GoblinWisp runtime snapshot.
    """

    return (
        await goblinwisp_manager.snapshot()
    )


# ============================================================
# Profiles
# ============================================================


@router.get(
    "/profiles"
)
async def list_profiles():
    profiles = (
        await goblinwisp_manager.list_profiles()
    )

    return {
        "type":
            "goblinwisp_profile_list",

        "profile_count":
            len(
                profiles
            ),

        "profiles": [
            profile.to_dict()
            for profile
            in profiles
        ],
    }


@router.get(
    "/profiles/active"
)
async def get_active_profile():
    try:
        profile = (
            await goblinwisp_manager.get_active_profile()
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "type":
            "goblinwisp_profile",

        "profile":
            profile.to_dict(),
    }


@router.get(
    "/profiles/{profile_id}"
)
async def get_profile(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.get_profile(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "type":
            "goblinwisp_profile",

        "profile":
            profile.to_dict(),
    }


@router.post(
    "/profiles/{profile_id}/select"
)
async def select_profile(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.set_active_profile(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp profile selected",

        "profile":
            profile.to_dict(),
    }


# ============================================================
# Node State
# ============================================================


@router.get(
    "/profiles/{profile_id}/nodes"
)
async def get_profile_nodes(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.get_profile(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "type":
            "goblinwisp_nodes",

        "profile_id":
            profile.profile_id,

        "local_node":
            profile.local_node.to_dict(),

        "remote_node":
            profile.remote_node.to_dict(),
    }


# ============================================================
# Transport
# ============================================================


@router.get(
    "/profiles/{profile_id}/transport"
)
async def get_transport(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.get_profile(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "type":
            "goblinwisp_transport",

        "profile_id":
            profile.profile_id,

        "transport":
            profile.transport.to_dict(),
    }


@router.post(
    "/profiles/{profile_id}/transport"
)
async def update_transport(
    profile_id: str,
    request: TransportStateRequest,
):
    """
    Update runtime transport diagnostics.

    For the current development profile this represents:

        ESP32-S3
            ↕
          ESP-NOW
            ↕
        ESP32-S3

    Later this endpoint may be fed automatically by the
    physical transport adapter instead of the dashboard.
    """

    try:
        profile = (
            await goblinwisp_manager.set_transport_state(
                profile_id=
                    profile_id,

                connected=
                    request.connected,

                rssi_dbm=
                    request.rssi_dbm,

                quality_percent=
                    request.quality_percent,

                packet_loss_percent=
                    request.packet_loss_percent,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            (
                "GoblinWisp transport connected"
                if request.connected
                else
                "GoblinWisp transport disconnected"
            ),

        "profile":
            profile.to_dict(),
    }


# ============================================================
# Trusted Pairing
# ============================================================


@router.post(
    "/profiles/{profile_id}/trust"
)
async def register_trusted_pairing(
    profile_id: str,
    request: TrustedPairingRequest,
):
    """
    Record trusted enrollment / identity continuity state.

    IMPORTANT:

    This endpoint stores fingerprints that have already been
    produced and verified by an authorized trusted pairing
    process.

    It does NOT calculate cryptographic fingerprints and does
    NOT prove possession of any private identity key.
    """

    try:
        profile = (
            await goblinwisp_manager.register_trusted_pairing(
                profile_id=
                    profile_id,

                local_identity_fingerprint=
                    request.local_identity_fingerprint,

                remote_identity_fingerprint=
                    request.remote_identity_fingerprint,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp trusted pairing registered",

        "profile":
            profile.to_dict(),
    }


@router.post(
    "/profiles/{profile_id}/trust/reset"
)
async def reset_trust(
    profile_id: str,
    request: TrustResetRequest,
):
    try:
        profile = (
            await goblinwisp_manager.reset_trust(
                profile_id=
                    profile_id,

                reason=
                    request.reason,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp trust relationship reset",

        "profile":
            profile.to_dict(),
    }


# ============================================================
# Session State
# ============================================================


@router.get(
    "/profiles/{profile_id}/session"
)
async def get_session(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.get_profile(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    session = (
        profile.session
    )

    return {
        "type":
            "goblinwisp_session",

        "profile_id":
            profile.profile_id,

        "active":
            profile.active,

        "session": (
            session.to_dict()
            if session is not None
            else None
        ),
    }


@router.post(
    "/profiles/{profile_id}/session/begin"
)
async def begin_session(
    profile_id: str,
):
    """
    Begin authenticated GoblinWisp session establishment.

    This moves the session only into ESTABLISHING.

    It does not activate security.
    """

    try:
        profile = (
            await goblinwisp_manager
            .begin_session_establishment(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp session establishment started",

        "profile":
            profile.to_dict(),
    }


@router.post(
    "/profiles/{profile_id}/session/activate"
)
async def activate_session(
    profile_id: str,
    request: SessionActivationRequest,
):
    """
    Finalize a GoblinWisp session only after an external
    GoblinWisp cryptographic engine has verified the
    authenticated handshake.

    During current architecture development this endpoint
    exists so the lifecycle can be integrated and tested.

    It is NOT the cryptographic implementation itself.
    """

    try:
        profile = (
            await goblinwisp_manager
            .activate_verified_session(
                profile_id=
                    profile_id,

                verified_by_security_engine=
                    request.verified_by_security_engine,

                protocol_version=
                    request.protocol_version,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp verified secure session activated",

        "profile":
            profile.to_dict(),
    }


@router.post(
    "/profiles/{profile_id}/session/invalidate"
)
async def invalidate_session(
    profile_id: str,
    request: SessionInvalidationRequest,
):
    try:
        profile = (
            await goblinwisp_manager
            .invalidate_session(
                profile_id=
                    profile_id,

                reason=
                    request.reason,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp session invalidated",

        "profile":
            profile.to_dict(),
    }


# ============================================================
# Directional Contexts
# ============================================================


@router.get(
    "/profiles/{profile_id}/contexts"
)
async def get_directional_contexts(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.get_profile(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    if profile.session is None:
        return {
            "type":
                "goblinwisp_directional_contexts",

            "profile_id":
                profile.profile_id,

            "tx_context":
                None,

            "rx_context":
                None,
        }

    return {
        "type":
            "goblinwisp_directional_contexts",

        "profile_id":
            profile.profile_id,

        "session_id":
            profile.session.session_id,

        "directional_isolation_active":
            (
                profile.session
                .directional_isolation_active
            ),

        "tx_context":
            profile.session.tx_context.to_dict(),

        "rx_context":
            profile.session.rx_context.to_dict(),
    }


# ============================================================
# Authenticated TX / RX Counters
# ============================================================


@router.post(
    "/profiles/{profile_id}/traffic/tx"
)
async def record_authenticated_tx(
    profile_id: str,
    request: MessageCounterRequest,
):
    """
    Record messages that have already been authenticated and
    accepted for the TX directional context.

    The future GoblinWisp packet processor should invoke this
    automatically.
    """

    try:
        profile = (
            await goblinwisp_manager
            .record_authenticated_tx(
                profile_id=
                    profile_id,

                message_count=
                    request.message_count,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    tx_counter = 0

    if profile.session is not None:
        tx_counter = (
            profile.session
            .tx_context
            .message_counter
        )

    return {
        "ok":
            True,

        "direction":
            GoblinWispDirection.TX,

        "message_count_added":
            request.message_count,

        "tx_counter":
            tx_counter,
    }


@router.post(
    "/profiles/{profile_id}/traffic/rx"
)
async def record_authenticated_rx(
    profile_id: str,
    request: MessageCounterRequest,
):
    """
    Record messages that have already passed authenticated
    RX processing.

    The future GoblinWisp packet processor should invoke this
    automatically.
    """

    try:
        profile = (
            await goblinwisp_manager
            .record_authenticated_rx(
                profile_id=
                    profile_id,

                message_count=
                    request.message_count,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    rx_counter = 0

    if profile.session is not None:
        rx_counter = (
            profile.session
            .rx_context
            .message_counter
        )

    return {
        "ok":
            True,

        "direction":
            GoblinWispDirection.RX,

        "message_count_added":
            request.message_count,

        "rx_counter":
            rx_counter,
    }


# ============================================================
# Packet Rejection Diagnostics
# ============================================================


@router.post(
    "/profiles/{profile_id}/traffic/rejection"
)
async def record_packet_rejection(
    profile_id: str,
    request: PacketRejectionRequest,
):
    """
    Record an authentication, replay or counter rejection.

    rejection_type:

        AUTH
        REPLAY
        COUNTER

    direction:

        TX
        RX
    """

    try:
        profile = (
            await goblinwisp_manager
            .record_rejection(
                profile_id=
                    profile_id,

                direction=
                    request.direction,

                rejection_type=
                    request.rejection_type,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp rejection recorded",

        "profile":
            profile.to_dict(),
    }


# ============================================================
# Rekey Lifecycle
# ============================================================


@router.post(
    "/profiles/{profile_id}/rekey/begin"
)
async def begin_rekey(
    profile_id: str,
):
    try:
        profile = (
            await goblinwisp_manager.begin_rekey(
                profile_id
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp rekey started",

        "profile":
            profile.to_dict(),
    }


@router.post(
    "/profiles/{profile_id}/rekey/complete"
)
async def complete_rekey(
    profile_id: str,
    request: RekeyCompletionRequest,
):
    """
    Complete rekey only after the future GoblinWisp security
    engine confirms fresh directional material was derived
    successfully.
    """

    try:
        profile = (
            await goblinwisp_manager
            .complete_verified_rekey(
                profile_id=
                    profile_id,

                verified_by_security_engine=
                    request.verified_by_security_engine,
            )
        )

    except GoblinWispManagerError as error:
        _raise_manager_http_error(
            error
        )

    return {
        "ok":
            True,

        "message":
            "GoblinWisp verified rekey completed",

        "profile":
            profile.to_dict(),
    }


# ============================================================
# WebSocket Live Snapshot
# ============================================================


@websocket_router.websocket(
    "/ws/goblinwisp"
)
async def goblinwisp_websocket(
    websocket: WebSocket,
):
    """
    Stream GoblinWisp runtime snapshots to MissionNexus.

    Current implementation sends a fresh snapshot once per
    second.

    Later this can be converted to event-driven broadcasting
    once physical GoblinWisp adapters are connected.
    """

    await websocket.accept()

    try:
        while True:
            snapshot = (
                await goblinwisp_manager.snapshot()
            )

            await websocket.send_json(
                snapshot
            )

            await asyncio.sleep(
                1.0
            )

    except WebSocketDisconnect:
        pass