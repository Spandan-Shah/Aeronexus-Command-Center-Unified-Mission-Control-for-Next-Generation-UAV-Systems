
#include "gw_identity.h"

#include "gw_crypto.h"
#include "gw_storage.h"

#include <cstdio>
#include <cstring>

namespace gw {
namespace {

// This is the sole in-memory long-term identity for the device.
// Never persist a pointer to it, transmit the private key, or
// include it in session-secret zeroization routines.
IdentityMaterial local_identity{};
IdentityState current_state = IdentityState::UNINITIALIZED;
bool reprovision_required = false;

// Wipe temporary copies on every return path, including errors.
struct ScopedIdentity {
    IdentityMaterial value{};

    ~ScopedIdentity() {
        secure_zero(&value, sizeof(value));
    }

    ScopedIdentity(const ScopedIdentity &) = delete;
    ScopedIdentity &operator=(const ScopedIdentity &) = delete;
    ScopedIdentity() = default;
};

struct ScopedPeers {
    PeerRecord records[MAX_TRUSTED_PEERS]{};

    ~ScopedPeers() {
        secure_zero(records, sizeof(records));
    }

    ScopedPeers(const ScopedPeers &) = delete;
    ScopedPeers &operator=(const ScopedPeers &) = delete;
    ScopedPeers() = default;
};

// =======================================================
// Validate persistent cryptographic identity
// =======================================================

bool validate_identity(const IdentityMaterial &identity) {
    if (!identity.valid ||
        !crypto_p256_validate_public(identity.public_key)) {
        return false;
    }

    uint8_t derived_public[P256_PUBLIC_SIZE]{};
    uint8_t calculated_fp[SHA256_SIZE]{};

    const bool public_ok =
        crypto_p256_public_from_private(
            identity.private_key,
            derived_public
        ) &&
        crypto_constant_time_equal(
            derived_public,
            identity.public_key,
            P256_PUBLIC_SIZE
        );

    const bool fingerprint_ok =
        crypto_sha256(
            identity.public_key,
            P256_PUBLIC_SIZE,
            calculated_fp
        ) &&
        crypto_constant_time_equal(
            calculated_fp,
            identity.fingerprint,
            SHA256_SIZE
        );

    secure_zero(derived_public, sizeof(derived_public));
    secure_zero(calculated_fp, sizeof(calculated_fp));

    return public_ok && fingerprint_ok;
}

// =======================================================
// Verify genuine first-boot provisioning
// =======================================================

// A blank identity namespace alone does not prove this
// is a new device. Existing peer trust must not survive
// an unexplained loss of the local cryptographic identity.

bool fresh_device_without_prior_trust() {
    ScopedPeers peers;
    uint8_t count = 0;

    const StorageStatus status =
        storage_load_peer_records(peers.records, count);

    // Even an empty existing trust database indicates
    // prior provisioning. Require controlled recovery.
    return status == StorageStatus::NOT_FOUND;
}

// =======================================================
// Generate first persistent identity
// =======================================================

bool generate_first_identity() {
    ScopedIdentity generated;
    ScopedIdentity confirmed;

    if (!crypto_p256_generate_keypair(
            generated.value.private_key,
            generated.value.public_key
        ) ||
        !crypto_sha256(
            generated.value.public_key,
            P256_PUBLIC_SIZE,
            generated.value.fingerprint
        )) {

        current_state = IdentityState::STORAGE_ERROR;
        return false;
    }

    generated.value.valid = true;

    // Validate generated key material before saving.
    if (!validate_identity(generated.value)) {
        current_state = IdentityState::CORRUPT;
        return false;
    }

    // Persist the identity using File 4's verified
    // journal storage implementation.
    const StorageStatus saved =
        storage_save_identity(generated.value);

    if (saved != StorageStatus::OK) {
        current_state =
            saved == StorageStatus::CORRUPT
                ? IdentityState::CORRUPT
                : IdentityState::STORAGE_ERROR;

        return false;
    }

    // A successful storage write is not sufficient.
    // Read back the actual committed key material.
    const StorageStatus loaded =
        storage_load_identity(confirmed.value);

    if (loaded != StorageStatus::OK ||
        !validate_identity(confirmed.value) ||

        !crypto_constant_time_equal(
            confirmed.value.private_key,
            generated.value.private_key,
            P256_PRIVATE_SIZE
        ) ||

        !crypto_constant_time_equal(
            confirmed.value.public_key,
            generated.value.public_key,
            P256_PUBLIC_SIZE
        ) ||

        !crypto_constant_time_equal(
            confirmed.value.fingerprint,
            generated.value.fingerprint,
            SHA256_SIZE
        )) {

        current_state = IdentityState::CORRUPT;
        return false;
    }

    // Activate only the verified persisted identity.
    std::memcpy(
        &local_identity,
        &confirmed.value,
        sizeof(local_identity)
    );

    current_state = IdentityState::GENERATED;
    return true;
}

} // namespace

// =======================================================
// Initialize persistent identity
// =======================================================

bool identity_init() {
    // Prior volatile identity material must never remain
    // active during reinitialization.
    secure_zero(&local_identity, sizeof(local_identity));

    current_state = IdentityState::UNINITIALIZED;
    reprovision_required = false;

    if (!storage_init()) {
        current_state = IdentityState::STORAGE_ERROR;
        return false;
    }

    StorageHealth health{};

    if (storage_get_health(health) != StorageStatus::OK ||
        !health.initialized) {

        current_state = IdentityState::STORAGE_ERROR;
        return false;
    }

    // Optional production-security enforcement.
    // File 4 reports storage protection as UNKNOWN
    // until encryption is positively verified.
    //
    // A build flag alone cannot establish that encrypted
    // NVS or hardware-backed storage is operational.
#if defined(GW_REQUIRE_PRODUCTION_SECURITY) && \
    GW_REQUIRE_PRODUCTION_SECURITY

    if (health.protection !=
        StorageProtection::VERIFIED_ENCRYPTED) {

        current_state = IdentityState::STORAGE_ERROR;
        return false;
    }
#endif

    ScopedIdentity stored;

    const StorageStatus status =
        storage_load_identity(stored.value);

    // ---------------------------------------------------
    // Existing persistent identity
    // ---------------------------------------------------

    if (status == StorageStatus::OK) {
        if (!validate_identity(stored.value)) {
            current_state = IdentityState::CORRUPT;
            return false;
        }

        std::memcpy(
            &local_identity,
            &stored.value,
            sizeof(local_identity)
        );

        current_state = IdentityState::READY;
        return true;
    }

    // ---------------------------------------------------
    // Storage failure: never silently replace identity
    // ---------------------------------------------------

    if (status != StorageStatus::NOT_FOUND) {
        current_state =
            status == StorageStatus::CORRUPT ||
            status == StorageStatus::UNSUPPORTED_SCHEMA ||
            status == StorageStatus::VERIFY_FAILED
                ? IdentityState::CORRUPT
                : IdentityState::STORAGE_ERROR;

        return false;
    }

    // ---------------------------------------------------
    // Distinguish first boot from authorized erase
    // ---------------------------------------------------

    if (storage_get_health(health) != StorageStatus::OK) {
        current_state = IdentityState::STORAGE_ERROR;
        return false;
    }

    // An erase marker or previous journal generation
    // means the identity was intentionally removed.
    // Never regenerate it automatically at startup.
    if (health.identity.erase_marker_present ||
        (health.identity.format ==
             StorageFormat::JOURNALED_TWO_SLOT &&
         health.identity.generation != 0)) {

        reprovision_required = true;
        return false;
    }

    // Identity generation is permitted only when
    // no earlier identity format is present and
    // no prior trust database can be found.
    if (health.identity.format != StorageFormat::NONE ||
        !fresh_device_without_prior_trust()) {

        reprovision_required = true;
        return false;
    }

    // ---------------------------------------------------
    // Genuine first boot: generate and verify identity
    // ---------------------------------------------------

    return generate_first_identity();
}

// =======================================================
// Identity readiness
// =======================================================

bool identity_ready() {
    return local_identity.valid &&
           (current_state == IdentityState::READY ||
            current_state == IdentityState::GENERATED);
}

// =======================================================
// Identity state
// =======================================================

IdentityState identity_state() {
    return current_state;
}

const char *identity_state_name() {
    if (reprovision_required) {
        return "REPROVISION REQUIRED";
    }

    switch (current_state) {
        case IdentityState::UNINITIALIZED:
            return "UNINITIALIZED";

        case IdentityState::GENERATED:
            return "GENERATED";

        case IdentityState::READY:
            return "READY";

        case IdentityState::STORAGE_ERROR:
            return "STORAGE ERROR";

        case IdentityState::CORRUPT:
            return "CORRUPT";

        default:
            return "UNKNOWN";
    }
}

// =======================================================
// Copy persistent public key
// =======================================================

bool identity_copy_public_key(
    uint8_t output[P256_PUBLIC_SIZE]
) {
    if (!output) {
        return false;
    }

    if (!identity_ready()) {
        std::memset(output, 0, P256_PUBLIC_SIZE);
        return false;
    }

    std::memcpy(
        output,
        local_identity.public_key,
        P256_PUBLIC_SIZE
    );

    return true;
}

// =======================================================
// Copy persistent fingerprint
// =======================================================

bool identity_copy_fingerprint(
    uint8_t output[SHA256_SIZE]
) {
    if (!output) {
        return false;
    }

    if (!identity_ready()) {
        std::memset(output, 0, SHA256_SIZE);
        return false;
    }

    std::memcpy(
        output,
        local_identity.fingerprint,
        SHA256_SIZE
    );

    return true;
}

// =======================================================
// Sign a SHA-256 digest with persistent identity
// =======================================================

bool identity_sign_digest(
    const uint8_t digest[SHA256_SIZE],
    uint8_t signature[P256_SIGNATURE_SIZE]
) {
    if (!signature) {
        return false;
    }

    if (!digest || !identity_ready()) {
        std::memset(signature, 0, P256_SIGNATURE_SIZE);
        return false;
    }

    if (!crypto_p256_sign_digest(
            local_identity.private_key,
            digest,
            signature
        )) {

        std::memset(signature, 0, P256_SIGNATURE_SIZE);
        return false;
    }

    return true;
}

// =======================================================
// Static identity / peer ephemeral ECDH with private-key
// handling restricted to this identity module.
// =======================================================

bool identity_agree_ephemeral(
    const uint8_t peer_ephemeral_public[P256_PUBLIC_SIZE],
    uint8_t output[SHA256_SIZE]
) {
    if (!output) return false;
    std::memset(output, 0, SHA256_SIZE);
    if (!identity_ready() || !peer_ephemeral_public ||
        !crypto_p256_validate_public(peer_ephemeral_public)) return false;
    return crypto_p256_ecdh(local_identity.private_key,
                            peer_ephemeral_public, output);
}

// =======================================================
// Human-readable identity fingerprint
// Example: AB:CD:EF:12
// =======================================================

bool identity_fingerprint_hex(
    char *output,
    size_t output_size,
    size_t bytes_to_show
) {
    if (!output || output_size == 0) {
        return false;
    }

    output[0] = '\0';

    if (!identity_ready() ||
        bytes_to_show == 0 ||
        bytes_to_show > SHA256_SIZE ||
        output_size < bytes_to_show * 3) {

        return false;
    }

    size_t pos = 0;

    for (size_t i = 0; i < bytes_to_show; ++i) {
        const bool last = (i + 1 == bytes_to_show);

        const int written = std::snprintf(
            output + pos,
            output_size - pos,
            last ? "%02X" : "%02X:",
            static_cast<unsigned int>(
                local_identity.fingerprint[i]
            )
        );

        const int expected = last ? 2 : 3;

        if (written != expected) {
            output[0] = '\0';
            return false;
        }

        pos += static_cast<size_t>(written);
    }

    return true;
}

} // namespace gw
