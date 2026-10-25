from __future__ import annotations

import asyncio
import importlib
import json
import os
from pathlib import Path
import py_compile
import shutil
import socket
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
HOST_SECURITY = BACKEND / "goblinwisp_wifi" / "host_security.py"
RUNTIME_FILE = BACKEND / "goblinwisp_wifi" / "runtime.py"
STATE_DIR = BACKEND / "data" / "goblinwisp"
REPORT_DIR = ROOT / "goblinwisp_acceptance_reports"


class Suite:
    def __init__(self) -> None:
        self.results: list[dict[str, Any]] = []
        self.notes: list[str] = []

    def add(self, name: str, passed: bool, detail: str = "", *, required: bool = True) -> None:
        self.results.append(
            {
                "name": name,
                "passed": bool(passed),
                "required": bool(required),
                "detail": detail,
            }
        )
        mark = "PASS" if passed else ("FAIL" if required else "INFO")
        print(f"[{mark}] {name}: {detail}")

    def note(self, text: str) -> None:
        self.notes.append(text)
        print(f"[NOTE] {text}")

    @property
    def required_passed(self) -> bool:
        return all(r["passed"] for r in self.results if r["required"])

    def summary(self) -> dict[str, int]:
        req = [r for r in self.results if r["required"]]
        opt = [r for r in self.results if not r["required"]]
        return {
            "required_total": len(req),
            "required_pass": sum(1 for r in req if r["passed"]),
            "required_fail": sum(1 for r in req if not r["passed"]),
            "informational_total": len(opt),
            "informational_pass": sum(1 for r in opt if r["passed"]),
            "informational_gap": sum(1 for r in opt if not r["passed"]),
        }


def backup_files(suite: Suite) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = ROOT / "backups" / f"goblinwisp_core_{stamp}"
    dest.mkdir(parents=True, exist_ok=True)

    for src in (HOST_SECURITY, RUNTIME_FILE):
        if src.exists():
            shutil.copy2(src, dest / src.name)

    trust = STATE_DIR / "trusted_peers.json"
    identity = STATE_DIR / "missionnexus_identity.pem"
    if trust.exists():
        shutil.copy2(trust, dest / trust.name)
    if identity.exists():
        shutil.copy2(identity, dest / identity.name)

    suite.add("Baseline backup", True, str(dest))
    return dest


def compile_sources(suite: Suite) -> None:
    try:
        py_compile.compile(str(HOST_SECURITY), doraise=True)
        py_compile.compile(str(RUNTIME_FILE), doraise=True)
        suite.add("Python compile", True, "host_security.py + runtime.py")
    except Exception as exc:
        suite.add("Python compile", False, repr(exc))
        raise


def port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0


def load_modules():
    sys.path.insert(0, str(BACKEND))
    hs = importlib.import_module("goblinwisp_wifi.host_security")
    rtmod = importlib.import_module("goblinwisp_wifi.runtime")
    return hs, rtmod


def make_session(hs, *, session_id: int = 0x1122334455667788):
    return hs.SessionSecrets(
        session_id=session_id,
        key_epoch=1,
        a_to_b=hs.DirectionalContext(
            hs.DIRECTION_A_TO_B,
            os.urandom(32),
            os.urandom(4),
            1,
        ),
        b_to_a=hs.DirectionalContext(
            hs.DIRECTION_B_TO_A,
            os.urandom(32),
            os.urandom(4),
            1,
        ),
        control_key=os.urandom(32),
        confirmation_key=os.urandom(32),
        transcript_hash=os.urandom(32),
        suite=hs.SECURITY_SUITE,
        active=True,
    )


def inbound_packet(
    hs,
    session,
    *,
    packet_type: int,
    counter: int,
    plaintext: bytes,
    context_name: str = "b_to_a",
) -> bytes:
    ctx = getattr(session, context_name)
    header = (
        hs.DATA_MAGIC
        + bytes(
            [
                hs.PROTOCOL_MAJOR,
                hs.PROTOCOL_MINOR,
                packet_type,
                hs.AIRCRAFT_ID,
            ]
        )
        + hs._be64(counter)
        + hs._be16(len(plaintext))
    )
    aad = (
        header
        + hs._be64(session.session_id)
        + hs._be32(session.key_epoch)
        + hs._be16(session.suite)
        + bytes([ctx.direction, hs.HOST_ID])
    )
    nonce = ctx.nonce_prefix + hs._be64(counter)
    ct_tag = hs.AESGCM(ctx.traffic_key).encrypt(nonce, plaintext, aad)
    return header + ct_tag


def new_host_security(hs, td: str):
    sec = hs.GoblinWispHostSecurity(td)
    sec.session = make_session(hs)
    return sec


