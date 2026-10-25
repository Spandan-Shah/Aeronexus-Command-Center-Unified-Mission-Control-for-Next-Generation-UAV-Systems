#include "gw_context.h"

#include "gw_crypto.h"
#include "gw_security_policy.h"

namespace gw
{

// =======================================================
// Mutable TX context
// =======================================================

DirectionalContext *context_tx(
    SessionSecrets &session,
    DeviceSide local_side
)
{
    if (!session.active)
    {
        return nullptr;
    }


    if (
        local_side ==
        DeviceSide::SIDE_A
    )
    {
        return
            &session.a_to_b;
    }


    if (
        local_side ==
        DeviceSide::SIDE_B
    )
    {
        return
            &session.b_to_a;
    }


    return nullptr;
}


// =======================================================
// Mutable RX context
// =======================================================

DirectionalContext *context_rx(
    SessionSecrets &session,
    DeviceSide local_side
)
{
    if (!session.active)
    {
        return nullptr;
    }


    if (
        local_side ==
        DeviceSide::SIDE_A
    )
    {
        return
            &session.b_to_a;
    }


    if (
        local_side ==
        DeviceSide::SIDE_B
    )
    {
        return
            &session.a_to_b;
    }


    return nullptr;
}


// =======================================================
// Const TX context
// =======================================================

const DirectionalContext *context_tx(
    const SessionSecrets &session,
    DeviceSide local_side
)
{
    if (!session.active)
    {
        return nullptr;
    }


    if (
        local_side ==
        DeviceSide::SIDE_A
    )
    {
        return
            &session.a_to_b;
    }


    if (
        local_side ==
        DeviceSide::SIDE_B
    )
    {
        return
            &session.b_to_a;
    }


    return nullptr;
}


// =======================================================
// Const RX context
// =======================================================

const DirectionalContext *context_rx(
    const SessionSecrets &session,
    DeviceSide local_side
)
{
    if (!session.active)
    {
        return nullptr;
    }


    if (
        local_side ==
        DeviceSide::SIDE_A
    )
    {
        return
            &session.b_to_a;
    }


    if (
        local_side ==
        DeviceSide::SIDE_B
    )
    {
        return
            &session.a_to_b;
    }


    return nullptr;
}


// =======================================================
// Reserve TX nonce
// =======================================================

ContextStatus context_reserve_tx(
    DirectionalContext &context,

    uint64_t &counter,

    uint8_t nonce[
        GCM_NONCE_SIZE
    ]
)
{
    if (nonce == nullptr)
    {
        return
            ContextStatus::INVALID_ARGUMENT;
    }


    if (!context.active)
    {
        return
            ContextStatus::CONTEXT_INACTIVE;
    }


    // We intentionally consume counters monotonically.
    //
    // Counter zero is never used.

    if (
        context.tx_counter >=
        COUNTER_HARD_LIMIT
    )
    {
        return
            ContextStatus::COUNTER_EXHAUSTED;
    }


    context.tx_counter++;


    counter =
        context.tx_counter;


    crypto_build_nonce(
        context.nonce_prefix,
        counter,
        nonce
    );


    return
        ContextStatus::OK;
}


// =======================================================
// Candidate RX nonce
// =======================================================

ContextStatus context_build_rx_nonce(
    const DirectionalContext &context,

    uint64_t counter,

    uint8_t nonce[
        GCM_NONCE_SIZE
    ]
)
{
    if (
        nonce == nullptr ||
        counter == 0
    )
    {
        return
            ContextStatus::INVALID_ARGUMENT;
    }


    if (!context.active)
    {
        return
            ContextStatus::CONTEXT_INACTIVE;
    }


    crypto_build_nonce(
        context.nonce_prefix,
        counter,
        nonce
    );


    return
        ContextStatus::OK;
}


// =======================================================
// Destroy session
// =======================================================

void context_destroy_session(
    SessionSecrets &session
)
{
    // Complete volatile key destruction.

    secure_zero(
        &session,
        sizeof(session)
    );
}


// =======================================================
// Text
// =======================================================

const char *context_status_name(
    ContextStatus status
)
{
    switch (status)
    {
        case ContextStatus::OK:
            return "OK";

        case ContextStatus::SESSION_INACTIVE:
            return "SESSION INACTIVE";

        case ContextStatus::CONTEXT_INACTIVE:
            return "CONTEXT INACTIVE";

        case ContextStatus::COUNTER_EXHAUSTED:
            return "COUNTER EXHAUSTED";

        case ContextStatus::INVALID_ARGUMENT:
            return "INVALID ARGUMENT";

        default:
            return "UNKNOWN";
    }
}

} // namespace gw