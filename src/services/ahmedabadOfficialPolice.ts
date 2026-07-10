import type { FeatureCollection, Point } from "geojson";
import type {
  InfrastructureProperties,
  InfrastructureType,
} from "../data/infrastructure";
import {
  ahmedabadPoliceBounds,
  officialAhmedabadPoliceStations,
  type AhmedabadPoliceCategory,
  type AhmedabadPoliceStation,
} from "../data/ahmedabadPoliceStations";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

export type OfficialAhmedabadPoliceProperties = InfrastructureProperties & {
  officialId: string;
  officialName: string;
  officialCategory: AhmedabadPoliceCategory;
  officialZone?: string;
  osmName?: string;
  source: "manual-official" | "osm-official-match";
};

export type OfficialAhmedabadPoliceResult = {
  collection: FeatureCollection<Point, OfficialAhmedabadPoliceProperties>;
  matched: number;
  missing: string[];
  total: number;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

let officialPoliceCache: OfficialAhmedabadPoliceResult | null = null;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bpolice\b/g, "")
    .replace(/\bstation\b/g, "")
    .replace(/\bchowki\b/g, "")
    .replace(/\bchowky\b/g, "")
    .replace(/\bps\b/g, "")
    .replace(/\bahmedabad\b/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createOverpassQuery() {
  const bbox = `${ahmedabadPoliceBounds.south},${ahmedabadPoliceBounds.west},${ahmedabadPoliceBounds.north},${ahmedabadPoliceBounds.east}`;

  return `
[out:json][timeout:35];
(
  node["amenity"="police"](${bbox});
  way["amenity"="police"](${bbox});
  relation["amenity"="police"](${bbox});

  node["police"](${bbox});
  way["police"](${bbox});
  relation["police"](${bbox});

  node["name"~"police|chowki|chowky|commissioner|traffic|mahila|women police|crime branch|cyber crime|control room", i](${bbox});
  way["name"~"police|chowki|chowky|commissioner|traffic|mahila|women police|crime branch|cyber crime|control room", i](${bbox});
  relation["name"~"police|chowki|chowky|commissioner|traffic|mahila|women police|crime branch|cyber crime|control room", i](${bbox});
);
out center tags;
`;
}

function getElementCoordinates(element: OverpassElement) {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  if (lat === undefined || lon === undefined) {
    return null;
  }

  return [lon, lat] as [number, number];
}

function getOsmName(tags: Record<string, string>) {
  return (
    tags.name ||
    tags["name:en"] ||
    tags.official_name ||
    tags.operator ||
    "Ahmedabad Police Location"
  );
}

function getBestOfficialMatch(osmName: string) {
  const normalizedOsmName = normalizeText(osmName);

  let bestStation: AhmedabadPoliceStation | null = null;
  let bestScore = 0;

  for (const station of officialAhmedabadPoliceStations) {
    for (const alias of station.searchAliases) {
      const normalizedAlias = normalizeText(alias);

      if (!normalizedAlias) continue;

      const directMatch =
        normalizedOsmName.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedOsmName);

      if (!directMatch) continue;

      const score = normalizedAlias.length;

      if (score > bestScore) {
        bestScore = score;
        bestStation = station;
      }
    }
  }

  return bestStation;
}

function createPoliceFeature(
  station: AhmedabadPoliceStation,
  coordinates: [number, number],
  source: OfficialAhmedabadPoliceProperties["source"],
  osmName?: string
) {
  return {
    type: "Feature" as const,
    properties: {
      name: station.name,
      type: "police" as InfrastructureType,
      priority: "critical" as InfrastructureProperties["priority"],
      officialId: station.id,
      officialName: station.name,
      officialCategory: station.category,
      officialZone: station.zone,
      osmName,
      source,
    },
    geometry: {
      type: "Point" as const,
      coordinates,
    },
  };
}

export async function fetchOfficialAhmedabadPoliceFromOverpass(
  forceRefresh = false
): Promise<OfficialAhmedabadPoliceResult> {
  if (officialPoliceCache && !forceRefresh) {
    return officialPoliceCache;
  }

  const matchedStationIds = new Set<string>();
  const features: OfficialAhmedabadPoliceResult["collection"]["features"] = [];

  for (const station of officialAhmedabadPoliceStations) {
    if (!station.coordinates) continue;

    matchedStationIds.add(station.id);
    features.push(createPoliceFeature(station, station.coordinates, "manual-official"));
  }

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: new URLSearchParams({
      data: createOverpassQuery(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Ahmedabad official police Overpass request failed: ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;

  for (const element of data.elements) {
    const tags = element.tags ?? {};
    const osmName = getOsmName(tags);
    const station = getBestOfficialMatch(osmName);
    const coordinates = getElementCoordinates(element);

    if (!station || !coordinates || matchedStationIds.has(station.id)) {
      continue;
    }

    matchedStationIds.add(station.id);
    features.push(createPoliceFeature(station, coordinates, "osm-official-match", osmName));
  }

  const missing = officialAhmedabadPoliceStations
    .filter((station) => !matchedStationIds.has(station.id))
    .map((station) => station.name);

  officialPoliceCache = {
    collection: {
      type: "FeatureCollection",
      features,
    },
    matched: features.length,
    missing,
    total: officialAhmedabadPoliceStations.length,
  };

  return officialPoliceCache;
}