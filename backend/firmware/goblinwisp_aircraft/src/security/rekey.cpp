#include "gw_rekey.h"

#include "gw_context.h"
#include "gw_crypto.h"
#include "gw_events.h"
#include "gw_handshake.h"
#include "gw_kdf.h"
#include "gw_security_policy.h"
#include "gw_transcript.h"

#include <cstddef>
#include <cstdint>
#include <cstring>

namespace gw {
namespace {

// Version 1.0 wire formats are deliberately preserved. Rekey controls are
// authenticated under the OLD control key (INIT/REPLY) or the NEW confirmation
// key (CONFIRM/COMMIT/ACK). No unauthenticated packet can change session state.
const uint8_t MAGIC[4] = {'G', 'W', 'R', 'K'};
const uint32_t RETRY_INTERVAL_MS = 1000UL;
const size_t MAX_FRAME = 250;

enum class Message : uint8_t { INIT=1, REPLY=2, CONFIRM=3, COMMIT=4, ACK=5 };

#pragma pack(push, 1)
struct Init {
    uint8_t magic[4], major, minor, type, sender, receiver;
    uint8_t sender_side, receiver_side, old_sid[8], old_epoch[4], next_epoch[4];
    uint8_t ephemeral[P256_PUBLIC_SIZE], random[HANDSHAKE_RANDOM_SIZE];
    uint8_t mac[SHA256_SIZE];
};
struct Reply {
    uint8_t magic[4], major, minor, type, sender, receiver;
    uint8_t sender_side, receiver_side, old_sid[8], old_epoch[4], next_epoch[4];
    uint8_t init_hash[SHA256_SIZE], ephemeral[P256_PUBLIC_SIZE];
    uint8_t random[HANDSHAKE_RANDOM_SIZE], mac[SHA256_SIZE];
};
struct Proof {
    uint8_t magic[4], major, minor, type, sender, receiver;
    uint8_t sender_side, receiver_side, old_sid[8], next_sid[8];
    uint8_t old_epoch[4], next_epoch[4], transcript[SHA256_SIZE];
    uint8_t mac[SHA256_SIZE];
};
#pragma pack(pop)

static_assert(sizeof(Init) <= MAX_FRAME, "INIT exceeds ESP-NOW v1 payload");
static_assert(sizeof(Reply) <= MAX_FRAME, "REPLY exceeds ESP-NOW v1 payload");
static_assert(sizeof(Proof) <= MAX_FRAME, "Proof exceeds ESP-NOW v1 payload");
static_assert(offsetof(Init, mac) + SHA256_SIZE == sizeof(Init), "INIT padding");
static_assert(offsetof(Reply, mac) + SHA256_SIZE == sizeof(Reply), "REPLY padding");
static_assert(offsetof(Proof, mac) + SHA256_SIZE == sizeof(Proof), "Proof padding");

bool initialized = false;
uint8_t local_id = 0;
uint8_t default_peer = 0;
uint8_t operation_peer = 0; // At most ONE in-flight rekey in this revision.
DeviceSide local_side = DeviceSide::SIDE_A;
RekeySendCallback legacy_send = nullptr;
RekeyPeerSendCallback peer_send = nullptr;
RekeyState state = RekeyState::UNINITIALIZED;
RekeyFailure failure = RekeyFailure::NONE;
RekeyReason reason = RekeyReason::NONE;
bool initiator = false;
bool installed = false;
uint64_t old_sid = 0;
uint32_t old_epoch = 0;
uint32_t next_epoch = 0;
uint8_t private_ephemeral[P256_PRIVATE_SIZE] = {};
uint8_t public_ephemeral[P256_PUBLIC_SIZE] = {};
uint8_t remote_ephemeral[P256_PUBLIC_SIZE] = {};
uint8_t local_random[HANDSHAKE_RANDOM_SIZE] = {};
uint8_t remote_random[HANDSHAKE_RANDOM_SIZE] = {};
uint8_t init_digest[SHA256_SIZE] = {};
uint8_t transcript[SHA256_SIZE] = {};
SessionSecrets candidate{};
uint8_t last_frame[MAX_FRAME] = {};
size_t last_length = 0;
uint32_t started = 0;
uint32_t last_sent = 0;
uint8_t retries = 0;
uint32_t successes = 0;
uint32_t failures = 0;
// Age is measured from the first observation of an active peer-session epoch.
// comm.cpp must call rekey_loop periodically, including while idle.
bool age_known = false;
uint64_t age_sid = 0;
uint32_t age_epoch = 0;
uint32_t age_started = 0;

uint8_t opposite_side() {
    return local_side == DeviceSide::SIDE_A
        ? uint8_t(DeviceSide::SIDE_B) : uint8_t(DeviceSide::SIDE_A);
}

void be32(uint8_t out[4], uint32_t value) {
    out[0] = uint8_t(value >> 24); out[1] = uint8_t(value >> 16);
    out[2] = uint8_t(value >> 8); out[3] = uint8_t(value);
}
void be64(uint8_t out[8], uint64_t value) {
    for (unsigned i = 0; i < 8; ++i) out[i] = uint8_t(value >> ((7U-i)*8U));
}
uint32_t read32(const uint8_t in[4]) {
    return (uint32_t(in[0]) << 24) | (uint32_t(in[1]) << 16) |
           (uint32_t(in[2]) << 8) | uint32_t(in[3]);
}
uint64_t read64(const uint8_t in[8]) {
    uint64_t x = 0;
    for (unsigned i = 0; i < 8; ++i) x = (x << 8) | uint64_t(in[i]);
    return x;
}

bool equal(const uint8_t *a, const uint8_t *b, size_t n) {
    return crypto_constant_time_equal(a, b, n);
}
bool valid_version(const uint8_t *p) {
    return p[4] == PROTOCOL_MAJOR && p[5] == PROTOCOL_MINOR;
}

bool peer_session(uint8_t peer, const SessionSecrets *&out) {
    out = handshake_active_session_for_peer(peer);
    return peer != 0 && out && out->active && out->session_id != 0 &&
           out->key_epoch != 0 && security_suite_implemented(out->suite);
}

// Use a peer-specific callback whenever available. Legacy transport is safe
// ONLY with exactly one authenticated active peer, equal to default_peer.
bool can_send(uint8_t peer) {
    if (peer_send) return true;
    return legacy_send && peer == default_peer &&
           handshake_active_peer_count() == 1 &&
           handshake_session_ready_for_peer(peer);
}
bool transmit(uint8_t peer, const uint8_t *frame, size_t length) {
    if (!frame || !length || length > MAX_FRAME || !can_send(peer)) return false;
    return peer_send ? peer_send(peer, frame, length) : legacy_send(frame, length);
}
bool cache_and_send(uint8_t peer, const void *packet, size_t length) {
    if (!packet || !length || length > sizeof(last_frame)) return false;
    std::memcpy(last_frame, packet, length);
    last_length = length;
    last_sent = millis();
    retries = 0;
    return transmit(peer, last_frame, last_length);
}
bool resend() {
    if (!operation_peer || !last_length) return false;
    last_sent = millis();
    return transmit(operation_peer, last_frame, last_length);
}

void wipe_operation() {
    context_destroy_session(candidate);
    secure_zero(private_ephemeral, sizeof(private_ephemeral));
    secure_zero(public_ephemeral, sizeof(public_ephemeral));
    secure_zero(remote_ephemeral, sizeof(remote_ephemeral));
    secure_zero(local_random, sizeof(local_random));
    secure_zero(remote_random, sizeof(remote_random));
    secure_zero(init_digest, sizeof(init_digest));
    secure_zero(transcript, sizeof(transcript));
    secure_zero(last_frame, sizeof(last_frame));
    last_length = 0; old_sid = 0; old_epoch = next_epoch = 0;
    started = last_sent = 0; retries = 0;
    operation_peer = 0; initiator = installed = false;
}

bool operation_in_progress() {
    return state == RekeyState::INIT_SENT ||
           state == RekeyState::WAIT_CONFIRM ||
           state == RekeyState::CONFIRM_SENT ||
           state == RekeyState::COMMIT_SENT ||
           state == RekeyState::ACK_SENT;
}

void invalidate(RekeyFailure why) {
    const uint8_t affected = operation_peer;
    // Once a rekey began, neither endpoint may safely assume what epoch
    // the remote device retained after timeout, send failure or local reset.
    // Remove the entire affected session, not just the pending material.
    if (affected) handshake_reset_peer(affected);
    wipe_operation();
    state = RekeyState::INVALIDATED;
    failure = why;
    reason = RekeyReason::NONE;
    ++failures;
    gw_logf(LogLevel::ERROR, "REKEY", "Session invalidated (%s)",
            rekey_failure_name());
}

void reset_without_invalidation() {
    wipe_operation();
    reason = RekeyReason::NONE;
    failure = RekeyFailure::NONE;
    state = initialized ? RekeyState::IDLE : RekeyState::UNINITIALIZED;
}

void header(uint8_t magic[4], uint8_t &major, uint8_t &minor,
            uint8_t &type, Message kind) {
    std::memcpy(magic, MAGIC, sizeof(MAGIC));
    major = PROTOCOL_MAJOR; minor = PROTOCOL_MINOR; type = uint8_t(kind);
}

bool old_hmac(uint8_t peer, const uint8_t *bytes, size_t n,
              uint8_t out[SHA256_SIZE]) {
    const SessionSecrets *s = nullptr;
    return peer_session(peer, s) &&
           crypto_hmac_sha256(s->control_key, AES256_KEY_SIZE, bytes, n, out);
}

template<typename T>
bool verify_old(const T &packet, uint8_t peer) {
    uint8_t expected[SHA256_SIZE] = {};
    const bool ok = old_hmac(peer, reinterpret_cast<const uint8_t*>(&packet),
                             offsetof(T, mac), expected) &&
                    equal(expected, packet.mac, SHA256_SIZE);
    secure_zero(expected, sizeof(expected));
    return ok;
}

template<typename T>
bool sign_old(T &packet, uint8_t peer) {
    return old_hmac(peer, reinterpret_cast<const uint8_t*>(&packet),
                    offsetof(T, mac), packet.mac);
}

bool proof_mac(const Proof &packet, uint8_t out[SHA256_SIZE]) {
    return candidate.active &&
           crypto_hmac_sha256(candidate.confirmation_key, AES256_KEY_SIZE,
                              reinterpret_cast<const uint8_t*>(&packet),
                              offsetof(Proof, mac), out);
}
bool verify_proof(const Proof &packet) {
    uint8_t expected[SHA256_SIZE] = {};
    const bool ok = proof_mac(packet, expected) &&
                    equal(expected, packet.mac, SHA256_SIZE);
    secure_zero(expected, sizeof(expected));
    return ok;
}

bool binds_sender(uint8_t sender, uint8_t receiver,
                  uint8_t sender_side, uint8_t receiver_side,
                  uint8_t peer) {
    return sender == peer && receiver == local_id &&
           sender_side == opposite_side() &&
           receiver_side == uint8_t(local_side);
}

bool binds_old(uint64_t sid, uint32_t prior, uint32_t upcoming,
               const SessionSecrets &active) {
    return sid == active.session_id && prior == active.key_epoch &&
           active.key_epoch != UINT32_MAX && upcoming == prior + 1;
}

bool make_transcript() {
    // Canonical construction is byte-for-byte compatible with rekey v1.0.
    static const char DOMAIN[] = "GWSSIP-REKEY-TRANSCRIPT-V1";
    uint8_t previous[SHA256_SIZE] = {};
    if (!handshake_copy_transcript_hash_for_peer(operation_peer, previous))
        return false;
    uint8_t bytes[384] = {};
    size_t pos = 0;
    const auto append = [&](const void *ptr, size_t n) -> bool {
        if (!ptr || n > sizeof(bytes) - pos) return false;
        std::memcpy(bytes + pos, ptr, n); pos += n;
        return true;
    };
    uint8_t sid_bytes[8], prior_bytes[4], upcoming_bytes[4];
    be64(sid_bytes, old_sid); be32(prior_bytes, old_epoch);
    be32(upcoming_bytes, next_epoch);
    const uint8_t initiator_id = initiator ? local_id : operation_peer;
    const uint8_t responder_id = initiator ? operation_peer : local_id;
    const uint8_t initiator_side = initiator ? uint8_t(local_side) : opposite_side();
    const uint8_t responder_side = initiator ? opposite_side() : uint8_t(local_side);
    const uint8_t *a_pub = initiator ? public_ephemeral : remote_ephemeral;
    const uint8_t *b_pub = initiator ? remote_ephemeral : public_ephemeral;
    const uint8_t *a_rnd = initiator ? local_random : remote_random;
    const uint8_t *b_rnd = initiator ? remote_random : local_random;
    const bool built =
        append(DOMAIN, sizeof(DOMAIN)-1) &&
        append(previous, SHA256_SIZE) && append(sid_bytes, sizeof(sid_bytes)) &&
        append(prior_bytes, sizeof(prior_bytes)) &&
        append(upcoming_bytes, sizeof(upcoming_bytes)) &&
        append(&initiator_id, 1) && append(&responder_id, 1) &&
        append(&initiator_side, 1) && append(&responder_side, 1) &&
        append(a_pub, P256_PUBLIC_SIZE) && append(b_pub, P256_PUBLIC_SIZE) &&
        append(a_rnd, HANDSHAKE_RANDOM_SIZE) && append(b_rnd, HANDSHAKE_RANDOM_SIZE);
    const bool ok = built && crypto_sha256(bytes, pos, transcript);
    secure_zero(previous, sizeof(previous)); secure_zero(bytes, sizeof(bytes));
    secure_zero(sid_bytes, sizeof(sid_bytes));
    secure_zero(prior_bytes, sizeof(prior_bytes));
    secure_zero(upcoming_bytes, sizeof(upcoming_bytes));
    return ok;
}

bool derive() {
    const SessionSecrets *s = nullptr;
    if (!peer_session(operation_peer, s) || old_sid != s->session_id ||
        old_epoch != s->key_epoch || old_epoch == UINT32_MAX ||
        next_epoch != old_epoch + 1 ||
        !crypto_p256_validate_public(public_ephemeral) ||
        !crypto_p256_validate_public(remote_ephemeral) ||
        !make_transcript()) return false;
    uint8_t shared[SHA256_SIZE] = {};
    if (!crypto_p256_ecdh(private_ephemeral, remote_ephemeral, shared)) {
        secure_zero(shared, sizeof(shared)); return false;
    }
    context_destroy_session(candidate);
    const bool ok = kdf_derive_rekeyed_session(shared, transcript, old_sid,
                                                next_epoch, s->suite, candidate) &&
                    candidate.active && candidate.key_epoch == next_epoch &&
                    candidate.session_id != old_sid &&
                    candidate.suite == s->suite;
    secure_zero(shared, sizeof(shared));
    secure_zero(private_ephemeral, sizeof(private_ephemeral));
    if (!ok) context_destroy_session(candidate);
    return ok;
}

bool build_proof(Message kind, Proof &p) {
    if (!candidate.active || !operation_peer) return false;
    std::memset(&p, 0, sizeof(p));
    header(p.magic, p.major, p.minor, p.type, kind);
    p.sender = local_id; p.receiver = operation_peer;
    p.sender_side = uint8_t(local_side); p.receiver_side = opposite_side();
    be64(p.old_sid, old_sid); be64(p.next_sid, candidate.session_id);
    be32(p.old_epoch, old_epoch); be32(p.next_epoch, next_epoch);
    std::memcpy(p.transcript, transcript, SHA256_SIZE);
    return proof_mac(p, p.mac);
}

bool proof_binding(const Proof &p) {
    return p.major == PROTOCOL_MAJOR && p.minor == PROTOCOL_MINOR &&
           p.sender == operation_peer && p.receiver == local_id &&
           p.sender_side == opposite_side() &&
           p.receiver_side == uint8_t(local_side) &&
           read64(p.old_sid) == old_sid &&
           read64(p.next_sid) == candidate.session_id &&
           read32(p.old_epoch) == old_epoch &&
           read32(p.next_epoch) == next_epoch &&
           equal(p.transcript, transcript, SHA256_SIZE) &&
           verify_proof(p);
}

void header_init(Init &p) {
    std::memset(&p, 0, sizeof(p));
    header(p.magic, p.major, p.minor, p.type, Message::INIT);
    p.sender = local_id; p.receiver = operation_peer;
    p.sender_side = uint8_t(local_side); p.receiver_side = opposite_side();
    be64(p.old_sid, old_sid); be32(p.old_epoch, old_epoch);
    be32(p.next_epoch, next_epoch);
    std::memcpy(p.ephemeral, public_ephemeral, P256_PUBLIC_SIZE);
    std::memcpy(p.random, local_random, HANDSHAKE_RANDOM_SIZE);
}

bool valid_common(const uint8_t *p, size_t n, uint8_t expected_peer) {
    // Sender has already been identified by the trusted link adapter; do
    // not use a packet's self-asserted ID to select a different peer.
    return n >= 9 && valid_version(p) &&
           p[7] == expected_peer && p[8] == local_id;
}

void handle_init(const Init &p, uint8_t peer) {
    const SessionSecrets *active = nullptr;
    if (!peer_session(peer, active) ||
        !binds_sender(p.sender, p.receiver, p.sender_side, p.receiver_side, peer) ||
        !binds_old(read64(p.old_sid), read32(p.old_epoch),
                   read32(p.next_epoch), *active) ||
        !verify_old(p, peer)) return;
    if (!crypto_p256_validate_public(p.ephemeral)) return;
    uint8_t digest[SHA256_SIZE] = {};
    if (!crypto_sha256(reinterpret_cast<const uint8_t*>(&p), sizeof(p), digest)) {
        secure_zero(digest, sizeof(digest)); return;
    }
    if (operation_in_progress()) {
        if (operation_peer != peer) { secure_zero(digest, sizeof(digest)); return; }
        if (state == RekeyState::WAIT_CONFIRM && !initiator &&
            equal(init_digest, digest, SHA256_SIZE)) {
            secure_zero(digest, sizeof(digest));
            (void)resend(); // Cached authenticated REPLY.
            return;
        }
        if (state == RekeyState::INIT_SENT && initiator) {
            // Both tried simultaneously. The lower peer ID owns INIT.
            if (local_id < peer) { secure_zero(digest, sizeof(digest)); return; }
            wipe_operation(); // Yield; no session has been switched yet.
        } else { secure_zero(digest, sizeof(digest)); return; }
    }
    if (state != RekeyState::IDLE && state != RekeyState::INIT_SENT) {
        secure_zero(digest, sizeof(digest)); return;
    }
    wipe_operation();
    operation_peer = peer; initiator = false;
    reason = RekeyReason::PEER_REQUEST;
    old_sid = active->session_id; old_epoch = active->key_epoch;
    next_epoch = old_epoch + 1;
    std::memcpy(init_digest, digest, SHA256_SIZE);
    std::memcpy(remote_ephemeral, p.ephemeral, P256_PUBLIC_SIZE);
    std::memcpy(remote_random, p.random, HANDSHAKE_RANDOM_SIZE);
    secure_zero(digest, sizeof(digest));
    started = millis();
    if (!crypto_p256_generate_keypair(private_ephemeral, public_ephemeral) ||
        !crypto_random(local_random, sizeof(local_random))) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return;
    }
    Reply reply{};
    header(reply.magic, reply.major, reply.minor, reply.type, Message::REPLY);
    reply.sender = local_id; reply.receiver = operation_peer;
    reply.sender_side = uint8_t(local_side); reply.receiver_side = opposite_side();
    be64(reply.old_sid, old_sid); be32(reply.old_epoch, old_epoch);
    be32(reply.next_epoch, next_epoch);
    std::memcpy(reply.init_hash, init_digest, SHA256_SIZE);
    std::memcpy(reply.ephemeral, public_ephemeral, P256_PUBLIC_SIZE);
    std::memcpy(reply.random, local_random, HANDSHAKE_RANDOM_SIZE);
    if (!sign_old(reply, peer) || !derive()) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return;
    }
    state = RekeyState::WAIT_CONFIRM;
    failure = RekeyFailure::NONE;
    if (!cache_and_send(peer, &reply, sizeof(reply)))
        invalidate(RekeyFailure::SEND_ERROR);
}

