
#include "gw_security_runtime.h"

#include "gw_crypto.h"
#include "gw_identity.h"
#include "gw_storage.h"
#include "gw_trust.h"

#include <cstring>

namespace gw {
namespace {

SecurityRuntimeState runtime_state = SecurityRuntimeState::UNINITIALIZED;

// A small startup known-answer test. It detects failure of this SHA-256
// path; it does not certify P-256, the RNG, protected storage, or hardware.
bool sha256_startup_test() {
    static const uint8_t message[] = {0x61, 0x62, 0x63}; // "abc"
    static const uint8_t expected[SHA256_SIZE] = {
        0xBA, 0x78, 0x16, 0xBF, 0x8F, 0x01, 0xCF, 0xEA,
        0x41, 0x41, 0x40, 0xDE, 0x5D, 0xAE, 0x22, 0x23,
        0xB0, 0x03, 0x61, 0xA3, 0x96, 0x17, 0x7A, 0x9C,
        0xB4, 0x10, 0xFF, 0x61, 0xF2, 0x00, 0x15, 0xAD
    };
    uint8_t digest[SHA256_SIZE] = {};
    const bool passed =
        crypto_sha256(message, sizeof(message), digest) &&
        crypto_constant_time_equal(digest, expected, SHA256_SIZE);
    secure_zero(digest, sizeof(digest));
    return passed;
}

bool read_storage_health(StorageHealth &health) {
    std::memset(&health, 0, sizeof(health));
    return storage_get_health(health) == StorageStatus::OK &&
           health.initialized;
}

bool production_protection_satisfied(const StorageHealth &health) {
#if defined(GW_REQUIRE_PRODUCTION_SECURITY) && GW_REQUIRE_PRODUCTION_SECURITY
    return health.protection == StorageProtection::VERIFIED_ENCRYPTED;
#else
    (void)health;
    return true;
#endif
}

// Recovered older slots may predate a peer revocation or an identity erase.
// With no authenticated anti-rollback mechanism, refuse automatic recovery.
bool acceptable_journal_recovery(const StorageHealth &health) {
    return !health.identity.recovered_previous_slot &&
           !health.trust.recovered_previous_slot;
}

// Fail readiness closed if a dependency becomes unavailable after startup.
// This does not itself erase persistent identity/trust or close an already
// active radio session; main/comm must enforce their own session checks.
bool check_ready_dependencies() {
    if (!identity_ready()) {
        runtime_state = SecurityRuntimeState::IDENTITY_FAILURE;
        return false;
    }
    if (!trust_ready()) {
        runtime_state = SecurityRuntimeState::TRUST_FAILURE;
        return false;
    }

    StorageHealth health{};
    if (!read_storage_health(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_FAILURE;
        return false;
    }
    if (!production_protection_satisfied(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_PROTECTION_REQUIRED;
        return false;
    }
    if (health.identity.erase_marker_present) {
        runtime_state = SecurityRuntimeState::REPROVISION_REQUIRED;
        return false;
    }
    if (health.identity.last_status != StorageStatus::OK) {
        runtime_state = SecurityRuntimeState::IDENTITY_FAILURE;
        return false;
    }
    if (health.trust.last_status != StorageStatus::OK &&
        health.trust.last_status != StorageStatus::NOT_FOUND) {
        runtime_state = SecurityRuntimeState::TRUST_FAILURE;
        return false;
    }
    if (health.identity.recovered_previous_slot) {
        runtime_state = SecurityRuntimeState::IDENTITY_FAILURE;
        return false;
    }
    if (health.trust.recovered_previous_slot) {
        runtime_state = SecurityRuntimeState::TRUST_FAILURE;
        return false;
    }
    return true;
}

SecurityRuntimeState classify_identity_failure() {
    StorageHealth health{};
    if (!read_storage_health(health)) {
        return SecurityRuntimeState::STORAGE_FAILURE;
    }
    if (!production_protection_satisfied(health) ||
        health.identity.last_status == StorageStatus::PROTECTION_REQUIRED) {
        return SecurityRuntimeState::STORAGE_PROTECTION_REQUIRED;
    }
    // identity_init() leaves its state UNINITIALIZED specifically when a
    // NOT_FOUND identity is not safely eligible for first-boot creation.
    // Other failures (e.g. failed entropy or signature-key generation) must
    // not be mislabeled as an authorized identity reprovisioning request.
    if (identity_state() == IdentityState::UNINITIALIZED &&
        health.identity.last_status == StorageStatus::NOT_FOUND) {
        return SecurityRuntimeState::REPROVISION_REQUIRED;
    }
    return SecurityRuntimeState::IDENTITY_FAILURE;
}

} // namespace

// =======================================================
// Initialize storage, identity and trust in that order.
// =======================================================
bool security_runtime_init() {
    runtime_state = SecurityRuntimeState::STARTING;
    Serial.println();
    Serial.println("[SSIP] SECURITY FOUNDATION START");

    if (!storage_init()) {
        runtime_state = SecurityRuntimeState::STORAGE_FAILURE;
        Serial.println("[SSIP] STORAGE: FAILED");
        return false;
    }

    StorageHealth health{};
    if (!read_storage_health(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_FAILURE;
        Serial.println("[SSIP] STORAGE HEALTH: UNAVAILABLE");
        return false;
    }

    // A build requesting production protection MUST have affirmative
    // verification from the storage driver. UNKNOWN is not encrypted.
    if (!production_protection_satisfied(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_PROTECTION_REQUIRED;
        Serial.println("[SSIP] VERIFIED STORAGE PROTECTION REQUIRED");
        return false;
    }
    Serial.println("[SSIP] STORAGE: AVAILABLE");

    if (!sha256_startup_test()) {
        runtime_state = SecurityRuntimeState::CRYPTO_SELF_TEST_FAILURE;
        Serial.println("[SSIP] SHA-256 STARTUP TEST: FAILED");
        return false;
    }
    Serial.println("[SSIP] SHA-256 STARTUP TEST: PASSED");

    if (!identity_init() || !identity_ready()) {
        runtime_state = classify_identity_failure();
        Serial.print("[SSIP] IDENTITY: ");
        Serial.println(identity_state_name());
        Serial.print("[SSIP] FOUNDATION: ");
        Serial.println(security_runtime_state_name());
        return false;
    }
    if (!read_storage_health(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_FAILURE;
        return false;
    }
    if (health.identity.recovered_previous_slot) {
        runtime_state = SecurityRuntimeState::IDENTITY_FAILURE;
        Serial.println("[SSIP] IDENTITY JOURNAL RECOVERY: REFUSED");
        return false;
    }

    // Print only the public-key fingerprint, never persistent secret keys.
    char fingerprint[SHA256_SIZE] = {};
    if (!identity_fingerprint_hex(fingerprint, sizeof(fingerprint), 8)) {
        std::memset(fingerprint, 0, sizeof(fingerprint));
        runtime_state = SecurityRuntimeState::IDENTITY_FAILURE;
        Serial.println("[SSIP] IDENTITY FINGERPRINT: FAILED");
        return false;
    }
    Serial.print("[SSIP] IDENTITY: ");
    Serial.println(identity_state_name());
    Serial.print("[SSIP] IDENTITY FP: ");
    Serial.println(fingerprint);
    std::memset(fingerprint, 0, sizeof(fingerprint));

    if (!trust_init() || !trust_ready()) {
        runtime_state = SecurityRuntimeState::TRUST_FAILURE;
        Serial.println("[SSIP] TRUST DATABASE: FAILED");
        return false;
    }
    if (!read_storage_health(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_FAILURE;
        return false;
    }
    if (!acceptable_journal_recovery(health)) {
        runtime_state = health.trust.recovered_previous_slot
            ? SecurityRuntimeState::TRUST_FAILURE
            : SecurityRuntimeState::IDENTITY_FAILURE;
        Serial.println("[SSIP] UNVERIFIED JOURNAL FALLBACK: REFUSED");
        return false;
    }
    if (!production_protection_satisfied(health)) {
        runtime_state = SecurityRuntimeState::STORAGE_PROTECTION_REQUIRED;
        return false;
    }

    runtime_state = SecurityRuntimeState::READY;
    if (!check_ready_dependencies()) {
        Serial.println("[SSIP] FOUNDATION DEPENDENCY CHECK: FAILED");
        return false;
    }

    Serial.println("[SSIP] TRUST DATABASE: READY");
    Serial.print("[SSIP] PEER RECORDS (INCLUDES REVOKED): ");
    Serial.println(trust_peer_count());
    Serial.println("[SSIP] SECURITY FOUNDATION READY");
    return true;
}

bool security_runtime_ready() {
    return runtime_state == SecurityRuntimeState::READY &&
           check_ready_dependencies();
}

SecurityRuntimeState security_runtime_state() {
    // Refresh a previously READY state rather than returning a stale value.
    (void)security_runtime_ready();
    return runtime_state;
}

const char *security_runtime_state_name() {
    switch (security_runtime_state()) {
        case SecurityRuntimeState::UNINITIALIZED: return "UNINITIALIZED";
        case SecurityRuntimeState::STARTING: return "STARTING";
        case SecurityRuntimeState::READY: return "READY";
        case SecurityRuntimeState::STORAGE_FAILURE: return "STORAGE FAILURE";
        case SecurityRuntimeState::IDENTITY_FAILURE: return "IDENTITY FAILURE";
        case SecurityRuntimeState::TRUST_FAILURE: return "TRUST FAILURE";
        case SecurityRuntimeState::REPROVISION_REQUIRED:
            return "REPROVISION REQUIRED";
        case SecurityRuntimeState::STORAGE_PROTECTION_REQUIRED:
            return "STORAGE PROTECTION REQUIRED";
        case SecurityRuntimeState::CRYPTO_SELF_TEST_FAILURE:
            return "CRYPTO SELF TEST FAILURE";
        default: return "UNKNOWN";
    }
}

bool security_runtime_get_health(SecurityRuntimeHealth &output) {
    // The contract requires a cleared result when storage health is missing.
    std::memset(&output, 0, sizeof(output));
    StorageHealth health{};
    if (!read_storage_health(health)) {
        return false;
    }

    output.foundation_ready = security_runtime_ready();
    output.state = runtime_state;
    output.storage = health;
    output.storage_ready = health.initialized;
    output.identity_ready = identity_ready();
    output.trust_ready = trust_ready();
    output.peer_record_count = output.foundation_ready
        ? trust_peer_count() : 0;
    return true;
}

uint8_t security_runtime_peer_count() {
    return security_runtime_ready() ? trust_peer_count() : 0;
}

bool security_runtime_fingerprint(char *output,
                                  size_t output_size,
                                  size_t bytes_to_show) {
    if (!output || output_size == 0) {
        return false;
    }
    output[0] = '\0';
    if (!security_runtime_ready() ||
        !identity_fingerprint_hex(output, output_size, bytes_to_show)) {
        output[0] = '\0';
        return false;
    }
    return true;
}

} // namespace gw
