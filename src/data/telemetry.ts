export const telemetry = {
  droneId: "UAV-01",
  model: "AeroNexus-Mini",
  mission: "SURVEY-ALPHA",

  battery: 72,

  altitude: 142,

  speed: 18.4,

  heading: 42,

  gpsSatellites: 14,

  linkQuality: 92,

  rssi: -68,

  escTemp: 54,

  flightMode: "AUTO.MISSION",

  currentWaypoint: 4,

  totalWaypoints: 9,

  /**
   * Current mission / operational risk state.
   *
   * Later this should be generated from real telemetry,
   * AI detections, environmental readings and mission state.
   */
  risk: "low" as const,
};