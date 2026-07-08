export type BatteryState = "nominal" | "caution" | "critical";

export type BatteryPack = {
  id: string;
  type: string;
  percentage: number;
  voltage: number;
  currentDraw: number;
  temperature: number;
  cycleCount: number;
  health: number;
  estimatedFlightTime: string;
  state: BatteryState;
  status: string;
};

export type PowerAlert = {
  id: string;
  time: string;
  level: BatteryState;
  title: string;
  message: string;
};

export const batteryOverview = {
  activePack: "BAT-01",
  totalVoltage: 15.8,
  currentDraw: 18.6,
  estimatedFlightTime: "08:32",
  batteryHealth: 91,
  powerMode: "Mission Balanced",
};

export const batteryPacks: BatteryPack[] = [
  {
    id: "BAT-01",
    type: "4S LiPo 5200mAh",
    percentage: 72,
    voltage: 15.8,
    currentDraw: 18.6,
    temperature: 38,
    cycleCount: 42,
    health: 91,
    estimatedFlightTime: "08:32",
    state: "nominal",
    status: "Active",
  },
  {
    id: "BAT-02",
    type: "4S LiPo 5200mAh",
    percentage: 96,
    voltage: 16.6,
    currentDraw: 0,
    temperature: 31,
    cycleCount: 18,
    health: 96,
    estimatedFlightTime: "14:20",
    state: "nominal",
    status: "Ready",
  },
  {
    id: "BAT-03",
    type: "4S LiPo 5000mAh",
    percentage: 41,
    voltage: 14.6,
    currentDraw: 0,
    temperature: 35,
    cycleCount: 86,
    health: 78,
    estimatedFlightTime: "05:10",
    state: "caution",
    status: "Reserve",
  },
  {
    id: "BAT-04",
    type: "3S LiPo 4200mAh",
    percentage: 18,
    voltage: 10.9,
    currentDraw: 0,
    temperature: 34,
    cycleCount: 112,
    health: 62,
    estimatedFlightTime: "02:20",
    state: "critical",
    status: "Needs Charge",
  },
];

export const powerHistory = [
  { time: "00:00", voltage: 16.4, current: 8.2, battery: 100 },
  { time: "02:00", voltage: 16.1, current: 12.4, battery: 91 },
  { time: "04:00", voltage: 15.9, current: 16.8, battery: 83 },
  { time: "06:00", voltage: 15.8, current: 18.6, battery: 72 },
  { time: "08:00", voltage: 15.5, current: 19.2, battery: 64 },
  { time: "10:00", voltage: 15.2, current: 20.1, battery: 57 },
  { time: "12:00", voltage: 14.9, current: 21.4, battery: 49 },
];

export const powerAlerts: PowerAlert[] = [
  {
    id: "p1",
    time: "14:24:10",
    level: "nominal",
    title: "Power stable",
    message: "Active battery voltage is within safe mission range.",
  },
  {
    id: "p2",
    time: "14:22:41",
    level: "caution",
    title: "Current draw rising",
    message: "Current draw increased during climb phase.",
  },
  {
    id: "p3",
    time: "14:20:18",
    level: "caution",
    title: "Reserve pack low",
    message: "BAT-03 reserve battery is below 45%.",
  },
  {
    id: "p4",
    time: "14:18:55",
    level: "critical",
    title: "BAT-04 requires charge",
    message: "Battery pack BAT-04 should not be used for flight.",
  },
];