void handle_reply(const Reply &p, uint8_t peer) {
    if (peer != operation_peer || !initiator ||
        (state != RekeyState::INIT_SENT && state != RekeyState::CONFIRM_SENT)) return;
    if (!binds_sender(p.sender, p.receiver, p.sender_side, p.receiver_side, peer) ||
        read64(p.old_sid) != old_sid || read32(p.old_epoch) != old_epoch ||
        read32(p.next_epoch) != next_epoch ||
        !equal(p.init_hash, init_digest, SHA256_SIZE) ||
        !verify_old(p, peer)) return;
    if (state == RekeyState::CONFIRM_SENT) {
        (void)resend(); // Cached authenticated CONFIRM.
        return;
    }
    if (!crypto_p256_validate_public(p.ephemeral)) return;
    std::memcpy(remote_ephemeral, p.ephemeral, P256_PUBLIC_SIZE);
    std::memcpy(remote_random, p.random, HANDSHAKE_RANDOM_SIZE);
    if (!derive()) { invalidate(RekeyFailure::CRYPTO_ERROR); return; }
    Proof confirm{};
    if (!build_proof(Message::CONFIRM, confirm)) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return;
    }
    state = RekeyState::CONFIRM_SENT;
    if (!cache_and_send(peer, &confirm, sizeof(confirm)))
        invalidate(RekeyFailure::SEND_ERROR);
}

