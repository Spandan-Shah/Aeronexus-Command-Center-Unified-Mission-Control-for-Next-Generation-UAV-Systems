#include "gw_handshake.h"

#include "gw_agreement.h"
#include "gw_context.h"
#include "gw_crypto.h"
#include "gw_identity.h"
#include "gw_kdf.h"
#include "gw_security_policy.h"
#include "gw_transcript.h"
#include "gw_trust.h"

#include <cstddef>
#include <cstdint>
#include <cstring>

namespace gw {
namespace {

// Protocol v1.1: retain 207/239-byte signed wire layouts, but upgrade
// the key agreement to authenticated triple-DH. Reject v1.0 handshakes.
// All participating devices must be upgraded together.
static const uint8_t MAGIC[4] = {'G', 'W', 'H', 'S'};
static const SecuritySuite SUITE =
    SecuritySuite::P256_HKDF_SHA256_AES256_GCM;
static const uint32_t SUPPORTED = GW_HANDSHAKE_BASELINE_CAPABILITIES;
static const uint32_t REQUIRED = GW_HANDSHAKE_REQUIRED_CAPABILITIES;
static const uint32_t RETRY_INTERVAL_MS = 1000UL;
static const size_t MAX_WIRE_PACKET = 250;

enum class Message : uint8_t {
    HELLO = 1, REPLY = 2, CONFIRM_A = 3, CONFIRM_B = 4, ABORT = 5
};

#pragma pack(push, 1)
struct Hello {
    uint8_t magic[4], major, minor, type, sender;
    uint8_t suite[2], capabilities[4];
    uint8_t identity_fp[SHA256_SIZE];
    uint8_t ephemeral[P256_PUBLIC_SIZE];
    uint8_t random[HANDSHAKE_RANDOM_SIZE];
    uint8_t signature[P256_SIGNATURE_SIZE];
};
struct Reply {
    uint8_t magic[4], major, minor, type, sender;
    uint8_t suite[2], capabilities[4];
    uint8_t hello_hash[SHA256_SIZE];
    uint8_t identity_fp[SHA256_SIZE];
    uint8_t ephemeral[P256_PUBLIC_SIZE];
    uint8_t random[HANDSHAKE_RANDOM_SIZE];
    uint8_t signature[P256_SIGNATURE_SIZE];
};
struct Confirm {
    uint8_t magic[4], major, minor, type, sender;
    uint8_t sid[8], epoch[4], transcript[SHA256_SIZE];
    uint8_t mac[SHA256_SIZE];
};
#pragma pack(pop)

static_assert(sizeof(Hello) == 207, "Handshake HELLO v1.1 layout changed");
static_assert(sizeof(Reply) == 239, "Handshake REPLY v1.1 layout changed");
static_assert(sizeof(Confirm) == 84, "Handshake CONFIRM v1.1 layout changed");
static_assert(sizeof(Reply) <= MAX_WIRE_PACKET, "Handshake packet too large");
static_assert((SUPPORTED & REQUIRED) == REQUIRED &&
              (SUPPORTED & ~(REQUIRED | GW_CAP_REKEY)) == 0,
              "Unsupported handshake capability advertised");

// Each established peer owns its own keys, nonce bases, counters, replay
// windows, and transcript. Establishment is serialized, but independent
// established peer sessions can coexist for peer-aware comm integration.
struct ActivePeer : PeerSessionSlot {
    Confirm responder_confirmation = {};
    bool responder_confirmation_valid = false;
};

struct Pending {
    bool valid = false;
    bool initiator = false;
    uint8_t peer_id = 0;
    PeerRecord trusted_peer = {};
    uint8_t local_fp[SHA256_SIZE] = {};
    uint8_t remote_fp[SHA256_SIZE] = {};
    uint8_t private_key[P256_PRIVATE_SIZE] = {};
    uint8_t local_ephemeral[P256_PUBLIC_SIZE] = {};
    uint8_t remote_ephemeral[P256_PUBLIC_SIZE] = {};
    uint8_t local_random[HANDSHAKE_RANDOM_SIZE] = {};
    uint8_t remote_random[HANDSHAKE_RANDOM_SIZE] = {};
    uint8_t hello_hash[SHA256_SIZE] = {};
    uint8_t reply_hash[SHA256_SIZE] = {};
    uint8_t transcript[SHA256_SIZE] = {};
    uint32_t offered = 0;
    uint32_t negotiated = 0;
    SecuritySuite suite = SecuritySuite::NONE;
    SessionSecrets candidate = {};
    bool derived = false;
};

static bool initialized = false;
static uint8_t local_id = 0;
static DeviceSide local_side = DeviceSide::SIDE_A;
static HandshakeSendCallback legacy_sender = nullptr;
static HandshakePeerSendCallback peer_sender = nullptr;
static HandshakeState state = HandshakeState::UNINITIALIZED;
static HandshakeFailure failure = HandshakeFailure::NONE;
static ActivePeer active[MAX_ACTIVE_PEERS] = {};
static Pending pending = {};
static Hello last_hello = {};
static Reply last_reply = {};
static Confirm last_confirm = {};
static bool last_hello_ok = false;
static bool last_reply_ok = false;
static bool last_confirm_ok = false;
static uint32_t started = 0;
static uint32_t last_sent = 0;
static uint8_t retries = 0;

void be16(uint8_t *out, uint16_t n) {
    out[0] = uint8_t(n >> 8); out[1] = uint8_t(n);
}
void be32(uint8_t *out, uint32_t n) {
    for (int i = 3; i >= 0; --i) { out[i] = uint8_t(n); n >>= 8; }
}
void be64(uint8_t *out, uint64_t n) {
    for (int i = 7; i >= 0; --i) { out[i] = uint8_t(n); n >>= 8; }
}
uint16_t rd16(const uint8_t *in) {
    return uint16_t((uint16_t(in[0]) << 8) | in[1]);
}
uint32_t rd32(const uint8_t *in) {
    uint32_t n = 0; for (unsigned i = 0; i < 4; ++i) n = (n << 8) | in[i];
    return n;
}
uint64_t rd64(const uint8_t *in) {
    uint64_t n = 0; for (unsigned i = 0; i < 8; ++i) n = (n << 8) | in[i];
    return n;
}

bool same(const uint8_t *a, const uint8_t *b, size_t n) {
    return crypto_constant_time_equal(a, b, n);
}
void header(uint8_t *magic, uint8_t &major, uint8_t &minor,
            uint8_t &type, Message kind) {
    memcpy(magic, MAGIC, sizeof(MAGIC));
    major = PROTOCOL_MAJOR; minor = PROTOCOL_MINOR;
    type = static_cast<uint8_t>(kind);
}
bool version_ok(uint8_t major, uint8_t minor) {
    return major == PROTOCOL_MAJOR && minor == PROTOCOL_MINOR;
}

uint8_t active_count() {
    uint8_t n = 0;
    for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i)
        if (active[i].occupied && active[i].secrets.active) ++n;
    return n;
}
ActivePeer *find_peer(uint8_t peer_id) {
    for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i)
        if (active[i].occupied && active[i].remote_peer_id == peer_id)
            return &active[i];
    return nullptr;
}
ActivePeer *unique_peer() {
    ActivePeer *one = nullptr;
    for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i) {
        if (!active[i].occupied || !active[i].secrets.active) continue;
        if (one) return nullptr; // Unqualified API must not mix peer contexts.
        one = &active[i];
    }
    return one;
}
void destroy_peer(ActivePeer &peer) {
    context_destroy_session(peer.secrets);
    secure_zero(&peer, sizeof(peer));
}
void clear_pending() {
    context_destroy_session(pending.candidate);
    secure_zero(&pending, sizeof(pending));
}
void clear_retry() {
    secure_zero(&last_hello, sizeof(last_hello));
    secure_zero(&last_reply, sizeof(last_reply));
    secure_zero(&last_confirm, sizeof(last_confirm));
    last_hello_ok = last_reply_ok = last_confirm_ok = false;
    started = last_sent = 0; retries = 0;
}
void fail_attempt(HandshakeFailure why) {
    // A failed attempted refresh cannot continue using an old session for
    // that peer. Unrelated active peers remain unaffected.
    if (pending.valid) {
        ActivePeer *old = find_peer(pending.peer_id);
        if (old) destroy_peer(*old);
    }
    clear_pending(); clear_retry();
    failure = why; state = HandshakeState::FAILED;
}

