export type VehicleSource =
  | "SIM"
  | "SITL"
  | "LIVE"
  | "UNKNOWN";

export type VehicleConnectionState =
  | "CONNECTED"
  | "DEGRADED"
  | "DISCONNECTED"
  | "UNKNOWN";

export type VehicleHealthLevel =
  | "NOMINAL"
  | "WARNING"
  | "CRITICAL"
  | "UNKNOWN";

export type MissionNexusConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "DEGRADED"
  | "DISCONNECTED";

export type GeoPosition = {
  latitude_deg: number;
  longitude_deg: number;

  altitude_msl_m: number;
  altitude_relative_m: number;
};

export type AttitudeState = {
  roll_deg: number;
  pitch_deg: number;
  yaw_deg: number;
};

export type MotionState = {
  north_mps: number;
  east_mps: number;
  down_mps: number;

  ground_speed_mps: number;

  air_speed_mps:
    | number
    | null;

  vertical_speed_mps: number;

  heading_deg: number;
};

export type BatteryState = {
  voltage_v:
    | number
    | null;

  current_a:
    | number
    | null;

  remaining_percent:
    | number
    | null;

  consumed_mah:
    | number
    | null;
};

export type GpsState = {
  fix_type: number;

  satellites_visible: number;

  hdop:
    | number
    | null;

  vdop:
    | number
    | null;
};

export type LinkState = {
  state:
    VehicleConnectionState
    | string;

  heartbeat_age_ms:
    | number
    | null;

  rssi_dbm:
    | number
    | null;

  quality_percent:
    | number
    | null;

  packet_loss_percent:
    | number
    | null;
};

export type HealthState = {
  overall:
    VehicleHealthLevel
    | string;

  gps_ok: boolean;
  battery_ok: boolean;
  attitude_ok: boolean;
  link_ok: boolean;

  failsafe_active: boolean;

  warnings: string[];
};

export type MissionState = {
  mission_id:
    | string
    | null;

  state: string;

  current_waypoint: number;

  total_waypoints: number;
};

export type VehicleCapabilities = {
  mavlink: boolean;

  manual_control: boolean;

  autonomous_navigation: boolean;

  camera: boolean;

  computer_vision: boolean;

  companion_computer: boolean;

  multi_vehicle: boolean;
};

export type VehicleMetadata = {
  development_only?: boolean;

  vehicle_profile?: string;

  airframe?: string;

  telemetry_source?: string;

  [key: string]:
    unknown;
};

export type VehicleState = {
  vehicle_id: string;

  callsign: string;

  source:
    VehicleSource
    | string;

  vehicle_type: string;

  connected: boolean;

  armed: boolean;

  flight_mode: string;

  position: GeoPosition;

  attitude: AttitudeState;

  motion: MotionState;

  battery: BatteryState;

  gps: GpsState;

  link: LinkState;

  health: HealthState;

  mission: MissionState;

  capabilities:
    VehicleCapabilities;

  home_position:
    | GeoPosition
    | null;

  system_id:
    | number
    | null;

  component_id:
    | number
    | null;

  last_heartbeat_unix:
    | number
    | null;

  updated_at_unix: number;

  metadata:
    VehicleMetadata;
};

export type VehicleSnapshot = {
  type:
    "vehicle_snapshot";

  vehicle_count: number;

  vehicles:
    VehicleState[];
};

export type MissionNexusHeartbeat = {
  type:
    "missionnexus_heartbeat";
};

export type MissionNexusSocketMessage =
  | VehicleSnapshot
  | MissionNexusHeartbeat;