void handle_confirm(const Proof &p, uint8_t peer) {
    if (peer != operation_peer || initiator ||
        (state != RekeyState::WAIT_CONFIRM && state != RekeyState::COMMIT_SENT)) return;
    if (!candidate.active || !proof_binding(p)) return;
    if (state == RekeyState::COMMIT_SENT) {
        (void)resend(); // Cached COMMIT; already installed new epoch.
        return;
    }
    Proof commit{};
    if (!build_proof(Message::COMMIT, commit)) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return;
    }
    // The current peer session still holds the old keys. Install the new
    // epoch only after a verified CONFIRM and complete authenticated COMMIT.
    if (!handshake_replace_peer_session(peer, candidate)) {
        invalidate(RekeyFailure::SESSION_INVALIDATED); return;
    }
    installed = true;
    state = RekeyState::COMMIT_SENT;
    if (!cache_and_send(peer, &commit, sizeof(commit)))
        invalidate(RekeyFailure::SEND_ERROR);
}

void handle_commit(const Proof &p, uint8_t peer) {
    if (peer != operation_peer || !initiator ||
        (state != RekeyState::CONFIRM_SENT && state != RekeyState::ACK_SENT)) return;
    if (!candidate.active || !proof_binding(p)) return;
    if (state == RekeyState::ACK_SENT) {
        (void)resend(); // Cached ACK for retransmitted authenticated COMMIT.
        return;
    }
    Proof ack{};
    if (!build_proof(Message::ACK, ack)) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return;
    }
    if (!handshake_replace_peer_session(peer, candidate)) {
        invalidate(RekeyFailure::SESSION_INVALIDATED); return;
    }
    installed = true;
    state = RekeyState::ACK_SENT;
    ++successes; // Initiator has authenticated the COMMIT and switched epoch.
    if (!cache_and_send(peer, &ack, sizeof(ack)))
        invalidate(RekeyFailure::SEND_ERROR);
}

