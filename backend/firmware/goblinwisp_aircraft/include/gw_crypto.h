#pragma once

#include <Arduino.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Entropy / random
// =======================================================

bool crypto_random(
    uint8_t *output,
    size_t length
);


// =======================================================
// SHA-256
// =======================================================

bool crypto_sha256(
    const uint8_t *data,
    size_t data_length,
    uint8_t output[SHA256_SIZE]
);


// =======================================================
// HMAC-SHA256
// =======================================================

bool crypto_hmac_sha256(
    const uint8_t *key,
    size_t key_length,

    const uint8_t *data,
    size_t data_length,

    uint8_t output[SHA256_SIZE]
);


// =======================================================
// HKDF-SHA256
// =======================================================

bool crypto_hkdf_sha256(
    const uint8_t *salt,
    size_t salt_length,

    const uint8_t *ikm,
    size_t ikm_length,

    const uint8_t *info,
    size_t info_length,

    uint8_t *output,
    size_t output_length
);


// =======================================================
// P-256 identity / ECDH
// =======================================================

bool crypto_p256_generate_keypair(
    uint8_t private_key[P256_PRIVATE_SIZE],
    uint8_t public_key[P256_PUBLIC_SIZE]
);


bool crypto_p256_public_from_private(
    const uint8_t private_key[P256_PRIVATE_SIZE],
    uint8_t public_key[P256_PUBLIC_SIZE]
);


bool crypto_p256_validate_public(
    const uint8_t public_key[P256_PUBLIC_SIZE]
);


bool crypto_p256_ecdh(
    const uint8_t private_key[P256_PRIVATE_SIZE],

    const uint8_t peer_public[P256_PUBLIC_SIZE],

    uint8_t shared_secret[SHA256_SIZE]
);


// =======================================================
// ECDSA-P256
// =======================================================

bool crypto_p256_sign_digest(
    const uint8_t private_key[P256_PRIVATE_SIZE],

    const uint8_t digest[SHA256_SIZE],

    uint8_t signature[P256_SIGNATURE_SIZE]
);


bool crypto_p256_verify_digest(
    const uint8_t public_key[P256_PUBLIC_SIZE],

    const uint8_t digest[SHA256_SIZE],

    const uint8_t signature[P256_SIGNATURE_SIZE]
);


// =======================================================
// AES-256-GCM
// =======================================================

bool crypto_aes256_gcm_encrypt(
    const uint8_t key[AES256_KEY_SIZE],

    const uint8_t nonce[GCM_NONCE_SIZE],

    const uint8_t *aad,
    size_t aad_length,

    const uint8_t *plaintext,
    size_t plaintext_length,

    uint8_t *ciphertext,

    uint8_t tag[GCM_TAG_SIZE]
);


bool crypto_aes256_gcm_decrypt(
    const uint8_t key[AES256_KEY_SIZE],

    const uint8_t nonce[GCM_NONCE_SIZE],

    const uint8_t *aad,
    size_t aad_length,

    const uint8_t *ciphertext,
    size_t ciphertext_length,

    const uint8_t tag[GCM_TAG_SIZE],

    uint8_t *plaintext
);


// =======================================================
// Deterministic directional nonce
// =======================================================

void crypto_build_nonce(
    const uint8_t nonce_prefix[NONCE_PREFIX_SIZE],

    uint64_t counter,

    uint8_t nonce[GCM_NONCE_SIZE]
);


// =======================================================
// Constant-time comparison
// =======================================================

bool crypto_constant_time_equal(
    const uint8_t *a,
    const uint8_t *b,
    size_t length
);

} // namespace gw