import {
  useEffect,
  useRef,
  useState,
} from "react";

import L, {
  type Map as LeafletMap,
} from "leaflet";

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

/* =========================================================
   Props
   ========================================================= */

type MissionPlanningMapProps = {
  waypoints:
    MissionWaypoint[];

  selectedWaypointId:
    string | null;

  onWaypointsChange: (
    waypoints:
      MissionWaypoint[],
  ) => void;

  onSelectWaypoint: (
    waypointId:
      string | null,
  ) => void;
};

/* =========================================================
   Base Maps
   ========================================================= */

type BaseMapId =
  | "openstreetmap"
  | "hot";

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
    label:
      "OpenStreetMap",

    shortLabel:
      "OSM",

    url:
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors",
  },

  hot: {
    label:
      "OpenStreetMap HOT",

    shortLabel:
      "HOT",

    url:
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors · HOT",
  },
};

/* =========================================================
   MissionNexus Map Colors
   ========================================================= */

const mapColors = {
  route:
    "#5AA9FF",

  routeHalo:
    "rgba(3,4,5,0.82)",

  waypoint:
    "#5AA9FF",

  selectedWaypoint:
    "#F6B23C",

  home:
    "#59D99A",

  geofence:
    "#59D99A",

  restricted:
    "#FF5A63",

  background:
    "#030405",
};

/* =========================================================
   Helpers
   ========================================================= */

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}

function createWaypointIcon(
  index: number,
  selected: boolean,
) {
  const color =
    selected
      ? mapColors.selectedWaypoint
      : mapColors.waypoint;

  const size =
    selected
      ? 34
      : 30;

  return L.divIcon({
    className:
      "missionnexus-waypoint-marker",

    iconSize: [
      size,
      size,
    ],

    iconAnchor: [
      size / 2,
      size / 2,
    ],

    popupAnchor: [
      0,
      -(size / 2),
    ],

    html: `
      <div
        style="
          width:${size}px;
          height:${size}px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(3,4,5,0.96);
          border:${selected ? 2 : 1.5}px solid ${color};
          color:${color};
          font-family:monospace;
          font-size:10px;
          font-weight:700;
          box-shadow:${selected ? `0 0 18px ${color}66` : "none"};
        "
      >
        ${index + 1}
      </div>
    `,
  });
}

function createHomeIcon() {
  return L.divIcon({
    className:
      "missionnexus-home-marker",

    iconSize: [
      34,
      34,
    ],

    iconAnchor: [
      17,
      17,
    ],

    popupAnchor: [
      0,
      -17,
    ],

    html: `
      <div
        style="
          width:34px;
          height:34px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(3,4,5,0.96);
          border:1.5px solid ${mapColors.home};
          color:${mapColors.home};
          font-family:monospace;
          font-size:8px;
          font-weight:700;
          box-shadow:0 0 14px ${mapColors.home}44;
        "
      >
        HOME
      </div>
    `,
  });
}

/* =========================================================
   Mission Planning Map
   ========================================================= */

