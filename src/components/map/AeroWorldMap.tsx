import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import L, {
  type Layer,
  type Map as LeafletMap,
  type TileLayer,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Crosshair,
  Globe2,
  Home,
  Layers,
  LocateFixed,
  Moon,
  Plane,
  Sun,
} from "lucide-react";
import {
  contactPoints,
  dronePoints,
  geofenceZone,
  heatScanPoints,
  homePoint,
  initialMapView,
  missionRoute,
  restrictedZones,
} from "../../data/worldMap";
import {
  infrastructurePoints,
  type InfrastructureProperties,
  type InfrastructureType,
} from "../../data/infrastructure";
import { useUnifiedTelemetry } from "../../hooks/useUnifiedTelemetry";
import { fetchInfrastructureFromOverpass } from "../../services/overpassInfrastructure";
import { fetchOfficialAhmedabadPoliceFromOverpass } from "../../services/ahmedabadOfficialPolice";

type LayerId =
  | "live-drone"
  | "drones"
  | "route"
  | "geofence"
  | "restricted"
  | "contacts"
  | "heat"
  | "home"
  | "infrastructure";

type LayerState = Record<LayerId, boolean>;

type MapTheme = "dark" | "light";

type InfrastructureCollection = FeatureCollection<
  Point,
  InfrastructureProperties
>;

type PoliceStats = {
  matched: number;
  missing: number;
  total: number;
};

const defaultLayerState: LayerState = {
  "live-drone": true,
  drones: true,
  route: true,
  geofence: true,
  restricted: true,
  contacts: true,
  heat: true,
  home: true,
  infrastructure: true,
};

const layerButtons: { id: LayerId; label: string }[] = [
  { id: "live-drone", label: "Live Drone" },
  { id: "drones", label: "Sim Drones" },
  { id: "route", label: "Mission Route" },
  { id: "geofence", label: "Geofence" },
  { id: "restricted", label: "Restricted" },
  { id: "contacts", label: "Contacts" },
  { id: "heat", label: "Heat Scan" },
  { id: "home", label: "Home" },
  { id: "infrastructure", label: "Infrastructure" },
];

const baseMaps: Record<
  MapTheme,
  {
    label: string;
    url: string;
    attribution: string;
  }
> = {
  dark: {
    label: "Dark Tactical",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
  },
  light: {
    label: "Voyager Detail",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
  },
};

const mapColors = {
  geofenceBoundary: "#009933",
  geofenceFill: "#009933",

  restrictedBoundary: "#ff4d4d",
  restrictedFill: "#ff4d4d",

  route: "#29d3ff",
  heat: "#ff4d4d",
  home: "#49e58f",
  contact: "#ff4d4d",
  drone: "#f6b23c",
  liveDrone: "#29d3ff",
  mapStroke: "#050d18",
};

const infrastructureStyles: Record<
  InfrastructureType,
  {
    label: string;
    symbol: string;
    color: string;
  }
> = {
  police: {
    label: "Police",
    symbol: "🛡",
    color: "#3b82f6",
  },
  hospital: {
    label: "Hospital",
    symbol: "✚",
    color: "#ef4444",
  },
  fire: {
    label: "Fire",
    symbol: "🔥",
    color: "#f97316",
  },
  airport: {
    label: "Airport",
    symbol: "✈",
    color: "#38bdf8",
  },
  railway: {
    label: "Railway",
    symbol: "▣",
    color: "#a78bfa",
  },
  government: {
    label: "Government",
    symbol: "🏛",
    color: "#facc15",
  },
  power: {
    label: "Power",
    symbol: "⚡",
    color: "#fbbf24",
  },
  fuel: {
    label: "Fuel",
    symbol: "⛽",
    color: "#22c55e",
  },
  school: {
    label: "School",
    symbol: "🎓",
    color: "#14b8a6",
  },
  water: {
    label: "Water",
    symbol: "💧",
    color: "#06b6d4",
  },
  telecom: {
    label: "Telecom",
    symbol: "📡",
    color: "#ec4899",
  },
};

