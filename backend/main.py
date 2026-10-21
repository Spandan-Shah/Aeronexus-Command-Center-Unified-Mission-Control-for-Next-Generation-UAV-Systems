import asyncio

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from pydantic import BaseModel

from alert_system import (
    create_alert_contact,
    create_and_send_alert,
    get_alert_contacts,
    get_alert_deliveries,
    get_alerts,
    init_alert_database,
    seed_demo_alert_contacts,
)

from camera_cv_analytics import (
    router as camera_ai_router,
)

from camera_video_annotator import (
    router as camera_video_annotator_router,
)

from database import (
    get_events,
    init_database,
    insert_command,
    insert_event,
)

from logs_python_analytics import (
    router as logs_python_analytics_router,
)

from mavlink_adapter import (
    MavlinkAdapter,
)

from simulator import (
    now_time,
    run_command,
    simulator_state,
    update_simulator,
)

from telemetry_hub import (
    get_latest_telemetry,
    get_source_statuses,
    ingest_telemetry,
)

from missionnexus.sim_vehicle_source import (
    sim_vehicle_source,
)

from missionnexus.vehicle_router import (
    router as missionnexus_vehicle_router,
    websocket_router as missionnexus_vehicle_websocket_router,
)


# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="AeroNexus Backend",
    version="3.1.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Existing Routers
# ============================================================

app.include_router(
    camera_ai_router
)

app.include_router(
    camera_video_annotator_router
)

app.include_router(
    logs_python_analytics_router
)


# ============================================================
# MissionNexus Vehicle Core Routers
# ============================================================

app.include_router(
    missionnexus_vehicle_router
)

app.include_router(
    missionnexus_vehicle_websocket_router
)


# ============================================================
# MAVLink Adapter
# ============================================================

mavlink = MavlinkAdapter()


# ============================================================
# Request Models
# ============================================================

class CommandRequest(BaseModel):
    command: str


# ============================================================
# Startup / Shutdown
# ============================================================

@app.on_event("startup")
def startup():
    """
    Existing AeroNexus services.
    """

    init_database()

    init_alert_database()

    seed_demo_alert_contacts()

    insert_event(
        now_time(),
        "SYSTEM",
        "AeroNexus backend started",
    )


@app.on_event("startup")
async def startup_missionnexus_vehicle_core():
    """
    Start MissionNexus Vehicle Core.

    MN-001-SIM is currently a development-only telemetry source.

    Later this source will be replaceable by:
        - ArduPilot SITL
        - MAVLink hardware
        - Real MN-001 vehicle
    """

    await sim_vehicle_source.start()

    insert_event(
        now_time(),
        "MISSIONNEXUS",
        "MissionNexus Vehicle Core started with MN-001-SIM",
    )


@app.on_event("shutdown")
async def shutdown_missionnexus_vehicle_core():
    """
    Cleanly stop MissionNexus development telemetry source.
    """

    await sim_vehicle_source.stop()


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {
        "name": "AeroNexus Backend",
        "status": "running",
        "mode": "simulator",
        "version": "3.1.0",

        "services": {
            "camera_ai": "enabled",
            "camera_video_annotator": "enabled",
            "logs_python_analytics": "enabled",
            "telemetry": "enabled",
            "alerts": "enabled",
            "mavlink": "simulated",

            "missionnexus_vehicle_core": "enabled",
            "missionnexus_vehicle_source": "MN-001-SIM",
        },
    }


# ============================================================
# Existing Simulator API
# ============================================================

@app.get("/api/state")
def get_state():
    return simulator_state


@app.get("/api/events")
def events():
    return get_events()


@app.post("/api/command")
def command(
    request: CommandRequest,
):
    result = run_command(
        request.command
    )

    event_time = now_time()

    insert_command(
        event_time,
        request.command,
        result,
    )

    insert_event(
        event_time,
        "COMMAND",
        f"{request.command}: {result}",
    )

    return {
        "command": request.command,
        "result": result,
        "state": simulator_state,
    }


