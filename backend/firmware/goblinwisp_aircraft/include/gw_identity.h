#pragma once

#include <Arduino.h>

#include "gw_security_types.h"

namespace gw
{

enum class IdentityState : uint8_t
{
    UNINITIALIZED = 0,

    GENERATED,
    READY,

    STORAGE_ERROR,
    CORRUPT
};


// =======================================================
// Initialize persistent device identity
// =======================================================

bool identity_init();


// =======================================================
// Status
// =======================================================

bool identity_ready();

IdentityState identity_state();

const char *identity_state_name();


// =======================================================
// Public identity information
// =======================================================

bool identity_copy_public_key(
    uint8_t output[P256_PUBLIC_SIZE]
);

bool identity_copy_fingerprint(
    uint8_t output[SHA256_SIZE]
);


// =======================================================
// Sign a SHA-256 digest with the persistent identity
// =======================================================

bool identity_sign_digest(
    const uint8_t digest[SHA256_SIZE],

    uint8_t signature[P256_SIGNATURE_SIZE]
);


// =======================================================
// Static-ephemeral P-256 contribution (Claim 4, protocol 1.1).
//
// This implementation reuses the existing P-256 identity key
// for ECDH to retain the 250-byte ESP-NOW v1 frame size and
// original trust store. This is functional domain separation,
// NOT independent signing/agreement keys. A future production
// protocol should use a separate certified static ECDH identity.
// Never expose or copy the long-term private scalar to callers.
// =======================================================

bool identity_agree_ephemeral(
    const uint8_t peer_ephemeral_public[P256_PUBLIC_SIZE],
    uint8_t output[SHA256_SIZE]
);

// =======================================================
// Human-readable fingerprint
//
// bytes_to_show = 8 gives a short UI fingerprint.
// Use SHA256_SIZE for full fingerprint.
// =======================================================

bool identity_fingerprint_hex(
    char *output,
    size_t output_size,
    size_t bytes_to_show = 8
);

} // namespace gw