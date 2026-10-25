
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"

namespace gw
{

// =======================================================
// Persistent storage result codes
//
// Values 0-4 are unchanged from the existing codebase.
// Append new values; do not renumber earlier results.
// =======================================================

enum class StorageStatus : uint8_t
{
    OK                  = 0,
    NOT_FOUND           = 1,
    CORRUPT             = 2,
    IO_ERROR            = 3,
    DENIED              = 4,

    UNSUPPORTED_SCHEMA  = 5,
    VERIFY_FAILED       = 6,
    PROTECTION_REQUIRED = 7
};

// =======================================================
// Storage format and physical protection diagnostics
//
// These are runtime diagnostics, NEVER persistent blobs.
// A CRC/checksum detects accidental corruption; it does
// NOT authenticate data or provide encryption.
// =======================================================

enum class StorageFormat : uint8_t
{
    NONE               = 0,
    LEGACY_SINGLE_BLOB = 1,
    JOURNALED_TWO_SLOT = 2
};

enum class StorageProtection : uint8_t
{
    UNKNOWN            = 0,
    UNPROTECTED        = 1,
    VERIFIED_ENCRYPTED = 2
};

struct StorageAreaHealth
{
    StorageStatus last_status;
    StorageFormat format;

    // Monotonically increasing journal generation is for
    // selecting a surviving valid copy. Without hardware
    // anti-rollback, it cannot prevent malicious rollback.
    uint32_t generation;

    // True when an older verified journal slot was used.
    bool recovered_previous_slot;

    // True after an authorized erase has been durably
    // recorded, preventing migration from stale blobs.
    bool erase_marker_present;
};

struct StorageHealth
{
    StorageAreaHealth identity;
    StorageAreaHealth trust;

    // VERIFIED_ENCRYPTED is permitted only after evidence
    // that encrypted NVS is actually provisioned and active;
    // a build flag or working Preferences API is not proof.
    StorageProtection protection;

    bool initialized;
};

// =======================================================
// Storage initialization
//
// Initialize both identity and trusted-peer namespaces.
// Do not silently overwrite corrupt, incompatible, or
// previously revoked identity/trust records.
// =======================================================

bool storage_init();

// =======================================================
// Persistent local identity
//
// On ANY load failure, output must be zeroized and invalid.
// NOT_FOUND means no usable record exists; CORRUPT and
// UNSUPPORTED_SCHEMA must never trigger key regeneration.
// Save must validate, write durably, and read back before
// returning OK. Preserve the last valid record on failure.
// No ephemeral session secrets are stored here.
// =======================================================

StorageStatus storage_load_identity(
    IdentityMaterial &identity
);

StorageStatus storage_save_identity(
    const IdentityMaterial &identity
);

// Authorization must originate from deliberate LOCAL
// physical/UI action, not from an unauthenticated packet.
// A successful erase must leave a durable tombstone so an
// older legacy blob cannot silently restore the identity.
StorageStatus storage_erase_identity(
    bool locally_authorized
);

// =======================================================
// Persistent trusted peer records
//
// count is the number of occupied stored records, bounded
// by MAX_TRUSTED_PEERS. Revocation information must survive
// reboot and storage migration until explicitly authorized
// for removal. Reject duplicate peer IDs and invalid state.
// On unsuccessful loads, clear records and set count to 0.
// =======================================================

StorageStatus storage_load_peer_records(
    PeerRecord records[MAX_TRUSTED_PEERS],
    uint8_t &count
);

StorageStatus storage_save_peer_records(
    const PeerRecord records[MAX_TRUSTED_PEERS],
    uint8_t count
);

StorageStatus storage_erase_peer_records(
    bool locally_authorized
);

// =======================================================
// Read-only storage diagnostics (implemented in File 4)
//
// No private keys, public keys, or trusted peer data are
// copied to the health result. A healthy redundant journal
// does not by itself mean the device storage is encrypted.
// =======================================================

StorageStatus storage_get_health(
    StorageHealth &health
);

// =======================================================
// Compile-time interface invariants
// =======================================================

static_assert(MAX_TRUSTED_PEERS > 0,
              "GoblinWisp must support at least one trusted peer");

static_assert(sizeof(uint8_t) == 1,
              "Storage format requires 8-bit bytes");

static_assert(sizeof(uint32_t) == 4,
              "Journal generation requires a 32-bit integer");

} // namespace gw
