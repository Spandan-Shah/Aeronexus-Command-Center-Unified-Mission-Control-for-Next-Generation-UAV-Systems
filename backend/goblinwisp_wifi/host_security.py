from __future__ import annotations

"""
MissionNexus host-side implementation of the GoblinWisp v1.1 secure-session
wire protocol used by the existing ESP32 firmware.

Security model implemented here:
- persistent P-256 identity
- trusted peer fingerprint/public-key pinning
- authenticated P-256 triple-DH handshake
- HKDF-SHA256 context-bound directional derivation
- independent A->B and B->A AES-256-GCM contexts
- deterministic nonce prefix || uint64 counter
- authentication before replay-window mutation
- reset-safe volatile sessions

The host is SIDE_A / logical ID 0xA1.
The aircraft is SIDE_B / logical ID 0xB1.

This module intentionally contains no network code. Opaque wire packets are
sent/received by a transport adapter so GoblinWisp remains transport-agnostic.
"""

from dataclasses import dataclass, field
from hashlib import sha256
import hmac
import json
import os
from pathlib import Path
import secrets
import struct
import time as _time
from typing import Any

from cryptography.exceptions import InvalidSignature, InvalidTag
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


# ---------------------------------------------------------------------------
# Protocol constants -- must match the existing GoblinWisp firmware.
# ---------------------------------------------------------------------------

PROTOCOL_MAJOR = 1
PROTOCOL_MINOR = 1
SECURITY_SUITE = 0x0101  # P256_HKDF_SHA256_AES256_GCM

HOST_ID = 0xA1
AIRCRAFT_ID = 0xB1

CAP_DIRECTIONAL_CONTEXTS = 1 << 0
CAP_KEY_CONFIRMATION = 1 << 1
CAP_REKEY = 1 << 2
CAP_AUTHENTICATED_3DH = 1 << 5
BASELINE_CAPABILITIES = (
    CAP_DIRECTIONAL_CONTEXTS
    | CAP_KEY_CONFIRMATION
    | CAP_REKEY
    | CAP_AUTHENTICATED_3DH
)
REQUIRED_CAPABILITIES = (
    CAP_DIRECTIONAL_CONTEXTS
    | CAP_KEY_CONFIRMATION
    | CAP_AUTHENTICATED_3DH
)

HANDSHAKE_MAGIC = b"GWHS"
HANDSHAKE_HELLO = 1
HANDSHAKE_REPLY = 2
HANDSHAKE_CONFIRM_A = 3
HANDSHAKE_CONFIRM_B = 4

HELLO_SIZE = 207
REPLY_SIZE = 239
CONFIRM_SIZE = 84

DATA_MAGIC = b"GWSD"
SECURE_DATA = 1
SECURE_ACK = 2
SECURE_FRAGMENT = 3
SECURE_HEADER_SIZE = 18
GCM_TAG_SIZE = 16
MAX_WIRE_PACKET = 250
MAX_SINGLE_PLAINTEXT = MAX_WIRE_PACKET - SECURE_HEADER_SIZE - GCM_TAG_SIZE

DIRECTION_A_TO_B = 1
DIRECTION_B_TO_A = 2

P256_PUBLIC_SIZE = 65
P256_SIGNATURE_SIZE = 64
SHA256_SIZE = 32
NONCE_PREFIX_SIZE = 4

TRANSCRIPT_DOMAIN = b"GWSSIP-HANDSHAKE-V1.1-3DH"
HELLO_SIGN_DOMAIN = b"GWSSIP-HANDSHAKE-HELLO-V1.1-3DH"
REPLY_SIGN_DOMAIN = b"GWSSIP-HANDSHAKE-REPLY-V1.1-3DH"
CONFIRM_DOMAIN = b"GWSSIP-KEY-CONFIRM-V1.1-3DH"
AGREEMENT_IKM_DOMAIN = b"GWSSIP/CLAIM4/3DH-IKM/1.1"
AGREEMENT_EXTRACT_INFO = b"GWSSIP/CLAIM4/3DH-EXTRACT/1.1"

# Authenticated in-session rekey wire protocol. These layouts are byte-for-byte
# compatible with backend/firmware/goblinwisp_aircraft/src/security/rekey.cpp.
REKEY_MAGIC = b"GWRK"
REKEY_INIT = 1
REKEY_REPLY = 2
REKEY_CONFIRM = 3
REKEY_COMMIT = 4
REKEY_ACK = 5

REKEY_INIT_SIZE = 156
REKEY_REPLY_SIZE = 188
REKEY_PROOF_SIZE = 99

REKEY_TRANSCRIPT_DOMAIN = b"GWSSIP-REKEY-TRANSCRIPT-V1"
REKEY_KDF_DOMAIN = b"GWSSIP-REKEY-V1"

REKEY_RETRY_SECONDS = 1.0
REKEY_MAX_RETRIES = 3
# Conservative convergence window. Application traffic remains paused while
# either side may still be retaining the final authenticated proof/ACK.
REKEY_TIMEOUT_SECONDS = 10.0
REKEY_POST_COMPLETE_QUIET_SECONDS = REKEY_TIMEOUT_SECONDS

SIDE_A = 1
SIDE_B = 2

KDF_A2B_KEY = b"GWSSIP/A2B/KEY"
KDF_B2A_KEY = b"GWSSIP/B2A/KEY"
KDF_A2B_NONCE = b"GWSSIP/A2B/NONCE"
KDF_B2A_NONCE = b"GWSSIP/B2A/NONCE"
KDF_CONTROL = b"GWSSIP/CONTROL"
KDF_CONFIRM = b"GWSSIP/CONFIRM"
KDF_SESSION_ID = b"GWSSIP/SESSION-ID"


class GoblinWispSecurityError(RuntimeError):
    """Base host-security error."""


class GoblinWispTrustError(GoblinWispSecurityError):
    """Identity continuity/trust failure."""


class GoblinWispAuthenticationError(GoblinWispSecurityError):
    """Signature, confirmation-MAC or AEAD authentication failure."""


class GoblinWispReplayError(GoblinWispSecurityError):
    """Replay/counter rejection after successful authentication.

    packet_type/counter are populated only after the secure frame has already
    passed AES-GCM authentication. Runtime code may use DUPLICATE metadata to
    re-ACK an authenticated retransmission without redelivering plaintext or
    mutating replay state.
    """

    def __init__(
        self,
        reason: str,
        *,
        packet_type: int | None = None,
        counter: int | None = None,
    ) -> None:
        super().__init__(reason)
        self.reason = reason
        self.packet_type = packet_type
        self.counter = counter


class GoblinWispProtocolError(GoblinWispSecurityError):
    """Malformed or unexpected protocol frame."""


def _be16(value: int) -> bytes:
    return struct.pack(">H", value)


def _be32(value: int) -> bytes:
    return struct.pack(">I", value)


def _be64(value: int) -> bytes:
    return struct.pack(">Q", value)


def _read_be16(data: bytes) -> int:
    return struct.unpack(">H", data)[0]


def _read_be32(data: bytes) -> int:
    return struct.unpack(">I", data)[0]


def _read_be64(data: bytes) -> int:
    return struct.unpack(">Q", data)[0]


