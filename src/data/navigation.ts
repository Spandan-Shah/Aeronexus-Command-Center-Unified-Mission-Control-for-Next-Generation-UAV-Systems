export type PageId =
  | "live-ops"
  | "mission-planner"
  | "drone-control"
  | "autonomous-intercept"
  | "fleet"
  | "drone-health"
  | "battery"
  | "hardware-integration"
  | "camera-ai"
  | "pre-flight"
  | "logs"
  | "maintenance"
  | "inventory"
  | "security"
  | "settings";

export const pageDetails: Record<
  PageId,
  {
    title: string;
    subtitle: string;
  }
> = {
  "live-ops": {
    title: "Live Ops",
    subtitle:
      "Real-time drone monitoring and command dashboard",
  },

  "mission-planner": {
    title: "Mission Planner",
    subtitle:
      "Waypoint planning, geofence setup, and mission upload",
  },

  "drone-control": {
    title: "Drone Control",
    subtitle:
      "Command console, safety actions, and telemetry control link",
  },

  "autonomous-intercept": {
    title: "Autonomy Lab",
    subtitle:
      "Predictive guidance, trajectory analysis, formation and autonomous mission simulation",
  },

  fleet: {
    title: "Fleet",
    subtitle:
      "Multi-drone status, assignment, and readiness",
  },

  "drone-health": {
    title: "Drone Health",
    subtitle:
      "Motors, sensors, GPS, IMU, compass, and vibration status",
  },

  battery: {
    title: "Battery & Power",
    subtitle:
      "Battery percentage, voltage, current draw, and flight time",
  },

  "hardware-integration": {
    title: "Hardware Integration",
    subtitle:
      "Aircraft pairing, telemetry interfaces, diagnostics, and payload hardware",
  },

  "camera-ai": {
    title: "Vision Intelligence",
    subtitle:
      "Video feed, detection events, and AI model pipeline",
  },

  "pre-flight": {
    title: "Pre-Flight Checklist",
    subtitle:
      "Safety checks before takeoff",
  },

  logs: {
    title: "Mission Debrief",
    subtitle:
      "Flight timeline, alerts, evidence, and report export",
  },

  maintenance: {
    title: "Maintenance",
    subtitle:
      "Service reminders, part condition, and repair tracking",
  },

  inventory: {
    title: "Parts Inventory",
    subtitle:
      "Drone parts, cost, supplier, and installation status",
  },

  security: {
    title: "Security",
    subtitle:
      "Command audit, roles, sessions, and secure logs",
  },

  settings: {
    title: "Settings",
    subtitle:
      "Dashboard, simulator, map, and safety configuration",
  },
};