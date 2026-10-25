
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"
#include "gw_security_policy.h"

namespace gw
{

// =======================================================
// GoblinWisp: authenticated in-session rekey interface
//
// This header describes the rekey state machine and its
// transport integration. It does NOT enable rekey support
// in the handshake capability advertisement. Enable
// GW_CAP_REKEY only after rekey.cpp, comm.cpp, and both
// devices have been integrated and interoperability-tested.
//
// Current rekey wire protocol uses the core PROTOCOL_MAJOR
// and PROTOCOL_MINOR. Do not change them independently here.
// =======================================================

// =======================================================
// Rekey state
//
// Values 0..7 are preserved for compatibility with the
// existing implementation and user-interface diagnostics.
// New values are appended, never inserted or renumbered.
// =======================================================

enum class RekeyState : uint8_t
{
    UNINITIALIZED = 0,
    IDLE          = 1,
    INIT_SENT     = 2,
    WAIT_CONFIRM  = 3,
    CONFIRM_SENT  = 4,
    COMMIT_SENT   = 5,
    ACK_SENT      = 6,
    FAILED        = 7,

    // A security-critical failure has invalidated the
    // affected session; new authenticated handshaking is
    // required before application traffic may resume.
    INVALIDATED   = 8
};

// =======================================================
// Rekey failure codes
//
// Values 0..9 retain their original numeric assignments.
// Additional codes are for the corrected File 13 runtime.
// =======================================================

enum class RekeyFailure : uint8_t
{
    NONE                 = 0,
    NOT_READY            = 1,
    BUSY                 = 2,
    INVALID_PACKET       = 3,
    WRONG_PEER           = 4,
    WRONG_SESSION        = 5,
    AUTH_FAILED          = 6,
    CRYPTO_ERROR         = 7,
    SEND_ERROR           = 8,
    TIMEOUT              = 9,

