from __future__ import annotations

from html import escape
from statistics import mean
from typing import Any

from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter(prefix="/api/logs-debrief", tags=["logs-debrief"])


MISSION_SAMPLES: list[dict[str, Any]] = [
    {
        "time": "14:18",
        "altitude": 88,
        "speed": 8.4,
        "battery": 81,
        "link": 97,
        "risk": 8,
        "event": "Launch confirmed",
    },
    {
        "time": "14:20",
        "altitude": 112,
        "speed": 12.8,
        "battery": 79,
        "link": 96,
        "risk": 12,
        "event": "Waypoint 01 reached",
    },
    {
        "time": "14:22",
        "altitude": 136,
        "speed": 16.2,
        "battery": 76,
        "link": 92,
        "risk": 38,
        "event": "Link quality warning",
    },
    {
        "time": "14:24",
        "altitude": 142,
        "speed": 18.4,
        "battery": 72,
        "link": 88,
        "risk": 44,
        "event": "Geofence proximity alert",
    },
    {
        "time": "14:26",
        "altitude": 130,
        "speed": 15.6,
        "battery": 69,
        "link": 91,
        "risk": 26,
        "event": "Route correction",
    },
    {
        "time": "14:28",
        "altitude": 118,
        "speed": 11.3,
        "battery": 66,
        "link": 94,
        "risk": 15,
        "event": "Return path stable",
    },
    {
        "time": "14:30",
        "altitude": 96,
        "speed": 7.9,
        "battery": 64,
        "link": 95,
        "risk": 10,
        "event": "Landing sequence ready",
    },
]


PILOT_ACTIONS = [
    {
        "time": "14:18:03",
        "actor": "Pilot",
        "action": "ARM",
        "result": "Accepted",
        "signature": "SIG-7FA2",
    },
    {
        "time": "14:18:21",
        "actor": "Pilot",
        "action": "TAKEOFF",
        "result": "Accepted",
        "signature": "SIG-81C0",
    },
    {
        "time": "14:21:08",
        "actor": "System",
        "action": "LINK-WATCH",
        "result": "Warning",
        "signature": "SYS-92DB",
    },
    {
        "time": "14:22:41",
        "actor": "Safety Engine",
        "action": "GEOFENCE-WATCH",
        "result": "Warning",
        "signature": "SAFE-4D9C",
    },
    {
        "time": "14:24:19",
        "actor": "Mission Planner",
        "action": "WAYPOINT-04",
        "result": "Reached",
        "signature": "NAV-0C19",
    },
    {
        "time": "14:26:10",
        "actor": "Gateway",
        "action": "REKEY",
        "result": "Completed",
        "signature": "GW-2F90",
    },
]


def _normalize(value: float, minimum: float, maximum: float, height: int, top: int) -> float:
    if maximum == minimum:
        return top + height / 2

    return top + (1 - ((value - minimum) / (maximum - minimum))) * height


def _polyline(
    samples: list[dict[str, Any]],
    key: str,
    minimum: float,
    maximum: float,
    width: int,
    height: int,
    left: int,
    top: int,
) -> str:
    plot_width = width - left - 45

    points: list[str] = []

    for index, sample in enumerate(samples):
        x = left + (index / (len(samples) - 1)) * plot_width
        y = _normalize(float(sample[key]), minimum, maximum, height, top)
        points.append(f"{x:.2f},{y:.2f}")

    return " ".join(points)


@router.get("/python-analytics")
def python_analytics() -> dict[str, Any]:
    altitude_values = [sample["altitude"] for sample in MISSION_SAMPLES]
    speed_values = [sample["speed"] for sample in MISSION_SAMPLES]
    battery_values = [sample["battery"] for sample in MISSION_SAMPLES]
    link_values = [sample["link"] for sample in MISSION_SAMPLES]
    risk_values = [sample["risk"] for sample in MISSION_SAMPLES]

    warnings = [
        action
        for action in PILOT_ACTIONS
        if action["result"].lower() in {"warning", "blocked", "review"}
    ]

    return {
        "mission_id": "SURVEY-ALPHA",
        "generated_by": "Python FastAPI analytics engine",
        "samples": MISSION_SAMPLES,
        "pilot_actions": PILOT_ACTIONS,
        "summary": {
            "samples": len(MISSION_SAMPLES),
            "peak_altitude_m": max(altitude_values),
            "average_speed_ms": round(mean(speed_values), 1),
            "battery_drop_percent": battery_values[0] - battery_values[-1],
            "average_link_percent": round(mean(link_values), 1),
            "peak_risk_score": max(risk_values),
            "warning_count": len(warnings),
            "audit_actions": len(PILOT_ACTIONS),
        },
    }


