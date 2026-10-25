#pragma once

#include <Arduino.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Replay validation result
// =======================================================

enum class ReplayResult : uint8_t
{
    ACCEPT = 0,

    INVALID_COUNTER,

    DUPLICATE,

    TOO_OLD
};


// =======================================================
// Initialize / reset
// =======================================================

void replay_reset(
    ReplayWindow &window
);


// =======================================================
// CHECK ONLY
//
// IMPORTANT:
//
// This function NEVER modifies replay state.
//
// Call it only AFTER cryptographic authentication has
// succeeded.
//
// If it returns ACCEPT, call replay_commit().
// =======================================================

ReplayResult replay_check(
    const ReplayWindow &window,
    uint64_t counter
);


// =======================================================
// Commit authenticated accepted counter
//
// Only call after:
//
// 1. AES-GCM authentication succeeds
// 2. replay_check() returns ACCEPT
// =======================================================

bool replay_commit(
    ReplayWindow &window,
    uint64_t counter
);


const char *replay_result_name(
    ReplayResult result
);

} // namespace gw