// All live authorization derives from the CURRENT trust database. This
// prevents a previously loaded session from surviving a local revocation.
bool authorized(ActivePeer &slot) {
    if (!slot.occupied || !slot.secrets.active) return false;
    if (!identity_ready() || !trust_ready() ||
        slot.local_peer_id != local_id || slot.local_side != local_side ||
        !slot.identity_verified || slot.state != SessionState::ACTIVE) {
        destroy_peer(slot);
        return false;
    }
    PeerRecord record{};
    uint8_t local_fingerprint[SHA256_SIZE] = {};
    const bool ok = identity_copy_fingerprint(local_fingerprint) &&
        same(local_fingerprint, slot.local_identity_fingerprint, SHA256_SIZE) &&
        trust_copy_trusted_peer(slot.remote_peer_id, record) &&
        same(record.fingerprint, slot.remote_identity_fingerprint, SHA256_SIZE);
    secure_zero(local_fingerprint, sizeof(local_fingerprint));
    secure_zero(&record, sizeof(record));
    if (!ok) destroy_peer(slot);
    return ok;
}
bool trusted(uint8_t id, PeerRecord &record) {
    memset(&record, 0, sizeof(record));
    if (!trust_ready() || !trust_copy_trusted_peer(id, record)) return false;
    return record.valid && record.trust_state == TrustState::TRUSTED;
}
HandshakeFailure trust_failure(uint8_t id) {
    PeerRecord record{};
    if (!trust_ready()) return HandshakeFailure::STORAGE_ERROR;
    if (trust_copy_peer(id, record) && record.trust_state == TrustState::REVOKED)
        return HandshakeFailure::PEER_REVOKED;
    return HandshakeFailure::UNKNOWN_PEER;
}

bool send_frame(uint8_t destination, const void *packet, size_t size) {
    if (!packet || !size || size > MAX_WIRE_PACKET || !destination) return false;
    const uint8_t *bytes = static_cast<const uint8_t*>(packet);
    if (peer_sender) return peer_sender(destination, bytes, size);
    // The legacy callback does not carry a destination. Do not use it when
    // multiple sessions are installed, or it could send to the wrong peer.
    if (legacy_sender && active_count() <= 1) return legacy_sender(bytes, size);
    return false;
}

// Version 1.1 signed digest construction: SHA256(domain || all wire
// fields preceding signature). Each packet type has a distinct domain.
bool signed_hash(const char *domain, const uint8_t *bytes, size_t length,
                 uint8_t out[SHA256_SIZE]) {
    if (!domain || !bytes || !out || length > MAX_WIRE_PACKET) return false;
    const size_t domain_len = strlen(domain);
    uint8_t buffer[300] = {};
    if (domain_len > sizeof(buffer) - length) return false;
    memcpy(buffer, domain, domain_len);
    memcpy(buffer + domain_len, bytes, length);
    const bool ok = crypto_sha256(buffer, domain_len + length, out);
    secure_zero(buffer, sizeof(buffer));
    return ok;
}
bool hello_hash(const Hello &p, uint8_t out[SHA256_SIZE]) {
    return signed_hash("GWSSIP-HANDSHAKE-HELLO-V1.1-3DH",
                       reinterpret_cast<const uint8_t*>(&p),
                       offsetof(Hello, signature), out);
}
bool reply_hash(const Reply &p, uint8_t out[SHA256_SIZE]) {
    return signed_hash("GWSSIP-HANDSHAKE-REPLY-V1.1-3DH",
                       reinterpret_cast<const uint8_t*>(&p),
                       offsetof(Reply, signature), out);
}

