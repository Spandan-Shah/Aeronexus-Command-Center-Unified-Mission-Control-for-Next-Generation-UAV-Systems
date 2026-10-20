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
  label:
    string;

  value:
    string | number;

  unit?:
    string;

  helper:
    string;

  icon:
    LucideIcon;

  tone:
    Tone;
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

    name:
      "WP-1",

    altitude:
      55,

    speed:
      6,

    action:
      "scan",
  },

  {
    ...createDefaultWaypoint(
      23.0262,
      72.5762,
      2,
    ),

    name:
      "WP-2",

    altitude:
      65,

    speed:
      6,

    action:
      "photo",
  },

  {
    ...createDefaultWaypoint(
      23.0301,
      72.5812,
      3,
    ),

    name:
      "WP-3",

    altitude:
      60,

    speed:
      5,

    holdSeconds:
      8,

    action:
      "hover",
  },
];


/* =========================================================
   Waypoint Actions
   ========================================================= */


const actionOptions: {
  value:
    WaypointAction;

  label:
    string;
}[] = [
  {
    value:
      "none",

    label:
      "No Action",
  },

  {
    value:
      "scan",

    label:
      "Area Scan",
  },

  {
    value:
      "photo",

    label:
      "Photo",
  },

  {
    value:
      "video",

    label:
      "Video",
  },

  {
    value:
      "thermal-scan",

    label:
      "Thermal Scan",
  },

  {
    value:
      "hover",

    label:
      "Hover",
  },

  {
    value:
      "loiter",

    label:
      "Loiter",
  },

  {
    value:
      "perimeter-scan",

    label:
      "Perimeter",
  },

  {
    value:
      "search-grid",

    label:
      "Search Grid",
  },

  {
    value:
      "inspect-target",

    label:
      "Inspect",
  },

  {
    value:
      "speaker-alert",

    label:
      "Speaker Alert",
  },

  {
    value:
      "spotlight",

    label:
      "Spotlight",
  },

  {
    value:
      "payload-check",

    label:
      "Payload Check",
  },

  {
    value:
      "return-check",

    label:
      "Return Check",
  },

  {
    value:
      "emergency-mark",

    label:
      "Emergency Mark",
  },
];


/* =========================================================
   MissionNexus Operational Tones
   ========================================================= */


const toneClass: Record<
  Tone,
  {
    text:
      string;

    border:
      string;

    bg:
      string;
  }
> = {
  nominal: {
    text:
      "text-[#337D5C]",

    border:
      "border-[rgba(51,125,92,0.24)]",

    bg:
      "bg-[rgba(51,125,92,0.075)]",
  },

  caution: {
    text:
      "text-[#A97324]",

    border:
      "border-[rgba(169,115,36,0.26)]",

    bg:
      "bg-[rgba(169,115,36,0.075)]",
  },

  critical: {
    text:
      "text-[#BD4F59]",

    border:
      "border-[rgba(189,79,89,0.26)]",

    bg:
      "bg-[rgba(189,79,89,0.075)]",
  },

  info: {
    text:
      "text-[#316F9F]",

    border:
      "border-[rgba(49,111,159,0.24)]",

    bg:
      "bg-[rgba(49,111,159,0.075)]",
  },

  muted: {
    text:
      "text-[#687482]",

    border:
      "border-[#D7DDE4]",

    bg:
      "bg-[#F4F6F8]",
  },
};


/* =========================================================
   Helpers
   ========================================================= */


function getBatteryTone(
  value:
    number,
): Tone {
  if (
    value >=
    70
  ) {
    return "critical";
  }

  if (
    value >=
    45
  ) {
    return "caution";
  }

  return "nominal";
}


function actionLabel(
  action:
    WaypointAction,
) {
  return (
    actionOptions.find(
      (
        item,
      ) =>
        item.value ===
        action,
    )?.label ??
    action
  );
}


function inputClass() {
  return [
    "h-[40px] w-full",

    "rounded-[6px]",

    "border border-[#D4DAE1]",

    "bg-white",

    "px-3",

    "font-mono text-[14px] text-[#151A21]",

    "outline-none",

    "transition-[border-color,box-shadow,background-color] duration-150",

    "hover:border-[#BCC5CF]",

    "focus:border-[#B78939]",

    "focus:bg-white",

    "focus:shadow-[0_0_0_3px_rgba(183,137,57,0.10)]",
  ].join(" ");
}


/* =========================================================
   Field Label
   ========================================================= */


