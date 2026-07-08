import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import init_database, insert_command, insert_event, get_events
from simulator import simulator_state, update_simulator, run_command, now_time
from mavlink_adapter import MavlinkAdapter

app = FastAPI(title="AeroNexus Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mavlink = MavlinkAdapter()


class CommandRequest(BaseModel):
    command: str


@app.on_event("startup")
def startup():
    init_database()
    insert_event(now_time(), "SYSTEM", "AeroNexus backend started")


@app.get("/")
def root():
    return {
        "name": "AeroNexus Backend",
        "status": "running",
        "mode": "simulator",
    }


@app.get("/api/state")
def get_state():
    return simulator_state


@app.get("/api/events")
def events():
    return get_events()


@app.post("/api/command")
def command(request: CommandRequest):
    result = run_command(request.command)
    time = now_time()

    insert_command(time, request.command, result)
    insert_event(time, "COMMAND", f"{request.command}: {result}")

    return {
        "command": request.command,
        "result": result,
        "state": simulator_state,
    }


@app.get("/api/mavlink/status")
def mavlink_status():
    return mavlink.connect()


@app.websocket("/ws/telemetry")
async def telemetry_socket(websocket: WebSocket):
    await websocket.accept()

    while True:
        state = update_simulator()
        await websocket.send_json(state)
        await asyncio.sleep(1)