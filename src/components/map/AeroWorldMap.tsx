import { useEffect, useRef, useState } from "react";
import maplibregl, {
  NavigationControl,
  ScaleControl,
  type Map,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, Globe2, Home, Layers, LocateFixed, Plane } from "lucide-react";
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

const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-base",
      type: "raster",
      source: "osm",
    },
  ],
};

const layerGroups = [
  {
    id: "drones",
    label: "Drones",
    layers: ["drone-pulse-layer", "drone-layer", "drone-label-layer"],
  },
  {
    id: "route",
    label: "Mission Route",
    layers: ["mission-route-layer"],
  },
  {
    id: "geofence",
    label: "Geofence",
    layers: ["geofence-fill-layer", "geofence-line-layer"],
  },
  {
    id: "restricted",
    label: "Restricted",
    layers: ["restricted-fill-layer", "restricted-line-layer", "restricted-label-layer"],
  },
  {
    id: "contacts",
    label: "Contacts",
    layers: ["contact-layer", "contact-label-layer"],
  },
  {
    id: "heat",
    label: "Heat Scan",
    layers: ["heat-layer"],
  },
  {
    id: "home",
    label: "Home",
    layers: ["home-layer", "home-label-layer"],
  },
];

type LayerState = Record<string, boolean>;

const defaultLayerState: LayerState = {
  drones: true,
  route: true,
  geofence: true,
  restricted: true,
  contacts: true,
  heat: true,
  home: true,
};