bool calc_confirmation(Message kind, uint8_t sender,
                       const SessionSecrets &session,
                       const uint8_t transcript[SHA256_SIZE],
                       uint8_t out[SHA256_SIZE]) {
    static const char domain[] = "GWSSIP-KEY-CONFIRM-V1.1-3DH";
    if (!session.active || !out || !transcript) return false;
    uint8_t bytes[128] = {}; size_t p = 0;
    memcpy(bytes + p, domain, sizeof(domain) - 1); p += sizeof(domain) - 1;
    bytes[p++] = uint8_t(kind); bytes[p++] = sender;
    be64(bytes + p, session.session_id); p += 8;
    be32(bytes + p, session.key_epoch); p += 4;
    memcpy(bytes + p, transcript, SHA256_SIZE); p += SHA256_SIZE;
    const bool ok = crypto_hmac_sha256(session.confirmation_key,
                                      AES256_KEY_SIZE, bytes, p, out);
    secure_zero(bytes, sizeof(bytes));
    return ok;
}
bool build_confirm(Message kind, Confirm &out) {
    if (!pending.derived || !pending.candidate.active) return false;
    memset(&out, 0, sizeof(out));
    header(out.magic, out.major, out.minor, out.type, kind);
    out.sender = local_id;
    be64(out.sid, pending.candidate.session_id);
    be32(out.epoch, pending.candidate.key_epoch);
    memcpy(out.transcript, pending.transcript, SHA256_SIZE);
    return calc_confirmation(kind, local_id, pending.candidate,
                             pending.transcript, out.mac);
}
bool verify_confirm(const Confirm &packet, Message expected,
                    uint8_t peer_id, const SessionSecrets &session,
                    const uint8_t transcript[SHA256_SIZE]) {
    if (!version_ok(packet.major, packet.minor) ||
        !same(packet.magic, MAGIC, sizeof(MAGIC)) ||
        packet.type != uint8_t(expected) || packet.sender != peer_id ||
        rd64(packet.sid) != session.session_id ||
        rd32(packet.epoch) != session.key_epoch ||
        !same(packet.transcript, transcript, SHA256_SIZE)) return false;
    uint8_t expected_mac[SHA256_SIZE] = {};
    const bool ok = calc_confirmation(expected, peer_id, session,
                                      transcript, expected_mac) &&
                    same(expected_mac, packet.mac, SHA256_SIZE);
    secure_zero(expected_mac, sizeof(expected_mac));
    return ok;
}

// Both peers build the identical canonical transcript from identity,
// logical roles, ephemeral keys, fresh randoms, suite and capabilities.
bool derive() {
    if (!pending.valid || !crypto_p256_validate_public(pending.local_ephemeral) ||
        !crypto_p256_validate_public(pending.remote_ephemeral) ||
        pending.suite != SUITE ||
        (pending.negotiated & REQUIRED) != REQUIRED) return false;
    HandshakeTranscriptInput t{};
    if (pending.initiator) {
        t.initiator_id = local_id; t.responder_id = pending.peer_id;
        memcpy(t.initiator_identity_fingerprint, pending.local_fp, SHA256_SIZE);
        memcpy(t.responder_identity_fingerprint, pending.remote_fp, SHA256_SIZE);
        memcpy(t.initiator_ephemeral_public, pending.local_ephemeral, P256_PUBLIC_SIZE);
        memcpy(t.responder_ephemeral_public, pending.remote_ephemeral, P256_PUBLIC_SIZE);
        memcpy(t.initiator_random, pending.local_random, HANDSHAKE_RANDOM_SIZE);
        memcpy(t.responder_random, pending.remote_random, HANDSHAKE_RANDOM_SIZE);
    } else {
        t.initiator_id = pending.peer_id; t.responder_id = local_id;
        memcpy(t.initiator_identity_fingerprint, pending.remote_fp, SHA256_SIZE);
        memcpy(t.responder_identity_fingerprint, pending.local_fp, SHA256_SIZE);
        memcpy(t.initiator_ephemeral_public, pending.remote_ephemeral, P256_PUBLIC_SIZE);
        memcpy(t.responder_ephemeral_public, pending.local_ephemeral, P256_PUBLIC_SIZE);
        memcpy(t.initiator_random, pending.remote_random, HANDSHAKE_RANDOM_SIZE);
        memcpy(t.responder_random, pending.local_random, HANDSHAKE_RANDOM_SIZE);
    }
    t.suite = pending.suite;
    t.capability_flags = pending.negotiated;
    const bool hashed = transcript_build_hash(t, pending.transcript);
    secure_zero(&t, sizeof(t));
    if (!hashed) return false;

    uint8_t secret[SHA256_SIZE] = {};
    // The persisted identity is used for static-ephemeral key agreement;
    // the already verified signature binds this exchange to the peer.
    // The EE contribution remains mandatory to preserve forward secrecy.
    const bool ok = agreement_derive_3dh(
                        pending.initiator,
                        pending.private_key,
                        pending.remote_ephemeral,
                        pending.trusted_peer.public_key,
                        pending.transcript,
                        secret) &&
                    kdf_derive_session(secret, pending.transcript,
                                       pending.suite, 1, pending.candidate);
    secure_zero(secret, sizeof(secret));
    secure_zero(pending.private_key, sizeof(pending.private_key));
    pending.derived = ok;
    return ok;
}

