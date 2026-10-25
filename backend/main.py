import asyncio

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
)

from goblinwisp_wifi.router import router as goblinwisp_wifi_router


from fastapi.middleware.cors import (
    CORSMiddleware,
)

from pydantic import (
    BaseModel,
)

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

from missionnexus.vehicle_router import (
    router as missionnexus_vehicle_router,
    websocket_router as missionnexus_vehicle_websocket_router,
)

from missionnexus.devices.device_manager import (
    device_manager,
)

from missionnexus.devices.device_router import (
    router as missionnexus_device_router,
    websocket_router as missionnexus_device_websocket_router,
)

from aeronexus_core.event_router import (
    router as aeronexus_event_router,
    websocket_router as aeronexus_event_websocket_router,
)

from aeronexus_core.vehicle_bridge import (
    vehicle_data_fabric_bridge,
)

from goblinwisp.manager import (
    goblinwisp_manager,
)

from goblinwisp.router import (
    router as goblinwisp_router,
    websocket_router as goblinwisp_websocket_router,
)

from goblinwisp.transport_manager import (
    goblinwisp_transport_manager,
)

from goblinwisp.transport_router import (
    router as goblinwisp_transport_router,
    websocket_router as goblinwisp_transport_websocket_router,
)


# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="AeroNexus Backend",
    version="3.6.0",
)

app.include_router(goblinwisp_wifi_router)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],
    allow_credentials=True,
    allow_methods=[
        "*"
    ],
    allow_headers=[
        "*"
    ],
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
# MissionNexus Vehicle Core
# ============================================================

app.include_router(
    missionnexus_vehicle_router
)

app.include_router(
    missionnexus_vehicle_websocket_router
)


# ============================================================
# MissionNexus Hardware Integration
# ============================================================

app.include_router(
    missionnexus_device_router
)

app.include_router(
    missionnexus_device_websocket_router
)


# ============================================================
# Aeronexus Data Fabric
# ============================================================

app.include_router(
    aeronexus_event_router
)

app.include_router(
    aeronexus_event_websocket_router
)


# ============================================================
# GoblinWisp Secure Session API
# ============================================================

app.include_router(
    goblinwisp_router
)

app.include_router(
    goblinwisp_websocket_router
)


# ============================================================
# GoblinWisp Physical Transport API
# ============================================================

app.include_router(
    goblinwisp_transport_router
)

app.include_router(
    goblinwisp_transport_websocket_router
)


# ============================================================
# Existing MAVLink Adapter
# ============================================================

mavlink = (
    MavlinkAdapter()
)


# ============================================================
# Request Models
# ============================================================


class CommandRequest(
    BaseModel
):
    command: str


# ============================================================
# Existing AeroNexus Startup
# ============================================================


@app.on_event(
    "startup"
)
def startup():
    """
    Start existing AeroNexus database and legacy services.
    """

    init_database()

    init_alert_database()

    seed_demo_alert_contacts()

    insert_event(
        now_time(),
        "SYSTEM",
        "AeroNexus backend started",
    )


# ============================================================
# Integrated Platform Startup
# ============================================================


