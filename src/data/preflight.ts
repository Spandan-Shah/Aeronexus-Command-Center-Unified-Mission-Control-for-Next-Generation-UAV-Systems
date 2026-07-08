export type CheckStatus = "passed" | "warning" | "failed";

export type CheckCategory =
  | "Power"
  | "Airframe"
  | "Navigation"
  | "Mission"
  | "Communication"
  | "Payload"
  | "Safety";

export type PreflightItem = {
  id: string;
  title: string;
  category: CheckCategory;
  status: CheckStatus;
  value: string;
  requirement: string;
  detail: string;
  required: boolean;
};

export const preflightSummary = {
  droneId: "UAV-01",
  mission: "SURVEY-ALPHA",
  readinessScore: 88,
  gateStatus: "Ready with Caution",
  operator: "Ground Station",
  lastUpdated: "14:26:18",
};

export const preflightItems: PreflightItem[] = [
  {
    id: "pf-01",
    title: "Battery Level",
    category: "Power",
    status: "passed",
    value: "72%",
    requirement: "Minimum 65%",
    detail: "Active battery pack has enough charge for mission.",
    required: true,
  },
  {
    id: "pf-02",
    title: "Voltage Stability",
    category: "Power",
    status: "passed",
    value: "15.8V",
    requirement: "Above 14.8V",
    detail: "Voltage is inside safe operating range.",
    required: true,
  },
  {
    id: "pf-03",
    title: "Propeller Inspection",
    category: "Airframe",
    status: "passed",
    value: "Clear",
    requirement: "No damage",
    detail: "No visible propeller damage detected.",
    required: true,
  },
  {
    id: "pf-04",
    title: "GPS Lock",
    category: "Navigation",
    status: "passed",
    value: "14 satellites",
    requirement: "Minimum 10 satellites",
    detail: "GPS lock is stable for autonomous navigation.",
    required: true,
  },
  {
    id: "pf-05",
    title: "Compass Calibration",
    category: "Navigation",
    status: "warning",
    value: "Minor deviation",
    requirement: "Low magnetic error",
    detail: "Compass is usable, but calibration is recommended.",
    required: true,
  },
  {
    id: "pf-06",
    title: "Telemetry Link",
    category: "Communication",
    status: "passed",
    value: "92%",
    requirement: "Minimum 75%",
    detail: "Command and telemetry link is stable.",
    required: true,
  },
  {
    id: "pf-07",
    title: "Mission Upload",
    category: "Mission",
    status: "passed",
    value: "7 waypoints",
    requirement: "Valid mission",
    detail: "Mission route is uploaded and validated.",
    required: true,
  },
  {
    id: "pf-08",
    title: "Geofence",
    category: "Safety",
    status: "passed",
    value: "Enabled",
    requirement: "Enabled",
    detail: "Mission boundary safety is active.",
    required: true,
  },
  {
    id: "pf-09",
    title: "Home Point",
    category: "Safety",
    status: "passed",
    value: "Set",
    requirement: "Valid home point",
    detail: "Return-to-home location is configured.",
    required: true,
  },
  {
    id: "pf-10",
    title: "Camera Feed",
    category: "Payload",
    status: "warning",
    value: "AI active",
    requirement: "Video + AI ready",
    detail: "Video is working, AI review mode is still warming up.",
    required: false,
  },
];