#pragma once

#include <Arduino.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Derive complete SSIP directional session material
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
);


// =======================================================
// Derive fresh rekeyed session material
//
// Used later by gw_rekey.cpp.
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
);

} // namespace gw