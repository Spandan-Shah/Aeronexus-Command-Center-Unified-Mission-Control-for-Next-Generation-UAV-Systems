
#include "gw_storage.h"
#include "gw_crypto.h"

#include <Preferences.h>
#if defined(__has_include)
# if __has_include(<esp_flash_encrypt.h>)
#  include <esp_flash_encrypt.h>
#  define GW_CAN_CHECK_FLASH_ENCRYPTION 1
# endif
#endif
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <climits>
#include <memory>
#include <new>

namespace gw {
namespace {

// Preserve legacy NVS names and existing identities.
constexpr const char *IDENTITY_NS = "gw_ident";
constexpr const char *TRUST_NS = "gw_trust";
constexpr const char *IDENTITY_LEGACY = "identity";
constexpr const char *TRUST_LEGACY = "peers";

// NVS names must remain within 15 characters.
constexpr const char *SLOT_A = "slot_a";
constexpr const char *SLOT_B = "slot_b";
constexpr const char *ERASE_GATE = "erased";

constexpr uint32_t IDENTITY_MAGIC = 0x47574944UL;
constexpr uint32_t TRUST_MAGIC = 0x47575452UL;
constexpr uint32_t JOURNAL_ID_MAGIC = 0x47574932UL;
constexpr uint32_t JOURNAL_TR_MAGIC = 0x47575432UL;

constexpr uint16_t LEGACY_SCHEMA = 1;
constexpr uint16_t JOURNAL_SCHEMA = 2;

constexpr uint8_t RECORD_ACTIVE = 1;
constexpr uint8_t RECORD_ERASED = 2;

// =======================================================
// Persistent wire formats
// =======================================================

#pragma pack(push, 1)

struct IdentityBlob {
    uint32_t magic;
    uint16_t schema;
    uint8_t private_key[P256_PRIVATE_SIZE];
    uint8_t public_key[P256_PUBLIC_SIZE];
    uint8_t fingerprint[SHA256_SIZE];
    uint8_t valid;
};

struct StoredPeer {
    uint8_t valid;
    uint8_t peer_id;
    uint8_t trust_state;
    uint8_t reserved;
    char callsign[MAX_CALLSIGN_LEN];
    uint8_t public_key[P256_PUBLIC_SIZE];
    uint8_t fingerprint[SHA256_SIZE];
};

struct TrustBlob {
    uint32_t magic;
    uint16_t schema;
    uint8_t count;
    uint8_t reserved;
    StoredPeer peers[MAX_TRUSTED_PEERS];
};

template<typename Payload>
struct Journal {
    uint32_t magic;
    uint16_t schema;
    uint8_t state;
    uint8_t reserved;
    uint32_t generation;
    Payload payload;
    uint32_t crc32;
};

#pragma pack(pop)

// Preserve the legacy NVS data format exactly.
static_assert(sizeof(IdentityBlob) == 136,
              "Legacy identity NVS layout changed");

static_assert(sizeof(StoredPeer) == 125,
              "Legacy peer NVS layout changed");

static_assert(sizeof(TrustBlob) == 1008,
              "Legacy trust NVS layout changed");

static_assert(sizeof(Journal<TrustBlob>) == 1024,
              "Journal trust NVS layout changed");

// =======================================================
// Automatic sensitive memory cleanup
// =======================================================

template<typename T>
struct Sensitive {
    T value{};

    Sensitive() = default;

    ~Sensitive() {
        secure_zero(&value, sizeof(value));
    }

