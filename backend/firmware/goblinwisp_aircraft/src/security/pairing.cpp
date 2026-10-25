#include "gw_pairing.h"

#include "gw_crypto.h"
#include "gw_identity.h"
#include "gw_security_policy.h"
#include "gw_trust.h"

#include <cstdio>
#include <cstring>

namespace gw {
namespace {

// SSIP pairing 1.1. A fresh, signed REQUEST and RESPONSE bind the
// respective public identities, role/order and random challenges.
// The SAS confirms the same transcript on both devices. Only locally
// authorized actions may approve enrollment; a received packet cannot.
static const uint8_t PAIR_MAGIC[4] = {'G', 'W', 'P', 'R'};
static constexpr size_t MAX_FRAME = 250;
static constexpr uint32_t RETRY_INTERVAL_MS = 1000UL;
static constexpr uint8_t MAX_PAIRING_RETRIES = 5;

enum class PairMessageType : uint8_t {
    REQUEST   = 1,
    RESPONSE  = 2,
    CONFIRM   = 3,
    COMMIT    = 4,
    ABORT     = 5,
    FINAL_ACK = 6
};

#pragma pack(push, 1)
struct PairRequestPacket {
    uint8_t magic[4], protocol_major, protocol_minor, message_type, sender_id;
    uint8_t nonce[PAIRING_NONCE_SIZE];
    uint8_t public_key[P256_PUBLIC_SIZE];
    char callsign[MAX_CALLSIGN_LEN];
    uint8_t signature[P256_SIGNATURE_SIZE];
};
struct PairResponsePacket {
    uint8_t magic[4], protocol_major, protocol_minor, message_type, sender_id;
    uint8_t request_hash[SHA256_SIZE];
    uint8_t nonce[PAIRING_NONCE_SIZE];
    uint8_t public_key[P256_PUBLIC_SIZE];
    char callsign[MAX_CALLSIGN_LEN];
    uint8_t signature[P256_SIGNATURE_SIZE];
};
struct PairProofPacket {
    uint8_t magic[4], protocol_major, protocol_minor, message_type, sender_id;
    uint8_t transcript_hash[SHA256_SIZE];
    uint8_t signature[P256_SIGNATURE_SIZE];
};
struct PairAbortPacket {
    uint8_t magic[4], protocol_major, protocol_minor, message_type, sender_id;
    uint8_t transcript_hash[SHA256_SIZE];
    uint8_t reason;
    uint8_t signature[P256_SIGNATURE_SIZE];
};
#pragma pack(pop)

static_assert(sizeof(PairRequestPacket) <= MAX_FRAME, "REQUEST exceeds transport payload");
static_assert(sizeof(PairResponsePacket) <= MAX_FRAME, "RESPONSE exceeds transport payload");
static_assert(sizeof(PairProofPacket) <= MAX_FRAME, "proof exceeds transport payload");
static_assert(sizeof(PairAbortPacket) <= MAX_FRAME, "ABORT exceeds transport payload");
static_assert(PAIRING_PROTOCOL_MAJOR == 1 && PAIRING_PROTOCOL_MINOR == 1,
              "This pairing state machine requires wire protocol 1.1");

struct PairCandidate {
    bool active;
    uint8_t peer_id;
    char callsign[MAX_CALLSIGN_LEN];
    uint8_t public_key[P256_PUBLIC_SIZE];
    uint8_t fingerprint[SHA256_SIZE];
    uint8_t request_hash[SHA256_SIZE];
    uint8_t response_hash[SHA256_SIZE];
    uint8_t transcript_hash[SHA256_SIZE];
    bool transcript_ready;
};

// A cached, already signed frame is retransmitted BYTE-FOR-BYTE.
struct SavedFrame {
    uint8_t bytes[MAX_FRAME];
    size_t length;
    bool valid;
};

bool initialized = false;
uint8_t local_id = 0;
char local_callsign[MAX_CALLSIGN_LEN] = {};
PairingSendCallback send_callback = nullptr;
PairingState current_state = PairingState::UNINITIALIZED;
PairingFailure current_failure = PairingFailure::NONE;
PairCandidate candidate{};
uint8_t expected_peer_id = 0;
bool local_is_initiator = false;
bool local_confirmed = false;
bool remote_confirm_received = false;
bool local_trust_saved = false;
uint32_t pairing_started_ms = 0;
uint32_t last_tx_ms = 0;
uint8_t retry_count = 0;
SavedFrame pending{}, saved_response{}, saved_commit{}, saved_final_ack{};

// All protocol hash inputs are canonical byte strings, not C++ struct
// padding. The packet wire types are packed, but the signatures cover
// explicitly selected fields and distinct operation domains.
bool append(uint8_t *buffer, size_t capacity, size_t &used,
            const void *data, size_t length) {
    if (!buffer || !data || used > capacity || length > capacity - used)
        return false;
    std::memcpy(buffer + used, data, length);
    used += length;
    return true;
}

bool hash_request(const PairRequestPacket &p, uint8_t out[SHA256_SIZE]) {
    static const char domain[] = "GWSSIP-PAIR-REQUEST-V1";
    uint8_t bytes[192]{};
    size_t n = 0;
    const bool built =
        append(bytes, sizeof(bytes), n, domain, sizeof(domain) - 1) &&
        append(bytes, sizeof(bytes), n, &p.protocol_major, 1) &&
        append(bytes, sizeof(bytes), n, &p.protocol_minor, 1) &&
        append(bytes, sizeof(bytes), n, &p.sender_id, 1) &&
        append(bytes, sizeof(bytes), n, p.nonce, sizeof(p.nonce)) &&
        append(bytes, sizeof(bytes), n, p.public_key, sizeof(p.public_key)) &&
        append(bytes, sizeof(bytes), n, p.callsign, sizeof(p.callsign));
    const bool ok = built && crypto_sha256(bytes, n, out);
    secure_zero(bytes, sizeof(bytes));
    return ok;
}

bool hash_response(const PairResponsePacket &p, uint8_t out[SHA256_SIZE]) {
    static const char domain[] = "GWSSIP-PAIR-RESPONSE-V1";
    uint8_t bytes[224]{};
    size_t n = 0;
    const bool built =
        append(bytes, sizeof(bytes), n, domain, sizeof(domain) - 1) &&
        append(bytes, sizeof(bytes), n, &p.protocol_major, 1) &&
        append(bytes, sizeof(bytes), n, &p.protocol_minor, 1) &&
        append(bytes, sizeof(bytes), n, &p.sender_id, 1) &&
        append(bytes, sizeof(bytes), n, p.request_hash, SHA256_SIZE) &&
        append(bytes, sizeof(bytes), n, p.nonce, sizeof(p.nonce)) &&
        append(bytes, sizeof(bytes), n, p.public_key, sizeof(p.public_key)) &&
        append(bytes, sizeof(bytes), n, p.callsign, sizeof(p.callsign));
    const bool ok = built && crypto_sha256(bytes, n, out);
    secure_zero(bytes, sizeof(bytes));
    return ok;
}

bool hash_transcript(const uint8_t request[SHA256_SIZE],
                     const uint8_t response[SHA256_SIZE],
                     uint8_t out[SHA256_SIZE]) {
    static const char domain[] = "GWSSIP-PAIR-TRANSCRIPT-V1";
    uint8_t bytes[128]{};
    size_t n = 0;
    const bool built =
        append(bytes, sizeof(bytes), n, domain, sizeof(domain) - 1) &&
        append(bytes, sizeof(bytes), n, request, SHA256_SIZE) &&
        append(bytes, sizeof(bytes), n, response, SHA256_SIZE);
    const bool ok = built && crypto_sha256(bytes, n, out);
    secure_zero(bytes, sizeof(bytes));
    return ok;
}

// Different signatures for CONFIRM, COMMIT, FINAL_ACK, and ABORT.
bool hash_proof(const char *domain, uint8_t sender,
                const uint8_t transcript[SHA256_SIZE],
                uint8_t out[SHA256_SIZE], int reason = -1) {
    if (!domain || !transcript || !out) return false;
    uint8_t bytes[128]{};
    size_t n = 0;
    const uint8_t version[2] = {PAIRING_PROTOCOL_MAJOR, PAIRING_PROTOCOL_MINOR};
    const uint8_t r = static_cast<uint8_t>(reason);
    const bool built =
        append(bytes, sizeof(bytes), n, domain, std::strlen(domain)) &&
        append(bytes, sizeof(bytes), n, version, sizeof(version)) &&
        append(bytes, sizeof(bytes), n, &sender, 1) &&
        append(bytes, sizeof(bytes), n, transcript, SHA256_SIZE) &&
        (reason < 0 || append(bytes, sizeof(bytes), n, &r, 1));
    const bool ok = built && crypto_sha256(bytes, n, out);
    secure_zero(bytes, sizeof(bytes));
    return ok;
}

const char *proof_domain(PairMessageType type) {
    switch (type) {
        case PairMessageType::CONFIRM: return "GWSSIP-PAIR-CONFIRM-V1";
        case PairMessageType::COMMIT: return "GWSSIP-PAIR-COMMIT-V1";
        case PairMessageType::FINAL_ACK: return "GWSSIP-PAIR-FINAL-ACK-V1";
        default: return nullptr;
    }
}

void header(uint8_t magic[4], uint8_t &major, uint8_t &minor,
            uint8_t &kind, uint8_t &sender, PairMessageType type) {
    std::memcpy(magic, PAIR_MAGIC, sizeof(PAIR_MAGIC));
    major = PAIRING_PROTOCOL_MAJOR;
    minor = PAIRING_PROTOCOL_MINOR;
    kind = static_cast<uint8_t>(type);
    sender = local_id;
}

bool valid_header(const uint8_t *frame, size_t length, PairMessageType type) {
    return frame && length >= 8 &&
        std::memcmp(frame, PAIR_MAGIC, sizeof(PAIR_MAGIC)) == 0 &&
        frame[4] == PAIRING_PROTOCOL_MAJOR &&
        frame[5] == PAIRING_PROTOCOL_MINOR &&
        frame[6] == static_cast<uint8_t>(type) &&
        frame[7] != 0 && frame[7] != local_id;
}

bool valid_callsign(const char callsign[MAX_CALLSIGN_LEN]) {
    return callsign && std::memchr(callsign, '\0', MAX_CALLSIGN_LEN) != nullptr;
}

bool store_frame(SavedFrame &slot, const void *data, size_t len) {
    if (!data || !len || len > MAX_FRAME) return false;
    secure_zero(&slot, sizeof(slot));
    std::memcpy(slot.bytes, data, len);
    slot.length = len;
    slot.valid = true;
    return true;
}

bool send_frame(const SavedFrame &slot) {
    return send_callback && slot.valid && slot.length &&
           send_callback(slot.bytes, slot.length);
}

bool queue_frame(const void *data, size_t len) {
    if (!store_frame(pending, data, len)) return false;
    retry_count = 0;
    last_tx_ms = millis();
    return send_frame(pending);
}

void wipe_attempt() {
    secure_zero(&candidate, sizeof(candidate));
    secure_zero(&pending, sizeof(pending));
    secure_zero(&saved_response, sizeof(saved_response));
    secure_zero(&saved_commit, sizeof(saved_commit));
    secure_zero(&saved_final_ack, sizeof(saved_final_ack));
    expected_peer_id = 0;
    local_is_initiator = false;
    local_confirmed = false;
    remote_confirm_received = false;
    local_trust_saved = false;
    pairing_started_ms = 0;
    last_tx_ms = 0;
    retry_count = 0;
}

void fail(PairingFailure why) {
    wipe_attempt();
    current_failure = why;
    current_state = PairingState::FAILED;
}

bool candidate_allowed(uint8_t peer_id,
                       const uint8_t pub[P256_PUBLIC_SIZE]) {
    switch (trust_verify_peer(peer_id, pub)) {
        case TrustVerifyResult::TRUSTED:
        case TrustVerifyResult::UNKNOWN_PEER:
            return true;
        case TrustVerifyResult::REVOKED:
            current_failure = PairingFailure::PEER_REVOKED;
            return false;
        case TrustVerifyResult::IDENTITY_MISMATCH:
            current_failure = PairingFailure::IDENTITY_MISMATCH;
            return false;
        default:
            current_failure = PairingFailure::INVALID_IDENTITY;
            return false;
    }
}

bool set_candidate(uint8_t peer_id, const char callsign[MAX_CALLSIGN_LEN],
                   const uint8_t pub[P256_PUBLIC_SIZE]) {
    if (!peer_id || peer_id == local_id || !callsign || !valid_callsign(callsign) ||
        !pub || !crypto_p256_validate_public(pub)) return false;
    candidate.active = true;
    candidate.peer_id = peer_id;
    std::memcpy(candidate.callsign, callsign, MAX_CALLSIGN_LEN);
    candidate.callsign[MAX_CALLSIGN_LEN - 1] = '\0';
    std::memcpy(candidate.public_key, pub, P256_PUBLIC_SIZE);
    if (!crypto_sha256(pub, P256_PUBLIC_SIZE, candidate.fingerprint)) {
        secure_zero(&candidate, sizeof(candidate));
        return false;
    }
    return true;
}

bool verify_proof(const PairProofPacket &p, PairMessageType type) {
    if (!candidate.active || !candidate.transcript_ready ||
        p.sender_id != candidate.peer_id ||
        !crypto_constant_time_equal(p.transcript_hash,
                                    candidate.transcript_hash, SHA256_SIZE))
        return false;
    uint8_t digest[SHA256_SIZE]{};
    const bool ok = hash_proof(proof_domain(type), p.sender_id,
                               p.transcript_hash, digest) &&
        crypto_p256_verify_digest(candidate.public_key, digest, p.signature);
    secure_zero(digest, sizeof(digest));
    return ok;
}

bool build_proof(PairMessageType type, PairProofPacket &p) {
    if (!candidate.active || !candidate.transcript_ready ||
        !proof_domain(type)) return false;
    std::memset(&p, 0, sizeof(p));
    header(p.magic, p.protocol_major, p.protocol_minor,
           p.message_type, p.sender_id, type);
    std::memcpy(p.transcript_hash, candidate.transcript_hash, SHA256_SIZE);
    uint8_t digest[SHA256_SIZE]{};
    const bool ok = hash_proof(proof_domain(type), local_id,
                               p.transcript_hash, digest) &&
                    identity_sign_digest(digest, p.signature);
    secure_zero(digest, sizeof(digest));
    return ok;
}

bool build_request(PairRequestPacket &p) {
    std::memset(&p, 0, sizeof(p));
    header(p.magic, p.protocol_major, p.protocol_minor,
           p.message_type, p.sender_id, PairMessageType::REQUEST);
    if (!crypto_random(p.nonce, sizeof(p.nonce)) ||
        !identity_copy_public_key(p.public_key)) return false;
    std::memcpy(p.callsign, local_callsign, MAX_CALLSIGN_LEN);
    uint8_t digest[SHA256_SIZE]{};
    const bool ok = hash_request(p, digest) &&
                    identity_sign_digest(digest, p.signature);
    if (ok) std::memcpy(candidate.request_hash, digest, SHA256_SIZE);
    secure_zero(digest, sizeof(digest));
    return ok;
}

bool build_response(PairResponsePacket &p) {
    std::memset(&p, 0, sizeof(p));
    header(p.magic, p.protocol_major, p.protocol_minor,
           p.message_type, p.sender_id, PairMessageType::RESPONSE);
    std::memcpy(p.request_hash, candidate.request_hash, SHA256_SIZE);
    if (!crypto_random(p.nonce, sizeof(p.nonce)) ||
        !identity_copy_public_key(p.public_key)) return false;
    std::memcpy(p.callsign, local_callsign, MAX_CALLSIGN_LEN);
    uint8_t digest[SHA256_SIZE]{};
    bool ok = hash_response(p, digest) &&
              identity_sign_digest(digest, p.signature);
    if (ok) {
        std::memcpy(candidate.response_hash, digest, SHA256_SIZE);
        ok = hash_transcript(candidate.request_hash, candidate.response_hash,
                             candidate.transcript_hash);
        candidate.transcript_ready = ok;
    }
    secure_zero(digest, sizeof(digest));
    return ok;
}

// Send COMMIT without changing persistent trust. The responder may
// enroll ONLY after receiving the signed FINAL_ACK from the initiator.
bool send_commit() {
    if (local_is_initiator || !local_confirmed ||
        !remote_confirm_received || !candidate.transcript_ready) return false;
    PairProofPacket p{};
    if (!build_proof(PairMessageType::COMMIT, p) ||
        !store_frame(saved_commit, &p, sizeof(p)) ||
        !queue_frame(&p, sizeof(p))) {
        fail(PairingFailure::SEND_ERROR);
        return false;
    }
    current_state = PairingState::WAIT_FINAL_ACK;
    return true;
}

// =======================================================
// Incoming signed request
// =======================================================
bool process_request(const PairRequestPacket &p) {
    if (local_is_initiator ||
        (current_state != PairingState::WINDOW_OPEN &&
         current_state != PairingState::WAIT_LOCAL_CONFIRM &&
         current_state != PairingState::WAIT_REMOTE_CONFIRM &&
         current_state != PairingState::WAIT_FINAL_ACK &&
         current_state != PairingState::PAIRED)) return false;
    if (expected_peer_id && p.sender_id != expected_peer_id) return false;
    if (!valid_callsign(p.callsign) ||
        !crypto_p256_validate_public(p.public_key)) return false;

    uint8_t digest[SHA256_SIZE]{};
    const bool authentic = hash_request(p, digest) &&
        crypto_p256_verify_digest(p.public_key, digest, p.signature);
    if (!authentic) {
        secure_zero(digest, sizeof(digest));
        return false; // Forged traffic cannot terminate local pairing.
    }
    if (!candidate_allowed(p.sender_id, p.public_key)) {
        secure_zero(digest, sizeof(digest));
        return false;
    }
    if (candidate.active) {
        const bool same = p.sender_id == candidate.peer_id &&
            crypto_constant_time_equal(candidate.request_hash, digest,
                                       SHA256_SIZE) &&
            crypto_constant_time_equal(candidate.public_key, p.public_key,
                                       P256_PUBLIC_SIZE);
        secure_zero(digest, sizeof(digest));
        if (!same) return false;
        if ((current_state == PairingState::WAIT_FINAL_ACK ||
             current_state == PairingState::PAIRED) && saved_commit.valid)
            return send_frame(saved_commit);
        return send_frame(saved_response);
    }
    if (current_state != PairingState::WINDOW_OPEN) {
        secure_zero(digest, sizeof(digest));
        return false;
    }
    if (!set_candidate(p.sender_id, p.callsign, p.public_key)) {
        secure_zero(digest, sizeof(digest));
        return false;
    }
    std::memcpy(candidate.request_hash, digest, SHA256_SIZE);
    secure_zero(digest, sizeof(digest));

    PairResponsePacket response{};
    if (!build_response(response)) {
        fail(PairingFailure::CRYPTO_ERROR);
        return false;
    }
    if (!store_frame(saved_response, &response, sizeof(response)) ||
        !queue_frame(&response, sizeof(response))) {
        fail(PairingFailure::SEND_ERROR);
        return false;
    }
    current_state = PairingState::WAIT_LOCAL_CONFIRM;
    return true;
}

// =======================================================
// Incoming signed response
// =======================================================
bool process_response(const PairResponsePacket &p) {
    if (!local_is_initiator ||
        (current_state != PairingState::REQUEST_SENT &&
         current_state != PairingState::WAIT_LOCAL_CONFIRM &&
         current_state != PairingState::CONFIRM_SENT &&
         current_state != PairingState::PAIRED)) return false;
    if (p.sender_id == local_id ||
        (expected_peer_id && p.sender_id != expected_peer_id) ||
        !valid_callsign(p.callsign) ||
        !crypto_p256_validate_public(p.public_key) ||
        !crypto_constant_time_equal(p.request_hash,
                                    candidate.request_hash, SHA256_SIZE))
        return false;

    uint8_t digest[SHA256_SIZE]{};
    const bool authentic = hash_response(p, digest) &&
        crypto_p256_verify_digest(p.public_key, digest, p.signature);
    if (!authentic) {
        secure_zero(digest, sizeof(digest));
        return false;
    }
    if (!candidate_allowed(p.sender_id, p.public_key)) {
        secure_zero(digest, sizeof(digest));
        return false;
    }
    if (candidate.active) {
        const bool same = candidate.peer_id == p.sender_id &&
            crypto_constant_time_equal(candidate.response_hash, digest,
                                       SHA256_SIZE) &&
            crypto_constant_time_equal(candidate.public_key, p.public_key,
                                       P256_PUBLIC_SIZE);
        secure_zero(digest, sizeof(digest));
        if (!same) return false;
        if (current_state == PairingState::CONFIRM_SENT && !local_trust_saved)
            return send_frame(pending); // CONFIRM retry after lost frame.
        if (current_state == PairingState::CONFIRM_SENT && local_trust_saved)
            return send_frame(saved_final_ack);
        return true;
    }
    if (current_state != PairingState::REQUEST_SENT) {
        secure_zero(digest, sizeof(digest));
        return false;
    }
    uint8_t request_digest[SHA256_SIZE]{};
    std::memcpy(request_digest, candidate.request_hash, SHA256_SIZE);
    secure_zero(&candidate, sizeof(candidate));
    if (!set_candidate(p.sender_id, p.callsign, p.public_key)) {
        secure_zero(digest, sizeof(digest));
        secure_zero(request_digest, sizeof(request_digest));
        return false;
    }
    std::memcpy(candidate.request_hash, request_digest, SHA256_SIZE);
    std::memcpy(candidate.response_hash, digest, SHA256_SIZE);
    candidate.transcript_ready =
        hash_transcript(candidate.request_hash, candidate.response_hash,
                        candidate.transcript_hash);
    secure_zero(digest, sizeof(digest));
    secure_zero(request_digest, sizeof(request_digest));
    if (!candidate.transcript_ready) {
        fail(PairingFailure::CRYPTO_ERROR);
        return false;
    }
    current_state = PairingState::WAIT_LOCAL_CONFIRM;
    retry_count = 0;
    return true;
}

// =======================================================
// Incoming signed CONFIRM to responder
// =======================================================
bool process_confirm(const PairProofPacket &p) {
    if (local_is_initiator || !verify_proof(p, PairMessageType::CONFIRM))
        return false;
    if ((current_state == PairingState::WAIT_FINAL_ACK ||
         current_state == PairingState::PAIRED) && saved_commit.valid)
        return send_frame(saved_commit);
    if (current_state != PairingState::WAIT_LOCAL_CONFIRM &&
        current_state != PairingState::WAIT_REMOTE_CONFIRM) return false;
    remote_confirm_received = true;
    if (local_confirmed) return send_commit();
    current_state = PairingState::WAIT_LOCAL_CONFIRM;
    return true;
}

// =======================================================
// Incoming signed COMMIT to initiator
// =======================================================
bool process_commit(const PairProofPacket &p) {
    if (!local_is_initiator ||
        (current_state != PairingState::CONFIRM_SENT &&
         current_state != PairingState::PAIRED) ||
        !verify_proof(p, PairMessageType::COMMIT)) return false;

    if (current_state == PairingState::PAIRED)
        return send_frame(saved_final_ack);

    if (!local_confirmed) return false;
    if (!local_trust_saved) {
        PairProofPacket ack{};
        if (!build_proof(PairMessageType::FINAL_ACK, ack) ||
            !store_frame(saved_final_ack, &ack, sizeof(ack))) {
            fail(PairingFailure::CRYPTO_ERROR);
            return false;
        }
        // Fail-closed trust persistence. If the ACK cannot be queued
        // after this write, remain incomplete and retry it. Never claim
        // PAIRED merely because we created or signed an ACK.
        if (!trust_enroll_peer(candidate.peer_id, candidate.callsign,
                               candidate.public_key, true)) {
            fail(PairingFailure::STORAGE_ERROR);
            return false;
        }
        local_trust_saved = true;
    }
    if (!store_frame(pending, saved_final_ack.bytes,
                     saved_final_ack.length)) {
        fail(PairingFailure::CRYPTO_ERROR);
        return false;
    }
    retry_count = 0;
    last_tx_ms = millis();
    if (!send_frame(saved_final_ack)) return false;
    current_state = PairingState::PAIRED;
    current_failure = PairingFailure::NONE;
    return true;
}

// =======================================================
// Incoming signed FINAL_ACK to responder
// =======================================================
bool process_final_ack(const PairProofPacket &p) {
    if (local_is_initiator || current_state != PairingState::WAIT_FINAL_ACK ||
        !candidate.active || !local_confirmed || !remote_confirm_received)
        return false;
    if (!verify_proof(p, PairMessageType::FINAL_ACK)) return false;
    if (!trust_enroll_peer(candidate.peer_id, candidate.callsign,
                           candidate.public_key, true)) {
        fail(PairingFailure::STORAGE_ERROR);
        return false;
    }
    local_trust_saved = true;
    current_state = PairingState::PAIRED;
    current_failure = PairingFailure::NONE;
    // No retransmission is necessary after the FINAL_ACK is verified.
    secure_zero(&pending, sizeof(pending));
    return true;
}

// =======================================================
// Signed aborts; unauthenticated aborts are ignored
// =======================================================
bool process_abort(const PairAbortPacket &p) {
    if (!candidate.active || !candidate.transcript_ready ||
        current_state == PairingState::PAIRED || local_trust_saved ||
        p.sender_id != candidate.peer_id ||
        !crypto_constant_time_equal(p.transcript_hash,
                                    candidate.transcript_hash, SHA256_SIZE))
        return false;
    uint8_t digest[SHA256_SIZE]{};
    const bool ok = hash_proof("GWSSIP-PAIR-ABORT-V1", p.sender_id,
                               p.transcript_hash, digest, p.reason) &&
        crypto_p256_verify_digest(candidate.public_key, digest, p.signature);
    secure_zero(digest, sizeof(digest));
    if (!ok) return false;
    fail(PairingFailure::USER_REJECTED);
    return true;
}

} // anonymous namespace

bool pairing_init(uint8_t local_peer_id, const char *callsign) {
    initialized = false;
    wipe_attempt();
    current_state = PairingState::UNINITIALIZED;
    current_failure = PairingFailure::NOT_READY;
    secure_zero(local_callsign, sizeof(local_callsign));
    local_id = 0;
    if (!local_peer_id || !callsign || !identity_ready() || !trust_ready())
        return false;
    size_t n = 0;
    while (n < MAX_CALLSIGN_LEN && callsign[n] != '\0') ++n;
    if (n == MAX_CALLSIGN_LEN) return false;
    std::memcpy(local_callsign, callsign, n);
    local_id = local_peer_id;
    initialized = true;
    pairing_reset();
    return true;
}

void pairing_set_send_callback(PairingSendCallback callback) {
    send_callback = callback;
}

bool pairing_begin(uint8_t peer, bool locally_authorized) {
    if (!initialized || !identity_ready() || !trust_ready() ||
        !send_callback || peer == local_id) {
        current_failure = PairingFailure::NOT_READY;
        return false;
    }
    if (!locally_authorized) {
        current_failure = PairingFailure::NOT_AUTHORIZED;
        return false;
    }
    pairing_reset();
    local_is_initiator = true;
    expected_peer_id = peer;
    pairing_started_ms = millis();
    PairRequestPacket request{};
    if (!build_request(request)) {
        fail(PairingFailure::CRYPTO_ERROR);
        return false;
    }
    if (!queue_frame(&request, sizeof(request))) {
        fail(PairingFailure::SEND_ERROR);
        return false;
    }
    current_state = PairingState::REQUEST_SENT;
    return true;
}

bool pairing_open_window(uint8_t peer, bool locally_authorized) {
    if (!initialized || !identity_ready() || !trust_ready() ||
        !send_callback || peer == local_id) {
        current_failure = PairingFailure::NOT_READY;
        return false;
    }
    if (!locally_authorized) {
        current_failure = PairingFailure::NOT_AUTHORIZED;
        return false;
    }
    pairing_reset();
    expected_peer_id = peer;
    pairing_started_ms = millis();
    current_state = PairingState::WINDOW_OPEN;
    return true;
}

bool pairing_handle_packet(const uint8_t *data, size_t length) {
    if (!initialized || !data || length < 8 ||
        std::memcmp(data, PAIR_MAGIC, sizeof(PAIR_MAGIC)) != 0)
        return false;
    if (data[4] != PAIRING_PROTOCOL_MAJOR ||
        data[5] != PAIRING_PROTOCOL_MINOR) return false;
    const PairMessageType kind = static_cast<PairMessageType>(data[6]);
    if (!valid_header(data, length, kind)) return false;

    // memcpy avoids alignment/aliasing issues from raw transport buffers.
    switch (kind) {
        case PairMessageType::REQUEST: {
            if (length != sizeof(PairRequestPacket)) return false;
            PairRequestPacket p{};
            std::memcpy(&p, data, sizeof(p));
            return process_request(p);
        }
        case PairMessageType::RESPONSE: {
            if (length != sizeof(PairResponsePacket)) return false;
            PairResponsePacket p{};
            std::memcpy(&p, data, sizeof(p));
            return process_response(p);
        }
        case PairMessageType::CONFIRM:
        case PairMessageType::COMMIT:
        case PairMessageType::FINAL_ACK: {
            if (length != sizeof(PairProofPacket)) return false;
            PairProofPacket p{};
            std::memcpy(&p, data, sizeof(p));
            if (kind == PairMessageType::CONFIRM) return process_confirm(p);
            if (kind == PairMessageType::COMMIT) return process_commit(p);
            return process_final_ack(p);
        }
        case PairMessageType::ABORT: {
            if (length != sizeof(PairAbortPacket)) return false;
            PairAbortPacket p{};
            std::memcpy(&p, data, sizeof(p));
            return process_abort(p);
        }
        default:
            return false;
    }
}

bool pairing_confirm_local(bool locally_authorized) {
    if (!locally_authorized || !candidate.active ||
        !candidate.transcript_ready ||
        (current_state != PairingState::WAIT_LOCAL_CONFIRM &&
         current_state != PairingState::WAIT_REMOTE_CONFIRM)) {
        current_failure = PairingFailure::NOT_AUTHORIZED;
        return false;
    }
    if (local_confirmed) return true;
    local_confirmed = true;
    if (local_is_initiator) {
        PairProofPacket confirm{};
        if (!build_proof(PairMessageType::CONFIRM, confirm)) {
            fail(PairingFailure::CRYPTO_ERROR);
            return false;
        }
        if (!queue_frame(&confirm, sizeof(confirm))) {
            fail(PairingFailure::SEND_ERROR);
            return false;
        }
        current_state = PairingState::CONFIRM_SENT;
        return true;
    }
    if (remote_confirm_received) return send_commit();
    current_state = PairingState::WAIT_REMOTE_CONFIRM;
    return true;
}

void pairing_reject_local(bool locally_authorized) {
    // Once local trust is durably enrolled, canceling pairing requires
    // an explicit locally authorized trust reset, not a transient ABORT.
    if (!locally_authorized || local_trust_saved ||
        current_state == PairingState::PAIRED ||
        current_state == PairingState::IDLE ||
        current_state == PairingState::UNINITIALIZED) return;
    if (candidate.active && candidate.transcript_ready && send_callback) {
        PairAbortPacket p{};
        header(p.magic, p.protocol_major, p.protocol_minor,
               p.message_type, p.sender_id, PairMessageType::ABORT);
        std::memcpy(p.transcript_hash, candidate.transcript_hash, SHA256_SIZE);
        p.reason = static_cast<uint8_t>(PairingFailure::USER_REJECTED);
        uint8_t digest[SHA256_SIZE]{};
        if (hash_proof("GWSSIP-PAIR-ABORT-V1", local_id,
                       p.transcript_hash, digest, p.reason) &&
            identity_sign_digest(digest, p.signature)) {
            send_callback(reinterpret_cast<const uint8_t*>(&p), sizeof(p));
        }
        secure_zero(digest, sizeof(digest));
    }
    fail(PairingFailure::USER_REJECTED);
}

void pairing_loop() {
    if (!initialized || current_state == PairingState::IDLE ||
        current_state == PairingState::UNINITIALIZED ||
        current_state == PairingState::PAIRED ||
        current_state == PairingState::FAILED) return;
    const uint32_t now = millis();
    if (static_cast<uint32_t>(now - pairing_started_ms) >= PAIRING_WINDOW_MS) {
        fail(PairingFailure::TIMEOUT);
        return;
    }
    const bool retry = current_state == PairingState::REQUEST_SENT ||
                       current_state == PairingState::CONFIRM_SENT ||
                       current_state == PairingState::WAIT_FINAL_ACK;
    if (!retry || !pending.valid ||
        static_cast<uint32_t>(now - last_tx_ms) < RETRY_INTERVAL_MS) return;
    // Retry budget is not the approval deadline. The peer may still be
    // comparing the SAS locally; continue accepting a late authenticated
    // COMMIT/FINAL_ACK until the overall pairing window expires.
    if (retry_count >= MAX_PAIRING_RETRIES) return;
    ++retry_count;
    last_tx_ms = now;
    const bool queued = send_frame(pending);
    // If the ACK was already durably enrolled but its initial send
    // failed, remain incomplete and retry until transport accepts it.
    if (queued && current_state == PairingState::CONFIRM_SENT &&
        local_trust_saved && saved_final_ack.valid) {
        current_state = PairingState::PAIRED;
        current_failure = PairingFailure::NONE;
    }
}

PairingState pairing_state() { return current_state; }
PairingFailure pairing_failure() { return current_failure; }

const char *pairing_state_name() {
    switch (current_state) {
        case PairingState::UNINITIALIZED: return "UNINITIALIZED";
        case PairingState::IDLE: return "IDLE";
        case PairingState::WINDOW_OPEN: return "WINDOW OPEN";
        case PairingState::REQUEST_SENT: return "REQUEST SENT";
        case PairingState::WAIT_LOCAL_CONFIRM: return "VERIFY CODE";
        case PairingState::WAIT_REMOTE_CONFIRM: return "WAIT PEER";
        case PairingState::CONFIRM_SENT: return "CONFIRM SENT";
        case PairingState::PAIRED: return "PAIRED";
        case PairingState::FAILED: return "FAILED";
        case PairingState::WAIT_FINAL_ACK: return "WAIT FINAL ACK";
        default: return "UNKNOWN";
    }
}

const char *pairing_failure_name() {
    switch (current_failure) {
        case PairingFailure::NONE: return "NONE";
        case PairingFailure::NOT_READY: return "NOT READY";
        case PairingFailure::NOT_AUTHORIZED: return "NOT AUTHORIZED";
        case PairingFailure::INVALID_PACKET: return "INVALID PACKET";
        case PairingFailure::INVALID_VERSION: return "INVALID VERSION";
        case PairingFailure::INVALID_IDENTITY: return "INVALID IDENTITY";
        case PairingFailure::INVALID_SIGNATURE: return "INVALID SIGNATURE";
        case PairingFailure::UNEXPECTED_PEER: return "UNEXPECTED PEER";
        case PairingFailure::IDENTITY_MISMATCH: return "IDENTITY MISMATCH";
        case PairingFailure::CRYPTO_ERROR: return "CRYPTO ERROR";
        case PairingFailure::STORAGE_ERROR: return "STORAGE ERROR";
        case PairingFailure::SEND_ERROR: return "SEND ERROR";
        case PairingFailure::TIMEOUT: return "TIMEOUT";
        case PairingFailure::USER_REJECTED: return "USER REJECTED";
        case PairingFailure::PEER_REVOKED: return "PEER REVOKED";
        case PairingFailure::FINAL_ACK_INVALID: return "FINAL ACK INVALID";
        default: return "UNKNOWN";
    }
}

bool pairing_has_candidate() {
    return candidate.active && candidate.transcript_ready;
}
uint8_t pairing_candidate_peer_id() {
    return candidate.active ? candidate.peer_id : 0;
}
const char *pairing_candidate_callsign() {
    return candidate.active ? candidate.callsign : "";
}

bool pairing_candidate_fingerprint_hex(char *out, size_t size,
                                       size_t count) {
    if (!out || !size) return false;
    out[0] = '\0';
    if (!candidate.active || !candidate.transcript_ready ||
        !count || count > SHA256_SIZE || size < count * 3) return false;
    size_t pos = 0;
    for (size_t i = 0; i < count; ++i) {
        const int n = std::snprintf(out + pos, size - pos,
                                    i + 1 == count ? "%02X" : "%02X:",
                                    static_cast<unsigned>(candidate.fingerprint[i]));
        if (n != static_cast<int>(i + 1 == count ? 2 : 3)) {
            out[0] = '\0';
            return false;
        }
        pos += static_cast<size_t>(n);
    }
    return true;
}

bool pairing_sas_code(uint32_t &code) {
    code = 0;
    if (!candidate.active || !candidate.transcript_ready) return false;
    const uint8_t *h = candidate.transcript_hash;
    const uint32_t word = (static_cast<uint32_t>(h[0]) << 24) |
                          (static_cast<uint32_t>(h[1]) << 16) |
                          (static_cast<uint32_t>(h[2]) << 8) | h[3];
    code = word % 1000000UL;
    return true;
}

bool pairing_sas_string(char out[7]) {
    if (!out) return false;
    out[0] = '\0';
    uint32_t code = 0;
    if (!pairing_sas_code(code)) return false;
    return std::snprintf(out, 7, "%06lu",
                         static_cast<unsigned long>(code)) == 6;
}

void pairing_reset() {
    wipe_attempt();
    current_failure = PairingFailure::NONE;
    current_state = initialized ? PairingState::IDLE : PairingState::UNINITIALIZED;
}

} // namespace gw
