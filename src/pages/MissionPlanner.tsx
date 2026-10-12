import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  Battery,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  MapPinned,
  Navigation,
  Plus,
  Route,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  MissionPlanningMap,
} from "../components/mission/MissionPlanningMap";

import {
  geofenceZone,
  restrictedZones,
} from "../data/worldMap";

import {
  analyzeMission,
  createDefaultWaypoint,
  formatDistance,
  formatTime,
  type MissionWaypoint,
  type WaypointAction,
} from "../utils/missionAnalytics";

/* =========================================================
   Types
   ========================================================= */

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

type MissionMetric = {
  label: string;
  value: string | number;
  unit?: string;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
};

/* =========================================================
   Initial Mission
   ========================================================= */

const initialWaypoints: MissionWaypoint[] = [
  {
    ...createDefaultWaypoint(
      23.0228,
      72.5717,
      1,
    ),
    name: "WP-1",
    altitude: 55,
    speed: 6,
    action: "scan",
  },

  {
    ...createDefaultWaypoint(
      23.0262,
      72.5762,
      2,
    ),
    name: "WP-2",
    altitude: 65,
    speed: 6,
    action: "photo",
  },

  {
    ...createDefaultWaypoint(
      23.0301,
      72.5812,
      3,
    ),
    name: "WP-3",
    altitude: 60,
    speed: 5,
    holdSeconds: 8,
    action: "hover",
  },
];

/* =========================================================
   Waypoint Actions
   ========================================================= */

const actionOptions: {
  value: WaypointAction;
  label: string;
}[] = [
  {
    value: "none",
    label: "No Action",
  },

  {
    value: "scan",
    label: "Area Scan",
  },

  {
    value: "photo",
    label: "Photo",
  },

  {
    value: "video",
    label: "Video",
  },

  {
    value: "thermal-scan",
    label: "Thermal Scan",
  },

  {
    value: "hover",
    label: "Hover",
  },

  {
    value: "loiter",
    label: "Loiter",
  },

  {
    value: "perimeter-scan",
    label: "Perimeter",
  },

  {
    value: "search-grid",
    label: "Search Grid",
  },

  {
    value: "inspect-target",
    label: "Inspect",
  },

  {
    value: "speaker-alert",
    label: "Speaker Alert",
  },

  {
    value: "spotlight",
    label: "Spotlight",
  },

  {
    value: "payload-check",
    label: "Payload Check",
  },

  {
    value: "return-check",
    label: "Return Check",
  },

  {
    value: "emergency-mark",
    label: "Emergency Mark",
  },
];

/* =========================================================
   MissionNexus tones
   ========================================================= */

const toneClass: Record<
  Tone,
  {
    text: string;
    border: string;
    bg: string;
    dot: string;
  }
> = {
  nominal: {
    text: "text-[#59D99A]",
    border:
      "border-[rgba(89,217,154,0.24)]",
    bg:
      "bg-[rgba(89,217,154,0.055)]",
    dot:
      "bg-[#59D99A]",
  },

  caution: {
    text:
      "text-[#F6B23C]",
    border:
      "border-[rgba(246,178,60,0.25)]",
    bg:
      "bg-[rgba(246,178,60,0.055)]",
    dot:
      "bg-[#F6B23C]",
  },

  critical: {
    text:
      "text-[#FF5A63]",
    border:
      "border-[rgba(255,90,99,0.26)]",
    bg:
      "bg-[rgba(255,90,99,0.055)]",
    dot:
      "bg-[#FF5A63]",
  },

  info: {
    text:
      "text-[#5AA9FF]",
    border:
      "border-[rgba(90,169,255,0.24)]",
    bg:
      "bg-[rgba(90,169,255,0.055)]",
    dot:
      "bg-[#5AA9FF]",
  },

  muted: {
    text:
      "text-white/42",
    border:
      "border-white/[0.08]",
    bg:
      "bg-white/[0.015]",
    dot:
      "bg-white/34",
  },
};

