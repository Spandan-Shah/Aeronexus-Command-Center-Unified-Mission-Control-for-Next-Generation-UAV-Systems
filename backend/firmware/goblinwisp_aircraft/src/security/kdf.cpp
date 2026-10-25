#include "gw_kdf.h"

#include "gw_crypto.h"
#include "gw_replay.h"

#include <cstring>

namespace gw
{

// =======================================================
// KDF expansion labels
//
// Each security purpose receives a different HKDF label.
// This prevents key reuse between directions/functions.
// =======================================================

static constexpr const char *LABEL_A_TO_B_KEY =
    "GWSSIP/A2B/KEY";

static constexpr const char *LABEL_B_TO_A_KEY =
    "GWSSIP/B2A/KEY";

static constexpr const char *LABEL_A_TO_B_NONCE =
    "GWSSIP/A2B/NONCE";

static constexpr const char *LABEL_B_TO_A_NONCE =
    "GWSSIP/B2A/NONCE";

static constexpr const char *LABEL_CONTROL =
    "GWSSIP/CONTROL";

static constexpr const char *LABEL_CONFIRM =
    "GWSSIP/CONFIRM";

static constexpr const char *LABEL_SESSION_ID =
    "GWSSIP/SESSION-ID";


// =======================================================
// Big-endian helper
// =======================================================

static void write_u16_be(
    uint8_t output[2],
    uint16_t value
)
{
    output[0] =
        static_cast<uint8_t>(
            value >> 8
        );

    output[1] =
        static_cast<uint8_t>(
            value
        );
}


// =======================================================
// Big-endian helper
// =======================================================

static void write_u32_be(
    uint8_t output[4],
    uint32_t value
)
{
    output[0] =
        static_cast<uint8_t>(
            value >> 24
        );

    output[1] =
        static_cast<uint8_t>(
            value >> 16
        );

    output[2] =
        static_cast<uint8_t>(
            value >> 8
        );

    output[3] =
        static_cast<uint8_t>(
            value
        );
}


// =======================================================
// Read uint64_t from big-endian bytes
// =======================================================

static uint64_t read_u64_be(
    const uint8_t input[8]
)
{
    uint64_t value = 0;

    for (
        size_t index = 0;
        index < 8;
        index++
    )
    {
        value =
            (
                value << 8
            ) |
            static_cast<uint64_t>(
                input[index]
            );
    }

    return value;
}


// =======================================================
// Build context-bound HKDF info
//
// HKDF information binds:
// - purpose label
// - protocol version
// - negotiated security suite
// - key epoch
// - handshake transcript
//
// Therefore changing any of these values produces
// completely different derived key material.
// =======================================================

static bool build_info(
    const char *label,

    const uint8_t transcript_hash[
        SHA256_SIZE
    ],

    SecuritySuite suite,

    uint32_t key_epoch,

    uint8_t *output,

    size_t output_capacity,

    size_t &output_length
)
{
    output_length = 0;


    if (
        label == nullptr ||
        transcript_hash == nullptr ||
        output == nullptr
    )
    {
        return false;
    }


    const size_t label_length =
        strlen(
            label
        );


    const size_t required =
        label_length +
        2 +                 // protocol version
        2 +                 // security suite
        4 +                 // key epoch
        SHA256_SIZE;        // transcript hash


    if (
        required >
        output_capacity
    )
    {
        return false;
    }


    // ---------------------------------------------------
    // Purpose label
    // ---------------------------------------------------

    memcpy(
        output + output_length,
        label,
        label_length
    );

    output_length +=
        label_length;


    // ---------------------------------------------------
    // Protocol version
    // ---------------------------------------------------

    output[
        output_length++
    ] = PROTOCOL_MAJOR;


    output[
        output_length++
    ] = PROTOCOL_MINOR;


    // ---------------------------------------------------
    // Security suite
    // ---------------------------------------------------

    uint8_t suite_bytes[2] = {0};


    write_u16_be(
        suite_bytes,

        static_cast<uint16_t>(
            suite
        )
    );


    memcpy(
        output + output_length,
        suite_bytes,
        sizeof(suite_bytes)
    );


    output_length +=
        sizeof(suite_bytes);


    // ---------------------------------------------------
    // Key epoch
    // ---------------------------------------------------

    uint8_t epoch_bytes[4] = {0};


    write_u32_be(
        epoch_bytes,
        key_epoch
    );


    memcpy(
        output + output_length,
        epoch_bytes,
        sizeof(epoch_bytes)
    );


    output_length +=
        sizeof(epoch_bytes);


    // ---------------------------------------------------
    // Handshake transcript hash
    // ---------------------------------------------------

    memcpy(
        output + output_length,
        transcript_hash,
        SHA256_SIZE
    );


    output_length +=
        SHA256_SIZE;


    // ---------------------------------------------------
    // Remove temporary stack copies
    // ---------------------------------------------------

    secure_zero(
        suite_bytes,
        sizeof(suite_bytes)
    );


    secure_zero(
        epoch_bytes,
        sizeof(epoch_bytes)
    );


    return true;
}


// =======================================================
// Expand one context-bound output
//
// HKDF:
//     salt = transcript hash
//     IKM  = fresh shared secret
//     info = context-specific information
// =======================================================

static bool derive_output(
    const uint8_t shared_secret[
        SHA256_SIZE
    ],

    const uint8_t transcript_hash[
        SHA256_SIZE
    ],

    SecuritySuite suite,

    uint32_t key_epoch,

    const char *label,

    uint8_t *output,

    size_t output_length
)
{
    if (
        shared_secret == nullptr ||
        transcript_hash == nullptr ||
        label == nullptr ||
        output == nullptr ||
        output_length == 0
    )
    {
        return false;
    }


    uint8_t info[128] = {0};

    size_t info_length = 0;


    if (
        !build_info(
            label,
            transcript_hash,
            suite,
            key_epoch,

            info,
            sizeof(info),

            info_length
        )
    )
    {
        secure_zero(
            info,
            sizeof(info)
        );

        return false;
    }


    const bool result =
        crypto_hkdf_sha256(

            // -------------------------------------------
            // Transcript-bound salt
            // -------------------------------------------

            transcript_hash,
            SHA256_SIZE,


            // -------------------------------------------
            // Fresh ECDH / future hybrid shared secret
            // -------------------------------------------

            shared_secret,
            SHA256_SIZE,


            // -------------------------------------------
            // Context separation information
            // -------------------------------------------

            info,
            info_length,


            // -------------------------------------------
            // Derived output
            // -------------------------------------------

            output,
            output_length
        );


    secure_zero(
        info,
        sizeof(info)
    );


    return result;
}


// =======================================================
// Initialize one directional context
// =======================================================

static void initialize_direction(
    DirectionalContext &context,

    Direction direction,

    uint32_t key_epoch
)
{
    // ---------------------------------------------------
    // Counter starts at zero.
    //
    // context_reserve_tx() increments before use,
    // therefore first packet counter becomes 1.
    // ---------------------------------------------------

    context.tx_counter = 0;


    // ---------------------------------------------------
    // Key epoch
    // ---------------------------------------------------

    context.key_epoch =
        key_epoch;


    // ---------------------------------------------------
    // Direction binding
    // ---------------------------------------------------

    context.direction =
        direction;


    // ---------------------------------------------------
    // Replay state starts empty
    // ---------------------------------------------------

    replay_reset(
        context.replay
    );


    // ---------------------------------------------------
    // Context becomes active only after complete
    // successful KDF derivation.
    // ---------------------------------------------------

    context.active =
        true;
}


// =======================================================
// Main SSIP session derivation
// =======================================================

bool kdf_derive_session(
    const uint8_t shared_secret[
        SHA256_SIZE
    ],

    const uint8_t transcript_hash[
        SHA256_SIZE
    ],

    SecuritySuite suite,

    uint32_t key_epoch,

    SessionSecrets &output
)
{
    // ===================================================
    // IMPORTANT
    //
    // All local variables which could otherwise be
    // crossed by "goto failure" are declared here,
    // before the first possible goto.
    // ===================================================

    uint8_t session_id_bytes[8] = {0};


    // ---------------------------------------------------
    // Validate arguments
    // ---------------------------------------------------

    if (
        shared_secret == nullptr ||
        transcript_hash == nullptr ||
        suite == SecuritySuite::NONE
    )
    {
        return false;
    }


    // ---------------------------------------------------
    // Start with completely clean output.
    // ---------------------------------------------------

    secure_zero(
        &output,
        sizeof(output)
    );


    output.suite =
        suite;


    output.key_epoch =
        key_epoch;


    // ===================================================
    // A -> B traffic encryption key
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_A_TO_B_KEY,

            output.a_to_b.traffic_key,
            AES256_KEY_SIZE
        )
    )
    {
        goto failure;
    }


    // ===================================================
    // B -> A traffic encryption key
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_B_TO_A_KEY,

            output.b_to_a.traffic_key,
            AES256_KEY_SIZE
        )
    )
    {
        goto failure;
    }


    // ===================================================
    // A -> B deterministic nonce prefix
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_A_TO_B_NONCE,

            output.a_to_b.nonce_prefix,
            NONCE_PREFIX_SIZE
        )
    )
    {
        goto failure;
    }


    // ===================================================
    // B -> A deterministic nonce prefix
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_B_TO_A_NONCE,

            output.b_to_a.nonce_prefix,
            NONCE_PREFIX_SIZE
        )
    )
    {
        goto failure;
    }


    // ===================================================
    // Authenticated control-channel key
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_CONTROL,

            output.control_key,
            AES256_KEY_SIZE
        )
    )
    {
        goto failure;
    }


    // ===================================================
    // Handshake / key confirmation key
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_CONFIRM,

            output.confirmation_key,
            AES256_KEY_SIZE
        )
    )
    {
        goto failure;
    }


    // ===================================================
    // Session identifier
    //
    // Derived from the same shared secret but under its
    // own independent HKDF label.
    // ===================================================

    if (
        !derive_output(
            shared_secret,
            transcript_hash,

            suite,
            key_epoch,

            LABEL_SESSION_ID,

            session_id_bytes,
            sizeof(session_id_bytes)
        )
    )
    {
        goto failure;
    }


    output.session_id =
        read_u64_be(
            session_id_bytes
        );


    // Session ID derivation bytes no longer required.

    secure_zero(
        session_id_bytes,
        sizeof(session_id_bytes)
    );


    // ---------------------------------------------------
    // Session identifier zero is reserved.
    // ---------------------------------------------------

    if (
        output.session_id == 0
    )
    {
        goto failure;
    }


    // ===================================================
    // Initialize directional contexts
    // ===================================================

    initialize_direction(
        output.a_to_b,
        Direction::A_TO_B,
        key_epoch
    );


    initialize_direction(
        output.b_to_a,
        Direction::B_TO_A,
        key_epoch
    );


    // ===================================================
    // Entire session derivation succeeded.
    // ===================================================

    output.active =
        true;


    return true;


