#include "gw_agreement.h"
#include "gw_crypto.h"
#include "gw_identity.h"
#include <cstring>

namespace gw {

bool agreement_derive_3dh(
    bool is_initiator,
    const uint8_t local_ephemeral_private[P256_PRIVATE_SIZE],
    const uint8_t remote_ephemeral_public[P256_PUBLIC_SIZE],
    const uint8_t remote_trusted_identity_public[P256_PUBLIC_SIZE],
    const uint8_t transcript_hash[SHA256_SIZE],
    uint8_t output[SHA256_SIZE]) {
    if (!output) return false;
    memset(output, 0, SHA256_SIZE);
    if (!local_ephemeral_private || !remote_ephemeral_public ||
        !remote_trusted_identity_public || !transcript_hash ||
        !identity_ready() ||
        !crypto_p256_validate_public(remote_ephemeral_public) ||
        !crypto_p256_validate_public(remote_trusted_identity_public)) return false;

    // Canonical order independent of which endpoint computes the secret:
    // DH_ee = E_I * E_R
    // DH_se = S_I * E_R
    // DH_es = E_I * S_R
    // Preserve EE even if either static key is compromised later (PFS).
    // This is not post-quantum forward secrecy.
    static constexpr char domain[] = "GWSSIP/CLAIM4/3DH-IKM/1.1";
    static constexpr char info[] = "GWSSIP/CLAIM4/3DH-EXTRACT/1.1";
    uint8_t ikm[sizeof(domain) - 1 + 3 * SHA256_SIZE] = {};
    uint8_t temp[SHA256_SIZE] = {};
    size_t pos = sizeof(domain) - 1;
    memcpy(ikm, domain, pos);
    bool ok = crypto_p256_ecdh(local_ephemeral_private,
                               remote_ephemeral_public, temp);
    if (ok) { memcpy(ikm + pos, temp, SHA256_SIZE); pos += SHA256_SIZE; }
    secure_zero(temp, sizeof(temp));

    if (ok) {
        ok = is_initiator
            ? identity_agree_ephemeral(remote_ephemeral_public, temp)
            : crypto_p256_ecdh(local_ephemeral_private,
                               remote_trusted_identity_public, temp);
        if (ok) { memcpy(ikm + pos, temp, SHA256_SIZE); pos += SHA256_SIZE; }
    }
    secure_zero(temp, sizeof(temp));

    if (ok) {
        ok = is_initiator
            ? crypto_p256_ecdh(local_ephemeral_private,
                               remote_trusted_identity_public, temp)
            : identity_agree_ephemeral(remote_ephemeral_public, temp);
        if (ok) { memcpy(ikm + pos, temp, SHA256_SIZE); pos += SHA256_SIZE; }
    }
    secure_zero(temp, sizeof(temp));

    if (ok && pos == sizeof(ikm)) {
        ok = crypto_hkdf_sha256(transcript_hash, SHA256_SIZE,
                                ikm, sizeof(ikm),
                                reinterpret_cast<const uint8_t*>(info),
                                sizeof(info) - 1, output, SHA256_SIZE);
    } else { ok = false; }

    secure_zero(ikm, sizeof(ikm));
    if (!ok) secure_zero(output, SHA256_SIZE);
    return ok;
}

} // namespace gw