void handle_ack(const Proof &p, uint8_t peer) {
    if (peer != operation_peer || initiator || state != RekeyState::COMMIT_SENT ||
        !candidate.active || !proof_binding(p)) return;
    ++successes;
    gw_logf(LogLevel::SUCCESS, "REKEY", "Peer %u epoch %lu complete",
            unsigned(peer), static_cast<unsigned long>(next_epoch));
    reset_without_invalidation();
}

void dispatch(uint8_t peer, const uint8_t *data, size_t length) {
    switch (Message(data[6])) {
        case Message::INIT:
            if (length == sizeof(Init)) {
                Init p{}; std::memcpy(&p, data, sizeof(p));
                handle_init(p, peer); secure_zero(&p, sizeof(p));
            }
            break;
        case Message::REPLY:
            if (length == sizeof(Reply)) {
                Reply p{}; std::memcpy(&p, data, sizeof(p));
                handle_reply(p, peer); secure_zero(&p, sizeof(p));
            }
            break;
        case Message::CONFIRM:
        case Message::COMMIT:
        case Message::ACK:
            if (length == sizeof(Proof)) {
                Proof p{}; std::memcpy(&p, data, sizeof(p));
                switch (Message(data[6])) {
                    case Message::CONFIRM: handle_confirm(p, peer); break;
                    case Message::COMMIT: handle_commit(p, peer); break;
                    case Message::ACK: handle_ack(p, peer); break;
                    default: break;
                }
                secure_zero(&p, sizeof(p));
            }
            break;
        default: break;
    }
}

} // namespace

