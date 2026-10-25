
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Trusted pairing protocol parameters
// =======================================================

// Fresh random contribution from each participant. The
// request, response and transcript must bind BOTH nonces.
static constexpr size_t PAIRING_NONCE_SIZE = 16;

// Target pairing wire protocol: version 1.1 adds a signed
// FINAL_ACK after the responder's signed COMMIT.
//
// IMPORTANT: The existing pairing.cpp in GoblinWisp(4).zip
// implements 1.0 only. Do not flash a build using this
// header until File 9 updates the sender, receiver,
// signatures, retry logic and version checks together.
// Old 1.0 pairing frames must not be silently treated as
// valid 1.1 completion frames.
static constexpr uint8_t PAIRING_PROTOCOL_MAJOR = 1;
static constexpr uint8_t PAIRING_PROTOCOL_MINOR = 1;

// =======================================================
// Pairing state machine
//
// Values 0..8 retain their existing assignments so UI
// diagnostics and existing callers remain compatible.
// WAIT_FINAL_ACK is appended instead of renumbering the
// earlier states.
// =======================================================

enum class PairingState : uint8_t
{
    UNINITIALIZED       = 0,
    IDLE                = 1,
    WINDOW_OPEN         = 2,
    REQUEST_SENT        = 3,
    WAIT_LOCAL_CONFIRM  = 4,
    WAIT_REMOTE_CONFIRM = 5,
    CONFIRM_SENT        = 6,
    PAIRED              = 7,
    FAILED              = 8,

    // Responder has transmitted a signed COMMIT and is
    // waiting for the initiator's signed FINAL_ACK.
    // A successful send alone must not mean PAIRED.
    WAIT_FINAL_ACK      = 9
};

// =======================================================
// Failure reasons
//
// Existing values 0..13 are preserved; new failures are
// appended. A failed pairing must never silently change
// persistent trust or activate a secure session.
// =======================================================

enum class PairingFailure : uint8_t
{
    NONE              = 0,
    NOT_READY         = 1,
    NOT_AUTHORIZED    = 2,
    INVALID_PACKET    = 3,
    INVALID_VERSION   = 4,
    INVALID_IDENTITY  = 5,
    INVALID_SIGNATURE = 6,
    UNEXPECTED_PEER   = 7,
    IDENTITY_MISMATCH = 8,
    CRYPTO_ERROR      = 9,
    STORAGE_ERROR     = 10,
    SEND_ERROR        = 11,
    TIMEOUT           = 12,
    USER_REJECTED     = 13,

    // Used by the File 9 implementation. A revoked peer
    // may not be restored by an ordinary pairing retry.
    PEER_REVOKED      = 14,
    FINAL_ACK_INVALID = 15
};

// =======================================================
// Transport-neutral send interface
//
// The callback must copy or queue the complete frame
// before returning true. true does NOT imply delivery.
// No security decision may rely solely on send success.
// Packet authentication is performed in pairing.cpp.
// =======================================================

using PairingSendCallback = bool (*)(
    const uint8_t *data,
    size_t length
);

// =======================================================
// Initialization
// =======================================================

bool pairing_init(
    uint8_t local_peer_id,
    const char *local_callsign
);

void pairing_set_send_callback(
    PairingSendCallback callback
);

// =======================================================
// Locally authorized pairing
//
// Initiator opens with pairing_begin(); responder opens
// a limited local enrollment window with
// pairing_open_window().
//
// A 'true' argument must come from a deliberate physical
// or local UI authorization, never from an untrusted
// received packet or an automatically assumed approval.
// Peer identity and short authentication string (SAS)
// must both be verified by the pairing implementation.
// =======================================================

bool pairing_begin(
    uint8_t expected_peer_id,
    bool locally_authorized
);

bool pairing_open_window(
    uint8_t expected_peer_id,
    bool locally_authorized
);

// =======================================================
// Incoming pairing frames
//
// Only recognized, version-compatible and authenticated
// frames may advance the state machine. Unknown/invalid
// frames must not enroll or revoke a trusted peer.
//
// Version 1.1 completion target:
//   REQUEST -> RESPONSE -> CONFIRM -> COMMIT -> FINAL_ACK
//
// The responder remains in WAIT_FINAL_ACK after COMMIT;
// it reaches PAIRED only after verifying FINAL_ACK and
// durably recording the trust relationship. The initiator
// must validate COMMIT and durably record trust before
// reporting pairing complete. Duplicate signed controls
// are handled by bounded retransmission logic (File 9).
// =======================================================

bool pairing_handle_packet(
    const uint8_t *data,
    size_t length
);

// =======================================================
// User confirms matching SAS locally
//
// An SAS comparison is a human-assisted check, not a
// substitute for signed transcript verification. The
// implementation must reject unauthorized or stale
// confirmations and clear sensitive candidate state.
// =======================================================

bool pairing_confirm_local(
    bool locally_authorized
);

void pairing_reject_local(
    bool locally_authorized
);

// =======================================================
// Runtime processing
//
// Must run regularly on the application task to enforce
// timeouts, bounded retries and re-sending previously
// signed frame bytes where appropriate.
// =======================================================

void pairing_loop();

// =======================================================
// Read-only state and diagnostics
//
// PAIRED is a completed local enrollment result, not
// proof that an encrypted application session is active.
// An authenticated handshake is still mandatory.
// =======================================================

PairingState pairing_state();

const char *pairing_state_name();

PairingFailure pairing_failure();

const char *pairing_failure_name();

// =======================================================
// Candidate public identity (display/confirmation only)
//
// These functions must never return private key material.
// Their results are provisional until pairing completes.
// =======================================================

bool pairing_has_candidate();

uint8_t pairing_candidate_peer_id();

const char *pairing_candidate_callsign();

bool pairing_candidate_fingerprint_hex(
    char *output,
    size_t output_size,
    size_t bytes_to_show = 8
);

// Six decimal digits, displayed as zero-padded "000000"
// through "999999"; users must compare on BOTH devices.
bool pairing_sas_code(uint32_t &code);

bool pairing_sas_string(char output[7]);

// =======================================================
// Transient pairing reset
//
// Clears candidate, nonce, transcript, retry and pending
// pairing state. Does NOT erase persistent identities or
// trusted peers, and must not authenticate a peer itself.
// =======================================================

void pairing_reset();

// =======================================================
// Compile-time protocol invariants
// =======================================================

static_assert(PAIRING_NONCE_SIZE == 16,
              "Pairing transcript requires 16-byte nonces");

static_assert(MAX_CALLSIGN_LEN >= 2,
              "Pairing requires a terminable callsign buffer");

static_assert(
    P256_PUBLIC_SIZE == 65 &&
    P256_SIGNATURE_SIZE == 64,
    "Pairing requires the existing P-256 wire sizes"
);

static_assert(
    static_cast<uint8_t>(PairingState::PAIRED) == 7 &&
    static_cast<uint8_t>(PairingState::FAILED) == 8,
    "Existing pairing state values must remain stable"
);

static_assert(
    static_cast<uint8_t>(PairingFailure::USER_REJECTED) == 13,
    "Existing pairing failure values must remain stable"
);

} // namespace gw
