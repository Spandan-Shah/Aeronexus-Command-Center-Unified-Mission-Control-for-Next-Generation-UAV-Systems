import type {
  FeatureCollection,
  LineString,
  Point,
  Polygon,
} from "geojson";

export const initialMapView = {
  longitude: 72.5714,
  latitude: 23.0225,
  zoom: 11.5,
  pitch: 0,
  bearing: 0,
};

export const dronePoints: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "UAV-01",
        name: "UAV-01",
        status: "ACTIVE",
        battery: "72%",
        altitude: "142m",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5815, 23.0302],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "UAV-02",
        name: "UAV-02",
        status: "READY",
        battery: "96%",
        altitude: "0m",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5655, 23.0189],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "UAV-03",
        name: "UAV-03",
        status: "STANDBY",
        battery: "54%",
        altitude: "0m",
      },
      geometry: {
        type: "Point",
        coordinates: [72.589, 23.0235],
      },
    },
  ],
};

export const homePoint: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "HOME",
        type: "Launch Point",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5714, 23.0225],
      },
    },
  ],
};

export const missionRoute: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "SURVEY-ALPHA",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [72.5714, 23.0225],
          [72.5751, 23.0252],
          [72.5788, 23.0271],
          [72.5815, 23.0302],
          [72.5844, 23.0328],
          [72.579, 23.0288],
          [72.5714, 23.0225],
        ],
      },
    },
  ],
};

export const geofenceZone: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Ahmedabad City Geofence",
        type: "Operational Boundary",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [72.470, 23.080],
            [72.485, 23.020],
            [72.515, 22.965],
            [72.590, 22.940],
            [72.665, 22.970],
            [72.725, 23.040],
            [72.710, 23.115],
            [72.640, 23.155],
            [72.555, 23.145],
            [72.470, 23.080],
          ],
        ],
      },
    },
  ],
};

export const restrictedZones: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Restricted Zone A",
        risk: "NO-FLY",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [72.586, 23.033],
            [72.596, 23.034],
            [72.598, 23.041],
            [72.587, 23.043],
            [72.586, 23.033],
          ],
        ],
      },
    },
  ],
};

export const contactPoints: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "CONTACT-07",
        type: "Person",
        confidence: "92%",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5768, 23.0269],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "VEHICLE-02",
        type: "Vehicle",
        confidence: "87%",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5882, 23.0309],
      },
    },
  ],
};

export const heatScanPoints: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        intensity: 0.7,
      },
      geometry: {
        type: "Point",
        coordinates: [72.582, 23.031],
      },
    },
    {
      type: "Feature",
      properties: {
        intensity: 0.45,
      },
      geometry: {
        type: "Point",
        coordinates: [72.573, 23.024],
      },
    },
  ],
};