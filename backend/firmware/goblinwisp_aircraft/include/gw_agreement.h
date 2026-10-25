#pragma once
#include "gw_security_types.h"
namespace gw {
// Domain-separated, role-canonical 3DH: E_I*E_R, S_I*E_R, E_I*S_R.
// Signatures are independently required by the handshake. A caller MUST
// authenticate the remote identity public key and transcript first.
// Do not call this with untrusted identity material.
bool agreement_derive_3dh(
    bool is_initiator,
    const uint8_t local_ephemeral_private[P256_PRIVATE_SIZE],
    const uint8_t remote_ephemeral_public[P256_PUBLIC_SIZE],
    const uint8_t remote_trusted_identity_public[P256_PUBLIC_SIZE],
    const uint8_t transcript_hash[SHA256_SIZE],
    uint8_t output[SHA256_SIZE]
);
} // namespace gw
