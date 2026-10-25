
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// GoblinWisp SSIP security policy
//
// All times are milliseconds and all traffic-counter
// limits apply independently to each cryptographic
// direction AND each peer session.
//
// This file declares policy; the calling C++ modules
// must enforce it. In the uploaded baseline, several
// policies are not yet connected to their runtime paths.
// =======================================================

// =======================================================
// Session lifetime and key-rotation policy
// =======================================================

// A session must be refreshed after 30 minutes, even if
// the traffic threshold has not been reached. Compute
// elapsed time using uint32_t(now - start) so millis()
// wraparound does not extend the session unexpectedly.
static constexpr uint32_t SESSION_MAX_AGE_MS =
    30UL * 60UL * 1000UL;

// Request authenticated key rotation at this threshold.
// Track traffic independently for every peer/direction.
// This threshold is not permission to use a key forever
// if the rotation attempt fails.
static constexpr uint64_t REKEY_PACKET_THRESHOLD =
    100000ULL;

// Hard per-key TX counter ceiling. The previous ceiling
// (UINT64_MAX - 255) was far too permissive as a safety
// backstop if session refresh/rekey was not performed.
// After this counter is consumed, TX MUST fail closed
// until fresh authenticated directional keys are active.
// Retries reuse the exact stored ciphertext and nonce;
// they must not reserve another counter for the same
// logical encrypted packet.
static constexpr uint64_t COUNTER_HARD_LIMIT =
    120000ULL;

// Use this helper with an elapsed duration, not the
// absolute millis() timestamp. The receive-side value
// is the highest authenticated counter, not an unauth-
// enticated packet-counter field from the wire.
constexpr bool session_key_refresh_due(
    uint32_t session_age_ms,
    uint64_t tx_counter,
    uint64_t rx_highest_counter)
{
    return session_age_ms >= SESSION_MAX_AGE_MS ||
           tx_counter >= REKEY_PACKET_THRESHOLD ||
           rx_highest_counter >= REKEY_PACKET_THRESHOLD;
}

// Check BEFORE reserving the next per-direction counter.
constexpr bool counter_allows_next_packet(uint64_t tx_counter)
{
    return tx_counter < COUNTER_HARD_LIMIT;
}

// =======================================================
// Authenticated replay protection
// =======================================================

// The current ReplayWindow uses a uint64_t bitmap and the
// existing replay.cpp implements exactly 64 packet slots.
// Replay checks must NOT mutate state, and replay state
// is committed only after AEAD authentication and packet
// semantics have both succeeded.
static constexpr uint8_t REPLAY_WINDOW_BITS = 64;

// =======================================================
// Trusted pairing and identity continuity
// =======================================================

// Maximum duration of one locally authorized enrollment
// attempt. Once expired, unconfirmed candidate state
// must be destroyed without enrolling peer trust.
static constexpr uint32_t PAIRING_WINDOW_MS =
    120000UL;

// =======================================================
// Authentication-failure throttling
// =======================================================

// These limits must be enforced per physical or logical
// peer, not through one unauthenticated global counter.
// A cooldown must not block local trust-reset recovery or
// allow an attacker to mark a new peer as trusted.
static constexpr uint8_t MAX_AUTH_FAILURE_BURST = 8;

static constexpr uint32_t AUTH_FAILURE_COOLDOWN_MS =
    5000UL;

// =======================================================
// Authenticated handshake
// =======================================================

// Overall attempt timeout and maximum retransmissions.
// Retransmits must preserve already authenticated frame
// bytes where the protocol requires exact-frame retries.
static constexpr uint32_t HANDSHAKE_TIMEOUT_MS =
    10000UL;

static constexpr uint8_t HANDSHAKE_MAX_RETRIES = 4;

// =======================================================
// Authenticated in-session rekey
// =======================================================

// A rekey transition must either converge to one verified
// new epoch on BOTH sides or fail closed, invalidating the
// unsafe session and requiring a fresh authenticated
// handshake. These limits do not enable rekey by themselves.
static constexpr uint32_t REKEY_TIMEOUT_MS =
    10000UL;

static constexpr uint8_t REKEY_MAX_RETRIES = 3;

// =======================================================
// Independent peer sessions
// =======================================================

// Upper bound for the eventual multi-peer session table.
// A trust database with eight records DOES NOT, by itself,
// provide eight simultaneously active secure sessions.
// Peer-specific routing and handshake/session registries
// are implemented in subsequent source-refinement steps.
static constexpr uint8_t MAX_ACTIVE_PEERS = 8;

// =======================================================
// Mandatory security posture
// =======================================================

// No fallback to legacy PSK or plaintext communication
// after a failed identity-bound handshake.
static constexpr bool ALLOW_LEGACY_PSK_FALLBACK = false;

// Fail closed on failed authentication, unusable identity,
// counter exhaustion, invalid epoch or lost session state.
// The runtime must enforce this in the matching modules.
static constexpr bool FAIL_CLOSED = true;

// =======================================================
// Compile-time policy invariants
// =======================================================

static_assert(SESSION_MAX_AGE_MS > 0UL &&
              SESSION_MAX_AGE_MS < 0x80000000UL,
              "Session age must support wrap-safe millis() comparisons");

static_assert(REKEY_PACKET_THRESHOLD > 0ULL &&
              REKEY_PACKET_THRESHOLD < COUNTER_HARD_LIMIT,
              "Key rotation must precede the hard TX counter limit");

static_assert(COUNTER_HARD_LIMIT <= 0xFFFFFFFFULL,
              "Hard counter ceiling must stay within the conservative policy budget");

static_assert(REPLAY_WINDOW_BITS == sizeof(uint64_t) * 8,
              "Replay policy must match the existing 64-bit bitmap");

static_assert(PAIRING_WINDOW_MS > 0UL &&
              HANDSHAKE_TIMEOUT_MS > 0UL &&
              REKEY_TIMEOUT_MS > 0UL,
              "Security protocol timeouts cannot be zero");

static_assert(HANDSHAKE_MAX_RETRIES > 0 &&
              REKEY_MAX_RETRIES > 0,
              "Security retransmission limits cannot be zero");

static_assert(MAX_AUTH_FAILURE_BURST > 0 &&
              AUTH_FAILURE_COOLDOWN_MS > 0UL,
              "Authentication-failure throttling must remain enabled");

static_assert(MAX_ACTIVE_PEERS >= 1 &&
              MAX_ACTIVE_PEERS <= MAX_TRUSTED_PEERS,
              "Active session capacity cannot exceed stored trust capacity");

static_assert(!ALLOW_LEGACY_PSK_FALLBACK,
              "Legacy PSK fallback is forbidden");

static_assert(FAIL_CLOSED,
              "Core SSIP failures must fail closed");

static_assert(!counter_allows_next_packet(COUNTER_HARD_LIMIT),
              "Hard counter ceiling must block new packets");

} // namespace gw
