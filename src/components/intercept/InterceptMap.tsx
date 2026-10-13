import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Eye,
  EyeOff,
  Layers3,
  LocateFixed,
  Minus,
  Plus,
  Satellite,
} from "lucide-react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type {
  AircraftState,
  InterceptSnapshot,
  Vector2,
} from "../../hooks/useInterceptSimulation";

/* =========================================================
   MissionNexus
   Autonomous Intercept Map

   Phase 1
   - Real satellite basemap
   - Street-map fallback
   - Local ENU simulation -> geographic coordinates
   - Leader / follower aircraft
   - Flight trails
   - Heading vectors
   - Baseline prediction
   - Online ML prediction
   - Guidance target
   - Desired shadow radius
   - Protected safety radius

   IMPORTANT:
   Controls and operational information stay OUTSIDE the
   Leaflet map so the imagery remains clean.
   ========================================================= */

type InterceptMapProps = {
  snapshot: InterceptSnapshot;

  origin?: {
    lat: number;
    lng: number;
  };
};

type BaseMapMode =
  | "satellite"
  | "street";

type FollowMode =
  | "both"
  | "leader"
  | "follower"
  | "free";

/* =========================================================
   Phase-1 geographic anchor

   This is only the origin used to place the ENU simulation
   on the geographic map.

   Phase 2:
   this projection will be replaced with real MAVLink GPS.
   ========================================================= */

const DEFAULT_ORIGIN = {
  lat: 20.5937,
  lng: 78.9629,
};

/* =========================================================
   Geographic Conversion
   ========================================================= */

function enuToLatLng(
  point: Vector2,
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

  const latitude =
    origin.lat +
    point.y /
      metersPerDegreeLatitude;

  const longitude =
    origin.lng +
    point.x /
      Math.max(
        1,
        metersPerDegreeLongitude,
      );

  return [
    latitude,
    longitude,
  ];
}

