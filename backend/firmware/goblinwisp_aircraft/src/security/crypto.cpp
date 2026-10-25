#include "gw_crypto.h"

#include <cstring>

#include <esp_system.h>

#include <mbedtls/ecp.h>
#include <mbedtls/ecdsa.h>
#include <mbedtls/ecdh.h>
#include <mbedtls/gcm.h>
#include <mbedtls/md.h>
#include <mbedtls/sha256.h>

namespace gw
{

// =======================================================
// Secure zero
// =======================================================

void secure_zero(
    void *memory,
    size_t length
)
{
    if (
        memory == nullptr ||
        length == 0
    )
    {
        return;
    }

    volatile uint8_t *ptr =
        static_cast<volatile uint8_t *>(memory);

    while (length--)
    {
        *ptr++ = 0;
    }
}


// =======================================================
// ESP32 RNG callback for mbedTLS
// =======================================================

static int esp32_rng(
    void *,
    unsigned char *output,
    size_t length
)
{
    if (
        output == nullptr &&
        length > 0
    )
    {
        return -1;
    }

    esp_fill_random(
        output,
        length
    );

    return 0;
}


// =======================================================
// Random
// =======================================================

bool crypto_random(
    uint8_t *output,
    size_t length
)
{
    if (
        output == nullptr &&
        length > 0
    )
    {
        return false;
    }

    esp_fill_random(
        output,
        length
    );

    return true;
}


// =======================================================
// SHA-256
// =======================================================

bool crypto_sha256(
    const uint8_t *data,
    size_t data_length,
    uint8_t output[SHA256_SIZE]
)
{
    if (output == nullptr)
    {
        return false;
    }

    if (
        data == nullptr &&
        data_length > 0
    )
    {
        return false;
    }

    const mbedtls_md_info_t *info =
        mbedtls_md_info_from_type(
            MBEDTLS_MD_SHA256
        );

    if (info == nullptr)
    {
        return false;
    }

    const int result =
        mbedtls_md(
            info,
            data,
            data_length,
            output
        );

    return result == 0;
}


// =======================================================
// HMAC SHA-256
// =======================================================

bool crypto_hmac_sha256(
    const uint8_t *key,
    size_t key_length,

    const uint8_t *data,
    size_t data_length,

    uint8_t output[SHA256_SIZE]
)
{
    if (
        key == nullptr ||
        key_length == 0 ||
        output == nullptr
    )
    {
        return false;
    }

    if (
        data == nullptr &&
        data_length > 0
    )
    {
        return false;
    }

    const mbedtls_md_info_t *info =
        mbedtls_md_info_from_type(
            MBEDTLS_MD_SHA256
        );

    if (info == nullptr)
    {
        return false;
    }

    const int result =
        mbedtls_md_hmac(
            info,
            key,
            key_length,
            data,
            data_length,
            output
        );

    return result == 0;
}


// =======================================================
// HKDF-SHA256
//
// Implemented directly using RFC5869 HMAC construction
// so this does not depend on mbedtls_hkdf availability.
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
)
{
    if (
        ikm == nullptr ||
        ikm_length == 0 ||
        output == nullptr ||
        output_length == 0
    )
    {
        return false;
    }

    if (
        info == nullptr &&
        info_length > 0
    )
    {
        return false;
    }

    // RFC5869 maximum:
    // 255 * HashLen
    if (
        output_length >
        (255U * SHA256_SIZE)
    )
    {
        return false;
    }

    uint8_t zero_salt[SHA256_SIZE] = {0};

    const uint8_t *effective_salt =
        salt;

    size_t effective_salt_length =
        salt_length;

    if (
        salt == nullptr ||
        salt_length == 0
    )
    {
        effective_salt =
            zero_salt;

        effective_salt_length =
            sizeof(zero_salt);
    }

    uint8_t prk[SHA256_SIZE] = {0};

    if (
        !crypto_hmac_sha256(
            effective_salt,
            effective_salt_length,
            ikm,
            ikm_length,
            prk
        )
    )
    {
        secure_zero(
            prk,
            sizeof(prk)
        );

        return false;
    }

    const mbedtls_md_info_t *md_info =
        mbedtls_md_info_from_type(
            MBEDTLS_MD_SHA256
        );

    if (md_info == nullptr)
    {
        secure_zero(
            prk,
            sizeof(prk)
        );

        return false;
    }

    uint8_t previous[SHA256_SIZE] = {0};

    size_t previous_length = 0;

    size_t generated = 0;

    uint8_t block_index = 1;

    while (
        generated <
        output_length
    )
    {
        mbedtls_md_context_t context;

        mbedtls_md_init(
            &context
        );

        if (
            mbedtls_md_setup(
                &context,
                md_info,
                1
            ) != 0
        )
        {
            mbedtls_md_free(
                &context
            );

            secure_zero(
                prk,
                sizeof(prk)
            );

            secure_zero(
                previous,
                sizeof(previous)
            );

            return false;
        }

        bool success = true;

        if (
            mbedtls_md_hmac_starts(
                &context,
                prk,
                sizeof(prk)
            ) != 0
        )
        {
            success = false;
        }

        if (
            success &&
            previous_length > 0
        )
        {
            if (
                mbedtls_md_hmac_update(
                    &context,
                    previous,
                    previous_length
                ) != 0
            )
            {
                success = false;
            }
        }

        if (
            success &&
            info_length > 0
        )
        {
            if (
                mbedtls_md_hmac_update(
                    &context,
                    info,
                    info_length
                ) != 0
            )
            {
                success = false;
            }
        }

        if (success)
        {
            if (
                mbedtls_md_hmac_update(
                    &context,
                    &block_index,
                    1
                ) != 0
            )
            {
                success = false;
            }
        }

        if (success)
        {
            if (
                mbedtls_md_hmac_finish(
                    &context,
                    previous
                ) != 0
            )
            {
                success = false;
            }
        }

        mbedtls_md_free(
            &context
        );

        if (!success)
        {
            secure_zero(
                prk,
                sizeof(prk)
            );

            secure_zero(
                previous,
                sizeof(previous)
            );

            return false;
        }

        previous_length =
            SHA256_SIZE;

        size_t copy_length =
            output_length -
            generated;

        if (
            copy_length >
            SHA256_SIZE
        )
        {
            copy_length =
                SHA256_SIZE;
        }

        memcpy(
            output + generated,
            previous,
            copy_length
        );

        generated +=
            copy_length;

        block_index++;
    }

    secure_zero(
        prk,
        sizeof(prk)
    );

    secure_zero(
        previous,
        sizeof(previous)
    );

    secure_zero(
        zero_salt,
        sizeof(zero_salt)
    );

    return true;
}


