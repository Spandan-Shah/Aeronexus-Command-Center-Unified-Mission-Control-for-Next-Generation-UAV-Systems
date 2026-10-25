
#include "gw_trust.h"

#include "gw_crypto.h"
#include "gw_storage.h"

#include <cstring>
#include <memory>
#include <new>

namespace gw {
namespace {

// Persistent trust is retained across sessions. The in-memory cache is
// authoritative only after a complete, validated load or verified save.
PeerRecord peer_records[MAX_TRUSTED_PEERS]{};
uint8_t peer_count = 0;
bool database_ready = false;

struct ScopedPeerTable {
    PeerRecord records[MAX_TRUSTED_PEERS]{};

    ~ScopedPeerTable() {
        secure_zero(records, sizeof(records));
    }

    ScopedPeerTable() = default;
    ScopedPeerTable(const ScopedPeerTable&) = delete;
    ScopedPeerTable& operator=(const ScopedPeerTable&) = delete;
};

struct ScopedFingerprint {
    uint8_t bytes[SHA256_SIZE]{};

    ~ScopedFingerprint() {
        secure_zero(bytes, sizeof(bytes));
    }

    ScopedFingerprint() = default;
    ScopedFingerprint(const ScopedFingerprint&) = delete;
    ScopedFingerprint& operator=(const ScopedFingerprint&) = delete;
};

// A failed or ambiguous storage update must never leave the old in-memory
// trust snapshot usable. A later trust_init() must recover from NVS.
void invalidate_cache() {
    database_ready = false;
    peer_count = 0;
    secure_zero(peer_records, sizeof(peer_records));
}

bool persistent_state(TrustState state) {
    return state == TrustState::TRUSTED ||
           state == TrustState::REVOKED;
}

bool valid_callsign(const char text[MAX_CALLSIGN_LEN]) {
    return std::memchr(text, '\0', MAX_CALLSIGN_LEN) != nullptr;
}

bool validate_peer(const PeerRecord &peer) {
    if (!peer.valid || peer.peer_id == 0 ||
        !persistent_state(peer.trust_state) ||
        !valid_callsign(peer.callsign) ||
        !crypto_p256_validate_public(peer.public_key)) {
        return false;
    }

    ScopedFingerprint calculated;
    return crypto_sha256(peer.public_key, P256_PUBLIC_SIZE,
                         calculated.bytes) &&
           crypto_constant_time_equal(calculated.bytes,
                                      peer.fingerprint, SHA256_SIZE);
}

bool validate_table(const PeerRecord records[MAX_TRUSTED_PEERS],
                    uint8_t count) {
    if (!records || count > MAX_TRUSTED_PEERS) {
        return false;
    }

    for (uint8_t i = 0; i < count; ++i) {
        if (!validate_peer(records[i])) {
            return false;
        }

        for (uint8_t j = 0; j < i; ++j) {
            if (records[i].peer_id == records[j].peer_id ||
                crypto_constant_time_equal(records[i].fingerprint,
                                           records[j].fingerprint,
                                           SHA256_SIZE)) {
                return false;
            }
        }
    }
    return true;
}

int find_peer_index(uint8_t peer_id) {
    if (!database_ready || peer_id == 0) {
        return -1;
    }

    for (uint8_t i = 0; i < peer_count; ++i) {
        if (peer_records[i].valid &&
            peer_records[i].peer_id == peer_id) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

// Build changes in a temporary table. Publish them only after the storage
// layer reports a verified durable commit. An uncertain commit fails closed.
bool commit_table(const PeerRecord records[MAX_TRUSTED_PEERS],
                  uint8_t count) {
    if (!database_ready || !validate_table(records, count)) {
        return false;
    }

    if (storage_save_peer_records(records, count) != StorageStatus::OK) {
        invalidate_cache();
        return false;
    }

    secure_zero(peer_records, sizeof(peer_records));
    if (count != 0) {
        std::memcpy(peer_records, records,
                    sizeof(PeerRecord) * count);
    }
    peer_count = count;
    return true;
}

// Callsigns are display labels, not authenticated identity material. Reject
// overly long labels instead of silently changing them by truncation.
bool copy_callsign(char destination[MAX_CALLSIGN_LEN],
                   const char *source) {
    std::memset(destination, 0, MAX_CALLSIGN_LEN);
    if (!source) {
        return true;  // Preserve legacy support for an empty display label.
    }

    size_t length = 0;
    while (length < MAX_CALLSIGN_LEN && source[length] != '\0') {
        ++length;
    }
    if (length == MAX_CALLSIGN_LEN) {
        return false;
    }

    if (length != 0) {
        std::memcpy(destination, source, length);
    }
    return true;
}

} // namespace

// =======================================================
// Load and validate the persistent trust database
// =======================================================

bool trust_init() {
    invalidate_cache();

    if (!storage_init()) {
        return false;
    }

    ScopedPeerTable loaded;
    uint8_t loaded_count = 0;
    const StorageStatus status =
        storage_load_peer_records(loaded.records, loaded_count);

    if (status == StorageStatus::NOT_FOUND) {
        // First boot, or a completed authorized clear recorded by File 4.
        // Never equate this with CORRUPT, IO_ERROR or unsupported schema.
        database_ready = true;
        return true;
    }

    if (status != StorageStatus::OK ||
        !validate_table(loaded.records, loaded_count)) {
        return false;
    }

    if (loaded_count != 0) {
        std::memcpy(peer_records, loaded.records,
                    sizeof(PeerRecord) * loaded_count);
    }
    peer_count = loaded_count;
    database_ready = true;
    return true;
}

bool trust_ready() {
    return database_ready;
}

// Includes revoked records, which occupy persistent trust slots.
uint8_t trust_peer_count() {
    return database_ready ? peer_count : 0;
}

// =======================================================
// Read-only trust lookups
// =======================================================

bool trust_copy_peer(uint8_t peer_id, PeerRecord &output) {
    std::memset(&output, 0, sizeof(output));

    const int index = find_peer_index(peer_id);
    if (index < 0) {
        return false;
    }

    std::memcpy(&output, &peer_records[index], sizeof(output));
    return true;
}

bool trust_copy_trusted_peer(uint8_t peer_id, PeerRecord &output) {
    std::memset(&output, 0, sizeof(output));

    const int index = find_peer_index(peer_id);
    if (index < 0 ||
        peer_records[index].trust_state != TrustState::TRUSTED) {
        return false;
    }

    std::memcpy(&output, &peer_records[index], sizeof(output));
    return true;
}

// =======================================================
// Identity continuity check (not a live possession proof)
// =======================================================

TrustVerifyResult trust_verify_peer(
    uint8_t peer_id,
    const uint8_t presented_public_key[P256_PUBLIC_SIZE]) {

    if (!database_ready) {
        return TrustVerifyResult::NOT_READY;
    }
    if (!presented_public_key ||
        !crypto_p256_validate_public(presented_public_key)) {
        return TrustVerifyResult::INVALID_PUBLIC_KEY;
    }

    const int index = find_peer_index(peer_id);
    if (index < 0) {
        return TrustVerifyResult::UNKNOWN_PEER;
    }

    const PeerRecord &stored = peer_records[index];
    if (stored.trust_state == TrustState::REVOKED) {
        return TrustVerifyResult::REVOKED;
    }
    if (stored.trust_state != TrustState::TRUSTED) {
        return TrustVerifyResult::STORAGE_ERROR;
    }

    ScopedFingerprint presented_fp;
    if (!crypto_sha256(presented_public_key, P256_PUBLIC_SIZE,
                       presented_fp.bytes)) {
        return TrustVerifyResult::STORAGE_ERROR;
    }

    if (!crypto_constant_time_equal(stored.fingerprint,
                                    presented_fp.bytes, SHA256_SIZE) ||
        !crypto_constant_time_equal(stored.public_key,
                                    presented_public_key,
                                    P256_PUBLIC_SIZE)) {
        return TrustVerifyResult::IDENTITY_MISMATCH;
    }

    // The handshake must additionally verify the peer's signature and
    // key confirmation; a matching stored public key alone is insufficient.
    return TrustVerifyResult::TRUSTED;
}

// =======================================================
// Authorized enrollment
// =======================================================

bool trust_enroll_peer(uint8_t peer_id, const char *callsign,
                       const uint8_t public_key[P256_PUBLIC_SIZE],
                       bool local_authorized) {
    if (!database_ready || !local_authorized || peer_id == 0 ||
        !public_key || !crypto_p256_validate_public(public_key)) {
        return false;
    }

    ScopedFingerprint fingerprint;
    if (!crypto_sha256(public_key, P256_PUBLIC_SIZE,
                       fingerprint.bytes)) {
        return false;
    }

    const int existing_index = find_peer_index(peer_id);
    if (existing_index >= 0) {
        const PeerRecord &existing = peer_records[existing_index];

        // Idempotent only for an already-TRUSTED identical identity.
        // A revoked identity cannot be resurrected by enrollment.
        return existing.trust_state == TrustState::TRUSTED &&
               crypto_constant_time_equal(existing.fingerprint,
                                          fingerprint.bytes,
                                          SHA256_SIZE) &&
               crypto_constant_time_equal(existing.public_key,
                                          public_key,
                                          P256_PUBLIC_SIZE);
    }

    if (peer_count >= MAX_TRUSTED_PEERS) {
        return false;
    }

    // The same static key must not be enrolled under a different peer ID,
    // including when its prior peer record has been revoked.
    for (uint8_t i = 0; i < peer_count; ++i) {
        if (crypto_constant_time_equal(peer_records[i].fingerprint,
                                       fingerprint.bytes,
                                       SHA256_SIZE) ||
            crypto_constant_time_equal(peer_records[i].public_key,
                                       public_key,
                                       P256_PUBLIC_SIZE)) {
            return false;
        }
    }

    std::unique_ptr<ScopedPeerTable> staged{
        new (std::nothrow) ScopedPeerTable()};
    if (!staged) {
        return false;
    }
    std::memcpy(staged->records, peer_records, sizeof(peer_records));

    PeerRecord &entry = staged->records[peer_count];
    std::memset(&entry, 0, sizeof(entry));
    if (!copy_callsign(entry.callsign, callsign)) {
        return false;
    }
    entry.peer_id = peer_id;
    entry.valid = true;
    entry.trust_state = TrustState::TRUSTED;
    std::memcpy(entry.public_key, public_key, P256_PUBLIC_SIZE);
    std::memcpy(entry.fingerprint, fingerprint.bytes, SHA256_SIZE);

    return commit_table(staged->records,
                        static_cast<uint8_t>(peer_count + 1));
}

// =======================================================
// Authorized revocation; retains identity deny record
// =======================================================

bool trust_revoke_peer(uint8_t peer_id, bool local_authorized) {
    if (!database_ready || !local_authorized) {
        return false;
    }

    const int index = find_peer_index(peer_id);
    if (index < 0) {
        return false;
    }
    if (peer_records[index].trust_state == TrustState::REVOKED) {
        return true; // Already durably revoked in the validated cache.
    }

    std::unique_ptr<ScopedPeerTable> staged{
        new (std::nothrow) ScopedPeerTable()};
    if (!staged) {
        return false;
    }
    std::memcpy(staged->records, peer_records, sizeof(peer_records));
    staged->records[index].trust_state = TrustState::REVOKED;

    // Caller must also terminate any active session for this peer.
    return commit_table(staged->records, peer_count);
}

// =======================================================
// Authorized trust removal (permits later fresh pairing)
// =======================================================

bool trust_remove_peer(uint8_t peer_id, bool local_authorized) {
    if (!database_ready || !local_authorized) {
        return false;
    }

    const int index = find_peer_index(peer_id);
    if (index < 0) {
        return false;
    }

    std::unique_ptr<ScopedPeerTable> staged{
        new (std::nothrow) ScopedPeerTable()};
    if (!staged) {
        return false;
    }
    std::memcpy(staged->records, peer_records, sizeof(peer_records));

    for (uint8_t i = static_cast<uint8_t>(index);
         static_cast<uint8_t>(i + 1) < peer_count; ++i) {
        staged->records[i] = staged->records[i + 1];
    }

    const uint8_t next_count = static_cast<uint8_t>(peer_count - 1);
    secure_zero(&staged->records[next_count], sizeof(PeerRecord));

    // Caller must invalidate active sessions bound to the removed peer.
    return commit_table(staged->records, next_count);
}

// =======================================================
// Authorized reset of all trust records
// =======================================================

bool trust_clear_all(bool local_authorized) {
    if (!database_ready || !local_authorized) {
        return false;
    }

    const StorageStatus status = storage_erase_peer_records(true);
    if (status != StorageStatus::OK &&
        status != StorageStatus::NOT_FOUND) {
        // Even if storage failed, a durable erase marker may already have
        // been written. Disallow all trust-dependent operations until reload.
        invalidate_cache();
        return false;
    }

    peer_count = 0;
    secure_zero(peer_records, sizeof(peer_records));
    // Remain ready with no trusted peers; any future enrollment must be
    // explicitly authorized and paired again.
    return true;
}

// =======================================================
// Human-readable verification results
// =======================================================

const char *trust_verify_result_name(TrustVerifyResult result) {
    switch (result) {
        case TrustVerifyResult::TRUSTED:
            return "TRUSTED";
        case TrustVerifyResult::UNKNOWN_PEER:
            return "UNKNOWN PEER";
        case TrustVerifyResult::IDENTITY_MISMATCH:
            return "IDENTITY MISMATCH";
        case TrustVerifyResult::REVOKED:
            return "REVOKED";
        case TrustVerifyResult::INVALID_PUBLIC_KEY:
            return "INVALID PUBLIC KEY";
        case TrustVerifyResult::STORAGE_ERROR:
            return "STORAGE ERROR";
        case TrustVerifyResult::NOT_READY:
            return "NOT READY";
        default:
            return "UNKNOWN";
    }
}

} // namespace gw
