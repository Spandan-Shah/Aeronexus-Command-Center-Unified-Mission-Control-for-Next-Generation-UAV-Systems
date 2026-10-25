#pragma once

#include <Arduino.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Handshake constants
// =======================================================

static constexpr size_t HANDSHAKE_RANDOM_SIZE = 32;


// =======================================================
// Canonical handshake transcript input
//
// IMPORTANT:
// We never hash this C++ struct directly.
// transcript.cpp serializes every field canonically.
// =======================================================

struct HandshakeTranscriptInput
{
    uint8_t initiator_id;
    uint8_t responder_id;

    SecuritySuite suite;

    uint32_t capability_flags;

    uint8_t initiator_identity_fingerprint[
        SHA256_SIZE
    ];

    uint8_t responder_identity_fingerprint[
        SHA256_SIZE
    ];

    uint8_t initiator_ephemeral_public[
        P256_PUBLIC_SIZE
    ];

    uint8_t responder_ephemeral_public[
        P256_PUBLIC_SIZE
    ];

    uint8_t initiator_random[
        HANDSHAKE_RANDOM_SIZE
    ];

    uint8_t responder_random[
        HANDSHAKE_RANDOM_SIZE
    ];
};


// =======================================================
// Build SHA-256 canonical handshake transcript
// =======================================================

bool transcript_build_hash(
    const HandshakeTranscriptInput &input,

    uint8_t output[
        SHA256_SIZE
    ]
);

} // namespace gw