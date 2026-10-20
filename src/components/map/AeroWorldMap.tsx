import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import L, {
  type Layer,
  type Map as LeafletMap,
  type TileLayer,
} from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  contactPoints,
  dronePoints,
  geofenceZone,
  heatScanPoints,
  initialMapView,
  missionRoute,
  restrictedZones,
} from "../../data/worldMap";

import type {
  VehicleState,
} from "../../types/vehicle";


/* =========================================================
   MissionNexus V3.1
   Unified Vehicle Map

   Vehicle Registry
        ↓
   LiveOps
        ↓
   activeVehicle
        ↓
   AeroWorldMap

   The map no longer owns a second telemetry source.
   ========================================================= */


export type MapLayerId =
  | "live-drone"
  | "drones"
  | "route"
  | "geofence"
  | "restricted"
  | "contacts"
  | "heat"
  | "home";


export type BaseMapId =
  | "osm"
  | "hot";


export type MapLayerState =
  Record<
    MapLayerId,
    boolean
  >;


export type AeroWorldMapState = {
  baseMap: BaseMapId;

  layers: MapLayerState;

  zoom: number;

  gpsAvailable: boolean;
};


export type AeroWorldMapHandle = {
  zoomIn: () => void;

  zoomOut: () => void;

  focusAoi: () => void;

  focusHome: () => void;

  focusMission: () => void;

  focusUav: () => void;

  toggleBaseMap: () => void;

  toggleLayer: (
    layer: MapLayerId,
  ) => void;
};


type AeroWorldMapProps = {
  vehicle?:
    | VehicleState
    | null;

  onStateChange?: (
    state: AeroWorldMapState,
  ) => void;
};


/* =========================================================
   Constants
   ========================================================= */


const defaultLayers: MapLayerState = {
  "live-drone": true,

  drones: true,

  route: true,

  geofence: true,

  restricted: true,

  contacts: true,

  heat: true,

  home: true,
};


const baseMaps = {
  osm: {
    url:
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors",
  },

  hot: {
    url:
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors · HOT",
  },
} satisfies Record<
  BaseMapId,
  {
    url: string;

    attribution: string;
  }
>;


const colors = {
  primary:
    "#F6B23C",

  info:
    "#5AA9FF",

  nominal:
    "#59D99A",

  critical:
    "#FF5A63",

  background:
    "#030405",
};


const MAX_TRAIL_POINTS =
  360;


const MIN_TRAIL_STEP_METERS =
  1.5;


/* =========================================================
   Generic Helpers
   ========================================================= */


function createWorldBounds() {
  return L.latLngBounds(
    L.latLng(
      -85,
      -180,
    ),

    L.latLng(
      85,
      180,
    ),
  );
}