bool rekey_init(uint8_t local_peer_id, uint8_t trusted_peer_id, DeviceSide side) {
    // Reinitializing during a partially installed epoch requires session
    // invalidation; it is never equivalent to an innocuous transient reset.
    if (operation_in_progress()) invalidate(RekeyFailure::SESSION_INVALIDATED);
    else wipe_operation();
    initialized = false;
    if (!local_peer_id || !trusted_peer_id || local_peer_id == trusted_peer_id ||
        (side != DeviceSide::SIDE_A && side != DeviceSide::SIDE_B) ||
        side != handshake_local_side()) {
        state = RekeyState::UNINITIALIZED; failure = RekeyFailure::NOT_READY;
        return false;
    }
    local_id = local_peer_id;
    default_peer = trusted_peer_id;
    local_side = side;
    initialized = true;
    age_known = false;
    reset_without_invalidation();
    return true;
}

void rekey_set_send_callback(RekeySendCallback cb) { legacy_send = cb; }
void rekey_set_peer_send_callback(RekeyPeerSendCallback cb) { peer_send = cb; }

bool rekey_request_for_peer(uint8_t trusted_peer, RekeyReason why) {
    if (!initialized || !trusted_peer || trusted_peer == local_id ||
        why == RekeyReason::NONE || why == RekeyReason::PEER_REQUEST) {
        failure = RekeyFailure::POLICY_DENIED; return false;
    }
    if (state != RekeyState::IDLE) {
        failure = RekeyFailure::BUSY; return false;
    }
    const SessionSecrets *active = nullptr;
    if (!peer_session(trusted_peer, active)) {
        failure = RekeyFailure::NOT_READY; return false;
    }
    if (active->key_epoch == UINT32_MAX) {
        failure = RekeyFailure::INVALID_EPOCH; return false;
    }
    if (!can_send(trusted_peer)) {
        failure = RekeyFailure::TRANSPORT_MISMATCH; return false;
    }
    wipe_operation();
    operation_peer = trusted_peer;
    initiator = true; reason = why;
    old_sid = active->session_id; old_epoch = active->key_epoch;
    next_epoch = old_epoch + 1;
    started = millis();
    if (!crypto_p256_generate_keypair(private_ephemeral, public_ephemeral) ||
        !crypto_random(local_random, sizeof(local_random))) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return false;
    }
    Init p{};
    header_init(p);
    if (!sign_old(p, trusted_peer) ||
        !crypto_sha256(reinterpret_cast<const uint8_t*>(&p),
                       sizeof(p), init_digest)) {
        invalidate(RekeyFailure::CRYPTO_ERROR); return false;
    }
    state = RekeyState::INIT_SENT;
    failure = RekeyFailure::NONE;
    if (!cache_and_send(trusted_peer, &p, sizeof(p))) {
        invalidate(RekeyFailure::SEND_ERROR); return false;
    }
    return true;
}
bool rekey_request(RekeyReason why) {
    return rekey_request_for_peer(default_peer, why);
}

