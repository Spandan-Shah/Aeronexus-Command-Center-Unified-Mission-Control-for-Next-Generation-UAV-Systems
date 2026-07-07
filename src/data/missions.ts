export type WaypointType =
  | "TAKEOFF"
  | "WAYPOINT"
  | "LOITER"
  | "SCAN"
  | "ROI"
  | "RTL";

export type Waypoint = {
  id: number;
  type: WaypointType;
  latitude: string;
  longitude: string;
  altitude: number;
  action: string;
};

export const activeMission = {
  id: "MIS-001",
  name: "SURVEY-ALPHA",
  droneId: "UAV-01",
  status: "Draft",
  distance: "4.8 km",
  estimatedTime: "18 min",
  maxAltitude: 150,
  geofenceEnabled: true,
  homePoint: "23.0225°N · 72.5714°E",
  rallyPoint: "23.0251°N · 72.5768°E",
};

export const waypoints: Waypoint[] = [
  {
    id: 1,
    type: "TAKEOFF",
    latitude: "23.0225",
    longitude: "72.5714",
    altitude: 40,
    action: "Climb",
  },
  {
    id: 2,
    type: "WAYPOINT",
    latitude: "23.0252",
    longitude: "72.5751",
    altitude: 100,
    action: "Transit",
  },
  {
    id: 3,
    type: "LOITER",
    latitude: "23.0271",
    longitude: "72.5788",
    altitude: 120,
    action: "Loiter 30s",
  },
  {
    id: 4,
    type: "SCAN",
    latitude: "23.0302",
    longitude: "72.5815",
    altitude: 140,
    action: "Area scan",
  },
  {
    id: 5,
    type: "ROI",
    latitude: "23.0328",
    longitude: "72.5844",
    altitude: 145,
    action: "Camera focus",
  },
  {
    id: 6,
    type: "WAYPOINT",
    latitude: "23.0288",
    longitude: "72.5790",
    altitude: 120,
    action: "Return path",
  },
  {
    id: 7,
    type: "RTL",
    latitude: "23.0225",
    longitude: "72.5714",
    altitude: 60,
    action: "Return home",
  },
];