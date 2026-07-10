import type { FeatureCollection, Point } from "geojson";
import type {
  InfrastructureProperties,
  InfrastructureType,
} from "../data/infrastructure";

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

export type InfrastructureBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function createOverpassQuery(bounds: InfrastructureBounds) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  return `
[out:json][timeout:25];
(
  node["amenity"~"^(hospital|clinic|doctors|police|fire_station|courthouse|townhall|school|college|university)$"](${bbox});
  way["amenity"~"^(hospital|clinic|doctors|police|fire_station|courthouse|townhall|school|college|university)$"](${bbox});
  relation["amenity"~"^(hospital|clinic|doctors|police|fire_station|courthouse|townhall|school|college|university)$"](${bbox});

  node["healthcare"~"^(hospital|clinic|doctor)$"](${bbox});
  way["healthcare"~"^(hospital|clinic|doctor)$"](${bbox});
  relation["healthcare"~"^(hospital|clinic|doctor)$"](${bbox});

  node["emergency"="ambulance_station"](${bbox});
  way["emergency"="ambulance_station"](${bbox});
  relation["emergency"="ambulance_station"](${bbox});

  node["office"="government"](${bbox});
  way["office"="government"](${bbox});
  relation["office"="government"](${bbox});

  node["government"](${bbox});
  way["government"](${bbox});
  relation["government"](${bbox});

  node["aeroway"~"^(aerodrome|helipad)$"](${bbox});
  way["aeroway"~"^(aerodrome|helipad)$"](${bbox});
  relation["aeroway"~"^(aerodrome|helipad)$"](${bbox});

  node["railway"="station"](${bbox});
  way["railway"="station"](${bbox});
  relation["railway"="station"](${bbox});

  node["power"~"^(substation|plant|generator)$"](${bbox});
  way["power"~"^(substation|plant|generator)$"](${bbox});
  relation["power"~"^(substation|plant|generator)$"](${bbox});

  node["man_made"~"^(communications_tower|water_tower|water_works)$"](${bbox});
  way["man_made"~"^(communications_tower|water_tower|water_works)$"](${bbox});
  relation["man_made"~"^(communications_tower|water_tower|water_works)$"](${bbox});
);
out center tags;
`;
}

function getInfrastructureType(
  tags: Record<string, string>
): InfrastructureType | null {
  if (tags.amenity === "police") return "police";

  if (
    tags.amenity === "hospital" ||
    tags.amenity === "clinic" ||
    tags.amenity === "doctors" ||
    tags.healthcare === "hospital" ||
    tags.healthcare === "clinic" ||
    tags.healthcare === "doctor" ||
    tags.emergency === "ambulance_station"
  ) {
    return "hospital";
  }

  if (tags.amenity === "fire_station") return "fire";

  if (tags.aeroway === "aerodrome" || tags.aeroway === "helipad") {
    return "airport";
  }

  if (tags.railway === "station") return "railway";

  if (
    tags.amenity === "courthouse" ||
    tags.amenity === "townhall" ||
    tags.office === "government" ||
    tags.government
  ) {
    return "government";
  }

  if (tags.power) return "power";

  if (
    tags.amenity === "school" ||
    tags.amenity === "college" ||
    tags.amenity === "university"
  ) {
    return "school";
  }

  if (tags.man_made === "communications_tower") return "telecom";

  if (tags.man_made === "water_tower" || tags.man_made === "water_works") {
    return "water";
  }

  return null;
}

function getPriority(type: InfrastructureType): InfrastructureProperties["priority"] {
  if (
    type === "hospital" ||
    type === "police" ||
    type === "fire" ||
    type === "airport" ||
    type === "government"
  ) {
    return "critical";
  }

  if (
    type === "railway" ||
    type === "power" ||
    type === "water" ||
    type === "telecom"
  ) {
    return "high";
  }

  return "medium";
}

function getName(tags: Record<string, string>, type: InfrastructureType) {
  return (
    tags.name ||
    tags["name:en"] ||
    tags.official_name ||
    tags.operator ||
    `${type.toUpperCase()} Node`
  );
}

export async function fetchInfrastructureFromOverpass(
  bounds: InfrastructureBounds
): Promise<FeatureCollection<Point, InfrastructureProperties>> {
  const query = createOverpassQuery(bounds);

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: new URLSearchParams({
      data: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status}`);
  }

  const data = (await response.json()) as OverpassResponse;
  const seen = new Set<string>();

  const features = data.elements
    .map((element) => {
      const tags = element.tags ?? {};
      const type = getInfrastructureType(tags);

      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;

      if (!type || lat === undefined || lon === undefined) {
        return null;
      }

      const key = `${type}-${element.type}-${element.id}`;

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      return {
        type: "Feature" as const,
        properties: {
          name: getName(tags, type),
          type,
          priority: getPriority(type),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [lon, lat],
        },
      };
    })
    .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature))
    .slice(0, 500);

  return {
    type: "FeatureCollection",
    features,
  };
}