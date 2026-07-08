export type DetectionSeverity = "info" | "caution" | "critical";

export type DetectionBox = {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  severity: DetectionSeverity;
};

export type AiModel = {
  name: string;
  status: "ACTIVE" | "IDLE";
  load: number;
  fps: number;
  latency: string;
};

export type DetectionEvent = {
  id: string;
  time: string;
  object: string;
  confidence: number;
  sector: string;
  action: string;
  severity: DetectionSeverity;
};

export const cameraStatus = {
  cameraId: "CAM-01",
  mode: "EO/IR",
  recording: true,
  recordTime: "00:14:22",
  zoom: "4.2x",
  fov: "22°",
  fps: 28,
  resolution: "1920 × 1080",
  gimbal: "Pitch -32° · Yaw +018°",
  location: "23.0225°N · 72.5714°E",
};

export const detectionBoxes: DetectionBox[] = [
  {
    id: "d1",
    label: "PERSON",
    confidence: 92,
    x: 22,
    y: 48,
    width: 9,
    height: 19,
    severity: "caution",
  },
  {
    id: "d2",
    label: "VEHICLE",
    confidence: 87,
    x: 55,
    y: 60,
    width: 22,
    height: 15,
    severity: "info",
  },
  {
    id: "d3",
    label: "UNKNOWN HEAT",
    confidence: 71,
    x: 74,
    y: 32,
    width: 8,
    height: 10,
    severity: "critical",
  },
];

export const aiModels: AiModel[] = [
  {
    name: "YOLOv8 · Person/Vehicle",
    status: "ACTIVE",
    load: 62,
    fps: 28,
    latency: "34 ms",
  },
  {
    name: "Thermal Hotspot v2",
    status: "ACTIVE",
    load: 41,
    fps: 24,
    latency: "42 ms",
  },
  {
    name: "Obstacle Classifier",
    status: "ACTIVE",
    load: 36,
    fps: 28,
    latency: "29 ms",
  },
  {
    name: "Fire/Smoke CNN",
    status: "IDLE",
    load: 0,
    fps: 0,
    latency: "—",
  },
];

export const detectionEvents: DetectionEvent[] = [
  {
    id: "e1",
    time: "14:22:41",
    object: "PERSON",
    confidence: 92,
    sector: "NW-7",
    action: "TRACK",
    severity: "caution",
  },
  {
    id: "e2",
    time: "14:22:18",
    object: "PERSON",
    confidence: 88,
    sector: "NW-7",
    action: "TAG",
    severity: "caution",
  },
  {
    id: "e3",
    time: "14:21:44",
    object: "VEHICLE",
    confidence: 87,
    sector: "NW-6",
    action: "TRACK",
    severity: "info",
  },
  {
    id: "e4",
    time: "14:20:12",
    object: "UNKNOWN HEAT",
    confidence: 71,
    sector: "N-2",
    action: "FLAG",
    severity: "critical",
  },
  {
    id: "e5",
    time: "14:19:03",
    object: "PERSON",
    confidence: 84,
    sector: "NW-8",
    action: "TAG",
    severity: "caution",
  },
];