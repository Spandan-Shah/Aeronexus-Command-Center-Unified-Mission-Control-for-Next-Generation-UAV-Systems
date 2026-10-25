
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Persistent trust verification result
//
// Existing numeric values are unchanged. These results
// describe an identity-continuity check; TRUSTED alone
// is NOT proof that a live peer possesses its private key.
// The authenticated handshake must verify that separately.
// =======================================================

enum class TrustVerifyResult : uint8_t
{
    TRUSTED            = 0,
    UNKNOWN_PEER       = 1,
    IDENTITY_MISMATCH  = 2,
    REVOKED            = 3,
    INVALID_PUBLIC_KEY = 4,
    STORAGE_ERROR      = 5,
    NOT_READY          = 6
};

// =======================================================
// Persistent trust database lifecycle
//
// All trust operations fail closed until trust_init()
// has loaded and validated the database. An absent database
// is not equivalent to a corrupt or unreadable database.
// Never silently clear trust after a storage error.
// =======================================================

bool trust_init();
bool trust_ready();

// =======================================================
// Read-only peer information
//
// The count includes retained REVOKED records, which occupy
// storage slots and must remain available for deny checks.
// Logical peer IDs are not transport addresses or proof of
// identity. Peer records contain public information only.
// =======================================================

uint8_t trust_peer_count();

// Copy a stored record, including a REVOKED record.
// A successful copy does NOT grant authorization.
// On failure, implementation must clear output.
bool trust_copy_peer(
    uint8_t peer_id,
    PeerRecord &output
);

// Copy only a valid, non-revoked TRUSTED record.
// Intended for peer-session setup and secure routing;
// callers must still perform authenticated key proof.
// On failure, implementation must clear output.
// Implement in src/security/trust.cpp (File 7).
bool trust_copy_trusted_peer(
    uint8_t peer_id,
    PeerRecord &output
);

// =======================================================
// Identity continuity verification
//
// Verifies the *presented* P-256 public key against the
// stored key and SHA-256 fingerprint associated with the
// given logical peer ID. Rejects revoked and unknown peers.
// This check must be combined with handshake signature /
// key-confirmation verification to authenticate a live peer.
// Does not modify persistent trust state.
// =======================================================

TrustVerifyResult trust_verify_peer(
    uint8_t peer_id,
    const uint8_t presented_public_key[P256_PUBLIC_SIZE]
);

// =======================================================
// Trusted enrollment
//
// locally_authorized MUST be derived from a deliberate
// local confirmation, never from an incoming packet flag.
// Call only after the pairing protocol has verified the
// peer identity and both sides have confirmed enrollment.
//
// Do not replace an existing peer ID's different identity,
// reinterpret a REVOKED record as trusted, or enroll a
// public key already associated with a different peer ID.
// Save must be durable before returning true. On failure,
// memory and persistent trust records must remain coherent.
// =======================================================

bool trust_enroll_peer(
    uint8_t peer_id,
    const char *callsign,
    const uint8_t public_key[P256_PUBLIC_SIZE],
    bool local_authorized
);

// =======================================================
// Authorized revocation and trust reset
//
// Revocation retains the peer ID, key and fingerprint with
// TrustState::REVOKED; it must be persisted before success.
// A revoked peer must be refused by pairing and handshake.
// Implement in src/security/trust.cpp (File 7).
//
// Reset/removal is different: it deliberately deletes that
// peer's trust record so a new authorized pairing can occur.
// The caller must invalidate any live session for that peer
// as part of the reset/revocation workflow. A boolean alone
// does not constitute local proof of authorization.
// =======================================================

bool trust_revoke_peer(
    uint8_t peer_id,
    bool local_authorized
);

// Preserve the original trust-reset API and semantics.
bool trust_remove_peer(
    uint8_t peer_id,
    bool local_authorized
);

// Clears the entire stored trust database only after an
// explicit, locally authorized recovery/factory-reset flow.
// Must not change the device's permanent identity.
bool trust_clear_all(
    bool local_authorized
);

// =======================================================
// Human-readable result (no key material in logs)
// =======================================================

const char *trust_verify_result_name(
    TrustVerifyResult result
);

// =======================================================
// Compile-time interface invariants
// =======================================================

static_assert(sizeof(TrustVerifyResult) == sizeof(uint8_t),
              "Trust result codes must remain 8-bit");

static_assert(
    static_cast<uint8_t>(TrustVerifyResult::TRUSTED) == 0 &&
    static_cast<uint8_t>(TrustVerifyResult::NOT_READY) == 6,
    "Existing trust result values must remain stable"
);

static_assert(MAX_TRUSTED_PEERS > 0,
              "Trust database must have at least one slot");

} // namespace gw
