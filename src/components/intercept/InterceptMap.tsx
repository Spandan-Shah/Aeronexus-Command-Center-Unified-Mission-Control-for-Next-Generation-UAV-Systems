import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Crosshair,
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
  AircraftState,
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

type InterceptBaseMap =
  | "satellite"
  | "osm"
  | "hot";

type FollowMode =
  | "both"
  | "leader"
  | "follower"
  | "free";

/* =========================================================
   MissionNexus Map Configuration
   ========================================================= */

const DEFAULT_ORIGIN = {
  lat:
    23.0225,

  lng:
    72.5714,
};

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

  white:
    "#FFFFFF",
};

const baseMaps:
  Record<
    InterceptBaseMap,
    {
      url: string;
      attribution: string;
      maxZoom: number;
    }
  > = {
  satellite: {
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

    attribution:
      "Imagery © Esri",

    maxZoom:
      19,
  },

  osm: {
    url:
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors",

    maxZoom:
      19,
  },

  hot: {
    url:
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors · HOT",

    maxZoom:
      19,
  },
};

/* =========================================================
   Geometry
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

function headingVector(
  heading:
    number,
): Vector2 {
  const radians =
    (
      heading *
      Math.PI
    ) /
    180;

  return {
    x:
      Math.sin(
        radians,
      ),

    y:
      Math.cos(
        radians,
      ),
  };
}

function headingEndpoint(
  aircraft:
    AircraftState,

  distanceMeters:
    number,
): Vector2 {
  const direction =
    headingVector(
      aircraft.heading,
    );

  return {
    x:
      aircraft.x +
      direction.x *
        distanceMeters,

    y:
      aircraft.y +
      direction.y *
        distanceMeters,
  };
}

/* =========================================================
   Aircraft Icon
   ========================================================= */

