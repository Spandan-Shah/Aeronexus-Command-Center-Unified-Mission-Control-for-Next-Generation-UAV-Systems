import { useEffect, useRef, useState } from "react";
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
  MapPinned,
  Plane,
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
import { useUnifiedTelemetry } from "../../hooks/useUnifiedTelemetry";

type LayerId =
  | "live-drone"
  | "drones"
  | "route"
  | "geofence"
  | "restricted"
  | "contacts"
  | "heat"
  | "home";

type LayerState = Record<LayerId, boolean>;

type BaseMapId = "osm" | "hot";

const defaultLayerState: LayerState = {
  "live-drone": true,
  drones: true,
  route: true,
  geofence: true,
  restricted: true,
  contacts: true,
  heat: true,
  home: true,
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
];

const baseMaps: Record<
  BaseMapId,
  {
    label: string;
    url: string;
    attribution: string;
  }
> = {
  osm: {
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  hot: {
    label: "OSM Humanitarian",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors · HOT",
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
  mapStroke: "#050d18",
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

function getRiskColor(risk?: string) {
  if (risk === "critical") return "#ff4d4d";
  if (risk === "high") return "#f6b23c";
  if (risk === "medium") return "#29d3ff";
  return "#49e58f";
}

function createLiveDroneIcon(risk?: string) {
  const color = getRiskColor(risk);

  return L.divIcon({
    className: "aeronexus-live-drone-marker",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -23],
    html: `
      <div
        style="
          position: relative;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <div
          style="
            position: absolute;
            width: 46px;
            height: 46px;
            border-radius: 999px;
            background: ${color}22;
            border: 1px solid ${color};
            box-shadow: 0 0 22px ${color}99;
          "
        ></div>

        <div
          style="
            position: absolute;
            width: 23px;
            height: 23px;
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
            font-size: 13px;
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
  });

  const [baseMapId, setBaseMapId] = useState<BaseMapId>("osm");
  const [layers, setLayers] = useState<LayerState>(defaultLayerState);
  const [coordinates, setCoordinates] = useState("23.02250°N · 72.57140°E");
  const [zoom, setZoom] = useState(initialMapView.zoom.toFixed(1));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

    const baseLayer = L.tileLayer(baseMaps[baseMapId].url, {
      minZoom: 2,
      maxZoom: 19,
      noWrap: true,
      bounds: worldBounds,
      attribution: baseMaps[baseMapId].attribution,
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
    };

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
      window.clearTimeout(resizeOne);
      window.clearTimeout(resizeTwo);
      window.clearTimeout(resizeThree);
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

    const nextBaseLayer = L.tileLayer(baseMaps[baseMapId].url, {
      minZoom: 2,
      maxZoom: 19,
      noWrap: true,
      bounds: worldBounds,
      attribution: baseMaps[baseMapId].attribution,
    });

    nextBaseLayer.addTo(map);
    nextBaseLayer.bringToBack();
    baseTileRef.current = nextBaseLayer;
  }, [baseMapId]);

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

  function flyToAoi() {
    mapRef.current?.flyTo([23.0225, 72.5714], 11.5, {
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

    flyToMission();
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded border border-(--border) bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(5,13,24,0.02),rgba(5,13,24,0.08))]" />

      <div className="absolute left-3 top-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--primary)">
          <Globe2 size={14} />
          AERONEXUS OPEN LIVE OPS MAP
        </div>

        <div className="mt-1 text-hud text-[9px] text-(--muted)">
          {baseMaps[baseMapId].label.toUpperCase()} · OPENSTREETMAP · WGS-84 ·
          ZOOM {zoom} · LIVE {telemetry?.gps ? "GPS LOCK" : "NO GPS"}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 w-52 rounded border border-(--border) bg-[#050d18]/90 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Layers size={14} className="text-(--primary)" />
          Map Layers
        </div>

        <button
          type="button"
          onClick={() =>
            setBaseMapId((current) => (current === "osm" ? "hot" : "osm"))
          }
          className="mb-2 flex w-full items-center justify-between rounded border border-(--primary) bg-[rgba(41,211,255,0.08)] px-2 py-1.5 text-hud text-[9px] text-(--primary)"
        >
          <span>Base Map</span>
          <span>{baseMaps[baseMapId].label}</span>
        </button>

        <div className="space-y-1.5">
          {layerButtons.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
              className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-hud text-[9px] transition ${
                layers[layer.id]
                  ? "border-(--primary) bg-[rgba(41,211,255,0.08)] text-(--primary)"
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
          type="button"
          onClick={flyToAoi}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--primary)"
        >
          <MapPinned size={14} />
          AOI
        </button>

        <button
          type="button"
          onClick={flyToHome}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--nominal)"
        >
          <Home size={14} />
          Home
        </button>

        <button
          type="button"
          onClick={flyToMission}
          className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90"
        >
          <Plane size={14} />
          Mission
        </button>

        <button
          type="button"
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