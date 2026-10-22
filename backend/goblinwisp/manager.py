from __future__ import annotations

import asyncio

from copy import deepcopy
from time import time
from typing import Final
from uuid import uuid4

from aeronexus_core.data_models import (
    AeronexusDataType,
    AeronexusEvent,
    AeronexusSeverity,
    SecurityContext,
)

from aeronexus_core.event_bus import (
    aeronexus_event_bus,
)

from .models import (
    GoblinWispContextStatus,
    GoblinWispDirection,
    GoblinWispDirectionalContext,
    GoblinWispProfile,
    GoblinWispSession,
    GoblinWispSessionStatus,
    GoblinWispTrustState,
    build_esp32_s3_esp_now_profile,
)


# ============================================================
# Exceptions
# ============================================================


class GoblinWispManagerError(
    RuntimeError
):
    """
    Raised when an invalid GoblinWisp lifecycle operation
    is requested.
    """


# ============================================================
# GoblinWisp Manager
# ============================================================


class GoblinWispManager:
    """
    Central runtime manager for GoblinWisp inside Aeronexus.

    Responsibilities:

        deployment profile management
        node / peer state
        trusted pairing state
        transport state
        secure-session lifecycle state
        directional TX / RX context state
        rekey state
        packet / rejection counters
        Aeronexus Data Fabric security events

    Important:

    This manager DOES NOT implement cryptographic primitives.

    Actual:

        key generation
        authenticated key agreement
        key derivation
        authenticated encryption
        nonce construction
        fingerprint calculation
        replay verification

    will live in dedicated GoblinWisp security modules.

    The manager only accepts a session as ACTIVE after a
    security engine explicitly confirms that cryptographic
    establishment succeeded.
    """

    def __init__(
        self,
    ) -> None:
        self._lock = asyncio.Lock()

        self._profiles: dict[
            str,
            GoblinWispProfile,
        ] = {}

        self._active_profile_id: str | None = None

        self._started = False

        self._register_default_profile()


    # ========================================================
    # Internal Profile Registration
    # ========================================================

    def _register_default_profile(
        self,
    ) -> None:
        """
        Register the current physical GoblinWisp development
        configuration:

            ESP32-S3 Ground Peer
                ↕
              ESP-NOW
                ↕
            ESP32-S3 Aircraft Peer

        This defines the profile only.

        It does NOT claim that ESP-NOW or GoblinWisp security
        is currently connected or active.
        """

        profile = (
            build_esp32_s3_esp_now_profile(
                vehicle_id="MN-001"
            )
        )

        self._profiles[
            profile.profile_id
        ] = profile

        self._active_profile_id = (
            profile.profile_id
        )


    # ========================================================
    # Startup
    # ========================================================

    async def startup(
        self,
    ) -> None:
        async with self._lock:
            if self._started:
                return

            self._started = True

            profile = (
                self._get_active_profile_unlocked()
            )

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_MANAGER_STARTED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "message":
                    "GoblinWisp runtime manager started",

                "profile_id":
                    snapshot.profile_id,

                "profile_name":
                    snapshot.name,

                "transport":
                    snapshot.transport.transport_type,

                "local_node":
                    snapshot.local_node.node_id,

                "remote_node":
                    snapshot.remote_node.node_id,
            },
        )


    # ========================================================
    # Shutdown
    # ========================================================

    async def shutdown(
        self,
    ) -> None:
        async with self._lock:
            if not self._started:
                return

            profile = (
                self._get_active_profile_unlocked()
            )

            if (
                profile.session is not None
                and profile.session.secure_session_active
            ):
                profile.session.invalidate(
                    reason=
                        "GoblinWisp manager shutdown"
                )

            profile.active = False

            profile.transport.connected = False

            profile.local_node.online = False

            profile.remote_node.online = False

            self._started = False

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_MANAGER_STOPPED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "message":
                    "GoblinWisp runtime manager stopped",

                "profile_id":
                    snapshot.profile_id,
            },
        )


    # ========================================================
    # Runtime Status
    # ========================================================

    async def is_started(
        self,
    ) -> bool:
        async with self._lock:
            return (
                self._started
            )


    # ========================================================
    # List Profiles
    # ========================================================

    async def list_profiles(
        self,
    ) -> list[
        GoblinWispProfile
    ]:
        async with self._lock:
            return [
                deepcopy(
                    profile
                )
                for profile
                in self._profiles.values()
            ]


    # ========================================================
    # Get Profile
    # ========================================================

    async def get_profile(
        self,
        profile_id: str,
    ) -> GoblinWispProfile:
        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            return deepcopy(
                profile
            )


    # ========================================================
    # Active Profile
    # ========================================================

    async def get_active_profile(
        self,
    ) -> GoblinWispProfile:
        async with self._lock:
            return deepcopy(
                self._get_active_profile_unlocked()
            )


    async def set_active_profile(
        self,
        profile_id: str,
    ) -> GoblinWispProfile:
        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            self._active_profile_id = (
                profile.profile_id
            )

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_PROFILE_SELECTED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "profile_name":
                    snapshot.name,
            },
        )

        return snapshot


    # ========================================================
    # Register Profile
    # ========================================================

    async def register_profile(
        self,
        profile: GoblinWispProfile,
        make_active: bool = False,
    ) -> GoblinWispProfile:
        async with self._lock:
            if (
                profile.profile_id
                in self._profiles
            ):
                raise GoblinWispManagerError(
                    "GoblinWisp profile already exists: "
                    f"{profile.profile_id}"
                )

            self._profiles[
                profile.profile_id
            ] = deepcopy(
                profile
            )

            if (
                make_active
                or self._active_profile_id is None
            ):
                self._active_profile_id = (
                    profile.profile_id
                )

            snapshot = deepcopy(
                self._profiles[
                    profile.profile_id
                ]
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_PROFILE_REGISTERED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "profile_name":
                    snapshot.name,

                "transport":
                    snapshot.transport.transport_type,
            },
        )

        return snapshot


    # ========================================================
    # Transport State
    # ========================================================

    async def set_transport_state(
        self,
        profile_id: str,
        connected: bool,
        rssi_dbm: float | None = None,
        quality_percent: float | None = None,
        packet_loss_percent: float | None = None,
    ) -> GoblinWispProfile:
        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            profile.transport.connected = (
                connected
            )

            if rssi_dbm is not None:
                profile.transport.rssi_dbm = (
                    rssi_dbm
                )

            if quality_percent is not None:
                profile.transport.quality_percent = (
                    max(
                        0.0,
                        min(
                            100.0,
                            quality_percent,
                        ),
                    )
                )

            if packet_loss_percent is not None:
                profile.transport.packet_loss_percent = (
                    max(
                        0.0,
                        min(
                            100.0,
                            packet_loss_percent,
                        ),
                    )
                )

            if connected:
                profile.local_node.mark_seen()

                profile.remote_node.mark_seen()

            else:
                profile.local_node.online = False

                profile.remote_node.online = False

                if (
                    profile.session is not None
                    and
                    profile.session.secure_session_active
                ):
                    profile.session.invalidate(
                        reason=
                            "Underlying transport disconnected"
                    )

                    profile.active = False

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=(
                "GOBLINWISP_TRANSPORT_CONNECTED"
                if connected
                else
                "GOBLINWISP_TRANSPORT_DISCONNECTED"
            ),

            profile=
                snapshot,

            severity=(
                AeronexusSeverity.INFO
                if connected
                else
                AeronexusSeverity.MEDIUM
            ),

            payload={
                "profile_id":
                    snapshot.profile_id,

                "transport":
                    snapshot.transport.transport_type,

                "connected":
                    snapshot.transport.connected,

                "rssi_dbm":
                    snapshot.transport.rssi_dbm,

                "quality_percent":
                    snapshot.transport.quality_percent,

                "packet_loss_percent":
                    snapshot.transport.packet_loss_percent,
            },
        )

        return snapshot


    # ========================================================
    # Trusted Pairing / Enrollment
    # ========================================================

    async def register_trusted_pairing(
        self,
        profile_id: str,
        local_identity_fingerprint: str,
        remote_identity_fingerprint: str,
    ) -> GoblinWispProfile:
        """
        Record a trusted pairing that has already been
        authorized / verified by a trusted enrollment flow.

        This method does NOT calculate fingerprints.

        Fingerprints must be produced and verified by the
        future GoblinWisp identity/security implementation.
        """

        local_fingerprint = (
            local_identity_fingerprint.strip()
        )

        remote_fingerprint = (
            remote_identity_fingerprint.strip()
        )

        if not local_fingerprint:
            raise GoblinWispManagerError(
                "Local identity fingerprint is required"
            )

        if not remote_fingerprint:
            raise GoblinWispManagerError(
                "Remote identity fingerprint is required"
            )

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            profile.local_node.public_identity_fingerprint = (
                local_fingerprint
            )

            profile.remote_node.public_identity_fingerprint = (
                remote_fingerprint
            )

            profile.local_node.trust_state = (
                GoblinWispTrustState.TRUSTED
            )

            profile.remote_node.trust_state = (
                GoblinWispTrustState.TRUSTED
            )

            profile.local_node.identity_verified = (
                True
            )

            profile.remote_node.identity_verified = (
                True
            )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            session.trust_state = (
                GoblinWispTrustState.TRUSTED
            )

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_TRUST_ESTABLISHED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "local_node":
                    snapshot.local_node.node_id,

                "remote_node":
                    snapshot.remote_node.node_id,

                "trust_state":
                    GoblinWispTrustState.TRUSTED,

                "identity_continuity":
                    "ENROLLED",
            },
        )

        return snapshot


    # ========================================================
    # Trust Reset
    # ========================================================

    async def reset_trust(
        self,
        profile_id: str,
        reason: str = "Authorized trust reset",
    ) -> GoblinWispProfile:
        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            if (
                session.secure_session_active
                or session.status
                != GoblinWispSessionStatus.IDLE
            ):
                session.invalidate(
                    reason=
                        reason
                )

            profile.local_node.public_identity_fingerprint = (
                None
            )

            profile.remote_node.public_identity_fingerprint = (
                None
            )

            profile.local_node.identity_verified = (
                False
            )

            profile.remote_node.identity_verified = (
                False
            )

            profile.local_node.trust_state = (
                GoblinWispTrustState.UNPAIRED
            )

            profile.remote_node.trust_state = (
                GoblinWispTrustState.UNPAIRED
            )

            session.trust_state = (
                GoblinWispTrustState.UNPAIRED
            )

            profile.active = False

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_TRUST_RESET",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.MEDIUM,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "reason":
                    reason,

                "trust_state":
                    GoblinWispTrustState.UNPAIRED,
            },
        )

        return snapshot


    # ========================================================
    # Begin Session Establishment
    # ========================================================

    async def begin_session_establishment(
        self,
        profile_id: str,
    ) -> GoblinWispProfile:
        """
        Move the profile into ESTABLISHING state.

        This represents the beginning of a real authenticated
        GoblinWisp handshake.

        It does not activate a secure session.
        """

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            if not profile.transport.connected:
                raise GoblinWispManagerError(
                    "Cannot establish GoblinWisp session: "
                    "transport is not connected"
                )

            if (
                profile.local_node.trust_state
                != GoblinWispTrustState.TRUSTED
                or
                profile.remote_node.trust_state
                != GoblinWispTrustState.TRUSTED
            ):
                raise GoblinWispManagerError(
                    "Cannot establish GoblinWisp session: "
                    "peer relationship is not trusted"
                )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            if session.secure_session_active:
                raise GoblinWispManagerError(
                    "GoblinWisp session is already active"
                )

            session.status = (
                GoblinWispSessionStatus.ESTABLISHING
            )

            session.handshake_complete = False

            session.secure_session_active = False

            session.directional_isolation_active = False

            session.replay_protection_active = False

            session.last_error = None

            session.tx_context.status = (
                GoblinWispContextStatus.INACTIVE
            )

            session.rx_context.status = (
                GoblinWispContextStatus.INACTIVE
            )

            profile.active = False

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_SESSION_ESTABLISHING",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "session_id":
                    snapshot.session.session_id
                    if snapshot.session
                    else None,

                "status":
                    GoblinWispSessionStatus.ESTABLISHING,
            },
        )

        return snapshot


    # ========================================================
    # Activate Verified Secure Session
    # ========================================================

    async def activate_verified_session(
        self,
        profile_id: str,
        verified_by_security_engine: bool,
        protocol_version: str | None = None,
    ) -> GoblinWispProfile:
        """
        Activate a GoblinWisp secure session ONLY after the
        cryptographic security engine confirms successful:

            identity verification
            authenticated key establishment
            context-bound derivation
            directional context creation
            nonce-state initialization
            replay-state initialization

        The boolean is intentionally required so this manager
        cannot silently pretend security has been established.
        """

        if not verified_by_security_engine:
            raise GoblinWispManagerError(
                "GoblinWisp secure session cannot be activated "
                "without cryptographic verification"
            )

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            if not profile.transport.connected:
                raise GoblinWispManagerError(
                    "Cannot activate GoblinWisp session: "
                    "transport is disconnected"
                )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            if (
                session.status
                != GoblinWispSessionStatus.ESTABLISHING
            ):
                raise GoblinWispManagerError(
                    "GoblinWisp session must be in "
                    "ESTABLISHING state before activation"
                )

            if (
                profile.local_node.trust_state
                != GoblinWispTrustState.TRUSTED
                or
                profile.remote_node.trust_state
                != GoblinWispTrustState.TRUSTED
            ):
                raise GoblinWispManagerError(
                    "Trusted peer identity is required "
                    "before session activation"
                )

            if protocol_version is not None:
                session.protocol_version = (
                    protocol_version
                )

            session.trust_state = (
                GoblinWispTrustState.TRUSTED
            )

            session.activate()

            profile.active = True

            profile.local_node.mark_seen()

            profile.remote_node.mark_seen()

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_SESSION_ACTIVE",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "session_id":
                    snapshot.session.session_id
                    if snapshot.session
                    else None,

                "status":
                    GoblinWispSessionStatus.ACTIVE,

                "identity_verified":
                    True,

                "directional_isolation":
                    True,

                "replay_protection":
                    True,

                "forward_secure":
                    True,
            },
        )

        return snapshot


    # ========================================================
    # Invalidate Session
    # ========================================================

    async def invalidate_session(
        self,
        profile_id: str,
        reason: str,
    ) -> GoblinWispProfile:
        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            session.invalidate(
                reason=
                    reason
            )

            profile.active = False

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_SESSION_INVALIDATED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.MEDIUM,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "session_id":
                    snapshot.session.session_id
                    if snapshot.session
                    else None,

                "reason":
                    reason,

                "reset_generation":
                    snapshot.session.reset_generation
                    if snapshot.session
                    else None,
            },
        )

        return snapshot


    # ========================================================
    # Begin Rekey
    # ========================================================

    async def begin_rekey(
        self,
        profile_id: str,
    ) -> GoblinWispProfile:
        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_active_session_unlocked(
                    profile
                )
            )

            session.status = (
                GoblinWispSessionStatus.REKEYING
            )

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_REKEY_STARTED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "session_id":
                    snapshot.session.session_id
                    if snapshot.session
                    else None,

                "current_rekey_count":
                    snapshot.session.rekey_count
                    if snapshot.session
                    else 0,
            },
        )

        return snapshot


    # ========================================================
    # Complete Verified Rekey
    # ========================================================

    async def complete_verified_rekey(
        self,
        profile_id: str,
        verified_by_security_engine: bool,
    ) -> GoblinWispProfile:
        if not verified_by_security_engine:
            raise GoblinWispManagerError(
                "GoblinWisp rekey cannot complete without "
                "cryptographic verification"
            )

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            if (
                session.status
                != GoblinWispSessionStatus.REKEYING
            ):
                raise GoblinWispManagerError(
                    "GoblinWisp session is not currently rekeying"
                )

            next_epoch = max(
                session.tx_context.key_epoch,
                session.rx_context.key_epoch,
            ) + 1

            session.tx_context = (
                GoblinWispDirectionalContext(
                    direction=
                        GoblinWispDirection.TX,

                    status=
                        GoblinWispContextStatus.ACTIVE,

                    key_epoch=
                        next_epoch,

                    replay_state_valid=
                        True,

                    nonce_state_valid=
                        True,
                )
            )

            session.rx_context = (
                GoblinWispDirectionalContext(
                    direction=
                        GoblinWispDirection.RX,

                    status=
                        GoblinWispContextStatus.ACTIVE,

                    key_epoch=
                        next_epoch,

                    replay_state_valid=
                        True,

                    nonce_state_valid=
                        True,
                )
            )

            session.status = (
                GoblinWispSessionStatus.ACTIVE
            )

            session.secure_session_active = True

            session.handshake_complete = True

            session.identity_verified = True

            session.forward_secure = True

            session.replay_protection_active = True

            session.directional_isolation_active = True

            session.last_rekey_at_unix = (
                time()
            )

            session.rekey_count += 1

            session.last_error = None

            profile.active = True

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_REKEY_COMPLETE",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.INFO,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "session_id":
                    snapshot.session.session_id
                    if snapshot.session
                    else None,

                "rekey_count":
                    snapshot.session.rekey_count
                    if snapshot.session
                    else 0,

                "key_epoch":
                    next_epoch,
            },
        )

        return snapshot


    # ========================================================
    # Record Authenticated TX
    # ========================================================

    async def record_authenticated_tx(
        self,
        profile_id: str,
        message_count: int = 1,
    ) -> GoblinWispProfile:
        if message_count < 1:
            raise GoblinWispManagerError(
                "message_count must be at least 1"
            )

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_active_session_unlocked(
                    profile
                )
            )

            session.tx_context.message_counter += (
                message_count
            )

            session.tx_context.touch()

            profile.local_node.mark_seen()

            snapshot = deepcopy(
                profile
            )

        return snapshot


    # ========================================================
    # Record Authenticated RX
    # ========================================================

    async def record_authenticated_rx(
        self,
        profile_id: str,
        message_count: int = 1,
    ) -> GoblinWispProfile:
        if message_count < 1:
            raise GoblinWispManagerError(
                "message_count must be at least 1"
            )

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_active_session_unlocked(
                    profile
                )
            )

            session.rx_context.message_counter += (
                message_count
            )

            session.rx_context.touch()

            profile.remote_node.mark_seen()

            snapshot = deepcopy(
                profile
            )

        return snapshot


    # ========================================================
    # Record Packet Rejection
    # ========================================================

    async def record_rejection(
        self,
        profile_id: str,
        direction: str,
        rejection_type: str,
    ) -> GoblinWispProfile:
        normalized_direction = (
            direction.strip().upper()
        )

        normalized_type = (
            rejection_type.strip().upper()
        )

        if normalized_direction not in {
            GoblinWispDirection.TX,
            GoblinWispDirection.RX,
        }:
            raise GoblinWispManagerError(
                "direction must be TX or RX"
            )

        async with self._lock:
            profile = (
                self._get_profile_unlocked(
                    profile_id
                )
            )

            session = (
                self._require_session_unlocked(
                    profile
                )
            )

            context = (
                session.tx_context
                if normalized_direction
                == GoblinWispDirection.TX
                else session.rx_context
            )

            if normalized_type == "AUTH":
                context.authentication_failures += 1

            elif normalized_type == "REPLAY":
                context.replay_rejections += 1

            elif normalized_type == "COUNTER":
                context.counter_errors += 1

            else:
                raise GoblinWispManagerError(
                    "rejection_type must be "
                    "AUTH, REPLAY, or COUNTER"
                )

            context.touch()

            snapshot = deepcopy(
                profile
            )

        await self._publish_security_event(
            event_name=
                "GOBLINWISP_PACKET_REJECTED",

            profile=
                snapshot,

            severity=
                AeronexusSeverity.MEDIUM,

            payload={
                "profile_id":
                    snapshot.profile_id,

                "direction":
                    normalized_direction,

                "rejection_type":
                    normalized_type,
            },
        )

        return snapshot


    # ========================================================
    # Snapshot
    # ========================================================

    async def snapshot(
        self,
    ) -> dict:
        async with self._lock:
            profiles = [
                deepcopy(
                    profile
                )
                for profile
                in self._profiles.values()
            ]

            active_profile_id = (
                self._active_profile_id
            )

            started = (
                self._started
            )

        active_profiles = sum(
            1
            for profile
            in profiles
            if profile.active
        )

        connected_transports = sum(
            1
            for profile
            in profiles
            if profile.transport.connected
        )

        trusted_profiles = sum(
            1
            for profile
            in profiles
            if (
                profile.local_node.trust_state
                == GoblinWispTrustState.TRUSTED
                and
                profile.remote_node.trust_state
                == GoblinWispTrustState.TRUSTED
            )
        )

        return {
            "type":
                "goblinwisp_snapshot",

            "manager_started":
                started,

            "profile_count":
                len(
                    profiles
                ),

            "active_profile_count":
                active_profiles,

            "connected_transport_count":
                connected_transports,

            "trusted_profile_count":
                trusted_profiles,

            "selected_profile_id":
                active_profile_id,

            "profiles": [
                profile.to_dict()
                for profile
                in profiles
            ],
        }


    # ========================================================
    # Private Helpers
    # ========================================================

    def _get_profile_unlocked(
        self,
        profile_id: str,
    ) -> GoblinWispProfile:
        profile = (
            self._profiles.get(
                profile_id
            )
        )

        if profile is None:
            raise GoblinWispManagerError(
                "Unknown GoblinWisp profile: "
                f"{profile_id}"
            )

        return profile


    def _get_active_profile_unlocked(
        self,
    ) -> GoblinWispProfile:
        if self._active_profile_id is None:
            raise GoblinWispManagerError(
                "No active GoblinWisp profile configured"
            )

        return (
            self._get_profile_unlocked(
                self._active_profile_id
            )
        )


    @staticmethod
    def _require_session_unlocked(
        profile: GoblinWispProfile,
    ) -> GoblinWispSession:
        if profile.session is None:
            raise GoblinWispManagerError(
                "GoblinWisp profile does not have "
                "a secure-session context"
            )

        return (
            profile.session
        )


    @staticmethod
    def _require_active_session_unlocked(
        profile: GoblinWispProfile,
    ) -> GoblinWispSession:
        session = (
            GoblinWispManager
            ._require_session_unlocked(
                profile
            )
        )

        if (
            not session.secure_session_active
            or
            session.status
            != GoblinWispSessionStatus.ACTIVE
        ):
            raise GoblinWispManagerError(
                "GoblinWisp secure session is not active"
            )

        return session


    # ========================================================
    # Aeronexus Data Fabric Integration
    # ========================================================

    @staticmethod
    async def _publish_security_event(
        event_name: str,
        profile: GoblinWispProfile,
        severity: str,
        payload: dict,
    ) -> None:
        session = (
            profile.session
        )

        security_context = (
            SecurityContext(
                provider=
                    "GOBLINWISP",

                session_id=(
                    session.session_id
                    if session is not None
                    else None
                ),

                local_peer_id=
                    profile.local_node.node_id,

                remote_peer_id=
                    profile.remote_node.node_id,

                authenticated=(
                    session.identity_verified
                    if session is not None
                    else False
                ),

                identity_verified=(
                    session.identity_verified
                    if session is not None
                    else False
                ),

                replay_validated=False,

                secure_session_active=(
                    session.secure_session_active
                    if session is not None
                    else False
                ),

                metadata={
                    "profile_id":
                        profile.profile_id,

                    "transport":
                        profile.transport.transport_type,

                    "protocol_version": (
                        session.protocol_version
                        if session is not None
                        else None
                    ),
                },
            )
        )

        event = AeronexusEvent(
            source_system=
                "GOBLINWISP",

            source_component=
                profile.local_node.node_id,

            data_type=
                AeronexusDataType.SECURITY_EVENT,

            payload={
                "event":
                    event_name,

                **payload,
            },

            vehicle_id=
                profile.remote_node.vehicle_id,

            device_id=
                profile.remote_node.node_id,

            severity=
                severity,

            security=
                security_context,

            tags=[
                "goblinwisp",
                "security",
                profile.transport.transport_type.lower(),
            ],

            metadata={
                "profile_id":
                    profile.profile_id,

                "profile_name":
                    profile.name,

                "local_platform":
                    profile.local_node.platform,

                "remote_platform":
                    profile.remote_node.platform,

                "transport":
                    profile.transport.transport_type,
            },
        )

        await aeronexus_event_bus.publish(
            event
        )


# ============================================================
# Shared Runtime Singleton
# ============================================================


goblinwisp_manager: Final[
    GoblinWispManager
] = GoblinWispManager()