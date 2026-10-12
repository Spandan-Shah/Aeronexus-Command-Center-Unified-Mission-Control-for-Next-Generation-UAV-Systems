import {
  useEffect,
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
  ChevronDown,
  ChevronUp,
  Crosshair,
  Globe2,
  Home,
  Layers,
  LocateFixed,
  MapPinned,
  Plane,
  Radio,
  Satellite,
} from "lucide-react";

import type {
  LucideIcon,
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

import {
  useUnifiedTelemetry,
} from "../../hooks/useUnifiedTelemetry";

/* =========================================================
   MissionNexus V2
   Tactical Operations Map

   Existing capabilities preserved:
   - Leaflet map
   - live UAV telemetry
   - mission route
   - geofence
   - restricted zones
   - contacts
   - heat scan
   - simulated UAVs
   - home position
   - OSM / HOT map switching
   - AOI / Home / Mission / UAV navigation

   V2 refinements:
   - Aeronexus graphite surfaces
   - compact overlays
   - amber identity
   - blue geospatial semantics
   - green nominal state
   - red critical state
   - collapsible layer console
   - reduced visual obstruction
   ========================================================= */

type LayerId =
  | "live-drone"
  | "drones"
  | "route"
  | "geofence"
  | "restricted"
  | "contacts"
  | "heat"
  | "home";

type LayerState =
  Record<
    LayerId,
    boolean
  >;

type BaseMapId =
  | "osm"
  | "hot";

type LayerDefinition = {
  id: LayerId;

  label: string;
};

/* =========================================================
   Defaults
   ========================================================= */

const defaultLayerState:
  LayerState = {
    "live-drone": true,
    drones: true,
    route: true,
    geofence: true,
    restricted: true,
    contacts: true,
    heat: true,
    home: true,
  };

const layerButtons:
  LayerDefinition[] = [
    {
      id:
        "live-drone",

      label:
        "Live Aircraft",
    },

    {
      id:
        "route",

      label:
        "Mission Route",
    },

    {
      id:
        "geofence",

      label:
        "Geofence",
    },

    {
      id:
        "restricted",

      label:
        "Restricted",
    },

    {
      id:
        "contacts",

      label:
        "Contacts",
    },

    {
      id:
        "heat",

      label:
        "Heat Scan",
    },

    {
      id:
        "drones",

      label:
        "Sim Aircraft",
    },

    {
      id:
        "home",

      label:
        "Home",
    },
  ];

const baseMaps:
  Record<
    BaseMapId,
    {
      label: string;

      shortLabel: string;

      url: string;

      attribution:
        string;
    }
  > = {
    osm: {
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
        "OSM Humanitarian",

      shortLabel:
        "HOT",

      url:
        "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",

      attribution:
        "© OpenStreetMap contributors · HOT",
    },
  };

/* =========================================================
   Semantic Map Colors

   Same MissionNexus system used by the rest of V2:
   Amber = identity / selected
   Blue  = map / information
   Green = nominal
   Red   = danger
   ========================================================= */

const mapColors = {
  primary:
    "#F6B23C",

  info:
    "#5AA9FF",

  nominal:
    "#59D99A",

  critical:
    "#FF5A63",

  geofenceBoundary:
    "#59D99A",

  geofenceFill:
    "#59D99A",

  restrictedBoundary:
    "#FF5A63",

  restrictedFill:
    "#FF5A63",

  route:
    "#5AA9FF",

  heat:
    "#FF5A63",

  home:
    "#59D99A",

  contact:
    "#FF5A63",

  drone:
    "#F6B23C",

  mapStroke:
    "#030405",
};

/* =========================================================
   Helpers
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

function getRiskColor(
  risk?: string,
) {
  const normalized =
    risk?.toLowerCase();

  if (
    normalized ===
      "critical" ||
    normalized ===
      "high"
  ) {
    return mapColors
      .critical;
  }

  if (
    normalized ===
    "medium"
  ) {
    return mapColors
      .primary;
  }

  return mapColors
    .nominal;
}

function formatCoordinates(
  latitude: number,
  longitude: number,
) {
  const latitudeDirection =
    latitude >= 0
      ? "N"
      : "S";

  const longitudeDirection =
    longitude >= 0
      ? "E"
      : "W";

  return `${Math.abs(latitude).toFixed(5)}° ${latitudeDirection} · ${Math.abs(longitude).toFixed(5)}° ${longitudeDirection}`;
}

/* =========================================================
   Live Aircraft Marker
   ========================================================= */

function createLiveDroneIcon(
  risk?: string,
) {
  const color =
    getRiskColor(
      risk,
    );

  return L.divIcon({
    className:
      "missionnexus-live-aircraft",

    iconSize: [
      42,
      42,
    ],

    iconAnchor: [
      21,
      21,
    ],

    popupAnchor: [
      0,
      -22,
    ],

    html: `
      <div
        style="
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <div
          style="
            position: absolute;
            inset: 0;
            border-radius: 999px;
            border: 1px solid ${color}99;
            background: ${color}14;
            box-shadow:
              0 0 0 4px ${color}0d,
              0 0 22px ${color}55;
          "
        ></div>

        <div
          style="
            position: absolute;
            width: 20px;
            height: 20px;
            transform: rotate(45deg);
            border: 1px solid ${color};
            background: rgba(3, 4, 5, 0.94);
          "
        ></div>

        <div
          style="
            position: relative;
            z-index: 2;
            color: ${color};
            font-family: monospace;
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.06em;
          "
        >
          UAV
        </div>
      </div>
    `,
  });
}

/* =========================================================
   Map Action
   ========================================================= */

function MapAction({
  icon: Icon,
  label,
  onClick,
  active = false,
  nominal = false,
}: {
  icon: LucideIcon;

  label: string;

  onClick: () => void;

  active?: boolean;

  nominal?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex h-8 items-center justify-center gap-1.5 rounded-[5px] border px-2.5",

        "font-mono text-[7px] font-semibold uppercase tracking-[0.08em]",

        "backdrop-blur-[14px]",

        "transition-[background-color,border-color,color,transform] duration-150",

        "active:translate-y-px",

        active
          ? "border-[rgba(246,178,60,0.4)] bg-[rgba(246,178,60,0.1)] text-(--primary)"
          : nominal
            ? "border-[rgba(89,217,154,0.28)] bg-[rgba(3,4,5,0.88)] text-(--nominal) hover:border-[rgba(89,217,154,0.48)]"
            : "border-white/10 bg-[rgba(3,4,5,0.88)] text-white/68 hover:border-white/20 hover:bg-[rgba(12,15,18,0.94)] hover:text-white",
      ].join(
        " ",
      )}
    >
      <Icon
        size={11}
        strokeWidth={
          1.7
        }
      />

      <span className="hidden sm:inline">
        {label}
      </span>
    </button>
  );
}