function createWorldBounds() {
  return L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeInfrastructureType(type: unknown): InfrastructureType {
  if (typeof type === "string" && type in infrastructureStyles) {
    return type as InfrastructureType;
  }

  return "government";
}

function normalizePriority(
  priority: unknown
): InfrastructureProperties["priority"] {
  if (
    priority === "critical" ||
    priority === "high" ||
    priority === "medium"
  ) {
    return priority;
  }

  return "medium";
}

function getInfrastructureStyle(type: InfrastructureType) {
  return infrastructureStyles[type] ?? infrastructureStyles.government;
}

function getRiskColor(risk?: string) {
  if (risk === "critical") return "#ff4d4d";
  if (risk === "high") return "#f6b23c";
  if (risk === "medium") return "#29d3ff";
  return "#49e58f";
}

function createInfrastructureIcon(
  type: InfrastructureType,
  priority: InfrastructureProperties["priority"]
) {
  const style = getInfrastructureStyle(type);
  const size = priority === "critical" ? 32 : priority === "high" ? 28 : 24;

  return L.divIcon({
    className: "aeronexus-infrastructure-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `
      <div
        style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(5, 13, 24, 0.92);
          border: 2px solid ${style.color};
          color: ${style.color};
          box-shadow: 0 0 14px ${style.color}66;
          font-size: ${Math.round(size * 0.5)}px;
          font-weight: 800;
          line-height: 1;
        "
        title="${style.label}"
      >
        ${style.symbol}
      </div>
    `,
  });
}

function createLiveDroneIcon(risk?: string) {
  const color = getRiskColor(risk);

  return L.divIcon({
    className: "aeronexus-live-drone-marker",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
    html: `
      <div
        style="
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <div
          style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 999px;
            background: ${color}22;
            border: 1px solid ${color};
            box-shadow: 0 0 22px ${color}99;
          "
        ></div>

        <div
          style="
            position: absolute;
            width: 22px;
            height: 22px;
            transform: rotate(45deg);
            background: rgba(5, 13, 24, 0.96);
            border: 2px solid ${color};
            box-shadow: 0 0 14px ${color};
          "
        ></div>

        <div
          style="
            position: relative;
            z-index: 2;
            color: ${color};
            font-size: 14px;
            font-weight: 900;
            transform: rotate(-45deg);
            font-family: monospace;
          "
        >
          UAV
        </div>
      </div>
    `,
  });
}

function createInfrastructureKey(
  feature: InfrastructureCollection["features"][number]
) {
  const type = feature.properties.type;
  const name = feature.properties.name.toLowerCase().trim();
  const [longitude, latitude] = feature.geometry.coordinates;

  return `${type}-${name}-${longitude.toFixed(5)}-${latitude.toFixed(5)}`;
}

function mergeInfrastructureCollections(
  collections: InfrastructureCollection[]
): InfrastructureCollection {
  const seen = new Set<string>();
  const features: InfrastructureCollection["features"] = [];

  for (const collection of collections) {
    for (const feature of collection.features) {
      const key = createInfrastructureKey(feature);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      features.push(feature);
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function AeroWorldMap() {
  const { telemetry } = useUnifiedTelemetry();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const baseTileRef = useRef<TileLayer | null>(null);
  const liveDroneLayerRef = useRef<L.LayerGroup | null>(null);

  const layerRefs = useRef<Record<LayerId, Layer | null>>({
    "live-drone": null,
    drones: null,
    route: null,
    geofence: null,
    restricted: null,
    contacts: null,
    heat: null,
    home: null,
    infrastructure: null,
  });

  const [mapTheme, setMapTheme] = useState<MapTheme>("dark");
  const [layers, setLayers] = useState<LayerState>(defaultLayerState);
  const [coordinates, setCoordinates] = useState("23.02250°N · 72.57140°E");
  const [zoom, setZoom] = useState(initialMapView.zoom.toFixed(1));
  const [infrastructureCount, setInfrastructureCount] = useState(
    infrastructurePoints.features.length
  );
  const [policeStats, setPoliceStats] = useState<PoliceStats>({
    matched: 0,
    missing: 0,
    total: 0,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;
    let infrastructureTimer: number | undefined;

    const worldBounds = createWorldBounds();

    const map = L.map(containerRef.current, {
      center: [initialMapView.latitude, initialMapView.longitude],
      zoom: Math.max(initialMapView.zoom, 2),
      minZoom: 2,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: false,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
    });

    L.control
      .attribution({
        position: "bottomright",
        prefix: false,
      })
      .addTo(map);

    mapRef.current = map;

    const baseLayer = L.tileLayer(baseMaps[mapTheme].url, {
      minZoom: 2,
      maxZoom: 19,
      noWrap: true,
      bounds: worldBounds,
      attribution: baseMaps[mapTheme].attribution,
    });

    baseLayer.addTo(map);
    baseTileRef.current = baseLayer;

    const liveDroneLayer = L.layerGroup().addTo(map);
    liveDroneLayerRef.current = liveDroneLayer;

    const geofenceLayer = L.geoJSON(geofenceZone, {
      style: {
        color: mapColors.geofenceBoundary,
        weight: 2.5,
        dashArray: "6 6",
        fillColor: mapColors.geofenceFill,
        fillOpacity: 0.1,
      },
      onEachFeature: (feature, layer) => {
        const name = escapeHtml(feature.properties?.name ?? "Mission Geofence");
        layer.bindPopup(`<b>${name}</b><br/>Mission operation boundary`);
      },
    }).addTo(map);

    const restrictedLayer = L.geoJSON(restrictedZones, {
      style: {
        color: mapColors.restrictedBoundary,
        weight: 2,
        fillColor: mapColors.restrictedFill,
        fillOpacity: 0.18,
      },
      onEachFeature: (feature, layer) => {
        const name = escapeHtml(feature.properties?.name ?? "Restricted Zone");
        layer.bindPopup(`<b>${name}</b><br/>No-fly / restricted area`);
      },
    }).addTo(map);

    const routeLayer = L.geoJSON(missionRoute, {
      style: {
        color: mapColors.route,
        weight: 4,
        dashArray: "5 5",
      },
      onEachFeature: (feature, layer) => {
        const name = escapeHtml(feature.properties?.name ?? "Mission Route");
        layer.bindPopup(`<b>${name}</b><br/>Planned autonomous route`);
      },
    }).addTo(map);

    const heatLayer = L.geoJSON(heatScanPoints, {
      pointToLayer: (_feature, latlng) =>
        L.circle(latlng, {
          radius: 450,
          color: mapColors.heat,
          fillColor: mapColors.heat,
          fillOpacity: 0.22,
          weight: 0,
        }),
    }).addTo(map);

    const homeLayer = L.geoJSON(homePoint, {
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 9,
          color: mapColors.mapStroke,
          weight: 2,
          fillColor: mapColors.home,
          fillOpacity: 1,
        }),
      onEachFeature: (feature, layer) => {
        const name = escapeHtml(feature.properties?.name ?? "HOME");
        layer.bindPopup(`<b>${name}</b><br/>Launch / return point`);
      },
    }).addTo(map);

    const contactLayer = L.geoJSON(contactPoints, {
      pointToLayer: (feature, latlng) => {
        const name = escapeHtml(feature.properties?.name ?? "Contact");
        const type = escapeHtml(feature.properties?.type ?? "Unknown");
        const confidence = escapeHtml(
          String(feature.properties?.confidence ?? "N/A")
        );

        return L.circleMarker(latlng, {
          radius: 8,
          color: "#ffffff",
          weight: 1,
          fillColor: mapColors.contact,
          fillOpacity: 1,
        }).bindPopup(
          `<b>${name}</b><br/>
          Type: ${type}<br/>
          Confidence: ${confidence}`
        );
      },
    }).addTo(map);

    const infrastructureLayer = L.geoJSON(infrastructurePoints, {
      pointToLayer: (feature, latlng) => {
        const type = normalizeInfrastructureType(feature.properties?.type);
        const priority = normalizePriority(feature.properties?.priority);
        const style = getInfrastructureStyle(type);
        const name = escapeHtml(
          feature.properties?.name ?? "Infrastructure Node"
        );

        return L.marker(latlng, {
          icon: createInfrastructureIcon(type, priority),
        }).bindPopup(
          `<b>${name}</b><br/>
          Category: ${style.label}<br/>
          Priority: ${priority.toUpperCase()}`
        );
      },
    }).addTo(map);

    const droneLayer = L.geoJSON(dronePoints, {
      pointToLayer: (feature, latlng) => {
        const name = escapeHtml(feature.properties?.name ?? "Drone");
        const status = escapeHtml(String(feature.properties?.status ?? "N/A"));
        const battery = escapeHtml(
          String(feature.properties?.battery ?? "N/A")
        );
        const altitude = escapeHtml(
          String(feature.properties?.altitude ?? "N/A")
        );

        return L.circleMarker(latlng, {
          radius: 9,
          color: mapColors.mapStroke,
          weight: 2,
          fillColor: mapColors.drone,
          fillOpacity: 1,
        }).bindPopup(
          `<b>${name}</b><br/>
          Status: ${status}<br/>
          Battery: ${battery}<br/>
          Altitude: ${altitude}`
        );
      },
    }).addTo(map);

    layerRefs.current = {
      "live-drone": liveDroneLayer,
      drones: droneLayer,
      route: routeLayer,
      geofence: geofenceLayer,
      restricted: restrictedLayer,
      contacts: contactLayer,
      heat: heatLayer,
      home: homeLayer,
      infrastructure: infrastructureLayer,
    };

    async function loadInfrastructureFromMapBounds() {
      if (map.getZoom() < 10) {
        if (!isMounted) return;

        infrastructureLayer.clearLayers();
        infrastructureLayer.addData(infrastructurePoints);
        setInfrastructureCount(infrastructurePoints.features.length);

        return;
      }

      let liveInfrastructure: InfrastructureCollection = infrastructurePoints;

      try {
        const bounds = map.getBounds();

        liveInfrastructure = await fetchInfrastructureFromOverpass({
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        });
      } catch (error) {
        console.error("Failed to load live infrastructure data:", error);
      }

      let officialPoliceInfrastructure: InfrastructureCollection = {
        type: "FeatureCollection",
        features: [],
      };

      try {
        const officialPolice =
          await fetchOfficialAhmedabadPoliceFromOverpass();

        officialPoliceInfrastructure =
          officialPolice.collection as InfrastructureCollection;

        if (isMounted) {
          setPoliceStats({
            matched: officialPolice.matched,
            missing: officialPolice.missing.length,
            total: officialPolice.total,
          });
        }
      } catch (error) {
        console.error("Failed to load official Ahmedabad police data:", error);
      }

      if (!isMounted) return;

      const mergedInfrastructure = mergeInfrastructureCollections([
        liveInfrastructure,
        officialPoliceInfrastructure,
      ]);

      infrastructureLayer.clearLayers();
      infrastructureLayer.addData(mergedInfrastructure);
      setInfrastructureCount(mergedInfrastructure.features.length);
    }

    function scheduleInfrastructureLoad() {
      window.clearTimeout(infrastructureTimer);

      infrastructureTimer = window.setTimeout(() => {
        void loadInfrastructureFromMapBounds();
      }, 900);
    }

    void loadInfrastructureFromMapBounds();

    map.on("moveend", scheduleInfrastructureLoad);

    map.on("mousemove", (event) => {
      setCoordinates(
        `${event.latlng.lat.toFixed(5)}°N · ${event.latlng.lng.toFixed(5)}°E`
      );
    });

    map.on("zoomend", () => {
      setZoom(map.getZoom().toFixed(1));
    });

    const resizeOne = window.setTimeout(() => map.invalidateSize(), 100);
    const resizeTwo = window.setTimeout(() => map.invalidateSize(), 500);
    const resizeThree = window.setTimeout(() => map.invalidateSize(), 1000);

    return () => {
      isMounted = false;
      window.clearTimeout(resizeOne);
      window.clearTimeout(resizeTwo);
      window.clearTimeout(resizeThree);
      window.clearTimeout(infrastructureTimer);
      map.off("moveend", scheduleInfrastructureLoad);
      map.remove();
      mapRef.current = null;
      baseTileRef.current = null;
      liveDroneLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const layerId of Object.keys(layers) as LayerId[]) {
      const layer = layerRefs.current[layerId];
      if (!layer) continue;

      if (layers[layerId]) {
        if (!map.hasLayer(layer)) {
          layer.addTo(map);
        }
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  }, [layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const worldBounds = createWorldBounds();

    if (baseTileRef.current) {
      map.removeLayer(baseTileRef.current);
    }

    const nextBaseLayer = L.tileLayer(baseMaps[mapTheme].url, {
      minZoom: 2,
      maxZoom: 19,
      noWrap: true,
      bounds: worldBounds,
      attribution: baseMaps[mapTheme].attribution,
    });

    nextBaseLayer.addTo(map);
    nextBaseLayer.bringToBack();
    baseTileRef.current = nextBaseLayer;
  }, [mapTheme]);

  useEffect(() => {
    const map = mapRef.current;
    const liveDroneLayer = liveDroneLayerRef.current;

    if (!map || !liveDroneLayer) return;

    liveDroneLayer.clearLayers();

    if (!telemetry?.gps) {
      return;
    }

    const latitude = telemetry.gps.lat;
    const longitude = telemetry.gps.lng;
    const risk = telemetry.risk ?? "low";
    const deviceName = escapeHtml(telemetry.device ?? "Live Drone");
    const source = escapeHtml(telemetry.source ?? "unknown");
    const battery = telemetry.battery ?? 0;
    const temperature = telemetry.temperature ?? 0;
    const smoke = telemetry.smoke ?? 0;
    const secureSession = telemetry.secureSession ? "ACTIVE" : "OFF";
    const riskLabel = risk.toUpperCase();

    const marker = L.marker([latitude, longitude], {
      icon: createLiveDroneIcon(risk),
      zIndexOffset: 1000,
    }).bindPopup(
      `<b>${deviceName}</b><br/>
      Source: ${source}<br/>
      Risk: ${riskLabel}<br/>
      Battery: ${battery}%<br/>
      Temperature: ${temperature}°C<br/>
      Smoke: ${smoke}<br/>
      Secure Session: ${secureSession}<br/>
      GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    );

    marker.addTo(liveDroneLayer);

    if (layers["live-drone"] && !map.hasLayer(liveDroneLayer)) {
      liveDroneLayer.addTo(map);
    }
  }, [telemetry, layers]);

  function toggleLayer(layerId: LayerId) {
    setLayers((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }));
  }

  function toggleMapTheme() {
    setMapTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function flyToWorld() {
    mapRef.current?.flyTo([22, 20], 2.4, {
      duration: 1.2,
    });
  }

  function flyToHome() {
    mapRef.current?.flyTo([23.0225, 72.5714], 15, {
      duration: 1.2,
    });
  }

  function flyToMission() {
    mapRef.current?.flyTo([23.0302, 72.5815], 14, {
      duration: 1.2,
    });
  }

  function flyToUav() {
    const liveGps = telemetry?.gps;

    if (liveGps) {
      mapRef.current?.flyTo([liveGps.lat, liveGps.lng], 16, {
        duration: 1.2,
      });

      return;
    }

    mapRef.current?.flyTo([23.0302, 72.5815], 16, {
      duration: 1.2,
    });
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded border border-(--border) bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(5,13,24,0.02),rgba(5,13,24,0.08))]" />

      <div className="absolute left-3 top-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--primary)">
          <Globe2 size={14} />
          AERONEXUS WORLD OPS MAP
        </div>

        <div className="mt-1 text-hud text-[9px] text-(--muted)">
          {baseMaps[mapTheme].label.toUpperCase()} · WGS-84 · NO WORLD WRAP ·
          ZOOM {zoom} · INFRA {infrastructureCount} · POLICE{" "}
          {policeStats.matched}/{policeStats.total} · MISS{" "}
          {policeStats.missing} · LIVE{" "}
          {telemetry?.gps ? "GPS LOCK" : "NO GPS"}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 w-52 rounded border border-(--border) bg-[#050d18]/90 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Layers size={14} className="text-(--primary)" />
          Map Layers
        </div>

        <button
          onClick={toggleMapTheme}
          className="mb-2 flex w-full items-center justify-between rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-2 py-1.5 text-hud text-[9px] text-(--primary)"
        >
          <span className="flex items-center gap-1.5">
            {mapTheme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
            Map Theme
          </span>
          <span>{mapTheme === "dark" ? "Dark" : "Detailed"}</span>
        </button>

        <div className="space-y-1.5">
          {layerButtons.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-hud text-[9px] transition ${
                layers[layer.id]
                  ? "border-(--primary) bg-[rgba(246,178,60,0.08)] text-(--primary)"
                  : "border-(--border) bg-[#081320] text-(--muted)"
              }`}
            >
              <span>{layer.label}</span>
              <span>{layers[layer.id] ? "ON" : "OFF"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Crosshair size={14} className="text-(--primary)" />
          {coordinates}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex gap-2">
        <button
          onClick={flyToWorld}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--primary)"
        >
          <Globe2 size={14} />
          World
        </button>

        <button
          onClick={flyToHome}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--nominal)"
        >
          <Home size={14} />
          Home
        </button>

        <button
          onClick={flyToMission}
          className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90"
        >
          <Plane size={14} />
          Mission
        </button>

        <button
          onClick={flyToUav}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--primary)"
        >
          <LocateFixed size={14} />
          UAV
        </button>
      </div>
    </div>
  );
}