def offline_tests(suite: Suite, hs) -> None:
    print("\n=== OFFLINE SECURITY TESTS ===")

    # Persistent local identity.
    with tempfile.TemporaryDirectory() as td:
        a = hs.GoblinWispHostSecurity(td)
        pub1 = a.local_public_key
        b = hs.GoblinWispHostSecurity(td)
        suite.add(
            "Persistent host identity",
            pub1 == b.local_public_key,
            "same P-256 public key after reload",
        )

    # Trust pinning continuity.
    with tempfile.TemporaryDirectory() as td:
        sec = hs.GoblinWispHostSecurity(td)
        k1 = hs.ec.generate_private_key(hs.ec.SECP256R1())
        k2 = hs.ec.generate_private_key(hs.ec.SECP256R1())
        p1 = hs._public_bytes(k1.public_key())
        p2 = hs._public_bytes(k2.public_key())
        sec.enroll_aircraft(p1, locally_authorized=True)
        rejected = False
        try:
            sec.enroll_aircraft(p2, locally_authorized=True)
        except hs.GoblinWispTrustError:
            rejected = True
        suite.add(
            "Identity pin mismatch rejected",
            rejected,
            "same peer ID cannot silently change public identity",
        )

    # Valid authenticated inbound packet.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_DATA,
            counter=1,
            plaintext=b'{"type":"TEST","value":1}',
        )
        result = sec.decrypt_secure(pkt)
        suite.add(
            "Valid AES-GCM packet accepted",
            result.counter == 1 and result.packet_type == hs.SECURE_DATA,
            f"counter={result.counter}",
        )

    # Ciphertext tamper, and replay state must not move.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = bytearray(
            inbound_packet(
                hs,
                sec.session,
                packet_type=hs.SECURE_DATA,
                counter=1,
                plaintext=b"ciphertext-tamper",
            )
        )
        before = sec.session.b_to_a.replay.highest_counter
        pkt[hs.SECURE_HEADER_SIZE] ^= 0x01
        rejected = False
        try:
            sec.decrypt_secure(bytes(pkt))
        except hs.GoblinWispAuthenticationError:
            rejected = True
        after = sec.session.b_to_a.replay.highest_counter
        suite.add(
            "Modified ciphertext rejected without replay mutation",
            rejected and before == after == 0,
            f"replay_highest {before}->{after}",
        )

    # Tag tamper, same state rule.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = bytearray(
            inbound_packet(
                hs,
                sec.session,
                packet_type=hs.SECURE_DATA,
                counter=1,
                plaintext=b"tag-tamper",
            )
        )
        before = sec.session.b_to_a.replay.highest_counter
        pkt[-1] ^= 0x80
        rejected = False
        try:
            sec.decrypt_secure(bytes(pkt))
        except hs.GoblinWispAuthenticationError:
            rejected = True
        after = sec.session.b_to_a.replay.highest_counter
        suite.add(
            "Modified GCM tag rejected without replay mutation",
            rejected and before == after == 0,
            f"replay_highest {before}->{after}",
        )

    # Exact replay after a valid commit.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_DATA,
            counter=1,
            plaintext=b"replay-test",
        )
        sec.decrypt_secure(pkt)
        duplicate = False
        meta_ok = False
        try:
            sec.decrypt_secure(pkt)
        except hs.GoblinWispReplayError as exc:
            duplicate = str(exc) == "DUPLICATE" or getattr(exc, "reason", None) == "DUPLICATE"
            meta_ok = (
                getattr(exc, "counter", None) == 1
                and getattr(exc, "packet_type", None) == hs.SECURE_DATA
            )
        suite.add(
            "Exact replay rejected after authentication",
            duplicate and meta_ok,
            "authenticated DUPLICATE preserves packet type/counter metadata",
        )

    # Cross-direction replay must fail authentication.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_DATA,
            counter=1,
            plaintext=b"wrong-direction",
            context_name="a_to_b",
        )
        rejected = False
        try:
            sec.decrypt_secure(pkt)
        except hs.GoblinWispAuthenticationError:
            rejected = True
        suite.add(
            "Cross-direction packet rejected",
            rejected and sec.session.b_to_a.replay.highest_counter == 0,
            "A->B key/nonce context cannot authenticate as B->A",
        )

    # Counter zero.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_DATA,
            counter=0,
            plaintext=b"zero-counter",
        )
        rejected = False
        try:
            sec.decrypt_secure(pkt)
        except hs.GoblinWispProtocolError:
            rejected = True
        suite.add(
            "Counter zero rejected",
            rejected and sec.session.b_to_a.replay.highest_counter == 0,
            "zero counter never reaches replay commit",
        )

    # Too-old window.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        high = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_DATA,
            counter=70,
            plaintext=b"high",
        )
        old = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_DATA,
            counter=1,
            plaintext=b"old",
        )
        sec.decrypt_secure(high)
        rejected = False
        try:
            sec.decrypt_secure(old)
        except hs.GoblinWispReplayError as exc:
            rejected = (
                str(exc) == "TOO_OLD"
                or getattr(exc, "reason", None) == "TOO_OLD"
            )
        suite.add(
            "Out-of-window packet rejected",
            rejected and sec.session.b_to_a.replay.highest_counter == 70,
            "64-packet replay window enforced",
        )

    # ACK semantics.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        pkt = inbound_packet(
            hs,
            sec.session,
            packet_type=hs.SECURE_ACK,
            counter=1,
            plaintext=hs._be64(123),
        )
        result = sec.decrypt_secure(pkt)
        suite.add(
            "Authenticated ACK parsed",
            result.acknowledged_counter == 123,
            f"acknowledged_counter={result.acknowledged_counter}",
        )

    # Directional TX counters.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        _, c1 = sec.encrypt_application(b"a")
        _, c2 = sec.encrypt_application(b"b")
        _, c3 = sec.build_ack(1)
        suite.add(
            "Monotonic host TX counters",
            (c1, c2, c3) == (1, 2, 3),
            f"{c1}->{c2}->{c3}",
        )

    # Session reset / old epoch material invalid.
    with tempfile.TemporaryDirectory() as td:
        sec = new_host_security(hs, td)
        old_session = sec.session
        old_packet = inbound_packet(
            hs,
            old_session,
            packet_type=hs.SECURE_DATA,
            counter=1,
            plaintext=b"old-session",
        )
        sec.session = make_session(hs, session_id=0x8877665544332211)
        rejected = False
        try:
            sec.decrypt_secure(old_packet)
        except hs.GoblinWispAuthenticationError:
            rejected = True
        suite.add(
            "Old-session packet rejected under fresh session",
            rejected and sec.session.b_to_a.replay.highest_counter == 0,
            "new session key/AAD binding rejects previous-session ciphertext",
        )

    # Host rekey implementation check: informational but intentionally explicit.
    host_text = HOST_SECURITY.read_text(encoding="utf-8", errors="replace")
    rekey_methods = [
        token
        for token in (
            "request_rekey",
            "handle_rekey",
            "build_rekey",
            "rekey_session",
        )
        if token in host_text
    ]
    suite.add(
        "Authenticated in-session rekey implementation present",
        bool(rekey_methods),
        (
            "found: " + ", ".join(rekey_methods)
            if rekey_methods
            else "not implemented in MissionNexus host_security.py; capability constants alone are not a rekey protocol"
        ),
        required=False,
    )


async def wait_until(predicate, timeout: float, step: float = 0.05) -> bool:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        try:
            if predicate():
                return True
        except Exception:
            pass
        await asyncio.sleep(step)
    return False


