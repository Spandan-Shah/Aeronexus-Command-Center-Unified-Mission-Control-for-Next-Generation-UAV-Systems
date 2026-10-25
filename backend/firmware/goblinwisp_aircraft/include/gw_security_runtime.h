
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"
#include "gw_storage.h"

namespace gw {

// =======================================================
// Persistent security-foundation lifecycle
//
// This state describes local storage, persistent device
// identity, and trusted-peer database initialization.
// It does NOT indicate that ESP-NOW is initialized or that
// an authenticated, encrypted application session exists.
// Call handshake/comm session-ready APIs for that purpose.
//
// The original values 0..5 must remain unchanged for UI
// compatibility. New conditions are appended only.
// =======================================================

enum class SecurityRuntimeState : uint8_t {
    UNINITIALIZED               = 0,
    STARTING                    = 1,
    READY                       = 2,
    STORAGE_FAILURE             = 3,
    IDENTITY_FAILURE            = 4,
    TRUST_FAILURE               = 5,

    // The local identity was deliberately erased or prior
    // provisioning prevents a safe automatic replacement.
    // Recovery requires a separate, locally authorized flow.
    REPROVISION_REQUIRED        = 6,

    // A production policy requires positively verified
    // protected storage, but it could not be established.
    STORAGE_PROTECTION_REQUIRED = 7,

    // An implemented startup cryptographic self-test failed.
    // Do not report this unless a real self-test was run.
    CRYPTO_SELF_TEST_FAILURE    = 8
};

// =======================================================
// Non-secret diagnostic snapshot
//
// A snapshot reports observed status, not an attestation.
// The storage driver currently reports protection UNKNOWN
// unless encrypted storage is positively verified.
// recovered_previous_slot detects local journal recovery;
// it is NOT a guarantee against malicious NVS rollback.
//
// peer_record_count includes retained REVOKED records.
// Never expose persistent private keys or SessionSecrets
// through this diagnostic interface.
// =======================================================

struct SecurityRuntimeHealth {
    SecurityRuntimeState state;
    StorageHealth storage;

    bool storage_ready;
    bool identity_ready;
    bool trust_ready;
    bool foundation_ready;

    uint8_t peer_record_count;
};

// =======================================================
// Initialize the persistent SSIP security foundation
//
// File 17 must initialize and validate storage, identity,
// and the trust database in that order. On ANY failure it
// must not return READY or start communications. A missing
// local identity is suitable for first-boot provisioning
// only when the storage/identity layers establish that it
// is genuinely new; never regenerate on corruption, erase
// or an unexplained identity/trust inconsistency.
//
// Initialization must be idempotent with respect to the
// permanent identity: ordinary reboot and retry must not
// replace existing keys or clear trusted peers.
// =======================================================

bool security_runtime_init();

// =======================================================
// Runtime state
//
// READY means the persistent foundation is usable; it
// does NOT imply an active handshake or encrypted session.
// File 17 must ensure underlying identity and trust are
// still ready rather than relying solely on a stale flag.
// =======================================================

bool security_runtime_ready();

SecurityRuntimeState security_runtime_state();

const char *security_runtime_state_name();

// =======================================================
// Non-secret diagnostics
//
// This call must zero-initialize output on failure. Health
// fields represent a point-in-time snapshot and must not
// be treated as an authorization decision by comm.cpp.
// Implement in src/security/security_runtime.cpp (File 17).
// =======================================================

bool security_runtime_get_health(SecurityRuntimeHealth &output);

// Returns the number of occupied persistent peer records,
// including revoked entries, or 0 when not ready. The
// count is not evidence that an active trusted peer exists.
uint8_t security_runtime_peer_count();

// Display-only SHA-256 fingerprint of the LOCAL public key.
// bytes_to_show=8 needs at least 24 output bytes for the
// format "AA:BB:CC:DD:EE:FF:00:11" plus '\0'. Passing
// SHA256_SIZE requires 96 bytes. Never output private keys.
// The implementation must clear output on failure, when
// output is non-null and output_size is nonzero.
bool security_runtime_fingerprint(
    char *output,
    size_t output_size,
    size_t bytes_to_show = 8
);

// =======================================================
// Compile-time API compatibility checks
// =======================================================

static_assert(sizeof(SecurityRuntimeState) == sizeof(uint8_t),
              "Runtime states must remain uint8_t");

static_assert(static_cast<uint8_t>(SecurityRuntimeState::UNINITIALIZED) == 0 &&
              static_cast<uint8_t>(SecurityRuntimeState::READY) == 2 &&
              static_cast<uint8_t>(SecurityRuntimeState::TRUST_FAILURE) == 5,
              "Existing runtime state codes must remain stable");

static_assert(SHA256_SIZE == 32,
              "Fingerprint diagnostic expects SHA-256");

static_assert(MAX_TRUSTED_PEERS > 0,
              "Persistent trust database must have at least one slot");

} // namespace gw
