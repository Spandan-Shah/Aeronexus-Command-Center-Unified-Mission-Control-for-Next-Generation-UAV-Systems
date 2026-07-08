export type DroneStatus =
  | "IN_MISSION"
  | "READY"
  | "STANDBY"
  | "CHARGING"
  | "MAINTENANCE"
  | "OFFLINE";

export type DroneHealth = "nominal" | "caution" | "critical";

export type Drone = {
  id: string;
  model: string;
  status: DroneStatus;
  health: DroneHealth;
  battery: number;
  linkQuality: number;
  rssi: number;
  firmware: string;
  location: string;
  assignedMission: string;
  lastFlight: string;
  flightHours: number;
};

export const drones: Drone[] = [
  {
    id: "UAV-01",
    model: "AeroNexus-Mini",
    status: "IN_MISSION",
    health: "nominal",
    battery: 72,
    linkQuality: 92,
    rssi: -68,
    firmware: "PX4 v1.15",
    location: "Grid NW-7",
    assignedMission: "SURVEY-ALPHA",
    lastFlight: "Today",
    flightHours: 12.4,
  },
  {
    id: "UAV-02",
    model: "AeroNexus-Mini",
    status: "READY",
    health: "nominal",
    battery: 96,
    linkQuality: 100,
    rssi: -51,
    firmware: "PX4 v1.15",
    location: "Pad A",
    assignedMission: "Standby",
    lastFlight: "Yesterday",
    flightHours: 8.6,
  },
  {
    id: "UAV-03",
    model: "AeroNexus-VTOL",
    status: "STANDBY",
    health: "caution",
    battery: 54,
    linkQuality: 78,
    rssi: -74,
    firmware: "ArduPilot 4.5",
    location: "Pad B",
    assignedMission: "INSPECTION-BETA",
    lastFlight: "2 days ago",
    flightHours: 21.8,
  },
  {
    id: "UAV-04",
    model: "AeroNexus-Scout",
    status: "CHARGING",
    health: "caution",
    battery: 33,
    linkQuality: 0,
    rssi: 0,
    firmware: "PX4 v1.14",
    location: "Charging Bay",
    assignedMission: "None",
    lastFlight: "3 days ago",
    flightHours: 17.2,
  },
  {
    id: "UAV-05",
    model: "AeroNexus-Scout",
    status: "MAINTENANCE",
    health: "critical",
    battery: 0,
    linkQuality: 0,
    rssi: 0,
    firmware: "PX4 v1.14",
    location: "Maintenance Bay",
    assignedMission: "None",
    lastFlight: "5 days ago",
    flightHours: 29.5,
  },
  {
    id: "UAV-06",
    model: "AeroNexus-LongRange",
    status: "OFFLINE",
    health: "critical",
    battery: 0,
    linkQuality: 0,
    rssi: 0,
    firmware: "ArduPilot 4.4",
    location: "Storage",
    assignedMission: "None",
    lastFlight: "12 days ago",
    flightHours: 4.9,
  },
];