// =======================================================
// Common failure cleanup
// =======================================================

failure:

    // Remove temporary material.

    secure_zero(
        session_id_bytes,
        sizeof(session_id_bytes)
    );


    // Remove all partially derived keys/nonces/session ID.

    secure_zero(
        &output,
        sizeof(output)
    );


    return false;
}


// =======================================================
// Rekey derivation
//
// Used later by the authenticated rekey state machine.
//
// Rekey output is bound to:
// - fresh shared secret
// - previous transcript
// - previous session ID
// - new key epoch
// - negotiated suite
//
// The resulting material is then fed through the same
// directional KDF process used during initial session
// establishment.
// =======================================================

bool kdf_derive_rekeyed_session(
    const uint8_t fresh_shared_secret[
        SHA256_SIZE
    ],

    const uint8_t previous_transcript_hash[
        SHA256_SIZE
    ],

    uint64_t previous_session_id,

    uint32_t new_key_epoch,

    SecuritySuite suite,

    SessionSecrets &output
)
{
    if (
        fresh_shared_secret == nullptr ||
        previous_transcript_hash == nullptr ||
        previous_session_id == 0 ||
        new_key_epoch == 0 ||
        suite == SecuritySuite::NONE
    )
    {
        return false;
    }


    // ===================================================
    // Rekey context
    //
    // Contains:
    //
    // domain separator
    // previous transcript hash
    // previous session ID
    // new key epoch
    // ===================================================

    static constexpr char REKEY_DOMAIN[] =
        "GWSSIP-REKEY-V1";


    uint8_t context[
        (
            sizeof(REKEY_DOMAIN) - 1
        ) +
        SHA256_SIZE +
        8 +
        4
    ] = {0};


    size_t position = 0;


    // ---------------------------------------------------
    // Domain
    // ---------------------------------------------------

    memcpy(
        context + position,

        REKEY_DOMAIN,

        sizeof(REKEY_DOMAIN) - 1
    );


    position +=
        sizeof(REKEY_DOMAIN) - 1;


    // ---------------------------------------------------
    // Previous transcript
    // ---------------------------------------------------

    memcpy(
        context + position,

        previous_transcript_hash,

        SHA256_SIZE
    );


    position +=
        SHA256_SIZE;


    // ---------------------------------------------------
    // Previous session ID
    //
    // Big-endian canonical encoding.
    // ---------------------------------------------------

    for (
        int index = 7;
        index >= 0;
        index--
    )
    {
        context[
            position++
        ] =
            static_cast<uint8_t>(
                previous_session_id >>
                (
                    index * 8
                )
            );
    }


    // ---------------------------------------------------
    // New key epoch
    // ---------------------------------------------------

    uint8_t epoch_bytes[4] = {0};


    write_u32_be(
        epoch_bytes,
        new_key_epoch
    );


    memcpy(
        context + position,

        epoch_bytes,

        sizeof(epoch_bytes)
    );


    position +=
        sizeof(epoch_bytes);


    secure_zero(
        epoch_bytes,
        sizeof(epoch_bytes)
    );


    // ===================================================
    // Hash the complete rekey context
    // ===================================================

    uint8_t rekey_hash[
        SHA256_SIZE
    ] = {0};


    const bool hash_ok =
        crypto_sha256(
            context,
            position,
            rekey_hash
        );


    secure_zero(
        context,
        sizeof(context)
    );


    if (!hash_ok)
    {
        secure_zero(
            rekey_hash,
            sizeof(rekey_hash)
        );

        return false;
    }


    // ===================================================
    // Derive completely fresh directional session state
    // ===================================================

    const bool result =
        kdf_derive_session(
            fresh_shared_secret,

            rekey_hash,

            suite,

            new_key_epoch,

            output
        );


    // Rekey hash is no longer needed.

    secure_zero(
        rekey_hash,
        sizeof(rekey_hash)
    );


    return result;
}

} // namespace gw