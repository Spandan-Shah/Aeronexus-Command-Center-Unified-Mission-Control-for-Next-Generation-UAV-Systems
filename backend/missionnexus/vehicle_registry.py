from __future__ import annotations

import asyncio

from copy import deepcopy
from typing import Final

from .vehicle_models import VehicleState


class VehicleRegistry:
    """
    Canonical MissionNexus vehicle-state registry.

    Every vehicle source should normalize its data into VehicleState:

        Browser Simulator
        ArduPilot SITL
        MAVLink hardware
        Future companion computer

    Frontend consumers should never need source-specific telemetry formats.
    """

    def __init__(self) -> None:
        self._vehicles: dict[str, VehicleState] = {}

        self._lock = asyncio.Lock()

        self._subscribers: set[
            asyncio.Queue[dict]
        ] = set()

    async def upsert(
        self,
        vehicle: VehicleState,
    ) -> None:
        vehicle.touch()

        async with self._lock:
            self._vehicles[
                vehicle.vehicle_id
            ] = deepcopy(
                vehicle
            )

            snapshot = (
                self._snapshot_unlocked()
            )

            subscribers = list(
                self._subscribers
            )

        self._broadcast(
            subscribers,
            snapshot,
        )

    async def remove(
        self,
        vehicle_id: str,
    ) -> bool:
        async with self._lock:
            existed = (
                vehicle_id
                in self._vehicles
            )

            if existed:
                del self._vehicles[
                    vehicle_id
                ]

            snapshot = (
                self._snapshot_unlocked()
            )

            subscribers = list(
                self._subscribers
            )

        if existed:
            self._broadcast(
                subscribers,
                snapshot,
            )

        return existed

    async def get(
        self,
        vehicle_id: str,
    ) -> VehicleState | None:
        async with self._lock:
            vehicle = (
                self._vehicles.get(
                    vehicle_id
                )
            )

            if vehicle is None:
                return None

            return deepcopy(
                vehicle
            )

    async def list(
        self,
    ) -> list[VehicleState]:
        async with self._lock:
            return [
                deepcopy(vehicle)
                for vehicle
                in self._vehicles.values()
            ]

    async def snapshot(
        self,
    ) -> dict:
        async with self._lock:
            return (
                self._snapshot_unlocked()
            )

    def subscribe(
        self,
    ) -> asyncio.Queue[dict]:
        queue: asyncio.Queue[dict] = (
            asyncio.Queue(
                maxsize=2
            )
        )

        self._subscribers.add(
            queue
        )

        return queue

    def unsubscribe(
        self,
        queue: asyncio.Queue[dict],
    ) -> None:
        self._subscribers.discard(
            queue
        )

    def _snapshot_unlocked(
        self,
    ) -> dict:
        vehicles = [
            vehicle.to_dict()
            for vehicle
            in self._vehicles.values()
        ]

        return {
            "type":
                "vehicle_snapshot",

            "vehicle_count":
                len(vehicles),

            "vehicles":
                vehicles,
        }

    @staticmethod
    def _broadcast(
        subscribers: list[
            asyncio.Queue[dict]
        ],

        snapshot: dict,
    ) -> None:
        for queue in subscribers:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass

            try:
                queue.put_nowait(
                    snapshot
                )
            except asyncio.QueueFull:
                pass


vehicle_registry: Final[
    VehicleRegistry
] = VehicleRegistry()