export function MissionPlanningMap({
  waypoints,
  selectedWaypointId,
  onWaypointsChange,
  onSelectWaypoint,
}: MissionPlanningMapProps) {
  const containerRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const mapRef =
    useRef<
      LeafletMap | null
    >(null);

  const baseTileLayerRef =
    useRef<
      L.TileLayer | null
    >(null);

  const waypointLayerRef =
    useRef<
      L.LayerGroup | null
    >(null);

  const routeLayerRef =
    useRef<
      L.LayerGroup | null
    >(null);

  const waypointsRef =
    useRef(
      waypoints,
    );

  const onWaypointsChangeRef =
    useRef(
      onWaypointsChange,
    );

  const onSelectWaypointRef =
    useRef(
      onSelectWaypoint,
    );

  const [
    baseMapId,
    setBaseMapId,
  ] =
    useState<BaseMapId>(
      "openstreetmap",
    );

  const [
    coordinates,
    setCoordinates,
  ] =
    useState(
      "23.02250°N · 72.57140°E",
    );

  const [
    zoom,
    setZoom,
  ] =
    useState(
      Math.max(
        initialMapView.zoom,
        15,
      ),
    );

  /* =======================================================
     Keep callbacks/data fresh for Leaflet handlers
     ======================================================= */

  useEffect(
    () => {
      waypointsRef.current =
        waypoints;

      onWaypointsChangeRef.current =
        onWaypointsChange;

      onSelectWaypointRef.current =
        onSelectWaypoint;
    },
    [
      waypoints,
      onWaypointsChange,
      onSelectWaypoint,
    ],
  );

  /* =======================================================
     Map Initialisation
     ======================================================= */

  useEffect(
    () => {
      if (
        !containerRef.current ||
        mapRef.current
      ) {
        return;
      }

      const map =
        L.map(
          containerRef.current,
          {
            center: [
              initialMapView.latitude,
              initialMapView.longitude,
            ],

            zoom:
              Math.max(
                initialMapView.zoom,
                15,
              ),

            minZoom:
              11,

            maxZoom:
              19,

            zoomControl:
              true,

            attributionControl:
              false,
          },
        );

      mapRef.current =
        map;

      /* Attribution */

      L.control
        .attribution({
          position:
            "bottomright",

          prefix:
            false,
        })
        .addTo(
          map,
        );

      baseTileLayerRef.current =
        L.tileLayer(
          baseMaps.openstreetmap
            .url,
          {
            minZoom:
              11,

            maxZoom:
              19,

            attribution:
              baseMaps.openstreetmap
                .attribution,
          },
        ).addTo(
          map,
        );

      /* Geofence */

      L.geoJSON(
        geofenceZone,
        {
          style: {
            color:
              mapColors.geofence,

            weight:
              2,

            dashArray:
              "7 6",

            fillColor:
              mapColors.geofence,

            fillOpacity:
              0.045,
          },

          onEachFeature:
            (
              feature,
              layer,
            ) => {
              layer.bindPopup(
                `<b>${escapeHtml(
                  feature.properties?.name ??
                    "Mission Geofence",
                )}</b><br/>Operational mission boundary`,
              );
            },
        },
      ).addTo(
        map,
      );

      /* Restricted Zones */

      L.geoJSON(
        restrictedZones,
        {
          style: {
            color:
              mapColors.restricted,

            weight:
              2,

            fillColor:
              mapColors.restricted,

            fillOpacity:
              0.11,
          },

          onEachFeature:
            (
              feature,
              layer,
            ) => {
              layer.bindPopup(
                `<b>${escapeHtml(
                  feature.properties?.name ??
                    "Restricted Zone",
                )}</b><br/>Mission route should avoid this zone`,
              );
            },
        },
      ).addTo(
        map,
      );

      /* Home */

      L.geoJSON(
        homePoint,
        {
          pointToLayer:
            (
              _feature,
              latlng,
            ) =>
              L.marker(
                latlng,
                {
                  icon:
                    createHomeIcon(),
                },
              ),

          onEachFeature:
            (
              feature,
              layer,
            ) => {
              layer.bindPopup(
                `<b>${escapeHtml(
                  feature.properties?.name ??
                    "HOME",
                )}</b><br/>Launch / return point`,
              );
            },
        },
      ).addTo(
        map,
      );

      /* Dynamic route layers */

      routeLayerRef.current =
        L.layerGroup().addTo(
          map,
        );

      waypointLayerRef.current =
        L.layerGroup().addTo(
          map,
        );

      /* Add waypoint */

      map.on(
        "click",
        (
          event,
        ) => {
          const nextWaypoint =
            createDefaultWaypoint(
              Number(
                event.latlng.lat.toFixed(
                  6,
                ),
              ),

              Number(
                event.latlng.lng.toFixed(
                  6,
                ),
              ),

              waypointsRef.current
                .length +
                1,
            );

          onWaypointsChangeRef.current(
            [
              ...waypointsRef.current,

              nextWaypoint,
            ],
          );

          onSelectWaypointRef.current(
            nextWaypoint.id,
          );
        },
      );

      /* Cursor position */

      map.on(
        "mousemove",
        (
          event,
        ) => {
          setCoordinates(
            `${event.latlng.lat.toFixed(
              5,
            )}°N · ${event.latlng.lng.toFixed(
              5,
            )}°E`,
          );
        },
      );

      /* Zoom state */

      map.on(
        "zoomend",
        () => {
          setZoom(
            Number(
              map
                .getZoom()
                .toFixed(
                  1,
                ),
            ),
          );
        },
      );

      /* Styling */

      const styleLeafletControls =
        () => {
          const root =
            containerRef.current;

          if (!root) {
            return;
          }

          const attribution =
            root.querySelector(
              ".leaflet-control-attribution",
            ) as
              | HTMLElement
              | null;

          if (
            attribution
          ) {
            attribution.style.fontSize =
              "10px";

            attribution.style.lineHeight =
              "1.35";

            attribution.style.background =
              "rgba(3,4,5,0.82)";

            attribution.style.color =
              "rgba(255,255,255,0.62)";

            attribution.style.padding =
              "3px 6px";

            attribution
              .querySelectorAll(
                "a",
              )
              .forEach(
                (
                  link,
                ) => {
                  (
                    link as HTMLElement
                  ).style.color =
                    "#8FC5FF";
                },
              );
          }
        };

      const styleTimer =
        window.setTimeout(
          styleLeafletControls,
          100,
        );

      const resizeTimers = [
        window.setTimeout(
          () =>
            map.invalidateSize(),
          100,
        ),

        window.setTimeout(
          () =>
            map.invalidateSize(),
          400,
        ),

        window.setTimeout(
          () =>
            map.invalidateSize(),
          900,
        ),
      ];

      return () => {
        window.clearTimeout(
          styleTimer,
        );

        resizeTimers.forEach(
          (
            timer,
          ) =>
            window.clearTimeout(
              timer,
            ),
        );

        map.remove();

        mapRef.current =
          null;

        baseTileLayerRef.current =
          null;

        waypointLayerRef.current =
          null;

        routeLayerRef.current =
          null;
      };
    },
    [],
  );

  /* =======================================================
     Base Map Switching
     ======================================================= */

  useEffect(
    () => {
      const map =
        mapRef.current;

      if (!map) {
        return;
      }

      if (
        baseTileLayerRef.current
      ) {
        map.removeLayer(
          baseTileLayerRef.current,
        );
      }

      const baseMap =
        baseMaps[
          baseMapId
        ];

      const layer =
        L.tileLayer(
          baseMap.url,
          {
            minZoom:
              11,

            maxZoom:
              19,

            attribution:
              baseMap.attribution,
          },
        );

      layer.addTo(
        map,
      );

      layer.bringToBack();

      baseTileLayerRef.current =
        layer;
    },
    [
      baseMapId,
    ],
  );

  /* =======================================================
     Route + Waypoints
     ======================================================= */

  useEffect(
    () => {
      const waypointLayer =
        waypointLayerRef.current;

      const routeLayer =
        routeLayerRef.current;

      if (
        !waypointLayer ||
        !routeLayer
      ) {
        return;
      }

      waypointLayer.clearLayers();

      routeLayer.clearLayers();

      /* Route line */

      if (
        waypoints.length >=
        2
      ) {
        const routeCoordinates =
          waypoints.map(
            (
              waypoint,
            ) =>
              [
                waypoint.lat,
                waypoint.lng,
              ] as [
                number,
                number,
              ],
          );

        /* Dark route halo */

        L.polyline(
          routeCoordinates,
          {
            color:
              mapColors.routeHalo,

            weight:
              7,

            opacity:
              0.88,

            lineCap:
              "round",

            lineJoin:
              "round",
          },
        ).addTo(
          routeLayer,
        );

        /* Mission route */

        L.polyline(
          routeCoordinates,
          {
            color:
              mapColors.route,

            weight:
              3,

            opacity:
              0.96,

            dashArray:
              "8 7",

            lineCap:
              "round",

            lineJoin:
              "round",
          },
        ).addTo(
          routeLayer,
        );
      }

      /* Waypoints */

      waypoints.forEach(
        (
          waypoint,
          index,
        ) => {
          const selected =
            waypoint.id ===
            selectedWaypointId;

          const marker =
            L.marker(
              [
                waypoint.lat,
                waypoint.lng,
              ],
              {
                icon:
                  createWaypointIcon(
                    index,
                    selected,
                  ),

                draggable:
                  true,
              },
            );

          marker.bindPopup(
            `<b>${escapeHtml(
              waypoint.name,
            )}</b><br/>
            Altitude: ${waypoint.altitude} m<br/>
            Speed: ${waypoint.speed} m/s<br/>
            Hold: ${waypoint.holdSeconds} sec<br/>
            Action: ${escapeHtml(
              waypoint.action,
            )}`,
          );

          marker.on(
            "click",
            (
              event,
            ) => {
              event.originalEvent.stopPropagation();

              onSelectWaypointRef.current(
                waypoint.id,
              );
            },
          );

          marker.on(
            "dragend",
            () => {
              const position =
                marker.getLatLng();

              const updatedWaypoints =
                waypointsRef.current.map(
                  (
                    current,
                  ) =>
                    current.id ===
                    waypoint.id
                      ? {
                          ...current,

                          lat:
                            Number(
                              position.lat.toFixed(
                                6,
                              ),
                            ),

                          lng:
                            Number(
                              position.lng.toFixed(
                                6,
                              ),
                            ),
                        }
                      : current,
                );

              onWaypointsChangeRef.current(
                updatedWaypoints,
              );
            },
          );

          marker.addTo(
            waypointLayer,
          );
        },
      );
    },
    [
      waypoints,
      selectedWaypointId,
    ],
  );

  /* =======================================================
     Map Utilities
     ======================================================= */

  function toggleBaseMap() {
    setBaseMapId(
      (
        current,
      ) =>
        current ===
        "openstreetmap"
          ? "hot"
          : "openstreetmap",
    );
  }

  function fitRoute() {
    const map =
      mapRef.current;

    if (
      !map ||
      waypoints.length ===
        0
    ) {
      return;
    }

    if (
      waypoints.length ===
      1
    ) {
      map.flyTo(
        [
          waypoints[0].lat,
          waypoints[0].lng,
        ],
        16,
        {
          duration:
            0.8,
        },
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        waypoints.map(
          (
            waypoint,
          ) => [
            waypoint.lat,
            waypoint.lng,
          ],
        ),
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          54,
          54,
        ],

        maxZoom:
          17,
      },
    );
  }

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#020304]">
      {/* Leaflet canvas */}

      <div
        ref={
          containerRef
        }
        className="absolute inset-0 z-0"
      />

      {/* Compact instructions */}

      <div className="pointer-events-none absolute left-3 top-3 z-[500]">
        <div className="rounded-[4px] border border-white/[0.10] bg-[rgba(3,4,5,0.88)] px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-white/58">
            Click to add · drag
            to move
          </div>
        </div>
      </div>

      {/* Map tools */}

      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-1.5">
        <button
          type="button"
          onClick={
            toggleBaseMap
          }
          className={[
            "pointer-events-auto",

            "h-[30px]",

            "rounded-[4px] border",

            "border-white/[0.12]",

            "bg-[rgba(3,4,5,0.9)]",

            "px-2.5",

            "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

            "text-white/66",

            "backdrop-blur",

            "transition-colors",

            "hover:border-[rgba(90,169,255,0.35)] hover:text-[#5AA9FF]",
          ].join(" ")}
        >
          {
            baseMaps[
              baseMapId
            ].shortLabel
          }
        </button>

        <button
          type="button"
          onClick={
            fitRoute
          }
          disabled={
            waypoints.length ===
            0
          }
          className={[
            "pointer-events-auto",

            "h-[30px]",

            "rounded-[4px] border",

            "border-[rgba(90,169,255,0.24)]",

            "bg-[rgba(3,4,5,0.9)]",

            "px-2.5",

            "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

            "text-[#5AA9FF]",

            "backdrop-blur",

            "transition-colors",

            "hover:bg-[rgba(90,169,255,0.07)]",

            "disabled:cursor-not-allowed disabled:opacity-35",
          ].join(" ")}
        >
          Fit Route
        </button>
      </div>

      {/* Coordinate readout */}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500]">
        <div className="rounded-[4px] border border-white/[0.10] bg-[rgba(3,4,5,0.88)] px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono text-[10px] font-medium text-white/68">
            {
              coordinates
            }
          </div>

          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.055em] text-white/34">
            WGS-84 · Zoom{" "}
            {zoom}
          </div>
        </div>
      </div>
    </div>
  );
}