function createAircraftIcon(
  type:
    | "leader"
    | "follower",

  heading:
    number,
) {
  const color =
    type ===
    "leader"
      ? colors.primary
      : colors.info;

  return L.divIcon({
    className:
      "missionnexus-intercept-aircraft",

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
          position:relative;
          width:42px;
          height:42px;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:none;
        "
      >
        <div
          style="
            position:absolute;
            inset:2px;
            border-radius:999px;
            border:1px solid ${color}88;
            background:${color}12;
            box-shadow:0 0 18px ${color}55;
          "
        ></div>

        <div
          style="
            position:relative;
            width:24px;
            height:24px;
            transform:rotate(${heading}deg);
            transform-origin:center;
          "
        >
          <div
            style="
              position:absolute;
              left:9px;
              top:0;
              width:0;
              height:0;
              border-left:3px solid transparent;
              border-right:3px solid transparent;
              border-bottom:16px solid ${color};
            "
          ></div>

          <div
            style="
              position:absolute;
              left:1px;
              top:11px;
              width:22px;
              height:2px;
              border-radius:999px;
              background:${color};
            "
          ></div>

          <div
            style="
              position:absolute;
              left:8px;
              top:12px;
              width:8px;
              height:8px;
              background:${color};
              clip-path:polygon(50% 100%,0 0,100% 0);
            "
          ></div>
        </div>
      </div>
    `,
  });
}

/* =========================================================
   UI Button
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
        "h-[34px] rounded-[4px] border px-3",

        "font-mono text-[14px] font-medium",

        "transition-colors duration-150",

        active
          ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.06)] text-[#F6B23C]"
          : "border-white/[0.08] bg-[#030405] text-white/58 hover:border-white/[0.16] hover:bg-white/[0.025] hover:text-white",
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

  const leaderMarkerRef =
    useRef<
      L.Marker |
      null
    >(null);

  const followerMarkerRef =
    useRef<
      L.Marker |
      null
    >(null);

  const leaderTrailRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const followerTrailRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const leaderHeadingRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const followerHeadingRef =
    useRef<
      L.Polyline |
      null
    >(null);

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

  const relationshipLineRef =
    useRef<
      L.Polyline |
      null
    >(null);

  const guidanceMarkerRef =
    useRef<
      L.CircleMarker |
      null
    >(null);

  const desiredSeparationRef =
    useRef<
      L.Circle |
      null
    >(null);

  const protectedSeparationRef =
    useRef<
      L.Circle |
      null
    >(null);

  const homeMarkerRef =
    useRef<
      L.CircleMarker |
      null
    >(null);

  const [
    baseMap,
    setBaseMap,
  ] =
    useState<InterceptBaseMap>(
      "satellite",
    );

  const [
    followMode,
    setFollowMode,
  ] =
    useState<FollowMode>(
      "both",
    );

  const [
    showTrails,
    setShowTrails,
  ] =
    useState(
      true,
    );

  const [
    showBaseline,
    setShowBaseline,
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
      () => ({
        leader:
          enuToLatLng(
            snapshot.leader,
            origin,
          ),

        follower:
          enuToLatLng(
            snapshot.follower,
            origin,
          ),

        home:
          enuToLatLng(
            snapshot.home,
            origin,
          ),

        guidance:
          enuToLatLng(
            snapshot.guidanceTarget,
            origin,
          ),

        leaderHeading:
          enuToLatLng(
            headingEndpoint(
              snapshot.leader,
              170,
            ),
            origin,
          ),

        followerHeading:
          enuToLatLng(
            headingEndpoint(
              snapshot.follower,
              170,
            ),
            origin,
          ),

        leaderTrail:
          toLatLngArray(
            snapshot.leaderTrail,
            origin,
          ),

        followerTrail:
          toLatLngArray(
            snapshot.followerTrail,
            origin,
          ),

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
      }),
      [
        snapshot.leader,
        snapshot.follower,
        snapshot.home,
        snapshot.guidanceTarget,
        snapshot.leaderTrail,
        snapshot.followerTrail,
        snapshot.baselinePath,
        snapshot.ctrvPath,
        snapshot.mlPath,
        origin.lat,
        origin.lng,
      ],
    );

  /* =======================================================
     Initialize Map
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
              15,

            minZoom:
              3,

            maxZoom:
              19,

            zoomControl:
              false,

            attributionControl:
              true,

            worldCopyJump:
              false,

            preferCanvas:
              true,
          },
        );

      mapRef.current =
        map;

      const initialTileLayer =
        L.tileLayer(
          baseMaps.satellite
            .url,
          {
            maxZoom:
              baseMaps.satellite
                .maxZoom,

            attribution:
              baseMaps.satellite
                .attribution,
          },
        ).addTo(
          map,
        );

      baseTileRef.current =
        initialTileLayer;

      /* ===============================================
         MissionNexus attribution styling
         Mirrors existing AeroWorldMap.
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

      /* ===============================================
         Aircraft
         =============================================== */

      leaderMarkerRef.current =
        L.marker(
          positions.leader,
          {
            icon:
              createAircraftIcon(
                "leader",
                snapshot.leader.heading,
              ),

            zIndexOffset:
              1200,
          },
        )
          .bindTooltip(
            "LEADER-01",
            {
              direction:
                "top",
            },
          )
          .addTo(
            map,
          );

      followerMarkerRef.current =
        L.marker(
          positions.follower,
          {
            icon:
              createAircraftIcon(
                "follower",
                snapshot.follower.heading,
              ),

            zIndexOffset:
              1100,
          },
        )
          .bindTooltip(
            "FOLLOWER-02",
            {
              direction:
                "top",
            },
          )
          .addTo(
            map,
          );

      /* ===============================================
         Trails
         =============================================== */

      leaderTrailRef.current =
        L.polyline(
          positions.leaderTrail,
          {
            color:
              colors.primary,

            weight:
              3,

            opacity:
              0.9,
          },
        ).addTo(
          map,
        );

      followerTrailRef.current =
        L.polyline(
          positions.followerTrail,
          {
            color:
              colors.info,

            weight:
              3,

            opacity:
              0.9,
          },
        ).addTo(
          map,
        );

      /* ===============================================
         Heading vectors
         =============================================== */

      leaderHeadingRef.current =
        L.polyline(
          [
            positions.leader,
            positions.leaderHeading,
          ],
          {
            color:
              colors.primary,

            weight:
              1.5,

            opacity:
              0.38,

            dashArray:
              "4 7",
          },
        ).addTo(
          map,
        );

      followerHeadingRef.current =
        L.polyline(
          [
            positions.follower,
            positions.followerHeading,
          ],
          {
            color:
              colors.info,

            weight:
              1.5,

            opacity:
              0.38,

            dashArray:
              "4 7",
          },
        ).addTo(
          map,
        );

      /* ===============================================
         Predictors
         =============================================== */

      baselinePathRef.current =
        L.polyline(
          [
            positions.leader,
            ...positions.baseline,
          ],
          {
            color:
              colors.white,

            weight:
              2,

            opacity:
              0.62,

            dashArray:
              "5 8",
          },
        ).addTo(
          map,
        );

      ctrvPathRef.current =
        L.polyline(
          [
            positions.leader,
            ...positions.ctrv,
          ],
          {
            color:
              colors.primary,

            weight:
              2.5,

            opacity:
              0.82,

            dashArray:
              "7 6",
          },
        ).addTo(
          map,
        );

      adaptivePathRef.current =
        L.polyline(
          [
            positions.leader,
            ...positions.adaptive,
          ],
          {
            color:
              colors.nominal,

            weight:
              3.2,

            opacity:
              0.96,
          },
        ).addTo(
          map,
        );

      /* ===============================================
         Relationship + Guidance
         =============================================== */

      relationshipLineRef.current =
        L.polyline(
          [
            positions.follower,
            positions.leader,
          ],
          {
            color:
              colors.white,

            weight:
              1,

            opacity:
              0.2,

            dashArray:
              "3 8",
          },
        ).addTo(
          map,
        );

      guidanceLineRef.current =
        L.polyline(
          [
            positions.follower,
            positions.guidance,
          ],
          {
            color:
              colors.info,

            weight:
              2,

            opacity:
              0.72,

            dashArray:
              "7 5",
          },
        ).addTo(
          map,
        );

      guidanceMarkerRef.current =
        L.circleMarker(
          positions.guidance,
          {
            radius:
              7,

            color:
              colors.info,

            weight:
              2,

            fillColor:
              colors.info,

            fillOpacity:
              0.22,
          },
        )
          .bindTooltip(
            "Guidance target",
          )
          .addTo(
            map,
          );

      /* ===============================================
         Safety Geometry
         =============================================== */

      desiredSeparationRef.current =
        L.circle(
          positions.leader,
          {
            radius:
              snapshot.desiredSeparationMeters,

            color:
              colors.primary,

            weight:
              1.5,

            opacity:
              0.52,

            fillOpacity:
              0,

            dashArray:
              "8 8",
          },
        ).addTo(
          map,
        );

      protectedSeparationRef.current =
        L.circle(
          positions.leader,
          {
            radius:
              snapshot.minimumSeparationMeters,

            color:
              colors.critical,

            weight:
              1.7,

            opacity:
              0.76,

            fillColor:
              colors.critical,

            fillOpacity:
              0.055,

            dashArray:
              "5 6",
          },
        ).addTo(
          map,
        );

      homeMarkerRef.current =
        L.circleMarker(
          positions.home,
          {
            radius:
              6,

            color:
              colors.background,

            weight:
              2,

            fillColor:
              colors.nominal,

            fillOpacity:
              1,
          },
        )
          .bindTooltip(
            "HOME",
          )
          .addTo(
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
          const bounds =
            L.latLngBounds([
              positions.leader,
              positions.follower,
              positions.guidance,
            ]);

          if (
            bounds.isValid()
          ) {
            map.fitBounds(
              bounds,
              {
                padding: [
                  90,
                  90,
                ],

                maxZoom:
                  16,

                animate:
                  false,
              },
            );
          }
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
            maxZoom:
              config.maxZoom,

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

      leaderMarkerRef.current
        ?.setLatLng(
          positions.leader,
        );

      leaderMarkerRef.current
        ?.setIcon(
          createAircraftIcon(
            "leader",
            snapshot.leader.heading,
          ),
        );

      followerMarkerRef.current
        ?.setLatLng(
          positions.follower,
        );

      followerMarkerRef.current
        ?.setIcon(
          createAircraftIcon(
            "follower",
            snapshot.follower.heading,
          ),
        );

      leaderTrailRef.current
        ?.setLatLngs(
          positions.leaderTrail,
        );

      followerTrailRef.current
        ?.setLatLngs(
          positions.followerTrail,
        );

      leaderHeadingRef.current
        ?.setLatLngs([
          positions.leader,
          positions.leaderHeading,
        ]);

      followerHeadingRef.current
        ?.setLatLngs([
          positions.follower,
          positions.followerHeading,
        ]);

      baselinePathRef.current
        ?.setLatLngs([
          positions.leader,
          ...positions.baseline,
        ]);

      ctrvPathRef.current
        ?.setLatLngs([
          positions.leader,
          ...positions.ctrv,
        ]);

      adaptivePathRef.current
        ?.setLatLngs([
          positions.leader,
          ...positions.adaptive,
        ]);

      relationshipLineRef.current
        ?.setLatLngs([
          positions.follower,
          positions.leader,
        ]);

      guidanceLineRef.current
        ?.setLatLngs([
          positions.follower,
          positions.guidance,
        ]);

      guidanceMarkerRef.current
        ?.setLatLng(
          positions.guidance,
        );

      desiredSeparationRef.current
        ?.setLatLng(
          positions.leader,
        );

      desiredSeparationRef.current
        ?.setRadius(
          snapshot.desiredSeparationMeters,
        );

      protectedSeparationRef.current
        ?.setLatLng(
          positions.leader,
        );

      protectedSeparationRef.current
        ?.setRadius(
          snapshot.minimumSeparationMeters,
        );

      homeMarkerRef.current
        ?.setLatLng(
          positions.home,
        );

      if (
        followMode ===
        "leader"
      ) {
        map.panTo(
          positions.leader,
          {
            animate:
              false,
          },
        );

        return;
      }

      if (
        followMode ===
        "follower"
      ) {
        map.panTo(
          positions.follower,
          {
            animate:
              false,
          },
        );

        return;
      }

      if (
        followMode ===
        "both"
      ) {
        const visibleBounds =
          map
            .getBounds()
            .pad(
              -0.12,
            );

        if (
          !visibleBounds.contains(
            positions.leader,
          ) ||
          !visibleBounds.contains(
            positions.follower,
          ) ||
          !visibleBounds.contains(
            positions.guidance,
          )
        ) {
          map.fitBounds(
            L.latLngBounds([
              positions.leader,
              positions.follower,
              positions.guidance,
            ]),
            {
              padding: [
                90,
                90,
              ],

              maxZoom:
                17,

              animate:
                false,
            },
          );
        }
      }
    },
    [
      positions,
      snapshot.leader.heading,
      snapshot.follower.heading,
      snapshot.desiredSeparationMeters,
      snapshot.minimumSeparationMeters,
      followMode,
    ],
  );

  /* =======================================================
     Visibility
     ======================================================= */

  useEffect(
    () => {
      leaderTrailRef.current
        ?.setStyle({
          opacity:
            showTrails
              ? 0.9
              : 0,
        });

      followerTrailRef.current
        ?.setStyle({
          opacity:
            showTrails
              ? 0.9
              : 0,
        });

      leaderHeadingRef.current
        ?.setStyle({
          opacity:
            showTrails
              ? 0.38
              : 0,
        });

      followerHeadingRef.current
        ?.setStyle({
          opacity:
            showTrails
              ? 0.38
              : 0,
        });
    },
    [
      showTrails,
    ],
  );

  useEffect(
    () => {
      baselinePathRef.current
        ?.setStyle({
          opacity:
            showBaseline
              ? 0.62
              : 0,
        });
    },
    [
      showBaseline,
    ],
  );

  useEffect(
    () => {
      ctrvPathRef.current
        ?.setStyle({
          opacity:
            showCtrv
              ? 0.82
              : 0,
        });
    },
    [
      showCtrv,
    ],
  );

  useEffect(
    () => {
      adaptivePathRef.current
        ?.setStyle({
          opacity:
            showAdaptive
              ? 0.96
              : 0,
        });
    },
    [
      showAdaptive,
    ],
  );

  useEffect(
    () => {
      desiredSeparationRef.current
        ?.setStyle({
          opacity:
            showSafety
              ? 0.52
              : 0,
        });

      protectedSeparationRef.current
        ?.setStyle({
          opacity:
            showSafety
              ? 0.76
              : 0,

          fillOpacity:
            showSafety
              ? 0.055
              : 0,
        });
    },
    [
      showSafety,
    ],
  );

  /* =======================================================
     Camera
     ======================================================= */

  function focusBoth() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "both",
    );

    map.fitBounds(
      L.latLngBounds([
        positions.leader,
        positions.follower,
        positions.guidance,
      ]),
      {
        padding: [
          90,
          90,
        ],

        maxZoom:
          17,

        animate:
          true,
      },
    );
  }

  function focusLeader() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "leader",
    );

    map.flyTo(
      positions.leader,
      Math.max(
        map.getZoom(),
        16,
      ),
      {
        duration:
          0.8,
      },
    );
  }

  function focusFollower() {
    const map =
      mapRef.current;

    if (
      !map
    ) {
      return;
    }

    setFollowMode(
      "follower",
    );

    map.flyTo(
      positions.follower,
      Math.max(
        map.getZoom(),
        16,
      ),
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

  return (
    <div
      className={[
        "grid h-full min-h-[560px]",

        "grid-rows-[58px_minmax(0,1fr)_52px]",

        "overflow-hidden bg-[#020304]",

        "xl:min-h-0",
      ].join(" ")}
    >
      {/* ===============================================
          MAP COMMAND BAR
          =============================================== */}

      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Crosshair
            size={15}
            strokeWidth={1.6}
            className="shrink-0 text-[#5AA9FF]"
          />

          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold text-white/86">
              Intercept Map
            </div>

            <div className="truncate text-[14px] text-white/40">
              Real basemap · aircraft tracks · predictive guidance
            </div>
          </div>
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

          <MapButton
            label="Map"
            active={
              baseMap !==
              "satellite"
            }
            onClick={
              cycleBaseMap
            }
          />

          <span className="mx-1 h-6 w-px bg-white/[0.08]" />

          <MapButton
            label="Both"
            active={
              followMode ===
              "both"
            }
            onClick={
              focusBoth
            }
          />

          <MapButton
            label="Leader"
            active={
              followMode ===
              "leader"
            }
            onClick={
              focusLeader
            }
          />

          <MapButton
            label="Follower"
            active={
              followMode ===
              "follower"
            }
            onClick={
              focusFollower
            }
          />

          <button
            type="button"
            title="Zoom out"
            onClick={() =>
              mapRef.current
                ?.zoomOut()
            }
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            <Minus
              size={15}
            />
          </button>

          <button
            type="button"
            title="Zoom in"
            onClick={() =>
              mapRef.current
                ?.zoomIn()
            }
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            <Plus
              size={15}
            />
          </button>

          <button
            type="button"
            title="Fit leader and follower"
            onClick={
              focusBoth
            }
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#030405] text-white/56 hover:text-white"
          >
            <LocateFixed
              size={15}
            />
          </button>
        </div>
      </div>

      {/* ===============================================
          CLEAN MAP CANVAS
          =============================================== */}

      <div className="relative min-h-0">
        <div
          ref={
            containerRef
          }
          className="missionnexus-map absolute inset-0 h-full w-full"
        />
      </div>

      {/* ===============================================
          MAP LAYER BAR
          =============================================== */}

      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/[0.08] bg-[#06080b] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[14px] font-medium text-white/54">
            Layers
          </span>

          <MapButton
            label="Trails"
            active={
              showTrails
            }
            onClick={() =>
              setShowTrails(
                (
                  current,
                ) =>
                  !current,
              )
            }
          />

          <MapButton
            label="CV"
            active={
              showBaseline
            }
            onClick={() =>
              setShowBaseline(
                (
                  current,
                ) =>
                  !current,
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
                  current,
                ) =>
                  !current,
              )
            }
          />

          <MapButton
            label="Adaptive"
            active={
              showAdaptive
            }
            onClick={() =>
              setShowAdaptive(
                (
                  current,
                ) =>
                  !current,
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
                  current,
                ) =>
                  !current,
              )
            }
          />
        </div>

        <div className="flex shrink-0 items-center gap-4 font-mono text-[14px]">
          <span className="text-[#F6B23C]">
            ● Leader
          </span>

          <span className="text-[#5AA9FF]">
            ● Follower
          </span>

          <span className="text-[#59D99A]">
            ● Adaptive
          </span>

          <span className="hidden text-white/48 2xl:inline">
            Basemap:{" "}
            <span className="text-white/72">
              {
                baseMap
              }
            </span>
          </span>

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
    </div>
  );
}