@app.on_event(
    "startup"
)
async def startup_integrated_platform():
    """
    Start the Aeronexus integrated runtime.

    Startup order:

        1. MissionNexus Device Manager
        2. Aeronexus Vehicle Data Fabric Bridge
        3. GoblinWisp Secure Session Manager
        4. GoblinWisp Transport Manager

    Current development architecture:

        MissionNexus Windows Host
                │
                │ USB Serial
                ▼
        Ground ESP32-S3
                │
                │ ESP-NOW
                ▼
        Aircraft ESP32-S3
                │
                ▼
             MN-001

    Important:

    Starting these managers does NOT automatically claim:

        physical ESP32 hardware is connected
        ESP-NOW peer link is active
        trusted pairing exists
        cryptographic authentication succeeded
        GoblinWisp secure session is active

    Those states are updated independently as the physical
    system becomes available.
    """

    # --------------------------------------------------------
    # MissionNexus Hardware Layer
    # --------------------------------------------------------

    await (
        device_manager.startup()
    )

    # --------------------------------------------------------
    # Aeronexus Vehicle -> Data Fabric Bridge
    # --------------------------------------------------------

    await (
        vehicle_data_fabric_bridge.start()
    )

    # --------------------------------------------------------
    # GoblinWisp Secure Session Runtime
    # --------------------------------------------------------

    await (
        goblinwisp_manager.startup()
    )

    # --------------------------------------------------------
    # GoblinWisp Physical Transport Runtime
    # --------------------------------------------------------

    await (
        goblinwisp_transport_manager.startup()
    )

    # --------------------------------------------------------
    # Existing Local Database Events
    # --------------------------------------------------------

    insert_event(
        now_time(),
        "MISSIONNEXUS",
        (
            "MissionNexus Hardware Integration started "
            "with MN-001-SIM"
        ),
    )

    insert_event(
        now_time(),
        "AERONEXUS_CORE",
        (
            "Aeronexus vehicle telemetry bridge started"
        ),
    )

    insert_event(
        now_time(),
        "GOBLINWISP",
        (
            "GoblinWisp runtime manager started with "
            "ESP32-S3 / ESP-NOW development profile"
        ),
    )

    insert_event(
        now_time(),
        "GOBLINWISP_TRANSPORT",
        (
            "GoblinWisp physical transport manager started"
        ),
    )


# ============================================================
# Integrated Platform Shutdown
# ============================================================


@app.on_event(
    "shutdown"
)
async def shutdown_integrated_platform():
    """
    Shut down services in reverse operational dependency
    order.

    Transport Manager is stopped BEFORE GoblinWisp Manager.

    This allows physical link disconnection to propagate into
    GoblinWisp session state while GoblinWisp Manager is still
    available.

    Then:

        GoblinWisp Manager
        Vehicle Data Fabric Bridge
        MissionNexus Device Manager
    """

    # --------------------------------------------------------
    # GoblinWisp Physical Transport
    # --------------------------------------------------------

    await (
        goblinwisp_transport_manager.shutdown()
    )

    # --------------------------------------------------------
    # GoblinWisp Secure Session Runtime
    # --------------------------------------------------------

    await (
        goblinwisp_manager.shutdown()
    )

    # --------------------------------------------------------
    # Aeronexus Vehicle Data Fabric Bridge
    # --------------------------------------------------------

    await (
        vehicle_data_fabric_bridge.stop()
    )

    # --------------------------------------------------------
    # MissionNexus Hardware
    # --------------------------------------------------------

    await (
        device_manager.shutdown()
    )


# ============================================================
# Root
# ============================================================


@app.get(
    "/"
)
def root():
    return {
        "name":
            "AeroNexus Backend",

        "status":
            "running",

        "mode":
            "integrated-platform",

        "version":
            "3.6.0",

        "platform": {
            "missionnexus":
                "enabled",

            "goblinwisp":
                "enabled",

            "geofusion":
                "planned-integration",

            "aeronexus_data_fabric":
                "enabled",
        },

        "services": {
            "camera_ai":
                "enabled",

            "camera_video_annotator":
                "enabled",

            "logs_python_analytics":
                "enabled",

            "telemetry":
                "enabled",

            "alerts":
                "enabled",

            "legacy_mavlink":
                "simulated",

            "missionnexus_vehicle_core":
                "enabled",

            "missionnexus_hardware_integration":
                "enabled",

            "aeronexus_data_fabric":
                "enabled",

            "aeronexus_vehicle_bridge":
                "enabled",

            "goblinwisp_runtime":
                "enabled",

            "goblinwisp_api":
                "enabled",

            "goblinwisp_transport_manager":
                "enabled",

            "goblinwisp_transport_api":
                "enabled",

            "missionnexus_default_device":
                "MN-001-SIM-ADAPTER",

            "missionnexus_vehicle_source":
                "MN-001-SIM",

            "goblinwisp_default_profile":
                "GW-ESP32-ESPNOW-001",

            "goblinwisp_current_transport":
                "ESP-NOW",

            "goblinwisp_current_platform":
                "ESP32-S3",

            "goblinwisp_bridge_architecture":
                (
                    "MissionNexus USB Serial -> "
                    "Ground ESP32-S3 -> ESP-NOW -> "
                    "Aircraft ESP32-S3"
                ),
        },
    }