function hasValidPosition(
  vehicle:
    | VehicleState
    | null
    | undefined,
) {
  if (!vehicle) {
    return false;
  }

  const latitude =
    vehicle.position
      .latitude_deg;

  const longitude =
    vehicle.position
      .longitude_deg;

  return (
    Number.isFinite(
      latitude,
    ) &&
    Number.isFinite(
      longitude,
    ) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}


function hasValidHomePosition(
  vehicle:
    | VehicleState
    | null
    | undefined,
) {
  const home =
    vehicle?.home_position;

  if (!home) {
    return false;
  }

  return (
    Number.isFinite(
      home.latitude_deg,
    ) &&
    Number.isFinite(
      home.longitude_deg,
    ) &&
    home.latitude_deg >=
      -90 &&
    home.latitude_deg <=
      90 &&
    home.longitude_deg >=
      -180 &&
    home.longitude_deg <=
      180
  );
}


function vehicleGpsAvailable(
  vehicle:
    | VehicleState
    | null
    | undefined,
) {
  return Boolean(
    vehicle &&
      vehicle.connected &&
      hasValidPosition(
        vehicle,
      ) &&
      vehicle.gps.fix_type >=
        2,
  );
}


function escapeHtml(
  value:
    string | number,
) {
  return String(
    value,
  )
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


function formatNullableNumber(
  value:
    | number
    | null
    | undefined,

  digits =
    1,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return "—";
  }

  return value.toFixed(
    digits,
  );
}


/* =========================================================
   Vehicle Visual State
   ========================================================= */


function getVehicleColor(
  vehicle:
    VehicleState,
) {
  if (
    vehicle.health
      .failsafe_active ||
    vehicle.health.overall ===
      "CRITICAL"
  ) {
    return colors.critical;
  }

  if (
    vehicle.health.overall ===
      "WARNING"
  ) {
    return colors.primary;
  }

  if (
    !vehicle.connected ||
    vehicle.link.state ===
      "DISCONNECTED"
  ) {
    return colors.critical;
  }

  return colors.nominal;
}


function createLiveDroneIcon(
  vehicle:
    VehicleState,
) {
  const color =
    getVehicleColor(
      vehicle,
    );

  const heading =
    Number.isFinite(
      vehicle.motion
        .heading_deg,
    )
      ? vehicle.motion
          .heading_deg
      : 0;

  return L.divIcon({
    className:
      "missionnexus-live-aircraft",

    iconSize: [
      44,
      44,
    ],

    iconAnchor: [
      22,
      22,
    ],

    popupAnchor: [
      0,
      -24,
    ],

    html: `
      <div
        style="
          position:relative;
          width:44px;
          height:44px;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:auto;
        "
      >
        <div
          style="
            position:absolute;
            inset:2px;
            border-radius:999px;
            border:1px solid ${color}66;
            background:${color}12;
            box-shadow:
              0 0 10px ${color}33,
              0 0 22px ${color}22;
          "
        ></div>

        <div
          style="
            position:absolute;
            inset:8px;
            border-radius:999px;
            border:1px solid ${color}2f;
          "
        ></div>

        <div
          style="
            position:relative;
            width:24px;
            height:24px;
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(${heading}deg);
            transform-origin:center;
          "
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style="
              overflow:visible;
              filter:drop-shadow(0 0 5px ${color}66);
            "
          >
            <path
              d="
                M12 2
                L15 9
                L21 12
                L15 14
                L14 21
                L12 18
                L10 21
                L9 14
                L3 12
                L9 9
                Z
              "
              fill="${color}"
              stroke="#030405"
              stroke-width="1.25"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
    `,
  });
}


function createVehiclePopup(
  vehicle:
    VehicleState,
) {
  const battery =
    vehicle.battery
      .remaining_percent;

  const altitude =
    vehicle.position
      .altitude_relative_m;

  const latitude =
    vehicle.position
      .latitude_deg;

  const longitude =
    vehicle.position
      .longitude_deg;

  return `
    <div
      style="
        min-width:190px;
        font-family:Inter,system-ui,sans-serif;
        color:#111827;
        line-height:1.45;
      "
    >
      <div
        style="
          font-weight:700;
          font-size:14px;
          margin-bottom:3px;
        "
      >
        ${escapeHtml(
          vehicle.callsign,
        )}
      </div>

      <div
        style="
          font-size:12px;
          opacity:0.72;
          margin-bottom:8px;
        "
      >
        ${escapeHtml(
          vehicle.vehicle_id,
        )}
        ·
        ${escapeHtml(
          vehicle.source,
        )}
      </div>

      <div>
        <strong>Mode:</strong>
        ${escapeHtml(
          vehicle.flight_mode,
        )}
      </div>

      <div>
        <strong>State:</strong>
        ${
          vehicle.armed
            ? "ARMED"
            : "DISARMED"
        }
      </div>

      <div>
        <strong>Altitude:</strong>
        ${escapeHtml(
          formatNullableNumber(
            altitude,
            1,
          ),
        )} m
      </div>

      <div>
        <strong>Speed:</strong>
        ${escapeHtml(
          formatNullableNumber(
            vehicle.motion
              .ground_speed_mps,
            1,
          ),
        )} m/s
      </div>

      <div>
        <strong>Heading:</strong>
        ${escapeHtml(
          formatNullableNumber(
            vehicle.motion
              .heading_deg,
            0,
          ),
        )}°
      </div>

      <div>
        <strong>Battery:</strong>
        ${
          battery ===
            null ||
          battery ===
            undefined
            ? "—"
            : `${escapeHtml(
                Math.round(
                  battery,
                ),
              )}%`
        }
      </div>

      <div>
        <strong>GPS:</strong>
        ${escapeHtml(
          latitude.toFixed(
            5,
          ),
        )},
        ${escapeHtml(
          longitude.toFixed(
            5,
          ),
        )}
      </div>
    </div>
  `;
}


/* =========================================================
   Component
   ========================================================= */


export const AeroWorldMap =
  forwardRef<
    AeroWorldMapHandle,
    AeroWorldMapProps
  >(
    function AeroWorldMap(
      {
        vehicle,
        onStateChange,
      },
      ref,
    ) {
      const containerRef =
        useRef<
          HTMLDivElement | null
        >(
          null,
        );

      const mapRef =
        useRef<
          LeafletMap | null
        >(
          null,
        );

      const baseTileRef =
        useRef<
          TileLayer | null
        >(
          null,
        );


      /* =====================================================
         Dynamic Vehicle Layers
         ===================================================== */


      const liveDroneLayerRef =
        useRef<
          L.LayerGroup | null
        >(
          null,
        );

      const liveDroneMarkerRef =
        useRef<
          L.Marker | null
        >(
          null,
        );

      const flightTrailRef =
        useRef<
          L.Polyline | null
        >(
          null,
        );

      const trailPointsRef =
        useRef<
          Array<
            [
              number,
              number,
            ]
          >
        >(
          [],
        );

      const previousVehicleIdRef =
        useRef<
          string | null
        >(
          null,
        );


      /* =====================================================
         Dynamic Home Layer
         ===================================================== */


      const homeLayerRef =
        useRef<
          L.LayerGroup | null
        >(
          null,
        );

      const homeMarkerRef =
        useRef<
          L.CircleMarker | null
        >(
          null,
        );


      /* =====================================================
         Generic Mission Layers
         ===================================================== */


      const layerRefs =
        useRef<
          Record<
            MapLayerId,
            Layer | null
          >
        >({
          "live-drone":
            null,

          drones:
            null,

          route:
            null,

          geofence:
            null,

          restricted:
            null,

          contacts:
            null,

          heat:
            null,

          home:
            null,
        });


      /* =====================================================
         UI State
         ===================================================== */


      const [
        baseMap,
        setBaseMap,
      ] =
        useState<BaseMapId>(
          "osm",
        );

      const [
        layers,
        setLayers,
      ] =
        useState<MapLayerState>(
          defaultLayers,
        );

      const [
        zoom,
        setZoom,
      ] =
        useState(
          Math.max(
            initialMapView
              .zoom,
            2,
          ),
        );


      /* =====================================================
         Map Initialization
         ===================================================== */


      useEffect(
        () => {
          if (
            !containerRef.current ||
            mapRef.current
          ) {
            return;
          }

          const worldBounds =
            createWorldBounds();

          const map =
            L.map(
              containerRef.current,
              {
                center: [
                  initialMapView
                    .latitude,

                  initialMapView
                    .longitude,
                ],

                zoom:
                  Math.max(
                    initialMapView
                      .zoom,
                    2,
                  ),

                minZoom:
                  2,

                maxZoom:
                  19,

                zoomControl:
                  false,

                attributionControl:
                  true,

                maxBounds:
                  worldBounds,

                maxBoundsViscosity:
                  1,

                worldCopyJump:
                  false,
              },
            );

          mapRef.current =
            map;


          /* =================================================
             Base Tile
             ================================================= */


          const tileLayer =
            L.tileLayer(
              baseMaps.osm.url,
              {
                minZoom:
                  2,

                maxZoom:
                  19,

                noWrap:
                  true,

                bounds:
                  worldBounds,

                attribution:
                  baseMaps.osm
                    .attribution,
              },
            ).addTo(
              map,
            );

          baseTileRef.current =
            tileLayer;


          /* =================================================
             Attribution Styling
             ================================================= */


          const styleAttribution =
            () => {
              const element =
                containerRef.current
                  ?.querySelector(
                    ".leaflet-control-attribution",
                  ) as
                  | HTMLElement
                  | null;

              if (
                !element
              ) {
                return;
              }

              element.style.fontSize =
                "13px";

              element.style.lineHeight =
                "1.35";

              element.style.padding =
                "4px 7px";

              element.style.background =
                "rgba(5, 6, 13, 0.84)";

              element.style.color =
                "rgba(255,255,255,0.74)";

              element.style.borderRadius =
                "4px 0 0 0";

              element
                .querySelectorAll(
                  "a",
                )
                .forEach(
                  (
                    link,
                  ) => {
                    const anchor =
                      link as HTMLElement;

                    anchor.style.color =
                      "#9CCAFF";

                    anchor.style.fontSize =
                      "13px";
                  },
                );
            };

          styleAttribution();

          const attributionTimer =
            window.setTimeout(
              styleAttribution,
              120,
            );


          /* =================================================
             Live Vehicle Group
             ================================================= */


          const liveDroneLayer =
            L.layerGroup()
              .addTo(
                map,
              );

          liveDroneLayerRef.current =
            liveDroneLayer;


          /* =================================================
             Dynamic Home Group
             ================================================= */


          const homeLayer =
            L.layerGroup()
              .addTo(
                map,
              );

          homeLayerRef.current =
            homeLayer;


          /* =================================================
             Mission Geometry
             ================================================= */


          const geofenceLayer =
            L.geoJSON(
              geofenceZone,
              {
                style: {
                  color:
                    colors.nominal,

                  weight:
                    2,

                  dashArray:
                    "6 6",

                  fillColor:
                    colors.nominal,

                  fillOpacity:
                    0.055,
                },
              },
            ).addTo(
              map,
            );


          const restrictedLayer =
            L.geoJSON(
              restrictedZones,
              {
                style: {
                  color:
                    colors.critical,

                  weight:
                    2,

                  fillColor:
                    colors.critical,

                  fillOpacity:
                    0.1,
                },
              },
            ).addTo(
              map,
            );


          const routeLayer =
            L.geoJSON(
              missionRoute,
              {
                style: {
                  color:
                    colors.info,

                  weight:
                    3,

                  dashArray:
                    "7 6",

                  opacity:
                    0.92,
                },
              },
            ).addTo(
              map,
            );


          const heatLayer =
            L.geoJSON(
              heatScanPoints,
              {
                pointToLayer:
                  (
                    _feature,
                    latlng,
                  ) =>
                    L.circle(
                      latlng,
                      {
                        radius:
                          450,

                        color:
                          colors.critical,

                        fillColor:
                          colors.critical,

                        fillOpacity:
                          0.14,

                        weight:
                          1,

                        opacity:
                          0.45,
                      },
                    ),
              },
            ).addTo(
              map,
            );


          const contactLayer =
            L.geoJSON(
              contactPoints,
              {
                pointToLayer:
                  (
                    _feature,
                    latlng,
                  ) =>
                    L.circleMarker(
                      latlng,
                      {
                        radius:
                          6,

                        color:
                          "#ffffff",

                        weight:
                          1,

                        fillColor:
                          colors.critical,

                        fillOpacity:
                          1,
                      },
                    ),
              },
            ).addTo(
              map,
            );


          const droneLayer =
            L.geoJSON(
              dronePoints,
              {
                pointToLayer:
                  (
                    _feature,
                    latlng,
                  ) =>
                    L.circleMarker(
                      latlng,
                      {
                        radius:
                          7,

                        color:
                          colors.background,

                        weight:
                          2,

                        fillColor:
                          colors.primary,

                        fillOpacity:
                          1,
                      },
                    ),
              },
            ).addTo(
              map,
            );


          /* =================================================
             Layer Registry
             ================================================= */


          layerRefs.current = {
            "live-drone":
              liveDroneLayer,

            drones:
              droneLayer,

            route:
              routeLayer,

            geofence:
              geofenceLayer,

            restricted:
              restrictedLayer,

            contacts:
              contactLayer,

            heat:
              heatLayer,

            home:
              homeLayer,
          };


          /* =================================================
             Map Events
             ================================================= */


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
              80,
            ),

            window.setTimeout(
              () =>
                map.invalidateSize(),
              300,
            ),

            window.setTimeout(
              () =>
                map.invalidateSize(),
              800,
            ),
          ];


          /* =================================================
             Cleanup
             ================================================= */


          return () => {
            window.clearTimeout(
              attributionTimer,
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

            baseTileRef.current =
              null;

            liveDroneLayerRef.current =
              null;

            liveDroneMarkerRef.current =
              null;

            flightTrailRef.current =
              null;

            trailPointsRef.current =
              [];

            homeLayerRef.current =
              null;

            homeMarkerRef.current =
              null;
          };
        },
        [],
      );


      /* =====================================================
         Base Map Switching
         ===================================================== */


      useEffect(
        () => {
          const map =
            mapRef.current;

          if (!map) {
            return;
          }

          if (
            baseTileRef.current
          ) {
            map.removeLayer(
              baseTileRef.current,
            );
          }

          const worldBounds =
            createWorldBounds();

          const layer =
            L.tileLayer(
              baseMaps[
                baseMap
              ].url,
              {
                minZoom:
                  2,

                maxZoom:
                  19,

                noWrap:
                  true,

                bounds:
                  worldBounds,

                attribution:
                  baseMaps[
                    baseMap
                  ].attribution,
              },
            );

          layer.addTo(
            map,
          );

          layer.bringToBack();

          baseTileRef.current =
            layer;
        },
        [
          baseMap,
        ],
      );


      /* =====================================================
         Layer Visibility
         ===================================================== */


      useEffect(
        () => {
          const map =
            mapRef.current;

          if (!map) {
            return;
          }

          (
            Object.keys(
              layers,
            ) as MapLayerId[]
          ).forEach(
            (
              layerId,
            ) => {
              const layer =
                layerRefs
                  .current[
                    layerId
                  ];

              if (!layer) {
                return;
              }

              if (
                layers[
                  layerId
                ]
              ) {
                if (
                  !map.hasLayer(
                    layer,
                  )
                ) {
                  layer.addTo(
                    map,
                  );
                }
              } else if (
                map.hasLayer(
                  layer,
                )
              ) {
                map.removeLayer(
                  layer,
                );
              }
            },
          );
        },
        [
          layers,
        ],
      );


      /* =====================================================
         Live Vehicle Marker + Heading + Trail

         This now uses active VehicleState supplied by LiveOps.
         ===================================================== */


      useEffect(
        () => {
          const liveLayer =
            liveDroneLayerRef.current;

          if (
            !liveLayer
          ) {
            return;
          }

          if (
            !vehicle ||
            !hasValidPosition(
              vehicle,
            )
          ) {
            return;
          }

          const latitude =
            vehicle.position
              .latitude_deg;

          const longitude =
            vehicle.position
              .longitude_deg;

          const point:
            [
              number,
              number,
            ] = [
              latitude,
              longitude,
            ];


          /* =================================================
             Vehicle switched

             Reset trail when operator selects another vehicle.
             ================================================= */


          if (
            previousVehicleIdRef
              .current !==
            vehicle.vehicle_id
          ) {
            previousVehicleIdRef.current =
              vehicle.vehicle_id;

            trailPointsRef.current =
              [];

            if (
              flightTrailRef.current
            ) {
              liveLayer.removeLayer(
                flightTrailRef.current,
              );

              flightTrailRef.current =
                null;
            }

            if (
              liveDroneMarkerRef.current
            ) {
              liveLayer.removeLayer(
                liveDroneMarkerRef.current,
              );

              liveDroneMarkerRef.current =
                null;
            }
          }


          /* =================================================
             Marker
             ================================================= */


          if (
            !liveDroneMarkerRef.current
          ) {
            const marker =
              L.marker(
                point,
                {
                  icon:
                    createLiveDroneIcon(
                      vehicle,
                    ),

                  zIndexOffset:
                    1000,
                },
              );

            marker.bindPopup(
              createVehiclePopup(
                vehicle,
              ),
            );

            marker.addTo(
              liveLayer,
            );

            liveDroneMarkerRef.current =
              marker;
          } else {
            liveDroneMarkerRef.current
              .setLatLng(
                point,
              );

            liveDroneMarkerRef.current
              .setIcon(
                createLiveDroneIcon(
                  vehicle,
                ),
              );

            liveDroneMarkerRef.current
              .setPopupContent(
                createVehiclePopup(
                  vehicle,
                ),
              );
          }


          /* =================================================
             Flight Trail

             Append only when vehicle has actually moved enough
             to avoid thousands of duplicate coordinates.
             ================================================= */


          const trail =
            trailPointsRef.current;

          const previous =
            trail.length > 0
              ? trail[
                  trail.length -
                    1
                ]
              : null;

          let shouldAppend =
            !previous;

          if (
            previous
          ) {
            const distance =
              L.latLng(
                previous[
                  0
                ],
                previous[
                  1
                ],
              ).distanceTo(
                L.latLng(
                  latitude,
                  longitude,
                ),
              );

            shouldAppend =
              distance >=
              MIN_TRAIL_STEP_METERS;
          }

          if (
            shouldAppend
          ) {
            trail.push(
              point,
            );

            if (
              trail.length >
              MAX_TRAIL_POINTS
            ) {
              trail.splice(
                0,
                trail.length -
                  MAX_TRAIL_POINTS,
              );
            }

            if (
              !flightTrailRef.current
            ) {
              const trailLine =
                L.polyline(
                  trail,
                  {
                    color:
                      colors.info,

                    weight:
                      2,

                    opacity:
                      0.8,

                    lineCap:
                      "round",

                    lineJoin:
                      "round",
                  },
                );

              trailLine.addTo(
                liveLayer,
              );

              trailLine.bringToBack();

              flightTrailRef.current =
                trailLine;
            } else {
              flightTrailRef.current
                .setLatLngs(
                  trail,
                );

              flightTrailRef.current
                .bringToBack();
            }
          }
        },
        [
          vehicle,
        ],
      );


      /* =====================================================
         Dynamic Vehicle Home Position
         ===================================================== */


      useEffect(
        () => {
          const homeLayer =
            homeLayerRef.current;

          if (
            !homeLayer
          ) {
            return;
          }

          if (
            !vehicle ||
            !hasValidHomePosition(
              vehicle,
            ) ||
            !vehicle.home_position
          ) {
            if (
              homeMarkerRef.current
            ) {
              homeLayer.removeLayer(
                homeMarkerRef.current,
              );

              homeMarkerRef.current =
                null;
            }

            return;
          }

          const home =
            vehicle.home_position;

          const point:
            [
              number,
              number,
            ] = [
              home.latitude_deg,
              home.longitude_deg,
            ];

          if (
            !homeMarkerRef.current
          ) {
            const marker =
              L.circleMarker(
                point,
                {
                  radius:
                    8,

                  color:
                    colors.background,

                  weight:
                    2,

                  fillColor:
                    colors.nominal,

                  fillOpacity:
                    1,
                },
              );

            marker.bindTooltip(
              `${vehicle.callsign} HOME`,
              {
                direction:
                  "top",

                offset: [
                  0,
                  -8,
                ],
              },
            );

            marker.addTo(
              homeLayer,
            );

            homeMarkerRef.current =
              marker;
          } else {
            homeMarkerRef.current
              .setLatLng(
                point,
              );

            homeMarkerRef.current
              .setTooltipContent(
                `${vehicle.callsign} HOME`,
              );
          }
        },
        [
          vehicle,
        ],
      );


      /* =====================================================
         State Reporting To LiveOps
         ===================================================== */


      useEffect(
        () => {
          onStateChange?.({
            baseMap,

            layers,

            zoom,

            gpsAvailable:
              vehicleGpsAvailable(
                vehicle,
              ),
          });
        },
        [
          baseMap,
          layers,
          zoom,
          vehicle,
          onStateChange,
        ],
      );


      /* =====================================================
         Imperative Map Controls
         ===================================================== */


      useImperativeHandle(
        ref,
        () => ({
          zoomIn() {
            mapRef.current
              ?.zoomIn();
          },


          zoomOut() {
            mapRef.current
              ?.zoomOut();
          },


          focusAoi() {
            mapRef.current
              ?.flyTo(
                [
                  23.0225,
                  72.5714,
                ],
                11.5,
                {
                  duration:
                    1.1,
                },
              );
          },


          focusHome() {
            if (
              vehicle &&
              hasValidHomePosition(
                vehicle,
              ) &&
              vehicle.home_position
            ) {
              mapRef.current
                ?.flyTo(
                  [
                    vehicle
                      .home_position
                      .latitude_deg,

                    vehicle
                      .home_position
                      .longitude_deg,
                  ],
                  16,
                  {
                    duration:
                      1.1,
                  },
                );

              return;
            }

            mapRef.current
              ?.flyTo(
                [
                  23.0225,
                  72.5714,
                ],
                15,
                {
                  duration:
                    1.1,
                },
              );
          },


          focusMission() {
            mapRef.current
              ?.flyTo(
                [
                  23.0302,
                  72.5815,
                ],
                14,
                {
                  duration:
                    1.1,
                },
              );
          },


          focusUav() {
            if (
              vehicle &&
              hasValidPosition(
                vehicle,
              )
            ) {
              mapRef.current
                ?.flyTo(
                  [
                    vehicle
                      .position
                      .latitude_deg,

                    vehicle
                      .position
                      .longitude_deg,
                  ],
                  16,
                  {
                    duration:
                      1.1,
                  },
                );

              return;
            }

            mapRef.current
              ?.flyTo(
                [
                  23.0302,
                  72.5815,
                ],
                14,
                {
                  duration:
                    1.1,
                },
              );
          },


          toggleBaseMap() {
            setBaseMap(
              (
                current,
              ) =>
                current ===
                "osm"
                  ? "hot"
                  : "osm",
            );
          },


          toggleLayer(
            layer,
          ) {
            setLayers(
              (
                current,
              ) => ({
                ...current,

                [layer]:
                  !current[
                    layer
                  ],
              }),
            );
          },
        }),
        [
          vehicle,
        ],
      );


      /* =====================================================
         Render
         ===================================================== */


      return (
        <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#020304]">
          <div
            ref={
              containerRef
            }
            className="missionnexus-map absolute inset-0 h-full w-full"
          />
        </div>
      );
    },
  );