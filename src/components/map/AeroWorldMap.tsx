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
  homePoint,
  initialMapView,
  missionRoute,
  restrictedZones,
} from "../../data/worldMap";

import {
  useUnifiedTelemetry,
} from "../../hooks/useUnifiedTelemetry";

/* =========================================================
   MissionNexus V2
   Pure Tactical Map Canvas

   No buttons.
   No map HUD.
   No AOI control.
   No layers button.
   No HOME button.
   No MISSION button.
   No UAV button.
   No coordinate panel.
   No GPS status card.

   All MissionNexus controls live in LiveOps right rail.
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
  baseMap:
    BaseMapId;

  layers:
    MapLayerState;

  zoom:
    number;

  gpsAvailable:
    boolean;
};

export type AeroWorldMapHandle = {
  zoomIn:
    () => void;

  zoomOut:
    () => void;

  focusAoi:
    () => void;

  focusHome:
    () => void;

  focusMission:
    () => void;

  focusUav:
    () => void;

  toggleBaseMap:
    () => void;

  toggleLayer: (
    layer:
      MapLayerId,
  ) => void;
};

type AeroWorldMapProps = {
  onStateChange?: (
    state:
      AeroWorldMapState,
  ) => void;
};

const defaultLayers:
  MapLayerState = {
    "live-drone":
      true,

    drones:
      true,

    route:
      true,

    geofence:
      true,

    restricted:
      true,

    contacts:
      true,

    heat:
      true,

    home:
      true,
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
    url:
      string;

    attribution:
      string;
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

function getRiskColor(
  risk?:
    string,
) {
  const normalized =
    risk?.toLowerCase();

  if (
    normalized ===
      "critical" ||
    normalized ===
      "high"
  ) {
    return colors
      .critical;
  }

  if (
    normalized ===
    "medium"
  ) {
    return colors
      .primary;
  }

  return colors
    .nominal;
}

function createLiveDroneIcon(
  risk?:
    string,
) {
  const color =
    getRiskColor(
      risk,
    );

  return L.divIcon({
    className:
      "missionnexus-live-aircraft",

    iconSize: [
      38,
      38,
    ],

    iconAnchor: [
      19,
      19,
    ],

    popupAnchor: [
      0,
      -20,
    ],

    html: `
      <div
        style="
          position:relative;
          width:38px;
          height:38px;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            position:absolute;
            inset:2px;
            border-radius:999px;
            border:1px solid ${color}88;
            background:${color}14;
            box-shadow:0 0 18px ${color}55;
          "
        ></div>

        <div
          style="
            position:relative;
            width:14px;
            height:14px;
            transform:rotate(45deg);
            border:1px solid ${color};
            background:rgba(3,4,5,0.95);
          "
        ></div>
      </div>
    `,
  });
}

export const AeroWorldMap =
  forwardRef<
    AeroWorldMapHandle,
    AeroWorldMapProps
  >(
    function AeroWorldMap(
      {
        onStateChange,
      },
      ref,
    ) {
      const {
        telemetry,
      } =
        useUnifiedTelemetry();

      const containerRef =
        useRef<
          HTMLDivElement |
          null
        >(null);

      const mapRef =
        useRef<
          LeafletMap |
          null
        >(null);

      const baseTileRef =
        useRef<
          TileLayer |
          null
        >(null);

      const liveDroneLayerRef =
        useRef<
          L.LayerGroup |
          null
        >(null);

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
         Initialize map
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

          const tileLayer =
            L.tileLayer(
              baseMaps
                .osm
                .url,
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
                  baseMaps
                    .osm
                    .attribution,
              },
            ).addTo(
              map,
            );

          baseTileRef.current =
            tileLayer;

          /* -----------------------------------------------
             Live aircraft
             ----------------------------------------------- */

          const liveDroneLayer =
            L.layerGroup()
              .addTo(
                map,
              );

          liveDroneLayerRef.current =
            liveDroneLayer;

          /* -----------------------------------------------
             Geofence
             ----------------------------------------------- */

          const geofenceLayer =
            L.geoJSON(
              geofenceZone,
              {
                style: {
                  color:
                    colors
                      .nominal,

                  weight:
                    2,

                  dashArray:
                    "6 6",

                  fillColor:
                    colors
                      .nominal,

                  fillOpacity:
                    0.055,
                },
              },
            ).addTo(
              map,
            );

          /* -----------------------------------------------
             Restricted zones
             ----------------------------------------------- */

          const restrictedLayer =
            L.geoJSON(
              restrictedZones,
              {
                style: {
                  color:
                    colors
                      .critical,

                  weight:
                    2,

                  fillColor:
                    colors
                      .critical,

                  fillOpacity:
                    0.1,
                },
              },
            ).addTo(
              map,
            );

          /* -----------------------------------------------
             Mission route
             ----------------------------------------------- */

          const routeLayer =
            L.geoJSON(
              missionRoute,
              {
                style: {
                  color:
                    colors
                      .info,

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

          /* -----------------------------------------------
             Heat areas
             ----------------------------------------------- */

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
                          colors
                            .critical,

                        fillColor:
                          colors
                            .critical,

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

          /* -----------------------------------------------
             Home
             ----------------------------------------------- */

          const homeLayer =
            L.geoJSON(
              homePoint,
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
                          colors
                            .background,

                        weight:
                          2,

                        fillColor:
                          colors
                            .nominal,

                        fillOpacity:
                          1,
                      },
                    ),
              },
            ).addTo(
              map,
            );

          /* -----------------------------------------------
             Contacts
             ----------------------------------------------- */

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
                          colors
                            .critical,

                        fillOpacity:
                          1,
                      },
                    ),
              },
            ).addTo(
              map,
            );

          /* -----------------------------------------------
             Simulated aircraft
             ----------------------------------------------- */

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
                          colors
                            .background,

                        weight:
                          2,

                        fillColor:
                          colors
                            .primary,

                        fillOpacity:
                          1,
                      },
                    ),
              },
            ).addTo(
              map,
            );

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

          return () => {
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
          };
        },
        [],
      );

      /* =====================================================
         Base map
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
                  ]
                    .attribution,
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
         Layer visibility
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
         Live aircraft
         ===================================================== */

      useEffect(
        () => {
          const liveLayer =
            liveDroneLayerRef
              .current;

          if (!liveLayer) {
            return;
          }

          liveLayer.clearLayers();

          if (
            !telemetry?.gps
          ) {
            return;
          }

          L.marker(
            [
              telemetry
                .gps
                .lat,

              telemetry
                .gps
                .lng,
            ],
            {
              icon:
                createLiveDroneIcon(
                  telemetry
                    .risk,
                ),

              zIndexOffset:
                1000,
            },
          )
            .bindPopup(
              `
                <strong>${telemetry.device ?? "Live Aircraft"}</strong><br/>
                Battery: ${telemetry.battery ?? 0}%<br/>
                Risk: ${(telemetry.risk ?? "low").toUpperCase()}<br/>
                GPS: ${telemetry.gps.lat.toFixed(5)}, ${telemetry.gps.lng.toFixed(5)}
              `,
            )
            .addTo(
              liveLayer,
            );
        },
        [
          telemetry,
        ],
      );

      /* =====================================================
         External state
         ===================================================== */

      useEffect(
        () => {
          onStateChange?.({
            baseMap,

            layers,

            zoom,

            gpsAvailable:
              Boolean(
                telemetry?.gps,
              ),
          });
        },
        [
          baseMap,
          layers,
          zoom,
          telemetry?.gps,
          onStateChange,
        ],
      );

      /* =====================================================
         Public Controller
         ===================================================== */

      useImperativeHandle(
        ref,
        () => ({
          zoomIn() {
            mapRef
              .current
              ?.zoomIn();
          },

          zoomOut() {
            mapRef
              .current
              ?.zoomOut();
          },

          focusAoi() {
            mapRef
              .current
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
            mapRef
              .current
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
            mapRef
              .current
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
              telemetry?.gps
            ) {
              mapRef
                .current
                ?.flyTo(
                  [
                    telemetry
                      .gps
                      .lat,

                    telemetry
                      .gps
                      .lng,
                  ],
                  16,
                  {
                    duration:
                      1.1,
                  },
                );

              return;
            }

            mapRef
              .current
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
          telemetry,
        ],
      );

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