    PEER_REVOKED         = 10,
    UNSUPPORTED_SUITE    = 11,
    INVALID_EPOCH        = 12,
    COUNTER_EXHAUSTED    = 13,
    TRANSPORT_MISMATCH   = 14,
    SESSION_INVALIDATED  = 15,
    POLICY_DENIED        = 16
};

// =======================================================
// Rekey trigger reasons
//
// This is an internal policy/diagnostic reason, not proof
// of authorization conveyed by an incoming radio packet.
// Values 0..5 are unchanged.
// =======================================================

enum class RekeyReason : uint8_t
{
    NONE             = 0,
    MANUAL           = 1,
    SESSION_AGE      = 2,
    PACKET_THRESHOLD = 3,
    COUNTER_LIMIT    = 4,
    PEER_REQUEST     = 5
};

// =======================================================
// Transport callbacks
//
// A successful callback return means the frame was copied
// or queued, not that a remote peer received it. Retries
// must use the same authenticated frame bytes.
// =======================================================

// Existing one-peer transport interface.
using RekeySendCallback = bool (*)(
    const uint8_t *data,
    size_t length
);

// New peer-specific transport interface for File 13/15.
// The destination must be mapped to a trusted transport
// address by comm.cpp; packet sender_id is not sufficient.
using RekeyPeerSendCallback = bool (*)(
    uint8_t destination_peer_id,
    const uint8_t *data,
    size_t length
);

// =======================================================
// Initialization and transport binding
//
// The original initializer binds the legacy default peer.
// The peer-aware API below may address other trusted peers
// only after the corresponding runtime implementation.
// Reinitialization must wipe pending ephemeral secrets.
// =======================================================

bool rekey_init(
    uint8_t local_peer_id,
    uint8_t trusted_peer_id,
    DeviceSide local_side
);

void rekey_set_send_callback(
    RekeySendCallback callback
);

// New interface; implement in src/security/rekey.cpp.
void rekey_set_peer_send_callback(
    RekeyPeerSendCallback callback
);

// =======================================================
// Begin authenticated rekey
//
// Require an ACTIVE, independently authenticated session
// for the selected trusted peer. The request must bind the
// previous session ID, old/new epochs, both peer identities,
// device sides, negotiated suite, transcript, and fresh
// rekey contributions. The new epoch must exceed the old.
//
// Never replace a session with material derived only from
// unauthenticated fields. Never reset a traffic counter while
// continuing to use the same directional key/nonce base.
// =======================================================

// Original single-default-peer entry point.
bool rekey_request(
    RekeyReason reason
);

// New peer-specific entry point; implement in File 13.
bool rekey_request_for_peer(
    uint8_t trusted_peer_id,
    RekeyReason reason
);

// =======================================================
// Receive authenticated rekey control packets
//
// The existing dispatcher returns false if the packet is
// not a rekey frame. An authenticated and correctly bound
// frame may advance the rekey state machine. An invalid
// packet must never mutate an active session or replay state.
// =======================================================

// Legacy entry point for a single, transport-bound peer.
bool rekey_handle_packet(
    const uint8_t *data,
    size_t length
);

// Peer-specific transport-attributed dispatch. The
// transport peer ID must match the session being rekeyed.
// Implement in File 13; route through comm.cpp in File 15.
bool rekey_handle_peer_packet(
    uint8_t transport_peer_id,
    const uint8_t *data,
    size_t length
);

// =======================================================
// Retry, timeout, and reset
//
// Use the time/retry policies from gw_security_policy.h.
// During key transition, application data for that peer
// must be paused until both endpoints can use the correct
// epoch. If safe convergence cannot be established, fail
// closed and require a new authenticated handshake.
// =======================================================

void rekey_loop();

// Clears transient rekey state; this is NOT a trust reset.
// The implementation must explicitly invalidate a session
// whose key transition is uncertain rather than silently
// restoring an unsafe old epoch.
void rekey_reset();

// New per-peer reset; implement in File 13.
void rekey_reset_peer(
    uint8_t trusted_peer_id
);

// =======================================================
// State and diagnostics
// =======================================================

// Existing default-peer interface.
bool rekey_busy();

RekeyState rekey_state();

const char *rekey_state_name();

RekeyFailure rekey_failure();

const char *rekey_failure_name();

RekeyReason rekey_reason();

const char *rekey_reason_name();

uint32_t rekey_success_count();

uint32_t rekey_failure_count();

// =======================================================
// Peer-aware status
// =======================================================

// A false value from rekey_busy_for_peer() does not, by
// itself, mean a secure application session is authorized;
// handshake_session_ready_for_peer() is also required.
bool rekey_busy_for_peer(
    uint8_t trusted_peer_id
);

// True when application traffic for this peer must remain
// paused because a rekey transition is in progress or its
// outcome is security-ambiguous. Implement in File 13.
bool rekey_blocks_application_data_for_peer(
    uint8_t trusted_peer_id
);

// =======================================================
// Compile-time compatibility and policy invariants
// =======================================================

static_assert(
    sizeof(RekeyState) == sizeof(uint8_t),
    "RekeyState must remain 8-bit"
);

static_assert(
    sizeof(RekeyFailure) == sizeof(uint8_t),
    "RekeyFailure must remain 8-bit"
);

static_assert(
    sizeof(RekeyReason) == sizeof(uint8_t),
    "RekeyReason must remain 8-bit"
);

static_assert(
    static_cast<uint8_t>(RekeyState::ACK_SENT) == 6 &&
    static_cast<uint8_t>(RekeyState::FAILED) == 7,
    "Existing RekeyState values must be preserved"
);

static_assert(
    static_cast<uint8_t>(RekeyFailure::TIMEOUT) == 9,
    "Existing RekeyFailure values must be preserved"
);

static_assert(
    static_cast<uint8_t>(RekeyReason::PEER_REQUEST) == 5,
    "Existing RekeyReason values must be preserved"
);

static_assert(
    REKEY_TIMEOUT_MS > 0 &&
    REKEY_MAX_RETRIES > 0,
    "Rekey timeout and retry policy must be enabled"
);

static_assert(
    REKEY_PACKET_THRESHOLD > 0 &&
    REKEY_PACKET_THRESHOLD < COUNTER_HARD_LIMIT,
    "Rekey must trigger before the hard counter limit"
);

static_assert(
    MAX_ACTIVE_PEERS >= 1 &&
    MAX_ACTIVE_PEERS <= MAX_TRUSTED_PEERS,
    "Rekey peer capacity exceeds trusted peer capacity"
);

} // namespace gw
