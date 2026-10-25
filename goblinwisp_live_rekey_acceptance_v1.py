from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def request(method: str, path: str, body=None):
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw}
        return exc.code, payload


def status():
    code, data = request("GET", "/api/goblinwisp/status")
    if code != 200:
        raise RuntimeError(f"status failed HTTP {code}: {data}")
    return data


def fail(message: str):
    print(f"[FAIL] {message}")
    sys.exit(1)


print("GoblinWisp live authenticated rekey acceptance")
print("=" * 60)

before = status()
sec0 = before["security"]
tr0 = before["transport"]
air0 = before["aircraft"]

if not sec0.get("secure_session_active"):
    fail("secure session is not active before rekey")
if not sec0.get("peer_trusted"):
    fail("Aircraft trust is not active")
if not tr0.get("connected") or not tr0.get("peer_endpoint"):
    fail("Aircraft transport/endpoint is not ready")

old_sid = sec0.get("session_id")
old_epoch = int(sec0.get("key_epoch") or 0)
old_auth = int(sec0.get("auth_failures") or 0)
old_replay = int(sec0.get("replay_drops") or 0)
old_malformed = int(sec0.get("malformed_packets") or 0)
old_rekey_failures = int(sec0.get("rekey_failures") or 0)

print(f"[PASS] Pre-rekey secure session: SID={old_sid} epoch={old_epoch}")
print(f"[PASS] Aircraft endpoint: {tr0.get('peer_endpoint')}")

code, start = request("POST", "/api/goblinwisp/security/rekey/start")
if code != 200:
    fail(f"rekey start failed HTTP {code}: {start}")

print("[PASS] Rekey start accepted")

deadline = time.time() + 30.0
last = None
transition_seen = False

while time.time() < deadline:
    time.sleep(0.25)
    last = status()
    sec = last["security"]
    state = sec.get("rekey_state")
    epoch = int(sec.get("key_epoch") or 0)

    if state not in (None, "IDLE"):
        transition_seen = True

    if not sec.get("secure_session_active"):
        if not sec.get("rekey_in_progress"):
            fail(
                "session became inactive and rekey is no longer in progress: "
                + json.dumps(sec, separators=(",", ":"))
            )

    if (
        sec.get("secure_session_active")
        and epoch == old_epoch + 1
        and sec.get("session_id") not in (None, old_sid)
        and state == "IDLE"
        and not sec.get("rekey_blocks_application")
    ):
        break
else:
    fail(
        "rekey did not converge to a ready new epoch within 30 seconds; "
        f"last={json.dumps(last, separators=(',', ':')) if last else 'none'}"
    )

after = last
sec1 = after["security"]

if not transition_seen:
    fail("no rekey transition state was observed")
if int(sec1.get("key_epoch") or 0) != old_epoch + 1:
    fail("key epoch did not increment exactly by one")
if sec1.get("session_id") == old_sid:
    fail("session ID did not change")
if int(sec1.get("rekey_failures") or 0) != old_rekey_failures:
    fail("rekey failure counter increased")
if int(sec1.get("auth_failures") or 0) != old_auth:
    fail("authentication failure counter changed during valid rekey")
if int(sec1.get("replay_drops") or 0) != old_replay:
    fail("replay drop counter changed during valid rekey")
if int(sec1.get("malformed_packets") or 0) != old_malformed:
    fail("malformed packet counter changed during valid rekey")

print(
    "[PASS] Rekey converged: "
    f"SID {old_sid} -> {sec1.get('session_id')}, "
    f"epoch {old_epoch} -> {sec1.get('key_epoch')}"
)
print(
    "[PASS] Security counters unchanged: "
    f"auth={sec1.get('auth_failures')} "
    f"replay={sec1.get('replay_drops')} "
    f"malformed={sec1.get('malformed_packets')}"
)
print(
    "[PASS] Rekey diagnostics: "
    f"successes={sec1.get('rekey_successes')} "
    f"failures={sec1.get('rekey_failures')}"
)

# Send one new-epoch application DATA and require its exact authenticated ACK.
code, sent = request(
    "POST",
    "/api/goblinwisp/application/send",
    {
        "payload": {
            "type": "PING",
            "source": "MISSIONNEXUS",
            "message": "POST_REKEY_ACCEPTANCE",
        }
    },
)
if code != 200 or not sent.get("ok"):
    fail(f"post-rekey PING failed HTTP {code}: {sent}")

counter = int(sent.get("counter") or 0)
if counter <= 0:
    fail(f"invalid post-rekey TX counter: {sent}")

print(f"[PASS] Post-rekey encrypted PING sent: counter={counter}")

ack_deadline = time.time() + 5.0
final = None
while time.time() < ack_deadline:
    time.sleep(0.20)
    final = status()
    acknowledged = final["transport"].get("last_acknowledged_tx_counter")
    if acknowledged == counter:
        break
else:
    fail(
        "Aircraft did not return the exact authenticated ACK for the "
        f"post-rekey counter {counter}; final={json.dumps(final, separators=(',', ':'))}"
    )

sec2 = final["security"]
air2 = final["aircraft"]

if not sec2.get("secure_session_active"):
    fail("secure session is not active after post-rekey PING")
if int(sec2.get("key_epoch") or 0) != old_epoch + 1:
    fail("unexpected epoch after post-rekey PING")
if not air2.get("online"):
    fail("Aircraft is not online after rekey")

print(f"[PASS] Exact Aircraft ACK received: {counter}")
print(f"[PASS] Aircraft online after rekey: {air2.get('online')}")
if isinstance(air2.get("last_application"), dict):
    print(
        "[PASS] Latest Aircraft application: "
        + json.dumps(air2["last_application"], separators=(",", ":"))
    )

print()
print("=== RESULT ===")
print("LIVE AUTHENTICATED REKEY: PASS")
print(
    json.dumps(
        {
            "old_session_id": old_sid,
            "new_session_id": sec2.get("session_id"),
            "old_epoch": old_epoch,
            "new_epoch": sec2.get("key_epoch"),
            "ping_counter": counter,
            "acknowledged_counter": final["transport"].get(
                "last_acknowledged_tx_counter"
            ),
            "rekey_successes": sec2.get("rekey_successes"),
            "rekey_failures": sec2.get("rekey_failures"),
            "auth_failures": sec2.get("auth_failures"),
            "replay_drops": sec2.get("replay_drops"),
            "malformed_packets": sec2.get("malformed_packets"),
        },
        indent=2,
    )
)