// =======================================================
// Internal P-256 key helpers
// =======================================================

static bool load_p256_private(
    const uint8_t private_key[P256_PRIVATE_SIZE],
    mbedtls_mpi &private_mpi
)
{
    return
        mbedtls_mpi_read_binary(
            &private_mpi,
            private_key,
            P256_PRIVATE_SIZE
        ) == 0;
}


static bool load_p256_public(
    mbedtls_ecp_group &group,
    const uint8_t public_key[P256_PUBLIC_SIZE],
    mbedtls_ecp_point &point
)
{
    if (
        mbedtls_ecp_point_read_binary(
            &group,
            &point,
            public_key,
            P256_PUBLIC_SIZE
        ) != 0
    )
    {
        return false;
    }

    return
        mbedtls_ecp_check_pubkey(
            &group,
            &point
        ) == 0;
}


// =======================================================
// Generate P-256 keypair
// =======================================================

bool crypto_p256_generate_keypair(
    uint8_t private_key[P256_PRIVATE_SIZE],
    uint8_t public_key[P256_PUBLIC_SIZE]
)
{
    if (
        private_key == nullptr ||
        public_key == nullptr
    )
    {
        return false;
    }

    bool success = false;

    mbedtls_ecp_group group;
    mbedtls_mpi d;
    mbedtls_ecp_point q;

    mbedtls_ecp_group_init(
        &group
    );

    mbedtls_mpi_init(
        &d
    );

    mbedtls_ecp_point_init(
        &q
    );

    do
    {
        if (
            mbedtls_ecp_group_load(
                &group,
                MBEDTLS_ECP_DP_SECP256R1
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_ecp_gen_keypair(
                &group,
                &d,
                &q,
                esp32_rng,
                nullptr
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_mpi_write_binary(
                &d,
                private_key,
                P256_PRIVATE_SIZE
            ) != 0
        )
        {
            break;
        }

        size_t output_length = 0;

        if (
            mbedtls_ecp_point_write_binary(
                &group,
                &q,
                MBEDTLS_ECP_PF_UNCOMPRESSED,
                &output_length,
                public_key,
                P256_PUBLIC_SIZE
            ) != 0
        )
        {
            break;
        }

        if (
            output_length !=
            P256_PUBLIC_SIZE
        )
        {
            break;
        }

        success = true;

    } while (false);

    if (!success)
    {
        secure_zero(
            private_key,
            P256_PRIVATE_SIZE
        );

        secure_zero(
            public_key,
            P256_PUBLIC_SIZE
        );
    }

    mbedtls_ecp_point_free(
        &q
    );

    mbedtls_mpi_free(
        &d
    );

    mbedtls_ecp_group_free(
        &group
    );

    return success;
}


// =======================================================
// Public key from private
// =======================================================

bool crypto_p256_public_from_private(
    const uint8_t private_key[P256_PRIVATE_SIZE],
    uint8_t public_key[P256_PUBLIC_SIZE]
)
{
    if (
        private_key == nullptr ||
        public_key == nullptr
    )
    {
        return false;
    }

    bool success = false;

    mbedtls_ecp_group group;
    mbedtls_mpi d;
    mbedtls_ecp_point q;

    mbedtls_ecp_group_init(
        &group
    );

    mbedtls_mpi_init(
        &d
    );

    mbedtls_ecp_point_init(
        &q
    );

    do
    {
        if (
            mbedtls_ecp_group_load(
                &group,
                MBEDTLS_ECP_DP_SECP256R1
            ) != 0
        )
        {
            break;
        }

        if (
            !load_p256_private(
                private_key,
                d
            )
        )
        {
            break;
        }

        if (
            mbedtls_ecp_check_privkey(
                &group,
                &d
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_ecp_mul(
                &group,
                &q,
                &d,
                &group.G,
                esp32_rng,
                nullptr
            ) != 0
        )
        {
            break;
        }

        size_t output_length = 0;

        if (
            mbedtls_ecp_point_write_binary(
                &group,
                &q,
                MBEDTLS_ECP_PF_UNCOMPRESSED,
                &output_length,
                public_key,
                P256_PUBLIC_SIZE
            ) != 0
        )
        {
            break;
        }

        success =
            output_length ==
            P256_PUBLIC_SIZE;

    } while (false);

    mbedtls_ecp_point_free(
        &q
    );

    mbedtls_mpi_free(
        &d
    );

    mbedtls_ecp_group_free(
        &group
    );

    return success;
}


// =======================================================
// Validate public key
// =======================================================

bool crypto_p256_validate_public(
    const uint8_t public_key[P256_PUBLIC_SIZE]
)
{
    if (public_key == nullptr)
    {
        return false;
    }

    bool valid = false;

    mbedtls_ecp_group group;
    mbedtls_ecp_point point;

    mbedtls_ecp_group_init(
        &group
    );

    mbedtls_ecp_point_init(
        &point
    );

    if (
        mbedtls_ecp_group_load(
            &group,
            MBEDTLS_ECP_DP_SECP256R1
        ) == 0
    )
    {
        valid =
            load_p256_public(
                group,
                public_key,
                point
            );
    }

    mbedtls_ecp_point_free(
        &point
    );

    mbedtls_ecp_group_free(
        &group
    );

    return valid;
}


// =======================================================
// P-256 ECDH
// =======================================================

bool crypto_p256_ecdh(
    const uint8_t private_key[P256_PRIVATE_SIZE],

    const uint8_t peer_public[P256_PUBLIC_SIZE],

    uint8_t shared_secret[SHA256_SIZE]
)
{
    if (
        private_key == nullptr ||
        peer_public == nullptr ||
        shared_secret == nullptr
    )
    {
        return false;
    }

    bool success = false;

    mbedtls_ecp_group group;
    mbedtls_mpi d;
    mbedtls_mpi z;
    mbedtls_ecp_point peer;

    mbedtls_ecp_group_init(
        &group
    );

    mbedtls_mpi_init(
        &d
    );

    mbedtls_mpi_init(
        &z
    );

    mbedtls_ecp_point_init(
        &peer
    );

    do
    {
        if (
            mbedtls_ecp_group_load(
                &group,
                MBEDTLS_ECP_DP_SECP256R1
            ) != 0
        )
        {
            break;
        }

        if (
            !load_p256_private(
                private_key,
                d
            )
        )
        {
            break;
        }

        if (
            mbedtls_ecp_check_privkey(
                &group,
                &d
            ) != 0
        )
        {
            break;
        }

        if (
            !load_p256_public(
                group,
                peer_public,
                peer
            )
        )
        {
            break;
        }

        if (
            mbedtls_ecdh_compute_shared(
                &group,
                &z,
                &peer,
                &d,
                esp32_rng,
                nullptr
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_mpi_write_binary(
                &z,
                shared_secret,
                SHA256_SIZE
            ) != 0
        )
        {
            break;
        }

        success = true;

    } while (false);

    if (!success)
    {
        secure_zero(
            shared_secret,
            SHA256_SIZE
        );
    }

    mbedtls_ecp_point_free(
        &peer
    );

    mbedtls_mpi_free(
        &z
    );

    mbedtls_mpi_free(
        &d
    );

    mbedtls_ecp_group_free(
        &group
    );

    return success;
}


// =======================================================
// ECDSA sign
// =======================================================

bool crypto_p256_sign_digest(
    const uint8_t private_key[P256_PRIVATE_SIZE],

    const uint8_t digest[SHA256_SIZE],

    uint8_t signature[P256_SIGNATURE_SIZE]
)
{
    if (
        private_key == nullptr ||
        digest == nullptr ||
        signature == nullptr
    )
    {
        return false;
    }

    bool success = false;

    mbedtls_ecp_group group;
    mbedtls_mpi d;
    mbedtls_mpi r;
    mbedtls_mpi s;

    mbedtls_ecp_group_init(
        &group
    );

    mbedtls_mpi_init(
        &d
    );

    mbedtls_mpi_init(
        &r
    );

    mbedtls_mpi_init(
        &s
    );

    do
    {
        if (
            mbedtls_ecp_group_load(
                &group,
                MBEDTLS_ECP_DP_SECP256R1
            ) != 0
        )
        {
            break;
        }

        if (
            !load_p256_private(
                private_key,
                d
            )
        )
        {
            break;
        }

        if (
            mbedtls_ecdsa_sign(
                &group,
                &r,
                &s,
                &d,
                digest,
                SHA256_SIZE,
                esp32_rng,
                nullptr
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_mpi_write_binary(
                &r,
                signature,
                32
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_mpi_write_binary(
                &s,
                signature + 32,
                32
            ) != 0
        )
        {
            break;
        }

        success = true;

    } while (false);

    if (!success)
    {
        secure_zero(
            signature,
            P256_SIGNATURE_SIZE
        );
    }

    mbedtls_mpi_free(
        &s
    );

    mbedtls_mpi_free(
        &r
    );

    mbedtls_mpi_free(
        &d
    );

    mbedtls_ecp_group_free(
        &group
    );

    return success;
}


// =======================================================
// ECDSA verify
// =======================================================

bool crypto_p256_verify_digest(
    const uint8_t public_key[P256_PUBLIC_SIZE],

    const uint8_t digest[SHA256_SIZE],

    const uint8_t signature[P256_SIGNATURE_SIZE]
)
{
    if (
        public_key == nullptr ||
        digest == nullptr ||
        signature == nullptr
    )
    {
        return false;
    }

    bool valid = false;

    mbedtls_ecp_group group;
    mbedtls_ecp_point q;
    mbedtls_mpi r;
    mbedtls_mpi s;

    mbedtls_ecp_group_init(
        &group
    );

    mbedtls_ecp_point_init(
        &q
    );

    mbedtls_mpi_init(
        &r
    );

    mbedtls_mpi_init(
        &s
    );

    do
    {
        if (
            mbedtls_ecp_group_load(
                &group,
                MBEDTLS_ECP_DP_SECP256R1
            ) != 0
        )
        {
            break;
        }

        if (
            !load_p256_public(
                group,
                public_key,
                q
            )
        )
        {
            break;
        }

        if (
            mbedtls_mpi_read_binary(
                &r,
                signature,
                32
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_mpi_read_binary(
                &s,
                signature + 32,
                32
            ) != 0
        )
        {
            break;
        }

        valid =
            mbedtls_ecdsa_verify(
                &group,
                digest,
                SHA256_SIZE,
                &q,
                &r,
                &s
            ) == 0;

    } while (false);

    mbedtls_mpi_free(
        &s
    );

    mbedtls_mpi_free(
        &r
    );

    mbedtls_ecp_point_free(
        &q
    );

    mbedtls_ecp_group_free(
        &group
    );

    return valid;
}


// =======================================================
// AES-256-GCM encrypt
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
)
{
    if (
        key == nullptr ||
        nonce == nullptr ||
        ciphertext == nullptr ||
        tag == nullptr
    )
    {
        return false;
    }

    if (
        plaintext == nullptr &&
        plaintext_length > 0
    )
    {
        return false;
    }

    mbedtls_gcm_context context;

    mbedtls_gcm_init(
        &context
    );

    bool success = false;

    do
    {
        if (
            mbedtls_gcm_setkey(
                &context,
                MBEDTLS_CIPHER_ID_AES,
                key,
                256
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_gcm_crypt_and_tag(
                &context,
                MBEDTLS_GCM_ENCRYPT,

                plaintext_length,

                nonce,
                GCM_NONCE_SIZE,

                aad,
                aad_length,

                plaintext,
                ciphertext,

                GCM_TAG_SIZE,
                tag
            ) != 0
        )
        {
            break;
        }

        success = true;

    } while (false);

    mbedtls_gcm_free(
        &context
    );

    return success;
}


// =======================================================
// AES-256-GCM decrypt / authenticate
// =======================================================

bool crypto_aes256_gcm_decrypt(
    const uint8_t key[AES256_KEY_SIZE],

    const uint8_t nonce[GCM_NONCE_SIZE],

    const uint8_t *aad,
    size_t aad_length,

    const uint8_t *ciphertext,
    size_t ciphertext_length,

    const uint8_t tag[GCM_TAG_SIZE],

    uint8_t *plaintext
)
{
    if (
        key == nullptr ||
        nonce == nullptr ||
        tag == nullptr ||
        plaintext == nullptr
    )
    {
        return false;
    }

    if (
        ciphertext == nullptr &&
        ciphertext_length > 0
    )
    {
        return false;
    }

    mbedtls_gcm_context context;

    mbedtls_gcm_init(
        &context
    );

    bool success = false;

    do
    {
        if (
            mbedtls_gcm_setkey(
                &context,
                MBEDTLS_CIPHER_ID_AES,
                key,
                256
            ) != 0
        )
        {
            break;
        }

        if (
            mbedtls_gcm_auth_decrypt(
                &context,

                ciphertext_length,

                nonce,
                GCM_NONCE_SIZE,

                aad,
                aad_length,

                tag,
                GCM_TAG_SIZE,

                ciphertext,
                plaintext
            ) != 0
        )
        {
            break;
        }

        success = true;

    } while (false);

    mbedtls_gcm_free(
        &context
    );

    if (!success)
    {
        secure_zero(
            plaintext,
            ciphertext_length
        );
    }

    return success;
}


// =======================================================
// Deterministic nonce
//
// 4-byte directional prefix || 8-byte counter
//
// Counter encoded big-endian.
// =======================================================

void crypto_build_nonce(
    const uint8_t nonce_prefix[NONCE_PREFIX_SIZE],

    uint64_t counter,

    uint8_t nonce[GCM_NONCE_SIZE]
)
{
    memcpy(
        nonce,
        nonce_prefix,
        NONCE_PREFIX_SIZE
    );

    nonce[4] =
        static_cast<uint8_t>(
            counter >> 56
        );

    nonce[5] =
        static_cast<uint8_t>(
            counter >> 48
        );

    nonce[6] =
        static_cast<uint8_t>(
            counter >> 40
        );

    nonce[7] =
        static_cast<uint8_t>(
            counter >> 32
        );

    nonce[8] =
        static_cast<uint8_t>(
            counter >> 24
        );

    nonce[9] =
        static_cast<uint8_t>(
            counter >> 16
        );

    nonce[10] =
        static_cast<uint8_t>(
            counter >> 8
        );

    nonce[11] =
        static_cast<uint8_t>(
            counter
        );
}


// =======================================================
// Constant-time equality
// =======================================================

bool crypto_constant_time_equal(
    const uint8_t *a,
    const uint8_t *b,
    size_t length
)
{
    if (
        a == nullptr ||
        b == nullptr
    )
    {
        return false;
    }

    uint8_t difference = 0;

    for (
        size_t index = 0;
        index < length;
        index++
    )
    {
        difference |=
            static_cast<uint8_t>(
                a[index] ^
                b[index]
            );
    }

    return difference == 0;
}

} // namespace gw