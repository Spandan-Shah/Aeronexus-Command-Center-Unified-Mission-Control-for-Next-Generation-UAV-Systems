import {
  useMemo,
} from "react";

import type {
  AircraftState,
  InterceptSnapshot,
  Vector2,
} from "../../hooks/useInterceptSimulation";

type InterceptMapProps = {
  snapshot:
    InterceptSnapshot;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

/* =========================================================
   Path Helpers
   ========================================================= */

function polylinePoints(
  points:
    Vector2[],
  project: (
    point:
      Vector2,
  ) => ProjectedPoint,
) {
  return points
    .map(
      (
        point,
      ) => {
        const projected =
          project(
            point,
          );

        return `${projected.x},${projected.y}`;
      },
    )
    .join(
      " ",
    );
}

/* =========================================================
   Aircraft Marker
   ========================================================= */

function AircraftMarker({
  aircraft,
  project,
  type,
}: {
  aircraft:
    AircraftState;

  project: (
    point:
      Vector2,
  ) => ProjectedPoint;

  type:
    | "leader"
    | "follower";
}) {
  const point =
    project(
      aircraft,
    );

  const fill =
    type ===
    "leader"
      ? "#F6B23C"
      : "#5AA9FF";

  const label =
    type ===
    "leader"
      ? "L"
      : "F";

  return (
    <g
      transform={`translate(${point.x} ${point.y}) rotate(${aircraft.heading})`}
    >
      <circle
        r="17"
        fill="rgba(3,4,5,0.92)"
        stroke={fill}
        strokeWidth="1.5"
      />

      <path
        d="M 0 -12 L 7 9 L 0 5 L -7 9 Z"
        fill={fill}
      />

      <text
        x="0"
        y="29"
        textAnchor="middle"
        transform={`rotate(${-aircraft.heading})`}
        fill={fill}
        fontFamily="monospace"
        fontSize="11"
        fontWeight="700"
      >
        {label}
      </text>
    </g>
  );
}

/* =========================================================
   Intercept Map
   ========================================================= */

export function InterceptMap({
  snapshot,
}: InterceptMapProps) {
  const projection =
    useMemo(
      () => {
        const allPoints:
          Vector2[] = [
          snapshot.leader,
          snapshot.follower,
          snapshot.home,
          snapshot.guidanceTarget,
          ...snapshot.leaderTrail,
          ...snapshot.followerTrail,
          ...snapshot.baselinePath,
          ...snapshot.mlPath,
        ];

        const minX =
          Math.min(
            ...allPoints.map(
              (
                point,
              ) =>
                point.x,
            ),
          );

        const maxX =
          Math.max(
            ...allPoints.map(
              (
                point,
              ) =>
                point.x,
            ),
          );

        const minY =
          Math.min(
            ...allPoints.map(
              (
                point,
              ) =>
                point.y,
            ),
          );

        const maxY =
          Math.max(
            ...allPoints.map(
              (
                point,
              ) =>
                point.y,
            ),
          );

        const centerX =
          (
            minX +
            maxX
          ) /
          2;

        const centerY =
          (
            minY +
            maxY
          ) /
          2;

        const worldWidth =
          Math.max(
            900,
            maxX -
              minX +
              380,
          );

        const worldHeight =
          Math.max(
            650,
            maxY -
              minY +
              320,
          );

        const scale =
          Math.min(
            900 /
              worldWidth,
            520 /
              worldHeight,
          );

        return (
          point:
            Vector2,
        ): ProjectedPoint => ({
          x:
            500 +
            (
              point.x -
              centerX
            ) *
              scale,

          y:
            300 -
            (
              point.y -
              centerY
            ) *
              scale,
        });
      },
      [
        snapshot.leader,
        snapshot.follower,
        snapshot.home,
        snapshot.guidanceTarget,
        snapshot.leaderTrail,
        snapshot.followerTrail,
        snapshot.baselinePath,
        snapshot.mlPath,
      ],
    );

  const leaderPoint =
    projection(
      snapshot.leader,
    );

  const followerPoint =
    projection(
      snapshot.follower,
    );

  const guidancePoint =
    projection(
      snapshot.guidanceTarget,
    );

  const homePoint =
    projection(
      snapshot.home,
    );

  const desiredScalePoint =
    projection({
      x:
        snapshot.leader.x +
        snapshot.desiredSeparationMeters,

      y:
        snapshot.leader.y,
    });

  const minimumScalePoint =
    projection({
      x:
        snapshot.leader.x +
        snapshot.minimumSeparationMeters,

      y:
        snapshot.leader.y,
    });

  const desiredRadius =
    Math.abs(
      desiredScalePoint.x -
      leaderPoint.x,
    );

  const minimumRadius =
    Math.abs(
      minimumScalePoint.x -
      leaderPoint.x,
    );

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden bg-[#020304] xl:min-h-0">
      <svg
        viewBox="0 0 1000 600"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Autonomous intercept simulation map"
      >
        <defs>
          <pattern
            id="intercept-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
            />
          </pattern>

          <radialGradient
            id="intercept-vignette"
          >
            <stop
              offset="0%"
              stopColor="#09121a"
            />

            <stop
              offset="100%"
              stopColor="#020304"
            />
          </radialGradient>
        </defs>

        <rect
          width="1000"
          height="600"
          fill="url(#intercept-vignette)"
        />

        <rect
          width="1000"
          height="600"
          fill="url(#intercept-grid)"
        />

        {/* Reference axes */}

        <line
          x1="500"
          y1="0"
          x2="500"
          y2="600"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />

        <line
          x1="0"
          y1="300"
          x2="1000"
          y2="300"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />

        {/* Desired shadow ring */}

        <circle
          cx={
            leaderPoint.x
          }
          cy={
            leaderPoint.y
          }
          r={
            desiredRadius
          }
          fill="none"
          stroke="rgba(246,178,60,0.20)"
          strokeWidth="1.4"
          strokeDasharray="7 7"
        />

        {/* Hard safety ring */}

        <circle
          cx={
            leaderPoint.x
          }
          cy={
            leaderPoint.y
          }
          r={
            minimumRadius
          }
          fill="rgba(255,90,99,0.035)"
          stroke="rgba(255,90,99,0.30)"
          strokeWidth="1.4"
          strokeDasharray="4 5"
        />

        {/* Leader history */}

        {snapshot.leaderTrail.length >
        1 ? (
          <polyline
            points={polylinePoints(
              snapshot.leaderTrail,
              projection,
            )}
            fill="none"
            stroke="rgba(246,178,60,0.52)"
            strokeWidth="2"
          />
        ) : null}

        {/* Follower history */}

        {snapshot.followerTrail.length >
        1 ? (
          <polyline
            points={polylinePoints(
              snapshot.followerTrail,
              projection,
            )}
            fill="none"
            stroke="rgba(90,169,255,0.52)"
            strokeWidth="2"
          />
        ) : null}

        {/* Baseline prediction */}

        {snapshot.baselinePath.length >
        0 ? (
          <polyline
            points={polylinePoints(
              [
                snapshot.leader,
                ...snapshot
                  .baselinePath,
              ],
              projection,
            )}
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="1.5"
            strokeDasharray="4 7"
          />
        ) : null}

        {/* ML prediction */}

        {snapshot.mlPath.length >
        0 ? (
          <polyline
            points={polylinePoints(
              [
                snapshot.leader,
                ...snapshot.mlPath,
              ],
              projection,
            )}
            fill="none"
            stroke="rgba(89,217,154,0.86)"
            strokeWidth="2"
            strokeDasharray="8 5"
          />
        ) : null}

        {/* Current aircraft relationship */}

        <line
          x1={
            followerPoint.x
          }
          y1={
            followerPoint.y
          }
          x2={
            leaderPoint.x
          }
          y2={
            leaderPoint.y
          }
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />

        {/* Follower to guidance target */}

        <line
          x1={
            followerPoint.x
          }
          y1={
            followerPoint.y
          }
          x2={
            guidancePoint.x
          }
          y2={
            guidancePoint.y
          }
          stroke="rgba(90,169,255,0.38)"
          strokeWidth="1.6"
          strokeDasharray="5 5"
        />

        {/* Guidance point */}

        <circle
          cx={
            guidancePoint.x
          }
          cy={
            guidancePoint.y
          }
          r="8"
          fill="rgba(89,217,154,0.12)"
          stroke="#59D99A"
          strokeWidth="1.5"
        />

        <line
          x1={
            guidancePoint.x -
            13
          }
          y1={
            guidancePoint.y
          }
          x2={
            guidancePoint.x +
            13
          }
          y2={
            guidancePoint.y
          }
          stroke="#59D99A"
          strokeWidth="1"
        />

        <line
          x1={
            guidancePoint.x
          }
          y1={
            guidancePoint.y -
            13
          }
          x2={
            guidancePoint.x
          }
          y2={
            guidancePoint.y +
            13
          }
          stroke="#59D99A"
          strokeWidth="1"
        />

        {/* Home */}

        <circle
          cx={
            homePoint.x
          }
          cy={
            homePoint.y
          }
          r="7"
          fill="#59D99A"
          opacity="0.8"
        />

        <text
          x={
            homePoint.x +
            13
          }
          y={
            homePoint.y +
            4
          }
          fontFamily="monospace"
          fontSize="10"
          fill="rgba(89,217,154,0.82)"
        >
          HOME
        </text>

        {/* Aircraft */}

        <AircraftMarker
          aircraft={
            snapshot.leader
          }
          project={
            projection
          }
          type="leader"
        />

        <AircraftMarker
          aircraft={
            snapshot.follower
          }
          project={
            projection
          }
          type="follower"
        />
      </svg>

      {/* Top left */}

      <div className="absolute left-3 top-3 rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.90)] px-3 py-2 backdrop-blur">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.055em] text-[#F6B23C]">
          Intercept Simulation
        </div>

        <div className="mt-1 font-mono text-[9px] text-white/36">
          Local ENU · meters
        </div>
      </div>

      {/* Top right */}

      <div className="absolute right-3 top-3 rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.90)] px-3 py-2 text-right backdrop-blur">
        <div className="font-mono text-[10px] font-semibold uppercase text-[#5AA9FF]">
          {
            snapshot.mode
          }
        </div>

        <div className="mt-1 font-mono text-[9px] text-white/34">
          {snapshot.predictorMode ===
          "ml"
            ? "ML guidance active"
            : "Baseline guidance"}
        </div>
      </div>

      {/* Legend */}

      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.90)] px-3 py-2 font-mono text-[9px] text-white/42 backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F6B23C]" />

          Leader
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#5AA9FF]" />

          Follower
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#59D99A]" />

          ML prediction
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/40" />

          Baseline
        </span>
      </div>

      {/* Separation */}

      <div
        className={[
          "absolute bottom-3 right-3 rounded-[5px] border px-3 py-2 backdrop-blur",

          snapshot.separationSafe
            ? "border-[rgba(89,217,154,0.22)] bg-[rgba(3,4,5,0.9)]"
            : "border-[rgba(255,90,99,0.32)] bg-[rgba(255,90,99,0.08)]",
        ].join(" ")}
      >
        <div
          className={[
            "font-mono text-[9px] font-semibold uppercase",

            snapshot.separationSafe
              ? "text-[#59D99A]"
              : "text-[#FF5A63]",
          ].join(" ")}
        >
          {snapshot.separationSafe
            ? "Separation Safe"
            : "Safety Recovery"}
        </div>

        <div className="mt-1 font-mono text-[9px] text-white/34">
          Protected radius{" "}
          {
            snapshot.minimumSeparationMeters
          }
          m
        </div>
      </div>
    </div>
  );
}