bool rekey_handle_peer_packet(uint8_t transport_peer,
                              const uint8_t *data, size_t length) {
    if (!data || length < 4 || std::memcmp(data, MAGIC, sizeof(MAGIC)) != 0)
        return false;
    // Consume all matching-magic rekey frames. No malformed or unsolicited
    // packet may invalidate an established authenticated session.
    if (!initialized || length < 9 || length > MAX_FRAME ||
        !valid_version(data) || !transport_peer ||
        !valid_common(data, length, transport_peer)) return true;
    if (operation_in_progress() && operation_peer != transport_peer) return true;
    const SessionSecrets *active = nullptr;
    if (!peer_session(transport_peer, active)) return true;
    dispatch(transport_peer, data, length);
    return true;
}

bool rekey_handle_packet(const uint8_t *data, size_t length) {
    if (!data || length < 4 || std::memcmp(data, MAGIC, sizeof(MAGIC)) != 0)
        return false;
    // Legacy callback cannot identify the physical peer in a multi-peer
    // configuration. Require precisely one live peer and the configured ID.
    if (handshake_active_peer_count() != 1 || !default_peer ||
        !handshake_session_ready_for_peer(default_peer)) return true;
    return rekey_handle_peer_packet(default_peer, data, length);
}

void rekey_loop() {
    if (!initialized) return;
    if (operation_in_progress()) {
        if (!handshake_session_ready_for_peer(operation_peer)) {
            invalidate(RekeyFailure::SESSION_INVALIDATED); return;
        }
        const uint32_t now = millis();
        if (state == RekeyState::ACK_SENT) {
            // Retain pending proof/ACK for the responder's retransmission
            // window. Cached authenticated ACK can be sent on COMMIT retry.
            if (uint32_t(now - started) >= REKEY_TIMEOUT_MS) {
                reset_without_invalidation();
            }
            return;
        }
        if (uint32_t(now - started) >= REKEY_TIMEOUT_MS) {
            invalidate(RekeyFailure::TIMEOUT); return;
        }
        if (uint32_t(now - last_sent) < RETRY_INTERVAL_MS) return;
        if (retries >= REKEY_MAX_RETRIES || !resend()) {
            invalidate(retries >= REKEY_MAX_RETRIES
                       ? RekeyFailure::TIMEOUT : RekeyFailure::SEND_ERROR);
            return;
        }
        ++retries;
        return;
    }
    if (state != RekeyState::IDLE) return;
    const SessionSecrets *s = nullptr;
    if (!peer_session(default_peer, s)) {
        age_known = false; return;
    }
    const uint32_t now = millis();
    if (!age_known || age_sid != s->session_id || age_epoch != s->key_epoch) {
        age_known = true; age_sid = s->session_id;
        age_epoch = s->key_epoch; age_started = now;
    }
    const DirectionalContext *tx = context_tx(*s, local_side);
    const DirectionalContext *rx = context_rx(*s, local_side);
    if (!tx || !rx || !tx->active || !rx->active) return;
    if (!counter_allows_next_packet(tx->tx_counter)) {
        // Even if rekey initiation cannot send, traffic must be stopped by
        // comm.cpp using the same counter ceiling from policy.
        (void)rekey_request(RekeyReason::COUNTER_LIMIT);
    } else if (tx->tx_counter >= REKEY_PACKET_THRESHOLD ||
               (rx->replay.initialized &&
                rx->replay.highest_counter >= REKEY_PACKET_THRESHOLD)) {
        (void)rekey_request(RekeyReason::PACKET_THRESHOLD);
    } else if (uint32_t(now - age_started) >= SESSION_MAX_AGE_MS) {
        (void)rekey_request(RekeyReason::SESSION_AGE);
    }
}

