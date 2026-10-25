import json
import sys
import time
import urllib.error
import urllib.request

import serial

BACKEND = "http://127.0.0.1:8000"
SERIAL_PORT = "COM7"
SERIAL_BAUD = 115200

AIRCRAFT_PUBLIC_KEY_HEX = (
    "046D8972741A0F9552AF6DC4D5F350F776D5EC4ADBF13E97779D20623583C05377"
    "161DA8B2BB6498256335806570085AEE417835B2835F231BA3AA3AB14EA0286C"
)


def request_json(method: str, path: str, body=None):
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        BACKEND + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Cannot reach MissionNexus backend at {BACKEND}. "
            "Keep uvicorn running before executing this script."
        ) from exc


def print_json(title: str, payload) -> None:
    print(f"\n=== {title} ===")
    print(json.dumps(payload, indent=2))


def provision_aircraft(host_public_key_hex: str) -> None:
    print("\nOpening aircraft serial port.")
    print(
        "The CH340 connection may reset the ESP32-S3. "
        "Waiting 12 seconds for GoblinWisp and Wi-Fi to boot..."
    )

    with serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=0.3) as port:
        time.sleep(12)
        port.reset_input_buffer()

        print("\nPHYSICAL AUTHORIZATION REQUIRED")
        print("1. Press and HOLD the ESP32-S3 BOOT button.")
        print("2. While still holding BOOT, press ENTER on this keyboard.")
        input("Hold BOOT now, then press ENTER here: ")

        command = f"GW:TRUST_HOST:{host_public_key_hex}\r\n".encode("ascii")
        port.write(command)
        port.flush()

        time.sleep(2)
        reply = port.read_all().decode("utf-8", errors="replace")
        print("\n=== Aircraft trust-enrollment reply ===")
        print(reply.strip() or "(no reply received)")

        if "GW_PROVISION_OK:HOST_TRUSTED" not in reply:
            raise RuntimeError(
                "Aircraft did not confirm HOST_TRUSTED. "
                "Keep BOOT held while pressing ENTER and retry."
            )

        print("\nRelease the BOOT button now.")
        time.sleep(1)

        port.reset_input_buffer()
        port.write(b"GW:STATUS\r\n")
        port.flush()
        time.sleep(2)
        status_reply = port.read_all().decode("utf-8", errors="replace")
        print("\n=== Aircraft status after enrollment ===")
        print(status_reply.strip() or "(no status reply received)")


def main() -> int:
    print("MissionNexus / GoblinWisp mutual pairing helper")
    print(f"Backend: {BACKEND}")
    print(f"Aircraft serial: {SERIAL_PORT} @ {SERIAL_BAUD}")

    identity = request_json("GET", "/api/goblinwisp/security/identity")
    print_json("MissionNexus persistent identity", identity)

    host_public_key_hex = str(identity.get("public_key_hex", "")).strip()
    if len(host_public_key_hex) != 130 or not host_public_key_hex.startswith("04"):
        raise RuntimeError("MissionNexus returned an invalid P-256 public key.")

    enrollment = request_json(
        "POST",
        "/api/goblinwisp/security/enroll",
        {"aircraft_public_key_hex": AIRCRAFT_PUBLIC_KEY_HEX},
    )
    print_json("MissionNexus aircraft enrollment", enrollment)

    provision_aircraft(host_public_key_hex)

    print("\nStarting MissionNexus Wi-Fi UDP transport...")
    transport = request_json("POST", "/api/goblinwisp/transports/connect")
    print_json("Transport after connect", transport)

    request_json("POST", "/api/goblinwisp/transports/scan")
    print("\nDiscovery running for a moment...")
    time.sleep(3)

    discovery_status = request_json("GET", "/api/goblinwisp/status")
    print_json("Status after discovery", discovery_status)

    print("\nStarting authenticated GoblinWisp secure session...")
    request_json("POST", "/api/goblinwisp/security/session/start")

    final_status = None
    for _ in range(10):
        time.sleep(1)
        final_status = request_json("GET", "/api/goblinwisp/status")
        if final_status.get("security", {}).get("secure_session_active"):
            break

    print_json("Final GoblinWisp status", final_status)

    if final_status and final_status.get("security", {}).get("secure_session_active"):
        print("\nSUCCESS: GoblinWisp secure session is ACTIVE.")
        print("Leave MissionNexus running and open the Drone Integration page.")
        return 0

    print(
        "\nPairing completed, but the secure session did not become ACTIVE yet.\n"
        "The final status above contains the exact transport/security state for diagnosis."
    )
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        raise SystemExit(130)
    except Exception as exc:
        print(f"\nERROR: {exc}")
        raise SystemExit(1)
