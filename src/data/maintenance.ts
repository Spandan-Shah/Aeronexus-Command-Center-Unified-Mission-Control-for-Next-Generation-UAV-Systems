export type MaintenanceState = "nominal" | "caution" | "critical";

export type MaintenanceStatus =
  | "scheduled"
  | "due_soon"
  | "overdue"
  | "completed";

export type ServicePriority = "low" | "medium" | "high" | "urgent";

export type MaintenanceTask = {
  id: string;
  droneId: string;
  title: string;
  category: string;
  dueIn: string;
  lastService: string;
  status: MaintenanceStatus;
  priority: ServicePriority;
  detail: string;
};

export type ServiceTicket = {
  id: string;
  droneId: string;
  issue: string;
  priority: ServicePriority;
  status: string;
  opened: string;
  owner: string;
};

export type PartWear = {
  id: string;
  droneId: string;
  part: string;
  health: number;
  cycles: number;
  state: MaintenanceState;
  recommendation: string;
};

export const maintenanceOverview = {
  fleetReadiness: 83,
  openTickets: 4,
  dueSoon: 3,
  overdue: 1,
  nextService: "UAV-03 · Motor inspection",
  totalFlightHours: 94.4,
};

export const maintenanceTasks: MaintenanceTask[] = [
  {
    id: "mt-01",
    droneId: "UAV-01",
    title: "Propeller inspection",
    category: "Airframe",
    dueIn: "After 2 flights",
    lastService: "2 days ago",
    status: "due_soon",
    priority: "medium",
    detail: "Check propeller surface, screw tightness, and balance.",
  },
  {
    id: "mt-02",
    droneId: "UAV-03",
    title: "Motor inspection",
    category: "Motor",
    dueIn: "Today",
    lastService: "8 days ago",
    status: "overdue",
    priority: "high",
    detail: "Motor M3 vibration is higher than normal range.",
  },
  {
    id: "mt-03",
    droneId: "UAV-04",
    title: "Battery connector check",
    category: "Power",
    dueIn: "Tomorrow",
    lastService: "5 days ago",
    status: "due_soon",
    priority: "medium",
    detail: "Inspect battery connector pins and cable strain relief.",
  },
  {
    id: "mt-04",
    droneId: "UAV-02",
    title: "Firmware verification",
    category: "Software",
    dueIn: "In 4 days",
    lastService: "Yesterday",
    status: "scheduled",
    priority: "low",
    detail: "Verify PX4 firmware version and parameter backup.",
  },
  {
    id: "mt-05",
    droneId: "UAV-05",
    title: "Frame arm replacement",
    category: "Airframe",
    dueIn: "Service bay",
    lastService: "12 days ago",
    status: "scheduled",
    priority: "urgent",
    detail: "Replace damaged front-left frame arm before next flight.",
  },
];

export const serviceTickets: ServiceTicket[] = [
  {
    id: "SRV-1001",
    droneId: "UAV-03",
    issue: "Motor M3 vibration above normal level",
    priority: "high",
    status: "Open",
    opened: "Today",
    owner: "Maintenance Team",
  },
  {
    id: "SRV-1002",
    droneId: "UAV-05",
    issue: "Frame arm crack detected",
    priority: "urgent",
    status: "In Progress",
    opened: "Yesterday",
    owner: "Workshop",
  },
  {
    id: "SRV-1003",
    droneId: "UAV-04",
    issue: "Battery pack connector needs inspection",
    priority: "medium",
    status: "Open",
    opened: "Today",
    owner: "Power Team",
  },
  {
    id: "SRV-1004",
    droneId: "UAV-01",
    issue: "Compass calibration recommended",
    priority: "low",
    status: "Queued",
    opened: "2 days ago",
    owner: "Ground Station",
  },
];

export const partWear: PartWear[] = [
  {
    id: "pw-01",
    droneId: "UAV-01",
    part: "Propeller Set",
    health: 82,
    cycles: 31,
    state: "nominal",
    recommendation: "Inspect after 2 more flights.",
  },
  {
    id: "pw-02",
    droneId: "UAV-03",
    part: "Motor M3",
    health: 61,
    cycles: 48,
    state: "caution",
    recommendation: "Check bearing and vibration.",
  },
  {
    id: "pw-03",
    droneId: "UAV-04",
    part: "Battery Connector",
    health: 68,
    cycles: 64,
    state: "caution",
    recommendation: "Clean connector and inspect pins.",
  },
  {
    id: "pw-04",
    droneId: "UAV-05",
    part: "Frame Arm",
    health: 29,
    cycles: 73,
    state: "critical",
    recommendation: "Replace before flight.",
  },
];