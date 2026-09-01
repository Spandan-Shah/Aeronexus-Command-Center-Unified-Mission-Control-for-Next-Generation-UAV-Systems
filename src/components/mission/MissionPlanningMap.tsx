import { useEffect, useRef, useState } from "react";
import L, {
  type Layer,
  type Map as LeafletMap,
  type TileLayer,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Crosshair,
  Home,
  Layers,
  LocateFixed,
  MapPinned,
  Plane,
  Route,
} from "lucide-react";

import {
  geofenceZone,
  homePoint,
  initialMapView,
  restrictedZones,
} from "../../data/worldMap";
import {
  createDefaultWaypoint,
  type MissionWaypoint,
} from "../../utils/missionAnalytics";

type MissionPlanningMapProps = {
  waypoints: MissionWaypoint[];
  selectedWaypointId: string | null;
  onWaypointsChange: (waypoints: MissionWaypoint[]) => void;
  onSelectWaypoint: (waypointId: string | null) => void;
};

type BaseMapId = "osm" | "hot";

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
  route: "#29d3ff",
  waypoint: "#f6b23c",
  selectedWaypoint: "#49e58f",
  home: "#49e58f",
  geofence: "#009933",
  restricted: "#ff4d4d",
  stroke: "#050d18",
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

function createWaypointIcon(index: number, selected: boolean) {
  const color = selected ? mapColors.selectedWaypoint : mapColors.waypoint;
  const size = selected ? 38 : 34;

  return L.divIcon({
    className: "aeronexus-waypoint-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `
      <div
        style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          border-radius: 999px;
          background: rgba(5, 13, 24, 0.96);
          border: 2px solid ${color};
          color: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 0 18px ${color}99;
        "
      >
        ${index + 1}
      </div>
    `,
  });
}

function createHomeIcon() {
  return L.divIcon({
    className: "aeronexus-home-marker",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
    html: `
      <div
        style="
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: rgba(5, 13, 24, 0.96);
          border: 2px solid ${mapColors.home};
          color: ${mapColors.home};
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: monospace;
          font-size: 9px;
          font-weight: 900;
          box-shadow: 0 0 16px ${mapColors.home}88;
        "
      >
        HOME
      </div>
    `,
  });
}

export function MissionPlanningMap({
  waypoints,
  selectedWaypointId,
  onWaypointsChange,
  onSelectWaypoint,
}: MissionPlanningMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const baseTileRef = useRef<TileLayer | null>(null);
  const waypointLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const waypointsRef = useRef(waypoints);
  const onWaypointsChangeRef = useRef(onWaypointsChange);
  const onSelectWaypointRef = useRef(onSelectWaypoint);

  const [baseMapId, setBaseMapId] = useState<BaseMapId>("osm");
  const [coordinates, setCoordinates] = useState("23.02250°N · 72.57140°E");
  const [zoom, setZoom] = useState(String(Math.max(initialMapView.zoom, 13)));

  useEffect(() => {
    waypointsRef.current = waypoints;
    onWaypointsChangeRef.current = onWaypointsChange;
    onSelectWaypointRef.current = onSelectWaypoint;
  }, [waypoints, onWaypointsChange, onSelectWaypoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const worldBounds = createWorldBounds();

    const map = L.map(containerRef.current, {
      center: [initialMapView.latitude, initialMapView.longitude],
      zoom: Math.max(initialMapView.zoom, 13),
      minZoom: 11,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: false,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
    });

    mapRef.current = map;

    L.control
      .attribution({
        position: "bottomright",
        prefix: false,
      })
      .addTo(map);

    const baseLayer = L.tileLayer(baseMaps[baseMapId].url, {
      minZoom: 11,
      maxZoom: 19,
      noWrap: true,
      bounds: worldBounds,
      attribution: baseMaps[baseMapId].attribution,
    });

    baseLayer.addTo(map);
    baseTileRef.current = baseLayer;

    const geofenceLayer = L.geoJSON(geofenceZone, {
      style: {
        color: mapColors.geofence,
        weight: 2.5,
        dashArray: "6 6",
        fillColor: mapColors.geofence,
        fillOpacity: 0.08,
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          `<b>${escapeHtml(
            feature.properties?.name ?? "Mission Geofence"
          )}</b><br/>Operational mission boundary`
        );
      },
    }).addTo(map);

    const restrictedLayer = L.geoJSON(restrictedZones, {
      style: {
        color: mapColors.restricted,
        weight: 2,
        fillColor: mapColors.restricted,
        fillOpacity: 0.18,
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          `<b>${escapeHtml(
            feature.properties?.name ?? "Restricted Zone"
          )}</b><br/>Mission route should avoid this zone`
        );
      },
    }).addTo(map);

    const homeLayer = L.geoJSON(homePoint, {
      pointToLayer: (_feature, latlng) =>
        L.marker(latlng, {
          icon: createHomeIcon(),
        }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          `<b>${escapeHtml(
            feature.properties?.name ?? "HOME"
          )}</b><br/>Launch / return point`
        );
      },
    }).addTo(map);

    const staticLayers: Layer[] = [geofenceLayer, restrictedLayer, homeLayer];
    routeLayerRef.current = L.layerGroup().addTo(map);
    waypointLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event) => {
      const nextWaypoint = createDefaultWaypoint(
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
        waypointsRef.current.length + 1
      );

      onWaypointsChangeRef.current([...waypointsRef.current, nextWaypoint]);
      onSelectWaypointRef.current(nextWaypoint.id);
    });

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

      staticLayers.forEach((layer) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });

      map.remove();
      mapRef.current = null;
      baseTileRef.current = null;
      waypointLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    const worldBounds = createWorldBounds();

    if (baseTileRef.current) {
      map.removeLayer(baseTileRef.current);
    }

    const nextBaseLayer = L.tileLayer(baseMaps[baseMapId].url, {
      minZoom: 11,
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
    const waypointLayer = waypointLayerRef.current;
    const routeLayer = routeLayerRef.current;

    if (!waypointLayer || !routeLayer) return;

    waypointLayer.clearLayers();
    routeLayer.clearLayers();

    if (waypoints.length >= 2) {
      const routeCoordinates = waypoints.map((waypoint) => [
        waypoint.lat,
        waypoint.lng,
      ]) as [number, number][];

      L.polyline(routeCoordinates, {
        color: mapColors.route,
        weight: 4,
        dashArray: "7 7",
        opacity: 0.95,
      }).addTo(routeLayer);
    }

    waypoints.forEach((waypoint, index) => {
      const selected = waypoint.id === selectedWaypointId;

      const marker = L.marker([waypoint.lat, waypoint.lng], {
        icon: createWaypointIcon(index, selected),
        draggable: true,
        zIndexOffset: selected ? 1000 : 500,
      });

      marker.bindPopup(
        `<b>${escapeHtml(waypoint.name)}</b><br/>
        Altitude: ${waypoint.altitude} m<br/>
        Speed: ${waypoint.speed} m/s<br/>
        Hold: ${waypoint.holdSeconds} sec<br/>
        Action: ${waypoint.action}`
      );

      marker.on("click", (event) => {
        event.originalEvent.stopPropagation();
        onSelectWaypoint(waypoint.id);
      });

      marker.on("dragend", () => {
        const position = marker.getLatLng();

        const updatedWaypoints = waypointsRef.current.map((current) =>
          current.id === waypoint.id
            ? {
                ...current,
                lat: Number(position.lat.toFixed(6)),
                lng: Number(position.lng.toFixed(6)),
              }
            : current
        );

        onWaypointsChangeRef.current(updatedWaypoints);
      });

      marker.addTo(waypointLayer);
    });
  }, [waypoints, selectedWaypointId, onSelectWaypoint]);

  function flyToAoi() {
    mapRef.current?.flyTo([23.0225, 72.5714], 12, {
      duration: 1.2,
    });
  }

  function flyToHome() {
    mapRef.current?.flyTo([23.0225, 72.5714], 15, {
      duration: 1.2,
    });
  }

  function flyToRoute() {
    const map = mapRef.current;

    if (!map || waypoints.length === 0) return;

    const bounds = L.latLngBounds(
      waypoints.map((waypoint) => [waypoint.lat, waypoint.lng])
    );

    map.fitBounds(bounds, {
      padding: [80, 80],
      maxZoom: 16,
    });
  }

  function flyToSelectedWaypoint() {
    const selectedWaypoint = waypoints.find(
      (waypoint) => waypoint.id === selectedWaypointId
    );

    if (!selectedWaypoint) {
      flyToRoute();
      return;
    }

    mapRef.current?.flyTo([selectedWaypoint.lat, selectedWaypoint.lng], 17, {
      duration: 1.2,
    });
  }

  return (
    <div className="relative h-full min-h-130 overflow-hidden rounded border border-(--border) bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(5,13,24,0.02),rgba(5,13,24,0.08))]" />

      <div className="absolute left-3 top-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-hud text-[10px] text-(--primary)">
          <Route size={14} />
          AERONEXUS OPEN MISSION PLANNER
        </div>

        <div className="mt-1 text-hud text-[9px] text-(--muted)">
          {baseMaps[baseMapId].label.toUpperCase()} · OPENSTREETMAP · WGS-84 ·
          ZOOM {zoom} · CLICK TO ADD WP · DRAG TO EDIT ROUTE
        </div>
      </div>

      <div className="absolute right-3 top-3 z-20 w-52 rounded border border-(--border) bg-[#050d18]/90 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-hud text-[10px] text-(--foreground)">
          <Layers size={14} className="text-(--primary)" />
          Planner Map
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

        <div className="rounded border border-(--border) bg-[#081320] p-2">
          <div className="text-hud text-[9px] text-(--muted)">Waypoints</div>
          <div className="mt-1 text-hud text-lg text-(--foreground)">
            {waypoints.length}
          </div>
        </div>

        <div className="mt-2 rounded border border-(--border) bg-[#081320] p-2">
          <div className="text-hud text-[9px] text-(--muted)">Selected</div>
          <div className="mt-1 truncate text-hud text-[10px] text-(--foreground)">
            {waypoints.find((waypoint) => waypoint.id === selectedWaypointId)
              ?.name ?? "None"}
          </div>
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
          onClick={flyToRoute}
          className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90"
        >
          <Plane size={14} />
          Route
        </button>

        <button
          type="button"
          onClick={flyToSelectedWaypoint}
          className="flex items-center gap-2 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 text-hud text-[10px] text-(--foreground) backdrop-blur hover:border-(--primary)"
        >
          <LocateFixed size={14} />
          Selected
        </button>
      </div>
    </div>
  );
}