function FieldLabel({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.055em] text-[#65717E]">
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
  ready:
    boolean;
}) {
  return (
    <div
      className={[
        "flex h-[38px] items-center gap-2",

        "rounded-[6px] border px-3.5",

        "text-[13px] font-semibold",

        ready
          ? "border-[rgba(51,125,92,0.26)] bg-[rgba(51,125,92,0.07)] text-[#337D5C]"
          : "border-[rgba(169,115,36,0.28)] bg-[rgba(169,115,36,0.07)] text-[#A97324]",
      ].join(" ")}
    >
      {ready ? (
        <ShieldCheck
          size={15}
          strokeWidth={1.7}
        />
      ) : (
        <AlertTriangle
          size={15}
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
   Mission Metric Cell
   ========================================================= */


function MissionMetricCell({
  item,
}: {
  item:
    MissionMetric;
}) {
  const Icon =
    item.icon;

  const tone =
    toneClass[
      item.tone
    ];

  return (
    <div
      title={
        item.helper
      }
      className={[
        "flex min-w-0 items-center justify-between gap-3",

        "border-r border-[#E4E8ED]",

        "px-4 py-3.5",

        "last:border-r-0",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold uppercase tracking-[0.05em] text-[#727D89]">
          {item.label}
        </div>

        <div className="mt-1.5 flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-mono text-[20px] font-semibold leading-none tracking-[-0.03em] text-[#151A21]">
            {item.value}
          </span>

          {item.unit ? (
            <span className="font-mono text-[12px] font-medium text-[#737E8B]">
              {item.unit}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center",

          "rounded-[7px] border",

          tone.border,
          tone.bg,
          tone.text,
        ].join(" ")}
      >
        <Icon
          size={17}
          strokeWidth={1.7}
        />
      </div>
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
  waypoints:
    MissionWaypoint[];

  selectedWaypointId:
    string | null;

  onSelect: (
    waypointId:
      string,
  ) => void;
}) {
  if (
    waypoints.length ===
    0
  ) {
    return (
      <div className="flex h-full items-center justify-center px-5 text-center text-[14px] leading-[1.6] text-[#737E8B]">
        No route points yet.
        Click the planning map
        or use Add Waypoint.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
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
                "grid min-h-[72px] w-full",

                "grid-cols-[34px_minmax(0,1fr)_auto]",

                "items-center gap-3",

                "rounded-[7px] border",

                "px-3 py-2.5",

                "text-left",

                "transition-[background-color,border-color,box-shadow] duration-150",

                selected
                  ? "border-[rgba(183,137,57,0.38)] bg-[#FFF8EC] shadow-[0_3px_12px_rgba(80,60,20,0.06)]"
                  : "border-[#E0E5EA] bg-white hover:border-[#C8D0D9] hover:bg-[#F8FAFB]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center",

                  "rounded-full border",

                  "font-mono text-[12px] font-semibold",

                  selected
                    ? "border-[rgba(183,137,57,0.50)] bg-white text-[#9A6B21]"
                    : "border-[#CED5DC] bg-[#F7F9FA] text-[#66717D]",
                ].join(" ")}
              >
                {String(
                  index +
                    1,
                ).padStart(
                  2,
                  "0",
                )}
              </span>

              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={[
                      "truncate text-[14px] font-semibold",

                      selected
                        ? "text-[#8D6427]"
                        : "text-[#151A21]",
                    ].join(" ")}
                  >
                    {waypoint.name}
                  </span>

                  <span className="truncate text-[12px] font-medium uppercase tracking-[0.03em] text-[#77828E]">
                    {actionLabel(
                      waypoint.action,
                    )}
                  </span>
                </span>

                <span className="mt-1 block truncate font-mono text-[12px] text-[#6E7986]">
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
                <span className="block font-mono text-[13px] font-semibold text-[#38424D]">
                  {waypoint.altitude}
                  m
                </span>

                <span className="mt-1 block font-mono text-[12px] text-[#7A8590]">
                  {waypoint.speed}
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
   Waypoint Editor
   ========================================================= */


function WaypointEditor({
  selectedWaypoint,
  onUpdate,
  onDelete,
}: {
  selectedWaypoint?:
    MissionWaypoint;

  onUpdate: (
    waypointId:
      string,

    updates:
      Partial<MissionWaypoint>,
  ) => void;

  onDelete: (
    waypointId:
      string,
  ) => void;
}) {
  if (
    !selectedWaypoint
  ) {
    return (
      <div className="flex h-full items-center justify-center px-5 text-center text-[14px] leading-[1.6] text-[#737E8B]">
        Select a waypoint from
        the stack or click the
        map to create one.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
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
                  event.target.value,
              },
            )
          }
          className={
            inputClass()
          }
        />
      </div>

      {/* Coordinates */}

      <div className="grid grid-cols-2 gap-3">
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
                      event.target.value,
                    ),
                },
              )
            }
            className={
              inputClass()
            }
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
                      event.target.value,
                    ),
                },
              )
            }
            className={
              inputClass()
            }
          />
        </div>
      </div>

      {/* Flight */}

      <div className="grid grid-cols-2 gap-3">
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
                      event.target.value,
                    ),
                },
              )
            }
            className={
              inputClass()
            }
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
                      event.target.value,
                    ),
                },
              )
            }
            className={
              inputClass()
            }
          />
        </div>
      </div>

      {/* Hold / Action */}

      <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
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
                      event.target.value,
                    ),
                },
              )
            }
            className={
              inputClass()
            }
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
                    event.target.value as WaypointAction,
                },
              )
            }
            className={
              inputClass()
            }
          >
            {actionOptions.map(
              (
                action,
              ) => (
                <option
                  key={
                    action.value
                  }
                  value={
                    action.value
                  }
                >
                  {action.label}
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
          "mt-1 flex h-[40px] w-full items-center justify-center gap-2",

          "rounded-[6px] border",

          "border-[rgba(189,79,89,0.26)]",

          "bg-[rgba(189,79,89,0.06)]",

          "text-[13px] font-semibold",

          "text-[#BD4F59]",

          "transition-[background-color,border-color] duration-150",

          "hover:border-[rgba(189,79,89,0.36)]",

          "hover:bg-[rgba(189,79,89,0.10)]",
        ].join(" ")}
      >
        <Trash2
          size={15}
          strokeWidth={1.7}
        />

        Delete Waypoint
      </button>
    </div>
  );
}


