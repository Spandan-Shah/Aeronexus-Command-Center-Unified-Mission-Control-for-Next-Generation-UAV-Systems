#include "gw_transcript.h"

#include "gw_crypto.h"

#include <cstring>

namespace gw
{

// =======================================================
// Transcript domain separation
// =======================================================

static constexpr uint8_t TRANSCRIPT_DOMAIN[] =
{
    'G', 'W', 'S', 'S', 'I', 'P',
    '-',
    'H', 'A', 'N', 'D', 'S', 'H', 'A', 'K', 'E',
    '-',
    'V', '1', '.', '1', '-', '3', 'D', 'H'
};


// =======================================================
// Serialization helpers
// =======================================================

static bool append_bytes(
    uint8_t *buffer,
    size_t buffer_size,
    size_t &position,

    const uint8_t *data,
    size_t length
)
{
    if (
        buffer == nullptr ||
        data == nullptr
    )
    {
        return false;
    }

    if (
        position + length >
        buffer_size
    )
    {
        return false;
    }

    memcpy(
        buffer + position,
        data,
        length
    );

    position += length;

    return true;
}


static bool append_u8(
    uint8_t *buffer,
    size_t buffer_size,
    size_t &position,
    uint8_t value
)
{
    return append_bytes(
        buffer,
        buffer_size,
        position,
        &value,
        sizeof(value)
    );
}


static bool append_u16_be(
    uint8_t *buffer,
    size_t buffer_size,
    size_t &position,
    uint16_t value
)
{
    uint8_t encoded[2];

    encoded[0] =
        static_cast<uint8_t>(
            value >> 8
        );

    encoded[1] =
        static_cast<uint8_t>(
            value
        );

    return append_bytes(
        buffer,
        buffer_size,
        position,
        encoded,
        sizeof(encoded)
    );
}


static bool append_u32_be(
    uint8_t *buffer,
    size_t buffer_size,
    size_t &position,
    uint32_t value
)
{
    uint8_t encoded[4];

    encoded[0] =
        static_cast<uint8_t>(
            value >> 24
        );

    encoded[1] =
        static_cast<uint8_t>(
            value >> 16
        );

    encoded[2] =
        static_cast<uint8_t>(
            value >> 8
        );

    encoded[3] =
        static_cast<uint8_t>(
            value
        );

    return append_bytes(
        buffer,
        buffer_size,
        position,
        encoded,
        sizeof(encoded)
    );
}


// =======================================================
// Build transcript
// =======================================================

bool transcript_build_hash(
    const HandshakeTranscriptInput &input,

    uint8_t output[
        SHA256_SIZE
    ]
)
{
    if (output == nullptr)
    {
        return false;
    }

    // Maximum canonical serialized transcript is well
    // below this size.

    uint8_t transcript[384] = {0};

    size_t position = 0;


    // ---------------------------------------------------
    // Domain
    // ---------------------------------------------------

    if (
        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            TRANSCRIPT_DOMAIN,
            sizeof(TRANSCRIPT_DOMAIN)
        )
    )
    {
        return false;
    }


    // ---------------------------------------------------
    // Protocol version
    // ---------------------------------------------------

    if (
        !append_u8(
            transcript,
            sizeof(transcript),
            position,
            PROTOCOL_MAJOR
        ) ||

        !append_u8(
            transcript,
            sizeof(transcript),
            position,
            PROTOCOL_MINOR
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Negotiated security suite
    // ---------------------------------------------------

    if (
        !append_u16_be(
            transcript,
            sizeof(transcript),
            position,

            static_cast<uint16_t>(
                input.suite
            )
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Roles / logical identities
    // ---------------------------------------------------

    if (
        !append_u8(
            transcript,
            sizeof(transcript),
            position,
            input.initiator_id
        ) ||

        !append_u8(
            transcript,
            sizeof(transcript),
            position,
            input.responder_id
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Negotiated capability flags
    // ---------------------------------------------------

    if (
        !append_u32_be(
            transcript,
            sizeof(transcript),
            position,
            input.capability_flags
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Persistent identity fingerprints
    // ---------------------------------------------------

    if (
        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            input.initiator_identity_fingerprint,
            SHA256_SIZE
        ) ||

        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            input.responder_identity_fingerprint,
            SHA256_SIZE
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Fresh session ephemeral public keys
    // ---------------------------------------------------

    if (
        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            input.initiator_ephemeral_public,
            P256_PUBLIC_SIZE
        ) ||

        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            input.responder_ephemeral_public,
            P256_PUBLIC_SIZE
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Fresh handshake randomness
    // ---------------------------------------------------

    if (
        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            input.initiator_random,
            HANDSHAKE_RANDOM_SIZE
        ) ||

        !append_bytes(
            transcript,
            sizeof(transcript),
            position,

            input.responder_random,
            HANDSHAKE_RANDOM_SIZE
        )
    )
    {
        secure_zero(
            transcript,
            sizeof(transcript)
        );

        return false;
    }


    // ---------------------------------------------------
    // Hash final canonical transcript
    // ---------------------------------------------------

    const bool success =
        crypto_sha256(
            transcript,
            position,
            output
        );


    secure_zero(
        transcript,
        sizeof(transcript)
    );


    return success;
}

} // namespace gw