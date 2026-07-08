export type HealthState = "nominal" | "caution" | "critical";

export type MotorHealth = {
  id: string;
  rpm: number;
  temperature: number;
  vibration: number;
  state: HealthState;
};

export type SensorHealth = {
  name: string;
  value: string;
  state: HealthState;
  lastChecked: string;
};

export const droneHealth = {
  droneId: "UAV-01",
  overallScore: 87,
  status: "Flight Ready",
  frameCondition: "Good",
  calibrationDue: "After 3 flights",
  vibrationLevel: "Low",
  lastInspection: "Today",
};

export const motorHealth: MotorHealth[] = [
  {
    id: "M1",
    rpm: 4820,
    temperature: 48,
    vibration: 0.12,
    state: "nominal",
  },
  {
    id: "M2",
    rpm: 4795,
    temperature: 50,
    vibration: 0.14,
    state: "nominal",
  },
  {
    id: "M3",
    rpm: 4862,
    temperature: 56,
    vibration: 0.22,
    state: "caution",
  },
  {
    id: "M4",
    rpm: 4810,
    temperature: 49,
    vibration: 0.13,
    state: "nominal",
  },
];

export const sensorHealth: SensorHealth[] = [
  {
    name: "GPS",
    value: "14 satellites · RTK stable",
    state: "nominal",
    lastChecked: "10 sec ago",
  },
  {
    name: "IMU",
    value: "Acceleration stable",
    state: "nominal",
    lastChecked: "8 sec ago",
  },
  {
    name: "Compass",
    value: "Minor magnetic deviation",
    state: "caution",
    lastChecked: "15 sec ago",
  },
  {
    name: "Barometer",
    value: "Altitude stable",
    state: "nominal",
    lastChecked: "12 sec ago",
  },
  {
    name: "ESC",
    value: "ESC 3 temperature rising",
    state: "caution",
    lastChecked: "6 sec ago",
  },
  {
    name: "Telemetry Link",
    value: "Signal acceptable",
    state: "nominal",
    lastChecked: "5 sec ago",
  },
];