bool install() {
    if (!pending.valid || !pending.derived || !pending.candidate.active ||
        !pending.candidate.session_id || !pending.peer_id ||
        !trust_ready() || !identity_ready()) return false;
    PeerRecord record{};
    const bool valid = trusted(pending.peer_id, record) &&
        same(record.fingerprint, pending.remote_fp, SHA256_SIZE);
    secure_zero(&record, sizeof(record));
    if (!valid) return false;

    ActivePeer *slot = find_peer(pending.peer_id);
    if (!slot) {
        for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i) {
            if (!active[i].occupied) { slot = &active[i]; break; }
        }
    }
    if (!slot) return false;
    // The new session is already fully derived and confirmed. Installing
    // replaces the old per-peer contexts; no shared global counters exist.
    destroy_peer(*slot);
    slot->local_peer_id = local_id;
    slot->remote_peer_id = pending.peer_id;
    slot->local_side = local_side;
    slot->state = SessionState::ACTIVE;
    slot->identity_verified = true;
    slot->negotiated_capabilities = pending.negotiated;
    slot->negotiated_protocol_major = PROTOCOL_MAJOR;
    slot->negotiated_protocol_minor = PROTOCOL_MINOR;
    memcpy(slot->local_identity_fingerprint, pending.local_fp, SHA256_SIZE);
    memcpy(slot->remote_identity_fingerprint, pending.remote_fp, SHA256_SIZE);
    memcpy(slot->handshake_transcript_hash, pending.transcript, SHA256_SIZE);
    memcpy(&slot->secrets, &pending.candidate, sizeof(SessionSecrets));
    slot->occupied = true;
    secure_zero(&pending.candidate, sizeof(SessionSecrets));
    pending.derived = false;
    return slot->secrets.active;
}

bool check_and_sign_hello(Hello &out) {
    memset(&out, 0, sizeof(out));
    header(out.magic, out.major, out.minor, out.type, Message::HELLO);
    out.sender = local_id; be16(out.suite, uint16_t(SUITE));
    be32(out.capabilities, SUPPORTED);
    if (!identity_copy_fingerprint(out.identity_fp) ||
        !crypto_p256_generate_keypair(pending.private_key,
                                      pending.local_ephemeral) ||
        !crypto_random(pending.local_random, HANDSHAKE_RANDOM_SIZE)) return false;
    memcpy(out.ephemeral, pending.local_ephemeral, P256_PUBLIC_SIZE);
    memcpy(out.random, pending.local_random, HANDSHAKE_RANDOM_SIZE);
    memcpy(pending.local_fp, out.identity_fp, SHA256_SIZE);
    uint8_t digest[SHA256_SIZE] = {};
    const bool ok = hello_hash(out, digest) &&
                    identity_sign_digest(digest, out.signature);
    if (ok) memcpy(pending.hello_hash, digest, SHA256_SIZE);
    secure_zero(digest, sizeof(digest));
    return ok;
}
bool check_and_sign_reply(Reply &out) {
    memset(&out, 0, sizeof(out));
    header(out.magic, out.major, out.minor, out.type, Message::REPLY);
    out.sender = local_id; be16(out.suite, uint16_t(pending.suite));
    be32(out.capabilities, pending.negotiated);
    memcpy(out.hello_hash, pending.hello_hash, SHA256_SIZE);
    if (!identity_copy_fingerprint(out.identity_fp) ||
        !crypto_p256_generate_keypair(pending.private_key,
                                      pending.local_ephemeral) ||
        !crypto_random(pending.local_random, HANDSHAKE_RANDOM_SIZE)) return false;
    memcpy(out.ephemeral, pending.local_ephemeral, P256_PUBLIC_SIZE);
    memcpy(out.random, pending.local_random, HANDSHAKE_RANDOM_SIZE);
    memcpy(pending.local_fp, out.identity_fp, SHA256_SIZE);
    uint8_t digest[SHA256_SIZE] = {};
    const bool ok = reply_hash(out, digest) &&
                    identity_sign_digest(digest, out.signature);
    if (ok) memcpy(pending.reply_hash, digest, SHA256_SIZE);
    secure_zero(digest, sizeof(digest));
    return ok;
}