function toLatLngArray(
  points: Vector2[],
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
   Heading Helpers
   ========================================================= */

function headingVector(
  heading: number,
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
  aircraft: AircraftState,
  distanceMeters: number,
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
   Aircraft Marker
   ========================================================= */

function createAircraftIcon(
  type:
    | "leader"
    | "follower",

  heading: number,
) {
  const color =
    type ===
    "leader"
      ? "#F6B23C"
      : "#5AA9FF";

  return L.divIcon({
    className: "",

    iconSize: [
      40,
      40,
    ],

    iconAnchor: [
      20,
      20,
    ],

    html: `
      <div
        style="
          width:40px;
          height:40px;
          border-radius:50%;
          border:1px solid ${color}99;
          background:rgba(3,4,5,0.92);
          box-shadow:
            0 0 0 4px ${color}10,
            0 0 18px ${color}35;
          display:flex;
          align-items:center;
          justify-content:center;
          pointer-events:none;
        "
      >
        <div
          style="
            position:relative;
            width:23px;
            height:23px;
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
              width:21px;
              height:2px;
              border-radius:2px;
              background:${color};
            "
          ></div>

          <div
            style="
              position:absolute;
              left:8px;
              top:12px;
              width:7px;
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
   Toolbar Button
   ========================================================= */

function ToolbarButton({
  label,
  active = false,
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
        "h-9 whitespace-nowrap rounded-[4px] border px-3",

        "font-mono text-[14px] font-medium",

        "transition-colors duration-150",

        active
          ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.07)] text-[#F6B23C]"
          : "border-white/[0.08] bg-[#05060d] text-white/60 hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* =========================================================
   Icon Button
   ========================================================= */

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={
        label
      }
      title={
        label
      }
      onClick={
        onClick
      }
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center",

        "rounded-[4px] border border-white/[0.08]",

        "bg-[#05060d] text-white/60",

        "transition-colors duration-150",

        "hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* =========================================================
   Legend Item
   ========================================================= */

function LegendItem({
  label,
  colorClass,
  dashed = false,
}: {
  label: string;
  colorClass: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <span
          className={[
            "h-px w-6 border-t-2 border-dashed",
            colorClass,
          ].join(" ")}
        />
      ) : (
        <span
          className={[
            "h-2 w-6 rounded-full",
            colorClass,
          ].join(" ")}
        />
      )}

      <span className="text-[14px] text-white/46">
        {label}
      </span>
    </div>
  );
}

/* =========================================================
   Main Component
   ========================================================= */

export function InterceptMap({
  snapshot,
  origin =
    DEFAULT_ORIGIN,
}: InterceptMapProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const mapRef =
    useRef<L.Map | null>(
      null,
    );

  /* =======================================================
     Base map layers
     ======================================================= */

  const satelliteLayerRef =
    useRef<L.TileLayer | null>(
      null,
    );

  const labelLayerRef =
    useRef<L.TileLayer | null>(
      null,
    );

  const streetLayerRef =
    useRef<L.TileLayer | null>(
      null,
    );

  /* =======================================================
     Aircraft layers
     ======================================================= */

  const leaderMarkerRef =
    useRef<L.Marker | null>(
      null,
    );

  const followerMarkerRef =
    useRef<L.Marker | null>(
      null,
    );

  /* =======================================================
     Flight trail layers
     ======================================================= */

  const leaderTrailRef =
    useRef<L.Polyline | null>(
      null,
    );

  const followerTrailRef =
    useRef<L.Polyline | null>(
      null,
    );

  /* =======================================================
     Heading layers
     ======================================================= */

  const leaderHeadingRef =
    useRef<L.Polyline | null>(
      null,
    );

  const followerHeadingRef =
    useRef<L.Polyline | null>(
      null,
    );

  /* =======================================================
     Prediction layers
     ======================================================= */

  const baselinePathRef =
    useRef<L.Polyline | null>(
      null,
    );

  const mlPathRef =
    useRef<L.Polyline | null>(
      null,
    );

  /* =======================================================
     Guidance layers
     ======================================================= */

  const guidanceLineRef =
    useRef<L.Polyline | null>(
      null,
    );

  const relationshipLineRef =
    useRef<L.Polyline | null>(
      null,
    );

  const guidanceMarkerRef =
    useRef<L.CircleMarker | null>(
      null,
    );

  /* =======================================================
     Safety layers
     ======================================================= */

  const desiredCircleRef =
    useRef<L.Circle | null>(
      null,
    );

  const safetyCircleRef =
    useRef<L.Circle | null>(
      null,
    );

  const homeMarkerRef =
    useRef<L.CircleMarker | null>(
      null,
    );

  /* =======================================================
     UI State
     ======================================================= */

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
    showMl,
    setShowMl,
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
    showSafety,
    setShowSafety,
  ] =
    useState(
      true,
    );

  /* =======================================================
     Geographic positions
     ======================================================= */

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
              160,
            ),
            origin,
          ),

        followerHeading:
          enuToLatLng(
            headingEndpoint(
              snapshot.follower,
              160,
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

        ml:
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
        snapshot.mlPath,
        origin.lat,
        origin.lng,
      ],
    );

  /* =======================================================
     Map Initialization
     ======================================================= */

  useEffect(
    () => {
      const container =
        containerRef.current;

      if (
        !container ||
        mapRef.current
      ) {
        return;
      }

      const map =
        L.map(
          container,
          {
            zoomControl:
              false,

            attributionControl:
              true,

            preferCanvas:
              true,

            minZoom:
              3,

            maxZoom:
              20,

            worldCopyJump:
              true,

            scrollWheelZoom:
              true,

            doubleClickZoom:
              true,

            dragging:
              true,
          },
        );

      /* -----------------------------------------------
         Real satellite imagery
         ----------------------------------------------- */

      const satellite =
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom:
              19,

            attribution:
              "Imagery © Esri",
          },
        );

      /* -----------------------------------------------
         Satellite labels
         ----------------------------------------------- */

      const labels =
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom:
              19,

            attribution:
              "Labels © Esri",
          },
        );

      /* -----------------------------------------------
         Street fallback
         ----------------------------------------------- */

      const street =
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom:
              19,

            attribution:
              "© OpenStreetMap contributors",
          },
        );

      satellite.addTo(
        map,
      );

      labels.addTo(
        map,
      );

      satelliteLayerRef.current =
        satellite;

      labelLayerRef.current =
        labels;

      streetLayerRef.current =
        street;

      /* -----------------------------------------------
         Leader marker
         ----------------------------------------------- */

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
              1100,
          },
        )
          .bindTooltip(
            "LEADER-01",
            {
              direction:
                "top",

              offset: [
                0,
                -14,
              ],
            },
          )
          .addTo(
            map,
          );

      /* -----------------------------------------------
         Follower marker
         ----------------------------------------------- */

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
              1000,
          },
        )
          .bindTooltip(
            "FOLLOWER-02",
            {
              direction:
                "top",

              offset: [
                0,
                -14,
              ],
            },
          )
          .addTo(
            map,
          );

      /* -----------------------------------------------
         Trails
         ----------------------------------------------- */

      leaderTrailRef.current =
        L.polyline(
          positions.leaderTrail,
          {
            color:
              "#F6B23C",

            weight:
              3,

            opacity:
              0.9,

            lineCap:
              "round",

            lineJoin:
              "round",
          },
        ).addTo(
          map,
        );

      followerTrailRef.current =
        L.polyline(
          positions.followerTrail,
          {
            color:
              "#5AA9FF",

            weight:
              3,

            opacity:
              0.9,

            lineCap:
              "round",

            lineJoin:
              "round",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Aircraft heading vectors
         ----------------------------------------------- */

      leaderHeadingRef.current =
        L.polyline(
          [
            positions.leader,
            positions.leaderHeading,
          ],
          {
            color:
              "#F6B23C",

            weight:
              1.5,

            opacity:
              0.42,

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
              "#5AA9FF",

            weight:
              1.5,

            opacity:
              0.42,

            dashArray:
              "4 7",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Baseline predictor
         ----------------------------------------------- */

      baselinePathRef.current =
        L.polyline(
          [
            positions.leader,
            ...positions.baseline,
          ],
          {
            color:
              "#FFFFFF",

            weight:
              2.2,

            opacity:
              0.64,

            dashArray:
              "5 8",

            lineCap:
              "round",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Online ML predictor
         ----------------------------------------------- */

      mlPathRef.current =
        L.polyline(
          [
            positions.leader,
            ...positions.ml,
          ],
          {
            color:
              "#59D99A",

            weight:
              3.2,

            opacity:
              0.96,

            dashArray:
              "10 6",

            lineCap:
              "round",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Follower -> AI guidance target
         ----------------------------------------------- */

      guidanceLineRef.current =
        L.polyline(
          [
            positions.follower,
            positions.guidance,
          ],
          {
            color:
              "#5AA9FF",

            weight:
              2.2,

            opacity:
              0.76,

            dashArray:
              "7 5",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Leader / follower relationship
         ----------------------------------------------- */

      relationshipLineRef.current =
        L.polyline(
          [
            positions.follower,
            positions.leader,
          ],
          {
            color:
              "#FFFFFF",

            weight:
              1,

            opacity:
              0.24,

            dashArray:
              "3 8",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         AI guidance target
         ----------------------------------------------- */

      guidanceMarkerRef.current =
        L.circleMarker(
          positions.guidance,
          {
            radius:
              7,

            color:
              "#5AA9FF",

            weight:
              2,

            fillColor:
              "#5AA9FF",

            fillOpacity:
              0.2,
          },
        )
          .bindTooltip(
            "GUIDANCE TARGET",
            {
              direction:
                "top",
            },
          )
          .addTo(
            map,
          );

      /* -----------------------------------------------
         Desired shadow distance
         ----------------------------------------------- */

      desiredCircleRef.current =
        L.circle(
          positions.leader,
          {
            radius:
              snapshot.desiredSeparationMeters,

            color:
              "#F6B23C",

            weight:
              1.5,

            opacity:
              0.56,

            fillOpacity:
              0,

            dashArray:
              "8 8",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Hard protected separation
         ----------------------------------------------- */

      safetyCircleRef.current =
        L.circle(
          positions.leader,
          {
            radius:
              snapshot.minimumSeparationMeters,

            color:
              "#FF5A63",

            weight:
              1.7,

            opacity:
              0.78,

            fillColor:
              "#FF5A63",

            fillOpacity:
              0.06,

            dashArray:
              "5 6",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Home
         ----------------------------------------------- */

      homeMarkerRef.current =
        L.circleMarker(
          positions.home,
          {
            radius:
              5,

            color:
              "#59D99A",

            weight:
              2,

            fillColor:
              "#59D99A",

            fillOpacity:
              0.42,
          },
        )
          .bindTooltip(
            "HOME",
            {
              direction:
                "top",
            },
          )
          .addTo(
            map,
          );

      mapRef.current =
        map;

      map.setView(
        [
          origin.lat,
          origin.lng,
        ],
        15,
      );

      /* -----------------------------------------------
         Dragging disables automatic follow
         ----------------------------------------------- */

      map.on(
        "dragstart",
        () => {
          setFollowMode(
            "free",
          );
        },
      );

      /* -----------------------------------------------
         Initial fit
         ----------------------------------------------- */

      window.setTimeout(
        () => {
          map.invalidateSize();

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
        100,
      );

      return () => {
        map.remove();

        mapRef.current =
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

      const satellite =
        satelliteLayerRef.current;

      const labels =
        labelLayerRef.current;

      const street =
        streetLayerRef.current;

      if (
        !map ||
        !satellite ||
        !labels ||
        !street
      ) {
        return;
      }

      if (
        baseMap ===
        "satellite"
      ) {
        if (
          map.hasLayer(
            street,
          )
        ) {
          map.removeLayer(
            street,
          );
        }

        if (
          !map.hasLayer(
            satellite,
          )
        ) {
          satellite.addTo(
            map,
          );
        }

        if (
          !map.hasLayer(
            labels,
          )
        ) {
          labels.addTo(
            map,
          );
        }

        return;
      }

      if (
        map.hasLayer(
          labels,
        )
      ) {
        map.removeLayer(
          labels,
        );
      }

      if (
        map.hasLayer(
          satellite,
        )
      ) {
        map.removeLayer(
          satellite,
        );
      }

      if (
        !map.hasLayer(
          street,
        )
      ) {
        street.addTo(
          map,
        );
      }
    },
    [
      baseMap,
    ],
  );

  /* =======================================================
     Live Tactical Updates
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

      /* Aircraft */

      leaderMarkerRef.current?.setLatLng(
        positions.leader,
      );

      leaderMarkerRef.current?.setIcon(
        createAircraftIcon(
          "leader",
          snapshot.leader.heading,
        ),
      );

      followerMarkerRef.current?.setLatLng(
        positions.follower,
      );

      followerMarkerRef.current?.setIcon(
        createAircraftIcon(
          "follower",
          snapshot.follower.heading,
        ),
      );

      /* Trails */

      leaderTrailRef.current?.setLatLngs(
        positions.leaderTrail,
      );

      followerTrailRef.current?.setLatLngs(
        positions.followerTrail,
      );

      /* Heading vectors */

      leaderHeadingRef.current?.setLatLngs([
        positions.leader,
        positions.leaderHeading,
      ]);

      followerHeadingRef.current?.setLatLngs([
        positions.follower,
        positions.followerHeading,
      ]);

      /* Prediction */

      baselinePathRef.current?.setLatLngs([
        positions.leader,
        ...positions.baseline,
      ]);

      mlPathRef.current?.setLatLngs([
        positions.leader,
        ...positions.ml,
      ]);

      /* Guidance */

      guidanceLineRef.current?.setLatLngs([
        positions.follower,
        positions.guidance,
      ]);

      guidanceMarkerRef.current?.setLatLng(
        positions.guidance,
      );

      /* Relationship */

      relationshipLineRef.current?.setLatLngs([
        positions.follower,
        positions.leader,
      ]);

      /* Safety */

      desiredCircleRef.current?.setLatLng(
        positions.leader,
      );

      desiredCircleRef.current?.setRadius(
        snapshot.desiredSeparationMeters,
      );

      safetyCircleRef.current?.setLatLng(
        positions.leader,
      );

      safetyCircleRef.current?.setRadius(
        snapshot.minimumSeparationMeters,
      );

      /* Home */

      homeMarkerRef.current?.setLatLng(
        positions.home,
      );

      /* -----------------------------------------------
         Follow modes
         ----------------------------------------------- */

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

        const leaderVisible =
          visibleBounds.contains(
            positions.leader,
          );

        const followerVisible =
          visibleBounds.contains(
            positions.follower,
          );

        const guidanceVisible =
          visibleBounds.contains(
            positions.guidance,
          );

        if (
          !leaderVisible ||
          !followerVisible ||
          !guidanceVisible
        ) {
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
                  17,

                animate:
                  false,
              },
            );
          }
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
     Layer Visibility
     ======================================================= */

  useEffect(
    () => {
      leaderTrailRef.current?.setStyle({
        opacity:
          showTrails
            ? 0.9
            : 0,
      });

      followerTrailRef.current?.setStyle({
        opacity:
          showTrails
            ? 0.9
            : 0,
      });

      leaderHeadingRef.current?.setStyle({
        opacity:
          showTrails
            ? 0.42
            : 0,
      });

      followerHeadingRef.current?.setStyle({
        opacity:
          showTrails
            ? 0.42
            : 0,
      });
    },
    [
      showTrails,
    ],
  );

  useEffect(
    () => {
      mlPathRef.current?.setStyle({
        opacity:
          showMl
            ? 0.96
            : 0,
      });
    },
    [
      showMl,
    ],
  );

  useEffect(
    () => {
      baselinePathRef.current?.setStyle({
        opacity:
          showBaseline
            ? 0.64
            : 0,
      });
    },
    [
      showBaseline,
    ],
  );

  useEffect(
    () => {
      desiredCircleRef.current?.setStyle({
        opacity:
          showSafety
            ? 0.56
            : 0,
      });

      safetyCircleRef.current?.setStyle({
        opacity:
          showSafety
            ? 0.78
            : 0,

        fillOpacity:
          showSafety
            ? 0.06
            : 0,
      });
    },
    [
      showSafety,
    ],
  );

  /* =======================================================
     Camera Controls
     ======================================================= */

  function fitBoth() {
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
            17,

          animate:
            true,
        },
      );
    }
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

    map.setView(
      positions.leader,
      Math.max(
        map.getZoom(),
        16,
      ),
      {
        animate:
          true,
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

    map.setView(
      positions.follower,
      Math.max(
        map.getZoom(),
        16,
      ),
      {
        animate:
          true,
      },
    );
  }

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div
      className={[
        "grid h-full min-h-[560px] overflow-hidden",

        "grid-rows-[auto_minmax(0,1fr)_auto]",

        "bg-[#020304]",

        "xl:min-h-0",
      ].join(" ")}
    >
      {/* ===================================================
          MAP CONTROLS
          OUTSIDE LEAFLET
          =================================================== */}

      <div
        className={[
          "flex min-h-[72px] flex-wrap items-center justify-between gap-3",

          "border-b border-white/[0.08]",

          "bg-[#07090d]",

          "px-4 py-2.5",
        ].join(" ")}
      >
        {/* Left controls */}

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="mr-3 min-w-[170px]">
            <div className="text-[16px] font-semibold text-white/84">
              Map Controls
            </div>

            <div className="mt-1 text-[14px] text-white/42">
              Basemap · tracking · layers
            </div>
          </div>

          {/* Basemap */}

          <ToolbarButton
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

          <ToolbarButton
            label="Street"
            active={
              baseMap ===
              "street"
            }
            onClick={() =>
              setBaseMap(
                "street",
              )
            }
          />

          <span className="mx-1 h-7 w-px bg-white/[0.08]" />

          {/* Follow */}

          <ToolbarButton
            label="Both"
            active={
              followMode ===
              "both"
            }
            onClick={
              fitBoth
            }
          />

          <ToolbarButton
            label="Leader"
            active={
              followMode ===
              "leader"
            }
            onClick={
              focusLeader
            }
          />

          <ToolbarButton
            label="Follower"
            active={
              followMode ===
              "follower"
            }
            onClick={
              focusFollower
            }
          />

          <ToolbarButton
            label="Free"
            active={
              followMode ===
              "free"
            }
            onClick={() =>
              setFollowMode(
                "free",
              )
            }
          />
        </div>

        {/* Right controls */}

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton
            label={
              showTrails
                ? "Trails On"
                : "Trails Off"
            }
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

          <ToolbarButton
            label="ML Path"
            active={
              showMl
            }
            onClick={() =>
              setShowMl(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <ToolbarButton
            label="Baseline"
            active={
              showBaseline
            }
            onClick={() =>
              setShowBaseline(
                (
                  value,
                ) =>
                  !value,
              )
            }
          />

          <ToolbarButton
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

          <span className="mx-1 h-7 w-px bg-white/[0.08]" />

          <IconButton
            label="Zoom out"
            onClick={() =>
              mapRef.current?.zoomOut()
            }
          >
            <Minus
              size={16}
            />
          </IconButton>

          <IconButton
            label="Zoom in"
            onClick={() =>
              mapRef.current?.zoomIn()
            }
          >
            <Plus
              size={16}
            />
          </IconButton>

          <IconButton
            label="Fit both aircraft"
            onClick={
              fitBoth
            }
          >
            <LocateFixed
              size={16}
            />
          </IconButton>
        </div>
      </div>

      {/* ===================================================
          CLEAN LEAFLET MAP

          No operational cards.
          No control buttons.
          No floating status panels.
          =================================================== */}

      <div className="relative min-h-0 overflow-hidden bg-[#020304]">
        <div
          ref={
            containerRef
          }
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {/* ===================================================
          MAP LEGEND / STATUS
          OUTSIDE LEAFLET
          =================================================== */}

      <div
        className={[
          "flex min-h-[58px] flex-wrap items-center justify-between gap-3",

          "border-t border-white/[0.08]",

          "bg-[#06080b]",

          "px-4 py-2.5",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LegendItem
            label="Leader"
            colorClass="bg-[#F6B23C]"
          />

          <LegendItem
            label="Follower"
            colorClass="bg-[#5AA9FF]"
          />

          <LegendItem
            label="ML prediction"
            colorClass="bg-[#59D99A]"
          />

          <LegendItem
            label="Baseline"
            colorClass="border-white/60"
            dashed
          />

          <LegendItem
            label="Protected radius"
            colorClass="bg-[#FF5A63]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-[4px] border border-white/[0.07] bg-[#05060d] px-3">
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

            <span className="font-mono text-[14px] text-white/52">
              {baseMap ===
              "satellite"
                ? "Satellite"
                : "Street"}
            </span>
          </div>

          <div className="flex h-9 items-center gap-2 rounded-[4px] border border-white/[0.07] bg-[#05060d] px-3">
            {showMl ? (
              <Eye
                size={14}
                className="text-[#59D99A]"
              />
            ) : (
              <EyeOff
                size={14}
                className="text-white/34"
              />
            )}

            <span className="font-mono text-[14px] text-white/52">
              Intelligence Layers
            </span>
          </div>

          <div className="flex h-9 items-center rounded-[4px] border border-white/[0.07] bg-[#05060d] px-3 font-mono text-[14px] text-white/52">
            Follow:{" "}
            <span className="ml-1 text-[#5AA9FF]">
              {followMode.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}