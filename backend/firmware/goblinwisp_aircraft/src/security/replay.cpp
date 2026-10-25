#include "gw_replay.h"

namespace gw
{

// =======================================================
// Reset
// =======================================================

void replay_reset(
    ReplayWindow &window
)
{
    window.highest_counter = 0;

    window.bitmap = 0;

    window.initialized = false;
}


// =======================================================
// Validate without mutation
// =======================================================

ReplayResult replay_check(
    const ReplayWindow &window,
    uint64_t counter
)
{
    // Counter zero is reserved / invalid.

    if (counter == 0)
    {
        return
            ReplayResult::INVALID_COUNTER;
    }


    // First authenticated packet.

    if (!window.initialized)
    {
        return
            ReplayResult::ACCEPT;
    }


    // New highest counter.

    if (
        counter >
        window.highest_counter
    )
    {
        return
            ReplayResult::ACCEPT;
    }


    const uint64_t distance =
        window.highest_counter -
        counter;


    // Outside 64-packet replay window.

    if (distance >= 64ULL)
    {
        return
            ReplayResult::TOO_OLD;
    }


    const uint64_t mask =
        1ULL << distance;


    if (
        window.bitmap &
        mask
    )
    {
        return
            ReplayResult::DUPLICATE;
    }


    // Valid authenticated out-of-order packet still
    // inside replay window.

    return
        ReplayResult::ACCEPT;
}


// =======================================================
// Commit
// =======================================================

bool replay_commit(
    ReplayWindow &window,
    uint64_t counter
)
{
    if (
        replay_check(
            window,
            counter
        ) != ReplayResult::ACCEPT
    )
    {
        return false;
    }


    // ---------------------------------------------------
    // First packet
    // ---------------------------------------------------

    if (!window.initialized)
    {
        window.highest_counter =
            counter;

        window.bitmap =
            1ULL;

        window.initialized =
            true;

        return true;
    }


    // ---------------------------------------------------
    // New highest
    // ---------------------------------------------------

    if (
        counter >
        window.highest_counter
    )
    {
        const uint64_t shift =
            counter -
            window.highest_counter;


        if (shift >= 64ULL)
        {
            window.bitmap =
                1ULL;
        }
        else
        {
            window.bitmap =
                (
                    window.bitmap <<
                    shift
                ) |
                1ULL;
        }


        window.highest_counter =
            counter;


        return true;
    }


    // ---------------------------------------------------
    // Valid out-of-order packet
    // ---------------------------------------------------

    const uint64_t distance =
        window.highest_counter -
        counter;


    if (distance >= 64ULL)
    {
        return false;
    }


    window.bitmap |=
        1ULL << distance;


    return true;
}


// =======================================================
// Text
// =======================================================

const char *replay_result_name(
    ReplayResult result
)
{
    switch (result)
    {
        case ReplayResult::ACCEPT:
            return "ACCEPT";

        case ReplayResult::INVALID_COUNTER:
            return "INVALID COUNTER";

        case ReplayResult::DUPLICATE:
            return "DUPLICATE";

        case ReplayResult::TOO_OLD:
            return "TOO OLD";

        default:
            return "UNKNOWN";
    }
}

} // namespace gw