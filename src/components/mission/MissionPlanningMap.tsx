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


type BaseMapId =
  | "openstreetmap"
  | "hot";


const baseMaps: Record<
  BaseMapId,
  {
    shortLabel:
      string;

    url:
      string;

    attribution:
      string;
  }
> = {
  openstreetmap: {
    shortLabel:
      "OSM",

    url:
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors",
  },

  hot: {
    shortLabel:
      "HOT",

    url:
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors · HOT",
  },
};


const mapColors = {
  route:
    "#316F9F",

  routeHalo:
    "rgba(255,255,255,0.92)",

  waypoint:
    "#316F9F",

  selectedWaypoint:
    "#B78939",

  home:
    "#337D5C",

  geofence:
    "#337D5C",

  restricted:
    "#BD4F59",
};


function escapeHtml(
  value:
    string,
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
  index:
    number,

  selected:
    boolean,
) {
  const color =
    selected
      ? mapColors.selectedWaypoint
      : mapColors.waypoint;

  const size =
    selected
      ? 38
      : 34;

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
          background:#ffffff;
          border:${selected ? 2 : 1.5}px solid ${color};
          color:${color};
          font-family:JetBrains Mono,Consolas,monospace;
          font-size:12px;
          font-weight:700;
          box-shadow:0 5px 16px rgba(20,30,40,0.16);
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
      42,
      42,
    ],

    iconAnchor: [
      21,
      21,
    ],

    html: `
      <div
        style="
          width:42px;
          height:42px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#ffffff;
          border:1.5px solid ${mapColors.home};
          color:${mapColors.home};
          font-family:JetBrains Mono,Consolas,monospace;
          font-size:10px;
          font-weight:700;
          box-shadow:0 5px 16px rgba(20,30,40,0.14);
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
    useRef(waypoints);

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


      L.control
        .attribution({
          position:
            "bottomright",

          prefix:
            false,
        })
        .addTo(map);


      baseTileLayerRef.current =
        L.tileLayer(
          baseMaps.openstreetmap.url,
          {
            minZoom:
              11,

            maxZoom:
              19,

            attribution:
              baseMaps.openstreetmap.attribution,
          },
        ).addTo(map);


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
              0.035,
          },
        },
      ).addTo(map);


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
              0.09,
          },
        },
      ).addTo(map);


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
        },
      ).addTo(map);


      routeLayerRef.current =
        L.layerGroup().addTo(
          map,
        );

      waypointLayerRef.current =
        L.layerGroup().addTo(
          map,
        );


      map.on(
        "click",
        (event) => {
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

              waypointsRef.current.length +
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


      map.on(
        "mousemove",
        (event) => {
          setCoordinates(
            `${event.latlng.lat.toFixed(
              5,
            )}°N · ${event.latlng.lng.toFixed(
              5,
            )}°E`,
          );
        },
      );


      map.on(
        "zoomend",
        () => {
          setZoom(
            map.getZoom(),
          );
        },
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
        resizeTimers.forEach(
          (timer) =>
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

      const layer =
        L.tileLayer(
          baseMaps[
            baseMapId
          ].url,
          {
            minZoom:
              11,

            maxZoom:
              19,

            attribution:
              baseMaps[
                baseMapId
              ].attribution,
          },
        );

      layer.addTo(map);
      layer.bringToBack();

      baseTileLayerRef.current =
        layer;
    },
    [
      baseMapId,
    ],
  );


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


      if (
        waypoints.length >=
        2
      ) {
        const routeCoordinates =
          waypoints.map(
            (waypoint) =>
              [
                waypoint.lat,
                waypoint.lng,
              ] as [
                number,
                number,
              ],
          );


        L.polyline(
          routeCoordinates,
          {
            color:
              mapColors.routeHalo,

            weight:
              8,

            opacity:
              0.9,
          },
        ).addTo(
          routeLayer,
        );


        L.polyline(
          routeCoordinates,
          {
            color:
              mapColors.route,

            weight:
              3.5,

            opacity:
              0.95,

            dashArray:
              "8 7",
          },
        ).addTo(
          routeLayer,
        );
      }


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
            (event) => {
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

              const updated =
                waypointsRef.current.map(
                  (current) =>
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
                updated,
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


  function toggleBaseMap() {
    setBaseMapId(
      (current) =>
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
          (waypoint) => [
            waypoint.lat,
            waypoint.lng,
          ],
        ),
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          60,
          60,
        ],

        maxZoom:
          17,
      },
    );
  }


  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#E6EAEE]">
      <div
        ref={
          containerRef
        }
        className="absolute inset-0 z-0"
      />

      <div className="pointer-events-none absolute left-3 top-3 z-[500]">
        <div className="rounded-[6px] border border-[#D2D8DF] bg-white/95 px-3 py-2 shadow-[0_6px_18px_rgba(25,35,45,0.10)]">
          <div className="text-[12px] font-semibold text-[#495563]">
            Click to add · drag to move
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex gap-2">
        <button
          type="button"
          onClick={
            toggleBaseMap
          }
          className="pointer-events-auto h-[36px] rounded-[6px] border border-[#D2D8DF] bg-white px-3 text-[12px] font-semibold text-[#495563] shadow-[0_6px_18px_rgba(25,35,45,0.10)] hover:text-[#316F9F]"
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
          className="pointer-events-auto h-[36px] rounded-[6px] border border-[rgba(49,111,159,0.28)] bg-white px-3 text-[12px] font-semibold text-[#316F9F] shadow-[0_6px_18px_rgba(25,35,45,0.10)] disabled:opacity-40"
        >
          Fit Route
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500]">
        <div className="rounded-[6px] border border-[#D2D8DF] bg-white/95 px-3 py-2 shadow-[0_6px_18px_rgba(25,35,45,0.10)]">
          <div className="font-mono text-[13px] font-medium text-[#343D48]">
            {coordinates}
          </div>

          <div className="mt-1 font-mono text-[12px] text-[#7C8794]">
            WGS-84 · Zoom {zoom}
          </div>
        </div>
      </div>
    </div>
  );
}