def _public_bytes(key: ec.EllipticCurvePublicKey) -> bytes:
    return key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )


def _load_public(raw: bytes) -> ec.EllipticCurvePublicKey:
    if len(raw) != P256_PUBLIC_SIZE or raw[0] != 0x04:
        raise GoblinWispProtocolError("invalid P-256 public-key encoding")
    try:
        return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw)
    except ValueError as exc:
        raise GoblinWispProtocolError("invalid P-256 public point") from exc


def _fingerprint(raw_public: bytes) -> bytes:
    return sha256(raw_public).digest()


def fingerprint_text(raw_public: bytes, full: bool = False) -> str:
    digest = _fingerprint(raw_public)
    shown = digest if full else digest[:8]
    return ":".join(f"{value:02X}" for value in shown)


def _raw_sign(private_key: ec.EllipticCurvePrivateKey, digest: bytes) -> bytes:
    if len(digest) != SHA256_SIZE:
        raise GoblinWispProtocolError("P-256 signatures require a SHA-256 digest")
    der = private_key.sign(
        digest,
        ec.ECDSA(utils.Prehashed(hashes.SHA256())),
    )
    r, s = utils.decode_dss_signature(der)
    return r.to_bytes(32, "big") + s.to_bytes(32, "big")


def _raw_verify(public_key: ec.EllipticCurvePublicKey, digest: bytes, signature: bytes) -> bool:
    if len(digest) != SHA256_SIZE or len(signature) != P256_SIGNATURE_SIZE:
        return False
    r = int.from_bytes(signature[:32], "big")
    s = int.from_bytes(signature[32:], "big")
    der = utils.encode_dss_signature(r, s)
    try:
        public_key.verify(
            der,
            digest,
            ec.ECDSA(utils.Prehashed(hashes.SHA256())),
        )
        return True
    except InvalidSignature:
        return False


def _hkdf(*, salt: bytes, ikm: bytes, info: bytes, length: int) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=length,
        salt=salt,
        info=info,
    ).derive(ikm)


def _build_kdf_info(label: bytes, transcript_hash: bytes, epoch: int) -> bytes:
    return (
        label
        + bytes([PROTOCOL_MAJOR, PROTOCOL_MINOR])
        + _be16(SECURITY_SUITE)
        + _be32(epoch)
        + transcript_hash
    )


def _derive_output(shared_secret: bytes, transcript_hash: bytes, epoch: int, label: bytes, length: int) -> bytes:
    return _hkdf(
        salt=transcript_hash,
        ikm=shared_secret,
        info=_build_kdf_info(label, transcript_hash, epoch),
        length=length,
    )


@dataclass(slots=True)
class ReplayWindow:
    highest_counter: int = 0
    bitmap: int = 0
    initialized: bool = False

    def check(self, counter: int) -> str:
        if counter == 0:
            return "INVALID_COUNTER"
        if not self.initialized:
            return "ACCEPT"
        if counter > self.highest_counter:
            return "ACCEPT"
        distance = self.highest_counter - counter
        if distance >= 64:
            return "TOO_OLD"
        if self.bitmap & (1 << distance):
            return "DUPLICATE"
        return "ACCEPT"

    def commit(self, counter: int) -> None:
        result = self.check(counter)
        if result != "ACCEPT":
            raise GoblinWispReplayError(result)
        if not self.initialized:
            self.highest_counter = counter
            self.bitmap = 1
            self.initialized = True
            return
        if counter > self.highest_counter:
            shift = counter - self.highest_counter
            self.bitmap = 1 if shift >= 64 else ((self.bitmap << shift) | 1) & ((1 << 64) - 1)
            self.highest_counter = counter
            return
        distance = self.highest_counter - counter
        self.bitmap |= 1 << distance


@dataclass(slots=True)
class DirectionalContext:
    direction: int
    traffic_key: bytes
    nonce_prefix: bytes
    key_epoch: int
    tx_counter: int = 0
    replay: ReplayWindow = field(default_factory=ReplayWindow)

    def reserve_tx_counter(self) -> int:
        if self.tx_counter >= 0xFFFFFFFFFFFFFFFF:
            raise GoblinWispProtocolError("directional TX counter exhausted")
        self.tx_counter += 1
        return self.tx_counter

    def nonce(self, counter: int) -> bytes:
        if len(self.nonce_prefix) != NONCE_PREFIX_SIZE or counter <= 0:
            raise GoblinWispProtocolError("invalid nonce state")
        return self.nonce_prefix + _be64(counter)


@dataclass(slots=True)
class SessionSecrets:
    session_id: int
    key_epoch: int
    a_to_b: DirectionalContext
    b_to_a: DirectionalContext
    control_key: bytes
    confirmation_key: bytes
    transcript_hash: bytes
    suite: int = SECURITY_SUITE
    active: bool = True


@dataclass(slots=True)
class TrustedPeer:
    peer_id: int
    callsign: str
    public_key: bytes
    fingerprint: bytes

    def to_json(self) -> dict[str, Any]:
        return {
            "peer_id": self.peer_id,
            "callsign": self.callsign,
            "public_key_hex": self.public_key.hex().upper(),
            "fingerprint_hex": self.fingerprint.hex().upper(),
        }


class PersistentIdentity:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.private_key = self._load_or_create()
        self.public_key_bytes = _public_bytes(self.private_key.public_key())
        self.fingerprint = _fingerprint(self.public_key_bytes)

    def _load_or_create(self) -> ec.EllipticCurvePrivateKey:
        if self.path.exists():
            data = self.path.read_bytes()
            key = serialization.load_pem_private_key(data, password=None)
            if not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(key.curve, ec.SECP256R1):
                raise GoblinWispSecurityError("stored MissionNexus identity is not P-256")
            return key

        key = ec.generate_private_key(ec.SECP256R1())
        pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        tmp = self.path.with_suffix(".tmp")
        tmp.write_bytes(pem)
        os.replace(tmp, self.path)
        return key


