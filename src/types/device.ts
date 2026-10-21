export type DeviceConnectionType =
  | "SIMULATOR"
  | "MAVLINK_SERIAL"
  | "MAVLINK_UDP"
  | "MAVLINK_TCP"
  | string;

export type DeviceConnectionStatus =
  | "UNPAIRED"
  | "CONNECTING"
  | "CONNECTED"
  | "DEGRADED"
  | "DISCONNECTED"
  | "FAULT"
  | string;

export type DeviceConnectionConfig = {
  connection_type: DeviceConnectionType;

  vehicle_id: string;
  callsign: string;

  serial_port: string | null;
  baud_rate: number | null;

  host: string | null;
  network_port: number | null;

  auto_reconnect: boolean;

  metadata: Record<
    string,
    unknown
  >;
};

export type DeviceDiagnostics = {
  heartbeat_age_ms:
    number | null;

  packets_per_second:
    number | null;

  latency_ms:
    number | null;

  rssi_dbm:
    number | null;

  quality_percent:
    number | null;

  packet_loss_percent:
    number | null;

  last_message_unix:
    number | null;

  details: Record<
    string,
    unknown
  >;
};

export type DeviceState = {
  device_id: string;

  name: string;

  device_type: string;

  connection_type:
    DeviceConnectionType;

  transport: string;

  protocol: string;

  vehicle_id:
    string | null;

  status:
    DeviceConnectionStatus;

  paired: boolean;

  connected: boolean;

  healthy: boolean;

  diagnostics:
    DeviceDiagnostics;

  config:
    DeviceConnectionConfig | null;

  last_error:
    string | null;

  connected_at_unix:
    number | null;

  updated_at_unix:
    number;

  metadata: Record<
    string,
    unknown
  >;
};

export type DeviceSnapshot = {
  type:
    "device_snapshot";

  device_count:
    number;

  connected_count:
    number;

  healthy_count:
    number;

  devices:
    DeviceState[];
};

export type DeviceConnectionOption = {
  connection_type:
    DeviceConnectionType;

  label: string;

  description: string;

  transport: string;

  protocol: string;

  supported: boolean;

  config_fields:
    string[];

  status: string;
};

export type DeviceOptionsResponse = {
  options:
    DeviceConnectionOption[];
};

export type DevicePairPayload = {
  connection_type:
    DeviceConnectionType;

  vehicle_id: string;

  callsign: string;

  serial_port?:
    string | null;

  baud_rate?:
    number | null;

  host?:
    string | null;

  network_port?:
    number | null;

  auto_reconnect?:
    boolean;

  metadata?:
    Record<
      string,
      unknown
    >;
};

export type DeviceActionResponse = {
  ok: boolean;

  device:
    DeviceState;
};

export type DeviceConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "DEGRADED"
  | "DISCONNECTED";