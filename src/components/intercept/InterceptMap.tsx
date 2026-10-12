import {
  useEffect,
  useMemo,
  useRef,
  useState,
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

const DEFAULT_ORIGIN = {
  lat:
    20.5937,

  lng:
    78.9629,
};

/* =========================================================
   Geographic conversion
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

  distance:
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
        distance,

    y:
      aircraft.y +
      direction.y *
        distance,
  };
}

/* =========================================================
   Aircraft icon
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
      ? "#F6B23C"
      : "#5AA9FF";

  return L.divIcon({
    className:
      "",

    iconSize: [
      36,
      36,
    ],

    iconAnchor: [
      18,
      18,
    ],

    html: `
      <div
        style="
          width:36px;
          height:36px;
          border-radius:50%;
          border:1px solid ${color}99;
          background:rgba(3,4,5,0.88);
          box-shadow:0 0 14px ${color}35;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            position:relative;
            width:21px;
            height:21px;
            transform:rotate(${heading}deg);
          "
        >
          <div
            style="
              position:absolute;
              left:8px;
              top:0;
              width:0;
              height:0;
              border-left:3px solid transparent;
              border-right:3px solid transparent;
              border-bottom:14px solid ${color};
            "
          ></div>

          <div
            style="
              position:absolute;
              left:1px;
              top:10px;
              width:19px;
              height:2px;
              background:${color};
            "
          ></div>
        </div>
      </div>
    `,
  });
}

/* =========================================================
   Toolbar controls
   ========================================================= */

function ToolbarButton({
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
        "h-8 rounded-[4px] border px-3",

        "font-mono text-[10px] font-semibold uppercase tracking-[0.035em]",

        "transition-colors",

        active
          ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.07)] text-[#F6B23C]"
          : "border-white/[0.08] bg-[#05060d] text-white/54 hover:border-white/[0.16] hover:text-white",
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

  const labelLayerRef =
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

  const leaderHeadingRef =
    useRef<L.Polyline | null>(
      null,
    );

  const followerHeadingRef =
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

  const relationshipLineRef =
    useRef<L.Polyline | null>(
      null,
    );

  const guidanceMarkerRef =
    useRef<L.CircleMarker | null>(
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
              150,
            ),
            origin,
          ),

        followerHeading:
          enuToLatLng(
            headingEndpoint(
              snapshot.follower,
              150,
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
          },
        );

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
              1000,
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
              900,
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
          },
        ).addTo(
          map,
        );

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
              0.62,

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
              0.96,

            dashArray:
              "10 6",
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
              "#5AA9FF",

            weight:
              2,

            opacity:
              0.75,

            dashArray:
              "7 5",
          },
        ).addTo(
          map,
        );

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
              0.18,
          },
        )
          .bindTooltip(
            "Guidance Target",
          )
          .addTo(
            map,
          );

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
              0.55,

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
              0.05,

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
              5,

            color:
              "#59D99A",

            weight:
              2,

            fillColor:
              "#59D99A",

            fillOpacity:
              0.4,
          },
        )
          .bindTooltip(
            "HOME",
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

      window.setTimeout(
        () => {
          map.invalidateSize();

          const bounds =
            L.latLngBounds([
              positions.leader,
              positions.follower,
              positions.guidance,
            ]);

          map.fitBounds(
            bounds,
            {
              padding: [
                80,
                80,
              ],

              maxZoom:
                16,
            },
          );
        },
        100,
      );

      map.on(
        "dragstart",
        () => {
          setFollowMode(
            "free",
          );
        },
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
     Base map
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
     Live updates
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

      leaderTrailRef.current?.setLatLngs(
        positions.leaderTrail,
      );

      followerTrailRef.current?.setLatLngs(
        positions.followerTrail,
      );

      leaderHeadingRef.current?.setLatLngs([
        positions.leader,
        positions.leaderHeading,
      ]);

      followerHeadingRef.current?.setLatLngs([
        positions.follower,
        positions.followerHeading,
      ]);

      baselinePathRef.current?.setLatLngs([
        positions.leader,
        ...positions.baseline,
      ]);

      mlPathRef.current?.setLatLngs([
        positions.leader,
        ...positions.ml,
      ]);

      guidanceLineRef.current?.setLatLngs([
        positions.follower,
        positions.guidance,
      ]);

      relationshipLineRef.current?.setLatLngs([
        positions.follower,
        positions.leader,
      ]);

      guidanceMarkerRef.current?.setLatLng(
        positions.guidance,
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
          L.latLngBounds([
            positions.leader,
            positions.follower,
            positions.guidance,
          ]);

        const visible =
          map
            .getBounds()
            .pad(
              -0.15,
            );

        if (
          !visible.contains(
            positions.leader,
          ) ||
          !visible.contains(
            positions.follower,
          )
        ) {
          map.fitBounds(
            bounds,
            {
              padding: [
                80,
                80,
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
     Layer visibility
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
      desiredCircleRef.current?.setStyle({
        opacity:
          showSafety
            ? 0.55
            : 0,
      });

      safetyCircleRef.current?.setStyle({
        opacity:
          showSafety
            ? 0.72
            : 0,

        fillOpacity:
          showSafety
            ? 0.05
            : 0,
      });
    },
    [
      showSafety,
    ],
  );

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

    map.fitBounds(
      L.latLngBounds([
        positions.leader,
        positions.follower,
        positions.guidance,
      ]),
      {
        padding: [
          80,
          80,
        ],

        maxZoom:
          17,
      },
    );
  }

  return (
    <div className="grid h-full min-h-[520px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#020304] xl:min-h-0">
      {/* ===================================================
          MAP TOOLBAR — OUTSIDE MAP
          =================================================== */}

      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#07090d] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2">
            <div className="text-[12px] font-medium text-white/80">
              Map Controls
            </div>

            <div className="mt-0.5 font-mono text-[9px] uppercase text-white/30">
              Basemap · tracking · intelligence layers
            </div>
          </div>

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

          <span className="mx-1 h-6 w-px bg-white/[0.08]" />

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
            onClick={() =>
              setFollowMode(
                "leader",
              )
            }
          />

          <ToolbarButton
            label="Follower"
            active={
              followMode ===
              "follower"
            }
            onClick={() =>
              setFollowMode(
                "follower",
              )
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

          <button
            type="button"
            title="Zoom out"
            onClick={() =>
              mapRef.current?.zoomOut()
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#05060d] text-white/54 hover:text-white"
          >
            <Minus
              size={14}
            />
          </button>

          <button
            type="button"
            title="Zoom in"
            onClick={() =>
              mapRef.current?.zoomIn()
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#05060d] text-white/54 hover:text-white"
          >
            <Plus
              size={14}
            />
          </button>

          <button
            type="button"
            title="Fit both aircraft"
            onClick={
              fitBoth
            }
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.08] bg-[#05060d] text-white/54 hover:text-white"
          >
            <LocateFixed
              size={14}
            />
          </button>

          <div className="flex h-8 items-center gap-2 rounded-[4px] border border-white/[0.07] bg-[#05060d] px-2.5 font-mono text-[9px] uppercase text-white/36">
            {baseMap ===
            "satellite" ? (
              <Satellite
                size={11}
              />
            ) : (
              <Layers3
                size={11}
              />
            )}

            {baseMap}
          </div>

          <div className="flex h-8 items-center gap-2 rounded-[4px] border border-white/[0.07] bg-[#05060d] px-2.5 font-mono text-[9px] uppercase text-white/36">
            {showMl ? (
              <Eye
                size={11}
              />
            ) : (
              <EyeOff
                size={11}
              />
            )}

            Intelligence
          </div>
        </div>
      </div>

      {/* ===================================================
          CLEAN MAP
          =================================================== */}

      <div
        ref={
          containerRef
        }
        className="h-full min-h-0 w-full bg-[#020304]"
      />
    </div>
  );
}