@router.get("/python-graph.svg")
def python_graph_svg() -> Response:
    width = 1180
    height = 440
    left = 72
    top = 54
    plot_height = 255
    bottom = top + plot_height

    altitude_line = _polyline(
        MISSION_SAMPLES,
        "altitude",
        70,
        150,
        width,
        plot_height,
        left,
        top,
    )

    battery_line = _polyline(
        MISSION_SAMPLES,
        "battery",
        55,
        85,
        width,
        plot_height,
        left,
        top,
    )

    risk_line = _polyline(
        MISSION_SAMPLES,
        "risk",
        0,
        55,
        width,
        plot_height,
        left,
        top,
    )

    vertical_grid = []
    labels = []

    for index, sample in enumerate(MISSION_SAMPLES):
        x = left + (index / (len(MISSION_SAMPLES) - 1)) * (width - left - 45)
        vertical_grid.append(
            f'<line x1="{x:.2f}" y1="{top}" x2="{x:.2f}" y2="{bottom}" '
            'stroke="rgba(143,163,184,0.12)" stroke-width="1" />'
        )
        labels.append(
            f'<text x="{x:.2f}" y="{height - 34}" text-anchor="middle" '
            'fill="#8fa3b8" font-size="12" font-family="monospace">'
            f'{escape(sample["time"])}</text>'
        )

    horizontal_grid = []
    for line in range(5):
        y = top + (line / 4) * plot_height
        horizontal_grid.append(
            f'<line x1="{left}" y1="{y:.2f}" x2="{width - 45}" y2="{y:.2f}" '
            'stroke="rgba(143,163,184,0.16)" stroke-width="1" />'
        )

    risk_points = []
    for index, sample in enumerate(MISSION_SAMPLES):
        x = left + (index / (len(MISSION_SAMPLES) - 1)) * (width - left - 45)
        y = _normalize(float(sample["risk"]), 0, 55, plot_height, top)
        risk_points.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4.8" fill="#f6b23c" />'
        )

    event_labels = []
    for index, sample in enumerate(MISSION_SAMPLES):
        if sample["risk"] >= 35:
            x = left + (index / (len(MISSION_SAMPLES) - 1)) * (width - left - 45)
            y = _normalize(float(sample["risk"]), 0, 55, plot_height, top)
            event_labels.append(
                f'<g>'
                f'<rect x="{x - 92:.2f}" y="{y - 42:.2f}" width="184" height="26" rx="6" '
                'fill="rgba(5,6,9,0.92)" stroke="#f6b23c" />'
                f'<text x="{x:.2f}" y="{y - 24:.2f}" text-anchor="middle" '
                'fill="#f6b23c" font-size="10" font-family="monospace" font-weight="700">'
                f'{escape(sample["event"])}</text>'
                f'</g>'
            )

    svg = f"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Python generated mission debrief graph">
  <rect width="{width}" height="{height}" rx="18" fill="#070a10"/>
  <rect x="1" y="1" width="{width - 2}" height="{height - 2}" rx="18" fill="none" stroke="#1d2533"/>

  <text x="{left}" y="30" fill="#e5eef8" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="700">
    Python Mission Debrief Graph
  </text>
  <text x="{left}" y="50" fill="#8fa3b8" font-size="12" font-family="Inter, Arial, sans-serif">
    Altitude, battery and risk trend generated by backend Python analytics.
  </text>

  {"".join(horizontal_grid)}
  {"".join(vertical_grid)}

  <text x="22" y="{top + 5}" fill="#8fa3b8" font-size="11" font-family="monospace">High</text>
  <text x="22" y="{bottom}" fill="#8fa3b8" font-size="11" font-family="monospace">Low</text>

  <polyline points="{altitude_line}" fill="none" stroke="#5aa9ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="{battery_line}" fill="none" stroke="#49e58f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="{risk_line}" fill="none" stroke="#f6b23c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>

  {"".join(risk_points)}
  {"".join(event_labels)}
  {"".join(labels)}

  <g transform="translate({left}, {height - 76})">
    <rect x="0" y="0" width="16" height="4" rx="2" fill="#5aa9ff"/>
    <text x="24" y="6" fill="#8fa3b8" font-size="11" font-family="monospace">Altitude</text>

    <rect x="120" y="0" width="16" height="4" rx="2" fill="#49e58f"/>
    <text x="144" y="6" fill="#8fa3b8" font-size="11" font-family="monospace">Battery</text>

    <rect x="236" y="0" width="16" height="4" rx="2" fill="#f6b23c"/>
    <text x="260" y="6" fill="#8fa3b8" font-size="11" font-family="monospace">Risk</text>
  </g>
</svg>
""".strip()

    return Response(content=svg, media_type="image/svg+xml")