/* =========================================================
   Helpers
   ========================================================= */

function getBatteryTone(
  value: number,
): Tone {
  if (value >= 70) {
    return "critical";
  }

  if (value >= 45) {
    return "caution";
  }

  return "nominal";
}

function actionLabel(
  action: WaypointAction,
) {
  return (
    actionOptions.find(
      (item) =>
        item.value === action,
    )?.label ??
    action
  );
}

function numberInputClass() {
  return [
    "h-[32px] w-full",

    "rounded-[4px]",

    "border border-white/[0.09]",

    "bg-[#030405]",

    "px-2",

    "font-mono text-[11px] text-white/82",

    "outline-none",

    "transition-colors duration-150",

    "focus:border-[rgba(246,178,60,0.5)]",
  ].join(" ");
}

function selectInputClass() {
  return numberInputClass();
}

/* =========================================================
   Field label
   ========================================================= */

function FieldLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-white/38">
      {children}
    </label>
  );
}

/* =========================================================
   Mission Status
   ========================================================= */

function MissionStatus({
  ready,
}: {
  ready: boolean;
}) {
  return (
    <div
      className={[
        "flex h-[30px] items-center gap-2",

        "rounded-[4px] border px-2.5",

        "font-mono text-[10px] font-semibold uppercase tracking-[0.07em]",

        ready
          ? "border-[rgba(89,217,154,0.25)] bg-[rgba(89,217,154,0.045)] text-[#59D99A]"
          : "border-[rgba(246,178,60,0.25)] bg-[rgba(246,178,60,0.045)] text-[#F6B23C]",
      ].join(" ")}
    >
      {ready ? (
        <ShieldCheck
          size={12}
          strokeWidth={1.7}
        />
      ) : (
        <AlertTriangle
          size={12}
          strokeWidth={1.7}
        />
      )}

      {ready
        ? "Mission Ready"
        : "Review Required"}
    </div>
  );
}

/* =========================================================
   Compact metric strip
   ========================================================= */