// Only authenticated HELLO can start or refresh a responder session. Invalid
// or unauthenticated frames are ignored; an attacker cannot force a live
// session into FAILED by sending malformed packets.
void process_hello(const Hello &packet) {
    if (local_side != DeviceSide::SIDE_B || !identity_ready() || !trust_ready() ||
        packet.sender == 0 || packet.sender == local_id ||
        rd16(packet.suite) != uint16_t(SUITE) ||
        !security_suite_implemented(SUITE) ||
        (rd32(packet.capabilities) & REQUIRED) != REQUIRED ||
        (rd32(packet.capabilities) & ~SUPPORTED) != 0 ||
        !crypto_p256_validate_public(packet.ephemeral)) return;
    PeerRecord peer{};
    if (!trusted(packet.sender, peer) ||
        !same(peer.fingerprint, packet.identity_fp, SHA256_SIZE)) {
        secure_zero(&peer, sizeof(peer)); return;
    }
    uint8_t hash[SHA256_SIZE] = {};
    const bool verified = hello_hash(packet, hash) &&
        crypto_p256_verify_digest(peer.public_key, hash, packet.signature);
    if (!verified) {
        secure_zero(&peer, sizeof(peer)); secure_zero(hash, sizeof(hash)); return;
    }
    // A retransmission of the exact HELLO must resend the same signed
    // HELLO_REPLY; generating new ephemeral secrets would fork the handshake.
    if (pending.valid && !pending.initiator && pending.peer_id == packet.sender &&
        state == HandshakeState::WAIT_INITIATOR_CONFIRM && last_reply_ok &&
        same(pending.hello_hash, hash, SHA256_SIZE)) {
        last_sent = millis();
        send_frame(packet.sender, &last_reply, sizeof(last_reply));
        secure_zero(&peer, sizeof(peer)); secure_zero(hash, sizeof(hash));
        return;
    }
    // Only one handshake may be pending at a time. An unrelated valid
    // request must never evict another candidate or its session state.
    if (pending.valid) {
        secure_zero(&peer, sizeof(peer)); secure_zero(hash, sizeof(hash));
        return;
    }
    if ((!peer_sender && active_count() != 0 && !find_peer(packet.sender)) ||
        (!find_peer(packet.sender) && active_count() >= MAX_ACTIVE_PEERS)) {
        secure_zero(&peer, sizeof(peer)); secure_zero(hash, sizeof(hash));
        return;
    }
    clear_pending(); clear_retry();
    pending.valid = true; pending.initiator = false;
    pending.peer_id = packet.sender; pending.trusted_peer = peer;
    pending.suite = SUITE;
    pending.offered = rd32(packet.capabilities);
    pending.negotiated = SUPPORTED & pending.offered;
    memcpy(pending.remote_fp, packet.identity_fp, SHA256_SIZE);
    memcpy(pending.remote_ephemeral, packet.ephemeral, P256_PUBLIC_SIZE);
    memcpy(pending.remote_random, packet.random, HANDSHAKE_RANDOM_SIZE);
    memcpy(pending.hello_hash, hash, SHA256_SIZE);
    secure_zero(&peer, sizeof(peer)); secure_zero(hash, sizeof(hash));

    Reply reply{};
    if (!check_and_sign_reply(reply) || !derive()) {
        fail_attempt(HandshakeFailure::CRYPTO_ERROR); return;
    }
    memcpy(&last_reply, &reply, sizeof(reply)); last_reply_ok = true;
    if (!send_frame(pending.peer_id, &last_reply, sizeof(last_reply))) {
        fail_attempt(HandshakeFailure::SEND_ERROR); return;
    }
    started = last_sent = millis(); retries = 0;
    failure = HandshakeFailure::NONE;
    state = HandshakeState::WAIT_INITIATOR_CONFIRM;
}

void process_reply(const Reply &packet) {
    if (!pending.valid || !pending.initiator ||
        (state != HandshakeState::HELLO_SENT &&
         state != HandshakeState::INITIATOR_CONFIRM_SENT) ||
        packet.sender != pending.peer_id ||
        rd16(packet.suite) != uint16_t(pending.suite) ||
        (rd32(packet.capabilities) & REQUIRED) != REQUIRED ||
        rd32(packet.capabilities) != (pending.offered & SUPPORTED) ||
        !same(packet.hello_hash, pending.hello_hash, SHA256_SIZE) ||
        !crypto_p256_validate_public(packet.ephemeral)) return;
    PeerRecord peer{};
    if (!trusted(packet.sender, peer) ||
        !same(peer.fingerprint, packet.identity_fp, SHA256_SIZE)) {
        secure_zero(&peer, sizeof(peer)); return;
    }
    uint8_t hash[SHA256_SIZE] = {};
    const bool verified = reply_hash(packet, hash) &&
        crypto_p256_verify_digest(peer.public_key, hash, packet.signature);
    secure_zero(&peer, sizeof(peer));
    if (!verified) { secure_zero(hash, sizeof(hash)); return; }
    if (state == HandshakeState::INITIATOR_CONFIRM_SENT &&
        last_confirm_ok && same(pending.reply_hash, hash, SHA256_SIZE)) {
        last_sent = millis();
        send_frame(pending.peer_id, &last_confirm, sizeof(last_confirm));
        secure_zero(hash, sizeof(hash)); return;
    }
    if (state != HandshakeState::HELLO_SENT) {
        secure_zero(hash, sizeof(hash)); return;
    }
    memcpy(pending.remote_fp, packet.identity_fp, SHA256_SIZE);
    memcpy(pending.remote_ephemeral, packet.ephemeral, P256_PUBLIC_SIZE);
    memcpy(pending.remote_random, packet.random, HANDSHAKE_RANDOM_SIZE);
    memcpy(pending.reply_hash, hash, SHA256_SIZE);
    secure_zero(hash, sizeof(hash));
    pending.negotiated = rd32(packet.capabilities);
    if (!derive()) { fail_attempt(HandshakeFailure::CRYPTO_ERROR); return; }
    if (!build_confirm(Message::CONFIRM_A, last_confirm)) {
        fail_attempt(HandshakeFailure::CRYPTO_ERROR); return;
    }
    last_confirm_ok = true;
    if (!send_frame(pending.peer_id, &last_confirm, sizeof(last_confirm))) {
        fail_attempt(HandshakeFailure::SEND_ERROR); return;
    }
    last_sent = millis(); retries = 0;
    state = HandshakeState::INITIATOR_CONFIRM_SENT;
}

void process_confirm_a(const Confirm &packet) {
    if (local_side != DeviceSide::SIDE_B) return;
    if (pending.valid && !pending.initiator &&
        state == HandshakeState::WAIT_INITIATOR_CONFIRM &&
        packet.sender == pending.peer_id && pending.derived) {
        if (!verify_confirm(packet, Message::CONFIRM_A, pending.peer_id,
                            pending.candidate, pending.transcript)) return;
        Confirm response{};
        if (!build_confirm(Message::CONFIRM_B, response)) {
            fail_attempt(HandshakeFailure::CRYPTO_ERROR); return;
        }
        const uint8_t target = pending.peer_id;
        if (!send_frame(target, &response, sizeof(response))) {
            fail_attempt(HandshakeFailure::SEND_ERROR); return;
        }
        if (!install()) { fail_attempt(HandshakeFailure::CRYPTO_ERROR); return; }
        ActivePeer *slot = find_peer(target);
        if (slot) {
            slot->responder_confirmation = response;
            slot->responder_confirmation_valid = true;
        }
        clear_pending(); clear_retry(); failure = HandshakeFailure::NONE;
        state = HandshakeState::ACTIVE;
        return;
    }
    // Lost CONFIRM_B: verify the initiator's old CONFIRM_A under the
    // ACTIVE session before resending the original response.
    ActivePeer *slot = find_peer(packet.sender);
    if (slot && authorized(*slot) && slot->responder_confirmation_valid &&
        verify_confirm(packet, Message::CONFIRM_A, packet.sender,
                       slot->secrets, slot->handshake_transcript_hash)) {
        send_frame(packet.sender, &slot->responder_confirmation,
                   sizeof(slot->responder_confirmation));
    }
}

