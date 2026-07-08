export type SettingState = "enabled" | "disabled" | "warning";

export type SafetyLimit = {
  id: string;
  label: string;
  value: string;
  description: string;
  state: SettingState;
};

export type TelemetrySetting = {
  id: string;
  label: string;
  value: string;
  description: string;
  state: SettingState;
};

export type DashboardPreference = {
  id: string;
  label: string;
  value: string;
  description: string;
  state: SettingState;
};

export const settingsOverview = {
  mode: "Simulation",
  activeProfile: "AeroNexus Default",
  mapProvider: "Tactical Grid",
  telemetryRate: "10 Hz",
  theme: "Dark Tactical",
  lastSaved: "Today · 14:35",
};

export const safetyLimits: SafetyLimit[] = [
  {
    id: "safe-01",
    label: "Maximum Altitude",
    value: "150 m",
    description: "Drone should not cross this configured altitude limit.",
    state: "enabled",
  },
  {
    id: "safe-02",
    label: "Geofence Boundary",
    value: "Enabled",
    description: "Mission area boundary protection is active.",
    state: "enabled",
  },
  {
    id: "safe-03",
    label: "Return-To-Home Battery",
    value: "30%",
    description: "Drone should return home when battery reaches this level.",
    state: "enabled",
  },
  {
    id: "safe-04",
    label: "Low Link Failsafe",
    value: "75%",
    description: "Failsafe warning triggers when telemetry link quality drops.",
    state: "warning",
  },
];

export const telemetrySettings: TelemetrySetting[] = [
  {
    id: "tel-01",
    label: "Telemetry Rate",
    value: "10 Hz",
    description: "Dashboard refresh rate for live drone telemetry.",
    state: "enabled",
  },
  {
    id: "tel-02",
    label: "Command Signing",
    value: "Enabled",
    description: "All critical commands are marked as signed in the audit trail.",
    state: "enabled",
  },
  {
    id: "tel-03",
    label: "Secure Session",
    value: "AES-256 Session",
    description: "Mock secure session mode used for dashboard simulation.",
    state: "enabled",
  },
  {
    id: "tel-04",
    label: "Offline Buffer",
    value: "120 sec",
    description: "Stores recent telemetry if the drone link drops temporarily.",
    state: "enabled",
  },
];

export const dashboardPreferences: DashboardPreference[] = [
  {
    id: "dash-01",
    label: "Theme",
    value: "Dark Tactical",
    description: "High contrast tactical dashboard theme.",
    state: "enabled",
  },
  {
    id: "dash-02",
    label: "HUD Font",
    value: "JetBrains Mono",
    description: "Used for telemetry, command, and status labels.",
    state: "enabled",
  },
  {
    id: "dash-03",
    label: "Scanline Video Effect",
    value: "Enabled",
    description: "Adds tactical scanline effect to simulated video feed.",
    state: "enabled",
  },
  {
    id: "dash-04",
    label: "Alert Sound",
    value: "Disabled",
    description: "Audio alert is disabled in current browser prototype.",
    state: "disabled",
  },
];

export const simulatorSettings = {
  simulatorEnabled: true,
  activeDrone: "UAV-01",
  missionProfile: "SURVEY-ALPHA",
  weatherProfile: "Clear · Light Wind",
  mapMode: "Grid + Geofence",
  dataSource: "Mock Data",
};