function MissionMetricCell({
  item,
}: {
  item: MissionMetric;
}) {
  const Icon =
    item.icon;

  const tone =
    toneClass[
      item.tone
    ];

  return (
    <div
      title={item.helper}
      className={[
        "flex min-w-0 items-center justify-between gap-2",

        "border-r border-white/[0.07]",

        "px-3",

        "last:border-r-0",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.075em] text-white/38">
          {item.label}
        </div>

        <div
          className={[
            "mt-1 flex min-w-0 items-baseline gap-1",

            tone.text,
          ].join(" ")}
        >
          <span className="truncate font-mono text-[16px] font-semibold leading-none">
            {item.value}
          </span>

          {item.unit ? (
            <span className="font-mono text-[9px] font-semibold uppercase text-white/42">
              {item.unit}
            </span>
          ) : null}
        </div>
      </div>

      <Icon
        size={15}
        strokeWidth={1.55}
        className={[
          "shrink-0",
          tone.text,
        ].join(" ")}
      />
    </div>
  );
}

/* =========================================================
   Waypoint Stack
   ========================================================= */

function WaypointStack({
  waypoints,
  selectedWaypointId,
  onSelect,
}: {
  waypoints: MissionWaypoint[];

  selectedWaypointId:
    string | null;

  onSelect: (
    waypointId: string,
  ) => void;
}) {
  if (
    waypoints.length === 0
  ) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-[11px] leading-[1.55] text-white/40">
        No route points yet.
        Click the planning map or
        use Add Waypoint.
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      {waypoints.map(
        (
          waypoint,
          index,
        ) => {
          const selected =
            selectedWaypointId ===
            waypoint.id;

          return (
            <button
              key={
                waypoint.id
              }
              type="button"
              onClick={() =>
                onSelect(
                  waypoint.id,
                )
              }
              className={[
                "grid min-h-[54px] w-full grid-cols-[28px_minmax(0,1fr)_auto]",

                "items-center gap-2",

                "rounded-[4px] border",

                "px-2.5 py-1.5",

                "text-left",

                "transition-colors duration-150",

                selected
                  ? "border-[rgba(246,178,60,0.34)] bg-[rgba(246,178,60,0.065)]"
                  : "border-white/[0.07] bg-white/[0.012] hover:border-white/[0.14] hover:bg-white/[0.025]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center",

                  "rounded-full border",

                  "font-mono text-[10px] font-semibold",

                  selected
                    ? "border-[rgba(246,178,60,0.5)] text-[#F6B23C]"
                    : "border-white/[0.12] text-white/48",
                ].join(" ")}
              >
                {String(
                  index + 1,
                ).padStart(
                  2,
                  "0",
                )}
              </span>

              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={[
                      "truncate text-[12px] font-medium",

                      selected
                        ? "text-[#F6B23C]"
                        : "text-white/86",
                    ].join(" ")}
                  >
                    {
                      waypoint.name
                    }
                  </span>

                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.05em] text-white/34">
                    {actionLabel(
                      waypoint.action,
                    )}
                  </span>
                </span>

                <span className="mt-0.5 block truncate font-mono text-[9px] text-white/36">
                  {waypoint.lat.toFixed(
                    5,
                  )}
                  ,{" "}
                  {waypoint.lng.toFixed(
                    5,
                  )}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-[10px] font-semibold text-white/68">
                  {
                    waypoint.altitude
                  }
                  m
                </span>

                <span className="mt-0.5 block font-mono text-[9px] text-white/34">
                  {
                    waypoint.speed
                  }
                  m/s
                </span>
              </span>
            </button>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   Selected waypoint editor
   ========================================================= */

function WaypointEditor({
  selectedWaypoint,
  onUpdate,
  onDelete,
}: {
  selectedWaypoint?:
    MissionWaypoint;

  onUpdate: (
    waypointId: string,
    updates: Partial<MissionWaypoint>,
  ) => void;

  onDelete: (
    waypointId: string,
  ) => void;
}) {
  if (
    !selectedWaypoint
  ) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-[11px] leading-[1.55] text-white/40">
        Select a waypoint from
        the stack or click the
        map to create one.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {/* Name */}

      <div>
        <FieldLabel>
          Name
        </FieldLabel>

        <input
          value={
            selectedWaypoint.name
          }
          onChange={(
            event,
          ) =>
            onUpdate(
              selectedWaypoint.id,
              {
                name:
                  event.target
                    .value,
              },
            )
          }
          className={numberInputClass()}
        />
      </div>

      {/* Coordinates */}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>
            Latitude
          </FieldLabel>

          <input
            type="number"
            value={
              selectedWaypoint.lat
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                selectedWaypoint.id,
                {
                  lat:
                    Number(
                      event
                        .target
                        .value,
                    ),
                },
              )
            }
            className={numberInputClass()}
          />
        </div>

        <div>
          <FieldLabel>
            Longitude
          </FieldLabel>

          <input
            type="number"
            value={
              selectedWaypoint.lng
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                selectedWaypoint.id,
                {
                  lng:
                    Number(
                      event
                        .target
                        .value,
                    ),
                },
              )
            }
            className={numberInputClass()}
          />
        </div>
      </div>

      {/* Flight parameters */}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>
            Altitude
          </FieldLabel>

          <input
            type="number"
            value={
              selectedWaypoint.altitude
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                selectedWaypoint.id,
                {
                  altitude:
                    Number(
                      event
                        .target
                        .value,
                    ),
                },
              )
            }
            className={numberInputClass()}
          />
        </div>

        <div>
          <FieldLabel>
            Speed
          </FieldLabel>

          <input
            type="number"
            value={
              selectedWaypoint.speed
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                selectedWaypoint.id,
                {
                  speed:
                    Number(
                      event
                        .target
                        .value,
                    ),
                },
              )
            }
            className={numberInputClass()}
          />
        </div>
      </div>

      {/* Hold / Action */}

      <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
        <div>
          <FieldLabel>
            Hold
          </FieldLabel>

          <input
            type="number"
            value={
              selectedWaypoint.holdSeconds
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                selectedWaypoint.id,
                {
                  holdSeconds:
                    Number(
                      event
                        .target
                        .value,
                    ),
                },
              )
            }
            className={numberInputClass()}
          />
        </div>

        <div>
          <FieldLabel>
            Action
          </FieldLabel>

          <select
            value={
              selectedWaypoint.action
            }
            onChange={(
              event,
            ) =>
              onUpdate(
                selectedWaypoint.id,
                {
                  action:
                    event
                      .target
                      .value as WaypointAction,
                },
              )
            }
            className={selectInputClass()}
          >
            {actionOptions.map(
              (action) => (
                <option
                  key={
                    action.value
                  }
                  value={
                    action.value
                  }
                >
                  {
                    action.label
                  }
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/* Delete */}

      <button
        type="button"
        onClick={() =>
          onDelete(
            selectedWaypoint.id,
          )
        }
        className={[
          "mt-0.5 flex h-[31px] w-full items-center justify-center gap-2",

          "rounded-[4px] border",

          "border-[rgba(255,90,99,0.25)]",

          "bg-[rgba(255,90,99,0.045)]",

          "font-mono text-[10px] font-semibold uppercase tracking-[0.06em]",

          "text-[#FF5A63]",

          "transition-colors duration-150",

          "hover:bg-[rgba(255,90,99,0.08)]",
        ].join(" ")}
      >
        <Trash2
          size={12}
          strokeWidth={1.7}
        />

        Delete Waypoint
      </button>
    </div>
  );
}

/* =========================================================
   Safety panel
   ========================================================= */

function SafetyPanel({
  analysis,
}: {
  analysis: ReturnType<
    typeof analyzeMission
  >;
}) {
  return (
    <div className="grid gap-2">
      {analysis.warnings.map(
        (
          warning,
          index,
        ) => {
          const tone: Tone =
            warning.severity ===
            "critical"
              ? "critical"
              : warning.severity ===
                  "caution"
                ? "caution"
                : "nominal";

          const style =
            toneClass[
              tone
            ];

          const Icon =
            warning.severity ===
            "critical"
              ? XCircle
              : warning.severity ===
                  "caution"
                ? AlertTriangle
                : CheckCircle2;

          return (
            <div
              key={`${warning.title}-${index}`}
              className={[
                "flex items-start gap-3",

                "rounded-[5px] border",

                "bg-[#07090d] p-3",

                style.border,
              ].join(" ")}
            >
              <div
                className={[
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center",

                  "rounded-[4px] border",

                  style.border,
                  style.bg,
                ].join(" ")}
              >
                <Icon
                  size={13}
                  strokeWidth={1.7}
                  className={
                    style.text
                  }
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[12px] font-medium text-white/88">
                    {
                      warning.title
                    }
                  </div>

                  <span
                    className={[
                      "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                      style.text,
                    ].join(" ")}
                  >
                    {
                      warning.severity
                    }
                  </span>
                </div>

                <p className="mt-1 text-[11px] leading-[1.55] text-white/42">
                  {
                    warning.message
                  }
                </p>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   Secondary section shell
   ========================================================= */

function SecondarySection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
      <div className="border-b border-white/[0.07] px-4 py-3">
        <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F6B23C]">
          {eyebrow}
        </div>

        <h2 className="mt-1 text-[15px] font-medium tracking-[-0.01em] text-white">
          {title}
        </h2>
      </div>

      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   Mission Planner
   ========================================================= */

export function MissionPlanner() {
  const [
    waypoints,
    setWaypoints,
  ] =
    useState<
      MissionWaypoint[]
    >(
      initialWaypoints,
    );

  const [
    selectedWaypointId,
    setSelectedWaypointId,
  ] =
    useState<
      string | null
    >(
      initialWaypoints[
        0
      ]?.id ??
        null,
    );

  const safetySectionRef =
    useRef<
      HTMLDivElement | null
    >(null);

  /* =======================================================
     Analysis
     ======================================================= */

  const analysis =
    useMemo(
      () =>
        analyzeMission(
          {
            waypoints,

            geofence:
              geofenceZone,

            restrictedZones,
          },
        ),
      [
        waypoints,
      ],
    );

  const selectedWaypoint =
    waypoints.find(
      (waypoint) =>
        waypoint.id ===
        selectedWaypointId,
    );

  /* =======================================================
     Metric strip
     ======================================================= */

  const missionMetrics:
    MissionMetric[] =
      [
        {
          label:
            "Waypoints",

          value:
            analysis.waypointCount,

          helper:
            "Mission route points",

          icon:
            MapPinned,

          tone:
            analysis.waypointCount >=
            2
              ? "nominal"
              : "caution",
        },

        {
          label:
            "Distance",

          value:
            (
              analysis.totalDistanceMeters /
              1000
            ).toFixed(
              2,
            ),

          unit:
            "km",

          helper:
            "Estimated route length",

          icon:
            Route,

          tone:
            "info",
        },

        {
          label:
            "Est. Time",

          value:
            Math.ceil(
              analysis.estimatedTimeSeconds /
                60,
            ),

          unit:
            "min",

          helper:
            "Planned mission duration",

          icon:
            Clock,

          tone:
            "info",
        },

        {
          label:
            "Battery",

          value:
            analysis.estimatedBatteryPercent.toFixed(
              1,
            ),

          unit:
            "%",

          helper:
            "Estimated battery usage",

          icon:
            Battery,

          tone:
            getBatteryTone(
              analysis.estimatedBatteryPercent,
            ),
        },

        {
          label:
            "Geofence",

          value:
            analysis.geofencePassed
              ? "Clear"
              : "Fail",

          helper:
            "Boundary safety validation",

          icon:
            Navigation,

          tone:
            analysis.geofencePassed
              ? "nominal"
              : "critical",
        },

        {
          label:
            "Readiness",

          value:
            analysis.missionReady
              ? "Ready"
              : "Review",

          helper:
            "Mission validation state",

          icon:
            Gauge,

          tone:
            analysis.missionReady
              ? "nominal"
              : "caution",
        },
      ];

  /* =======================================================
     Waypoint operations
     ======================================================= */

  function updateWaypoint(
    waypointId: string,
    updates: Partial<MissionWaypoint>,
  ) {
    setWaypoints(
      (
        current,
      ) =>
        current.map(
          (
            waypoint,
          ) =>
            waypoint.id ===
            waypointId
              ? {
                  ...waypoint,
                  ...updates,
                }
              : waypoint,
        ),
    );
  }

  function deleteWaypoint(
    waypointId: string,
  ) {
    setWaypoints(
      (
        current,
      ) => {
        const nextWaypoints =
          current.filter(
            (
              waypoint,
            ) =>
              waypoint.id !==
              waypointId,
          );

        if (
          selectedWaypointId ===
          waypointId
        ) {
          setSelectedWaypointId(
            nextWaypoints[
              0
            ]?.id ??
              null,
          );
        }

        return nextWaypoints.map(
          (
            waypoint,
            index,
          ) => ({
            ...waypoint,

            name:
              `WP-${index + 1}`,
          }),
        );
      },
    );
  }

  function addDefaultWaypoint() {
    const lastWaypoint =
      waypoints[
        waypoints.length -
          1
      ];

    const nextWaypoint =
      createDefaultWaypoint(
        (
          lastWaypoint?.lat ??
          23.0225
        ) +
          0.002,

        (
          lastWaypoint?.lng ??
          72.5714
        ) +
          0.002,

        waypoints.length +
          1,
      );

    setWaypoints(
      (
        current,
      ) => [
        ...current,
        nextWaypoint,
      ],
    );

    setSelectedWaypointId(
      nextWaypoint.id,
    );
  }

  function clearMission() {
    setWaypoints(
      [],
    );

    setSelectedWaypointId(
      null,
    );
  }

  function reviewSafety() {
    safetySectionRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",

        block:
          "start",
      },
    );
  }

  /* =======================================================
     Export
     ======================================================= */

  function exportMissionJson() {
    const mission = {
      name:
        "Aeronexus Mission Plan",

      version:
        1,

      createdAt:
        new Date().toISOString(),

      readiness:
        analysis.missionReady
          ? "ready"
          : "not_ready",

      analytics:
        analysis,

      waypoints,
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            mission,
            null,
            2,
          ),
        ],
        {
          type:
            "application/json",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.download =
      "aeronexus-mission-plan.json";

    anchor.click();

    URL.revokeObjectURL(
      url,
    );
  }

  return (
    <div className="bg-[#05060d] text-white">
      {/* ===================================================
          PRIMARY PLANNER VIEWPORT
          =================================================== */}

      <section className="xl:h-[calc(100vh-70px)] xl:overflow-hidden">
        <div
          className={[
            "mx-auto w-full max-w-[1600px]",

            "px-4 pb-3 pt-2",

            "sm:px-6",

            "lg:px-8",

            "xl:grid xl:h-full",

            "xl:grid-rows-[44px_64px_minmax(0,1fr)]",

            "xl:gap-2",

            "xl:px-10",

            "2xl:px-14",
          ].join(" ")}
        >
          {/* ===============================================
              Compact page header
              =============================================== */}

          <header className="flex min-w-0 items-center justify-between border-b border-white/[0.08]">
            <div className="flex min-w-0 items-center gap-3">
              <div>
                <h1 className="text-[16px] font-medium tracking-[-0.02em] text-white">
                  Mission Planner
                </h1>

                <p className="mt-0.5 hidden truncate text-[11px] text-white/42 sm:block">
                  Route planning · waypoint configuration · mission validation
                </p>
              </div>
            </div>

            <MissionStatus
              ready={
                analysis.missionReady
              }
            />
          </header>

          {/* ===============================================
              Mission metric strip
              =============================================== */}

          <section
            className={[
              "my-2 grid overflow-hidden",

              "rounded-[6px] border border-white/[0.08]",

              "bg-[#07090d]",

              "grid-cols-2",

              "md:grid-cols-3",

              "xl:my-0 xl:grid-cols-6",
            ].join(" ")}
          >
            {missionMetrics.map(
              (
                item,
              ) => (
                <MissionMetricCell
                  key={
                    item.label
                  }
                  item={
                    item
                  }
                />
              ),
            )}
          </section>

          {/* ===============================================
              Planner workspace
              =============================================== */}

          <section
            className={[
              "mt-3 grid min-h-[700px] overflow-hidden",

              "rounded-[6px] border border-white/[0.09]",

              "bg-[#020304]",

              "xl:mt-0 xl:min-h-0",

              "xl:grid-cols-[minmax(0,1fr)_390px]",

              "2xl:grid-cols-[minmax(0,1fr)_410px]",
            ].join(" ")}
          >
            {/* =============================================
                MAP
                ============================================= */}

            <div className="grid min-h-0 grid-rows-[38px_minmax(0,1fr)]">
              <div className="flex min-w-0 items-center justify-between border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Navigation
                    size={13}
                    strokeWidth={1.6}
                    className="shrink-0 text-[#5AA9FF]"
                  />

                  <span className="truncate text-[12px] font-medium text-white/86">
                    Route Planning Map
                  </span>
                </div>

                <span className="hidden font-mono text-[9px] uppercase tracking-[0.055em] text-white/36 md:block">
                  Click map to add · drag to reposition
                </span>
              </div>

              <div className="relative min-h-0">
                <MissionPlanningMap
                  waypoints={
                    waypoints
                  }
                  selectedWaypointId={
                    selectedWaypointId
                  }
                  onWaypointsChange={
                    setWaypoints
                  }
                  onSelectWaypoint={
                    setSelectedWaypointId
                  }
                />
              </div>
            </div>

            {/* =============================================
                RIGHT MISSION INSPECTOR
                ============================================= */}

            <aside
              className={[
                "grid min-h-0",

                "border-t border-white/[0.08]",

                "bg-[#07090d]",

                "xl:border-l xl:border-t-0",

                "xl:grid-rows-[52px_minmax(135px,1fr)_226px_46px]",
              ].join(" ")}
            >
              {/* Mission route summary */}

              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F6B23C]">
                    Mission Route
                  </div>

                  <div className="mt-0.5 truncate font-mono text-[9px] text-white/36">
                    {
                      analysis.waypointCount
                    }{" "}
                    WP ·{" "}
                    {formatDistance(
                      analysis.totalDistanceMeters,
                    )}{" "}
                    ·{" "}
                    {formatTime(
                      analysis.estimatedTimeSeconds,
                    )}
                  </div>
                </div>

                <span
                  className={[
                    "shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                    analysis.missionReady
                      ? "text-[#59D99A]"
                      : "text-[#F6B23C]",
                  ].join(" ")}
                >
                  {analysis.missionReady
                    ? "Ready"
                    : "Review"}
                </span>
              </div>

              {/* Waypoint stack */}

              <div className="grid min-h-0 grid-rows-[38px_minmax(0,1fr)] border-b border-white/[0.08]">
                <div className="flex items-center justify-between px-3">
                  <div>
                    <div className="text-[12px] font-medium text-white/82">
                      Waypoint Stack
                    </div>

                    <div className="font-mono text-[9px] text-white/32">
                      Mission route sequence
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-semibold text-[#5AA9FF]">
                    {
                      waypoints.length
                    }
                  </span>
                </div>

                <div className="min-h-0 overflow-y-auto px-2.5 pb-2.5">
                  <WaypointStack
                    waypoints={
                      waypoints
                    }
                    selectedWaypointId={
                      selectedWaypointId
                    }
                    onSelect={
                      setSelectedWaypointId
                    }
                  />
                </div>
              </div>

              {/* Selected waypoint */}

              <div className="min-h-0 overflow-y-auto border-b border-white/[0.08] px-3 py-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-medium text-white/82">
                      Selected Waypoint
                    </div>

                    <div className="font-mono text-[9px] text-white/32">
                      Position · flight · action
                    </div>
                  </div>

                  <span className="max-w-[120px] truncate font-mono text-[10px] font-semibold text-[#F6B23C]">
                    {selectedWaypoint?.name ??
                      "None"}
                  </span>
                </div>

                <WaypointEditor
                  selectedWaypoint={
                    selectedWaypoint
                  }
                  onUpdate={
                    updateWaypoint
                  }
                  onDelete={
                    deleteWaypoint
                  }
                />
              </div>

              {/* Important actions */}

              <div className="grid grid-cols-2 gap-2 p-2">
                <button
                  type="button"
                  onClick={
                    addDefaultWaypoint
                  }
                  className={[
                    "flex h-[30px] items-center justify-center gap-1.5",

                    "rounded-[4px] border",

                    "border-[rgba(90,169,255,0.24)]",

                    "bg-[rgba(90,169,255,0.045)]",

                    "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                    "text-[#5AA9FF]",

                    "transition-colors",

                    "hover:bg-[rgba(90,169,255,0.08)]",
                  ].join(" ")}
                >
                  <Plus
                    size={12}
                    strokeWidth={1.7}
                  />

                  Add WP
                </button>

                <button
                  type="button"
                  onClick={
                    reviewSafety
                  }
                  className={[
                    "flex h-[30px] items-center justify-center gap-1.5",

                    "rounded-[4px] border",

                    analysis.missionReady
                      ? "border-[rgba(89,217,154,0.24)] bg-[rgba(89,217,154,0.045)] text-[#59D99A]"
                      : "border-[rgba(246,178,60,0.25)] bg-[rgba(246,178,60,0.045)] text-[#F6B23C]",

                    "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",
                  ].join(" ")}
                >
                  <ShieldCheck
                    size={12}
                    strokeWidth={1.7}
                  />

                  Review Safety
                </button>
              </div>
            </aside>
          </section>
        </div>
      </section>

      {/* ===================================================
          SECONDARY FEATURES
          =================================================== */}

      <section
        ref={
          safetySectionRef
        }
        className="border-t border-white/[0.08] bg-[#05060d]"
      >
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[1.35fr_0.65fr] xl:px-10 2xl:px-14">
          {/* Safety */}

          <SecondarySection
            eyebrow="Validation"
            title="Mission Safety Analysis"
          >
            <SafetyPanel
              analysis={
                analysis
              }
            />
          </SecondarySection>

          {/* Mission file */}

          <SecondarySection
            eyebrow="Mission File"
            title="Plan Export & Management"
          >
            <div className="grid gap-4">
              {/* Summary */}

              <div className="grid grid-cols-3 overflow-hidden rounded-[5px] border border-white/[0.07] bg-[#030405]">
                <div className="border-r border-white/[0.07] px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/34">
                    Distance
                  </div>

                  <div className="mt-1 font-mono text-[11px] font-semibold text-white/72">
                    {formatDistance(
                      analysis.totalDistanceMeters,
                    )}
                  </div>
                </div>

                <div className="border-r border-white/[0.07] px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/34">
                    Time
                  </div>

                  <div className="mt-1 font-mono text-[11px] font-semibold text-white/72">
                    {formatTime(
                      analysis.estimatedTimeSeconds,
                    )}
                  </div>
                </div>

                <div className="px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/34">
                    Format
                  </div>

                  <div className="mt-1 font-mono text-[11px] font-semibold text-white/72">
                    JSON
                  </div>
                </div>
              </div>

              {/* Export */}

              <button
                type="button"
                onClick={
                  exportMissionJson
                }
                className={[
                  "flex h-[38px] items-center justify-center gap-2",

                  "rounded-[5px]",

                  "bg-[#F6B23C]",

                  "font-mono text-[10px] font-semibold uppercase tracking-[0.065em]",

                  "text-black",

                  "transition-opacity",

                  "hover:opacity-90",
                ].join(" ")}
              >
                <Download
                  size={13}
                  strokeWidth={1.8}
                />

                Export Mission JSON
              </button>

              {/* Clear */}

              <button
                type="button"
                onClick={
                  clearMission
                }
                className={[
                  "flex h-[36px] items-center justify-center gap-2",

                  "rounded-[5px] border",

                  "border-[rgba(255,90,99,0.24)]",

                  "bg-[rgba(255,90,99,0.04)]",

                  "font-mono text-[10px] font-semibold uppercase tracking-[0.065em]",

                  "text-[#FF5A63]",

                  "transition-colors",

                  "hover:bg-[rgba(255,90,99,0.08)]",
                ].join(" ")}
              >
                <Trash2
                  size={13}
                  strokeWidth={1.7}
                />

                Clear Mission
              </button>

              <div className="border-t border-white/[0.07] pt-3">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-white/38">
                    Route Mode
                  </span>

                  <span className="font-mono text-white/68">
                    Manual
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-white/38">
                    Safety Engine
                  </span>

                  <span
                    className={
                      analysis.missionReady
                        ? "font-mono text-[#59D99A]"
                        : "font-mono text-[#F6B23C]"
                    }
                  >
                    {analysis.missionReady
                      ? "Clear"
                      : "Review"}
                  </span>
                </div>
              </div>
            </div>
          </SecondarySection>
        </div>
      </section>
    </div>
  );
}