void process_confirm_b(const Confirm &packet) {
    if (local_side != DeviceSide::SIDE_A) return;
    if (pending.valid && pending.initiator &&
        state == HandshakeState::INITIATOR_CONFIRM_SENT &&
        packet.sender == pending.peer_id && pending.derived) {
        if (!verify_confirm(packet, Message::CONFIRM_B, pending.peer_id,
                            pending.candidate, pending.transcript)) return;
        if (!install()) { fail_attempt(HandshakeFailure::CRYPTO_ERROR); return; }
        clear_pending(); clear_retry(); failure = HandshakeFailure::NONE;
        state = HandshakeState::ACTIVE;
        return;
    }
    // A duplicate is only acceptable if authenticated under the specific
    // currently-active session. Never unconditionally accept it.
    ActivePeer *slot = find_peer(packet.sender);
    if (slot && authorized(*slot)) {
        (void)verify_confirm(packet, Message::CONFIRM_B, packet.sender,
                             slot->secrets, slot->handshake_transcript_hash);
    }
}

bool session_candidate(const SessionSecrets &next,
                       const SessionSecrets &old) {
    if (!next.active || !old.active || !next.session_id ||
        next.session_id == old.session_id ||
        old.key_epoch == UINT32_MAX ||
        next.key_epoch != old.key_epoch + 1 ||
        next.suite != old.suite || !security_suite_implemented(next.suite) ||
        !next.a_to_b.active || !next.b_to_a.active ||
        next.a_to_b.direction != Direction::A_TO_B ||
        next.b_to_a.direction != Direction::B_TO_A ||
        next.a_to_b.key_epoch != next.key_epoch ||
        next.b_to_a.key_epoch != next.key_epoch ||
        next.a_to_b.tx_counter != 0 || next.b_to_a.tx_counter != 0 ||
        next.a_to_b.replay.initialized || next.b_to_a.replay.initialized ||
        next.a_to_b.replay.bitmap || next.b_to_a.replay.bitmap ||
        next.a_to_b.replay.highest_counter ||
        next.b_to_a.replay.highest_counter) return false;
    // Protect against accidental renewal with old directional key material.
    if (same(next.a_to_b.traffic_key, old.a_to_b.traffic_key, AES256_KEY_SIZE) ||
        same(next.b_to_a.traffic_key, old.b_to_a.traffic_key, AES256_KEY_SIZE))
        return false;
    return true;
}

} // anonymous namespace

bool handshake_init(uint8_t id, DeviceSide side) {
    handshake_reset();
    if (!id || (side != DeviceSide::SIDE_A && side != DeviceSide::SIDE_B) ||
        !identity_ready() || !trust_ready()) {
        initialized = false;
        state = HandshakeState::UNINITIALIZED;
        failure = HandshakeFailure::NOT_READY;
        return false;
    }
    initialized = true; local_id = id; local_side = side;
    state = HandshakeState::IDLE; failure = HandshakeFailure::NONE;
    return true;
}
void handshake_set_send_callback(HandshakeSendCallback cb) {
    legacy_sender = cb;
}
void handshake_set_peer_send_callback(HandshakePeerSendCallback cb) {
    peer_sender = cb;
}

bool handshake_start(uint8_t peer_id) {
    if (!initialized || !identity_ready() || !trust_ready() ||
        (!peer_sender && !legacy_sender)) {
        failure = HandshakeFailure::NOT_READY; return false;
    }
    if (local_side != DeviceSide::SIDE_A || !peer_id || peer_id == local_id ||
        pending.valid) {
        failure = HandshakeFailure::BUSY; return false;
    }
    if (!peer_sender && active_count() > 0 && !find_peer(peer_id)) {
        failure = HandshakeFailure::TRANSPORT_MISMATCH; return false;
    }
    if (!find_peer(peer_id) && active_count() >= MAX_ACTIVE_PEERS) {
        failure = HandshakeFailure::BUSY; return false;
    }
    PeerRecord peer{};
    if (!trusted(peer_id, peer)) {
        failure = trust_failure(peer_id); return false;
    }
    clear_pending(); clear_retry();
    pending.valid = true; pending.initiator = true;
    pending.peer_id = peer_id; pending.trusted_peer = peer;
    pending.suite = SUITE;
    pending.offered = SUPPORTED;
    secure_zero(&peer, sizeof(peer));
    if (!check_and_sign_hello(last_hello)) {
        fail_attempt(HandshakeFailure::CRYPTO_ERROR); return false;
    }
    last_hello_ok = true;
    if (!send_frame(peer_id, &last_hello, sizeof(last_hello))) {
        fail_attempt(HandshakeFailure::SEND_ERROR); return false;
    }
    started = last_sent = millis(); retries = 0;
    failure = HandshakeFailure::NONE;
    state = HandshakeState::HELLO_SENT;
    return true;
}

