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
  MapPinned,
  Minus,
  Plus,
  Route,
  Satellite,
  ShieldCheck,
  Target,
} from "lucide-react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type {
  InterceptSnapshot,
  Vector2,
} from "../../hooks/useInterceptSimulation";

/* =========================================================
   MissionNexus
   Autonomous Intercept Real Map

   Phase 1:
   - Real satellite imagery
   - OpenStreetMap fallback
   - Local ENU simulation projected to geographic coordinates
   - Leader / follower tracking
   - Baseline trajectory
   - ML trajectory
   - Standoff / safety geometry

   Phase 2:
   - Replace ENU projection with ArduPilot MAVLink GPS
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
  | "street";

type FollowMode =
  | "both"
  | "leader"
  | "follower"
  | "free";

/* =========================================================
   Phase-1 Demo Geographic Origin

   This is only the geographic anchor for the built-in
   simulator.

   When SITL/MAVLink is integrated, this will be replaced
   automatically by the real aircraft HOME / GPS location.
   ========================================================= */

const DEFAULT_ORIGIN = {
  lat:
    20.5937,

  lng:
    78.9629,
};

/* =========================================================
   Coordinate Conversion

   Simulation:
   x = East metres
   y = North metres
   ========================================================= */

function enuToLatLng(
  point:
    Vector2,

  origin: {
    lat: number;
    lng: number;
  },
): L.LatLngExpression {
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
  points:
    Vector2[],

  origin: {
    lat: number;
    lng: number;
  },
): L.LatLngExpression[] {
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
  type:
    | "leader"
    | "follower",

  heading:
    number,

  airspeed:
    number,
) {
  const primary =
    type ===
    "leader"
      ? "#F6B23C"
      : "#5AA9FF";

  const callsign =
    type ===
    "leader"
      ? "LEADER-01"
      : "FOLLOWER-02";

  return L.divIcon({
    className:
      "",

    iconSize: [
      126,
      70,
    ],

    iconAnchor: [
      22,
      22,
    ],

    html: `
      <div
        style="
          position:relative;
          width:126px;
          height:70px;
          pointer-events:none;
          font-family:Inter,system-ui,sans-serif;
        "
      >
        <div
          style="
            position:absolute;
            left:0;
            top:0;
            width:44px;
            height:44px;
            border:1px solid ${primary}66;
            background:rgba(3,4,5,0.88);
            border-radius:50%;
            box-shadow:0 0 22px ${primary}1f;
            display:flex;
            align-items:center;
            justify-content:center;
          "
        >
          <div
            style="
              width:24px;
              height:24px;
              transform:rotate(${heading}deg);
              transform-origin:center;
              position:relative;
            "
          >
            <div
              style="
                position:absolute;
                left:10px;
                top:0;
                width:0;
                height:0;
                border-left:3px solid transparent;
                border-right:3px solid transparent;
                border-bottom:15px solid ${primary};
              "
            ></div>

            <div
              style="
                position:absolute;
                left:3px;
                top:11px;
                width:18px;
                height:2px;
                background:${primary};
              "
            ></div>

            <div
              style="
                position:absolute;
                left:9px;
                top:12px;
                width:6px;
                height:8px;
                background:${primary};
                clip-path:polygon(50% 100%,0 0,100% 0);
              "
            ></div>
          </div>
        </div>

        <div
          style="
            position:absolute;
            left:50px;
            top:3px;
            min-width:74px;
            border:1px solid ${primary}44;
            background:rgba(3,4,5,0.90);
            border-radius:4px;
            padding:5px 7px;
            box-shadow:0 8px 20px rgba(0,0,0,0.30);
          "
        >
          <div
            style="
              color:${primary};
              font-family:JetBrains Mono,monospace;
              font-size:9px;
              line-height:1.1;
              font-weight:700;
              white-space:nowrap;
            "
          >
            ${callsign}
          </div>

          <div
            style="
              margin-top:4px;
              color:rgba(255,255,255,0.48);
              font-family:JetBrains Mono,monospace;
              font-size:8px;
              white-space:nowrap;
            "
          >
            ${airspeed.toFixed(1)} M/S · ${heading.toFixed(0)}°
          </div>
        </div>
      </div>
    `,
  });
}

/* =========================================================
   Small UI Components
   ========================================================= */

function MapToolButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;

  onClick: () => void;

  active?: boolean;

  children:
    React.ReactNode;
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
        "flex h-8 w-8 items-center justify-center",

        "rounded-[4px] border",

        "backdrop-blur",

        "transition-colors duration-150",

        active
          ? "border-[rgba(246,178,60,0.35)] bg-[rgba(246,178,60,0.12)] text-[#F6B23C]"
          : "border-white/[0.10] bg-[rgba(3,4,5,0.90)] text-white/54 hover:border-white/20 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FollowButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "h-7 rounded-[4px] border px-2.5",

        "font-mono text-[8px] font-semibold uppercase tracking-[0.04em]",

        "transition-colors duration-150",

        active
          ? "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.08)] text-[#F6B23C]"
          : "border-white/[0.08] bg-[#05060d]/90 text-white/38 hover:text-white/68",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* =========================================================
   Component
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

  const satelliteLayerRef =
    useRef<L.TileLayer | null>(
      null,
    );

  const streetLayerRef =
    useRef<L.TileLayer | null>(
      null,
    );

  const leaderMarkerRef =
    useRef<L.Marker | null>(
      null,
    );

  const followerMarkerRef =
    useRef<L.Marker | null>(
      null,
    );

  const leaderTrailRef =
    useRef<L.Polyline | null>(
      null,
    );

  const followerTrailRef =
    useRef<L.Polyline | null>(
      null,
    );

  const baselinePathRef =
    useRef<L.Polyline | null>(
      null,
    );

  const mlPathRef =
    useRef<L.Polyline | null>(
      null,
    );

  const guidanceLineRef =
    useRef<L.Polyline | null>(
      null,
    );

  const relationLineRef =
    useRef<L.Polyline | null>(
      null,
    );

  const desiredCircleRef =
    useRef<L.Circle | null>(
      null,
    );

  const safetyCircleRef =
    useRef<L.Circle | null>(
      null,
    );

  const guidanceTargetRef =
    useRef<L.CircleMarker | null>(
      null,
    );

  const homeMarkerRef =
    useRef<L.CircleMarker | null>(
      null,
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
      "both",
    );

  const [
    showBaseline,
    setShowBaseline,
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
     Initialise Leaflet
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
          },
        );

      map.setView(
        [
          origin.lat,
          origin.lng,
        ],
        15,
      );

      /* -----------------------------------------------
         REAL SATELLITE IMAGERY
         ----------------------------------------------- */

      const satelliteLayer =
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom:
              19,

            attribution:
              "Tiles © Esri",
          },
        );

      /* -----------------------------------------------
         Street fallback
         ----------------------------------------------- */

      const streetLayer =
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom:
              19,

            attribution:
              "© OpenStreetMap contributors",
          },
        );

      satelliteLayer.addTo(
        map,
      );

      satelliteLayerRef.current =
        satelliteLayer;

      streetLayerRef.current =
        streetLayer;

      /* -----------------------------------------------
         Aircraft
         ----------------------------------------------- */

      leaderMarkerRef.current =
        L.marker(
          positions.leader,
          {
            icon:
              createAircraftIcon(
                "leader",
                snapshot.leader.heading,
                snapshot.leader.airspeed,
              ),

            zIndexOffset:
              1000,
          },
        ).addTo(
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
                snapshot.follower.airspeed,
              ),

            zIndexOffset:
              900,
          },
        ).addTo(
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
              2.5,

            opacity:
              0.92,
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
              2.5,

            opacity:
              0.90,
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Prediction
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
              2,

            opacity:
              0.60,

            dashArray:
              "5 8",
          },
        ).addTo(
          map,
        );

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
              3,

            opacity:
              0.94,

            dashArray:
              "10 6",
          },
        ).addTo(
          map,
        );

      /* -----------------------------------------------
         Guidance
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
              2,

            opacity:
              0.72,

            dashArray:
              "7 5",
          },
        ).addTo(
          map,
        );

      relationLineRef.current =
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

      guidanceTargetRef.current =
        L.circleMarker(
          positions.guidance,
          {
            radius:
              8,

            color:
              "#5AA9FF",

            weight:
              2,

            fillColor:
              "#5AA9FF",

            fillOpacity:
              0.18,
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
              "#59D99A",

            weight:
              2,

            fillColor:
              "#59D99A",

            fillOpacity:
              0.30,
          },
        )
          .bindTooltip(
            "HOME",
            {
              permanent:
                false,

              direction:
                "top",
            },
          )
          .addTo(
            map,
          );

      /* -----------------------------------------------
         Separation circles use REAL metre radius.
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
              0.52,

            fillOpacity:
              0,

            dashArray:
              "8 8",
          },
        ).addTo(
          map,
        );

      safetyCircleRef.current =
        L.circle(
          positions.leader,
          {
            radius:
              snapshot.minimumSeparationMeters,

            color:
              "#FF5A63",

            weight:
              1.5,

            opacity:
              0.72,

            fillColor:
              "#FF5A63",

            fillOpacity:
              0.055,

            dashArray:
              "5 6",
          },
        ).addTo(
          map,
        );

      mapRef.current =
        map;

      map.on(
        "dragstart",
        () => {
          setFollowMode(
            "free",
          );
        },
      );

      window.setTimeout(
        () => {
          map.invalidateSize();
        },
        50,
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
     Basemap switching
     ======================================================= */

  useEffect(
    () => {
      const map =
        mapRef.current;

      const satellite =
        satelliteLayerRef.current;

      const street =
        streetLayerRef.current;

      if (
        !map ||
        !satellite ||
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
      } else {
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
      }
    },
    [
      baseMap,
    ],
  );

  /* =======================================================
     Real-time layer updates
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

      leaderMarkerRef.current?.setLatLng(
        positions.leader,
      );

      leaderMarkerRef.current?.setIcon(
        createAircraftIcon(
          "leader",
          snapshot.leader.heading,
          snapshot.leader.airspeed,
        ),
      );

      followerMarkerRef.current?.setLatLng(
        positions.follower,
      );

      followerMarkerRef.current?.setIcon(
        createAircraftIcon(
          "follower",
          snapshot.follower.heading,
          snapshot.follower.airspeed,
        ),
      );

      leaderTrailRef.current?.setLatLngs(
        positions.leaderTrail,
      );

      followerTrailRef.current?.setLatLngs(
        positions.followerTrail,
      );

      baselinePathRef.current?.setLatLngs(
        [
          positions.leader,
          ...positions.baseline,
        ],
      );

      mlPathRef.current?.setLatLngs(
        [
          positions.leader,
          ...positions.ml,
        ],
      );

      relationLineRef.current?.setLatLngs(
        [
          positions.follower,
          positions.leader,
        ],
      );

      guidanceLineRef.current?.setLatLngs(
        [
          positions.follower,
          positions.guidance,
        ],
      );

      guidanceTargetRef.current?.setLatLng(
        positions.guidance,
      );

      homeMarkerRef.current?.setLatLng(
        positions.home,
      );

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
      }

      if (
        followMode ===
        "both"
      ) {
        const bounds =
          L.latLngBounds(
            [
              positions.leader,
              positions.follower,
              positions.guidance,
            ],
          );

        if (
          bounds.isValid()
        ) {
          map.fitBounds(
            bounds.pad(
              0.55,
            ),
            {
              animate:
                false,

              maxZoom:
                17,
            },
          );
        }
      }
    },
    [
      positions,
      snapshot.leader.heading,
      snapshot.leader.airspeed,
      snapshot.follower.heading,
      snapshot.follower.airspeed,
      snapshot.desiredSeparationMeters,
      snapshot.minimumSeparationMeters,
      followMode,
    ],
  );

  /* =======================================================
     Layer visibility
     ======================================================= */

  useEffect(
    () => {
      baselinePathRef.current?.setStyle({
        opacity:
          showBaseline
            ? 0.60
            : 0,
      });
    },
    [
      showBaseline,
    ],
  );

  useEffect(
    () => {
      mlPathRef.current?.setStyle({
        opacity:
          showMl
            ? 0.94
            : 0,
      });
    },
    [
      showMl,
    ],
  );

  useEffect(
    () => {
      desiredCircleRef.current?.setStyle({
        opacity:
          showSafety
            ? 0.52
            : 0,
      });

      safetyCircleRef.current?.setStyle({
        opacity:
          showSafety
            ? 0.72
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
     Map commands
     ======================================================= */

  function zoomIn() {
    mapRef.current?.zoomIn();
  }

  function zoomOut() {
    mapRef.current?.zoomOut();
  }

  function focusBoth() {
    setFollowMode(
      "both",
    );
  }

  function focusLeader() {
    setFollowMode(
      "leader",
    );

    mapRef.current?.setView(
      positions.leader,
      Math.max(
        mapRef.current.getZoom(),
        16,
      ),
      {
        animate:
          true,
      },
    );
  }

  function focusFollower() {
    setFollowMode(
      "follower",
    );

    mapRef.current?.setView(
      positions.follower,
      Math.max(
        mapRef.current.getZoom(),
        16,
      ),
      {
        animate:
          true,
      },
    );
  }

  const improvement =
    snapshot.performance
      .improvementPercent;

  const evidenceReady =
    snapshot.performance
      .validationSamples >=
    3;

  const mlWinning =
    evidenceReady &&
    improvement !==
      null &&
    improvement >
      0;

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden bg-[#020304] xl:min-h-0">
      {/* ===================================================
          REAL LEAFLET MAP
          =================================================== */}

      <div
        ref={
          containerRef
        }
        className="absolute inset-0 z-0 h-full w-full"
      />

      {/* Dark tactical grading */}

      <div className="pointer-events-none absolute inset-0 z-[400] bg-[linear-gradient(180deg,rgba(1,3,6,0.06),rgba(1,3,6,0.12))]" />

      <div className="pointer-events-none absolute inset-0 z-[401] shadow-[inset_0_0_90px_rgba(0,0,0,0.45)]" />

      {/* ===================================================
          Top-left
          =================================================== */}

      <div className="absolute left-3 top-3 z-[700] min-w-[225px] overflow-hidden rounded-[5px] border border-white/[0.10] bg-[rgba(3,4,5,0.90)] shadow-[0_12px_30px_rgba(0,0,0,0.32)] backdrop-blur">
        <div className="border-b border-white/[0.07] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <MapPinned
              size={13}
              className="text-[#F6B23C]"
            />

            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-[#F6B23C]">
              Live Intercept Map
            </span>
          </div>

          <div className="mt-1 text-[9px] text-white/36">
            Real satellite basemap · Phase-1 georeferenced simulation
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="border-r border-white/[0.07] px-3 py-2">
            <div className="font-mono text-[8px] uppercase text-white/28">
              Mission State
            </div>

            <div className="mt-1 font-mono text-[10px] font-semibold text-[#5AA9FF]">
              {
                snapshot.mode
              }
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="font-mono text-[8px] uppercase text-white/28">
              Predictor
            </div>

            <div className="mt-1 font-mono text-[10px] font-semibold text-[#59D99A]">
              {snapshot.predictorMode ===
              "ml"
                ? "ML ACTIVE"
                : "BASELINE"}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          Top middle tracking
          =================================================== */}

      <div className="absolute left-1/2 top-3 z-[700] hidden -translate-x-1/2 items-center gap-1.5 rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.90)] p-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.25)] backdrop-blur lg:flex">
        <FollowButton
          label="Both"
          active={
            followMode ===
            "both"
          }
          onClick={
            focusBoth
          }
        />

        <FollowButton
          label="Leader"
          active={
            followMode ===
            "leader"
          }
          onClick={
            focusLeader
          }
        />

        <FollowButton
          label="Follower"
          active={
            followMode ===
            "follower"
          }
          onClick={
            focusFollower
          }
        />

        <FollowButton
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

      {/* ===================================================
          Right controls
          =================================================== */}

      <div className="absolute right-3 top-3 z-[700] flex flex-col gap-1.5">
        <MapToolButton
          label="Satellite imagery"
          active={
            baseMap ===
            "satellite"
          }
          onClick={() =>
            setBaseMap(
              "satellite",
            )
          }
        >
          <Satellite
            size={14}
          />
        </MapToolButton>

        <MapToolButton
          label="Street map"
          active={
            baseMap ===
            "street"
          }
          onClick={() =>
            setBaseMap(
              "street",
            )
          }
        >
          <Layers3
            size={14}
          />
        </MapToolButton>

        <MapToolButton
          label="Zoom in"
          onClick={
            zoomIn
          }
        >
          <Plus
            size={14}
          />
        </MapToolButton>

        <MapToolButton
          label="Zoom out"
          onClick={
            zoomOut
          }
        >
          <Minus
            size={14}
          />
        </MapToolButton>

        <MapToolButton
          label="Track both aircraft"
          active={
            followMode ===
            "both"
          }
          onClick={
            focusBoth
          }
        >
          <LocateFixed
            size={14}
          />
        </MapToolButton>
      </div>

      {/* ===================================================
          Layer controls
          =================================================== */}

      <div className="absolute left-3 top-[142px] z-[700] hidden w-[155px] overflow-hidden rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] backdrop-blur lg:block">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2 font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white/38">
          <Route
            size={10}
          />

          Intelligence Layers
        </div>

        <button
          type="button"
          onClick={() =>
            setShowMl(
              (
                value,
              ) =>
                !value,
            )
          }
          className="flex w-full items-center justify-between border-b border-white/[0.05] px-3 py-2 text-left"
        >
          <span className="text-[9px] text-white/48">
            ML Prediction
          </span>

          <span
            className={[
              "h-2 w-2 rounded-full",

              showMl
                ? "bg-[#59D99A]"
                : "bg-white/15",
            ].join(" ")}
          />
        </button>

        <button
          type="button"
          onClick={() =>
            setShowBaseline(
              (
                value,
              ) =>
                !value,
            )
          }
          className="flex w-full items-center justify-between border-b border-white/[0.05] px-3 py-2 text-left"
        >
          <span className="text-[9px] text-white/48">
            Baseline
          </span>

          <span
            className={[
              "h-2 w-2 rounded-full",

              showBaseline
                ? "bg-white/60"
                : "bg-white/15",
            ].join(" ")}
          />
        </button>

        <button
          type="button"
          onClick={() =>
            setShowSafety(
              (
                value,
              ) =>
                !value,
            )
          }
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <span className="text-[9px] text-white/48">
            Safety Rings
          </span>

          <span
            className={[
              "h-2 w-2 rounded-full",

              showSafety
                ? "bg-[#FF5A63]"
                : "bg-white/15",
            ].join(" ")}
          />
        </button>
      </div>

      {/* ===================================================
          AI proof
          =================================================== */}

      <div className="absolute bottom-[72px] right-3 z-[700] min-w-[165px] rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.90)] px-3 py-2.5 text-right backdrop-blur">
        <div className="flex items-center justify-end gap-2 font-mono text-[8px] uppercase text-white/28">
          <Target
            size={10}
          />

          Prediction Evidence
        </div>

        <div
          className={[
            "mt-1 font-mono text-[11px] font-semibold",

            !evidenceReady
              ? "text-[#F6B23C]"
              : mlWinning
                ? "text-[#59D99A]"
                : "text-[#FF5A63]",
          ].join(" ")}
        >
          {!evidenceReady
            ? "MODEL WARMING"
            : mlWinning
              ? `ML +${improvement?.toFixed(
                  1,
                )}%`
              : "BASELINE LEADING"}
        </div>

        <div className="mt-1 font-mono text-[8px] text-white/28">
          {
            snapshot.performance.validationSamples
          }{" "}
          validated predictions
        </div>
      </div>

      {/* ===================================================
          Bottom operational strip
          =================================================== */}

      <div className="absolute bottom-3 left-1/2 z-[700] grid w-[min(780px,calc(100%-24px))] -translate-x-1/2 grid-cols-2 overflow-hidden rounded-[5px] border border-white/[0.10] bg-[rgba(3,4,5,0.92)] shadow-[0_12px_30px_rgba(0,0,0,0.34)] backdrop-blur sm:grid-cols-4">
        <div className="border-r border-white/[0.07] px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.04em] text-white/28">
            Separation
          </div>

          <div
            className={[
              "mt-1 font-mono text-[12px] font-semibold",

              snapshot.separationSafe
                ? "text-[#59D99A]"
                : "text-[#FF5A63]",
            ].join(" ")}
          >
            {snapshot.distanceMeters.toFixed(
              0,
            )}{" "}
            m
          </div>
        </div>

        <div className="border-r border-white/[0.07] px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.04em] text-white/28">
            Closing Rate
          </div>

          <div className="mt-1 font-mono text-[12px] font-semibold text-[#5AA9FF]">
            {snapshot.closingRateMps.toFixed(
              1,
            )}{" "}
            m/s
          </div>
        </div>

        <div className="border-r border-white/[0.07] px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.04em] text-white/28">
            AI Confidence
          </div>

          <div className="mt-1 font-mono text-[12px] font-semibold text-[#59D99A]">
            {snapshot.ai.ready
              ? `${Math.round(
                  snapshot.ai.confidence *
                    100,
                )}%`
              : "WARMING"}
          </div>
        </div>

        <div className="px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.04em] text-white/28">
            Safety Gate
          </div>

          <div
            className={[
              "mt-1 flex items-center gap-1.5 font-mono text-[12px] font-semibold",

              snapshot.separationSafe
                ? "text-[#59D99A]"
                : "text-[#FF5A63]",
            ].join(" ")}
          >
            <ShieldCheck
              size={12}
            />

            {snapshot.separationSafe
              ? "PASS"
              : "RECOVERY"}
          </div>
        </div>
      </div>

      {/* ===================================================
          Map mode label
          =================================================== */}

      <div className="absolute bottom-[72px] left-3 z-[700] rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Crosshair
            size={10}
            className="text-[#F6B23C]"
          />

          <span className="font-mono text-[8px] uppercase text-white/32">
            {
              baseMap ===
              "satellite"
                ? "Satellite Imagery"
                : "Street Basemap"
            }
          </span>
        </div>

        <div className="mt-1 font-mono text-[8px] text-white/24">
          Phase-1 simulated positions · real geographic map
        </div>
      </div>
    </div>
  );
}