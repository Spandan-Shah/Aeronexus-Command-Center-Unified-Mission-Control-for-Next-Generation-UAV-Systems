import {
  useMemo,
  useState,
} from "react";

import {
  Crosshair,
  LocateFixed,
  Minus,
  Plus,
  Route,
  ShieldCheck,
  Target,
} from "lucide-react";

import type {
  AircraftState,
  InterceptSnapshot,
  Vector2,
} from "../../hooks/useInterceptSimulation";

/* =========================================================
   MissionNexus
   Autonomous Intercept Tactical Map

   Phase 1
   - Local ENU tactical coordinate space
   - Leader / follower tracks
   - Baseline prediction
   - ML trajectory prediction
   - Guidance corridor
   - Protected separation zone
   - Desired shadow ring
   - Heading vectors
   - Camera modes
   - AI evidence indicator
   ========================================================= */

type InterceptMapProps = {
  snapshot:
    InterceptSnapshot;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

type CameraMode =
  | "auto"
  | "leader"
  | "follower";

type ProjectionState = {
  project: (
    point:
      Vector2,
  ) => ProjectedPoint;

  scale:
    number;
};

/* =========================================================
   Utilities
   ========================================================= */

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value,
    ),
  );
}

function toRadians(
  degrees: number,
) {
  return (
    degrees *
    Math.PI /
    180
  );
}

function headingVector(
  heading: number,
): Vector2 {
  const radians =
    toRadians(
      heading,
    );

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
  const vector =
    headingVector(
      aircraft.heading,
    );

  return {
    x:
      aircraft.x +
      vector.x *
        distance,

    y:
      aircraft.y +
      vector.y *
        distance,
  };
}

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

function formatDistance(
  meters: number,
) {
  if (
    meters >=
    1000
  ) {
    return `${(
      meters /
      1000
    ).toFixed(
      2,
    )} km`;
  }

  return `${Math.round(
    meters,
  )} m`;
}

function formatSignedRate(
  rate: number,
) {
  const prefix =
    rate >
    0
      ? "+"
      : "";

  return `${prefix}${rate.toFixed(
    1,
  )} m/s`;
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

  const primary =
    type ===
    "leader"
      ? "#F6B23C"
      : "#5AA9FF";

  const soft =
    type ===
    "leader"
      ? "rgba(246,178,60,0.15)"
      : "rgba(90,169,255,0.15)";

  const label =
    type ===
    "leader"
      ? "LDR"
      : "FLW";

  const sysId =
    type ===
    "leader"
      ? "01"
      : "02";

  return (
    <g
      transform={`translate(${point.x} ${point.y})`}
    >
      {/* Outer awareness ring */}

      <circle
        r="26"
        fill="none"
        stroke={primary}
        strokeWidth="1"
        strokeOpacity="0.22"
      />

      <circle
        r="20"
        fill={soft}
        stroke={primary}
        strokeWidth="1.2"
        strokeOpacity="0.42"
      />

      {/* Aircraft */}

      <g
        transform={`rotate(${aircraft.heading})`}
      >
        <path
          d="M 0 -14 L 7 8 L 3 6 L 0 11 L -3 6 L -7 8 Z"
          fill={primary}
        />

        <line
          x1="-13"
          y1="1"
          x2="13"
          y2="1"
          stroke={primary}
          strokeWidth="2"
        />
      </g>

      {/* Label */}

      <g
        transform="translate(30 -15)"
      >
        <rect
          width="74"
          height="31"
          rx="4"
          fill="rgba(3,4,5,0.92)"
          stroke={primary}
          strokeOpacity="0.34"
        />

        <text
          x="8"
          y="12"
          fill={primary}
          fontFamily="monospace"
          fontSize="8"
          fontWeight="700"
        >
          {label}-{sysId}
        </text>

        <text
          x="8"
          y="24"
          fill="rgba(255,255,255,0.52)"
          fontFamily="monospace"
          fontSize="7.5"
        >
          {aircraft.airspeed.toFixed(
            1,
          )} M/S ·{" "}
          {aircraft.heading.toFixed(
            0,
          )}°
        </text>
      </g>
    </g>
  );
}