bool handshake_handle_peer_packet(uint8_t physical_peer_id,
                                  const uint8_t *bytes, size_t length) {
    if (!initialized || !bytes || length < 8 ||
        memcmp(bytes, MAGIC, sizeof(MAGIC)) != 0) return false;
    // Always consume handshake-prefixed data (including unsupported
    // versions) without allowing malformed traffic to alter session state.
    if (length > MAX_WIRE_PACKET || !version_ok(bytes[4], bytes[5])) return true;
    const uint8_t claimed_sender = bytes[7];
    if (!physical_peer_id || claimed_sender != physical_peer_id ||
        claimed_sender == local_id) return true;
    switch (Message(bytes[6])) {
        case Message::HELLO:
            if (length == sizeof(Hello)) {
                Hello packet{}; memcpy(&packet, bytes, sizeof(packet));
                process_hello(packet); secure_zero(&packet, sizeof(packet));
            }
            return true;
        case Message::REPLY:
            if (length == sizeof(Reply)) {
                Reply packet{}; memcpy(&packet, bytes, sizeof(packet));
                process_reply(packet); secure_zero(&packet, sizeof(packet));
            }
            return true;
        case Message::CONFIRM_A:
        case Message::CONFIRM_B:
            if (length == sizeof(Confirm)) {
                Confirm packet{}; memcpy(&packet, bytes, sizeof(packet));
                if (Message(bytes[6]) == Message::CONFIRM_A)
                    process_confirm_a(packet);
                else process_confirm_b(packet);
                secure_zero(&packet, sizeof(packet));
            }
            return true;
        case Message::ABORT:
            // v1.0 ABORT is unsigned. Never allow unauthenticated aborts
            // to destroy a live or pending authenticated session.
            return true;
        default:
            return true;
    }
}

bool handshake_handle_packet(const uint8_t *bytes, size_t length) {
    // Transitional legacy API: caller MUST validate that its transport is
    // bound to a single known physical peer. Never use this legacy path with
    // multiple active sessions; source identity would be ambiguous.
    if (!initialized || !bytes || length < 8 ||
        memcmp(bytes, MAGIC, sizeof(MAGIC)) != 0) return false;
    if (active_count() > 1) return true;
    const uint8_t sender = bytes[7];
    if (pending.valid && pending.peer_id != sender) return true;
    ActivePeer *one = unique_peer();
    if (one && !pending.valid && one->remote_peer_id != sender) return true;
    return handshake_handle_peer_packet(sender, bytes, length);
}

void handshake_loop() {
    if (!initialized) return;
    // Check revocations even when idle/ACTIVE. This is the immediate
    // trust-dependent invalidation path for any cached peer session.
    for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i)
        if (active[i].occupied) (void)authorized(active[i]);
    if (!pending.valid) {
        // Preserve FAILED until the owning communication layer observes it
        // and explicitly resets/restarts authentication. Never suppress it
        // merely because an unrelated peer remains active.
        if (state == HandshakeState::FAILED) return;
        if (active_count()) state = HandshakeState::ACTIVE;
        else if (state == HandshakeState::ACTIVE) state = HandshakeState::IDLE;
        return;
    }
    if (!identity_ready() || !trust_ready()) {
        fail_attempt(HandshakeFailure::NOT_READY); return;
    }
    PeerRecord peer{};
    const bool still_trusted = trusted(pending.peer_id, peer) &&
        same(peer.fingerprint, pending.trusted_peer.fingerprint, SHA256_SIZE);
    secure_zero(&peer, sizeof(peer));
    if (!still_trusted) { fail_attempt(HandshakeFailure::PEER_REVOKED); return; }
    const uint32_t now = millis();
    if (uint32_t(now - started) >= HANDSHAKE_TIMEOUT_MS) {
        fail_attempt(HandshakeFailure::TIMEOUT); return;
    }
    if (uint32_t(now - last_sent) < RETRY_INTERVAL_MS) return;
    if (retries >= HANDSHAKE_MAX_RETRIES) {
        fail_attempt(HandshakeFailure::TIMEOUT); return;
    }
    const void *packet = nullptr; size_t size = 0;
    switch (state) {
        case HandshakeState::HELLO_SENT:
            if (last_hello_ok) { packet = &last_hello; size = sizeof(last_hello); }
            break;
        case HandshakeState::WAIT_INITIATOR_CONFIRM:
            if (last_reply_ok) { packet = &last_reply; size = sizeof(last_reply); }
            break;
        case HandshakeState::INITIATOR_CONFIRM_SENT:
            if (last_confirm_ok) { packet = &last_confirm; size = sizeof(last_confirm); }
            break;
        default: return;
    }
    if (!packet || !send_frame(pending.peer_id, packet, size)) {
        fail_attempt(HandshakeFailure::SEND_ERROR); return;
    }
    ++retries; last_sent = now;
}