export function AeroWorldMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const [layers, setLayers] = useState<LayerState>(defaultLayerState);
  const [coordinates, setCoordinates] = useState("23.0225°N · 72.5714°E");
  const [zoom, setZoom] = useState(initialMapView.zoom.toFixed(1));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: osmStyle,
      center: [initialMapView.longitude, initialMapView.latitude],
      zoom: initialMapView.zoom,
      pitch: initialMapView.pitch,
      bearing: initialMapView.bearing,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    map.addControl(
      new ScaleControl({
        maxWidth: 120,
        unit: "metric",
      }),
      "bottom-left"
    );

    map.on("mousemove", (event) => {
      setCoordinates(
        `${event.lngLat.lat.toFixed(5)}°N · ${event.lngLat.lng.toFixed(5)}°E`
      );
    });

    map.on("zoom", () => {
      setZoom(map.getZoom().toFixed(1));
    });

    map.on("load", () => {
      map.addSource("drones-source", {
        type: "geojson",
        data: dronePoints,
      });

      map.addSource("home-source", {
        type: "geojson",
        data: homePoint,
      });

      map.addSource("mission-route-source", {
        type: "geojson",
        data: missionRoute,
      });

      map.addSource("geofence-source", {
        type: "geojson",
        data: geofenceZone,
      });

      map.addSource("restricted-source", {
        type: "geojson",
        data: restrictedZones,
      });

      map.addSource("contacts-source", {
        type: "geojson",
        data: contactPoints,
      });

      map.addSource("heat-source", {
        type: "geojson",
        data: heatScanPoints,
      });

      map.addLayer({
        id: "geofence-fill-layer",
        type: "fill",
        source: "geofence-source",
        paint: {
          "fill-color": "#f6b23c",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: "geofence-line-layer",
        type: "line",
        source: "geofence-source",
        paint: {
          "line-color": "#f6b23c",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      map.addLayer({
        id: "restricted-fill-layer",
        type: "fill",
        source: "restricted-source",
        paint: {
          "fill-color": "#ff4d4d",
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "restricted-line-layer",
        type: "line",
        source: "restricted-source",
        paint: {
          "line-color": "#ff4d4d",
          "line-width": 2,
        },
      });

      map.addLayer({
        id: "restricted-label-layer",
        type: "symbol",
        source: "restricted-source",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 0],
        },
        paint: {
          "text-color": "#ff4d4d",
          "text-halo-color": "#050d18",
          "text-halo-width": 2,
        },
      });

      map.addLayer({
        id: "mission-route-layer",
        type: "line",
        source: "mission-route-source",
        paint: {
          "line-color": "#29d3ff",
          "line-width": 4,
          "line-dasharray": [1, 1],
        },
      });

      map.addLayer({
        id: "heat-layer",
        type: "circle",
        source: "heat-source",
        paint: {
          "circle-radius": 38,
          "circle-color": "#ff4d4d",
          "circle-opacity": 0.25,
          "circle-blur": 0.8,
        },
      });

      map.addLayer({
        id: "home-layer",
        type: "circle",
        source: "home-source",
        paint: {
          "circle-radius": 8,
          "circle-color": "#49e58f",
          "circle-stroke-color": "#050d18",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "home-label-layer",
        type: "symbol",
        source: "home-source",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.4],
        },
        paint: {
          "text-color": "#49e58f",
          "text-halo-color": "#050d18",
          "text-halo-width": 2,
        },
      });

      map.addLayer({
        id: "contact-layer",
        type: "circle",
        source: "contacts-source",
        paint: {
          "circle-radius": 7,
          "circle-color": "#ff4d4d",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });

      map.addLayer({
        id: "contact-label-layer",
        type: "symbol",
        source: "contacts-source",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.4],
        },
        paint: {
          "text-color": "#ff4d4d",
          "text-halo-color": "#050d18",
          "text-halo-width": 2,
        },
      });

      map.addLayer({
        id: "drone-pulse-layer",
        type: "circle",
        source: "drones-source",
        paint: {
          "circle-radius": 18,
          "circle-color": "#f6b23c",
          "circle-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "drone-layer",
        type: "circle",
        source: "drones-source",
        paint: {
          "circle-radius": 7,
          "circle-color": "#f6b23c",
          "circle-stroke-color": "#050d18",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "drone-label-layer",
        type: "symbol",
        source: "drones-source",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.4],
        },
        paint: {
          "text-color": "#f6b23c",
          "text-halo-color": "#050d18",
          "text-halo-width": 2,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const group of layerGroups) {
      for (const layerId of group.layers) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(
            layerId,
            "visibility",
            layers[group.id] ? "visible" : "none"
          );
        }
      }
    }
  }, [layers]);

  function toggleLayer(layerId: string) {
    setLayers((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }));
  }

  function flyToMission() {
    mapRef.current?.easeTo({
      center: [72.5815, 23.0302],
      zoom: 13.6,
      pitch: 55,
      bearing: -30,
      duration: 1200,
    });
  }

  function flyToHome() {
    mapRef.current?.easeTo({
      center: [72.5714, 23.0225],
      zoom: 14,
      pitch: 45,
      bearing: -25,
      duration: 1200,
    });
  }

  function flyToWorld() {
    mapRef.current?.easeTo({
      center: [20, 22],
      zoom: 1.7,
      pitch: 0,
      bearing: 0,
      duration: 1200,
    });
  }

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded border border-(--border) bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,13,24,0.15),rgba(5,13,24,0.35))]" />

      <div className="absolute left-3 top-3 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--primary)">
          <Globe2 size={14} />
          AERONEXUS WORLD OPS MAP
        </div>
        <div className="mt-1 text-hud text-[9px] text-(--muted)">
          WGS-84 · LIVE SIMULATION · ZOOM {zoom}
        </div>
      </div>

      <div className="absolute right-3 top-3 w-52 rounded border border-(--border) bg-[#050d18]/90 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Layers size={14} className="text-(--primary)" />
          Map Layers
        </div>

        <div className="space-y-1.5">
          {layerGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => toggleLayer(group.id)}
              className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-hud text-[9px] transition ${
                layers[group.id]
                  ? "border-(--primary) bg-[rgba(246,178,60,0.08)] text-(--primary)"
                  : "border-(--border) bg-[#081320] text-(--muted)"
              }`}
            >
              <span>{group.label}</span>
              <span>{layers[group.id] ? "ON" : "OFF"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Crosshair size={14} className="text-(--primary)" />
          {coordinates}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex gap-2">
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
          onClick={() => mapRef.current?.flyTo({ center: [72.5815, 23.0302], zoom: 15 })}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--primary)"
        >
          <LocateFixed size={14} />
          UAV
        </button>
      </div>
    </div>
  );
}