/* =========================================================
   Safety Panel
   ========================================================= */


function SafetyPanel({
  analysis,
}: {
  analysis:
    ReturnType<
      typeof analyzeMission
    >;
}) {
  return (
    <div className="grid gap-2.5">
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

                "rounded-[7px] border",

                "bg-white",

                "p-3.5",

                "shadow-[0_4px_14px_rgba(25,35,45,0.04)]",

                style.border,
              ].join(" ")}
            >
              <div
                className={[
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center",

                  "rounded-[6px] border",

                  style.border,

                  style.bg,
                ].join(" ")}
              >
                <Icon
                  size={15}
                  strokeWidth={1.7}
                  className={
                    style.text
                  }
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[14px] font-semibold text-[#151A21]">
                    {warning.title}
                  </div>

                  <span
                    className={[
                      "text-[12px] font-semibold uppercase tracking-[0.04em]",

                      style.text,
                    ].join(" ")}
                  >
                    {warning.severity}
                  </span>
                </div>

                <p className="mt-1.5 text-[13px] leading-[1.6] text-[#66717E]">
                  {warning.message}
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
   Secondary Section
   ========================================================= */


function SecondarySection({
  eyebrow,
  title,
  children,
}: {
  eyebrow:
    string;

  title:
    string;

  children:
    ReactNode;
}) {
  return (
    <section
      className={[
        "overflow-hidden",

        "rounded-[8px]",

        "border border-[#D7DDE4]",

        "bg-white",

        "shadow-[0_10px_28px_rgba(25,35,45,0.055)]",
      ].join(" ")}
    >
      <div className="border-b border-[#E4E8ED] px-5 py-4">
        <div className="text-[12px] font-semibold uppercase tracking-[0.075em] text-[#9A6B21]">
          {eyebrow}
        </div>

        <h2 className="mt-1.5 text-[17px] font-semibold tracking-[-0.015em] text-[#151A21]">
          {title}
        </h2>
      </div>

      <div className="p-5">
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
    >(
      null,
    );


  /* =======================================================
     Mission Analysis
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
      (
        waypoint,
      ) =>
        waypoint.id ===
        selectedWaypointId,
    );


  /* =======================================================
     Metrics
     ======================================================= */


  const missionMetrics:
    MissionMetric[] = [
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
     Waypoint Operations
     ======================================================= */


  function updateWaypoint(
    waypointId:
      string,

    updates:
      Partial<MissionWaypoint>,
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
    waypointId:
      string,
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


  /* =======================================================
     Render
     ======================================================= */


  return (
    <div className="mn-page text-[var(--foreground)]">
      {/* ===================================================
          Primary Planner
          =================================================== */}

      <section className="min-h-[calc(100vh-70px)]">
        <div
          className={[
            "mx-auto w-full max-w-[1680px]",

            "px-4 pb-6 pt-5",

            "sm:px-6",

            "lg:px-8",

            "xl:px-10",

            "2xl:px-14",
          ].join(" ")}
        >
          {/* ===============================================
              Page Header
              =============================================== */}

          <header className="flex min-w-0 items-end justify-between gap-6 border-b border-[#D7DDE4] pb-4">
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#151A21]">
                Mission Planner
              </h1>

              <p className="mt-1.5 text-[14px] leading-[1.5] text-[#687482]">
                Route planning · waypoint configuration · mission validation
              </p>
            </div>

            <MissionStatus
              ready={
                analysis.missionReady
              }
            />
          </header>


          {/* ===============================================
              Metric Strip
              =============================================== */}

          <section
            className={[
              "mt-4 grid overflow-hidden",

              "rounded-[8px]",

              "border border-[#D7DDE4]",

              "bg-white",

              "shadow-[0_8px_24px_rgba(25,35,45,0.055)]",

              "grid-cols-2",

              "md:grid-cols-3",

              "xl:grid-cols-6",
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
              Planner Workspace
              =============================================== */}

          <section
            className={[
              "mt-4 grid min-h-[760px] overflow-hidden",

              "rounded-[8px]",

              "border border-[#D7DDE4]",

              "bg-white",

              "shadow-[0_12px_32px_rgba(25,35,45,0.065)]",

              "xl:h-[760px]",

              "xl:grid-cols-[minmax(0,1fr)_430px]",

              "2xl:grid-cols-[minmax(0,1fr)_450px]",
            ].join(" ")}
          >
            {/* =============================================
                Map
                ============================================= */}

            <div className="grid min-h-0 grid-rows-[52px_minmax(0,1fr)]">
              <div className="flex min-w-0 items-center justify-between border-b border-[#E0E5EA] bg-white px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Navigation
                    size={16}
                    strokeWidth={1.7}
                    className="shrink-0 text-[#316F9F]"
                  />

                  <span className="truncate text-[15px] font-semibold text-[#151A21]">
                    Route Planning Map
                  </span>
                </div>

                <span className="hidden text-[12px] font-medium text-[#7A8590] md:block">
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
                Mission Inspector
                ============================================= */}

            <aside
              className={[
                "grid min-h-0",

                "border-t border-[#D7DDE4]",

                "bg-[#F8F9FB]",

                "xl:border-l xl:border-t-0",

                "xl:grid-rows-[64px_250px_minmax(0,1fr)_58px]",
              ].join(" ")}
            >
              {/* Mission Summary */}

              <div className="flex items-center justify-between gap-4 border-b border-[#DCE2E8] px-4">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-[#8D6427]">
                    Mission Route
                  </div>

                  <div className="mt-1 truncate font-mono text-[12px] text-[#6E7986]">
                    {analysis.waypointCount}{" "}
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
                    "shrink-0 rounded-full px-2.5 py-1",

                    "text-[12px] font-semibold uppercase tracking-[0.04em]",

                    analysis.missionReady
                      ? "bg-[rgba(51,125,92,0.08)] text-[#337D5C]"
                      : "bg-[rgba(169,115,36,0.08)] text-[#A97324]",
                  ].join(" ")}
                >
                  {analysis.missionReady
                    ? "Ready"
                    : "Review"}
                </span>
              </div>


              {/* Waypoint Stack */}

              <div className="grid min-h-0 grid-rows-[54px_minmax(0,1fr)] border-b border-[#DCE2E8]">
                <div className="flex items-center justify-between px-4">
                  <div>
                    <div className="text-[15px] font-semibold text-[#151A21]">
                      Waypoint Stack
                    </div>

                    <div className="mt-0.5 text-[12px] text-[#78838F]">
                      Mission route sequence
                    </div>
                  </div>

                  <span className="flex h-7 min-w-7 items-center justify-center rounded-[6px] bg-[rgba(49,111,159,0.08)] px-2 font-mono text-[13px] font-semibold text-[#316F9F]">
                    {waypoints.length}
                  </span>
                </div>

                <div className="min-h-0 overflow-y-auto px-3 pb-3">
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


              {/* Waypoint Editor */}

              <div className="min-h-0 overflow-y-auto border-b border-[#DCE2E8] px-4 py-3.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-[#151A21]">
                      Selected Waypoint
                    </div>

                    <div className="mt-0.5 text-[12px] text-[#78838F]">
                      Position · flight · action
                    </div>
                  </div>

                  <span className="max-w-[140px] truncate rounded-[5px] bg-[#FFF5E5] px-2 py-1 font-mono text-[13px] font-semibold text-[#8D6427]">
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


              {/* Actions */}

              <div className="grid grid-cols-2 gap-2.5 bg-white p-2.5">
                <button
                  type="button"
                  onClick={
                    addDefaultWaypoint
                  }
                  className={[
                    "flex h-[38px] items-center justify-center gap-2",

                    "rounded-[6px] border",

                    "border-[rgba(49,111,159,0.27)]",

                    "bg-[rgba(49,111,159,0.065)]",

                    "text-[13px] font-semibold",

                    "text-[#316F9F]",

                    "transition-[background-color,border-color]",

                    "hover:border-[rgba(49,111,159,0.38)]",

                    "hover:bg-[rgba(49,111,159,0.10)]",
                  ].join(" ")}
                >
                  <Plus
                    size={15}
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
                    "flex h-[38px] items-center justify-center gap-2",

                    "rounded-[6px] border",

                    "text-[13px] font-semibold",

                    "transition-[background-color,border-color]",

                    analysis.missionReady
                      ? "border-[rgba(51,125,92,0.26)] bg-[rgba(51,125,92,0.065)] text-[#337D5C] hover:bg-[rgba(51,125,92,0.10)]"
                      : "border-[rgba(169,115,36,0.28)] bg-[rgba(169,115,36,0.065)] text-[#A97324] hover:bg-[rgba(169,115,36,0.10)]",
                  ].join(" ")}
                >
                  <ShieldCheck
                    size={15}
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
          Secondary Features
          =================================================== */}

      <section
        ref={
          safetySectionRef
        }
        className="border-t border-[#D7DDE4] bg-[#EDF0F3]"
      >
        <div
          className={[
            "mx-auto grid w-full max-w-[1680px] gap-5",

            "px-4 py-7",

            "sm:px-6",

            "lg:px-8",

            "xl:grid-cols-[1.35fr_0.65fr]",

            "xl:px-10",

            "2xl:px-14",
          ].join(" ")}
        >
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


          {/* Mission File */}

          <SecondarySection
            eyebrow="Mission File"
            title="Plan Export & Management"
          >
            <div className="grid gap-4">
              {/* Summary */}

              <div className="grid grid-cols-3 overflow-hidden rounded-[7px] border border-[#DDE2E8] bg-[#F7F9FA]">
                <div className="border-r border-[#E0E5EA] px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#737E8B]">
                    Distance
                  </div>

                  <div className="mt-1.5 font-mono text-[14px] font-semibold text-[#26303A]">
                    {formatDistance(
                      analysis.totalDistanceMeters,
                    )}
                  </div>
                </div>

                <div className="border-r border-[#E0E5EA] px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#737E8B]">
                    Time
                  </div>

                  <div className="mt-1.5 font-mono text-[14px] font-semibold text-[#26303A]">
                    {formatTime(
                      analysis.estimatedTimeSeconds,
                    )}
                  </div>
                </div>

                <div className="px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#737E8B]">
                    Format
                  </div>

                  <div className="mt-1.5 font-mono text-[14px] font-semibold text-[#26303A]">
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
                  "flex h-[42px] items-center justify-center gap-2",

                  "rounded-[6px]",

                  "border border-[#A87B31]",

                  "bg-[#B78939]",

                  "text-[13px] font-semibold",

                  "text-white",

                  "shadow-[0_4px_12px_rgba(120,85,30,0.14)]",

                  "transition-[background-color,transform]",

                  "hover:bg-[#A97C32]",

                  "active:translate-y-px",
                ].join(" ")}
              >
                <Download
                  size={15}
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
                  "flex h-[40px] items-center justify-center gap-2",

                  "rounded-[6px] border",

                  "border-[rgba(189,79,89,0.26)]",

                  "bg-[rgba(189,79,89,0.055)]",

                  "text-[13px] font-semibold",

                  "text-[#BD4F59]",

                  "transition-colors",

                  "hover:bg-[rgba(189,79,89,0.10)]",
                ].join(" ")}
              >
                <Trash2
                  size={15}
                  strokeWidth={1.7}
                />

                Clear Mission
              </button>


              {/* Detail State */}

              <div className="border-t border-[#E0E5EA] pt-4">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-[#6E7986]">
                    Route Mode
                  </span>

                  <span className="font-mono font-semibold text-[#343D48]">
                    Manual
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-[#6E7986]">
                    Safety Engine
                  </span>

                  <span
                    className={
                      analysis.missionReady
                        ? "font-mono font-semibold text-[#337D5C]"
                        : "font-mono font-semibold text-[#A97324]"
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