export type StockState = "nominal" | "caution" | "critical";

export type PartCategory =
  | "Propulsion"
  | "Power"
  | "Frame"
  | "Sensor"
  | "Communication"
  | "Payload"
  | "Tools";

export type InventoryPart = {
  id: string;
  name: string;
  category: PartCategory;
  compatibleWith: string;
  stock: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string;
  location: string;
  state: StockState;
};

export type SupplierOrder = {
  id: string;
  supplier: string;
  item: string;
  quantity: number;
  eta: string;
  status: "Ordered" | "Shipped" | "Delayed" | "Received";
  cost: number;
};

export const inventoryOverview = {
  totalParts: 186,
  lowStockItems: 4,
  criticalItems: 2,
  totalValue: 184250,
  pendingOrders: 3,
  lastAudit: "Today",
};

export const inventoryParts: InventoryPart[] = [
  {
    id: "PRT-001",
    name: "10-inch Carbon Propeller Set",
    category: "Propulsion",
    compatibleWith: "AeroNexus-Mini / Scout",
    stock: 14,
    reorderLevel: 8,
    unitCost: 850,
    supplier: "AeroParts India",
    location: "Rack A1",
    state: "nominal",
  },
  {
    id: "PRT-002",
    name: "Brushless Motor 920KV",
    category: "Propulsion",
    compatibleWith: "AeroNexus-Mini",
    stock: 5,
    reorderLevel: 6,
    unitCost: 2150,
    supplier: "Robotics Hub",
    location: "Rack A2",
    state: "caution",
  },
  {
    id: "PRT-003",
    name: "4S LiPo 5200mAh Battery",
    category: "Power",
    compatibleWith: "AeroNexus-Mini / VTOL",
    stock: 3,
    reorderLevel: 5,
    unitCost: 4800,
    supplier: "PowerCell Systems",
    location: "Battery Safe B1",
    state: "critical",
  },
  {
    id: "PRT-004",
    name: "GPS + Compass Module",
    category: "Sensor",
    compatibleWith: "All Models",
    stock: 9,
    reorderLevel: 4,
    unitCost: 1650,
    supplier: "NavTech",
    location: "Rack C1",
    state: "nominal",
  },
  {
    id: "PRT-005",
    name: "Telemetry Radio 915MHz",
    category: "Communication",
    compatibleWith: "All Models",
    stock: 4,
    reorderLevel: 5,
    unitCost: 3200,
    supplier: "CommsLab",
    location: "Rack D2",
    state: "caution",
  },
  {
    id: "PRT-006",
    name: "Front Left Frame Arm",
    category: "Frame",
    compatibleWith: "AeroNexus-Scout",
    stock: 1,
    reorderLevel: 3,
    unitCost: 1250,
    supplier: "AeroFrame Works",
    location: "Rack F1",
    state: "critical",
  },
  {
    id: "PRT-007",
    name: "EO Camera Gimbal Mount",
    category: "Payload",
    compatibleWith: "AeroNexus-VTOL / LongRange",
    stock: 6,
    reorderLevel: 2,
    unitCost: 6200,
    supplier: "VisionPayload",
    location: "Rack P1",
    state: "nominal",
  },
  {
    id: "PRT-008",
    name: "Hex Driver Toolkit",
    category: "Tools",
    compatibleWith: "Workshop",
    stock: 12,
    reorderLevel: 4,
    unitCost: 750,
    supplier: "Workshop Supply",
    location: "Tool Bay",
    state: "nominal",
  },
];

export const supplierOrders: SupplierOrder[] = [
  {
    id: "ORD-501",
    supplier: "PowerCell Systems",
    item: "4S LiPo 5200mAh Battery",
    quantity: 6,
    eta: "2 days",
    status: "Shipped",
    cost: 28800,
  },
  {
    id: "ORD-502",
    supplier: "AeroFrame Works",
    item: "Front Left Frame Arm",
    quantity: 5,
    eta: "4 days",
    status: "Ordered",
    cost: 6250,
  },
  {
    id: "ORD-503",
    supplier: "CommsLab",
    item: "Telemetry Radio 915MHz",
    quantity: 4,
    eta: "Delayed",
    status: "Delayed",
    cost: 12800,
  },
];