def detect_hotspot_ipv4() -> tuple[str, str, int, str]:
    """Return (ip, broadcast, prefix_len, interface_alias) for Windows Mobile Hotspot.

    Prefer the canonical 192.168.137.0/24 interface. Otherwise accept a
    Local Area Connection*/Wi-Fi Direct style virtual adapter with a private
    IPv4 address ending in .1. We deliberately do not fall back to arbitrary
    Wi-Fi/Ethernet interfaces, because GoblinWisp must stay pinned to the
    intended transport interface.
    """
    import ipaddress
    import subprocess

    ps = (
        "Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | "
        "Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } | "
        "Select-Object IPAddress,PrefixLength,InterfaceAlias | ConvertTo-Json -Compress"
    )
    try:
        raw = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", ps],
            text=True,
            encoding="utf-8",
            errors="replace",
        ).strip()
    except Exception as exc:
        raise RuntimeError(f"could not enumerate Windows IPv4 interfaces: {exc!r}")

    if not raw:
        raise RuntimeError("Windows reported no usable IPv4 interfaces")

    data = json.loads(raw)
    rows = data if isinstance(data, list) else [data]

    parsed: list[tuple[str, int, str]] = []
    for row in rows:
        try:
            ip = str(row["IPAddress"])
            prefix = int(row["PrefixLength"])
            alias = str(row.get("InterfaceAlias") or "")
            parsed.append((ip, prefix, alias))
        except Exception:
            continue

    # First preference: standard Windows ICS/Mobile Hotspot subnet.
    for ip, prefix, alias in parsed:
        if ip == "192.168.137.1":
            iface = ipaddress.ip_interface(f"{ip}/{prefix}")
            return ip, str(iface.network.broadcast_address), prefix, alias

    # Second preference: likely Wi-Fi Direct / Mobile Hotspot virtual adapter.
    candidates: list[tuple[str, int, str]] = []
    for ip, prefix, alias in parsed:
        addr = ipaddress.ip_address(ip)
        alias_l = alias.lower()
        virtualish = (
            "local area connection" in alias_l
            or "wi-fi direct" in alias_l
            or "wifi direct" in alias_l
            or "mobile hotspot" in alias_l
        )
        if addr.is_private and ip.endswith(".1") and virtualish:
            candidates.append((ip, prefix, alias))

    if len(candidates) == 1:
        ip, prefix, alias = candidates[0]
        iface = ipaddress.ip_interface(f"{ip}/{prefix}")
        return ip, str(iface.network.broadcast_address), prefix, alias

    inventory = "; ".join(f"{ip}/{prefix} [{alias}]" for ip, prefix, alias in parsed)
    raise RuntimeError(
        "Mobile Hotspot interface not found. Turn Windows Mobile Hotspot ON "
        "and keep it on for the acceptance run. Active IPv4 interfaces: "
        + inventory
    )


def ensure_runtime_env_configurable() -> None:
    """Make runtime.py honor GW_WIFI_BIND_HOST/GW_WIFI_BROADCAST env overrides.

    This preserves the secure interface-pinning behavior while removing the
    machine-specific hardcoded subnet assumption. Existing defaults remain
    192.168.137.1/192.168.137.255.
    """
    text = RUNTIME_FILE.read_text(encoding="utf-8")

    if "GW_WIFI_BIND_HOST = os.environ.get(" in text:
        return

    # Add os import if required.
    if "import os\n" not in text:
        if "import json\n" in text:
            text = text.replace("import json\n", "import json\nimport os\n", 1)
        else:
            text = "import os\n" + text

    old = (
        'GW_WIFI_BIND_HOST = "192.168.137.1"\n'
        'GW_WIFI_BROADCAST = "192.168.137.255"\n'
    )
    new = (
        'GW_WIFI_BIND_HOST = os.environ.get("GW_WIFI_BIND_HOST", "192.168.137.1")\n'
        'GW_WIFI_BROADCAST = os.environ.get("GW_WIFI_BROADCAST", "192.168.137.255")\n'
    )

    if old not in text:
        raise RuntimeError(
            "runtime.py does not contain the expected GoblinWisp bind/broadcast constants"
        )

    RUNTIME_FILE.write_text(text.replace(old, new, 1), encoding="utf-8")


AIRCRAFT_WIFI_MAC = "A4-CB-8F-CF-A4-1C"


def _norm_mac(value: str) -> str:
    return "".join(ch for ch in value.upper() if ch in "0123456789ABCDEF")


def _windows_ipv4_neighbors() -> list[dict[str, Any]]:
    import subprocess

    ps = (
        "Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | "
        "Select-Object IPAddress,LinkLayerAddress,State,InterfaceAlias | "
        "ConvertTo-Json -Compress"
    )
    raw = subprocess.check_output(
        ["powershell", "-NoProfile", "-Command", ps],
        text=True,
        encoding="utf-8",
        errors="replace",
    ).strip()
    if not raw:
        return []
    data = json.loads(raw)
    return data if isinstance(data, list) else [data]