void handshake_reset() {
    for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i) destroy_peer(active[i]);
    clear_pending(); clear_retry();
    state = initialized ? HandshakeState::IDLE : HandshakeState::UNINITIALIZED;
    failure = HandshakeFailure::NONE;
}
void handshake_reset_peer(uint8_t peer_id) {
    if (!peer_id) return;
    ActivePeer *slot = find_peer(peer_id);
    if (slot) destroy_peer(*slot);
    if (pending.valid && pending.peer_id == peer_id) {
        clear_pending(); clear_retry();
    }
    state = active_count() ? HandshakeState::ACTIVE :
            (initialized ? HandshakeState::IDLE : HandshakeState::UNINITIALIZED);
}
HandshakeState handshake_state() { return state; }
HandshakeFailure handshake_failure() { return failure; }
const char *handshake_state_name() {
    switch (state) {
        case HandshakeState::UNINITIALIZED: return "UNINITIALIZED";
        case HandshakeState::IDLE: return "IDLE";
        case HandshakeState::HELLO_SENT: return "HELLO SENT";
        case HandshakeState::WAIT_INITIATOR_CONFIRM: return "WAIT CONFIRM";
        case HandshakeState::INITIATOR_CONFIRM_SENT: return "CONFIRM SENT";
        case HandshakeState::ACTIVE: return "ACTIVE";
        case HandshakeState::FAILED: return "FAILED";
        case HandshakeState::REKEYING: return "REKEYING";
        case HandshakeState::INVALIDATED: return "INVALIDATED";
        default: return "UNKNOWN";
    }
}
const char *handshake_failure_name() {
    switch (failure) {
        case HandshakeFailure::NONE: return "NONE";
        case HandshakeFailure::NOT_READY: return "NOT READY";
        case HandshakeFailure::UNKNOWN_PEER: return "UNKNOWN PEER";
        case HandshakeFailure::PEER_NOT_TRUSTED: return "PEER NOT TRUSTED";
        case HandshakeFailure::IDENTITY_MISMATCH: return "IDENTITY MISMATCH";
        case HandshakeFailure::INVALID_PACKET: return "INVALID PACKET";
        case HandshakeFailure::INVALID_VERSION: return "INVALID VERSION";
        case HandshakeFailure::UNSUPPORTED_SUITE: return "UNSUPPORTED SUITE";
        case HandshakeFailure::CAPABILITY_MISMATCH: return "CAPABILITY MISMATCH";
        case HandshakeFailure::INVALID_SIGNATURE: return "INVALID SIGNATURE";
        case HandshakeFailure::INVALID_CONFIRMATION: return "INVALID CONFIRMATION";
        case HandshakeFailure::CRYPTO_ERROR: return "CRYPTO ERROR";
        case HandshakeFailure::SEND_ERROR: return "SEND ERROR";
        case HandshakeFailure::TIMEOUT: return "TIMEOUT";
        case HandshakeFailure::PEER_REVOKED: return "PEER REVOKED";
        case HandshakeFailure::BUSY: return "BUSY";
        case HandshakeFailure::SESSION_INVALID: return "SESSION INVALID";
        case HandshakeFailure::TRANSPORT_MISMATCH: return "TRANSPORT MISMATCH";
        case HandshakeFailure::STORAGE_ERROR: return "STORAGE ERROR";
        default: return "UNKNOWN";
    }
}
uint8_t handshake_active_peer_count() {
    for (size_t i = 0; i < MAX_ACTIVE_PEERS; ++i)
        if (active[i].occupied) (void)authorized(active[i]);
    return active_count();
}
bool handshake_session_ready_for_peer(uint8_t peer_id) {
    ActivePeer *slot = find_peer(peer_id);
    return slot && authorized(*slot);
}
bool handshake_session_ready() {
    ActivePeer *slot = unique_peer();
    return slot && authorized(*slot) && !pending.valid &&
           state == HandshakeState::ACTIVE;
}
uint8_t handshake_peer_id() {
    if (pending.valid) return pending.peer_id;
    ActivePeer *slot = unique_peer();
    return slot && authorized(*slot) ? slot->remote_peer_id : 0;
}
const SessionSecrets *handshake_active_session_for_peer(uint8_t peer_id) {
    ActivePeer *slot = find_peer(peer_id);
    return slot && authorized(*slot) ? &slot->secrets : nullptr;
}
SessionSecrets *handshake_active_session_for_peer_mutable(uint8_t peer_id) {
    ActivePeer *slot = find_peer(peer_id);
    return slot && authorized(*slot) ? &slot->secrets : nullptr;
}
const SessionSecrets *handshake_active_session() {
    return handshake_session_ready() ? &unique_peer()->secrets : nullptr;
}
SessionSecrets *handshake_active_session_mutable() {
    return handshake_session_ready() ? &unique_peer()->secrets : nullptr;
}
bool handshake_copy_transcript_hash_for_peer(uint8_t peer_id,
                                              uint8_t output[SHA256_SIZE]) {
    if (!output) return false;
    ActivePeer *slot = find_peer(peer_id);
    if (!slot || !authorized(*slot)) {
        memset(output, 0, SHA256_SIZE); return false;
    }
    memcpy(output, slot->handshake_transcript_hash, SHA256_SIZE);
    return true;
}
bool handshake_copy_transcript_hash(uint8_t output[SHA256_SIZE]) {
    if (!output) return false;
    ActivePeer *slot = unique_peer();
    if (slot && authorized(*slot) && !pending.valid &&
        state == HandshakeState::ACTIVE) {
        memcpy(output, slot->handshake_transcript_hash, SHA256_SIZE);
        return true;
    }
    memset(output, 0, SHA256_SIZE); return false;
}
DeviceSide handshake_local_side() { return local_side; }

bool handshake_replace_peer_session(uint8_t peer_id,
                                    const SessionSecrets &replacement) {
    if (!initialized || pending.valid || state != HandshakeState::ACTIVE ||
        !identity_ready() || !peer_id) return false;
    ActivePeer *slot = find_peer(peer_id);
    if (!slot || !authorized(*slot) ||
        !session_candidate(replacement, slot->secrets)) return false;
    // One verified replacement, no exposure of partially derived keys.
    SessionSecrets fresh{};
    memcpy(&fresh, &replacement, sizeof(fresh));
    context_destroy_session(slot->secrets);
    memcpy(&slot->secrets, &fresh, sizeof(fresh));
    secure_zero(&fresh, sizeof(fresh));
    secure_zero(&slot->responder_confirmation, sizeof(slot->responder_confirmation));
    slot->responder_confirmation_valid = false;
    state = HandshakeState::ACTIVE;
    return true;
}
bool handshake_replace_active_session(const SessionSecrets &replacement) {
    ActivePeer *slot = unique_peer();
    return slot && authorized(*slot) &&
        handshake_replace_peer_session(slot->remote_peer_id, replacement);
}

} // namespace gw