/* =========================================================
   Layer Toggle
   ========================================================= */

function LayerButton({
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
      aria-pressed={
        active
      }
      className={[
        "h-7 rounded-[4px] border px-2.5",

        "font-mono text-[8px] font-semibold uppercase tracking-[0.04em]",

        "transition-colors duration-150",

        active
          ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.07)] text-[#F6B23C]"
          : "border-white/[0.08] bg-[#05060d] text-white/38 hover:text-white/68",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* =========================================================
   Map Control Button
   ========================================================= */

function MapControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
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
      className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-white/[0.09] bg-[rgba(3,4,5,0.92)] text-white/48 backdrop-blur transition hover:border-white/[0.18] hover:text-white"
    >
      {children}
    </button>
  );
}

/* =========================================================
   Tactical Map
   ========================================================= */

export function InterceptMap({
  snapshot,
}: InterceptMapProps) {
  const [
    zoom,
    setZoom,
  ] =
    useState(
      1,
    );

  const [
    cameraMode,
    setCameraMode,
  ] =
    useState<CameraMode>(
      "auto",
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
     Projection
     ======================================================= */

  const projection =
    useMemo<ProjectionState>(
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

        let centerX =
          (
            minX +
            maxX
          ) /
          2;

        let centerY =
          (
            minY +
            maxY
          ) /
          2;

        if (
          cameraMode ===
          "leader"
        ) {
          centerX =
            snapshot.leader.x;

          centerY =
            snapshot.leader.y;
        }

        if (
          cameraMode ===
          "follower"
        ) {
          centerX =
            snapshot.follower.x;

          centerY =
            snapshot.follower.y;
        }

        const width =
          cameraMode ===
          "auto"
            ? Math.max(
                900,
                maxX -
                  minX +
                  420,
              )
            : 1150;

        const height =
          cameraMode ===
          "auto"
            ? Math.max(
                650,
                maxY -
                  minY +
                  360,
              )
            : 760;

        const baseScale =
          Math.min(
            870 /
              width,

            490 /
              height,
          );

        const scale =
          baseScale *
          zoom;

        return {
          scale,

          project: (
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
          }),
        };
      },
      [
        cameraMode,
        zoom,
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

  const {
    project,
    scale,
  } =
    projection;

  /* =======================================================
     Projected Objects
     ======================================================= */

  const leaderPoint =
    project(
      snapshot.leader,
    );

  const followerPoint =
    project(
      snapshot.follower,
    );

  const guidancePoint =
    project(
      snapshot.guidanceTarget,
    );

  const homePoint =
    project(
      snapshot.home,
    );

  const leaderHeadingPoint =
    project(
      headingEndpoint(
        snapshot.leader,
        140,
      ),
    );

  const followerHeadingPoint =
    project(
      headingEndpoint(
        snapshot.follower,
        140,
      ),
    );

  const desiredRadius =
    snapshot.desiredSeparationMeters *
    scale;

  const minimumRadius =
    snapshot.minimumSeparationMeters *
    scale;

  /* =======================================================
     Evidence
     ======================================================= */

  const improvement =
    snapshot.performance
      .improvementPercent;

  const evidenceReady =
    snapshot.performance
      .validationSamples >=
    3;

  const mlLeading =
    evidenceReady &&
    improvement !==
      null &&
    improvement >
      0;

  const evidenceLabel =
    !evidenceReady
      ? "MODEL WARMING"
      : mlLeading
        ? `ML +${improvement?.toFixed(
            1,
          )}%`
        : "BASELINE LEADING";

  const evidenceColor =
    !evidenceReady
      ? "#F6B23C"
      : mlLeading
        ? "#59D99A"
        : "#FF5A63";

  const currentPrediction =
    snapshot.predictorMode ===
    "ml"
      ? snapshot.mlPath
      : snapshot.baselinePath;

  const predictedTerminalPoint =
    currentPrediction.length >
    0
      ? project(
          currentPrediction[
            currentPrediction.length -
              1
          ],
        )
      : leaderPoint;

  /* =======================================================
     Camera controls
     ======================================================= */

  function zoomIn() {
    setZoom(
      (
        value,
      ) =>
        clamp(
          value +
            0.15,
          0.65,
          1.75,
        ),
    );
  }

  function zoomOut() {
    setZoom(
      (
        value,
      ) =>
        clamp(
          value -
            0.15,
          0.65,
          1.75,
        ),
    );
  }

  function resetView() {
    setZoom(
      1,
    );

    setCameraMode(
      "auto",
    );
  }

  function cycleCameraMode() {
    setCameraMode(
      (
        current,
      ) => {
        if (
          current ===
          "auto"
        ) {
          return "leader";
        }

        if (
          current ===
          "leader"
        ) {
          return "follower";
        }

        return "auto";
      },
    );
  }

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden bg-[#020304] xl:min-h-0">
      {/* ===================================================
          Main SVG
          =================================================== */}

      <svg
        viewBox="0 0 1000 600"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="MissionNexus autonomous intercept tactical airspace map"
      >
        <defs>
          {/* ===============================================
              Background
              =============================================== */}

          <linearGradient
            id="airspace-background"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#071018"
            />

            <stop
              offset="42%"
              stopColor="#03070b"
            />

            <stop
              offset="100%"
              stopColor="#010203"
            />
          </linearGradient>

          <radialGradient
            id="radar-glow"
            cx="50%"
            cy="47%"
            r="63%"
          >
            <stop
              offset="0%"
              stopColor="rgba(22,53,70,0.32)"
            />

            <stop
              offset="62%"
              stopColor="rgba(4,9,13,0.12)"
            />

            <stop
              offset="100%"
              stopColor="rgba(0,0,0,0)"
            />
          </radialGradient>

          {/* ===============================================
              Grid
              =============================================== */}

          <pattern
            id="minor-grid"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 25 0 L 0 0 0 25"
              fill="none"
              stroke="rgba(255,255,255,0.018)"
              strokeWidth="1"
            />
          </pattern>

          <pattern
            id="major-grid"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="100"
              height="100"
              fill="url(#minor-grid)"
            />

            <path
              d="M 100 0 L 0 0 0 100"
              fill="none"
              stroke="rgba(90,169,255,0.055)"
              strokeWidth="1"
            />
          </pattern>

          {/* ===============================================
              Glow filters
              =============================================== */}

          <filter
            id="leader-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              stdDeviation="4"
              result="blur"
            />

            <feMerge>
              <feMergeNode
                in="blur"
              />

              <feMergeNode
                in="SourceGraphic"
              />
            </feMerge>
          </filter>

          <filter
            id="ml-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              stdDeviation="2.8"
              result="blur"
            />

            <feMerge>
              <feMergeNode
                in="blur"
              />

              <feMergeNode
                in="SourceGraphic"
              />
            </feMerge>
          </filter>
        </defs>

        {/* =================================================
            Base
            ================================================= */}

        <rect
          width="1000"
          height="600"
          fill="url(#airspace-background)"
        />

        <rect
          width="1000"
          height="600"
          fill="url(#radar-glow)"
        />

        <rect
          width="1000"
          height="600"
          fill="url(#major-grid)"
        />

        {/* =================================================
            Decorative terrain / contour shapes

            These are intentionally tactical simulation
            graphics — not fake geographical terrain.
            ================================================= */}

        <path
          d="
            M -20 480
            C 120 420, 190 470, 310 430
            C 430 390, 520 445, 650 405
            C 760 372, 850 405, 1030 330
            L 1030 620
            L -20 620
            Z
          "
          fill="rgba(33,55,48,0.10)"
        />

        <path
          d="
            M -30 505
            C 130 445, 210 495, 320 452
            C 445 410, 535 465, 665 425
            C 790 385, 885 432, 1030 360
          "
          fill="none"
          stroke="rgba(89,217,154,0.055)"
          strokeWidth="1"
        />

        <path
          d="
            M -30 530
            C 150 474, 235 520, 350 478
            C 455 440, 570 490, 690 452
            C 810 413, 900 458, 1030 405
          "
          fill="none"
          stroke="rgba(89,217,154,0.035)"
          strokeWidth="1"
        />

        {/* Tactical sector */}

        <path
          d="M 74 105 L 315 105 L 350 245 L 88 268 Z"
          fill="rgba(90,169,255,0.018)"
          stroke="rgba(90,169,255,0.08)"
          strokeWidth="1"
          strokeDasharray="5 6"
        />

        <text
          x="96"
          y="128"
          fill="rgba(90,169,255,0.22)"
          fontFamily="monospace"
          fontSize="8"
          letterSpacing="1.4"
        >
          SIM AIRSPACE A-01
        </text>

        {/* =================================================
            Cardinal reference
            ================================================= */}

        <g
          transform="translate(56 77)"
        >
          <circle
            r="27"
            fill="rgba(3,4,5,0.72)"
            stroke="rgba(255,255,255,0.08)"
          />

          <line
            x1="0"
            y1="-18"
            x2="0"
            y2="18"
            stroke="rgba(255,255,255,0.20)"
          />

          <line
            x1="-18"
            y1="0"
            x2="18"
            y2="0"
            stroke="rgba(255,255,255,0.12)"
          />

          <path
            d="M 0 -20 L 4 -10 L 0 -13 L -4 -10 Z"
            fill="#F6B23C"
          />

          <text
            x="0"
            y="-29"
            textAnchor="middle"
            fill="#F6B23C"
            fontFamily="monospace"
            fontSize="8"
            fontWeight="700"
          >
            N
          </text>
        </g>

        {/* =================================================
            Leader safety geometry
            ================================================= */}

        {showSafety ? (
          <>
            {/* Desired shadow distance */}

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
              stroke="rgba(246,178,60,0.26)"
              strokeWidth="1.4"
              strokeDasharray="8 7"
            />

            {/* Protected radius */}

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
              stroke="rgba(255,90,99,0.42)"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />

            <text
              x={
                leaderPoint.x +
                minimumRadius +
                7
              }
              y={
                leaderPoint.y
              }
              fill="rgba(255,90,99,0.56)"
              fontFamily="monospace"
              fontSize="7.5"
            >
              SAFETY FLOOR
            </text>
          </>
        ) : null}

        {/* =================================================
            Historical tracks
            ================================================= */}

        {showTrails &&
        snapshot.leaderTrail.length >
          1 ? (
          <polyline
            points={polylinePoints(
              snapshot.leaderTrail,
              project,
            )}
            fill="none"
            stroke="rgba(246,178,60,0.52)"
            strokeWidth="2"
          />
        ) : null}

        {showTrails &&
        snapshot.followerTrail.length >
          1 ? (
          <polyline
            points={polylinePoints(
              snapshot.followerTrail,
              project,
            )}
            fill="none"
            stroke="rgba(90,169,255,0.54)"
            strokeWidth="2"
          />
        ) : null}

        {/* =================================================
            Leader / follower relationship
            ================================================= */}

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
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />

        <g
          transform={`translate(${(
            leaderPoint.x +
            followerPoint.x
          ) /
          2} ${(
            leaderPoint.y +
            followerPoint.y
          ) /
          2})`}
        >
          <rect
            x="-37"
            y="-10"
            width="74"
            height="20"
            rx="4"
            fill="rgba(3,4,5,0.90)"
            stroke="rgba(255,255,255,0.08)"
          />

          <text
            x="0"
            y="3"
            textAnchor="middle"
            fill="rgba(255,255,255,0.58)"
            fontFamily="monospace"
            fontSize="8"
          >
            {formatDistance(
              snapshot.distanceMeters,
            )}
          </text>
        </g>

        {/* =================================================
            Heading vectors
            ================================================= */}

        <line
          x1={
            leaderPoint.x
          }
          y1={
            leaderPoint.y
          }
          x2={
            leaderHeadingPoint.x
          }
          y2={
            leaderHeadingPoint.y
          }
          stroke="rgba(246,178,60,0.26)"
          strokeWidth="1.3"
          strokeDasharray="2 5"
        />

        <line
          x1={
            followerPoint.x
          }
          y1={
            followerPoint.y
          }
          x2={
            followerHeadingPoint.x
          }
          y2={
            followerHeadingPoint.y
          }
          stroke="rgba(90,169,255,0.28)"
          strokeWidth="1.3"
          strokeDasharray="2 5"
        />

        {/* =================================================
            Baseline prediction
            ================================================= */}

        {showBaseline &&
        snapshot.baselinePath.length >
          0 ? (
          <>
            <polyline
              points={polylinePoints(
                [
                  snapshot.leader,
                  ...snapshot.baselinePath,
                ],
                project,
              )}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.6"
              strokeDasharray="4 7"
            />

            {snapshot.baselinePath.map(
              (
                point,
                index,
              ) => {
                const projected =
                  project(
                    point,
                  );

                return (
                  <circle
                    key={`baseline-${index}`}
                    cx={
                      projected.x
                    }
                    cy={
                      projected.y
                    }
                    r="2.6"
                    fill="rgba(255,255,255,0.58)"
                  />
                );
              },
            )}
          </>
        ) : null}

        {/* =================================================
            ML prediction
            ================================================= */}

        {showMl &&
        snapshot.mlPath.length >
          0 ? (
          <>
            <polyline
              points={polylinePoints(
                [
                  snapshot.leader,
                  ...snapshot.mlPath,
                ],
                project,
              )}
              fill="none"
              stroke="#59D99A"
              strokeOpacity="0.90"
              strokeWidth="2.2"
              strokeDasharray="9 5"
              filter="url(#ml-glow)"
            />

            {snapshot.mlPath.map(
              (
                point,
                index,
              ) => {
                const projected =
                  project(
                    point,
                  );

                return (
                  <circle
                    key={`ml-${index}`}
                    cx={
                      projected.x
                    }
                    cy={
                      projected.y
                    }
                    r={
                      index ===
                      snapshot.mlPath.length -
                        1
                        ? 4
                        : 2.8
                    }
                    fill="#59D99A"
                    fillOpacity={
                      index ===
                      snapshot.mlPath.length -
                        1
                        ? 0.94
                        : 0.66
                    }
                  />
                );
              },
            )}
          </>
        ) : null}

        {/* =================================================
            Predicted terminal position
            ================================================= */}

        <g
          transform={`translate(${predictedTerminalPoint.x} ${predictedTerminalPoint.y})`}
        >
          <circle
            r="12"
            fill="none"
            stroke={
              snapshot.predictorMode ===
              "ml"
                ? "#59D99A"
                : "rgba(255,255,255,0.62)"
            }
            strokeWidth="1.3"
            strokeDasharray="3 4"
          />

          <circle
            r="3"
            fill={
              snapshot.predictorMode ===
              "ml"
                ? "#59D99A"
                : "rgba(255,255,255,0.72)"
            }
          />
        </g>

        {/* =================================================
            Guidance corridor
            ================================================= */}

        {snapshot.mode !==
          "IDLE" ? (
          <>
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
              stroke="rgba(90,169,255,0.05)"
              strokeWidth="18"
            />

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
              stroke="rgba(90,169,255,0.48)"
              strokeWidth="1.7"
              strokeDasharray="7 5"
            />
          </>
        ) : null}

        {/* Guidance target */}

        {snapshot.mode !==
          "IDLE" ? (
          <g
            transform={`translate(${guidancePoint.x} ${guidancePoint.y})`}
          >
            <circle
              r="13"
              fill="rgba(90,169,255,0.07)"
              stroke="#5AA9FF"
              strokeOpacity="0.64"
            />

            <circle
              r="5"
              fill="rgba(90,169,255,0.20)"
              stroke="#5AA9FF"
            />

            <line
              x1="-18"
              y1="0"
              x2="18"
              y2="0"
              stroke="#5AA9FF"
              strokeOpacity="0.7"
            />

            <line
              x1="0"
              y1="-18"
              x2="0"
              y2="18"
              stroke="#5AA9FF"
              strokeOpacity="0.7"
            />

            <text
              x="21"
              y="-9"
              fill="rgba(90,169,255,0.72)"
              fontFamily="monospace"
              fontSize="7.5"
            >
              GUIDANCE TARGET
            </text>
          </g>
        ) : null}

        {/* =================================================
            Home
            ================================================= */}

        <g
          transform={`translate(${homePoint.x} ${homePoint.y})`}
        >
          <circle
            r="8"
            fill="rgba(89,217,154,0.14)"
            stroke="#59D99A"
            strokeWidth="1"
          />

          <circle
            r="3"
            fill="#59D99A"
          />

          <text
            x="13"
            y="3"
            fill="rgba(89,217,154,0.70)"
            fontFamily="monospace"
            fontSize="8"
          >
            HOME
          </text>
        </g>

        {/* =================================================
            Aircraft markers
            ================================================= */}

        <g
          filter="url(#leader-glow)"
        >
          <AircraftMarker
            aircraft={
              snapshot.leader
            }
            project={
              project
            }
            type="leader"
          />
        </g>

        <AircraftMarker
          aircraft={
            snapshot.follower
          }
          project={
            project
          }
          type="follower"
        />

        {/* =================================================
            Center reference crosshair
            ================================================= */}

        <g
          opacity="0.14"
        >
          <line
            x1="487"
            y1="300"
            x2="513"
            y2="300"
            stroke="white"
          />

          <line
            x1="500"
            y1="287"
            x2="500"
            y2="313"
            stroke="white"
          />
        </g>

        {/* =================================================
            Evidence tag
            ================================================= */}

        <g
          transform="translate(813 64)"
        >
          <rect
            width="150"
            height="43"
            rx="5"
            fill="rgba(3,4,5,0.90)"
            stroke={evidenceColor}
            strokeOpacity="0.32"
          />

          <text
            x="12"
            y="16"
            fill="rgba(255,255,255,0.38)"
            fontFamily="monospace"
            fontSize="7.5"
          >
            PREDICTION EVIDENCE
          </text>

          <text
            x="12"
            y="31"
            fill={evidenceColor}
            fontFamily="monospace"
            fontSize="10"
            fontWeight="700"
          >
            {evidenceLabel}
          </text>
        </g>
      </svg>

      {/* ===================================================
          Top-left mission HUD
          =================================================== */}

      <div className="absolute left-3 top-3 z-20 min-w-[210px] overflow-hidden rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.90)] backdrop-blur">
        <div className="border-b border-white/[0.07] px-3 py-2">
          <div className="flex items-center gap-2">
            <Crosshair
              size={12}
              className="text-[#F6B23C]"
            />

            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.055em] text-[#F6B23C]">
              Intercept Tactical Picture
            </span>
          </div>

          <div className="mt-1 text-[9px] text-white/34">
            SIM AIRSPACE · LOCAL ENU
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="border-r border-white/[0.07] px-3 py-2">
            <div className="font-mono text-[8px] uppercase text-white/30">
              Mode
            </div>

            <div className="mt-1 font-mono text-[10px] font-semibold text-[#5AA9FF]">
              {
                snapshot.mode
              }
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="font-mono text-[8px] uppercase text-white/30">
              Predictor
            </div>

            <div className="mt-1 font-mono text-[10px] font-semibold text-[#59D99A]">
              {snapshot.predictorMode ===
              "ml"
                ? "ML"
                : "BASELINE"}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          Map tools
          =================================================== */}

      <div className="absolute right-3 top-3 z-30 flex flex-col gap-1.5">
        <MapControlButton
          label="Zoom in"
          onClick={
            zoomIn
          }
        >
          <Plus
            size={14}
          />
        </MapControlButton>

        <MapControlButton
          label="Zoom out"
          onClick={
            zoomOut
          }
        >
          <Minus
            size={14}
          />
        </MapControlButton>

        <MapControlButton
          label={`Camera mode: ${cameraMode}`}
          onClick={
            cycleCameraMode
          }
        >
          <LocateFixed
            size={14}
          />
        </MapControlButton>

        <MapControlButton
          label="Reset tactical view"
          onClick={
            resetView
          }
        >
          <Target
            size={14}
          />
        </MapControlButton>
      </div>

      {/* ===================================================
          Layer controls
          =================================================== */}

      <div className="absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.88)] p-1.5 backdrop-blur lg:flex">
        <LayerButton
          label="Tracks"
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

        <LayerButton
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

        <LayerButton
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

        <LayerButton
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

      {/* ===================================================
          Bottom mission telemetry
          =================================================== */}

      <div className="absolute bottom-3 left-1/2 z-20 grid w-[min(760px,calc(100%-24px))] -translate-x-1/2 grid-cols-2 overflow-hidden rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.92)] backdrop-blur sm:grid-cols-4">
        <div className="border-r border-white/[0.07] px-3 py-2">
          <div className="font-mono text-[8px] uppercase text-white/28">
            Separation
          </div>

          <div
            className={[
              "mt-1 font-mono text-[11px] font-semibold",

              snapshot.separationSafe
                ? "text-[#59D99A]"
                : "text-[#FF5A63]",
            ].join(" ")}
          >
            {formatDistance(
              snapshot.distanceMeters,
            )}
          </div>
        </div>

        <div className="border-r border-white/[0.07] px-3 py-2">
          <div className="font-mono text-[8px] uppercase text-white/28">
            Closing
          </div>

          <div
            className={[
              "mt-1 font-mono text-[11px] font-semibold",

              snapshot.closingRateMps >
              0
                ? "text-[#5AA9FF]"
                : "text-[#F6B23C]",
            ].join(" ")}
          >
            {formatSignedRate(
              snapshot.closingRateMps,
            )}
          </div>
        </div>

        <div className="border-r border-white/[0.07] px-3 py-2">
          <div className="font-mono text-[8px] uppercase text-white/28">
            AI Confidence
          </div>

          <div className="mt-1 font-mono text-[11px] font-semibold text-[#59D99A]">
            {snapshot.ai.ready
              ? `${Math.round(
                  snapshot.ai.confidence *
                    100,
                )}%`
              : "WARMING"}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="font-mono text-[8px] uppercase text-white/28">
            Safety Gate
          </div>

          <div
            className={[
              "mt-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold",

              snapshot.separationSafe
                ? "text-[#59D99A]"
                : "text-[#FF5A63]",
            ].join(" ")}
          >
            <ShieldCheck
              size={11}
            />

            {snapshot.separationSafe
              ? "PASS"
              : "RECOVERY"}
          </div>
        </div>
      </div>

      {/* ===================================================
          Left-bottom legend
          =================================================== */}

      <div className="absolute bottom-[72px] left-3 z-20 hidden rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.88)] px-3 py-2 backdrop-blur lg:block">
        <div className="flex items-center gap-2 font-mono text-[8px] uppercase text-white/28">
          <Route
            size={10}
          />

          Tactical Layers
        </div>

        <div className="mt-2 grid gap-1.5 font-mono text-[8px] text-white/42">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-4 rounded-full bg-[#F6B23C]" />

            Leader trail
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-4 rounded-full bg-[#5AA9FF]" />

            Follower trail
          </div>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-4 rounded-full bg-[#59D99A]" />

            ML prediction
          </div>

          <div className="flex items-center gap-2">
            <span className="h-px w-4 border-t border-dashed border-white/50" />

            Baseline
          </div>
        </div>
      </div>

      {/* ===================================================
          Camera indicator
          =================================================== */}

      <div className="absolute bottom-[72px] right-3 z-20 rounded-[5px] border border-white/[0.08] bg-[rgba(3,4,5,0.88)] px-3 py-2 text-right backdrop-blur">
        <div className="font-mono text-[8px] uppercase text-white/28">
          Tactical Camera
        </div>

        <div className="mt-1 font-mono text-[9px] font-semibold uppercase text-[#5AA9FF]">
          {cameraMode ===
          "auto"
            ? "TRACK BOTH"
            : cameraMode ===
                "leader"
              ? "FOLLOW LEADER"
              : "FOLLOW FOLLOWER"}
        </div>

        <div className="mt-1 font-mono text-[8px] text-white/28">
          Zoom{" "}
          {Math.round(
            zoom *
              100,
          )}
          %
        </div>
      </div>
    </div>
  );
}