async def recover_aircraft_endpoint(
    rt,
    hs,
    rtmod,
    hotspot_ip: str,
    hotspot_prefix: int,
) -> tuple[str, int] | None:
    """Recover the Aircraft's transport address without granting trust.

    Discovery remains non-authoritative. This routine only discovers a
    candidate IP; the subsequent pinned-identity authenticated handshake is
    what authorizes the peer.
    """
    import ipaddress

    expected_mac = _norm_mac(AIRCRAFT_WIFI_MAC)
    network = ipaddress.ip_interface(
        f"{hotspot_ip}/{hotspot_prefix}"
    ).network

    def matching_neighbor() -> str | None:
        for row in _windows_ipv4_neighbors():
            ip = str(row.get("IPAddress") or "")
            mac = _norm_mac(str(row.get("LinkLayerAddress") or ""))
            try:
                in_network = ipaddress.ip_address(ip) in network
            except ValueError:
                in_network = False
            if in_network and mac == expected_mac:
                return ip
        return None

    # The Windows neighbor cache often already knows the hotspot client.
    ip = matching_neighbor()
    if ip is not None:
        endpoint = (ip, rtmod.GW_UDP_PORT)
        rt._peer_endpoint = endpoint
        if rt._transport is not None:
            rt._transport.sendto(
                rt._build_host_discovery(),
                endpoint,
            )
            rt.tx_packets += 1
            rt.last_tx_unix = __import__("time").time()
        await asyncio.sleep(0.35)
        return endpoint

    # Populate ARP/neighbor state and simultaneously try unicast discovery.
    # Cap the sweep so an unexpected broad prefix cannot fan out excessively.
    hosts = [str(addr) for addr in network.hosts() if str(addr) != hotspot_ip]
    if len(hosts) > 510:
        raise RuntimeError(
            f"hotspot subnet {network} is unexpectedly broad; refusing endpoint sweep"
        )

    if rt._transport is None:
        return None

    discovery = rt._build_host_discovery()
    for candidate in hosts:
        try:
            rt._transport.sendto(
                discovery,
                (candidate, rtmod.GW_UDP_PORT),
            )
            rt.tx_packets += 1
        except OSError:
            pass
        # Yield occasionally so real responses are processed during the sweep.
        if rt.tx_packets % 32 == 0:
            await asyncio.sleep(0)

    rt.last_tx_unix = __import__("time").time()

    # A cryptographically-neutral discovery response may set the candidate
    # endpoint through the normal validated discovery parser.
    discovered = await wait_until(
        lambda: rt._peer_endpoint is not None,
        1.5,
        step=0.05,
    )
    if discovered:
        return rt._peer_endpoint

    # Re-check the exact physical ESP32 MAC after neighbor population.
    ip = matching_neighbor()
    if ip is not None:
        endpoint = (ip, rtmod.GW_UDP_PORT)
        rt._peer_endpoint = endpoint
        rt._transport.sendto(discovery, endpoint)
        rt.tx_packets += 1
        rt.last_tx_unix = __import__("time").time()
        await asyncio.sleep(0.35)
        return endpoint

    # Last conservative fallback: if Windows shows exactly one usable neighbor
    # on the isolated hotspot subnet, treat it as a candidate only. The
    # authenticated handshake still must prove the pinned Aircraft identity.
    candidates: list[str] = []
    for row in _windows_ipv4_neighbors():
        ip = str(row.get("IPAddress") or "")
        mac = _norm_mac(str(row.get("LinkLayerAddress") or ""))
        state = str(row.get("State") or "").lower()
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if addr not in network or ip == hotspot_ip:
            continue
        if not mac or set(mac) <= {"0"}:
            continue
        if state in {"unreachable", "incomplete"}:
            continue
        candidates.append(ip)

    candidates = sorted(set(candidates))
    if len(candidates) == 1:
        endpoint = (candidates[0], rtmod.GW_UDP_PORT)
        rt._peer_endpoint = endpoint
        rt._transport.sendto(discovery, endpoint)
        rt.tx_packets += 1
        rt.last_tx_unix = __import__("time").time()
        await asyncio.sleep(0.35)
        return endpoint

    return None



