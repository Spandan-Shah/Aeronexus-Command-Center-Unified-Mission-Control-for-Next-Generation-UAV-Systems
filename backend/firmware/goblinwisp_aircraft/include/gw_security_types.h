
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

namespace gw
{

// =======================================================
// Cryptographic sizes (bytes)
//
// These values are used by the existing cryptographic,
// handshake, KDF, replay and transport implementations.
// Do not change them without changing and testing the
// corresponding wire protocol and algorithms.
// =======================================================

static constexpr size_t SHA256_SIZE          = 32;
static constexpr size_t AES256_KEY_SIZE      = 32;
static constexpr size_t GCM_NONCE_SIZE       = 12;
static constexpr size_t GCM_TAG_SIZE         = 16;

static constexpr size_t P256_PRIVATE_SIZE    = 32;

// SEC1 uncompressed P-256 public point: 0x04 || X || Y.
static constexpr size_t P256_PUBLIC_SIZE     = 65;

// Raw P-256 ECDSA signature: R(32) || S(32).
static constexpr size_t P256_SIGNATURE_SIZE  = 64;

// Per-direction GCM nonce = 4-byte prefix || 8-byte counter.
static constexpr size_t NONCE_PREFIX_SIZE    = 4;

static constexpr size_t MAX_CALLSIGN_LEN     = 24;
static constexpr uint8_t MAX_TRUSTED_PEERS   = 8;

static_assert(sizeof(uint8_t) == 1, "SSIP requires 8-bit bytes");
static_assert(sizeof(uint32_t) == 4, "SSIP requires uint32_t");
static_assert(sizeof(uint64_t) == 8, "SSIP requires uint64_t");
static_assert(GCM_NONCE_SIZE == NONCE_PREFIX_SIZE + sizeof(uint64_t),
              "SSIP nonce prefix and counter must total 12 bytes");
static_assert(GCM_TAG_SIZE == 16, "SSIP requires full-length GCM tags");
static_assert(MAX_TRUSTED_PEERS > 0, "At least one trust slot is required");

// =======================================================
// On-wire protocol 1.1 (breaking key-agreement change).
// The 1.1 handshake combines three authenticated P-256 ECDH outputs.
// Both devices MUST use the same release; v1.0 traffic is rejected.
// The independent trusted-pairing wire protocol remains v1.1.
// =======================================================

static constexpr uint8_t PROTOCOL_MAJOR = 1;
static constexpr uint8_t PROTOCOL_MINOR = 1;

// =======================================================
// Device, handshake and traffic directions
// =======================================================

enum class DeviceSide : uint8_t
{
    SIDE_A = 1,
    SIDE_B = 2
};

enum class HandshakeRole : uint8_t
{
    INITIATOR = 1,
    RESPONDER = 2
};

enum class Direction : uint8_t
{
    A_TO_B = 1,
    B_TO_A = 2
};

// =======================================================
// Trust and session states
//
// Keep TrustState numeric values unchanged: the existing
// NVS storage schema serializes them as uint8_t values.
// =======================================================

enum class TrustState : uint8_t
{
    EMPTY             = 0,
    UNPAIRED          = 1,
    PAIRING           = 2,
    TRUSTED           = 3,
    IDENTITY_MISMATCH = 4,
    REVOKED           = 5,
    ERROR             = 6
};

enum class SessionState : uint8_t
{
    UNPAIRED       = 0,
    PAIRED_IDLE    = 1,
    HANDSHAKE_INIT = 2,
    HANDSHAKE_AUTH = 3,
    KEY_DERIVATION = 4,
    KEY_CONFIRM    = 5,
    ACTIVE         = 6,
    REKEYING       = 7,
    DEGRADED       = 8,
    FAULT          = 9,
    RESETTING      = 10
};

// =======================================================
// Negotiated security suite identifiers
//
// Only the P-256 classical suite is implemented in the
// uploaded baseline. The hybrid identifier is RESERVED;
// declaring it does not provide ML-KEM or hybrid security.
// Reject it until a reviewed hybrid provider exists.
// =======================================================

enum class SecuritySuite : uint16_t
{
    NONE                             = 0x0000,
    P256_HKDF_SHA256_AES256_GCM       = 0x0101,
    P256_MLKEM512_HYBRID_AES256_GCM   = 0x0201
};

// No caller should treat the reserved hybrid identifier
// as implemented simply because it is present in the enum.
constexpr bool security_suite_implemented(SecuritySuite suite)
{
    return suite == SecuritySuite::P256_HKDF_SHA256_AES256_GCM;
}

// =======================================================
// Logical packet classes
//
// The existing communications/handshake modules have
// their own versioned wire packet formats. This enum is
// NOT a packed wire header and must not be sent by memcpy.
// Values are fixed to preserve the current assignments.
// =======================================================

enum class PacketClass : uint8_t
{
    INVALID        = 0,
    HELLO          = 1,
    HELLO_REPLY    = 2,
    HANDSHAKE_AUTH = 3,
    KEY_CONFIRM    = 4,
    DATA           = 5,
    ACK            = 6,
    CONTROL        = 7,
    REKEY_INIT     = 8,
    REKEY_REPLY    = 9,
    REKEY_CONFIRM  = 10,
    PAIRING        = 11,
    DIAGNOSTIC     = 12
};

// =======================================================
// Persistent local identity
//
// Long-term private keys are NEVER session material.
// Preserve this layout for the existing identity and
// Preferences/NVS conversion code.
// =======================================================

struct IdentityMaterial
{
    uint8_t private_key[P256_PRIVATE_SIZE];
    uint8_t public_key[P256_PUBLIC_SIZE];
    uint8_t fingerprint[SHA256_SIZE];
    bool valid;
};

// =======================================================
// Persisted trust record
//
// peer_id is only a routing/logical identifier; the
// fingerprint and verified public key anchor identity.
// =======================================================

struct PeerRecord
{
    uint8_t peer_id;
    char callsign[MAX_CALLSIGN_LEN];
    uint8_t public_key[P256_PUBLIC_SIZE];
    uint8_t fingerprint[SHA256_SIZE];
    TrustState trust_state;
    bool valid;
};

// =======================================================
// Receive replay window
//
// The bitmap and highest counter are per directional
// RECEIVE context, not global and not shared by peers.
// replay_check() must remain non-mutating; only a valid
// authenticated message may be committed to this state.
// =======================================================

struct ReplayWindow
{
    uint64_t highest_counter;
    uint64_t bitmap;
    bool initialized;
};

// =======================================================
// Direction-specific cryptographic context
//
// Counter 0 is reserved by the existing counter/nonce
// implementation. A transmission consumes its counter
// even if the subsequent send fails. Retries must reuse
// the exact previously encrypted packet bytes.
// =======================================================

struct DirectionalContext
{
    uint8_t traffic_key[AES256_KEY_SIZE];
    uint8_t nonce_prefix[NONCE_PREFIX_SIZE];
    uint64_t tx_counter;
    ReplayWindow replay;
    uint32_t key_epoch;
    Direction direction;
    bool active;
};

// =======================================================
// Volatile session secrets
//
// IMPORTANT: Field names/order are intentionally kept
// compatible with the uploaded KDF, handshake, rekey and
// directional-context implementations, which zero/copy
// this whole structure using sizeof(SessionSecrets).
// Do not persist this structure or revive it after reset.
// =======================================================

struct SessionSecrets
{
    uint64_t session_id;
    uint32_t key_epoch;
    DirectionalContext a_to_b;
    DirectionalContext b_to_a;
    uint8_t control_key[AES256_KEY_SIZE];
    uint8_t confirmation_key[AES256_KEY_SIZE];
    SecuritySuite suite;
    bool active;
};

// =======================================================
// Independent peer-session slot (new, not yet activated)
//
// A separate instance must be maintained for each active
// peer. No key, counter or replay state may be shared
// across different peer sessions. The existing firmware
// still runs one active peer until the handshake/comm
// implementations are refined in subsequent steps.
//
// Logical peer IDs and fingerprints are independent of
// the transport. The transport adapter must provide the
// verified peer-to-link association separately.
//
// This is a runtime-only structure: never write it to NVS.
// It contains session keys and must be wiped on teardown.
// =======================================================

struct PeerSessionSlot
{
    uint8_t local_peer_id;
    uint8_t remote_peer_id;
    DeviceSide local_side;

    uint8_t local_identity_fingerprint[SHA256_SIZE];
    uint8_t remote_identity_fingerprint[SHA256_SIZE];
    uint8_t handshake_transcript_hash[SHA256_SIZE];

    uint32_t negotiated_capabilities;
    uint8_t negotiated_protocol_major;
    uint8_t negotiated_protocol_minor;

    SessionState state;
    SessionSecrets secrets;

    // These flags are results of authenticated validation,
    // never values accepted directly from a wire packet.
    bool identity_verified;
    bool occupied;
};

// =======================================================
// Secure memory erasure
//
// Implementation remains in existing src/security/crypto.cpp.
// =======================================================

void secure_zero(void *memory, size_t length);

} // namespace gw