# ============================================================
# Existing Simulator API
# ============================================================


@app.get(
    "/api/state"
)
def get_state():
    return (
        simulator_state
    )


@app.get(
    "/api/events"
)
def events():
    return (
        get_events()
    )


@app.post(
    "/api/command"
)
def command(
    request:
        CommandRequest,
):
    result = (
        run_command(
            request.command
        )
    )

    event_time = (
        now_time()
    )

    insert_command(
        event_time,
        request.command,
        result,
    )

    insert_event(
        event_time,
        "COMMAND",
        (
            f"{request.command}: "
            f"{result}"
        ),
    )

    return {
        "command":
            request.command,

        "result":
            result,

        "state":
            simulator_state,
    }


# ============================================================
# Legacy MAVLink API
# ============================================================


@app.get(
    "/api/mavlink/status"
)
def mavlink_status():
    return (
        mavlink.connect()
    )


# ============================================================
# ESP32 Telemetry
# ============================================================


@app.post(
    "/api/telemetry/esp32"
)
async def receive_esp32_wifi_telemetry(
    payload:
        dict,
):
    """
    Existing ESP32 Wi-Fi telemetry ingestion endpoint.

    This remains operational for legacy/current telemetry.

    GoblinWisp-secured ESP32-S3 telemetry will later pass
    through the GoblinWisp packet processor and Aeronexus
    Data Fabric.
    """

    telemetry = (
        ingest_telemetry(
            payload,
            "esp32_wifi",
        )
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
        "ok":
            True,

        "message":
            "ESP32 Wi-Fi telemetry received",

        "telemetry":
            telemetry,
    }


# ============================================================
# Camera ML Telemetry
# ============================================================


@app.post(
    "/api/telemetry/ml"
)
async def receive_camera_ml_telemetry(
    payload:
        dict,
):
    telemetry = (
        ingest_telemetry(
            payload,
            "camera_ml",
        )
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
        "ok":
            True,

        "message":
            "Camera ML telemetry received",

        "telemetry":
            telemetry,
    }


# ============================================================
# Unified Telemetry Hub
# ============================================================


@app.get(
    "/api/telemetry/current"
)
async def current_unified_telemetry():
    return (
        get_latest_telemetry()
    )


@app.get(
    "/api/telemetry/sources"
)
async def telemetry_sources():
    return {
        "sources":
            get_source_statuses(),
    }


# ============================================================
# Alert Contacts
# ============================================================


@app.get(
    "/api/alerts/contacts"
)
def alert_contacts():
    return {
        "contacts":
            get_alert_contacts(),
    }


@app.post(
    "/api/alerts/contacts"
)
def add_alert_contact(
    payload:
        dict,
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
            "ok":
                True,

            "contact":
                contact,
        }

    except ValueError as error:
        return {
            "ok":
                False,

            "error":
                str(
                    error
                ),
        }


# ============================================================
# Alerts
# ============================================================


@app.get(
    "/api/alerts"
)
def emergency_alerts():
    return {
        "alerts":
            get_alerts(),
    }


@app.post(
    "/api/alerts/send"
)
def send_emergency_alert(
    payload:
        dict,
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
            "ok":
                True,

            "result":
                result,
        }

    except ValueError as error:
        return {
            "ok":
                False,

            "error":
                str(
                    error
                ),
        }


@app.get(
    "/api/alerts/{alert_id}/deliveries"
)
def emergency_alert_deliveries(
    alert_id:
        int,
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
    websocket:
        WebSocket,
):
    await (
        websocket.accept()
    )

    try:
        while True:
            state = (
                update_simulator()
            )

            await (
                websocket.send_json(
                    state
                )
            )

            await asyncio.sleep(
                1
            )

    except WebSocketDisconnect:
        insert_event(
            now_time(),
            "WEBSOCKET",
            (
                "Telemetry websocket disconnected"
            ),
        )