def detect_aircraft_serial_port() -> str:
    """Robustly locate the ESP32-S3 USB serial port on Windows.

    Sources, in order:
    1) pyserial list_ports, if installed
    2) Get-PnpDevice -Class Ports
    3) HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM
    4) direct probe of the historically verified COM7
    """
    import re
    import subprocess

    candidates: list[tuple[str, str]] = []

    # 1) pyserial, if available.
    try:
        from serial.tools import list_ports
        for item in list_ports.comports():
            device = str(item.device or "").strip()
            desc = " ".join(
                str(x or "")
                for x in (
                    item.description,
                    getattr(item, "manufacturer", ""),
                    getattr(item, "hwid", ""),
                )
            )
            if device:
                candidates.append((device, desc))
    except Exception:
        pass

    # 2) Windows PnP Ports class.
    try:
        ps = (
            "Get-PnpDevice -Class Ports -ErrorAction SilentlyContinue | "
            "Select-Object FriendlyName,InstanceId,Status | ConvertTo-Json -Compress"
        )
        raw = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", ps],
            text=True,
            encoding="utf-8",
            errors="replace",
        ).strip()
        if raw:
            data = json.loads(raw)
            rows = data if isinstance(data, list) else [data]
            for row in rows:
                name = str(row.get("FriendlyName") or "")
                m = re.search(r"\((COM\d+)\)", name, re.I)
                if m:
                    candidates.append((m.group(1).upper(), name))
    except Exception:
        pass

    # 3) Registry SERIALCOMM map.
    try:
        ps = (
            "Get-ItemProperty 'HKLM:\\HARDWARE\\DEVICEMAP\\SERIALCOMM' "
            "-ErrorAction SilentlyContinue | "
            "Select-Object -Property * -ExcludeProperty PSPath,PSParentPath,"
            "PSChildName,PSDrive,PSProvider | ConvertTo-Json -Compress"
        )
        raw = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", ps],
            text=True,
            encoding="utf-8",
            errors="replace",
        ).strip()
        if raw and raw != "null":
            obj = json.loads(raw)
            if isinstance(obj, dict):
                for key, value in obj.items():
                    port = str(value or "").strip().upper()
                    if re.fullmatch(r"COM\d+", port):
                        candidates.append((port, str(key)))
    except Exception:
        pass

    # Deduplicate while preserving descriptions.
    merged: dict[str, list[str]] = {}
    for port, desc in candidates:
        merged.setdefault(port.upper(), [])
        if desc and desc not in merged[port.upper()]:
            merged[port.upper()].append(desc)

    # Strong preference for the known CH340/USB-SERIAL description.
    preferred = []
    for port, descriptions in merged.items():
        joined = " ".join(descriptions).upper()
        if (
            "CH340" in joined
            or "USB-SERIAL" in joined
            or "USB SERIAL" in joined
            or "1A86" in joined  # common QinHeng/CH340 VID
        ):
            preferred.append(port)

    if len(preferred) == 1:
        return preferred[0]

    # This Aircraft has already been physically verified on COM7 in this
    # project. Probe it directly even when Windows inventory APIs omit it.
    def direct_probe(port: str) -> bool:
        ps = (
            '$ErrorActionPreference = "Stop"; '
            f'$sp = New-Object System.IO.Ports.SerialPort "{port}",115200,"None",8,"One"; '
            '$sp.ReadTimeout = 100; '
            '$sp.WriteTimeout = 100; '
            '$sp.DtrEnable = $false; '
            '$sp.RtsEnable = $false; '
            '$sp.Open(); '
            'Start-Sleep -Milliseconds 100; '
            '$sp.Close()'
        )
        try:
            subprocess.check_call(
                ["powershell", "-NoProfile", "-Command", ps],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True
        except Exception:
            return False

    if direct_probe("COM7"):
        return "COM7"

    # If inventory found exactly one usable COM port, probe and use it.
    ports = sorted(merged.keys())
    usable = [port for port in ports if direct_probe(port)]
    if len(usable) == 1:
        return usable[0]

    inventory = "; ".join(
        f"{port} [{' | '.join(descs)}]"
        for port, descs in sorted(merged.items())
    ) or "none"

    raise RuntimeError(
        "Aircraft USB serial port could not be opened. "
        f"Windows port inventory: {inventory}. "
        "The previously verified Aircraft port is COM7. "
        "Ensure the ESP32 USB cable is connected and no serial monitor/editor "
        "has COM7 open."
    )


def reset_aircraft_volatile_state(port: str) -> None:
    # Pulse ESP32 EN through the CH340 auto-reset circuit.
    # DTR remains inactive so GPIO0 stays in normal boot mode.
    import subprocess

    ps = (
        '$ErrorActionPreference = "Stop"; '
        f'$sp = New-Object System.IO.Ports.SerialPort "{port}",115200,"None",8,"One"; '
        '$sp.DtrEnable = $false; '
        '$sp.RtsEnable = $false; '
        '$sp.Open(); '
        'Start-Sleep -Milliseconds 100; '
        '$sp.DtrEnable = $false; '
        '$sp.RtsEnable = $true; '
        'Start-Sleep -Milliseconds 150; '
        '$sp.RtsEnable = $false; '
        'Start-Sleep -Milliseconds 700; '
        '$sp.Close()'
    )
    subprocess.check_call(
        ["powershell", "-NoProfile", "-Command", ps],
    )


async def discover_after_reset(
    rt,
    hs,
    rtmod,
    hotspot_ip: str,
    hotspot_broadcast: str,
    hotspot_prefix: int,
    *,
    timeout: float = 10.0,
) -> tuple[str, int] | None:
    rt._peer_endpoint = None
    rt.aircraft_last_rx_unix = None
    rt.last_error = None

    if rt._transport is None:
        return None

    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout

    while loop.time() < deadline:
        try:
            rt._transport.sendto(
                rt._build_host_discovery(),
                (hotspot_broadcast, rtmod.GW_UDP_PORT),
            )
            rt.tx_packets += 1
            rt.last_tx_unix = __import__("time").time()
        except OSError:
            pass

        await asyncio.sleep(0.35)

        if rt._peer_endpoint is not None:
            return rt._peer_endpoint

    return await recover_aircraft_endpoint(
        rt,
        hs,
        rtmod,
        hotspot_ip,
        hotspot_prefix,
    )


async def live_tests(suite: Suite, hs, rtmod) -> None:
    print("\n=== LIVE AIRCRAFT TESTS ===")

    if port_in_use("127.0.0.1", 8000):
        suite.add(
            "Live test precondition",
            False,
            "port 8000 is in use. Stop Uvicorn before running this one-shot suite.",
        )
        return

    required_attrs = (
        "acks_sent",
        "acks_received",
        "duplicate_packets_acked",
        "last_acknowledged_tx_counter",
    )

    class TestRuntime(rtmod.GoblinWispWifiRuntime):
        def __init__(self, state_dir):
            super().__init__(state_dir)
            self.captured_secure: list[tuple[bytes, tuple[str, int]]] = []
            self.captured_handshake: list[tuple[bytes, tuple[str, int]]] = []

        async def _handle_datagram(self, data: bytes, addr: tuple[str, int]) -> None:
            if data.startswith(hs.DATA_MAGIC):
                self.captured_secure.append((bytes(data), addr))
                if len(self.captured_secure) > 100:
                    self.captured_secure.pop(0)
            if data.startswith(hs.HANDSHAKE_MAGIC):
                self.captured_handshake.append((bytes(data), addr))
                if len(self.captured_handshake) > 50:
                    self.captured_handshake.pop(0)
            await super()._handle_datagram(data, addr)

    try:
        hotspot_ip, hotspot_broadcast, hotspot_prefix, hotspot_alias = detect_hotspot_ipv4()
    except Exception as exc:
        suite.add(
            "Mobile Hotspot preflight",
            False,
            str(exc),
        )
        return

    suite.note(
        f"Live interface: {hotspot_ip}/{hotspot_prefix} "
        f"broadcast={hotspot_broadcast} interface={hotspot_alias}"
    )

    # Keep runtime defaults configurable for this machine and for the backend
    # that is relaunched after the suite.
    os.environ["GW_WIFI_BIND_HOST"] = hotspot_ip
    os.environ["GW_WIFI_BROADCAST"] = hotspot_broadcast

    rt = TestRuntime(STATE_DIR)
    rt.bind_host = hotspot_ip
    rt.broadcast_host = hotspot_broadcast

    missing = [name for name in required_attrs if not hasattr(rt, name)]
    if missing:
        suite.add(
            "ACK runtime patch present",
            False,
            "missing runtime attributes: " + ", ".join(missing),
        )
        return
    suite.add("ACK runtime patch present", True, "authenticated ACK diagnostics available")

    peer = rt.security.trusted_aircraft()
    if peer is None:
        suite.add(
            "Persistent Aircraft trust available",
            False,
            "trusted Aircraft record missing",
        )
        return
    suite.add(
        "Persistent Aircraft trust available",
        True,
        hs.fingerprint_text(peer.public_key, full=True),
    )

    try:
        aircraft_port = detect_aircraft_serial_port()
        suite.add(
            "Aircraft serial reset path",
            True,
            aircraft_port,
        )
    except Exception as exc:
        suite.add(
            "Aircraft serial reset path",
            False,
            str(exc),
        )
        return

    old_valid_packet: bytes | None = None
    old_session_id: int | None = None

    try:
        await rt.start(bind_host=hotspot_ip)
        rt.broadcast_host = hotspot_broadcast
        suite.add(
            "UDP bind",
            True,
            f"{rt.bind_host}:{rtmod.GW_UDP_PORT} broadcast={rt.broadcast_host}",
        )

        # Start from a clean volatile Aircraft state. NVS identity/trust remain.
        reset_aircraft_volatile_state(aircraft_port)
        suite.note(
            f"Aircraft volatile session reset on {aircraft_port}; "
            "persistent identity/trust preserved"
        )

        endpoint = await discover_after_reset(
            rt,
            hs,
            rtmod,
            hotspot_ip,
            hotspot_broadcast,
            hotspot_prefix,
            timeout=10.0,
        )
        if endpoint is None:
            suite.add(
                "Aircraft endpoint after reset",
                False,
                (
                    "Aircraft did not appear during the fresh discovery window. "
                    "Check ESP32 power and GoblinWisp-Link connection."
                ),
            )
            return

        suite.add(
            "Aircraft endpoint after reset",
            True,
            f"{endpoint[0]}:{endpoint[1]}",
        )

        # Establish the known-good pinned identity session first.
        rt.last_error = None
        await rt.start_secure_session()
        session_ok = await wait_until(rt.security.session_active, 10.0)

        if not session_ok:
            suite.add(
                "Authenticated live handshake",
                False,
                f"session did not activate; endpoint={rt._peer_endpoint}, last_error={rt.last_error}",
            )
            return

        suite.add(
            "Authenticated live handshake",
            True,
            f"session_id={rt.security.session.session_id:016X} endpoint={rt._peer_endpoint}",
        )

        old_session_id = rt.security.session.session_id

        health_ok = await wait_until(
            lambda: (
                isinstance(rt.last_application, dict)
                and rt.last_application.get("type") == "DEVICE_HEALTH"
                and rt.security.session is not None
                and rt.security.session.b_to_a.replay.highest_counter > 0
            ),
            6.0,
        )
        suite.add(
            "Aircraft DEVICE_HEALTH over secure channel",
            health_ok,
            (
                json.dumps(rt.last_application, separators=(",", ":"))
                if rt.last_application
                else "no DEVICE_HEALTH received"
            ),
        )

        # Happy-path host->Aircraft application + exact ACK counter.
        ping_counter = await rt.send_application(
            {
                "type": "PING",
                "source": "MISSIONNEXUS",
                "message": "ONE_SHOT_ACCEPTANCE",
            }
        )
        ping_acked = await wait_until(
            lambda: rt.last_acknowledged_tx_counter == ping_counter,
            3.0,
        )
        suite.add(
            "MissionNexus DATA -> Aircraft authenticated ACK",
            ping_acked,
            f"sent_counter={ping_counter}, acknowledged={rt.last_acknowledged_tx_counter}",
        )

        def send_raw(packet: bytes) -> None:
            assert rt._transport is not None
            assert rt._peer_endpoint is not None
            rt._transport.sendto(packet, rt._peer_endpoint)
            rt.tx_packets += 1

        # Live ciphertext tamper: bad packet must get no ACK, exact original
        # with the same counter must then be accepted. This proves auth failure
        # did not consume replay state on the Aircraft.
        pkt, counter = rt.security.encrypt_application(
            b'{"type":"SECURITY_TEST","case":"CIPHERTEXT_TAMPER"}'
        )
        old_valid_packet = pkt
        bad = bytearray(pkt)
        bad[hs.SECURE_HEADER_SIZE] ^= 0x01
        before_acks = rt.acks_received
        rt.last_acknowledged_tx_counter = None
        send_raw(bytes(bad))
        await asyncio.sleep(0.8)
        bad_unacked = rt.acks_received == before_acks
        send_raw(pkt)
        recovered = await wait_until(
            lambda: rt.last_acknowledged_tx_counter == counter,
            2.0,
        )
        suite.add(
            "Live ciphertext tamper rejected; replay state unchanged",
            bad_unacked and recovered,
            f"tampered_ack={not bad_unacked}, original_counter={counter}, final_ack={rt.last_acknowledged_tx_counter}",
        )

        # Live tag tamper same invariant.
        pkt2, counter2 = rt.security.encrypt_application(
            b'{"type":"SECURITY_TEST","case":"TAG_TAMPER"}'
        )
        bad2 = bytearray(pkt2)
        bad2[-1] ^= 0x80
        before_acks = rt.acks_received
        rt.last_acknowledged_tx_counter = None
        send_raw(bytes(bad2))
        await asyncio.sleep(0.8)
        tag_unacked = rt.acks_received == before_acks
        send_raw(pkt2)
        recovered2 = await wait_until(
            lambda: rt.last_acknowledged_tx_counter == counter2,
            2.0,
        )
        suite.add(
            "Live GCM-tag tamper rejected; replay state unchanged",
            tag_unacked and recovered2,
            f"tampered_ack={not tag_unacked}, original_counter={counter2}, final_ack={rt.last_acknowledged_tx_counter}",
        )

        # Exact replay of an already accepted A->B DATA packet. Aircraft should
        # re-ACK the authenticated duplicate but not treat it as new application data.
        before_acks = rt.acks_received
        rt.last_acknowledged_tx_counter = None
        send_raw(pkt2)
        replay_acked = await wait_until(
            lambda: rt.acks_received > before_acks
            and rt.last_acknowledged_tx_counter == counter2,
            2.0,
        )
        suite.add(
            "Live exact replay detected/re-ACKed without new counter",
            replay_acked,
            f"replayed_counter={counter2}, ACK_count {before_acks}->{rt.acks_received}",
        )

        # Cross-direction replay: take an authenticated B->A DATA/FRAGMENT frame
        # captured from the Aircraft and send it back to the Aircraft. It must
        # not produce an ACK as if it were valid A->B traffic.
        inbound = None
        for raw, _addr in reversed(rt.captured_secure):
            if (
                len(raw) >= hs.SECURE_HEADER_SIZE
                and raw[6] in {hs.SECURE_DATA, hs.SECURE_FRAGMENT}
                and raw[7] == hs.AIRCRAFT_ID
            ):
                inbound = raw
                break

        if inbound is not None:
            before_acks = rt.acks_received
            rt.last_acknowledged_tx_counter = None
            send_raw(inbound)
            await asyncio.sleep(1.0)
            cross_rejected = rt.acks_received == before_acks and rt.security.session_active()
            suite.add(
                "Live cross-direction replay rejected",
                cross_rejected,
                f"Aircraft ACK count remained {before_acks}",
            )
        else:
            suite.add(
                "Live cross-direction replay rejected",
                False,
                "no captured B->A secure DATA frame available",
            )

        # True reboot/session-reset acceptance test. Reset both peers' volatile
        # state, rediscover the Aircraft, then establish a genuinely fresh
        # authenticated session. Persistent identity/trust must survive.
        if old_valid_packet is not None and old_session_id is not None:
            rt.security.invalidate_session("acceptance session refresh")
            rt.last_acknowledged_tx_counter = None
            reset_aircraft_volatile_state(aircraft_port)

            fresh_endpoint = await discover_after_reset(
                rt,
                hs,
                rtmod,
                hotspot_ip,
                hotspot_broadcast,
                hotspot_prefix,
                timeout=10.0,
            )

            if fresh_endpoint is None:
                suite.add(
                    "Fresh handshake creates new session",
                    False,
                    "Aircraft not rediscovered after volatile reset",
                )
                return

            await rt.start_secure_session()
            fresh_ok = await wait_until(rt.security.session_active, 10.0)

            new_sid = rt.security.session.session_id if fresh_ok else None
            sid_changed = fresh_ok and new_sid != old_session_id
            suite.add(
                "Fresh handshake creates new session",
                bool(sid_changed),
                (
                    f"{old_session_id:016X}->{new_sid:016X}"
                    if new_sid is not None
                    else "fresh handshake failed"
                ),
            )

            if not fresh_ok:
                return

            before_acks = rt.acks_received
            rt.last_acknowledged_tx_counter = None
            send_raw(old_valid_packet)
            await asyncio.sleep(0.8)
            old_rejected = rt.acks_received == before_acks

            new_ping = await rt.send_application(
                {
                    "type": "PING",
                    "source": "MISSIONNEXUS",
                    "message": "FRESH_SESSION_ACCEPTANCE",
                }
            )
            new_acked = await wait_until(
                lambda: rt.last_acknowledged_tx_counter == new_ping,
                3.0,
            )

            suite.add(
                "Old-session packet rejected after fresh handshake",
                old_rejected and new_acked,
                f"old_packet_ack={not old_rejected}; new_counter={new_ping}, new_ack={rt.last_acknowledged_tx_counter}",
            )

        # Wrong-host identity test from a clean reset so it cannot poison
        # the valid-session happy path.
        rt.security.invalidate_session("wrong-host identity acceptance test")
        reset_aircraft_volatile_state(aircraft_port)

        endpoint = await discover_after_reset(
            rt,
            hs,
            rtmod,
            hotspot_ip,
            hotspot_broadcast,
            hotspot_prefix,
            timeout=10.0,
        )
        if endpoint is None:
            suite.add(
                "Wrong MissionNexus identity rejected by Aircraft",
                False,
                "could not rediscover Aircraft after clean reset",
            )
            return

        wrong_reply_before = len(rt.captured_handshake)
        with tempfile.TemporaryDirectory() as td:
            wrong = hs.GoblinWispHostSecurity(td)
            wrong.enroll_aircraft(
                peer.public_key,
                locally_authorized=True,
            )
            wrong_hello = wrong.start_handshake()
            assert rt._transport is not None
            rt._transport.sendto(
                rt._build_host_discovery(),
                (hotspot_broadcast, rtmod.GW_UDP_PORT),
            )
            rt._transport.sendto(wrong_hello, endpoint)
            rt.tx_packets += 2
            rt.last_tx_unix = __import__("time").time()
            await asyncio.sleep(1.2)

        wrong_frames = rt.captured_handshake[wrong_reply_before:]
        wrong_replies = [
            p
            for p, _ in wrong_frames
            if len(p) >= 8 and p[6] == hs.HANDSHAKE_REPLY
        ]

        suite.add(
            "Wrong MissionNexus identity rejected by Aircraft",
            len(wrong_replies) == 0,
            (
                "untrusted host identity produced no REPLY"
                if len(wrong_replies) == 0
                else f"unexpected handshake REPLY frames={len(wrong_replies)}"
            ),
        )

        # Restore the legitimate identity from another clean reset.
        reset_aircraft_volatile_state(aircraft_port)
        endpoint = await discover_after_reset(
            rt,
            hs,
            rtmod,
            hotspot_ip,
            hotspot_broadcast,
            hotspot_prefix,
            timeout=10.0,
        )
        if endpoint is None:
            suite.add(
                "Valid identity restored after wrong-identity test",
                False,
                "Aircraft not rediscovered after restore reset",
            )
            return

        rt.last_error = None
        await rt.start_secure_session()
        restored_identity_session = await wait_until(
            rt.security.session_active,
            10.0,
        )
        suite.add(
            "Valid identity restored after wrong-identity test",
            restored_identity_session,
            (
                f"session_id={rt.security.session.session_id:016X}"
                if restored_identity_session and rt.security.session is not None
                else f"last_error={rt.last_error}"
            ),
        )
        if not restored_identity_session:
            return

        # Final live health invariants.
        snap = rt.status()
        sec = snap["security"]
        suite.add(
            "Live session remains healthy",
            bool(
                sec.get("secure_session_active")
                and sec.get("auth_failures", 0) == 0
                and sec.get("malformed_packets", 0) == 0
                and snap["transport"].get("last_error") in (None, "")
            ),
            json.dumps(
                {
                    "session_id": sec.get("session_id"),
                    "auth_failures": sec.get("auth_failures"),
                    "replay_drops": sec.get("replay_drops"),
                    "malformed_packets": sec.get("malformed_packets"),
                    "last_error": snap["transport"].get("last_error"),
                    "acks_sent": snap["transport"].get("acks_sent"),
                    "acks_received": snap["transport"].get("acks_received"),
                },
                separators=(",", ":"),
            ),
        )

    except OSError as exc:
        suite.add(
            "Live UDP execution",
            False,
            f"{exc!r}; stop Uvicorn/other process holding UDP {rtmod.GW_UDP_PORT} and rerun",
        )
    except Exception as exc:
        suite.add("Live UDP execution", False, repr(exc))
    finally:
        try:
            await rt.stop()
        except Exception:
            pass


def write_report(suite: Suite, backup_dir: Path) -> tuple[Path, Path]:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = REPORT_DIR / f"goblinwisp_acceptance_{stamp}.json"
    md_path = REPORT_DIR / f"goblinwisp_acceptance_{stamp}.md"

    payload = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "project_root": str(ROOT),
        "backup_dir": str(backup_dir),
        "required_passed": suite.required_passed,
        "summary": suite.summary(),
        "results": suite.results,
        "notes": suite.notes,
    }
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# GoblinWisp v1.1 Acceptance Report",
        "",
        f"- Generated UTC: {payload['generated_utc']}",
        f"- Project: `{ROOT}`",
        f"- Backup: `{backup_dir}`",
        f"- Required suite: **{'PASS' if suite.required_passed else 'FAIL'}**",
        "",
        "## Results",
        "",
        "| Result | Required | Test | Detail |",
        "|---|---:|---|---|",
    ]
    for r in suite.results:
        result = "PASS" if r["passed"] else ("FAIL" if r["required"] else "GAP")
        detail = str(r["detail"]).replace("|", "\\|").replace("\n", " ")
        lines.append(
            f"| {result} | {'yes' if r['required'] else 'no'} | {r['name']} | {detail} |"
        )

    lines += [
        "",
        "## Interpretation",
        "",
        "A PASS means the currently implemented GoblinWisp host/Aircraft secure transport core passed the required tests in this runner.",
        "",
        "Authenticated in-session rekey is reported separately because the current MissionNexus host module must contain a real rekey state machine/wire implementation before that patent/production property can be claimed.",
        "",
        "FC/MAVLink, sensor, and camera integration are application-layer work above this transport and are not claimed by this cryptographic acceptance report.",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return json_path, md_path


async def async_main() -> int:
    suite = Suite()

    print("GoblinWisp one-shot finish/acceptance run")
    print("Project:", ROOT)
    print()

    if not HOST_SECURITY.exists() or not RUNTIME_FILE.exists():
        print("ERROR: run this script from the MissionNexus project root.")
        return 2

    backup_dir = backup_files(suite)
    ensure_runtime_env_configurable()
    compile_sources(suite)

    try:
        hotspot_ip, hotspot_broadcast, _prefix, _alias = detect_hotspot_ipv4()
        os.environ["GW_WIFI_BIND_HOST"] = hotspot_ip
        os.environ["GW_WIFI_BROADCAST"] = hotspot_broadcast
    except Exception as exc:
        suite.add("Mobile Hotspot preflight", False, str(exc))
        json_report, md_report = write_report(suite, backup_dir)
        print("\n=== FINAL ===")
        print(json.dumps(suite.summary(), indent=2))
        print("Required suite: FAIL")
        print("Markdown report:", md_report)
        print("JSON report:", json_report)
        return 1

    hs, rtmod = load_modules()

    offline_tests(suite, hs)
    await live_tests(suite, hs, rtmod)

    json_report, md_report = write_report(suite, backup_dir)
    print("\n=== FINAL ===")
    print(json.dumps(suite.summary(), indent=2))
    print("Required suite:", "PASS" if suite.required_passed else "FAIL")
    print("Markdown report:", md_report)
    print("JSON report:", json_report)

    return 0 if suite.required_passed else 1


def _http_json(method: str, url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    import urllib.request

    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw)


def restart_backend_and_restore_link() -> bool:
    import subprocess
    import time

    print("\n=== RESTORE OPERATIONAL BACKEND ===")

    # A new backend process has no previous volatile session keys. Reset the
    # Aircraft's volatile session too so the final operational link starts from
    # a clean, symmetric state. NVS identity/trust are preserved.
    try:
        aircraft_port = detect_aircraft_serial_port()
        reset_aircraft_volatile_state(aircraft_port)
        print(f"Aircraft volatile session reset on {aircraft_port} for operational restore")
        time.sleep(1.0)
    except Exception as exc:
        print("ERROR: could not reset Aircraft for operational restore:", repr(exc))
        return False

    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_CONSOLE

    child_env = os.environ.copy()
    try:
        hotspot_ip, hotspot_broadcast, _prefix, hotspot_alias = detect_hotspot_ipv4()
        child_env["GW_WIFI_BIND_HOST"] = hotspot_ip
        child_env["GW_WIFI_BROADCAST"] = hotspot_broadcast
        print(
            f"Backend GoblinWisp interface: {hotspot_ip} "
            f"broadcast={hotspot_broadcast} [{hotspot_alias}]"
        )
    except Exception as exc:
        print("ERROR:", exc)
        return False

    proc = subprocess.Popen(
        [
            str(ROOT / "venv" / "Scripts" / "python.exe"),
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
        ],
        cwd=str(BACKEND),
        creationflags=creationflags,
        env=child_env,
    )

    print(f"Started Uvicorn PID {proc.pid}")

    deadline = time.time() + 12
    while time.time() < deadline:
        try:
            _http_json("GET", "http://127.0.0.1:8000/api/goblinwisp/status")
            break
        except Exception:
            time.sleep(0.4)
    else:
        print("ERROR: backend did not become ready on port 8000")
        return False

    try:
        print("Connecting transport...")
        _http_json("POST", "http://127.0.0.1:8000/api/goblinwisp/transports/connect")

        print("Scanning Aircraft...")
        _http_json("POST", "http://127.0.0.1:8000/api/goblinwisp/transports/scan")
        time.sleep(3.0)

        print("Starting fresh operational secure session...")
        _http_json("POST", "http://127.0.0.1:8000/api/goblinwisp/security/session/start")
        time.sleep(3.0)

        status = _http_json("GET", "http://127.0.0.1:8000/api/goblinwisp/status")
        print("\nFinal operational status:")
        print(json.dumps(status, indent=2))

        sec = status.get("security", {})
        aircraft = status.get("aircraft", {})
        transport = status.get("transport", {})

        ok = bool(
            transport.get("connected")
            and sec.get("peer_trusted")
            and sec.get("secure_session_active")
            and not sec.get("handshake_pending")
            and sec.get("auth_failures", 0) == 0
            and sec.get("malformed_packets", 0) == 0
            and aircraft.get("online")
        )

        print("\nOperational restore:", "PASS" if ok else "CHECK REQUIRED")
        return ok

    except Exception as exc:
        print("ERROR while restoring operational link:", repr(exc))
        return False


if __name__ == "__main__":
    rc = asyncio.run(async_main())

    if rc == 0:
        restored = restart_backend_and_restore_link()
        if not restored:
            rc = 1

    raise SystemExit(rc)