class TrustStore:
    """Persistent public-key trust only. No session material is written here."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._peers: dict[int, TrustedPeer] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        raw = json.loads(self.path.read_text(encoding="utf-8"))
        for item in raw.get("peers", []):
            public = bytes.fromhex(item["public_key_hex"])
            _load_public(public)
            expected = _fingerprint(public)
            stored = bytes.fromhex(item["fingerprint_hex"])
            if not hmac.compare_digest(expected, stored):
                raise GoblinWispTrustError("trust database fingerprint mismatch")
            peer = TrustedPeer(
                peer_id=int(item["peer_id"]),
                callsign=str(item.get("callsign", "")),
                public_key=public,
                fingerprint=expected,
            )
            self._peers[peer.peer_id] = peer

    def _save(self) -> None:
        payload = {
            "version": 1,
            "peers": [peer.to_json() for peer in self._peers.values()],
        }
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        os.replace(tmp, self.path)

    def get(self, peer_id: int) -> TrustedPeer | None:
        return self._peers.get(peer_id)

    def enroll(self, peer_id: int, callsign: str, public_key: bytes, *, locally_authorized: bool) -> TrustedPeer:
        if not locally_authorized:
            raise GoblinWispTrustError("trusted enrollment requires local authorization")
        _load_public(public_key)
        fp = _fingerprint(public_key)
        existing = self._peers.get(peer_id)
        if existing is not None and not hmac.compare_digest(existing.public_key, public_key):
            raise GoblinWispTrustError("peer ID already pinned to a different identity")
        for other_id, other in self._peers.items():
            if other_id != peer_id and hmac.compare_digest(other.public_key, public_key):
                raise GoblinWispTrustError("public identity is already enrolled to another peer ID")
        peer = TrustedPeer(peer_id=peer_id, callsign=callsign, public_key=public_key, fingerprint=fp)
        self._peers[peer_id] = peer
        self._save()
        return peer

    def remove(self, peer_id: int, *, locally_authorized: bool) -> None:
        if not locally_authorized:
            raise GoblinWispTrustError("trust reset requires local authorization")
        self._peers.pop(peer_id, None)
        self._save()


@dataclass(slots=True)
class PendingHandshake:
    ephemeral_private: ec.EllipticCurvePrivateKey
    local_ephemeral: bytes
    local_random: bytes
    hello_hash: bytes
    offered_capabilities: int
    remote_ephemeral: bytes | None = None
    remote_random: bytes | None = None
    negotiated_capabilities: int = 0
    transcript_hash: bytes | None = None
    candidate: SessionSecrets | None = None



@dataclass(slots=True)
class PendingRekey:
    initiator: bool
    state: str
    old_session: SessionSecrets
    old_sid: int
    old_epoch: int
    next_epoch: int
    ephemeral_private: ec.EllipticCurvePrivateKey
    local_ephemeral: bytes
    local_random: bytes
    remote_ephemeral: bytes | None = None
    remote_random: bytes | None = None
    init_digest: bytes | None = None
    transcript: bytes | None = None
    candidate: SessionSecrets | None = None
    last_frame: bytes | None = None
    started_monotonic: float = field(default_factory=_time.monotonic)
    last_sent_monotonic: float = field(default_factory=_time.monotonic)
    retries: int = 0


@dataclass(slots=True)
class SecureReceiveResult:
    packet_type: int
    counter: int
    plaintext: bytes
    acknowledged_counter: int | None = None
    reassembled_payload: bytes | None = None


@dataclass(slots=True)
class FragmentState:
    msg_id: int = 0
    total: int = 0
    next_index: int = 0
    buffer: bytearray = field(default_factory=bytearray)
    active: bool = False

    def reset(self) -> None:
        self.msg_id = 0
        self.total = 0
        self.next_index = 0
        self.buffer.clear()
        self.active = False


class GoblinWispHostSecurity:
    """Host-side SIDE_A implementation interoperable with the ESP32 v1.1 core."""

    def __init__(self, state_dir: str | Path) -> None:
        base = Path(state_dir)
        self.identity = PersistentIdentity(base / "missionnexus_identity.pem")
        self.trust = TrustStore(base / "trusted_peers.json")
        self.pending: PendingHandshake | None = None
        self.session: SessionSecrets | None = None
        self.fragment = FragmentState()
        self.auth_failures = 0
        self.replay_drops = 0
        self.malformed_packets = 0
        self.rekey: PendingRekey | None = None
        self.rekey_successes = 0
        self.rekey_failures = 0
        self.rekey_last_failure: str | None = None
        self.rekey_quiet_until_monotonic = 0.0

    # ---------------------------- identity/trust ----------------------------
    @property
    def local_public_key(self) -> bytes:
        return self.identity.public_key_bytes

    @property
    def local_fingerprint(self) -> bytes:
        return self.identity.fingerprint

    @property
    def local_fingerprint_text(self) -> str:
        return fingerprint_text(self.local_public_key, full=True)

    def trusted_aircraft(self) -> TrustedPeer | None:
        return self.trust.get(AIRCRAFT_ID)

    def enroll_aircraft(self, public_key: bytes, callsign: str = "GW-MN001", *, locally_authorized: bool) -> TrustedPeer:
        self.invalidate_session("trust enrollment changed")
        return self.trust.enroll(
            AIRCRAFT_ID,
            callsign,
            public_key,
            locally_authorized=locally_authorized,
        )

    def forget_aircraft(self, *, locally_authorized: bool) -> None:
        self.invalidate_session("trust reset")
        self.trust.remove(AIRCRAFT_ID, locally_authorized=locally_authorized)

    # ------------------------------ handshake ------------------------------
    def start_handshake(self) -> bytes:
        trusted = self.trusted_aircraft()
        if trusted is None:
            raise GoblinWispTrustError("aircraft identity has not been enrolled")

        self.invalidate_session("fresh authenticated handshake")

        ephemeral_private = ec.generate_private_key(ec.SECP256R1())
        local_ephemeral = _public_bytes(ephemeral_private.public_key())
        local_random = secrets.token_bytes(32)
        capabilities = BASELINE_CAPABILITIES

        prefix = (
            HANDSHAKE_MAGIC
            + bytes([PROTOCOL_MAJOR, PROTOCOL_MINOR, HANDSHAKE_HELLO, HOST_ID])
            + _be16(SECURITY_SUITE)
            + _be32(capabilities)
            + self.local_fingerprint
            + local_ephemeral
            + local_random
        )
        if len(prefix) != HELLO_SIZE - P256_SIGNATURE_SIZE:
            raise GoblinWispProtocolError("HELLO prefix layout mismatch")
        hello_hash = sha256(HELLO_SIGN_DOMAIN + prefix).digest()
        signature = _raw_sign(self.identity.private_key, hello_hash)
        packet = prefix + signature
        if len(packet) != HELLO_SIZE:
            raise GoblinWispProtocolError("HELLO layout mismatch")

        self.pending = PendingHandshake(
            ephemeral_private=ephemeral_private,
            local_ephemeral=local_ephemeral,
            local_random=local_random,
            hello_hash=hello_hash,
            offered_capabilities=capabilities,
        )
        return packet

    def handle_reply(self, packet: bytes) -> bytes:
        if self.pending is None:
            raise GoblinWispProtocolError("unexpected REPLY without pending handshake")
        if len(packet) != REPLY_SIZE:
            raise GoblinWispProtocolError("invalid REPLY size")
        if packet[:4] != HANDSHAKE_MAGIC:
            raise GoblinWispProtocolError("invalid REPLY magic")
        major, minor, kind, sender = packet[4:8]
        if (major, minor, kind, sender) != (
            PROTOCOL_MAJOR,
            PROTOCOL_MINOR,
            HANDSHAKE_REPLY,
            AIRCRAFT_ID,
        ):
            raise GoblinWispProtocolError("unexpected REPLY header")

        suite = _read_be16(packet[8:10])
        capabilities = _read_be32(packet[10:14])
        hello_hash = packet[14:46]
        identity_fp = packet[46:78]
        remote_ephemeral = packet[78:143]
        remote_random = packet[143:175]
        signature = packet[175:239]

        if suite != SECURITY_SUITE:
            raise GoblinWispProtocolError("unsupported GoblinWisp security suite")
        if (capabilities & REQUIRED_CAPABILITIES) != REQUIRED_CAPABILITIES:
            raise GoblinWispProtocolError("aircraft omitted required capabilities")
        if capabilities & ~BASELINE_CAPABILITIES:
            raise GoblinWispProtocolError("aircraft negotiated unknown capabilities")
        if capabilities != (self.pending.offered_capabilities & BASELINE_CAPABILITIES):
            raise GoblinWispProtocolError("capability negotiation mismatch")
        if not hmac.compare_digest(hello_hash, self.pending.hello_hash):
            raise GoblinWispAuthenticationError("REPLY does not bind the current HELLO")

        trusted = self.trusted_aircraft()
        if trusted is None:
            raise GoblinWispTrustError("aircraft is not trusted")
        if not hmac.compare_digest(identity_fp, trusted.fingerprint):
            raise GoblinWispTrustError("aircraft identity fingerprint mismatch")

        remote_public = _load_public(trusted.public_key)
        _load_public(remote_ephemeral)
        reply_hash = sha256(REPLY_SIGN_DOMAIN + packet[:175]).digest()
        if not _raw_verify(remote_public, reply_hash, signature):
            raise GoblinWispAuthenticationError("aircraft REPLY signature invalid")

        transcript_hash = sha256(
            TRANSCRIPT_DOMAIN
            + bytes([PROTOCOL_MAJOR, PROTOCOL_MINOR])
            + _be16(SECURITY_SUITE)
            + bytes([HOST_ID, AIRCRAFT_ID])
            + _be32(capabilities)
            + self.local_fingerprint
            + trusted.fingerprint
            + self.pending.local_ephemeral
            + remote_ephemeral
            + self.pending.local_random
            + remote_random
        ).digest()

        # Triple-DH in canonical initiator order:
        # EE = E_I * E_R
        # SE = S_I * E_R
        # ES = E_I * S_R
        remote_ephemeral_key = _load_public(remote_ephemeral)
        dh_ee = self.pending.ephemeral_private.exchange(ec.ECDH(), remote_ephemeral_key)
        dh_se = self.identity.private_key.exchange(ec.ECDH(), remote_ephemeral_key)
        dh_es = self.pending.ephemeral_private.exchange(ec.ECDH(), remote_public)
        if not (len(dh_ee) == len(dh_se) == len(dh_es) == 32):
            raise GoblinWispSecurityError("P-256 ECDH output length mismatch")

        ikm = AGREEMENT_IKM_DOMAIN + dh_ee + dh_se + dh_es
        shared_secret = _hkdf(
            salt=transcript_hash,
            ikm=ikm,
            info=AGREEMENT_EXTRACT_INFO,
            length=32,
        )
        epoch = 1
        candidate = self._derive_session(shared_secret, transcript_hash, epoch)

        self.pending.remote_ephemeral = remote_ephemeral
        self.pending.remote_random = remote_random
        self.pending.negotiated_capabilities = capabilities
        self.pending.transcript_hash = transcript_hash
        self.pending.candidate = candidate

        return self._build_confirm(HANDSHAKE_CONFIRM_A, HOST_ID, candidate, transcript_hash)

    def handle_confirm_b(self, packet: bytes) -> SessionSecrets:
        if self.pending is None or self.pending.candidate is None or self.pending.transcript_hash is None:
            raise GoblinWispProtocolError("unexpected CONFIRM_B")
        self._verify_confirm(
            packet,
            expected_kind=HANDSHAKE_CONFIRM_B,
            expected_sender=AIRCRAFT_ID,
            session=self.pending.candidate,
            transcript_hash=self.pending.transcript_hash,
        )
        self.session = self.pending.candidate
        self.pending = None
        self.fragment.reset()
        return self.session

    def _derive_session(self, shared_secret: bytes, transcript_hash: bytes, epoch: int) -> SessionSecrets:
        a_key = _derive_output(shared_secret, transcript_hash, epoch, KDF_A2B_KEY, 32)
        b_key = _derive_output(shared_secret, transcript_hash, epoch, KDF_B2A_KEY, 32)
        a_nonce = _derive_output(shared_secret, transcript_hash, epoch, KDF_A2B_NONCE, 4)
        b_nonce = _derive_output(shared_secret, transcript_hash, epoch, KDF_B2A_NONCE, 4)
        control = _derive_output(shared_secret, transcript_hash, epoch, KDF_CONTROL, 32)
        confirm = _derive_output(shared_secret, transcript_hash, epoch, KDF_CONFIRM, 32)
        sid_bytes = _derive_output(shared_secret, transcript_hash, epoch, KDF_SESSION_ID, 8)
        sid = _read_be64(sid_bytes)
        if sid == 0:
            raise GoblinWispSecurityError("derived zero session ID")
        return SessionSecrets(
            session_id=sid,
            key_epoch=epoch,
            a_to_b=DirectionalContext(DIRECTION_A_TO_B, a_key, a_nonce, epoch),
            b_to_a=DirectionalContext(DIRECTION_B_TO_A, b_key, b_nonce, epoch),
            control_key=control,
            confirmation_key=confirm,
            transcript_hash=transcript_hash,
        )

    def _confirmation_mac(self, kind: int, sender: int, session: SessionSecrets, transcript_hash: bytes) -> bytes:
        message = (
            CONFIRM_DOMAIN
            + bytes([kind, sender])
            + _be64(session.session_id)
            + _be32(session.key_epoch)
            + transcript_hash
        )
        return hmac.new(session.confirmation_key, message, "sha256").digest()

    def _build_confirm(self, kind: int, sender: int, session: SessionSecrets, transcript_hash: bytes) -> bytes:
        packet = (
            HANDSHAKE_MAGIC
            + bytes([PROTOCOL_MAJOR, PROTOCOL_MINOR, kind, sender])
            + _be64(session.session_id)
            + _be32(session.key_epoch)
            + transcript_hash
            + self._confirmation_mac(kind, sender, session, transcript_hash)
        )
        if len(packet) != CONFIRM_SIZE:
            raise GoblinWispProtocolError("confirmation layout mismatch")
        return packet

    def _verify_confirm(
        self,
        packet: bytes,
        *,
        expected_kind: int,
        expected_sender: int,
        session: SessionSecrets,
        transcript_hash: bytes,
    ) -> None:
        if len(packet) != CONFIRM_SIZE or packet[:4] != HANDSHAKE_MAGIC:
            raise GoblinWispProtocolError("malformed confirmation")
        major, minor, kind, sender = packet[4:8]
        if (major, minor, kind, sender) != (
            PROTOCOL_MAJOR,
            PROTOCOL_MINOR,
            expected_kind,
            expected_sender,
        ):
            raise GoblinWispProtocolError("unexpected confirmation header")
        sid = _read_be64(packet[8:16])
        epoch = _read_be32(packet[16:20])
        transcript = packet[20:52]
        mac = packet[52:84]
        expected_mac = self._confirmation_mac(expected_kind, expected_sender, session, transcript_hash)
        if sid != session.session_id or epoch != session.key_epoch:
            raise GoblinWispAuthenticationError("confirmation session binding mismatch")
        if not hmac.compare_digest(transcript, transcript_hash):
            raise GoblinWispAuthenticationError("confirmation transcript mismatch")
        if not hmac.compare_digest(mac, expected_mac):
            raise GoblinWispAuthenticationError("confirmation MAC invalid")

    # ---------------------- authenticated in-session rekey -----------------
    def rekey_in_progress(self) -> bool:
        return self.rekey is not None

    def rekey_state(self) -> str:
        if self.rekey is not None:
            return self.rekey.state
        if _time.monotonic() < self.rekey_quiet_until_monotonic:
            return "POST_COMPLETE_QUIET"
        return "IDLE"

    def rekey_blocks_application(self) -> bool:
        return (
            self.rekey is not None
            or _time.monotonic() < self.rekey_quiet_until_monotonic
        )

    @staticmethod
    def _rekey_common_prefix(kind: int, sender: int, receiver: int) -> bytes:
        return (
            REKEY_MAGIC
            + bytes([
                PROTOCOL_MAJOR,
                PROTOCOL_MINOR,
                kind,
                sender,
                receiver,
            ])
        )

    @staticmethod
    def _rekey_sides(sender_is_host: bool) -> bytes:
        return bytes([SIDE_A, SIDE_B] if sender_is_host else [SIDE_B, SIDE_A])

    @staticmethod
    def _hmac_sha256(key: bytes, message: bytes) -> bytes:
        return hmac.new(key, message, "sha256").digest()

    def _cache_rekey_frame(self, frame: bytes) -> bytes:
        pending = self.rekey
        if pending is None:
            raise GoblinWispProtocolError("no pending rekey operation")
        pending.last_frame = bytes(frame)
        pending.last_sent_monotonic = _time.monotonic()
        pending.retries = 0
        return bytes(frame)

    def note_rekey_frame_sent(self) -> None:
        pending = self.rekey
        if pending is not None:
            pending.last_sent_monotonic = _time.monotonic()

    def _invalidate_rekey_session(self, reason: str) -> None:
        if self.session is not None:
            self.session.active = False
        self.session = None
        self.pending = None
        self.fragment.reset()
        self.rekey = None
        self.rekey_quiet_until_monotonic = 0.0
        self.rekey_failures += 1
        self.rekey_last_failure = reason

    def _install_rekey_candidate(self, pending: PendingRekey) -> None:
        candidate = pending.candidate
        if candidate is None or not candidate.active:
            raise GoblinWispSecurityError("rekey candidate is unavailable")
        if candidate.key_epoch != pending.next_epoch:
            raise GoblinWispSecurityError("rekey candidate epoch mismatch")
        if candidate.session_id == pending.old_sid:
            raise GoblinWispSecurityError("rekey did not change session ID")
        if self.session is not None:
            self.session.active = False
        self.session = candidate
        self.fragment.reset()

    def _build_rekey_transcript(self, pending: PendingRekey) -> bytes:
        if pending.remote_ephemeral is None or pending.remote_random is None:
            raise GoblinWispProtocolError("rekey peer contribution is incomplete")

        if pending.initiator:
            initiator_id = HOST_ID
            responder_id = AIRCRAFT_ID
            initiator_side = SIDE_A
            responder_side = SIDE_B
            a_pub = pending.local_ephemeral
            b_pub = pending.remote_ephemeral
            a_rnd = pending.local_random
            b_rnd = pending.remote_random
        else:
            initiator_id = AIRCRAFT_ID
            responder_id = HOST_ID
            initiator_side = SIDE_B
            responder_side = SIDE_A
            a_pub = pending.remote_ephemeral
            b_pub = pending.local_ephemeral
            a_rnd = pending.remote_random
            b_rnd = pending.local_random

        material = (
            REKEY_TRANSCRIPT_DOMAIN
            + pending.old_session.transcript_hash
            + _be64(pending.old_sid)
            + _be32(pending.old_epoch)
            + _be32(pending.next_epoch)
            + bytes([
                initiator_id,
                responder_id,
                initiator_side,
                responder_side,
            ])
            + a_pub
            + b_pub
            + a_rnd
            + b_rnd
        )
        return sha256(material).digest()

    def _derive_rekey_candidate(self, pending: PendingRekey) -> None:
        if pending.remote_ephemeral is None:
            raise GoblinWispProtocolError("rekey remote ephemeral key missing")
        remote_key = _load_public(pending.remote_ephemeral)
        shared_secret = pending.ephemeral_private.exchange(ec.ECDH(), remote_key)
        if len(shared_secret) != SHA256_SIZE:
            raise GoblinWispSecurityError("rekey ECDH output length mismatch")

        transcript = self._build_rekey_transcript(pending)
        rekey_hash = sha256(
            REKEY_KDF_DOMAIN
            + transcript
            + _be64(pending.old_sid)
            + _be32(pending.next_epoch)
        ).digest()

        candidate = self._derive_session(
            shared_secret,
            rekey_hash,
            pending.next_epoch,
        )
        if (
            not candidate.active
            or candidate.key_epoch != pending.next_epoch
            or candidate.session_id == pending.old_sid
            or candidate.suite != pending.old_session.suite
        ):
            raise GoblinWispSecurityError("invalid derived rekey session")

        pending.transcript = transcript
        pending.candidate = candidate

    def _build_rekey_proof(self, kind: int, pending: PendingRekey) -> bytes:
        candidate = pending.candidate
        transcript = pending.transcript
        if candidate is None or transcript is None:
            raise GoblinWispProtocolError("rekey proof requested before derivation")

        prefix = (
            self._rekey_common_prefix(kind, HOST_ID, AIRCRAFT_ID)
            + self._rekey_sides(True)
            + _be64(pending.old_sid)
            + _be64(candidate.session_id)
            + _be32(pending.old_epoch)
            + _be32(pending.next_epoch)
            + transcript
        )
        mac = self._hmac_sha256(candidate.confirmation_key, prefix)
        packet = prefix + mac
        if len(packet) != REKEY_PROOF_SIZE:
            raise GoblinWispProtocolError("rekey proof layout mismatch")
        return packet

    def _verify_rekey_proof(
        self,
        packet: bytes,
        *,
        expected_kind: int,
        pending: PendingRekey,
    ) -> None:
        if len(packet) != REKEY_PROOF_SIZE or packet[:4] != REKEY_MAGIC:
            raise GoblinWispProtocolError("malformed rekey proof")
        major, minor, kind, sender, receiver = packet[4:9]
        sender_side, receiver_side = packet[9:11]
        if (
            major != PROTOCOL_MAJOR
            or minor != PROTOCOL_MINOR
            or kind != expected_kind
            or sender != AIRCRAFT_ID
            or receiver != HOST_ID
            or sender_side != SIDE_B
            or receiver_side != SIDE_A
        ):
            raise GoblinWispProtocolError("unexpected rekey proof header")

        candidate = pending.candidate
        transcript = pending.transcript
        if candidate is None or transcript is None:
            raise GoblinWispProtocolError("rekey proof without candidate session")

        old_sid = _read_be64(packet[11:19])
        next_sid = _read_be64(packet[19:27])
        old_epoch = _read_be32(packet[27:31])
        next_epoch = _read_be32(packet[31:35])
        proof_transcript = packet[35:67]
        mac = packet[67:99]

        expected = self._hmac_sha256(candidate.confirmation_key, packet[:67])

        if (
            old_sid != pending.old_sid
            or next_sid != candidate.session_id
            or old_epoch != pending.old_epoch
            or next_epoch != pending.next_epoch
            or not hmac.compare_digest(proof_transcript, transcript)
            or not hmac.compare_digest(mac, expected)
        ):
            raise GoblinWispAuthenticationError(
                "rekey proof authentication/binding failed"
            )

    def begin_rekey(self) -> bytes:
        session = self.session
        if session is None or not session.active:
            raise GoblinWispSecurityError(
                "cannot rekey without an active authenticated session"
            )
        if self.rekey is not None:
            raise GoblinWispProtocolError("rekey is already in progress")
        if self.rekey_blocks_application():
            raise GoblinWispProtocolError("rekey quiet period is still active")
        if session.key_epoch >= 0xFFFFFFFF:
            raise GoblinWispProtocolError("rekey epoch exhausted")

        ephemeral_private = ec.generate_private_key(ec.SECP256R1())
        local_ephemeral = _public_bytes(ephemeral_private.public_key())
        local_random = secrets.token_bytes(SHA256_SIZE)

        pending = PendingRekey(
            initiator=True,
            state="INIT_SENT",
            old_session=session,
            old_sid=session.session_id,
            old_epoch=session.key_epoch,
            next_epoch=session.key_epoch + 1,
            ephemeral_private=ephemeral_private,
            local_ephemeral=local_ephemeral,
            local_random=local_random,
        )
        self.rekey = pending
        self.rekey_last_failure = None

        prefix = (
            self._rekey_common_prefix(REKEY_INIT, HOST_ID, AIRCRAFT_ID)
            + self._rekey_sides(True)
            + _be64(pending.old_sid)
            + _be32(pending.old_epoch)
            + _be32(pending.next_epoch)
            + pending.local_ephemeral
            + pending.local_random
        )
        mac = self._hmac_sha256(session.control_key, prefix)
        packet = prefix + mac
        if len(packet) != REKEY_INIT_SIZE:
            self._invalidate_rekey_session("INIT layout mismatch")
            raise GoblinWispProtocolError("rekey INIT layout mismatch")

        pending.init_digest = sha256(packet).digest()
        return self._cache_rekey_frame(packet)

    def _handle_rekey_init(self, packet: bytes) -> bytes | None:
        session = self.session
        if session is None or not session.active:
            raise GoblinWispSecurityError("rekey INIT without active session")
        if len(packet) != REKEY_INIT_SIZE:
            raise GoblinWispProtocolError("invalid rekey INIT size")

        major, minor, kind, sender, receiver = packet[4:9]
        sender_side, receiver_side = packet[9:11]
        old_sid = _read_be64(packet[11:19])
        old_epoch = _read_be32(packet[19:23])
        next_epoch = _read_be32(packet[23:27])
        remote_ephemeral = packet[27:92]
        remote_random = packet[92:124]
        mac = packet[124:156]

        if (
            major != PROTOCOL_MAJOR
            or minor != PROTOCOL_MINOR
            or kind != REKEY_INIT
            or sender != AIRCRAFT_ID
            or receiver != HOST_ID
            or sender_side != SIDE_B
            or receiver_side != SIDE_A
            or old_sid != session.session_id
            or old_epoch != session.key_epoch
            or old_epoch >= 0xFFFFFFFF
            or next_epoch != old_epoch + 1
        ):
            raise GoblinWispProtocolError("rekey INIT binding mismatch")

        expected = self._hmac_sha256(session.control_key, packet[:124])
        if not hmac.compare_digest(mac, expected):
            raise GoblinWispAuthenticationError("rekey INIT MAC invalid")
        _load_public(remote_ephemeral)
        digest = sha256(packet).digest()

        if self.rekey is not None:
            pending = self.rekey
            if (
                not pending.initiator
                and pending.state == "WAIT_CONFIRM"
                and pending.init_digest is not None
                and hmac.compare_digest(pending.init_digest, digest)
            ):
                return pending.last_frame

            if pending.initiator and pending.state == "INIT_SENT":
                if HOST_ID < AIRCRAFT_ID:
                    return None

            return None

        ephemeral_private = ec.generate_private_key(ec.SECP256R1())
        local_ephemeral = _public_bytes(ephemeral_private.public_key())
        local_random = secrets.token_bytes(SHA256_SIZE)

        pending = PendingRekey(
            initiator=False,
            state="WAIT_CONFIRM",
            old_session=session,
            old_sid=old_sid,
            old_epoch=old_epoch,
            next_epoch=next_epoch,
            ephemeral_private=ephemeral_private,
            local_ephemeral=local_ephemeral,
            local_random=local_random,
            remote_ephemeral=remote_ephemeral,
            remote_random=remote_random,
            init_digest=digest,
        )
        self.rekey = pending
        self.rekey_last_failure = None

        reply_prefix = (
            self._rekey_common_prefix(REKEY_REPLY, HOST_ID, AIRCRAFT_ID)
            + self._rekey_sides(True)
            + _be64(old_sid)
            + _be32(old_epoch)
            + _be32(next_epoch)
            + digest
            + local_ephemeral
            + local_random
        )
        reply_mac = self._hmac_sha256(session.control_key, reply_prefix)
        reply = reply_prefix + reply_mac
        if len(reply) != REKEY_REPLY_SIZE:
            self._invalidate_rekey_session("REPLY layout mismatch")
            raise GoblinWispProtocolError("rekey REPLY layout mismatch")

        self._derive_rekey_candidate(pending)
        return self._cache_rekey_frame(reply)

    def _handle_rekey_reply(self, packet: bytes) -> bytes | None:
        pending = self.rekey
        if (
            pending is None
            or not pending.initiator
            or pending.state not in {"INIT_SENT", "CONFIRM_SENT"}
        ):
            return None
        if len(packet) != REKEY_REPLY_SIZE:
            raise GoblinWispProtocolError("invalid rekey REPLY size")

        major, minor, kind, sender, receiver = packet[4:9]
        sender_side, receiver_side = packet[9:11]
        old_sid = _read_be64(packet[11:19])
        old_epoch = _read_be32(packet[19:23])
        next_epoch = _read_be32(packet[23:27])
        init_hash = packet[27:59]
        remote_ephemeral = packet[59:124]
        remote_random = packet[124:156]
        mac = packet[156:188]

        if (
            major != PROTOCOL_MAJOR
            or minor != PROTOCOL_MINOR
            or kind != REKEY_REPLY
            or sender != AIRCRAFT_ID
            or receiver != HOST_ID
            or sender_side != SIDE_B
            or receiver_side != SIDE_A
            or old_sid != pending.old_sid
            or old_epoch != pending.old_epoch
            or next_epoch != pending.next_epoch
            or pending.init_digest is None
            or not hmac.compare_digest(init_hash, pending.init_digest)
        ):
            raise GoblinWispProtocolError("rekey REPLY binding mismatch")

        expected = self._hmac_sha256(
            pending.old_session.control_key,
            packet[:156],
        )
        if not hmac.compare_digest(mac, expected):
            raise GoblinWispAuthenticationError("rekey REPLY MAC invalid")

        if pending.state == "CONFIRM_SENT":
            return pending.last_frame

        _load_public(remote_ephemeral)
        pending.remote_ephemeral = remote_ephemeral
        pending.remote_random = remote_random
        self._derive_rekey_candidate(pending)

        confirm = self._build_rekey_proof(REKEY_CONFIRM, pending)
        pending.state = "CONFIRM_SENT"
        return self._cache_rekey_frame(confirm)

    def _handle_rekey_confirm(self, packet: bytes) -> bytes | None:
        pending = self.rekey
        if (
            pending is None
            or pending.initiator
            or pending.state not in {"WAIT_CONFIRM", "COMMIT_SENT"}
        ):
            return None

        self._verify_rekey_proof(
            packet,
            expected_kind=REKEY_CONFIRM,
            pending=pending,
        )

        if pending.state == "COMMIT_SENT":
            return pending.last_frame

        commit = self._build_rekey_proof(REKEY_COMMIT, pending)
        self._install_rekey_candidate(pending)
        pending.state = "COMMIT_SENT"
        return self._cache_rekey_frame(commit)

    def _handle_rekey_commit(self, packet: bytes) -> bytes | None:
        pending = self.rekey
        if (
            pending is None
            or not pending.initiator
            or pending.state not in {"CONFIRM_SENT", "ACK_SENT"}
        ):
            return None

        self._verify_rekey_proof(
            packet,
            expected_kind=REKEY_COMMIT,
            pending=pending,
        )

        if pending.state == "ACK_SENT":
            return pending.last_frame

        ack = self._build_rekey_proof(REKEY_ACK, pending)
        self._install_rekey_candidate(pending)
        pending.state = "ACK_SENT"
        self.rekey_successes += 1
        return self._cache_rekey_frame(ack)

    def _handle_rekey_ack(self, packet: bytes) -> bytes | None:
        pending = self.rekey
        if (
            pending is None
            or pending.initiator
            or pending.state != "COMMIT_SENT"
        ):
            return None

        self._verify_rekey_proof(
            packet,
            expected_kind=REKEY_ACK,
            pending=pending,
        )

        self.rekey_successes += 1
        self.rekey = None
        self.rekey_quiet_until_monotonic = (
            _time.monotonic() + REKEY_POST_COMPLETE_QUIET_SECONDS
        )
        return None

    def handle_rekey(self, packet: bytes) -> bytes | None:
        if len(packet) < 9 or packet[:4] != REKEY_MAGIC:
            raise GoblinWispProtocolError("not a GoblinWisp rekey frame")
        if packet[4] != PROTOCOL_MAJOR or packet[5] != PROTOCOL_MINOR:
            raise GoblinWispProtocolError("unsupported rekey protocol version")
        kind = packet[6]
        if kind == REKEY_INIT:
            return self._handle_rekey_init(packet)
        if kind == REKEY_REPLY:
            return self._handle_rekey_reply(packet)
        if kind == REKEY_CONFIRM:
            return self._handle_rekey_confirm(packet)
        if kind == REKEY_COMMIT:
            return self._handle_rekey_commit(packet)
        if kind == REKEY_ACK:
            return self._handle_rekey_ack(packet)
        raise GoblinWispProtocolError("unknown rekey message type")

    def rekey_tick(self) -> bytes | None:
        pending = self.rekey
        if pending is None:
            return None

        now = _time.monotonic()
        elapsed = now - pending.started_monotonic

        if pending.state == "ACK_SENT":
            if elapsed >= REKEY_TIMEOUT_SECONDS:
                self.rekey = None
            return None

        if elapsed >= REKEY_TIMEOUT_SECONDS:
            self._invalidate_rekey_session("authenticated rekey timed out")
            raise GoblinWispSecurityError(
                "authenticated rekey timed out; session invalidated"
            )

        if now - pending.last_sent_monotonic < REKEY_RETRY_SECONDS:
            return None

        if pending.retries >= REKEY_MAX_RETRIES:
            self._invalidate_rekey_session(
                "authenticated rekey retry limit exceeded"
            )
            raise GoblinWispSecurityError(
                "authenticated rekey retry limit exceeded; session invalidated"
            )

        if pending.last_frame is None:
            self._invalidate_rekey_session("rekey retry frame missing")
            raise GoblinWispSecurityError(
                "rekey retry frame missing; session invalidated"
            )

        pending.retries += 1
        pending.last_sent_monotonic = now
        return pending.last_frame

    # ---------------------------- secure data ------------------------------
    def session_active(self) -> bool:
        return bool(self.session and self.session.active)

    def invalidate_session(self, reason: str | None = None) -> None:
        # Volatile session state is never persisted; replacing references makes
        # reboot/disconnect/session reset require a completely fresh handshake.
        if self.session is not None:
            self.session.active = False
        self.session = None
        self.pending = None
        self.fragment.reset()
        self.rekey = None
        self.rekey_quiet_until_monotonic = 0.0

    def encrypt_application(self, plaintext: bytes) -> tuple[bytes, int]:
        return self._encrypt_secure(SECURE_DATA, plaintext)

    def build_ack(self, acknowledged_counter: int) -> tuple[bytes, int]:
        return self._encrypt_secure(SECURE_ACK, _be64(acknowledged_counter))

    def _encrypt_secure(self, packet_type: int, plaintext: bytes) -> tuple[bytes, int]:
        # During initiator ACK_SENT, the new epoch is already installed.
        # Keep new host application DATA blocked until the rekey retry window
        # closes, but allow authenticated ACKs for valid epoch-2 Aircraft DATA.
        allow_rekey_ack = bool(
            packet_type == SECURE_ACK
            and self.rekey is not None
            and self.rekey.initiator
            and self.rekey.state == "ACK_SENT"
        )
        if self.rekey_blocks_application() and not allow_rekey_ack:
            raise GoblinWispSecurityError(
                "secure application traffic is blocked during rekey"
            )
        session = self.session
        if session is None or not session.active:
            raise GoblinWispSecurityError("no active GoblinWisp session")
        if not plaintext or len(plaintext) > MAX_SINGLE_PLAINTEXT:
            raise GoblinWispProtocolError(f"plaintext must be 1..{MAX_SINGLE_PLAINTEXT} bytes")
        context = session.a_to_b  # host SIDE_A TX
        counter = context.reserve_tx_counter()
        header = (
            DATA_MAGIC
            + bytes([PROTOCOL_MAJOR, PROTOCOL_MINOR, packet_type, HOST_ID])
            + _be64(counter)
            + _be16(len(plaintext))
        )
        aad = self._build_aad(header, session, context, AIRCRAFT_ID)
        ct_tag = AESGCM(context.traffic_key).encrypt(context.nonce(counter), plaintext, aad)
        packet = header + ct_tag
        if len(packet) > MAX_WIRE_PACKET:
            raise GoblinWispProtocolError("secure frame exceeds GoblinWisp wire limit")
        return packet, counter

    def decrypt_secure(self, packet: bytes) -> SecureReceiveResult:
        # In initiator ACK_SENT the host has authenticated COMMIT and already
        # installed epoch 2. Accept epoch-2 Aircraft traffic so reliability
        # does not stall while we retain the final rekey ACK for retries.
        allow_epoch2_rx = bool(
            self.rekey is not None
            and self.rekey.initiator
            and self.rekey.state == "ACK_SENT"
        )
        if self.rekey_blocks_application() and not allow_epoch2_rx:
            raise GoblinWispSecurityError(
                "secure application traffic is blocked during rekey"
            )
        session = self.session
        if session is None or not session.active:
            raise GoblinWispSecurityError("received secure data without active session")
        if len(packet) < SECURE_HEADER_SIZE + GCM_TAG_SIZE:
            self.malformed_packets += 1
            raise GoblinWispProtocolError("secure frame too short")
        header = packet[:SECURE_HEADER_SIZE]
        if header[:4] != DATA_MAGIC:
            self.malformed_packets += 1
            raise GoblinWispProtocolError("invalid secure-data magic")
        major, minor, packet_type, sender = header[4:8]
        if (major, minor, sender) != (PROTOCOL_MAJOR, PROTOCOL_MINOR, AIRCRAFT_ID):
            self.malformed_packets += 1
            raise GoblinWispProtocolError("secure-data header mismatch")
        if packet_type not in {SECURE_DATA, SECURE_ACK, SECURE_FRAGMENT}:
            self.malformed_packets += 1
            raise GoblinWispProtocolError("unsupported secure-data packet type")
        counter = _read_be64(header[8:16])
        ciphertext_len = _read_be16(header[16:18])
        expected_len = SECURE_HEADER_SIZE + ciphertext_len + GCM_TAG_SIZE
        if ciphertext_len <= 0 or ciphertext_len > MAX_SINGLE_PLAINTEXT or len(packet) != expected_len:
            self.malformed_packets += 1
            raise GoblinWispProtocolError("secure-data length mismatch")

        context = session.b_to_a  # host SIDE_A RX
        aad = self._build_aad(header, session, context, HOST_ID)
        ciphertext_tag = packet[SECURE_HEADER_SIZE:]

        # Patent-required order: cryptographic authentication first.
        try:
            plaintext = AESGCM(context.traffic_key).decrypt(
                context.nonce(counter),
                ciphertext_tag,
                aad,
            )
        except InvalidTag as exc:
            self.auth_failures += 1
            raise GoblinWispAuthenticationError("AES-GCM authentication failed") from exc

        # Only now evaluate replay state. No replay mutation happened on auth failure.
        replay_result = context.replay.check(counter)
        if replay_result != "ACCEPT":
            self.replay_drops += 1
            raise GoblinWispReplayError(
                replay_result,
                packet_type=packet_type,
                counter=counter,
            )

        # Validate packet semantics before replay commit when possible.
        acknowledged_counter: int | None = None
        reassembled_payload: bytes | None = None
        if packet_type == SECURE_ACK:
            if len(plaintext) != 8:
                raise GoblinWispProtocolError("ACK plaintext must contain one uint64 counter")
            acknowledged_counter = _read_be64(plaintext)
        elif packet_type == SECURE_FRAGMENT:
            reassembled_payload = self._validate_and_stage_fragment(plaintext)

        # Authentication and replay/semantic checks have passed: commit now.
        context.replay.commit(counter)

        if packet_type == SECURE_FRAGMENT:
            reassembled_payload = self._commit_fragment(plaintext)

        return SecureReceiveResult(
            packet_type=packet_type,
            counter=counter,
            plaintext=plaintext,
            acknowledged_counter=acknowledged_counter,
            reassembled_payload=reassembled_payload,
        )

    def _build_aad(
        self,
        header: bytes,
        session: SessionSecrets,
        context: DirectionalContext,
        receiver_id: int,
    ) -> bytes:
        if len(header) != SECURE_HEADER_SIZE:
            raise GoblinWispProtocolError("invalid SSIP header size")
        return (
            header
            + _be64(session.session_id)
            + _be32(session.key_epoch)
            + _be16(session.suite)
            + bytes([context.direction, receiver_id])
        )

    def _parse_fragment(self, plaintext: bytes) -> tuple[int, int, int, bytes]:
        if len(plaintext) < 10:
            raise GoblinWispProtocolError("fragment plaintext too short")
        msg_id = _read_be32(plaintext[0:4])
        index = _read_be16(plaintext[4:6])
        total = _read_be16(plaintext[6:8])
        frag_len = _read_be16(plaintext[8:10])
        data = plaintext[10:]
        if total <= 0 or total > 6 or index >= total or frag_len <= 0 or frag_len > 192:
            raise GoblinWispProtocolError("invalid fragment metadata")
        if frag_len != len(data):
            raise GoblinWispProtocolError("fragment length mismatch")
        return msg_id, index, total, data

    def _validate_and_stage_fragment(self, plaintext: bytes) -> bytes | None:
        msg_id, index, total, data = self._parse_fragment(plaintext)
        if index == 0:
            if len(data) > 1024:
                raise GoblinWispProtocolError("fragmented message exceeds 1024 bytes")
            return None
        if not self.fragment.active:
            raise GoblinWispProtocolError("non-initial fragment without active reassembly")
        if (
            self.fragment.msg_id != msg_id
            or self.fragment.total != total
            or self.fragment.next_index != index
            or len(self.fragment.buffer) + len(data) > 1024
        ):
            raise GoblinWispProtocolError("fragment sequence mismatch")
        return None

    def _commit_fragment(self, plaintext: bytes) -> bytes | None:
        msg_id, index, total, data = self._parse_fragment(plaintext)
        if index == 0:
            self.fragment.reset()
            self.fragment.active = True
            self.fragment.msg_id = msg_id
            self.fragment.total = total
            self.fragment.next_index = 0
        self.fragment.buffer.extend(data)
        self.fragment.next_index += 1
        if self.fragment.next_index >= self.fragment.total:
            output = bytes(self.fragment.buffer)
            self.fragment.reset()
            return output
        return None

    # ---------------------------- diagnostics ------------------------------
    def snapshot(self) -> dict[str, Any]:
        trusted = self.trusted_aircraft()
        session = self.session
        return {
            "protocol": "GWSSIP",
            "protocol_version": f"{PROTOCOL_MAJOR}.{PROTOCOL_MINOR}",
            "suite": "P256_HKDF_SHA256_AES256_GCM",
            "local_node_id": "GW-MISSIONNEXUS-001",
            "local_logical_id": HOST_ID,
            "local_fingerprint": self.local_fingerprint_text,
            "peer_trusted": trusted is not None,
            "peer_fingerprint": (
                ":".join(f"{value:02X}" for value in trusted.fingerprint)
                if trusted is not None else None
            ),
            "handshake_pending": self.pending is not None,
            "secure_session_active": bool(session and session.active),
            "session_id": f"{session.session_id:016X}" if session else None,
            "key_epoch": session.key_epoch if session else 0,
            "tx_counter": session.a_to_b.tx_counter if session else 0,
            "rx_highest_counter": session.b_to_a.replay.highest_counter if session else 0,
            "auth_failures": self.auth_failures,
            "replay_drops": self.replay_drops,
            "malformed_packets": self.malformed_packets,
            "rekey_state": self.rekey_state(),
            "rekey_in_progress": self.rekey_in_progress(),
            "rekey_blocks_application": self.rekey_blocks_application(),
            "rekey_successes": self.rekey_successes,
            "rekey_failures": self.rekey_failures,
            "rekey_last_failure": self.rekey_last_failure,
        }
