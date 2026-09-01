import { useEffect, useRef, useState } from "react";
import L, { type Layer, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

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

type BaseMapId = "openstreetmap" | "hot";

const baseMaps: Record<
  BaseMapId,
  {
    label: string;
    shortLabel: string;
    url: string;
    attribution: string;
  }
> = {
  openstreetmap: {
    label: "OpenStreetMap",
    shortLabel: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  hot: {
    label: "OpenStreetMap HOT",
    shortLabel: "HOT",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors · HOT",
  },
};

const mapColors = {
  route: "#050505",
  routeHalo: "rgba(255,255,255,0.9)",
  waypoint: "#f6b23c",
  selectedWaypoint: "#49e58f",
  home: "#49e58f",
  geofence: "#009933",
  restricted: "#ff4d4d",
  stroke: "#050d18",
};

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

  return L.divIcon({
    className: "aeronexus-waypoint-marker",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    html: `
      <div
        style="
          width: 34px;
          height: 34px;
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
          box-shadow: 0 0 16px ${color}88;
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
          font-size: 10px;
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
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const waypointLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const waypointsRef = useRef(waypoints);
  const onWaypointsChangeRef = useRef(onWaypointsChange);
  const onSelectWaypointRef = useRef(onSelectWaypoint);

  const [baseMapId, setBaseMapId] = useState<BaseMapId>("openstreetmap");
  const [coordinates, setCoordinates] = useState("23.02250°N · 72.57140°E");
  const [zoom, setZoom] = useState(Math.max(initialMapView.zoom, 15));

  useEffect(() => {
    waypointsRef.current = waypoints;
    onWaypointsChangeRef.current = onWaypointsChange;
    onSelectWaypointRef.current = onSelectWaypoint;
  }, [waypoints, onWaypointsChange, onSelectWaypoint]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const baseMap = baseMaps[baseMapId];

    baseTileLayerRef.current = L.tileLayer(baseMap.url, {
      minZoom: 11,
      maxZoom: 19,
      attribution: baseMap.attribution,
    }).addTo(map);
  }, [baseMapId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialMapView.latitude, initialMapView.longitude],
      zoom: Math.max(initialMapView.zoom, 15),
      minZoom: 11,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: false,
    });

    mapRef.current = map;

    L.control
      .attribution({
        position: "bottomright",
        prefix: false,
      })
      .addTo(map);

    baseTileLayerRef.current = L.tileLayer(baseMaps.openstreetmap.url, {
      minZoom: 11,
      maxZoom: 19,
      attribution: baseMaps.openstreetmap.attribution,
    }).addTo(map);

    const staticLayers: Layer[] = [];

    const geofenceLayer = L.geoJSON(geofenceZone, {
      style: {
        color: mapColors.geofence,
        weight: 2.5,
        dashArray: "6 6",
        fillColor: mapColors.geofence,
        fillOpacity: 0.06,
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          `<b>${escapeHtml(
            feature.properties?.name ?? "Mission Geofence"
          )}</b><br/>Operational mission boundary`
        );
      },
    }).addTo(map);

    staticLayers.push(geofenceLayer);

    const restrictedLayer = L.geoJSON(restrictedZones, {
      style: {
        color: mapColors.restricted,
        weight: 2,
        fillColor: mapColors.restricted,
        fillOpacity: 0.16,
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          `<b>${escapeHtml(
            feature.properties?.name ?? "Restricted Zone"
          )}</b><br/>Mission route should avoid this zone`
        );
      },
    }).addTo(map);

    staticLayers.push(restrictedLayer);

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

    staticLayers.push(homeLayer);

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
      setZoom(Number(map.getZoom().toFixed(1)));
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
      baseTileLayerRef.current = null;
      waypointLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

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
        color: mapColors.routeHalo,
        weight: 8,
        opacity: 0.95,
        dashArray: "1 13",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(routeLayer);

      L.polyline(routeCoordinates, {
        color: mapColors.route,
        weight: 4,
        opacity: 1,
        dashArray: "1 13",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(routeLayer);
    }

    waypoints.forEach((waypoint, index) => {
      const selected = waypoint.id === selectedWaypointId;

      const marker = L.marker([waypoint.lat, waypoint.lng], {
        icon: createWaypointIcon(index, selected),
        draggable: true,
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

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded-xl border border-[#1d2533] bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-[calc(100%-2rem)] rounded-lg border border-[#1d2533] bg-[#050d18]/92 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-(--primary)">
            Aeronexus Open Mission Planner
          </div>

          <div className="rounded-full border border-[#243147] bg-black px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-(--muted)">
            OpenStreetMap
          </div>
        </div>

        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-(--muted)">
          Click to add waypoint · Drag marker to edit route · Black dotted
          route line
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 w-[13.5rem] rounded-lg border border-[#1d2533] bg-[#050d18]/94 p-3 backdrop-blur">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-(--foreground)">
          Planner Map
        </div>

        <button
          type="button"
          onClick={() =>
            setBaseMapId((current) =>
              current === "openstreetmap" ? "hot" : "openstreetmap"
            )
          }
          className="mt-3 w-full rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-3 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--primary) transition hover:bg-[rgba(246,178,60,0.12)]"
        >
          <span className="block text-[8px] text-(--muted)">Base Map</span>
          {baseMaps[baseMapId].label}
        </button>

        <div className="mt-3 grid gap-2">
          <div className="rounded border border-[#1d2533] bg-black px-3 py-2">
            <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
              Waypoints
            </div>

            <div className="mt-1 font-mono text-[18px] font-bold text-(--foreground)">
              {waypoints.length}
            </div>
          </div>

          <div className="rounded border border-[#1d2533] bg-black px-3 py-2">
            <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
              Selected
            </div>

            <div className="mt-1 truncate font-mono text-[12px] font-bold text-(--foreground)">
              {waypoints.find((waypoint) => waypoint.id === selectedWaypointId)
                ?.name ?? "None"}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-lg border border-[#1d2533] bg-[#050d18]/92 px-4 py-3 backdrop-blur">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--foreground)">
          {coordinates}
        </div>

        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-(--muted)">
          WGS-84 · Zoom {zoom}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-[#1d2533] bg-[#050d18]/92 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--muted) backdrop-blur">
          AOI
        </div>

        <div className="rounded-lg border border-[#1d2533] bg-[#050d18]/92 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--muted) backdrop-blur">
          Home
        </div>

        <div className="rounded-lg border border-[#050505] bg-[rgba(255,255,255,0.86)] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-black backdrop-blur">
          Black Dotted Route
        </div>

        <div className="rounded-lg border border-[#1d2533] bg-[#050d18]/92 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--muted) backdrop-blur">
          Selected
        </div>
      </div>
    </div>
  );
}