    Sensitive(const Sensitive&) = delete;
    Sensitive& operator=(const Sensitive&) = delete;
};

StorageHealth health{};

// =======================================================
// CRC32 for accidental corruption detection
//
// CRC32 is not a MAC and does not prevent a malicious
// attacker from modifying unprotected NVS.
// =======================================================

uint32_t crc32(const uint8_t *data, size_t length) {
    uint32_t crc = 0xFFFFFFFFUL;

    for (size_t i = 0; i < length; ++i) {
        crc ^= data[i];

        for (uint8_t bit = 0; bit < 8; ++bit) {
            crc = (crc >> 1) ^
                  ((crc & 1U) ? 0xEDB88320UL : 0UL);
        }
    }

    return ~crc;
}

// =======================================================
// Cryptographic identity validation
// =======================================================

bool valid_identity(const IdentityBlob &v) {
    if (v.magic != IDENTITY_MAGIC ||
        v.schema != LEGACY_SCHEMA ||
        v.valid != 1) {
        return false;
    }

    if (!crypto_p256_validate_public(v.public_key)) {
        return false;
    }

    uint8_t derived[P256_PUBLIC_SIZE] = {};
    uint8_t digest[SHA256_SIZE] = {};

    const bool ok =
        crypto_p256_public_from_private(
            v.private_key, derived) &&
        crypto_constant_time_equal(
            derived, v.public_key, sizeof(derived)) &&
        crypto_sha256(
            v.public_key, sizeof(v.public_key), digest) &&
        crypto_constant_time_equal(
            digest, v.fingerprint, sizeof(digest));

    secure_zero(derived, sizeof(derived));
    secure_zero(digest, sizeof(digest));

    return ok;
}

// =======================================================
// Trusted-peer validation
// =======================================================

bool valid_trust(const TrustBlob &v) {
    if (v.magic != TRUST_MAGIC ||
        v.schema != LEGACY_SCHEMA ||
        v.count > MAX_TRUSTED_PEERS ||
        v.reserved != 0) {
        return false;
    }

    for (uint8_t i = 0; i < v.count; ++i) {
        const StoredPeer &p = v.peers[i];

        if (p.valid != 1 ||
            p.peer_id == 0 ||
            p.reserved != 0 ||
            (p.trust_state !=
                 static_cast<uint8_t>(TrustState::TRUSTED) &&
             p.trust_state !=
                 static_cast<uint8_t>(TrustState::REVOKED)) ||
            !memchr(p.callsign, '\0', MAX_CALLSIGN_LEN) ||
            !crypto_p256_validate_public(p.public_key)) {
            return false;
        }

        uint8_t digest[SHA256_SIZE] = {};

        const bool match =
            crypto_sha256(
                p.public_key,
                sizeof(p.public_key),
                digest) &&
            crypto_constant_time_equal(
                digest,
                p.fingerprint,
                sizeof(digest));

        secure_zero(digest, sizeof(digest));

        if (!match) {
            return false;
        }

        // No duplicate logical IDs or device identities.
        for (uint8_t j = 0; j < i; ++j) {
            if (v.peers[j].peer_id == p.peer_id ||
                crypto_constant_time_equal(
                    v.peers[j].fingerprint,
                    p.fingerprint,
                    SHA256_SIZE)) {
                return false;
            }
        }
    }

    return true;
}

template<typename T>
bool valid_payload(const T &v);

template<>
bool valid_payload<IdentityBlob>(
    const IdentityBlob &v) {
    return valid_identity(v);
}

template<>
bool valid_payload<TrustBlob>(
    const TrustBlob &v) {
    return valid_trust(v);
}

// =======================================================
// Journal validation
// =======================================================

template<typename T>
bool record_valid(
    const Journal<T> &r,
    uint32_t magic) {

    if (r.magic != magic ||
        r.schema != JOURNAL_SCHEMA ||
        r.reserved != 0 ||
        r.generation == 0 ||
        (r.state != RECORD_ACTIVE &&
         r.state != RECORD_ERASED)) {
        return false;
    }

    if (crc32(
            reinterpret_cast<const uint8_t*>(&r),
            offsetof(Journal<T>, crc32)) != r.crc32) {
        return false;
    }

    if (r.state == RECORD_ERASED) {
        const uint8_t *ptr =
            reinterpret_cast<const uint8_t*>(&r.payload);

        for (size_t i = 0; i < sizeof(T); ++i) {
            if (ptr[i] != 0) {
                return false;
            }
        }

        return true;
    }

    return valid_payload(r.payload);
}

template<typename T>
bool read_slot(
    Preferences &p,
    const char *key,
    uint32_t magic,
    Journal<T> &out) {

    if (p.getBytesLength(key) != sizeof(out)) {
        return false;
    }

    if (p.getBytes(key, &out, sizeof(out)) != sizeof(out)) {
        return false;
    }

    return record_valid(out, magic);
}

// =======================================================
// Select most recent valid journal record
// =======================================================

template<typename T>
StorageStatus read_current(
    Preferences &p,
    uint32_t magic,
    Journal<T> &selected,
    bool &from_a,
    bool &recovered,
    bool &journal_present) {

    journal_present =
        p.isKey(SLOT_A) || p.isKey(SLOT_B);

    recovered = false;

    // These journal records are ~1 KiB each for TrustBlob.
    // Keep them off Arduino loopTask's stack; Sensitive still
    // zeroizes the complete record before the heap block is freed.
    std::unique_ptr<Sensitive<Journal<T>>> a{
        new (std::nothrow) Sensitive<Journal<T>>()};
    std::unique_ptr<Sensitive<Journal<T>>> b{
        new (std::nothrow) Sensitive<Journal<T>>()};
    if (!a || !b) {
        return StorageStatus::IO_ERROR;
    }

    const bool a_ok =
        read_slot(p, SLOT_A, magic, a->value);

    const bool b_ok =
        read_slot(p, SLOT_B, magic, b->value);

    if (!a_ok && !b_ok) {
        return journal_present
            ? StorageStatus::CORRUPT
            : StorageStatus::NOT_FOUND;
    }

    // Equal generations with different contents
    // are ambiguous and must fail closed.
    if (a_ok && b_ok &&
        a->value.generation == b->value.generation) {

        if (memcmp(
                &a->value,
                &b->value,
                sizeof(a->value)) != 0) {
            return StorageStatus::CORRUPT;
        }
    }

    from_a =
        a_ok &&
        (!b_ok ||
         a->value.generation >= b->value.generation);

    selected = from_a ? a->value : b->value;

    recovered =
        (from_a && p.isKey(SLOT_B) && !b_ok) ||
        (!from_a && p.isKey(SLOT_A) && !a_ok);

    return StorageStatus::OK;
}

// =======================================================
// Write to inactive journal slot and verify
// =======================================================

template<typename T>
StorageStatus write_current(
    Preferences &p,
    uint32_t magic,
    const T *payload,
    bool erased,
    StorageAreaHealth &area) {

    // Journal<T> reaches 1024 bytes for TrustBlob. Avoid stacking
    // previous + next on top of read_current() and NVS internals.
    std::unique_ptr<Sensitive<Journal<T>>> previous{
        new (std::nothrow) Sensitive<Journal<T>>()};
    if (!previous) {
        return StorageStatus::IO_ERROR;
    }

    bool from_a = false;
    bool recovered = false;
    bool present = false;

    const StorageStatus existing =
        read_current(
            p, magic,
            previous->value,
            from_a, recovered, present);

    if (existing == StorageStatus::CORRUPT) {
        return existing;
    }

    const uint32_t generation =
        existing == StorageStatus::OK
            ? previous->value.generation
            : 0;

    // Refuse ambiguous generation rollover.
    if (generation == UINT32_MAX) {
        return StorageStatus::DENIED;
    }

    std::unique_ptr<Sensitive<Journal<T>>> next{
        new (std::nothrow) Sensitive<Journal<T>>()};
    if (!next) {
        return StorageStatus::IO_ERROR;
    }

    next->value.magic = magic;
    next->value.schema = JOURNAL_SCHEMA;
    next->value.state =
        erased ? RECORD_ERASED : RECORD_ACTIVE;

    next->value.generation = generation + 1;

    if (!erased && payload) {
        next->value.payload = *payload;
    }

    next->value.crc32 =
        crc32(
            reinterpret_cast<const uint8_t*>(
                &next->value),
            offsetof(Journal<T>, crc32));

    // Preserve the previous valid copy.
    const char *target =
        existing == StorageStatus::OK
            ? (from_a ? SLOT_B : SLOT_A)
            : SLOT_A;

    if (p.putBytes(
            target,
            &next->value,
            sizeof(next->value)) != sizeof(next->value)) {
        return StorageStatus::IO_ERROR;
    }

    Sensitive<Journal<T>> verified;

    if (!read_slot(
            p, target, magic, verified.value) ||
        memcmp(
            &verified.value,
            &next->value,
            sizeof(next->value)) != 0) {
        return StorageStatus::VERIFY_FAILED;
    }

    area.format = StorageFormat::JOURNALED_TWO_SLOT;
    area.generation = next->value.generation;
    area.recovered_previous_slot = false;
    area.erase_marker_present = erased;

    return StorageStatus::OK;
}

// =======================================================
// Durable erase gate
// =======================================================

bool erase_gate(Preferences &p) {
    return p.getUChar(ERASE_GATE, 0) == 1;
}

bool set_erase_gate(Preferences &p) {
    return p.putUChar(ERASE_GATE, 1) == 1 &&
           p.isKey(ERASE_GATE) &&
           erase_gate(p);
}

bool clear_erase_gate(Preferences &p) {
    if (!p.isKey(ERASE_GATE)) {
        return true;
    }

    if (!p.remove(ERASE_GATE)) {
        return false;
    }

    return !p.isKey(ERASE_GATE);
}

// =======================================================
// Load from journal or validated legacy storage
// =======================================================

template<typename T>
StorageStatus load_blob(
    const char *ns,
    const char *legacy_key,
    uint32_t magic,
    uint32_t legacy_magic,
    T &output,
    StorageAreaHealth &area) {

    Preferences p;

    if (!p.begin(ns, true)) {
        return StorageStatus::IO_ERROR;
    }

    // A damaged erase gate cannot authorize
    // restoration of previous identity/trust data.
    const bool gate_present = p.isKey(ERASE_GATE);

    if (gate_present && !erase_gate(p)) {
        p.end();
        area.erase_marker_present = true;
        return StorageStatus::CORRUPT;
    }

    area.erase_marker_present = gate_present;

    if (area.erase_marker_present) {
        p.end();
        area.format = StorageFormat::JOURNALED_TWO_SLOT;
        return StorageStatus::NOT_FOUND;
    }

    Sensitive<Journal<T>> current;

    bool from_a = false;
    bool recovered = false;
    bool present = false;

    StorageStatus result =
        read_current(
            p, magic,
            current.value,
            from_a, recovered, present);

    if (result == StorageStatus::OK) {
        area.format =
            StorageFormat::JOURNALED_TWO_SLOT;

        area.generation = current.value.generation;
        area.recovered_previous_slot = recovered;

        if (current.value.state == RECORD_ERASED) {
            result = StorageStatus::NOT_FOUND;
        } else {
            output = current.value.payload;
        }
    }
    else if (result == StorageStatus::NOT_FOUND &&
             !present) {

        const size_t n =
            p.getBytesLength(legacy_key);

        if (n == 0) {
            area.format = StorageFormat::NONE;
        }
        else if (
            n != sizeof(T) ||
            p.getBytes(
                legacy_key, &output, sizeof(T)) != n) {

            result = StorageStatus::CORRUPT;
            secure_zero(&output, sizeof(output));
        }
        else if (
            output.magic != legacy_magic ||
            !valid_payload(output)) {

            result =
                (output.magic == legacy_magic &&
                 output.schema != LEGACY_SCHEMA)
                    ? StorageStatus::UNSUPPORTED_SCHEMA
                    : StorageStatus::CORRUPT;

            secure_zero(&output, sizeof(output));
        }
        else {
            area.format =
                StorageFormat::LEGACY_SINGLE_BLOB;

            result = StorageStatus::OK;
        }
    }
    else {
        area.format =
            StorageFormat::JOURNALED_TWO_SLOT;
    }

    p.end();
    return result;
}

// =======================================================
// Save verified payload
// =======================================================

template<typename T>
StorageStatus save_blob(
    const char *ns,
    uint32_t magic,
    const T &payload,
    StorageAreaHealth &area) {

    if (!valid_payload(payload)) {
        return StorageStatus::CORRUPT;
    }

    Preferences p;

    if (!p.begin(ns, false)) {
        return StorageStatus::IO_ERROR;
    }

    const StorageStatus result =
        write_current(
            p, magic, &payload, false, area);

    if (result != StorageStatus::OK) {
        p.end();
        return result;
    }

    // Re-enrollment may clear a previous erase gate
    // only after fresh records are durably saved.
    if (!clear_erase_gate(p)) {
        p.end();
        return StorageStatus::VERIFY_FAILED;
    }

    p.end();
    area.erase_marker_present = false;

    return StorageStatus::OK;
}

// =======================================================
// Authorized erase with persistent tombstone
// =======================================================

template<typename T>
StorageStatus erase_blob(
    const char *ns,
    uint32_t magic,
    bool authorized,
    StorageAreaHealth &area) {

    if (!authorized) {
        return StorageStatus::DENIED;
    }

    Preferences p;

    if (!p.begin(ns, false)) {
        return StorageStatus::IO_ERROR;
    }

    // Block old records before modifying the journal.
    if (!set_erase_gate(p)) {
        p.end();
        return StorageStatus::IO_ERROR;
    }

    area.erase_marker_present = true;

    const StorageStatus result =
        write_current<T>(
            p, magic, nullptr, true, area);

    p.end();

    // If journal writing fails, the erase gate
    // continues blocking old records.
    return result;
}

void set_health(
    StorageAreaHealth &area,
    StorageStatus result) {

    area.last_status = result;
}

} // anonymous namespace

// =======================================================
// Public storage initialization
// =======================================================

bool storage_init() {
    Preferences a, b;

    if (!a.begin(IDENTITY_NS, false)) {
        health.initialized = false;
        return false;
    }

    a.end();

    if (!b.begin(TRUST_NS, false)) {
        health.initialized = false;
        return false;
    }

    b.end();

    health.initialized = true;

    // UNKNOWN until encrypted NVS is independently
    // provisioned and positively verified.
    health.protection = StorageProtection::UNKNOWN;
#if defined(GW_CAN_CHECK_FLASH_ENCRYPTION)
    // If hardware flash encryption is OFF, default Preferences NVS cannot
    // meet our hardware-protected storage requirement. If it is ON, keep
    // UNKNOWN: NVS encryption and key provenance are still not attested.
    if (!esp_flash_encryption_enabled())
        health.protection = StorageProtection::UNPROTECTED;
#endif

    return true;
}

// =======================================================
// Load persistent device identity
// =======================================================

StorageStatus storage_load_identity(
    IdentityMaterial &identity) {

    secure_zero(&identity, sizeof(identity));

    Sensitive<IdentityBlob> blob;

    const StorageStatus result =
        load_blob(
            IDENTITY_NS,
            IDENTITY_LEGACY,
            JOURNAL_ID_MAGIC,
            IDENTITY_MAGIC,
            blob.value,
            health.identity);

    set_health(health.identity, result);

    if (result == StorageStatus::OK) {
        memcpy(
            identity.private_key,
            blob.value.private_key,
            P256_PRIVATE_SIZE);

        memcpy(
            identity.public_key,
            blob.value.public_key,
            P256_PUBLIC_SIZE);

        memcpy(
            identity.fingerprint,
            blob.value.fingerprint,
            SHA256_SIZE);

        identity.valid = true;
    }

    return result;
}

// =======================================================
// Save persistent device identity
// =======================================================

StorageStatus storage_save_identity(
    const IdentityMaterial &identity) {

    if (!identity.valid) {
        set_health(
            health.identity, StorageStatus::CORRUPT);
        return StorageStatus::CORRUPT;
    }

    Sensitive<IdentityBlob> blob;

    blob.value.magic = IDENTITY_MAGIC;
    blob.value.schema = LEGACY_SCHEMA;
    blob.value.valid = 1;

    memcpy(
        blob.value.private_key,
        identity.private_key,
        P256_PRIVATE_SIZE);

    memcpy(
        blob.value.public_key,
        identity.public_key,
        P256_PUBLIC_SIZE);

    memcpy(
        blob.value.fingerprint,
        identity.fingerprint,
        SHA256_SIZE);

    const StorageStatus result =
        save_blob(
            IDENTITY_NS,
            JOURNAL_ID_MAGIC,
            blob.value,
            health.identity);

    set_health(health.identity, result);

    return result;
}

// =======================================================
// Erase persistent identity
// =======================================================

StorageStatus storage_erase_identity(
    bool locally_authorized) {

    const StorageStatus result =
        erase_blob<IdentityBlob>(
            IDENTITY_NS,
            JOURNAL_ID_MAGIC,
            locally_authorized,
            health.identity);

    set_health(health.identity, result);

    return result;
}

// =======================================================
// Load persistent trust records
// =======================================================

StorageStatus storage_load_peer_records(
    PeerRecord records[MAX_TRUSTED_PEERS],
    uint8_t &count) {

    count = 0;

    secure_zero(
        records,
        sizeof(PeerRecord) * MAX_TRUSTED_PEERS);

    Sensitive<TrustBlob> blob;

    const StorageStatus result =
        load_blob(
            TRUST_NS,
            TRUST_LEGACY,
            JOURNAL_TR_MAGIC,
            TRUST_MAGIC,
            blob.value,
            health.trust);

    set_health(health.trust, result);

    if (result != StorageStatus::OK) {
        return result;
    }

    count = blob.value.count;

    for (uint8_t i = 0; i < count; ++i) {
        const StoredPeer &from =
            blob.value.peers[i];

        PeerRecord &to = records[i];

        to.valid = true;
        to.peer_id = from.peer_id;

        to.trust_state =
            static_cast<TrustState>(
                from.trust_state);

        memcpy(
            to.callsign,
            from.callsign,
            MAX_CALLSIGN_LEN);

        memcpy(
            to.public_key,
            from.public_key,
            P256_PUBLIC_SIZE);

        memcpy(
            to.fingerprint,
            from.fingerprint,
            SHA256_SIZE);
    }

    return result;
}

// =======================================================
// Save persistent trust records
// =======================================================

StorageStatus storage_save_peer_records(
    const PeerRecord records[MAX_TRUSTED_PEERS],
    uint8_t count) {

    if (count > MAX_TRUSTED_PEERS ||
        (count && !records)) {
        set_health(
            health.trust, StorageStatus::CORRUPT);
        return StorageStatus::CORRUPT;
    }

    std::unique_ptr<Sensitive<TrustBlob>> blob{
        new (std::nothrow) Sensitive<TrustBlob>()};
    if (!blob) {
        set_health(health.trust, StorageStatus::IO_ERROR);
        return StorageStatus::IO_ERROR;
    }

    blob->value.magic = TRUST_MAGIC;
    blob->value.schema = LEGACY_SCHEMA;
    blob->value.count = count;

    for (uint8_t i = 0; i < count; ++i) {
        const PeerRecord &from = records[i];
        StoredPeer &to = blob->value.peers[i];

        to.valid = from.valid ? 1 : 0;
        to.peer_id = from.peer_id;

        to.trust_state =
            static_cast<uint8_t>(
                from.trust_state);

        memcpy(
            to.callsign,
            from.callsign,
            MAX_CALLSIGN_LEN);

        to.callsign[MAX_CALLSIGN_LEN - 1] = '\0';

        memcpy(
            to.public_key,
            from.public_key,
            P256_PUBLIC_SIZE);

        memcpy(
            to.fingerprint,
            from.fingerprint,
            SHA256_SIZE);
    }

    const StorageStatus result =
        save_blob(
            TRUST_NS,
            JOURNAL_TR_MAGIC,
            blob->value,
            health.trust);

    set_health(health.trust, result);

    return result;
}

// =======================================================
// Erase persistent trust records
// =======================================================

StorageStatus storage_erase_peer_records(
    bool locally_authorized) {

    const StorageStatus result =
        erase_blob<TrustBlob>(
            TRUST_NS,
            JOURNAL_TR_MAGIC,
            locally_authorized,
            health.trust);

    set_health(health.trust, result);

    return result;
}

// =======================================================
// Read-only storage health
// =======================================================

StorageStatus storage_get_health(
    StorageHealth &output) {

    output = health;

    return health.initialized
        ? StorageStatus::OK
        : StorageStatus::IO_ERROR;
}

} // namespace gw
