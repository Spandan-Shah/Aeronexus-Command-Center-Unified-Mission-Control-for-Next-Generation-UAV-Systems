import { useEffect, useRef } from "react";
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

const mapColors = {
  route: "#29d3ff",
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
          background: rgba(5, 13, 24, 0.94);
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
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: `
      <div
        style="
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: rgba(5, 13, 24, 0.94);
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
  const waypointLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const waypointsRef = useRef(waypoints);
  const onWaypointsChangeRef = useRef(onWaypointsChange);
  const onSelectWaypointRef = useRef(onSelectWaypoint);

  useEffect(() => {
    waypointsRef.current = waypoints;
    onWaypointsChangeRef.current = onWaypointsChange;
    onSelectWaypointRef.current = onSelectWaypoint;
  }, [waypoints, onWaypointsChange, onSelectWaypoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialMapView.latitude, initialMapView.longitude],
      zoom: Math.max(initialMapView.zoom, 13),
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

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        minZoom: 11,
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors © CARTO",
      }
    ).addTo(map);

    const staticLayers: Layer[] = [];

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

    staticLayers.push(geofenceLayer);

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
        event.latlng.lat,
        event.latlng.lng,
        waypointsRef.current.length + 1
      );

      onWaypointsChangeRef.current([...waypointsRef.current, nextWaypoint]);
      onSelectWaypointRef.current(nextWaypoint.id);
    });

    const resizeOne = window.setTimeout(() => map.invalidateSize(), 100);
    const resizeTwo = window.setTimeout(() => map.invalidateSize(), 500);

    return () => {
      window.clearTimeout(resizeOne);
      window.clearTimeout(resizeTwo);
      map.remove();
      mapRef.current = null;
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
        color: mapColors.route,
        weight: 4,
        dashArray: "7 7",
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
    <div className="relative h-full min-h-[520px] overflow-hidden rounded border border-(--border) bg-[#050d18]">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="text-hud text-[10px] text-(--primary)">
          MISSION PLANNING MAP
        </div>
        <div className="mt-1 text-hud text-[9px] text-(--muted)">
          Click map to add waypoint · Drag marker to adjust route
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded border border-(--border) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
        <div className="text-hud text-[10px] text-(--foreground)">
          Waypoints: {waypoints.length}
        </div>
      </div>
    </div>
  );
}