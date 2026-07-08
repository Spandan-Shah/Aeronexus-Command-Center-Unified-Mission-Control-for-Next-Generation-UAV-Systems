export type LogSeverity = "nominal" | "info" | "caution" | "critical";

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string;
  source: string;
  severity: LogSeverity;
};

export type AlertLog = {
  id: string;
  time: string;
  code: string;
  message: string;
  severity: LogSeverity;
  resolved: boolean;
};

export type PilotAction = {
  id: string;
  time: string;
  operator: string;
  action: string;
  result: string;
};

export const debriefSummary = {
  missionId: "MIS-001",
  missionName: "SURVEY-ALPHA",
  droneId: "UAV-01",
  status: "Completed with Warnings",
  duration: "18 min 42 sec",
  distance: "4.8 km",
  maxAltitude: 142,
  batteryUsed: 28,
  waypointsCompleted: 7,
  totalWaypoints: 7,
  alerts: 3,
};

export const timelineEvents: TimelineEvent[] = [
  {
    id: "t1",
    time: "14:08:00",
    title: "Mission Armed",
    description: "Drone armed successfully after pre-flight approval.",
    source: "Flight Controller",
    severity: "nominal",
  },
  {
    id: "t2",
    time: "14:08:31",
    title: "Takeoff",
    description: "Drone reached safe takeoff altitude.",
    source: "Autopilot",
    severity: "nominal",
  },
  {
    id: "t3",
    time: "14:11:12",
    title: "Waypoint 03 Reached",
    description: "Mission route continued normally.",
    source: "Mission Planner",
    severity: "info",
  },
  {
    id: "t4",
    time: "14:14:44",
    title: "Compass Warning",
    description: "Minor magnetic deviation detected.",
    source: "Navigation System",
    severity: "caution",
  },
  {
    id: "t5",
    time: "14:18:20",
    title: "AI Detection Event",
    description: "Person detected in sector NW-7 with 92% confidence.",
    source: "Camera AI",
    severity: "caution",
  },
  {
    id: "t6",
    time: "14:22:41",
    title: "Geofence Boundary Warning",
    description: "Drone approached configured geofence boundary.",
    source: "Safety Engine",
    severity: "critical",
  },
  {
    id: "t7",
    time: "14:26:42",
    title: "Return To Home",
    description: "Drone returned to home point successfully.",
    source: "Autopilot",
    severity: "nominal",
  },
];

export const alertLogs: AlertLog[] = [
  {
    id: "a1",
    time: "14:22:41",
    code: "GEOFENCE",
    message: "Drone came close to restricted boundary.",
    severity: "critical",
    resolved: true,
  },
  {
    id: "a2",
    time: "14:18:20",
    code: "AI-DETECTION",
    message: "Person detected inside survey sector.",
    severity: "caution",
    resolved: true,
  },
  {
    id: "a3",
    time: "14:14:44",
    code: "COMPASS",
    message: "Minor compass deviation observed.",
    severity: "caution",
    resolved: false,
  },
  {
    id: "a4",
    time: "14:10:08",
    code: "LINK",
    message: "Telemetry link dropped briefly to 86%.",
    severity: "info",
    resolved: true,
  },
];

export const pilotActions: PilotAction[] = [
  {
    id: "p1",
    time: "14:07:52",
    operator: "Ground Station",
    action: "Approved pre-flight checklist",
    result: "Accepted",
  },
  {
    id: "p2",
    time: "14:08:00",
    operator: "Ground Station",
    action: "Armed drone",
    result: "Success",
  },
  {
    id: "p3",
    time: "14:18:33",
    operator: "Ground Station",
    action: "Tagged AI detection event",
    result: "Saved",
  },
  {
    id: "p4",
    time: "14:22:48",
    operator: "Ground Station",
    action: "Acknowledged geofence warning",
    result: "Resolved",
  },
  {
    id: "p5",
    time: "14:26:42",
    operator: "Ground Station",
    action: "Confirmed mission completion",
    result: "Logged",
  },
];

export const missionPerformance = [
  { time: "00:00", battery: 100, altitude: 0, speed: 0 },
  { time: "03:00", battery: 92, altitude: 82, speed: 12 },
  { time: "06:00", battery: 84, altitude: 118, speed: 17 },
  { time: "09:00", battery: 77, altitude: 142, speed: 18 },
  { time: "12:00", battery: 71, altitude: 135, speed: 16 },
  { time: "15:00", battery: 66, altitude: 90, speed: 14 },
  { time: "18:42", battery: 72, altitude: 0, speed: 0 },
];