/* =========================================================
   Main Component
   ========================================================= */

export function AeroWorldMap() {
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
        LayerId,
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
    baseMapId,
    setBaseMapId,
  ] =
    useState<BaseMapId>(
      "osm",
    );

  const [
    layers,
    setLayers,
  ] =
    useState<LayerState>(
      defaultLayerState,
    );

  const [
    coordinates,
    setCoordinates,
  ] =
    useState(
      formatCoordinates(
        initialMapView
          .latitude,

        initialMapView
          .longitude,
      ),
    );

  const [
    zoom,
    setZoom,
  ] =
    useState(
      initialMapView
        .zoom
        .toFixed(
          1,
        ),
    );

  const [
    layersOpen,
    setLayersOpen,
  ] =
    useState(
      false,
    );

  /* =======================================================
     Initialize Leaflet
     ======================================================= */

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
              true,

            attributionControl:
              false,

            maxBounds:
              worldBounds,

            maxBoundsViscosity:
              1,

            worldCopyJump:
              false,
          },
        );

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

      mapRef.current =
        map;

      const baseLayer =
        L.tileLayer(
          baseMaps[
            baseMapId
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
                baseMapId
              ]
                .attribution,
          },
        );

      baseLayer.addTo(
        map,
      );

      baseTileRef.current =
        baseLayer;

      /* ---------------------------------------------------
         Live telemetry group
         --------------------------------------------------- */

      const liveDroneLayer =
        L.layerGroup()
          .addTo(
            map,
          );

      liveDroneLayerRef.current =
        liveDroneLayer;

      /* ---------------------------------------------------
         Geofence
         --------------------------------------------------- */

      const geofenceLayer =
        L.geoJSON(
          geofenceZone,
          {
            style: {
              color:
                mapColors
                  .geofenceBoundary,

              weight:
                2,

              dashArray:
                "6 6",

              fillColor:
                mapColors
                  .geofenceFill,

              fillOpacity:
                0.08,
            },

            onEachFeature:
              (
                feature,
                layer,
              ) => {
                const name =
                  escapeHtml(
                    feature
                      .properties
                      ?.name ??
                      "Mission Geofence",
                  );

                layer.bindPopup(
                  `<strong>${name}</strong><br/>Mission operation boundary`,
                );
              },
          },
        ).addTo(
          map,
        );

      /* ---------------------------------------------------
         Restricted zones
         --------------------------------------------------- */

      const restrictedLayer =
        L.geoJSON(
          restrictedZones,
          {
            style: {
              color:
                mapColors
                  .restrictedBoundary,

              weight:
                2,

              fillColor:
                mapColors
                  .restrictedFill,

              fillOpacity:
                0.12,
            },

            onEachFeature:
              (
                feature,
                layer,
              ) => {
                const name =
                  escapeHtml(
                    feature
                      .properties
                      ?.name ??
                      "Restricted Zone",
                  );

                layer.bindPopup(
                  `<strong>${name}</strong><br/>Restricted flight area`,
                );
              },
          },
        ).addTo(
          map,
        );

      /* ---------------------------------------------------
         Mission route
         --------------------------------------------------- */

      const routeLayer =
        L.geoJSON(
          missionRoute,
          {
            style: {
              color:
                mapColors
                  .route,

              weight:
                3,

              dashArray:
                "7 6",

              opacity:
                0.9,
            },

            onEachFeature:
              (
                feature,
                layer,
              ) => {
                const name =
                  escapeHtml(
                    feature
                      .properties
                      ?.name ??
                      "Mission Route",
                  );

                layer.bindPopup(
                  `<strong>${name}</strong><br/>Planned autonomous route`,
                );
              },
          },
        ).addTo(
          map,
        );

      /* ---------------------------------------------------
         Heat observations
         --------------------------------------------------- */

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
                      mapColors
                        .heat,

                    fillColor:
                      mapColors
                        .heat,

                    fillOpacity:
                      0.16,

                    weight:
                      1,

                    opacity:
                      0.5,
                  },
                ),
          },
        ).addTo(
          map,
        );

      /* ---------------------------------------------------
         Home
         --------------------------------------------------- */

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
                      mapColors
                        .mapStroke,

                    weight:
                      2,

                    fillColor:
                      mapColors
                        .home,

                    fillOpacity:
                      1,
                  },
                ),

            onEachFeature:
              (
                feature,
                layer,
              ) => {
                const name =
                  escapeHtml(
                    feature
                      .properties
                      ?.name ??
                      "HOME",
                  );

                layer.bindPopup(
                  `<strong>${name}</strong><br/>Launch / return point`,
                );
              },
          },
        ).addTo(
          map,
        );

      /* ---------------------------------------------------
         Contacts
         --------------------------------------------------- */

      const contactLayer =
        L.geoJSON(
          contactPoints,
          {
            pointToLayer:
              (
                feature,
                latlng,
              ) => {
                const name =
                  escapeHtml(
                    feature
                      .properties
                      ?.name ??
                      "Contact",
                  );

                const type =
                  escapeHtml(
                    feature
                      .properties
                      ?.type ??
                      "Unknown",
                  );

                const confidence =
                  escapeHtml(
                    String(
                      feature
                        .properties
                        ?.confidence ??
                        "N/A",
                    ),
                  );

                return L.circleMarker(
                  latlng,
                  {
                    radius:
                      6,

                    color:
                      "#ffffff",

                    weight:
                      1,

                    fillColor:
                      mapColors
                        .contact,

                    fillOpacity:
                      1,
                  },
                ).bindPopup(
                  `<strong>${name}</strong><br/>Type: ${type}<br/>Confidence: ${confidence}`,
                );
              },
          },
        ).addTo(
          map,
        );

      /* ---------------------------------------------------
         Simulated aircraft
         --------------------------------------------------- */

      const droneLayer =
        L.geoJSON(
          dronePoints,
          {
            pointToLayer:
              (
                feature,
                latlng,
              ) => {
                const name =
                  escapeHtml(
                    feature
                      .properties
                      ?.name ??
                      "Aircraft",
                  );

                const status =
                  escapeHtml(
                    String(
                      feature
                        .properties
                        ?.status ??
                        "N/A",
                    ),
                  );

                const battery =
                  escapeHtml(
                    String(
                      feature
                        .properties
                        ?.battery ??
                        "N/A",
                    ),
                  );

                const altitude =
                  escapeHtml(
                    String(
                      feature
                        .properties
                        ?.altitude ??
                        "N/A",
                    ),
                  );

                return L.circleMarker(
                  latlng,
                  {
                    radius:
                      7,

                    color:
                      mapColors
                        .mapStroke,

                    weight:
                      2,

                    fillColor:
                      mapColors
                        .drone,

                    fillOpacity:
                      1,
                  },
                ).bindPopup(
                  `<strong>${name}</strong><br/>Status: ${status}<br/>Battery: ${battery}<br/>Altitude: ${altitude}`,
                );
              },
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

      /* ---------------------------------------------------
         Pointer / zoom telemetry
         --------------------------------------------------- */

      map.on(
        "mousemove",
        (
          event,
        ) => {
          setCoordinates(
            formatCoordinates(
              event
                .latlng
                .lat,

              event
                .latlng
                .lng,
            ),
          );
        },
      );

      map.on(
        "zoomend",
        () => {
          setZoom(
            map
              .getZoom()
              .toFixed(
                1,
              ),
          );
        },
      );

      const resizeOne =
        window.setTimeout(
          () =>
            map.invalidateSize(),
          100,
        );

      const resizeTwo =
        window.setTimeout(
          () =>
            map.invalidateSize(),
          500,
        );

      const resizeThree =
        window.setTimeout(
          () =>
            map.invalidateSize(),
          1000,
        );

      return () => {
        window.clearTimeout(
          resizeOne,
        );

        window.clearTimeout(
          resizeTwo,
        );

        window.clearTimeout(
          resizeThree,
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

  /* =======================================================
     Layer visibility
     ======================================================= */

  useEffect(
    () => {
      const map =
        mapRef.current;

      if (
        !map
      ) {
        return;
      }

      for (
        const layerId of
        Object.keys(
          layers,
        ) as LayerId[]
      ) {
        const layer =
          layerRefs.current[
            layerId
          ];

        if (
          !layer
        ) {
          continue;
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
      }
    },
    [
      layers,
    ],
  );

  /* =======================================================
     Base map
     ======================================================= */

  useEffect(
    () => {
      const map =
        mapRef.current;

      if (
        !map
      ) {
        return;
      }

      const worldBounds =
        createWorldBounds();

      if (
        baseTileRef.current
      ) {
        map.removeLayer(
          baseTileRef.current,
        );
      }

      const nextBaseLayer =
        L.tileLayer(
          baseMaps[
            baseMapId
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
                baseMapId
              ]
                .attribution,
          },
        );

      nextBaseLayer.addTo(
        map,
      );

      nextBaseLayer
        .bringToBack();

      baseTileRef.current =
        nextBaseLayer;
    },
    [
      baseMapId,
    ],
  );

  /* =======================================================
     Live aircraft
     ======================================================= */

  useEffect(
    () => {
      const map =
        mapRef.current;

      const liveDroneLayer =
        liveDroneLayerRef.current;

      if (
        !map ||
        !liveDroneLayer
      ) {
        return;
      }

      liveDroneLayer.clearLayers();

      if (
        !telemetry?.gps
      ) {
        return;
      }

      const latitude =
        telemetry.gps.lat;

      const longitude =
        telemetry.gps.lng;

      const risk =
        telemetry.risk ??
        "low";

      const deviceName =
        escapeHtml(
          telemetry.device ??
            "Live Aircraft",
        );

      const source =
        escapeHtml(
          telemetry.source ??
            "unknown",
        );

      const battery =
        telemetry.battery ??
        0;

      const temperature =
        telemetry.temperature ??
        0;

      const smoke =
        telemetry.smoke ??
        0;

      const secureSession =
        telemetry.secureSession
          ? "ACTIVE"
          : "OFF";

      const riskLabel =
        risk.toUpperCase();

      const marker =
        L.marker(
          [
            latitude,
            longitude,
          ],
          {
            icon:
              createLiveDroneIcon(
                risk,
              ),

            zIndexOffset:
              1000,
          },
        ).bindPopup(
          `
            <strong>${deviceName}</strong><br/>
            Source: ${source}<br/>
            Risk: ${riskLabel}<br/>
            Battery: ${battery}%<br/>
            Temperature: ${temperature}°C<br/>
            Smoke: ${smoke}<br/>
            Secure Session: ${secureSession}<br/>
            GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
          `,
        );

      marker.addTo(
        liveDroneLayer,
      );

      if (
        layers[
          "live-drone"
        ] &&
        !map.hasLayer(
          liveDroneLayer,
        )
      ) {
        liveDroneLayer.addTo(
          map,
        );
      }
    },
    [
      telemetry,
      layers,
    ],
  );

  /* =======================================================
     Commands
     ======================================================= */

  function toggleLayer(
    layerId:
      LayerId,
  ) {
    setLayers(
      (
        current,
      ) => ({
        ...current,

        [layerId]:
          !current[
            layerId
          ],
      }),
    );
  }

  function toggleBaseMap() {
    setBaseMapId(
      (
        current,
      ) =>
        current ===
        "osm"
          ? "hot"
          : "osm",
    );
  }

  function flyToAoi() {
    mapRef.current?.flyTo(
      [
        23.0225,
        72.5714,
      ],
      11.5,
      {
        duration:
          1.2,
      },
    );
  }

  function flyToHome() {
    mapRef.current?.flyTo(
      [
        23.0225,
        72.5714,
      ],
      15,
      {
        duration:
          1.2,
      },
    );
  }

  function flyToMission() {
    mapRef.current?.flyTo(
      [
        23.0302,
        72.5815,
      ],
      14,
      {
        duration:
          1.2,
      },
    );
  }

  function flyToUav() {
    const liveGps =
      telemetry?.gps;

    if (
      liveGps
    ) {
      mapRef.current?.flyTo(
        [
          liveGps.lat,
          liveGps.lng,
        ],
        16,
        {
          duration:
            1.2,
        },
      );

      return;
    }

    flyToMission();
  }

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#020304]">
      {/* Actual Leaflet canvas */}

      <div
        ref={
          containerRef
        }
        className="missionnexus-map absolute inset-0 z-0"
      />

      {/* Subtle tactical shading */}

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(3,4,5,0.015),rgba(3,4,5,0.10))]" />

      {/* ===================================================
          Top-left source state
          =================================================== */}

      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-80px)]">
        <div className="rounded-[5px] border border-white/10 bg-[rgba(3,4,5,0.88)] px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,0.34)] backdrop-blur-[16px]">
          <div className="flex items-center gap-2">
            <Globe2
              size={12}
              strokeWidth={
                1.6
              }
              className="text-(--info)"
            />

            <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.13em] text-(--info)">
              MissionNexus · Tactical Map
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[7px] uppercase tracking-[0.07em] text-white/38">
            <span>
              {
                baseMaps[
                  baseMapId
                ].shortLabel
              }
            </span>

            <span>
              WGS-84
            </span>

            <span>
              ZOOM {zoom}
            </span>

            <span
              className={
                telemetry?.gps
                  ? "text-(--nominal)"
                  : "text-(--caution)"
              }
            >
              {telemetry?.gps
                ? "GPS LOCK"
                : "GPS SEARCH"}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================
          Layer console
          =================================================== */}

      <div className="absolute right-3 top-3 z-30">
        <button
          type="button"
          onClick={() =>
            setLayersOpen(
              (
                current,
              ) =>
                !current,
            )
          }
          aria-expanded={
            layersOpen
          }
          className={[
            "flex h-8 items-center gap-2 rounded-[5px] border px-2.5",

            "bg-[rgba(3,4,5,0.9)] backdrop-blur-[16px]",

            "font-mono text-[7px] font-semibold uppercase tracking-[0.09em]",

            "shadow-[0_10px_30px_rgba(0,0,0,0.32)]",

            "transition-[border-color,color,background-color]",

            layersOpen
              ? "border-[rgba(246,178,60,0.38)] text-(--primary)"
              : "border-white/10 text-white/60 hover:border-white/20 hover:text-white",
          ].join(
            " ",
          )}
        >
          <Layers
            size={11}
            strokeWidth={
              1.7
            }
          />

          Layers

          {layersOpen ? (
            <ChevronUp
              size={10}
            />
          ) : (
            <ChevronDown
              size={10}
            />
          )}
        </button>

        {layersOpen ? (
          <div className="mt-2 w-[210px] rounded-[6px] border border-white/10 bg-[rgba(3,4,5,0.94)] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.48)] backdrop-blur-[18px]">
            <button
              type="button"
              onClick={
                toggleBaseMap
              }
              className="mb-2 flex w-full items-center justify-between rounded-[4px] border border-[rgba(90,169,255,0.24)] bg-[rgba(90,169,255,0.055)] px-2.5 py-2 font-mono text-[7px] font-semibold uppercase tracking-[0.07em] text-(--info)"
            >
              <span>
                Base Map
              </span>

              <span>
                {
                  baseMaps[
                    baseMapId
                  ]
                    .shortLabel
                }
              </span>
            </button>

            <div className="grid gap-1">
              {layerButtons.map(
                (
                  layer,
                ) => {
                  const enabled =
                    layers[
                      layer.id
                    ];

                  return (
                    <button
                      key={
                        layer.id
                      }
                      type="button"
                      onClick={() =>
                        toggleLayer(
                          layer.id,
                        )
                      }
                      className={[
                        "flex h-7 w-full items-center justify-between rounded-[4px] border px-2.5",

                        "font-mono text-[7px] font-semibold uppercase tracking-[0.06em]",

                        "transition-[background-color,border-color,color]",

                        enabled
                          ? "border-[rgba(246,178,60,0.24)] bg-[rgba(246,178,60,0.055)] text-(--primary)"
                          : "border-white/[0.07] bg-white/[0.02] text-white/35 hover:text-white/65",
                      ].join(
                        " ",
                      )}
                    >
                      <span>
                        {
                          layer.label
                        }
                      </span>

                      <span>
                        {enabled
                          ? "ON"
                          : "OFF"}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ===================================================
          Bottom coordinate state
          =================================================== */}

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden sm:block">
        <div className="flex h-8 items-center gap-2 rounded-[5px] border border-white/10 bg-[rgba(3,4,5,0.88)] px-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.3)] backdrop-blur-[14px]">
          <Crosshair
            size={11}
            strokeWidth={
              1.7
            }
            className="text-(--info)"
          />

          <span className="font-mono text-[7px] uppercase tracking-[0.07em] text-white/52">
            {coordinates}
          </span>
        </div>
      </div>

      {/* ===================================================
          Navigation controls
          =================================================== */}

      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
        <MapAction
          icon={
            MapPinned
          }
          label="AOI"
          onClick={
            flyToAoi
          }
        />

        <MapAction
          icon={
            Home
          }
          label="Home"
          onClick={
            flyToHome
          }
          nominal
        />

        <MapAction
          icon={
            Plane
          }
          label="Mission"
          onClick={
            flyToMission
          }
          active
        />

        <MapAction
          icon={
            LocateFixed
          }
          label="UAV"
          onClick={
            flyToUav
          }
        />
      </div>

      {/* ===================================================
          Live telemetry marker indicator
          =================================================== */}

      <div className="pointer-events-none absolute bottom-14 right-3 z-20 hidden lg:flex">
        <div className="flex items-center gap-2 rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.84)] px-2.5 py-1.5 backdrop-blur-[14px]">
          {telemetry?.gps ? (
            <>
              <Radio
                size={10}
                strokeWidth={
                  1.7
                }
                className="text-(--nominal)"
              />

              <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.08em] text-(--nominal)">
                Live Aircraft
              </span>
            </>
          ) : (
            <>
              <Satellite
                size={10}
                strokeWidth={
                  1.7
                }
                className="text-(--caution)"
              />

              <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.08em] text-(--caution)">
                Awaiting GPS
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}