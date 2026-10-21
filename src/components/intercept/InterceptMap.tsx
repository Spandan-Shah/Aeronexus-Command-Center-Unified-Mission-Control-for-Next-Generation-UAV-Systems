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
  InterceptorState,
  InterceptSnapshot,
  Vector2,
} from "../../hooks/useInterceptSimulation";

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
  | "osm";

type FollowMode =
  | "network"
  | "target"
  | "response"
  | "free";

const DEFAULT_ORIGIN = {
  lat:
    23.0225,

  lng:
    72.5714,
};

const colors = {
  intruder:
    "#FF315A",

  cv:
    "#FFFFFF",

  ctrv:
    "#D77DFF",

  adaptive:
    "#A8FF4F",

  pursuit:
    "#FFE66D",

  rendezvous:
    "#5AA9FF",

  shadow:
    "#59D99A",

  recovery:
    "#FF42A1",

  perimeter:
    "#5BFF8A",

  critical:
    "#FF315A",

  safety:
    "#FF42A1",

  standoff:
    "#FFB84D",
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
};

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

function convertPoints(
  points:
    Vector2[],

  origin: {
    lat: number;
    lng: number;
  },
) {
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

function aircraftIcon(
  aircraft:
    InterceptorState |
    InterceptSnapshot["intruder"],

  kind:
    | "intruder"
    | "interceptor",

  color:
    string,

  emphasized =
    false,
) {
  const label =
    kind ===
    "intruder"
      ? "INTRUDER"
      : aircraft.callsign;

  const size =
    kind ===
    "intruder"
      ? 50
      : emphasized
        ? 46
        : 41;

  return L.divIcon({
    className:
      "",

    iconSize: [
      size,
      size,
    ],

    iconAnchor: [
      size /
        2,
      size /
        2,
    ],

    html: `
      <div
        style="
          position:relative;
          width:${size}px;
          height:${size}px;
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
            border:${emphasized ? 2.5 : 2}px solid ${color};
            background:rgba(3,4,5,.96);
            box-shadow:
              0 0 0 5px ${color}18,
              0 0 ${emphasized ? 30 : 22}px ${color}cc;
          "
        ></div>

        <div
          style="
            position:relative;
            width:27px;
            height:27px;
            transform:rotate(${aircraft.heading}deg);
          "
        >
          <div
            style="
              position:absolute;
              top:0;
              left:9px;
              border-left:4.5px solid transparent;
              border-right:4.5px solid transparent;
              border-bottom:19px solid ${color};
            "
          ></div>

          <div
            style="
              position:absolute;
              left:0;
              top:12px;
              width:27px;
              height:3px;
              border-radius:999px;
              background:${color};
            "
          ></div>
        </div>

        <div
          style="
            position:absolute;
            top:${size + 3}px;
            left:50%;
            transform:translateX(-50%);
            white-space:nowrap;
            border:1px solid ${color}99;
            border-radius:3px;
            background:rgba(3,4,5,.96);
            padding:3px 6px;
            color:${color};
            font:700 11px 'JetBrains Mono',monospace;
            box-shadow:0 4px 12px rgba(0,0,0,.72);
          "
        >
          ${label}
        </div>
      </div>
    `,
  });
}

function stationIcon(
  interceptor:
    InterceptorState,
) {
  return L.divIcon({
    className:
      "",

    iconSize: [
      28,
      28,
    ],

    iconAnchor: [
      14,
      14,
    ],

    html: `
      <div
        style="
          width:28px;
          height:28px;
          display:flex;
          align-items:center;
          justify-content:center;
          border:2px solid ${interceptor.color};
          border-radius:4px;
          background:rgba(3,4,5,.95);
          color:${interceptor.color};
          box-shadow:0 0 13px ${interceptor.color}77;
          font:700 10px 'JetBrains Mono',monospace;
        "
      >
        ${interceptor.id}
      </div>
    `,
  });
}

function guidanceColor(
  interceptor:
    InterceptorState,
) {
  if (
    interceptor.status ===
    "RECOVERY"
  ) {
    return colors.recovery;
  }

  if (
    interceptor.status ===
    "SHADOW"
  ) {
    return colors.shadow;
  }

  if (
    interceptor.status ===
    "RENDEZVOUS"
  ) {
    return colors.rendezvous;
  }

  return colors.pursuit;
}

function MapButton({
  label,
  active =
    false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "h-8 rounded-[4px] border px-2.5",
        "font-mono text-[14px] font-medium transition-colors",

        active
          ? "border-[rgba(90,169,255,0.38)] bg-[rgba(90,169,255,0.08)] text-[#8FC7FF]"
          : "border-white/[0.08] bg-[#030405] text-white/56 hover:border-white/[0.16] hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

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

  const interceptorMarkersRef =
    useRef<
      Record<
        number,
        L.Marker
      >
    >({});

  const stationMarkersRef =
    useRef<
      Record<
        number,
        L.Marker
      >
    >({});

  const perimeterRef =
    useRef<
      L.Polygon |
      null
    >(null);

  const criticalZoneRefs =
    useRef<
      Record<
        string,
        L.Polygon
      >
    >({});

  const flightPlanRef =
    useRef<
      L.Polyline |
      null
    >(null);

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

  const cvRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const ctrvRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const aiRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const formationTargetRefs =
    useRef<
      Record<
        number,
        L.CircleMarker
      >
    >({});

  const guidanceLineRefs =
    useRef<
      Record<
        number,
        L.Polyline
      >
    >({});

  const safetyCircleRef =
    useRef<
      L.Circle |
      null
    >(null);

  const standoffCircleRef =
    useRef<
      L.Circle |
      null
    >(null);

  const lastResponseFitRef =
    useRef(
      0,
    );

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
    showFlightPlan,
    setShowFlightPlan,
  ] =
    useState(
      true,
    );

  const [
    showPrediction,
    setShowPrediction,
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
            snapshot.interceptors.map(
              (
                interceptor,
              ) => [
                interceptor.id,

                enuToLatLng(
                  interceptor.station,
                  origin,
                ),
              ],
            ),
          ) as Record<
            number,
            L.LatLngTuple
          >;

        const formationTargets =
          Object.fromEntries(
            Object.entries(
              snapshot.formationTargets,
            ).map(
              (
                [
                  key,
                  target,
                ],
              ) => [
                Number(
                  key,
                ),

                enuToLatLng(
                  target,
                  origin,
                ),
              ],
            ),
          ) as Record<
            number,
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

          formationTargets,

          perimeter:
            convertPoints(
              snapshot.perimeter,
              origin,
            ),

          flightPlan:
            convertPoints(
              snapshot.intruderFlightPlan,
              origin,
            ),

          intruderTrail:
            convertPoints(
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

                  convertPoints(
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
            convertPoints(
              snapshot.baselinePath,
              origin,
            ),

          ctrv:
            convertPoints(
              snapshot.ctrvPath,
              origin,
            ),

          adaptive:
            convertPoints(
              snapshot.mlPath,
              origin,
            ),

          criticalZones:
            snapshot.criticalZones.map(
              (
                zone,
              ) => ({
                ...zone,

                convertedPoints:
                  convertPoints(
                    zone.points,
                    origin,
                  ),
              }),
            ),
        };
      },
      [
        snapshot,
        origin.lat,
        origin.lng,
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

      perimeterRef.current =
        L.polygon(
          positions.perimeter,
          {
            color:
              colors.perimeter,

            weight:
              4,

            opacity:
              1,

            dashArray:
              "12 9",

            fillColor:
              colors.perimeter,

            fillOpacity:
              0.025,

            className:
              "mn-perimeter-path",
          },
        )
          .bindTooltip(
            "MONITORED AIRSPACE · SIMULATION",
            {
              sticky:
                true,
            },
          )
          .addTo(
            map,
          );

      positions.criticalZones.forEach(
        (
          zone,
        ) => {
          criticalZoneRefs.current[
            zone.id
          ] =
            L.polygon(
              zone.convertedPoints,
              {
                color:
                  colors.critical,

                weight:
                  4,

                opacity:
                  1,

                dashArray:
                  "8 6",

                fillColor:
                  colors.critical,

                fillOpacity:
                  zone.active
                    ? 0.18
                    : 0.09,

                className:
                  "mn-critical-path",
              },
            )
              .bindTooltip(
                `<strong>${zone.label}</strong><br/>${zone.subtitle}`,
                {
                  sticky:
                    true,
                },
              )
              .addTo(
                map,
              );
        },
      );

      flightPlanRef.current =
        L.polyline(
          positions.flightPlan,
          {
            color:
              "#FFD166",

            weight:
              2.5,

            opacity:
              0.6,

            dashArray:
              "9 8",

            className:
              "mn-glow-path",
          },
        ).addTo(
          map,
        );

      intruderMarkerRef.current =
        L.marker(
          positions.intruder,
          {
            icon:
              aircraftIcon(
                snapshot.intruder,
                "intruder",
                colors.intruder,
                true,
              ),

            zIndexOffset:
              2200,
          },
        ).addTo(
          map,
        );

      intruderTrailRef.current =
        L.polyline(
          positions.intruderTrail,
          {
            color:
              colors.intruder,

            weight:
              4.5,

            opacity:
              1,

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      snapshot.interceptors.forEach(
        (
          interceptor,
        ) => {
          interceptorMarkersRef.current[
            interceptor.id
          ] =
            L.marker(
              positions.interceptors[
                interceptor.id
              ],
              {
                icon:
                  aircraftIcon(
                    interceptor,
                    "interceptor",
                    interceptor.color,
                    interceptor.assigned,
                  ),

                zIndexOffset:
                  interceptor.assigned
                    ? 1900
                    : 1300,
              },
            ).addTo(
              map,
            );

          stationMarkersRef.current[
            interceptor.id
          ] =
            L.marker(
              positions.stations[
                interceptor.id
              ],
              {
                icon:
                  stationIcon(
                    interceptor,
                  ),

                zIndexOffset:
                  900,
              },
            )
              .bindTooltip(
                interceptor.stationId,
              )
              .addTo(
                map,
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
                  interceptor.color,

                weight:
                  3.5,

                opacity:
                  0.95,

                className:
                  "mn-strong-glow-path",
              },
            ).addTo(
              map,
            );
        },
      );

      cvRef.current =
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
              0.95,

            dashArray:
              "5 8",

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      ctrvRef.current =
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
              1,

            dashArray:
              "11 6",

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      aiRef.current =
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
              "mn-ai-path",
          },
        ).addTo(
          map,
        );

      standoffCircleRef.current =
        L.circle(
          positions.intruder,
          {
            radius:
              snapshot.desiredSeparationMeters,

            color:
              colors.standoff,

            weight:
              2.5,

            opacity:
              1,

            dashArray:
              "10 8",

            fillOpacity:
              0,

            className:
              "mn-glow-path",
          },
        ).addTo(
          map,
        );

      safetyCircleRef.current =
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

            dashArray:
              "4 5",

            fillColor:
              colors.safety,

            fillOpacity:
              0.08,

            className:
              "mn-strong-glow-path",
          },
        ).addTo(
          map,
        );

      map.on(
        "dragstart",
        () =>
          setFollowMode(
            "free",
          ),
      );

      const timers = [
        window.setTimeout(
          () =>
            map.invalidateSize(),
          80,
        ),

        window.setTimeout(
          () =>
            map.invalidateSize(),
          350,
        ),

        window.setTimeout(
          () => {
            map.fitBounds(
              L.latLngBounds([
                ...positions.perimeter,

                ...Object.values(
                  positions.stations,
                ),
              ]),
              {
                padding: [
                  60,
                  60,
                ],

                maxZoom:
                  14,
              },
            );
          },
          120,
        ),
      ];

      return () => {
        timers.forEach(
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

        interceptorMarkersRef.current =
          {};

        stationMarkersRef.current =
          {};

        criticalZoneRefs.current =
          {};

        interceptorTrailRefs.current =
          {};

        formationTargetRefs.current =
          {};

        guidanceLineRefs.current =
          {};
      };
    },
    [],
  );

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

      const tile =
        L.tileLayer(
          config.url,
          {
            maxZoom:
              19,

            attribution:
              config.attribution,
          },
        );

      tile.addTo(
        map,
      );

      tile.bringToBack();

      baseTileRef.current =
        tile;
    },
    [
      baseMap,
    ],
  );

  useEffect(
    () => {
      const map =
        mapRef.current;

      if (
        !map
      ) {
        return;
      }

      perimeterRef.current?.setLatLngs(
        positions.perimeter,
      );

      intruderMarkerRef.current?.setLatLng(
        positions.intruder,
      );

      intruderMarkerRef.current?.setIcon(
        aircraftIcon(
          snapshot.intruder,
          "intruder",
          colors.intruder,
          true,
        ),
      );

      intruderTrailRef.current?.setLatLngs(
        positions.intruderTrail,
      );

      flightPlanRef.current?.setLatLngs(
        positions.flightPlan,
      );

      flightPlanRef.current?.setStyle(
        {
          opacity:
            showFlightPlan
              ? 0.6
              : 0,
        },
      );

      cvRef.current?.setLatLngs(
        [
          positions.intruder,
          ...positions.baseline,
        ],
      );

      ctrvRef.current?.setLatLngs(
        [
          positions.intruder,
          ...positions.ctrv,
        ],
      );

      aiRef.current?.setLatLngs(
        [
          positions.intruder,
          ...positions.adaptive,
        ],
      );

      cvRef.current?.setStyle(
        {
          opacity:
            showPrediction
              ? 0.95
              : 0,
        },
      );

      ctrvRef.current?.setStyle(
        {
          opacity:
            showPrediction
              ? 1
              : 0,
        },
      );

      aiRef.current?.setStyle(
        {
          opacity:
            showPrediction
              ? 1
              : 0,
        },
      );

      standoffCircleRef.current?.setLatLng(
        positions.intruder,
      );

      standoffCircleRef.current?.setRadius(
        snapshot.desiredSeparationMeters,
      );

      standoffCircleRef.current?.setStyle(
        {
          opacity:
            showSafety
              ? 1
              : 0,
        },
      );

      safetyCircleRef.current?.setLatLng(
        positions.intruder,
      );

      safetyCircleRef.current?.setRadius(
        snapshot.minimumSeparationMeters,
      );

      safetyCircleRef.current?.setStyle(
        {
          opacity:
            showSafety
              ? 1
              : 0,

          fillOpacity:
            showSafety
              ? 0.08
              : 0,
        },
      );

      snapshot.criticalZones.forEach(
        (
          zone,
        ) => {
          const polygon =
            criticalZoneRefs.current[
              zone.id
            ];

          polygon?.setLatLngs(
            positions.criticalZones.find(
              (
                item,
              ) =>
                item.id ===
                zone.id,
            )?.convertedPoints ??
              [],
          );

          polygon?.setStyle(
            {
              color:
                zone.active
                  ? "#FF123F"
                  : colors.critical,

              weight:
                zone.active
                  ? 5
                  : 4,

              fillOpacity:
                zone.active
                  ? 0.2
                  : 0.09,
            },
          );
        },
      );

      snapshot.interceptors.forEach(
        (
          interceptor,
        ) => {
          const marker =
            interceptorMarkersRef.current[
              interceptor.id
            ];

          marker?.setLatLng(
            positions.interceptors[
              interceptor.id
            ],
          );

          marker?.setIcon(
            aircraftIcon(
              interceptor,
              "interceptor",
              interceptor.color,
              interceptor.assigned,
            ),
          );

          interceptorTrailRefs.current[
            interceptor.id
          ]?.setLatLngs(
            positions.interceptorTrails[
              interceptor.id
            ] ??
              [],
          );

          const target =
            positions.formationTargets[
              interceptor.id
            ];

          if (
            snapshot.interceptAuthorized &&
            target
          ) {
            const lineColor =
              guidanceColor(
                interceptor,
              );

            let targetMarker =
              formationTargetRefs.current[
                interceptor.id
              ];

            if (
              !targetMarker
            ) {
              targetMarker =
                L.circleMarker(
                  target,
                  {
                    radius:
                      8,

                    color:
                      lineColor,

                    weight:
                      3,

                    fillColor:
                      interceptor.color,

                    fillOpacity:
                      0.72,
                  },
                ).addTo(
                  map,
                );

              formationTargetRefs.current[
                interceptor.id
              ] =
                targetMarker;
            }

            targetMarker.setLatLng(
              target,
            );

            targetMarker.setStyle(
              {
                color:
                  lineColor,

                fillColor:
                  interceptor.color,
              },
            );

            let guidanceLine =
              guidanceLineRefs.current[
                interceptor.id
              ];

            if (
              !guidanceLine
            ) {
              guidanceLine =
                L.polyline(
                  [
                    positions.interceptors[
                      interceptor.id
                    ],

                    target,
                  ],
                  {
                    color:
                      lineColor,

                    weight:
                      3,

                    opacity:
                      0.92,

                    dashArray:
                      interceptor.guidanceLocked
                        ? "12 7"
                        : "7 6",

                    className:
                      "mn-glow-path",
                  },
                ).addTo(
                  map,
                );

              guidanceLineRefs.current[
                interceptor.id
              ] =
                guidanceLine;
            }

            guidanceLine.setLatLngs(
              [
                positions.interceptors[
                  interceptor.id
                ],

                target,
              ],
            );

            guidanceLine.setStyle(
              {
                color:
                  lineColor,

                dashArray:
                  interceptor.guidanceLocked
                    ? "12 7"
                    : "7 6",
              },
            );
          } else {
            const targetMarker =
              formationTargetRefs.current[
                interceptor.id
              ];

            if (
              targetMarker &&
              map.hasLayer(
                targetMarker,
              )
            ) {
              map.removeLayer(
                targetMarker,
              );

              delete formationTargetRefs.current[
                interceptor.id
              ];
            }

            const guidance =
              guidanceLineRefs.current[
                interceptor.id
              ];

            if (
              guidance &&
              map.hasLayer(
                guidance,
              )
            ) {
              map.removeLayer(
                guidance,
              );

              delete guidanceLineRefs.current[
                interceptor.id
              ];
            }
          }
        },
      );

      if (
        followMode ===
        "target"
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
          "response" &&
        snapshot.interceptAuthorized
      ) {
        const now =
          performance.now();

        if (
          now -
            lastResponseFitRef.current >=
          800
        ) {
          lastResponseFitRef.current =
            now;

          map.fitBounds(
            L.latLngBounds([
              positions.intruder,

              ...Object.values(
                positions.interceptors,
              ),
            ]),
            {
              padding: [
                70,
                70,
              ],

              maxZoom:
                16,

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
      showFlightPlan,
      showPrediction,
      showSafety,
    ],
  );

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

    map.fitBounds(
      L.latLngBounds([
        ...positions.perimeter,

        ...Object.values(
          positions.stations,
        ),
      ]),
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

  function focusTarget() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "target",
    );

    map.flyTo(
      positions.intruder,
      16,
      {
        duration:
          0.7,
      },
    );
  }

  function focusResponse() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "response",
    );

    lastResponseFitRef.current =
      performance.now();

    map.fitBounds(
      L.latLngBounds([
        positions.intruder,

        ...Object.values(
          positions.interceptors,
        ),
      ]),
      {
        padding: [
          70,
          70,
        ],

        maxZoom:
          16,
      },
    );
  }

  return (
    <div className="grid h-full min-h-[560px] grid-rows-[46px_minmax(0,1fr)_44px] overflow-hidden bg-[#020304] xl:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={[
              "font-mono text-[14px] font-semibold",

              snapshot.alert.active
                ? "text-[#FF315A]"
                : "text-[#59D99A]",
            ].join(" ")}
          >
            {snapshot.alert.active
              ? snapshot.alert.title
              : "AIRSPACE CLEAR"}
          </span>

          <span className="hidden text-[14px] text-white/36 lg:block">
            {
              snapshot.missionId
            }
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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

          <MapButton
            label="Map"
            active={
              baseMap ===
              "osm"
            }
            onClick={() =>
              setBaseMap(
                "osm",
              )
            }
          />

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
              "target"
            }
            onClick={
              focusTarget
            }
          />

          <MapButton
            label="Response"
            active={
              followMode ===
              "response"
            }
            onClick={
              focusResponse
            }
          />

          <button
            type="button"
            onClick={() =>
              mapRef.current?.zoomOut()
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56"
          >
            <Minus
              size={14}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              mapRef.current?.zoomIn()
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56"
          >
            <Plus
              size={14}
            />
          </button>

          <button
            type="button"
            onClick={
              focusNetwork
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56"
          >
            <LocateFixed
              size={14}
            />
          </button>

          {baseMap ===
          "satellite" ? (
            <Satellite
              size={14}
              className="text-[#F6B23C]"
            />
          ) : (
            <Layers3
              size={14}
              className="text-[#5AA9FF]"
            />
          )}
        </div>
      </div>

      <div className="intercept-map relative min-h-0">
        <style>
          {`
            .intercept-map .mn-glow-path {
              filter:
                drop-shadow(0 0 2px #000)
                drop-shadow(0 0 5px rgba(0,0,0,.98));
            }

            .intercept-map .mn-strong-glow-path {
              filter:
                drop-shadow(0 0 2px #000)
                drop-shadow(0 0 7px rgba(0,0,0,1));
            }

            .intercept-map .mn-ai-path {
              filter:
                drop-shadow(0 0 2px #000)
                drop-shadow(0 0 8px rgba(168,255,79,.78));
            }

            .intercept-map .mn-perimeter-path {
              filter:
                drop-shadow(0 0 2px #000)
                drop-shadow(0 0 6px rgba(91,255,138,.70));
            }

            .intercept-map .mn-critical-path {
              filter:
                drop-shadow(0 0 2px #000)
                drop-shadow(0 0 7px rgba(255,49,90,.75));
            }

            .intercept-map .leaflet-tooltip {
              border:1px solid rgba(255,255,255,.16);
              border-radius:4px;
              background:rgba(3,4,5,.96);
              color:#fff;
              font-size:12px;
              box-shadow:0 5px 16px rgba(0,0,0,.5);
            }

            .intercept-map .leaflet-control-attribution {
              background:rgba(5,6,13,.88)!important;
              color:rgba(255,255,255,.72)!important;
              font-size:12px!important;
              padding:4px 7px!important;
            }

            .intercept-map .leaflet-control-attribution a {
              color:#9CCAFF!important;
            }
          `}
        </style>

        <div
          ref={
            containerRef
          }
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[#06080b] px-3">
        <div className="flex gap-1.5">
          <MapButton
            label="Flight Plan"
            active={
              showFlightPlan
            }
            onClick={() =>
              setShowFlightPlan(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <MapButton
            label="Predictors"
            active={
              showPrediction
            }
            onClick={() =>
              setShowPrediction(
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
          <span className="text-[#5BFF8A]">
            ┅ Perimeter
          </span>

          <span className="text-[#FF315A]">
            ┅ Intruder / Critical
          </span>

          <span className="text-[#D77DFF]">
            ┅ CTRV
          </span>

          <span className="text-[#A8FF4F]">
            ━ Validated Ensemble
          </span>

          <span className="text-[#FFE66D]">
            ┅ Locked Pursuit
          </span>

          <span className="text-[#5AA9FF]">
            ┅ Rendezvous
          </span>

          <span className="text-[#59D99A]">
            ┅ Shadow
          </span>
        </div>
      </div>
    </div>
  );
}