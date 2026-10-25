
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"

namespace gw {

// =======================================================
// Handshake capabilities: protocol bits, NOT feature claims
//
// Only the baseline mask is supported by the CURRENT
// handshake/comm integration. The remaining flags are
// reserved for implementations added in later files.
// Never advertise a bit until its implementation and
// interoperability tests are complete on BOTH devices.
// =======================================================

static constexpr uint32_t GW_CAP_DIRECTIONAL_CONTEXTS = (1UL << 0);
static constexpr uint32_t GW_CAP_KEY_CONFIRMATION      = (1UL << 1);
static constexpr uint32_t GW_CAP_REKEY                 = (1UL << 2);
static constexpr uint32_t GW_CAP_MULTI_PEER            = (1UL << 3);
static constexpr uint32_t GW_CAP_HYBRID_PQ             = (1UL << 4);
// Required by protocol 1.1: EE + both static-ephemeral ECDH paths.
static constexpr uint32_t GW_CAP_AUTHENTICATED_3DH     = (1UL << 5);

// Fixed requirement for the existing classical P-256 suite.
static constexpr uint32_t GW_HANDSHAKE_REQUIRED_CAPABILITIES =
    GW_CAP_DIRECTIONAL_CONTEXTS | GW_CAP_KEY_CONFIRMATION |
    GW_CAP_AUTHENTICATED_3DH;

// The compiled security implementation includes authenticated in-session
// rekeying. Both peers MUST run this revision to agree on the transcript.
// Multi-peer and post-quantum modes are deliberately not advertised.
static constexpr uint32_t GW_HANDSHAKE_BASELINE_CAPABILITIES =
    GW_HANDSHAKE_REQUIRED_CAPABILITIES | GW_CAP_REKEY;

// =======================================================
// Handshake state
//
// Values 0..6 are preserved for existing comm/UI usage.
// Additional values are reserved for later integration.
// A rekey transition must not expose partially installed
// directional contexts to application traffic.
// =======================================================

enum class HandshakeState : uint8_t {
    UNINITIALIZED          = 0,
    IDLE                   = 1,
    HELLO_SENT             = 2,
    WAIT_INITIATOR_CONFIRM = 3,
    INITIATOR_CONFIRM_SENT = 4,
    ACTIVE                 = 5,
    FAILED                 = 6,
    REKEYING               = 7,
    INVALIDATED            = 8
};

// =======================================================
// Failure status
//
// Existing values 0..13 are preserved. The appended
// values are for future peer-aware and fail-closed paths.
// =======================================================

enum class HandshakeFailure : uint8_t {
    NONE                = 0,
    NOT_READY           = 1,
    UNKNOWN_PEER        = 2,
    PEER_NOT_TRUSTED    = 3,
    IDENTITY_MISMATCH   = 4,
    INVALID_PACKET      = 5,
    INVALID_VERSION     = 6,
    UNSUPPORTED_SUITE   = 7,
    CAPABILITY_MISMATCH = 8,
    INVALID_SIGNATURE   = 9,
    INVALID_CONFIRMATION= 10,
    CRYPTO_ERROR        = 11,
    SEND_ERROR          = 12,
    TIMEOUT             = 13,
    PEER_REVOKED        = 14,
    BUSY                = 15,
    SESSION_INVALID     = 16,
    TRANSPORT_MISMATCH  = 17,
    STORAGE_ERROR       = 18
};

// =======================================================
// Transport-neutral send callbacks
//
// The original callback is preserved for the one-peer
// comm.cpp integration. It has NO destination argument;
// it MUST NOT be used to select among multiple peers.
//
// The peer-aware callback is needed before supporting
// independent simultaneous peer sessions. peer_id is
// mapped to an authorized physical link by comm.cpp.
// A true return means queued/copied, NOT delivered.
// =======================================================

using HandshakeSendCallback = bool (*)(
    const uint8_t *data,
    size_t length
);

using HandshakePeerSendCallback = bool (*)(
    uint8_t destination_peer_id,
    const uint8_t *data,
    size_t length
);

// =======================================================
// Initialization and transport binding
// =======================================================

bool handshake_init(uint8_t local_peer_id, DeviceSide local_side);

void handshake_set_send_callback(HandshakeSendCallback callback);

// Declared for peer-aware transport integration (File 11/15).
void handshake_set_peer_send_callback(HandshakePeerSendCallback callback);

// =======================================================
// Establish authenticated sessions
//
// Only previously TRUSTED identities may establish a
// session. Verify signed ephemeral key exchange, suite,
// capabilities, version, both identity fingerprints,
// both device roles, and the canonical transcript.
// Never accept an unauthenticated downgrade.
// =======================================================

bool handshake_start(uint8_t trusted_peer_id);

// Existing single-peer entry point; keep until comm.cpp
// migrates to peer-aware dispatch. It must only be used
// where comm.cpp has already restricted the source link.
bool handshake_handle_packet(const uint8_t *data, size_t length);

// New per-peer entry point (File 11/15). The source peer
// ID must be resolved from the trusted transport binding;
// the packet's claimed sender_id is not sufficient.
bool handshake_handle_peer_packet(
    uint8_t transport_peer_id,
    const uint8_t *data,
    size_t length
);

void handshake_loop();

// =======================================================
// Reset and revocation
//
// Never resume an old volatile session after power loss.
// The all-peer reset destroys every session key, counter,
// nonce base, replay window, and pending handshake.
// The per-peer reset is needed for immediate revocation.
// Neither operation erases persistent trusted identities.
// =======================================================

void handshake_reset();

// Declared for peer-aware state isolation (File 11).
void handshake_reset_peer(uint8_t trusted_peer_id);

// =======================================================
// State and failure diagnostics
// =======================================================

HandshakeState handshake_state();
const char *handshake_state_name();

HandshakeFailure handshake_failure();
const char *handshake_failure_name();

// =======================================================
// Active session access
//
// The existing accessors remain for comm.cpp compatibility.
// Once multi-peer is enabled, an unqualified accessor must
// fail closed when more than one session is active; callers
// must request a specific verified peer instead.
// Returned pointers are BORROWED, volatile, and must never
// be persisted or retained past session reset/rekey.
// Mutable access is exclusively for trusted packet-counter
// and replay-management code, never for UI/application code.
// =======================================================

bool handshake_session_ready();
uint8_t handshake_peer_id();

const SessionSecrets *handshake_active_session();
SessionSecrets *handshake_active_session_mutable();

// Peer-aware accessors (implemented in File 11).
uint8_t handshake_active_peer_count();
bool handshake_session_ready_for_peer(uint8_t trusted_peer_id);

const SessionSecrets *handshake_active_session_for_peer(
    uint8_t trusted_peer_id
);

SessionSecrets *handshake_active_session_for_peer_mutable(
    uint8_t trusted_peer_id
);

// =======================================================
// Authenticated session rekey installation
//
// The replacement must be derived from an authenticated
// rekey transcript, bound to the SAME verified peer and
// negotiated suite, and advance the session key epoch.
// Installation must retire the previous secret material
// atomically, without allowing old-key data afterwards.
// =======================================================

bool handshake_replace_active_session(const SessionSecrets &replacement);

// Peer-aware replacement; implemented in File 11.
bool handshake_replace_peer_session(
    uint8_t trusted_peer_id,
    const SessionSecrets &replacement
);

// =======================================================
// Transcript binding
//
// These accessors return the canonical handshake digest,
// not secret keys. They must fail if no authenticated
// transcript exists for the requested peer.
// =======================================================

bool handshake_copy_transcript_hash(uint8_t output[SHA256_SIZE]);

// Per-peer variant; implemented in File 11.
bool handshake_copy_transcript_hash_for_peer(
    uint8_t trusted_peer_id,
    uint8_t output[SHA256_SIZE]
);

DeviceSide handshake_local_side();

// =======================================================
// Compile-time invariants
// =======================================================

static_assert(sizeof(HandshakeState) == 1,
              "Handshake states must remain uint8_t");

static_assert(sizeof(HandshakeFailure) == 1,
              "Handshake failures must remain uint8_t");

static_assert(static_cast<uint8_t>(HandshakeState::ACTIVE) == 5 &&
              static_cast<uint8_t>(HandshakeState::FAILED) == 6,
              "Existing handshake state values changed");

static_assert(static_cast<uint8_t>(HandshakeFailure::TIMEOUT) == 13,
              "Existing handshake failure values changed");

static_assert((GW_HANDSHAKE_REQUIRED_CAPABILITIES &
              ~GW_HANDSHAKE_BASELINE_CAPABILITIES) == 0,
              "Required capabilities must be supported");

static_assert((GW_HANDSHAKE_BASELINE_CAPABILITIES &
              (GW_CAP_MULTI_PEER | GW_CAP_HYBRID_PQ)) == 0,
              "Do not advertise unimplemented security features");

static_assert(MAX_TRUSTED_PEERS > 0,
              "At least one trusted peer slot is required");

} // namespace gw
