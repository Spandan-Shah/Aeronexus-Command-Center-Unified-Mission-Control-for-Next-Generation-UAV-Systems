from datetime import datetime
import random

simulator_state = {
    "droneId": "UAV-01",
    "armed": False,
    "missionStarted": False,
    "flightMode": "STANDBY",
    "battery": 92,
    "altitude": 0,
    "speed": 0,
    "heading": 42,
    "linkQuality": 98,
    "gpsSatellites": 14,
    "currentWaypoint": 0,
    "totalWaypoints": 7,
    "alerts": [],
}


def now_time():
    return datetime.now().strftime("%H:%M:%S")


def update_simulator():
    if simulator_state["missionStarted"]:
        simulator_state["battery"] = max(0, simulator_state["battery"] - 0.2)
        simulator_state["altitude"] = min(
            145,
            simulator_state["altitude"] + random.randint(1, 4),
        )
        simulator_state["speed"] = round(random.uniform(12, 22), 1)
        simulator_state["heading"] = (simulator_state["heading"] + random.randint(1, 5)) % 360
        simulator_state["linkQuality"] = max(
            70,
            simulator_state["linkQuality"] - random.choice([0, 0, 1]),
        )

        if random.random() > 0.82:
            simulator_state["currentWaypoint"] = min(
                simulator_state["totalWaypoints"],
                simulator_state["currentWaypoint"] + 1,
            )

    else:
        simulator_state["speed"] = 0
        if not simulator_state["armed"]:
            simulator_state["altitude"] = 0

    return simulator_state


def run_command(command: str):
    command = command.upper()

    if command == "ARM":
        simulator_state["armed"] = True
        simulator_state["flightMode"] = "ARMED"
        return "Drone armed successfully"

    if command == "DISARM":
        simulator_state["armed"] = False
        simulator_state["missionStarted"] = False
        simulator_state["flightMode"] = "STANDBY"
        simulator_state["speed"] = 0
        simulator_state["altitude"] = 0
        return "Drone disarmed successfully"

    if command == "START_MISSION":
        if not simulator_state["armed"]:
            return "Cannot start mission. Drone is not armed."

        simulator_state["missionStarted"] = True
        simulator_state["flightMode"] = "AUTO.MISSION"
        simulator_state["currentWaypoint"] = 1
        return "Mission started successfully"

    if command == "RTL":
        simulator_state["missionStarted"] = False
        simulator_state["flightMode"] = "RETURN_TO_HOME"
        simulator_state["speed"] = 10
        simulator_state["altitude"] = max(30, simulator_state["altitude"])
        return "Return-to-home triggered"

    if command == "LAND":
        simulator_state["missionStarted"] = False
        simulator_state["flightMode"] = "LANDING"
        simulator_state["speed"] = 4
        simulator_state["altitude"] = max(0, simulator_state["altitude"] - 20)
        return "Landing command accepted"

    return "Unknown command"