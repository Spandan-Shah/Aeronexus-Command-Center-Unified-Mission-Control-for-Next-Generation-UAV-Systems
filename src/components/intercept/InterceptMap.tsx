import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Layers3,
  LocateFixed,
  Minus,
  Plus,
  Satellite,
} from "lucide-react";

import L, {
  type Map as LeafletMap,
  type TileLayer,
} from "leaflet";

import "leaflet/dist/leaflet.css";

import type {
  DefenseSector,
  InterceptorState,
  InterceptSnapshot,
  Vector2,
} from "../../hooks/useInterceptSimulation";

/* =========================================================
   Types
   ========================================================= */

type InterceptMapProps = {
  snapshot:
    InterceptSnapshot;

  origin?: {
    lat: number;
    lng: number;
  };
};

type BaseMapMode =
  | "satellite"
  | "osm"
  | "hot";

type FollowMode =
  | "network"
  | "intruder"
  | "assigned"
  | "free";

/* =========================================================
   Map Configuration
   ========================================================= */

const DEFAULT_ORIGIN = {
  lat:
    23.0225,

  lng:
    72.5714,
};

const colors = {
  intruder:
    "#FF375F",

  interceptor:
    "#00D9FF",

  cv:
    "#FFFFFF",

  ctrv:
    "#D77DFF",

  adaptive:
    "#A7FF4F",

  guidance:
    "#FFD166",

  safety:
    "#FF4D9D",

  shadow:
    "#FFB84D",

  nominal:
    "#59D99A",

  background:
    "#030405",
};

const baseMaps:
  Record<
    BaseMapMode,
    {
      url: string;
      attribution: string;
    }
  > = {
  satellite: {
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

    attribution:
      "Imagery © Esri",
  },

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
};

/* =========================================================
   Geographic Conversion
   ========================================================= */

function enuToLatLng(
  point:
    Vector2,

  origin: {
    lat: number;
    lng: number;
  },
): L.LatLngTuple {
  const metersPerDegreeLatitude =
    111_320;

  const latitudeRadians =
    (
      origin.lat *
      Math.PI
    ) /
    180;

  const metersPerDegreeLongitude =
    metersPerDegreeLatitude *
    Math.cos(
      latitudeRadians,
    );

  return [
    origin.lat +
      point.y /
        metersPerDegreeLatitude,

    origin.lng +
      point.x /
        Math.max(
          1,
          metersPerDegreeLongitude,
        ),
  ];
}

function toLatLngArray(
  points:
    Vector2[],

  origin: {
    lat: number;
    lng: number;
  },
): L.LatLngTuple[] {
  return points.map(
    (
      point,
    ) =>
      enuToLatLng(
        point,
        origin,
      ),
  );
}

/* =========================================================
   Aircraft Marker
   ========================================================= */

function createAircraftIcon(
  kind:
    | "intruder"
    | "interceptor",

  heading:
    number,

  label:
    string,

  accent:
    string,

  assigned =
    false,
) {
  const markerSize =
    kind ===
    "intruder"
      ? 46
      : 42;

  const ringColor =
    kind ===
    "intruder"
      ? colors.intruder
      : accent;

  return L.divIcon({
    className:
      "",

    iconSize: [
      markerSize,
      markerSize,
    ],

    iconAnchor: [
      markerSize /
        2,

      markerSize /
        2,
    ],

    html: `
      <div
        style="
          position:relative;
          width:${markerSize}px;
          height:${markerSize}px;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:none;
        "
      >
        <div
          style="
            position:absolute;
            inset:1px;
            border-radius:999px;
            border:${assigned ? 2 : 1}px solid ${ringColor};
            background:rgba(3,4,5,0.94);
            box-shadow:
              0 0 0 ${assigned ? 5 : 3}px ${ringColor}18,
              0 0 ${assigned ? 24 : 16}px ${ringColor}aa;
          "
        ></div>

        <div
          style="
            position:relative;
            width:25px;
            height:25px;
            transform:rotate(${heading}deg);
          "
        >
          <div
            style="
              position:absolute;
              left:9px;
              top:0;
              width:0;
              height:0;
              border-left:3.5px solid transparent;
              border-right:3.5px solid transparent;
              border-bottom:17px solid ${ringColor};
            "
          ></div>

          <div
            style="
              position:absolute;
              left:0;
              top:11px;
              width:25px;
              height:3px;
              border-radius:999px;
              background:${ringColor};
            "
          ></div>
        </div>

        <div
          style="
            position:absolute;
            left:50%;
            top:${markerSize + 3}px;
            transform:translateX(-50%);
            white-space:nowrap;
            padding:2px 5px;
            border-radius:3px;
            background:rgba(3,4,5,0.90);
            border:1px solid ${ringColor}66;
            color:${ringColor};
            font:700 10px 'JetBrains Mono',monospace;
            box-shadow:0 3px 8px rgba(0,0,0,0.65);
          "
        >
          ${label}
        </div>
      </div>
    `,
  });
}

