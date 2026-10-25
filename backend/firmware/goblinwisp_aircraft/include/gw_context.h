#pragma once

#include <Arduino.h>

#include "gw_security_types.h"

namespace gw
{

enum class ContextStatus : uint8_t
{
    OK = 0,

    SESSION_INACTIVE,

    CONTEXT_INACTIVE,

    COUNTER_EXHAUSTED,

    INVALID_ARGUMENT
};


// =======================================================
// Select direction for local device
// =======================================================

DirectionalContext *context_tx(
    SessionSecrets &session,
    DeviceSide local_side
);


DirectionalContext *context_rx(
    SessionSecrets &session,
    DeviceSide local_side
);


const DirectionalContext *context_tx(
    const SessionSecrets &session,
    DeviceSide local_side
);


const DirectionalContext *context_rx(
    const SessionSecrets &session,
    DeviceSide local_side
);


// =======================================================
// Reserve next outgoing counter and nonce
//
// Counter is consumed immediately.
//
// Even if encryption/transmission later fails, that
// counter is NOT reused.
// =======================================================

ContextStatus context_reserve_tx(
    DirectionalContext &context,

    uint64_t &counter,

    uint8_t nonce[
        GCM_NONCE_SIZE
    ]
);


// =======================================================
// Build candidate RX nonce without changing state
// =======================================================

ContextStatus context_build_rx_nonce(
    const DirectionalContext &context,

    uint64_t counter,

    uint8_t nonce[
        GCM_NONCE_SIZE
    ]
);


// =======================================================
// Session destruction
// =======================================================

void context_destroy_session(
    SessionSecrets &session
);


const char *context_status_name(
    ContextStatus status
);

} // namespace gw