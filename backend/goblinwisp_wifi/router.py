from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from .runtime import goblinwisp_wifi_runtime

router = APIRouter(prefix="/api/goblinwisp", tags=["GoblinWisp Wi-Fi"])


class TransportSelectRequest(BaseModel):
    transport: str


class EnrollRequest(BaseModel):
    aircraft_public_key_hex: str = Field(min_length=130, max_length=130)


class SendRequest(BaseModel):
    payload: dict[str, Any]


def _require_loopback(request: Request) -> None:
    host = request.client.host if request.client else ""
    if host not in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(status_code=403, detail="local authorization required")


@router.get("/transports/catalog")
async def transport_catalog() -> dict[str, Any]:
    return {"transports": goblinwisp_wifi_runtime.catalog()}


@router.get("/status")
async def status() -> dict[str, Any]:
    return goblinwisp_wifi_runtime.status()


@router.get("/security/identity")
async def identity() -> dict[str, Any]:
    sec = goblinwisp_wifi_runtime.security
    return {
        "node_id": "GW-MISSIONNEXUS-001",
        "public_key_hex": sec.local_public_key.hex().upper(),
        "fingerprint": sec.local_fingerprint_text,
    }


@router.post("/transports/select")
async def select_transport(body: TransportSelectRequest) -> dict[str, Any]:
    try:
        await goblinwisp_wifi_runtime.select_transport(body.transport)
        return goblinwisp_wifi_runtime.status()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/transports/connect")
async def connect() -> dict[str, Any]:
    try:
        await goblinwisp_wifi_runtime.start()
        return goblinwisp_wifi_runtime.status()
    except OSError as exc:
        raise HTTPException(status_code=409, detail=f"UDP bind failed: {exc}") from exc


@router.post("/transports/disconnect")
async def disconnect() -> dict[str, Any]:
    await goblinwisp_wifi_runtime.stop()
    return goblinwisp_wifi_runtime.status()


@router.post("/transports/scan")
async def scan() -> dict[str, Any]:
    try:
        await goblinwisp_wifi_runtime.scan()
        return {"ok": True, "status": goblinwisp_wifi_runtime.status()}
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/security/enroll")
async def enroll(body: EnrollRequest, request: Request) -> dict[str, Any]:
    _require_loopback(request)
    try:
        return await goblinwisp_wifi_runtime.enroll_aircraft(body.aircraft_public_key_hex)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/security/trust/reset")
async def trust_reset(request: Request) -> dict[str, Any]:
    _require_loopback(request)
    try:
        return await goblinwisp_wifi_runtime.reset_trust()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/security/session/start")
async def session_start() -> dict[str, Any]:
    try:
        await goblinwisp_wifi_runtime.start_secure_session()
        return goblinwisp_wifi_runtime.status()
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/security/rekey/start")
async def start_live_authenticated_rekey():
    # Start the real live GWRK authenticated in-session rekey.
    await goblinwisp_wifi_runtime.start_rekey()
    return {
        "ok": True,
        "status": goblinwisp_wifi_runtime.status(),
    }


@router.post("/application/send")
async def application_send(body: SendRequest) -> dict[str, Any]:
    try:
        counter = await goblinwisp_wifi_runtime.send_application(body.payload)
        return {"ok": True, "counter": counter}
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.websocket("/live")
async def live(websocket: WebSocket) -> None:
    await websocket.accept()
    queue = goblinwisp_wifi_runtime.subscribe()
    try:
        await websocket.send_json({"kind": "snapshot", "payload": goblinwisp_wifi_runtime.status()})
        while True:
            event = await queue.get()
            await websocket.send_json(event.to_dict())
    except WebSocketDisconnect:
        pass
    finally:
        goblinwisp_wifi_runtime.unsubscribe(queue)
