import { useEffect, useRef, useState } from "react";
import L, { type GeoJSON, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Crosshair,
  Globe2,
  Home,
  Layers,
  LocateFixed,
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

type LayerId =
  | "drones"
  | "route"
  | "geofence"
  | "restricted"
  | "contacts"
  | "heat"
  | "home";

type LayerState = Record<LayerId, boolean>;

const defaultLayerState: LayerState = {
  drones: true,
  route: true,
  geofence: true,
  restricted: true,
  contacts: true,
  heat: true,
  home: true,
};

const layerButtons: { id: LayerId; label: string }[] = [
  { id: "drones", label: "Drones" },
  { id: "route", label: "Mission Route" },
  { id: "geofence", label: "Geofence" },
  { id: "restricted", label: "Restricted" },
  { id: "contacts", label: "Contacts" },
  { id: "heat", label: "Heat Scan" },
  { id: "home", label: "Home" },
];

export function AeroWorldMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const layerRefs = useRef<Record<LayerId, GeoJSON | L.LayerGroup | null>>({
    drones: null,
    route: null,
    geofence: null,
    restricted: null,
    contacts: null,
    heat: null,
    home: null,
  });

  const [layers, setLayers] = useState<LayerState>(defaultLayerState);
  const [coordinates, setCoordinates] = useState("23.02250°N · 72.57140°E");
  const [zoom, setZoom] = useState(initialMapView.zoom.toFixed(1));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialMapView.latitude, initialMapView.longitude],
      zoom: initialMapView.zoom,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const geofenceLayer = L.geoJSON(geofenceZone, {
      style: {
        color: "#f6b23c",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#f6b23c",
        fillOpacity: 0.08,
      },
    }).addTo(map);

    const restrictedLayer = L.geoJSON(restrictedZones, {
      style: {
        color: "#ff4d4d",
        weight: 2,
        fillColor: "#ff4d4d",
        fillOpacity: 0.18,
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name ?? "Restricted Zone";
        layer.bindPopup(`<b>${name}</b><br/>No-fly / restricted area`);
      },
    }).addTo(map);

    const routeLayer = L.geoJSON(missionRoute, {
      style: {
        color: "#29d3ff",
        weight: 4,
        dashArray: "5 5",
      },
    }).addTo(map);

    const heatLayer = L.geoJSON(heatScanPoints, {
      pointToLayer: (_feature, latlng) =>
        L.circle(latlng, {
          radius: 450,
          color: "#ff4d4d",
          fillColor: "#ff4d4d",
          fillOpacity: 0.22,
          weight: 0,
        }),
    }).addTo(map);

    const homeLayer = L.geoJSON(homePoint, {
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 9,
          color: "#050d18",
          weight: 2,
          fillColor: "#49e58f",
          fillOpacity: 1,
        }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name ?? "HOME";
        layer.bindPopup(`<b>${name}</b><br/>Launch / return point`);
      },
    }).addTo(map);

    const contactLayer = L.geoJSON(contactPoints, {
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 8,
          color: "#ffffff",
          weight: 1,
          fillColor: "#ff4d4d",
          fillOpacity: 1,
        }).bindPopup(
          `<b>${feature.properties?.name ?? "Contact"}</b><br/>
          Type: ${feature.properties?.type ?? "Unknown"}<br/>
          Confidence: ${feature.properties?.confidence ?? "N/A"}`
        ),
    }).addTo(map);

    const droneLayer = L.geoJSON(dronePoints, {
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 9,
          color: "#050d18",
          weight: 2,
          fillColor: "#f6b23c",
          fillOpacity: 1,
        }).bindPopup(
          `<b>${feature.properties?.name ?? "Drone"}</b><br/>
          Status: ${feature.properties?.status ?? "N/A"}<br/>
          Battery: ${feature.properties?.battery ?? "N/A"}<br/>
          Altitude: ${feature.properties?.altitude ?? "N/A"}`
        ),
    }).addTo(map);

    layerRefs.current = {
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

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    setTimeout(() => {
      map.invalidateSize();
    }, 500);

    setTimeout(() => {
      map.invalidateSize();
    }, 1000);

    return () => {
      map.remove();
      mapRef.current = null;
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
      } else {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      }
    }
  }, [layers]);

  function toggleLayer(layerId: LayerId) {
    setLayers((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }));
  }

  function flyToWorld() {
    mapRef.current?.flyTo([22, 20], 2, {
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
    mapRef.current?.flyTo([23.0302, 72.5815], 16, {
      duration: 1.2,
    });
  }

  return (
    <div className="relative h-full min-h-155 overflow-hidden rounded border border-(--border) bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(5,13,24,0.02),rgba(5,13,24,0.08))]" />

      <div className="absolute left-3 top-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--primary)">
          <Globe2 size={14} />
          AERONEXUS WORLD OPS MAP
        </div>

        <div className="mt-1 text-hud text-[9px] text-(--muted)">
          OSM · WGS-84 · LIVE SIMULATION · ZOOM {zoom}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 w-52 rounded border border-(--border) bg-[#050d18]/90 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Layers size={14} className="text-(--primary)" />
          Map Layers
        </div>

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