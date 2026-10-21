from __future__ import annotations

import asyncio

from collections import deque
from copy import deepcopy
from typing import Final

from .data_models import AeronexusEvent


# ============================================================
# Aeronexus Event Bus
# ============================================================


class AeronexusEventBus:
    """
    Shared in-memory event fabric for the Aeronexus platform.

    Current responsibilities:

        publish normalized events
        maintain recent history
        broadcast events to subscribers
        provide platform-wide snapshots

    Later this interface can be backed by persistent storage
    without requiring dashboard consumers to change.
    """

    def __init__(
        self,
        history_limit: int = 2000,
    ) -> None:
        self._history: deque[AeronexusEvent] = deque(
            maxlen=max(
                100,
                history_limit,
            )
        )

        self._subscribers: set[
            asyncio.Queue[dict]
        ] = set()

        self._lock = asyncio.Lock()


    # ========================================================
    # Publish
    # ========================================================

    async def publish(
        self,
        event: AeronexusEvent,
    ) -> AeronexusEvent:
        stored_event = deepcopy(
            event
        )

        async with self._lock:
            self._history.append(
                stored_event
            )

            subscribers = list(
                self._subscribers
            )

        message = {
            "type": "aeronexus_event",
            "event": stored_event.to_dict(),
        }

        self._broadcast(
            subscribers,
            message,
        )

        return deepcopy(
            stored_event
        )


    # ========================================================
    # History
    # ========================================================

    async def history(
        self,
        limit: int = 100,
        source_system: str | None = None,
        data_type: str | None = None,
        vehicle_id: str | None = None,
        mission_id: str | None = None,
    ) -> list[AeronexusEvent]:
        requested_limit = max(
            1,
            min(
                limit,
                1000,
            ),
        )

        async with self._lock:
            events = list(
                self._history
            )

        filtered: list[AeronexusEvent] = []

        for event in reversed(
            events
        ):
            if (
                source_system is not None
                and event.source_system != source_system
            ):
                continue

            if (
                data_type is not None
                and event.data_type != data_type
            ):
                continue

            if (
                vehicle_id is not None
                and event.vehicle_id != vehicle_id
            ):
                continue

            if (
                mission_id is not None
                and event.mission_id != mission_id
            ):
                continue

            filtered.append(
                deepcopy(
                    event
                )
            )

            if len(
                filtered
            ) >= requested_limit:
                break

        return filtered


    # ========================================================
    # Snapshot
    # ========================================================

    async def snapshot(
        self,
        limit: int = 100,
    ) -> dict:
        events = await self.history(
            limit=limit
        )

        return {
            "type": "aeronexus_event_snapshot",

            "event_count": len(
                events
            ),

            "events": [
                event.to_dict()
                for event in events
            ],
        }


    # ========================================================
    # Subscriber Management
    # ========================================================

    def subscribe(
        self,
    ) -> asyncio.Queue[dict]:
        queue: asyncio.Queue[dict] = asyncio.Queue(
            maxsize=100
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


    # ========================================================
    # Broadcast
    # ========================================================

    @staticmethod
    def _broadcast(
        subscribers: list[
            asyncio.Queue[dict]
        ],
        message: dict,
    ) -> None:
        for queue in subscribers:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass

            try:
                queue.put_nowait(
                    deepcopy(
                        message
                    )
                )
            except asyncio.QueueFull:
                pass


# ============================================================
# Shared Singleton
# ============================================================


aeronexus_event_bus: Final[AeronexusEventBus] = (
    AeronexusEventBus()
)