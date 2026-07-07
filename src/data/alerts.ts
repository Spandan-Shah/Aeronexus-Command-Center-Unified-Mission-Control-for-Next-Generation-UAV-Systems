export const alerts = [
  {
    id: "a1",
    time: "14:22:41",
    severity: "critical",
    code: "GEOFENCE",
    message: "Drone is close to restricted boundary.",
    source: "Safety Engine",
  },
  {
    id: "a2",
    time: "14:21:08",
    severity: "caution",
    code: "LINK",
    message: "Signal strength dropped to 92%.",
    source: "Telemetry Link",
  },
  {
    id: "a3",
    time: "14:19:52",
    severity: "info",
    code: "WAYPOINT",
    message: "Waypoint 04 reached successfully.",
    source: "Mission Planner",
  },
  {
    id: "a4",
    time: "14:18:03",
    severity: "nominal",
    code: "SYSTEM",
    message: "All drone systems are running normally.",
    source: "Health Monitor",
  },
] as const;