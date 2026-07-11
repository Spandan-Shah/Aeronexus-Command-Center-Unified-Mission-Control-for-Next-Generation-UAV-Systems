import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type WaypointAction =
  | "none"
  | "scan"
  | "photo"
  | "hold"
  | "return-check";

export type MissionWaypoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  holdSeconds: number;
  action: WaypointAction;
};

export type MissionWarning = {
  severity: "info" | "caution" | "critical";
  title: string;
  message: string;
};

export type MissionAnalysis = {
  waypointCount: number;
  totalDistanceMeters: number;
  estimatedTimeSeconds: number;
  estimatedBatteryPercent: number;
  geofencePassed: boolean;
  restrictedPassed: boolean;
  missionReady: boolean;
  warnings: MissionWarning[];
};

type LatLngPoint = {
  lat: number;
  lng: number;
};

type PolygonCollection = FeatureCollection<Polygon | MultiPolygon>;

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

export function createDefaultWaypoint(
  lat: number,
  lng: number,
  order: number
): MissionWaypoint {
  return {
    id: createId(),
    name: `WP-${order}`,
    lat,
    lng,
    altitude: 60,
    speed: 6,
    holdSeconds: 0,
    action: "scan",
  };
}

export function formatDistance(meters: number) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${Math.round(meters)} m`;
}

export function formatTime(seconds: number) {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

export function calculateDistanceMeters(
  first: LatLngPoint,
  second: LatLngPoint
) {
  const earthRadiusMeters = 6371000;

  const firstLatRad = toRadians(first.lat);
  const secondLatRad = toRadians(second.lat);
  const deltaLatRad = toRadians(second.lat - first.lat);
  const deltaLngRad = toRadians(second.lng - first.lng);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(firstLatRad) *
      Math.cos(secondLatRad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function toRadians(degree: number) {
  return (degree * Math.PI) / 180;
}

function pointInRing(point: LatLngPoint, ring: number[][]) {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.0000001) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygonCoordinates(point: LatLngPoint, polygon: number[][][]) {
  const outerRing = polygon[0];

  if (!outerRing || !pointInRing(point, outerRing)) {
    return false;
  }

  const holes = polygon.slice(1);

  for (const hole of holes) {
    if (pointInRing(point, hole)) {
      return false;
    }
  }

  return true;
}

function pointInsideCollection(point: LatLngPoint, collection: PolygonCollection) {
  return collection.features.some((feature) => {
    if (feature.geometry.type === "Polygon") {
      return pointInPolygonCoordinates(point, feature.geometry.coordinates);
    }

    return feature.geometry.coordinates.some((polygon) =>
      pointInPolygonCoordinates(point, polygon)
    );
  });
}

function sampleSegment(first: LatLngPoint, second: LatLngPoint, samples = 20) {
  const points: LatLngPoint[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples;

    points.push({
      lat: first.lat + (second.lat - first.lat) * ratio,
      lng: first.lng + (second.lng - first.lng) * ratio,
    });
  }

  return points;
}

function calculateTotalDistance(waypoints: MissionWaypoint[]) {
  let total = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    total += calculateDistanceMeters(waypoints[index - 1], waypoints[index]);
  }

  return total;
}

function calculateEstimatedTime(waypoints: MissionWaypoint[]) {
  let totalSeconds = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    const previous = waypoints[index - 1];
    const current = waypoints[index];
    const distance = calculateDistanceMeters(previous, current);
    const speed = Math.max(1, current.speed);

    totalSeconds += distance / speed;
  }

  for (const waypoint of waypoints) {
    totalSeconds += waypoint.holdSeconds;
  }

  return totalSeconds;
}

function calculateAltitudeGain(waypoints: MissionWaypoint[]) {
  let gain = 0;

  for (let index = 1; index < waypoints.length; index += 1) {
    const difference = waypoints[index].altitude - waypoints[index - 1].altitude;

    if (difference > 0) {
      gain += difference;
    }
  }

  return gain;
}

function calculateEstimatedBatteryPercent(
  waypoints: MissionWaypoint[],
  distanceMeters: number,
  timeSeconds: number
) {
  const distanceCost = distanceMeters / 300;
  const timeCost = timeSeconds / 60 / 2;
  const waypointCost = waypoints.length * 0.35;
  const altitudeCost = calculateAltitudeGain(waypoints) * 0.03;

  return Math.min(
    100,
    Math.max(0, distanceCost + timeCost + waypointCost + altitudeCost)
  );
}

function checkRouteInsideGeofence(
  waypoints: MissionWaypoint[],
  geofence: PolygonCollection
) {
  if (waypoints.length === 0 || geofence.features.length === 0) {
    return true;
  }

  for (const waypoint of waypoints) {
    if (!pointInsideCollection(waypoint, geofence)) {
      return false;
    }
  }

  for (let index = 1; index < waypoints.length; index += 1) {
    const samples = sampleSegment(waypoints[index - 1], waypoints[index]);

    for (const point of samples) {
      if (!pointInsideCollection(point, geofence)) {
        return false;
      }
    }
  }

  return true;
}

function checkRouteAvoidsRestrictedZones(
  waypoints: MissionWaypoint[],
  restrictedZones: PolygonCollection
) {
  if (waypoints.length === 0 || restrictedZones.features.length === 0) {
    return true;
  }

  for (const waypoint of waypoints) {
    if (pointInsideCollection(waypoint, restrictedZones)) {
      return false;
    }
  }

  for (let index = 1; index < waypoints.length; index += 1) {
    const samples = sampleSegment(waypoints[index - 1], waypoints[index], 30);

    for (const point of samples) {
      if (pointInsideCollection(point, restrictedZones)) {
        return false;
      }
    }
  }

  return true;
}

export function analyzeMission({
  waypoints,
  geofence,
  restrictedZones,
}: {
  waypoints: MissionWaypoint[];
  geofence: PolygonCollection;
  restrictedZones: PolygonCollection;
}): MissionAnalysis {
  const warnings: MissionWarning[] = [];
  const waypointCount = waypoints.length;
  const totalDistanceMeters = calculateTotalDistance(waypoints);
  const estimatedTimeSeconds = calculateEstimatedTime(waypoints);
  const estimatedBatteryPercent = calculateEstimatedBatteryPercent(
    waypoints,
    totalDistanceMeters,
    estimatedTimeSeconds
  );

  const geofencePassed = checkRouteInsideGeofence(waypoints, geofence);
  const restrictedPassed = checkRouteAvoidsRestrictedZones(
    waypoints,
    restrictedZones
  );

  if (waypointCount < 2) {
    warnings.push({
      severity: "caution",
      title: "Not enough waypoints",
      message: "Add at least two waypoints to create a valid mission route.",
    });
  }

  if (!geofencePassed) {
    warnings.push({
      severity: "critical",
      title: "Geofence violation",
      message:
        "One or more waypoints or route segments are outside the operational boundary.",
    });
  }

  if (!restrictedPassed) {
    warnings.push({
      severity: "critical",
      title: "Restricted zone conflict",
      message:
        "One or more waypoints or route segments enter a restricted or no-fly area.",
    });
  }

  if (estimatedBatteryPercent > 70) {
    warnings.push({
      severity: "critical",
      title: "High battery usage",
      message:
        "Estimated battery usage is too high. Reduce route length, altitude changes, or hold time.",
    });
  } else if (estimatedBatteryPercent > 45) {
    warnings.push({
      severity: "caution",
      title: "Moderate battery usage",
      message:
        "Mission may consume significant battery. Keep emergency return margin.",
    });
  }

  const maxAltitude = Math.max(0, ...waypoints.map((waypoint) => waypoint.altitude));

  if (maxAltitude > 120) {
    warnings.push({
      severity: "critical",
      title: "Altitude too high",
      message:
        "One or more waypoints exceed 120 m. Reduce altitude before mission upload.",
    });
  }

  const missionReady =
    waypointCount >= 2 &&
    geofencePassed &&
    restrictedPassed &&
    estimatedBatteryPercent <= 70 &&
    maxAltitude <= 120;

  if (missionReady) {
    warnings.push({
      severity: "info",
      title: "Mission ready",
      message:
        "Mission route passes local planning checks and is ready for backend save/upload later.",
    });
  }

  return {
    waypointCount,
    totalDistanceMeters,
    estimatedTimeSeconds,
    estimatedBatteryPercent,
    geofencePassed,
    restrictedPassed,
    missionReady,
    warnings,
  };
}