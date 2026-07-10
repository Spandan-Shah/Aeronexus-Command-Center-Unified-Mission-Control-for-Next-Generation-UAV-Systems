import type { FeatureCollection, Point } from "geojson";

export type InfrastructureType =
  | "police"
  | "hospital"
  | "fire"
  | "airport"
  | "railway"
  | "government"
  | "power"
  | "fuel"
  | "school"
  | "water"
  | "telecom";

export type InfrastructureProperties = {
  name: string;
  type: InfrastructureType;
  priority: "critical" | "high" | "medium";
};

export const infrastructurePoints: FeatureCollection<
  Point,
  InfrastructureProperties
> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Civil Hospital Ahmedabad",
        type: "hospital",
        priority: "critical",
      },
      geometry: {
        type: "Point",
        coordinates: [72.6042, 23.0525],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "VS Hospital",
        type: "hospital",
        priority: "critical",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5697, 23.0217],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Ahmedabad Police HQ",
        type: "police",
        priority: "critical",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5716, 23.0266],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Navrangpura Police Station",
        type: "police",
        priority: "high",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5602, 23.0372],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Ahmedabad Fire Station",
        type: "fire",
        priority: "critical",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5798, 23.0262],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Sardar Vallabhbhai Patel International Airport",
        type: "airport",
        priority: "critical",
      },
      geometry: {
        type: "Point",
        coordinates: [72.6347, 23.0734],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Ahmedabad Railway Station",
        type: "railway",
        priority: "critical",
      },
      geometry: {
        type: "Point",
        coordinates: [72.6011, 23.0258],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Gujarat High Court",
        type: "government",
        priority: "high",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5222, 23.0805],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Power Substation Zone",
        type: "power",
        priority: "high",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5475, 23.012],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Fuel Support Node",
        type: "fuel",
        priority: "medium",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5908, 23.0148],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Education Zone",
        type: "school",
        priority: "medium",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5282, 23.0391],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Water Utility Node",
        type: "water",
        priority: "high",
      },
      geometry: {
        type: "Point",
        coordinates: [72.5098, 23.0364],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Telecom Relay Zone",
        type: "telecom",
        priority: "medium",
      },
      geometry: {
        type: "Point",
        coordinates: [72.625, 23.042],
      },
    },
  ],
};