# ============================================================
# MAVLink
# ============================================================

@app.get("/api/mavlink/status")
def mavlink_status():
    return mavlink.connect()


# ============================================================
# ESP32 Telemetry
# ============================================================

@app.post(
    "/api/telemetry/esp32"
)
async def receive_esp32_wifi_telemetry(
    payload: dict,
):
    telemetry = ingest_telemetry(
        payload,
        "esp32_wifi",
    )

    insert_event(
        now_time(),
        "ESP32_WIFI",
        (
            "Telemetry received from "
            f"{telemetry.get('device', 'Unknown Device')}"
        ),
    )

    return {
        "ok": True,
        "message": "ESP32 Wi-Fi telemetry received",
        "telemetry": telemetry,
    }


# ============================================================
# Camera ML Telemetry
# ============================================================

@app.post(
    "/api/telemetry/ml"
)
async def receive_camera_ml_telemetry(
    payload: dict,
):
    telemetry = ingest_telemetry(
        payload,
        "camera_ml",
    )

    insert_event(
        now_time(),
        "CAMERA_ML",
        (
            "ML telemetry received from "
            f"{telemetry.get('device', 'Camera ML')}"
        ),
    )

    return {
        "ok": True,
        "message": "Camera ML telemetry received",
        "telemetry": telemetry,
    }


# ============================================================
# Unified Telemetry Hub
# ============================================================

@app.get(
    "/api/telemetry/current"
)
async def current_unified_telemetry():
    return get_latest_telemetry()


@app.get(
    "/api/telemetry/sources"
)
async def telemetry_sources():
    return {
        "sources": get_source_statuses(),
    }


# ============================================================
# Alert Contacts
# ============================================================

@app.get(
    "/api/alerts/contacts"
)
def alert_contacts():
    return {
        "contacts": get_alert_contacts(),
    }


@app.post(
    "/api/alerts/contacts"
)
def add_alert_contact(
    payload: dict,
):
    try:
        contact = (
            create_alert_contact(
                payload
            )
        )

        insert_event(
            now_time(),
            "ALERT_CONTACT",
            (
                "Alert contact added: "
                f"{contact.get('name', 'Unknown')}"
            ),
        )

        return {
            "ok": True,
            "contact": contact,
        }

    except ValueError as error:
        return {
            "ok": False,
            "error": str(error),
        }


# ============================================================
# Alerts
# ============================================================

@app.get(
    "/api/alerts"
)
def emergency_alerts():
    return {
        "alerts": get_alerts(),
    }


@app.post(
    "/api/alerts/send"
)
def send_emergency_alert(
    payload: dict,
):
    try:
        result = (
            create_and_send_alert(
                payload
            )
        )

        insert_event(
            now_time(),
            "EMERGENCY_ALERT",
            (
                f"{payload.get('alert_type', 'alert')} "
                "alert sent to "
                f"{result['matched_contacts']} contacts"
            ),
        )

        return {
            "ok": True,
            "result": result,
        }

    except ValueError as error:
        return {
            "ok": False,
            "error": str(error),
        }


@app.get(
    "/api/alerts/{alert_id}/deliveries"
)
def emergency_alert_deliveries(
    alert_id: int,
):
    return {
        "deliveries":
            get_alert_deliveries(
                alert_id
            ),
    }


# ============================================================
# Existing Simulator WebSocket
# ============================================================

@app.websocket(
    "/ws/telemetry"
)
async def telemetry_socket(
    websocket: WebSocket,
):
    await websocket.accept()

    try:
        while True:
            state = (
                update_simulator()
            )

            await websocket.send_json(
                state
            )

            await asyncio.sleep(
                1
            )

    except WebSocketDisconnect:
        insert_event(
            now_time(),
            "WEBSOCKET",
            "Telemetry websocket disconnected",
        )