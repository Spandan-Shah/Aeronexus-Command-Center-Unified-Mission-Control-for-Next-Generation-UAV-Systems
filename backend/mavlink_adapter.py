"""
AeroNexus MAVLink Adapter

This file is intentionally kept as a safe placeholder.

Later, this will connect to:
- Pixhawk
- ArduPilot
- PX4
- MAVSDK
- pymavlink
- serial telemetry radio
- UDP telemetry stream

Do not send real ARM, TAKEOFF, LAND, RTL commands to an actual drone
without proper safety checks, kill switch, test area, and flight permissions.
"""


class MavlinkAdapter:
    def __init__(self):
        self.connected = False

    def connect(self):
        self.connected = False
        return {
            "connected": self.connected,
            "message": "MAVLink adapter placeholder is ready, but not connected.",
        }

    def get_telemetry(self):
        return {
            "connected": self.connected,
            "message": "Real MAVLink telemetry not connected yet.",
        }

    def send_command(self, command: str):
        return {
            "accepted": False,
            "command": command,
            "message": "Real drone commands are disabled in placeholder mode.",
        }