void rekey_reset() {
    if (operation_in_progress()) {
        invalidate(RekeyFailure::SESSION_INVALIDATED); return;
    }
    reset_without_invalidation();
}
void rekey_reset_peer(uint8_t trusted_peer) {
    if (trusted_peer && trusted_peer == operation_peer) rekey_reset();
}
bool rekey_busy() { return operation_in_progress(); }
bool rekey_busy_for_peer(uint8_t peer) {
    return peer != 0 && peer == operation_peer && operation_in_progress();
}
bool rekey_blocks_application_data_for_peer(uint8_t peer) {
    if (!peer) return true;
    if (peer == operation_peer && operation_in_progress()) return true;
    // A failed/invalidated session must never authorize traffic; use the
    // peer-aware handshake readiness as the secondary mandatory gate.
    return !handshake_session_ready_for_peer(peer);
}
RekeyState rekey_state() { return state; }
const char *rekey_state_name() {
    switch (state) {
        case RekeyState::UNINITIALIZED: return "UNINITIALIZED";
        case RekeyState::IDLE: return "IDLE";
        case RekeyState::INIT_SENT: return "INIT SENT";
        case RekeyState::WAIT_CONFIRM: return "WAIT CONFIRM";
        case RekeyState::CONFIRM_SENT: return "CONFIRM SENT";
        case RekeyState::COMMIT_SENT: return "COMMIT SENT";
        case RekeyState::ACK_SENT: return "ACK SENT";
        case RekeyState::FAILED: return "FAILED";
        case RekeyState::INVALIDATED: return "INVALIDATED";
        default: return "UNKNOWN";
    }
}
RekeyFailure rekey_failure() { return failure; }
const char *rekey_failure_name() {
    switch (failure) {
        case RekeyFailure::NONE: return "NONE";
        case RekeyFailure::NOT_READY: return "NOT READY";
        case RekeyFailure::BUSY: return "BUSY";
        case RekeyFailure::INVALID_PACKET: return "INVALID PACKET";
        case RekeyFailure::WRONG_PEER: return "WRONG PEER";
        case RekeyFailure::WRONG_SESSION: return "WRONG SESSION";
        case RekeyFailure::AUTH_FAILED: return "AUTH FAILED";
        case RekeyFailure::CRYPTO_ERROR: return "CRYPTO ERROR";
        case RekeyFailure::SEND_ERROR: return "SEND ERROR";
        case RekeyFailure::TIMEOUT: return "TIMEOUT";
        case RekeyFailure::PEER_REVOKED: return "PEER REVOKED";
        case RekeyFailure::UNSUPPORTED_SUITE: return "UNSUPPORTED SUITE";
        case RekeyFailure::INVALID_EPOCH: return "INVALID EPOCH";
        case RekeyFailure::COUNTER_EXHAUSTED: return "COUNTER EXHAUSTED";
        case RekeyFailure::TRANSPORT_MISMATCH: return "TRANSPORT MISMATCH";
        case RekeyFailure::SESSION_INVALIDATED: return "SESSION INVALIDATED";
        case RekeyFailure::POLICY_DENIED: return "POLICY DENIED";
        default: return "UNKNOWN";
    }
}
RekeyReason rekey_reason() { return reason; }
const char *rekey_reason_name() {
    switch (reason) {
        case RekeyReason::NONE: return "NONE";
        case RekeyReason::MANUAL: return "MANUAL";
        case RekeyReason::SESSION_AGE: return "AGE";
        case RekeyReason::PACKET_THRESHOLD: return "PACKETS";
        case RekeyReason::COUNTER_LIMIT: return "COUNTER";
        case RekeyReason::PEER_REQUEST: return "PEER";
        default: return "UNKNOWN";
    }
}
uint32_t rekey_success_count() { return successes; }
uint32_t rekey_failure_count() { return failures; }

} // namespace gw