/* =========================================================
   Station Marker
   ========================================================= */

function createStationIcon(
  sector:
    DefenseSector,
) {
  return L.divIcon({
    className:
      "",

    iconSize: [
      30,
      30,
    ],

    iconAnchor: [
      15,
      15,
    ],

    html: `
      <div
        style="
          width:30px;
          height:30px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:5px;
          border:2px solid ${sector.active ? "#FF375F" : sector.color};
          background:rgba(3,4,5,0.94);
          box-shadow:0 0 14px ${
            sector.active
              ? "#FF375F"
              : sector.color
          }66;
          color:${sector.active ? "#FF375F" : sector.color};
          font:700 10px 'JetBrains Mono',monospace;
        "
      >
        D${sector.interceptorId}
      </div>
    `,
  });
}

/* =========================================================
   Compact Control Button
   ========================================================= */

function MapButton({
  label,
  active = false,
  onClick,
}: {
  label:
    string;

  active?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "h-8 rounded-[4px] border px-2.5",

        "font-mono text-[13px] font-medium",

        "transition-colors",

        active
          ? "border-[rgba(90,169,255,0.38)] bg-[rgba(90,169,255,0.08)] text-[#8FC7FF]"
          : "border-white/[0.08] bg-[#030405] text-white/58 hover:border-white/[0.16] hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* =========================================================
   Main
   ========================================================= */

export function InterceptMap({
  snapshot,
  origin =
    DEFAULT_ORIGIN,
}: InterceptMapProps) {
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

  const intruderMarkerRef =
    useRef<
      L.Marker |
      null
    >(null);

  const interceptorMarkerRefs =
    useRef<
      Record<
        number,
        L.Marker
      >
    >({});

  const stationMarkerRefs =
    useRef<
      Record<
        string,
        L.Marker
      >
    >({});

  const sectorCircleRefs =
    useRef<
      Record<
        string,
        L.Circle
      >
    >({});

  const intruderTrailRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const interceptorTrailRefs =
    useRef<
      Record<
        number,
        L.Polyline
      >
    >({});

  const baselinePathRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const ctrvPathRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const adaptivePathRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const guidanceLineRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const guidanceTargetRef =
    useRef<
      L.CircleMarker |
      null
    >(null);

  const desiredSeparationRef =
    useRef<
      L.Circle |
      null
    >(null);

  const safetySeparationRef =
    useRef<
      L.Circle |
      null
    >(null);

  const [
    baseMap,
    setBaseMap,
  ] =
    useState<BaseMapMode>(
      "satellite",
    );

  const [
    followMode,
    setFollowMode,
  ] =
    useState<FollowMode>(
      "network",
    );

  const [
    showZones,
    setShowZones,
  ] =
    useState(
      true,
    );

  const [
    showStations,
    setShowStations,
  ] =
    useState(
      true,
    );

  const [
    showTrails,
    setShowTrails,
  ] =
    useState(
      true,
    );

  const [
    showCv,
    setShowCv,
  ] =
    useState(
      true,
    );

  const [
    showCtrv,
    setShowCtrv,
  ] =
    useState(
      true,
    );

  const [
    showAdaptive,
    setShowAdaptive,
  ] =
    useState(
      true,
    );

  const [
    showSafety,
    setShowSafety,
  ] =
    useState(
      true,
    );

  const positions =
    useMemo(
      () => {
        const interceptors =
          Object.fromEntries(
            snapshot.interceptors.map(
              (
                interceptor,
              ) => [
                interceptor.id,

                enuToLatLng(
                  interceptor,
                  origin,
                ),
              ],
            ),
          ) as Record<
            number,
            L.LatLngTuple
          >;

        const stations =
          Object.fromEntries(
            snapshot.sectors.map(
              (
                sector,
              ) => [
                sector.id,

                enuToLatLng(
                  sector.station,
                  origin,
                ),
              ],
            ),
          ) as Record<
            string,
            L.LatLngTuple
          >;

        const centers =
          Object.fromEntries(
            snapshot.sectors.map(
              (
                sector,
              ) => [
                sector.id,

                enuToLatLng(
                  sector.center,
                  origin,
                ),
              ],
            ),
          ) as Record<
            string,
            L.LatLngTuple
          >;

        return {
          intruder:
            enuToLatLng(
              snapshot.intruder,
              origin,
            ),

          interceptors,

          stations,

          centers,

          intruderTrail:
            toLatLngArray(
              snapshot.intruderTrail,
              origin,
            ),

          interceptorTrails:
            Object.fromEntries(
              Object.entries(
                snapshot.interceptorTrails,
              ).map(
                (
                  [
                    key,
                    trail,
                  ],
                ) => [
                  Number(
                    key,
                  ),

                  toLatLngArray(
                    trail,
                    origin,
                  ),
                ],
              ),
            ) as Record<
              number,
              L.LatLngTuple[]
            >,

          baseline:
            toLatLngArray(
              snapshot.baselinePath,
              origin,
            ),

          ctrv:
            toLatLngArray(
              snapshot.ctrvPath,
              origin,
            ),

          adaptive:
            toLatLngArray(
              snapshot.mlPath,
              origin,
            ),

          guidance:
            enuToLatLng(
              snapshot.guidanceTarget,
              origin,
            ),
        };
      },
      [
        snapshot,
        origin.lat,
        origin.lng,
      ],
    );

  /* =======================================================
     Initialize
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
              origin.lat,
              origin.lng,
            ],

            zoom:
              14,

            minZoom:
              3,

            maxZoom:
              19,

            zoomControl:
              false,

            attributionControl:
              true,

            preferCanvas:
              true,

            worldCopyJump:
              false,
          },
        );

      mapRef.current =
        map;

      baseTileRef.current =
        L.tileLayer(
          baseMaps.satellite
            .url,
          {
            maxZoom:
              19,

            attribution:
              baseMaps.satellite
                .attribution,
          },
        ).addTo(
          map,
        );

      /* ===============================================
         Attribution
         =============================================== */

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
            "rgba(5,6,13,0.86)";

          element.style.color =
            "rgba(255,255,255,0.76)";

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

      /* ===============================================
         Intruder
         =============================================== */

      intruderMarkerRef.current =
        L.marker(
          positions.intruder,
          {
            icon:
              createAircraftIcon(
                "intruder",
                snapshot.intruder
                  .heading,
                "INTRUDER",
                colors.intruder,
              ),

            zIndexOffset:
              2000,
          },
        ).addTo(
          map,
        );

      /* ===============================================
         Interceptors
         =============================================== */

      snapshot.interceptors.forEach(
        (
          interceptor,
        ) => {
          const sector =
            snapshot.sectors.find(
              (
                item,
              ) =>
                item.interceptorId ===
                interceptor.id,
            );

          const accent =
            sector?.color ??
            colors.interceptor;

          interceptorMarkerRefs.current[
            interceptor.id
          ] =
            L.marker(
              positions.interceptors[
                interceptor.id
              ],
              {
                icon:
                  createAircraftIcon(
                    "interceptor",
                    interceptor.heading,
                    `INT-${interceptor.id}`,
                    accent,
                    interceptor.assigned,
                  ),

                zIndexOffset:
                  interceptor.assigned
                    ? 1900
                    : 1200,
              },
            ).addTo(
              map,
            );
        },
      );

      /* ===============================================
         Defence Sectors + Stations
         =============================================== */

      snapshot.sectors.forEach(
        (
          sector,
        ) => {
          sectorCircleRefs.current[
            sector.id
          ] =
            L.circle(
              positions.centers[
                sector.id
              ],
              {
                radius:
                  sector.radiusMeters,

                color:
                  sector.active
                    ? colors.intruder
                    : sector.color,

                weight:
                  sector.active
                    ? 3
                    : 2,

                opacity:
                  sector.active
                    ? 1
                    : 0.82,

                fillColor:
                  sector.active
                    ? colors.intruder
                    : sector.color,

                fillOpacity:
                  sector.active
                    ? 0.12
                    : 0.045,

                dashArray:
                  sector.active
                    ? "10 5"
                    : "6 7",

                className:
                  "mn-zone-path",
              },
            )
              .bindTooltip(
                `DEFENCE ${sector.label}`,
                {
                  direction:
                    "center",

                  permanent:
                    false,
                },
              )
              .addTo(
                map,
              );

          stationMarkerRefs.current[
            sector.id
          ] =
            L.marker(
              positions.stations[
                sector.id
              ],
              {
                icon:
                  createStationIcon(
                    sector,
                  ),

                zIndexOffset:
                  1000,
              },
            )
              .bindTooltip(
                `Station ${sector.interceptorId} · ${sector.label}`,
              )
              .addTo(
                map,
              );
        },
      );

      /* ===============================================
         Trails
         =============================================== */

      intruderTrailRef.current =
        L.polyline(
          positions.intruderTrail,
          {
            color:
              colors.intruder,

            weight:
              4,

            opacity:
              0.98,

            className:
              "mn-glow-path",
          },
        ).addTo(
          map,
        );

      snapshot.interceptors.forEach(
        (
          interceptor,
        ) => {
          const sector =
            snapshot.sectors.find(
              (
                item,
              ) =>
                item.interceptorId ===
                interceptor.id,
            );

          interceptorTrailRefs.current[
            interceptor.id
          ] =
            L.polyline(
              positions.interceptorTrails[
                interceptor.id
              ] ??
                [],
              {
                color:
                  sector?.color ??
                  colors.interceptor,

                weight:
                  interceptor.assigned
                    ? 4
                    : 2.5,

                opacity:
                  interceptor.assigned
                    ? 1
                    : 0.6,

                className:
                  "mn-glow-path",
              },
            ).addTo(
              map,
            );
        },
      );

      /* ===============================================
         Prediction
         =============================================== */

      baselinePathRef.current =
        L.polyline(
          [
            positions.intruder,
            ...positions.baseline,
          ],
          {
            color:
              colors.cv,

            weight:
              3,

            opacity:
              0.92,

            dashArray:
              "5 8",

            className:
              "mn-glow-path",
          },
        ).addTo(
          map,
        );

      ctrvPathRef.current =
        L.polyline(
          [
            positions.intruder,
            ...positions.ctrv,
          ],
          {
            color:
              colors.ctrv,

            weight:
              3.5,

            opacity:
              0.96,

            dashArray:
              "10 7",

            className:
              "mn-glow-path",
          },
        ).addTo(
          map,
        );

      adaptivePathRef.current =
        L.polyline(
          [
            positions.intruder,
            ...positions.adaptive,
          ],
          {
            color:
              colors.adaptive,

            weight:
              5,

            opacity:
              1,

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      /* ===============================================
         Guidance
         =============================================== */

      const assigned =
        snapshot.interceptors.find(
          (
            interceptor,
          ) =>
            interceptor.id ===
            snapshot.assignedInterceptorId,
        );

      const assignedLatLng =
        assigned
          ? positions.interceptors[
              assigned.id
            ]
          : positions.intruder;

      guidanceLineRef.current =
        L.polyline(
          [
            assignedLatLng,
            positions.guidance,
          ],
          {
            color:
              colors.guidance,

            weight:
              4,

            opacity:
              1,

            dashArray:
              "7 5",

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      guidanceTargetRef.current =
        L.circleMarker(
          positions.guidance,
          {
            radius:
              9,

            color:
              colors.guidance,

            weight:
              3,

            fillColor:
              colors.background,

            fillOpacity:
              0.85,

            className:
              "mn-strong-glow-path",
          },
        )
          .bindTooltip(
            "AI RENDEZVOUS TARGET",
          )
          .addTo(
            map,
          );

      /* ===============================================
         Separation Geometry
         =============================================== */

      desiredSeparationRef.current =
        L.circle(
          positions.intruder,
          {
            radius:
              snapshot.desiredSeparationMeters,

            color:
              colors.shadow,

            weight:
              2.5,

            opacity:
              0.95,

            fillOpacity:
              0,

            dashArray:
              "9 7",

            className:
              "mn-glow-path",
          },
        ).addTo(
          map,
        );

      safetySeparationRef.current =
        L.circle(
          positions.intruder,
          {
            radius:
              snapshot.minimumSeparationMeters,

            color:
              colors.safety,

            weight:
              3,

            opacity:
              1,

            fillColor:
              colors.safety,

            fillOpacity:
              0.09,

            dashArray:
              "4 5",

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      map.on(
        "dragstart",
        () => {
          setFollowMode(
            "free",
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

      window.setTimeout(
        () => {
          const points = [
            positions.intruder,

            ...Object.values(
              positions.interceptors,
            ),

            ...Object.values(
              positions.stations,
            ),
          ];

          map.fitBounds(
            L.latLngBounds(
              points,
            ),
            {
              padding: [
                70,
                70,
              ],

              maxZoom:
                14,
            },
          );
        },
        120,
      );

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

        interceptorMarkerRefs.current =
          {};

        stationMarkerRefs.current =
          {};

        sectorCircleRefs.current =
          {};

        interceptorTrailRefs.current =
          {};
      };
    },
    [],
  );

  /* =======================================================
     Basemap
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

      if (
        baseTileRef.current
      ) {
        map.removeLayer(
          baseTileRef.current,
        );
      }

      const config =
        baseMaps[
          baseMap
        ];

      const layer =
        L.tileLayer(
          config.url,
          {
            minZoom:
              3,

            maxZoom:
              19,

            attribution:
              config.attribution,
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

  /* =======================================================
     Live Updates
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

      intruderMarkerRef.current
        ?.setLatLng(
          positions.intruder,
        );

      intruderMarkerRef.current
        ?.setIcon(
          createAircraftIcon(
            "intruder",
            snapshot.intruder
              .heading,
            "INTRUDER",
            colors.intruder,
          ),
        );

      snapshot.interceptors.forEach(
        (
          interceptor,
        ) => {
          const sector =
            snapshot.sectors.find(
              (
                item,
              ) =>
                item.interceptorId ===
                interceptor.id,
            );

          const marker =
            interceptorMarkerRefs.current[
              interceptor.id
            ];

          marker?.setLatLng(
            positions.interceptors[
              interceptor.id
            ],
          );

          marker?.setIcon(
            createAircraftIcon(
              "interceptor",
              interceptor.heading,
              `INT-${interceptor.id}`,
              sector?.color ??
                colors.interceptor,
              interceptor.assigned,
            ),
          );

          marker?.setZIndexOffset(
            interceptor.assigned
              ? 1900
              : 1200,
          );

          interceptorTrailRefs.current[
            interceptor.id
          ]?.setLatLngs(
            positions.interceptorTrails[
              interceptor.id
            ] ??
              [],
          );

          interceptorTrailRefs.current[
            interceptor.id
          ]?.setStyle({
            weight:
              interceptor.assigned
                ? 4
                : 2.5,

            opacity:
              showTrails
                ? interceptor.assigned
                  ? 1
                  : 0.62
                : 0,
          });
        },
      );

      snapshot.sectors.forEach(
        (
          sector,
        ) => {
          const circle =
            sectorCircleRefs.current[
              sector.id
            ];

          circle?.setLatLng(
            positions.centers[
              sector.id
            ],
          );

          circle?.setStyle({
            color:
              sector.active
                ? colors.intruder
                : sector.color,

            weight:
              sector.active
                ? 3
                : 2,

            opacity:
              showZones
                ? sector.active
                  ? 1
                  : 0.82
                : 0,

            fillColor:
              sector.active
                ? colors.intruder
                : sector.color,

            fillOpacity:
              showZones
                ? sector.active
                  ? 0.12
                  : 0.045
                : 0,

            dashArray:
              sector.active
                ? "10 5"
                : "6 7",
          });

          const stationMarker =
            stationMarkerRefs.current[
              sector.id
            ];

          stationMarker?.setLatLng(
            positions.stations[
              sector.id
            ],
          );

          stationMarker?.setIcon(
            createStationIcon(
              sector,
            ),
          );

          if (
            stationMarker
          ) {
            if (
              showStations &&
              !map.hasLayer(
                stationMarker,
              )
            ) {
              stationMarker.addTo(
                map,
              );
            }

            if (
              !showStations &&
              map.hasLayer(
                stationMarker,
              )
            ) {
              map.removeLayer(
                stationMarker,
              );
            }
          }
        },
      );

      intruderTrailRef.current
        ?.setLatLngs(
          positions.intruderTrail,
        );

      intruderTrailRef.current
        ?.setStyle({
          opacity:
            showTrails
              ? 0.98
              : 0,
        });

      baselinePathRef.current
        ?.setLatLngs([
          positions.intruder,
          ...positions.baseline,
        ]);

      baselinePathRef.current
        ?.setStyle({
          opacity:
            showCv
              ? 0.92
              : 0,
        });

      ctrvPathRef.current
        ?.setLatLngs([
          positions.intruder,
          ...positions.ctrv,
        ]);

      ctrvPathRef.current
        ?.setStyle({
          opacity:
            showCtrv
              ? 0.96
              : 0,
        });

      adaptivePathRef.current
        ?.setLatLngs([
          positions.intruder,
          ...positions.adaptive,
        ]);

      adaptivePathRef.current
        ?.setStyle({
          opacity:
            showAdaptive
              ? 1
              : 0,
        });

      const assigned =
        snapshot.interceptors.find(
          (
            interceptor,
          ) =>
            interceptor.id ===
            snapshot.assignedInterceptorId,
        );

      if (
        assigned
      ) {
        guidanceLineRef.current
          ?.setLatLngs([
            positions.interceptors[
              assigned.id
            ],

            positions.guidance,
          ]);

        guidanceLineRef.current
          ?.setStyle({
            opacity:
              1,
          });
      } else {
        guidanceLineRef.current
          ?.setStyle({
            opacity:
              0,
          });
      }

      guidanceTargetRef.current
        ?.setLatLng(
          positions.guidance,
        );

      guidanceTargetRef.current
        ?.setStyle({
          opacity:
            assigned
              ? 1
              : 0,

          fillOpacity:
            assigned
              ? 0.85
              : 0,
        });

      desiredSeparationRef.current
        ?.setLatLng(
          positions.intruder,
        );

      desiredSeparationRef.current
        ?.setRadius(
          snapshot.desiredSeparationMeters,
        );

      desiredSeparationRef.current
        ?.setStyle({
          opacity:
            showSafety
              ? 0.95
              : 0,
        });

      safetySeparationRef.current
        ?.setLatLng(
          positions.intruder,
        );

      safetySeparationRef.current
        ?.setRadius(
          snapshot.minimumSeparationMeters,
        );

      safetySeparationRef.current
        ?.setStyle({
          opacity:
            showSafety
              ? 1
              : 0,

          fillOpacity:
            showSafety
              ? 0.09
              : 0,
        });

      if (
        followMode ===
        "intruder"
      ) {
        map.panTo(
          positions.intruder,
          {
            animate:
              false,
          },
        );

        return;
      }

      if (
        followMode ===
          "assigned" &&
        assigned
      ) {
        map.panTo(
          positions.interceptors[
            assigned.id
          ],
          {
            animate:
              false,
          },
        );

        return;
      }

      if (
        followMode ===
        "network"
      ) {
        const points = [
          positions.intruder,

          ...Object.values(
            positions.interceptors,
          ),
        ];

        const visibleBounds =
          map
            .getBounds()
            .pad(
              -0.12,
            );

        const allVisible =
          points.every(
            (
              point,
            ) =>
              visibleBounds.contains(
                point,
              ),
          );

        if (
          !allVisible
        ) {
          map.fitBounds(
            L.latLngBounds(
              points,
            ),
            {
              padding: [
                60,
                60,
              ],

              maxZoom:
                15,

              animate:
                false,
            },
          );
        }
      }
    },
    [
      positions,
      snapshot,
      followMode,
      showZones,
      showStations,
      showTrails,
      showCv,
      showCtrv,
      showAdaptive,
      showSafety,
    ],
  );

  /* =======================================================
     Camera Commands
     ======================================================= */

  function focusNetwork() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "network",
    );

    const points = [
      positions.intruder,

      ...Object.values(
        positions.interceptors,
      ),

      ...Object.values(
        positions.stations,
      ),
    ];

    map.fitBounds(
      L.latLngBounds(
        points,
      ),
      {
        padding: [
          60,
          60,
        ],

        maxZoom:
          14,
      },
    );
  }

  function focusIntruder() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "intruder",
    );

    map.flyTo(
      positions.intruder,
      16,
      {
        duration:
          0.8,
      },
    );
  }

  function focusAssigned() {
    const map =
      mapRef.current;

    const assigned =
      snapshot.interceptors.find(
        (
          interceptor,
        ) =>
          interceptor.id ===
          snapshot.assignedInterceptorId,
      );

    if (
      !map ||
      !assigned
    ) {
      return;
    }

    setFollowMode(
      "assigned",
    );

    map.flyTo(
      positions.interceptors[
        assigned.id
      ],
      16,
      {
        duration:
          0.8,
      },
    );
  }

  function cycleBaseMap() {
    setBaseMap(
      (
        current,
      ) => {
        if (
          current ===
          "satellite"
        ) {
          return "osm";
        }

        if (
          current ===
          "osm"
        ) {
          return "hot";
        }

        return "satellite";
      },
    );
  }

  const activeSector =
    snapshot.sectors.find(
      (
        sector,
      ) =>
        sector.active,
    );

  const assignedInterceptor =
    snapshot.interceptors.find(
      (
        interceptor,
      ) =>
        interceptor.id ===
        snapshot.assignedInterceptorId,
    );

  return (
    <div className="grid h-full min-h-[560px] grid-rows-[48px_minmax(0,1fr)_44px] overflow-hidden bg-[#020304] xl:min-h-0">
      {/* ===============================================
          Compact external command bar
          =============================================== */}

      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="truncate text-[14px] font-medium text-white/70">
            Defence Network
          </div>

          <div
            className={[
              "hidden font-mono text-[13px] font-semibold md:block",

              activeSector
                ? "text-[#FF596D]"
                : "text-[#59D99A]",
            ].join(" ")}
          >
            {activeSector
              ? `${activeSector.label} INTRUSION`
              : "ALL SECTORS CLEAR"}
          </div>

          {assignedInterceptor ? (
            <div className="hidden font-mono text-[13px] text-[#00D9FF] lg:block">
              INT-
              {
                assignedInterceptor.id
              }{" "}
              ASSIGNED
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <MapButton
            label="Satellite"
            active={
              baseMap ===
              "satellite"
            }
            onClick={() =>
              setBaseMap(
                "satellite",
              )
            }
          />

          <button
            type="button"
            title="Cycle basemap"
            onClick={
              cycleBaseMap
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            {baseMap ===
            "satellite" ? (
              <Satellite
                size={14}
              />
            ) : (
              <Layers3
                size={14}
              />
            )}
          </button>

          <MapButton
            label="Network"
            active={
              followMode ===
              "network"
            }
            onClick={
              focusNetwork
            }
          />

          <MapButton
            label="Target"
            active={
              followMode ===
              "intruder"
            }
            onClick={
              focusIntruder
            }
          />

          <MapButton
            label="Interceptor"
            active={
              followMode ===
              "assigned"
            }
            onClick={
              focusAssigned
            }
          />

          <button
            type="button"
            title="Zoom out"
            onClick={() =>
              mapRef.current
                ?.zoomOut()
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            <Minus
              size={14}
            />
          </button>

          <button
            type="button"
            title="Zoom in"
            onClick={() =>
              mapRef.current
                ?.zoomIn()
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            <Plus
              size={14}
            />
          </button>

          <button
            type="button"
            title="Fit defence network"
            onClick={
              focusNetwork
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            <LocateFixed
              size={14}
            />
          </button>
        </div>
      </div>

      {/* ===============================================
          Clean map
          =============================================== */}

      <div className="intercept-map relative min-h-0">
        <style>
          {`
            .intercept-map .mn-glow-path {
              filter:
                drop-shadow(0 0 2px rgba(0,0,0,1))
                drop-shadow(0 0 3px rgba(0,0,0,0.9));
            }

            .intercept-map .mn-strong-glow-path {
              filter:
                drop-shadow(0 0 2px rgba(0,0,0,1))
                drop-shadow(0 0 5px rgba(0,0,0,0.95));
            }

            .intercept-map .mn-zone-path {
              filter:
                drop-shadow(0 0 2px rgba(0,0,0,0.9));
            }

            .intercept-map .leaflet-tooltip {
              border: 1px solid rgba(255,255,255,0.14);
              border-radius: 4px;
              background: rgba(3,4,5,0.92);
              color: rgba(255,255,255,0.86);
              box-shadow: 0 5px 14px rgba(0,0,0,0.42);
              font-family: "JetBrains Mono", monospace;
              font-size: 12px;
            }
          `}
        </style>

        <div
          ref={
            containerRef
          }
          className="missionnexus-map absolute inset-0 h-full w-full"
        />
      </div>

      {/* ===============================================
          Layer strip
          =============================================== */}

      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/[0.08] bg-[#06080b] px-3">
        <div className="flex items-center gap-1.5">
          <MapButton
            label="Zones"
            active={
              showZones
            }
            onClick={() =>
              setShowZones(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="Stations"
            active={
              showStations
            }
            onClick={() =>
              setShowStations(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="Trails"
            active={
              showTrails
            }
            onClick={() =>
              setShowTrails(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="CV"
            active={
              showCv
            }
            onClick={() =>
              setShowCv(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="CTRV"
            active={
              showCtrv
            }
            onClick={() =>
              setShowCtrv(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="AI"
            active={
              showAdaptive
            }
            onClick={() =>
              setShowAdaptive(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="Safety"
            active={
              showSafety
            }
            onClick={() =>
              setShowSafety(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />
        </div>

        <div className="hidden items-center gap-4 font-mono text-[12px] xl:flex">
          <span className="text-[#FF375F]">
            ● Intruder
          </span>

          <span className="text-[#00D9FF]">
            ● Interceptor
          </span>

          <span className="text-white">
            ┅ CV
          </span>

          <span className="text-[#D77DFF]">
            ┅ CTRV
          </span>

          <span className="text-[#A7FF4F]">
            ━ AI
          </span>

          <span className="text-[#FFD166]">
            ┅ Guidance
          </span>
        </div>
      </div>
    </div>
  );
}