import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  ListChecks,
  Loader2,
  Radio,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";


/* =========================================================
   Backend
   ========================================================= */

const BACKEND_URL =
  "http://127.0.0.1:8000";


/* =========================================================
   Types
   ========================================================= */

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";


type PythonSample = {
  time: string;

  altitude: number;

  speed: number;

  battery: number;

  link: number;

  risk: number;

  event: string;
};


type PilotAction = {
  time: string;

  actor: string;

  action: string;

  result: string;

  signature: string;
};


type PythonAnalytics = {
  mission_id: string;

  generated_by: string;

  samples: PythonSample[];

  pilot_actions: PilotAction[];

  summary: {
    samples: number;

    peak_altitude_m: number;

    average_speed_ms: number;

    battery_drop_percent: number;

    average_link_percent: number;

    peak_risk_score: number;

    warning_count: number;

    audit_actions: number;
  };
};


type SummaryMetric = {
  label: string;

  value: string;

  helper: string;

  icon: LucideIcon;

  tone: Tone;
};


/* =========================================================
   Fallback Analytics
   ========================================================= */

const fallbackAnalytics:
  PythonAnalytics = {
  mission_id:
    "SURVEY-ALPHA",

  generated_by:
    "Frontend fallback while Python backend is offline",

  samples: [
    {
      time:
        "14:18",

      altitude:
        88,

      speed:
        8.4,

      battery:
        81,

      link:
        97,

      risk:
        8,

      event:
        "Launch confirmed",
    },

    {
      time:
        "14:20",

      altitude:
        112,

      speed:
        12.8,

      battery:
        79,

      link:
        96,

      risk:
        12,

      event:
        "Waypoint 01 reached",
    },

    {
      time:
        "14:22",

      altitude:
        136,

      speed:
        16.2,

      battery:
        76,

      link:
        92,

      risk:
        38,

      event:
        "Link quality warning",
    },

    {
      time:
        "14:24",

      altitude:
        142,

      speed:
        18.4,

      battery:
        72,

      link:
        88,

      risk:
        44,

      event:
        "Geofence proximity alert",
    },

    {
      time:
        "14:26",

      altitude:
        130,

      speed:
        15.6,

      battery:
        69,

      link:
        91,

      risk:
        26,

      event:
        "Route correction",
    },

    {
      time:
        "14:28",

      altitude:
        118,

      speed:
        11.3,

      battery:
        66,

      link:
        94,

      risk:
        15,

      event:
        "Return path stable",
    },

    {
      time:
        "14:30",

      altitude:
        96,

      speed:
        7.9,

      battery:
        64,

      link:
        95,

      risk:
        10,

      event:
        "Landing sequence ready",
    },
  ],

  pilot_actions: [
    {
      time:
        "14:18:03",

      actor:
        "Pilot",

      action:
        "ARM",

      result:
        "Accepted",

      signature:
        "SIG-7FA2",
    },

    {
      time:
        "14:18:21",

      actor:
        "Pilot",

      action:
        "TAKEOFF",

      result:
        "Accepted",

      signature:
        "SIG-81C0",
    },

    {
      time:
        "14:21:08",

      actor:
        "System",

      action:
        "LINK-WATCH",

      result:
        "Warning",

      signature:
        "SYS-92DB",
    },

    {
      time:
        "14:22:41",

      actor:
        "Safety Engine",

      action:
        "GEOFENCE-WATCH",

      result:
        "Warning",

      signature:
        "SAFE-4D9C",
    },

    {
      time:
        "14:24:19",

      actor:
        "Mission Planner",

      action:
        "WAYPOINT-04",

      result:
        "Reached",

      signature:
        "NAV-0C19",
    },

    {
      time:
        "14:26:10",

      actor:
        "Gateway",

      action:
        "REKEY",

      result:
        "Completed",

      signature:
        "GW-2F90",
    },
  ],

  summary: {
    samples:
      7,

    peak_altitude_m:
      142,

    average_speed_ms:
      12.9,

    battery_drop_percent:
      17,

    average_link_percent:
      93.3,

    peak_risk_score:
      44,

    warning_count:
      2,

    audit_actions:
      6,
  },
};


/* =========================================================
   Aerospace Graphite Tone System
   ========================================================= */

const toneClass:
  Record<
    Tone,
    {
      text: string;

      border: string;

      bg: string;

      dot: string;
    }
  > = {
  nominal: {
    text:
      "text-[var(--nominal)]",

    border:
      "border-[rgba(100,142,120,0.30)]",

    bg:
      "bg-[rgba(100,142,120,0.11)]",

    dot:
      "bg-[var(--nominal)]",
  },

  caution: {
    text:
      "text-[var(--caution)]",

    border:
      "border-[rgba(199,155,89,0.30)]",

    bg:
      "bg-[rgba(199,155,89,0.11)]",

    dot:
      "bg-[var(--caution)]",
  },

  critical: {
    text:
      "text-[var(--critical)]",

    border:
      "border-[rgba(201,105,114,0.32)]",

    bg:
      "bg-[rgba(201,105,114,0.11)]",

    dot:
      "bg-[var(--critical)]",
  },

  info: {
    text:
      "text-[var(--info)]",

    border:
      "border-[rgba(93,135,163,0.30)]",

    bg:
      "bg-[rgba(93,135,163,0.11)]",

    dot:
      "bg-[var(--info)]",
  },

  muted: {
    text:
      "text-[var(--muted-soft)]",

    border:
      "border-[var(--border)]",

    bg:
      "bg-[var(--surface-2)]",

    dot:
      "bg-[var(--muted-soft)]",
  },
};


/* =========================================================
   Helpers
   ========================================================= */

function getActionTone(
  result: string,
): Tone {
  const lowered =
    result.toLowerCase();

  if (
    lowered.includes(
      "warning",
    )
  ) {
    return "caution";
  }

  if (
    lowered.includes(
      "blocked",
    ) ||
    lowered.includes(
      "failed",
    )
  ) {
    return "critical";
  }

  if (
    lowered.includes(
      "completed",
    )
  ) {
    return "info";
  }

  return "nominal";
}


function getRiskTone(
  risk: number,
): Tone {
  if (
    risk >=
    60
  ) {
    return "critical";
  }

  if (
    risk >=
    40
  ) {
    return "caution";
  }

  if (
    risk >=
    25
  ) {
    return "info";
  }

  return "nominal";
}


/* =========================================================
   Shared Action Button
   ========================================================= */

function ActionButton({
  children,
  primary = false,
  onClick,
}: {
  children:
    ReactNode;

  primary?:
    boolean;

  onClick?:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "inline-flex h-10 items-center justify-center gap-2",

        "rounded-[7px] border px-3.5",

        "text-[13px] font-semibold",

        "transition-[background-color,border-color,color] duration-150",

        primary
          ? "border-[rgba(176,138,88,0.38)] bg-[rgba(176,138,88,0.14)] text-[var(--primary)] hover:bg-[rgba(176,138,88,0.21)]"
          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


/* =========================================================
   Page Header
   ========================================================= */

function DebriefHeader({
  backendOnline,
  isLoading,
  onRefresh,
}: {
  backendOnline:
    boolean;

  isLoading:
    boolean;

  onRefresh:
    () => void;
}) {
  return (
    <section
      className={[
        "rounded-[10px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-1)]",

        "p-5",

        "shadow-[0_14px_36px_rgba(0,0,0,0.18)]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.085em] text-[var(--primary)]">
            Mission Intelligence · Debrief
          </p>

          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
            Logs & Debrief
          </h1>

          <p className="mt-2 max-w-5xl text-[13px] leading-[1.65] text-[var(--muted)]">
            Mission telemetry samples, pilot actions,
            performance analytics, backend-generated mission
            graph and export-ready operational debrief data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={[
              "inline-flex h-10 items-center gap-2",

              "rounded-[7px] border px-3",

              "text-[12px] font-semibold",

              backendOnline
                ? "border-[rgba(100,142,120,0.30)] bg-[rgba(100,142,120,0.11)] text-[var(--nominal)]"
                : "border-[rgba(199,155,89,0.30)] bg-[rgba(199,155,89,0.11)] text-[var(--caution)]",
            ].join(" ")}
          >
            {backendOnline ? (
              <CheckCircle2
                size={14}
                strokeWidth={1.7}
              />
            ) : (
              <AlertTriangle
                size={14}
                strokeWidth={1.7}
              />
            )}

            {backendOnline
              ? "Python Backend Online"
              : "Fallback Mode"}
          </span>

          <ActionButton
            onClick={
              onRefresh
            }
          >
            {isLoading ? (
              <Loader2
                size={14}
                strokeWidth={1.7}
                className="animate-spin"
              />
            ) : (
              <TimerReset
                size={14}
                strokeWidth={1.7}
              />
            )}

            Refresh Analytics
          </ActionButton>

          <ActionButton
            primary
          >
            <Download
              size={14}
              strokeWidth={1.7}
            />

            Export Report
          </ActionButton>
        </div>
      </div>
    </section>
  );
}


/* =========================================================
   Section Shell

   h-full + flex-column ensures horizontal bottom edges
   align whenever cards share a grid row.
   ========================================================= */

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow:
    string;

  title:
    string;

  action?:
    string;

  children:
    ReactNode;
}) {
  return (
    <section
      className={[
        "flex h-full min-w-0 flex-col",

        "overflow-hidden rounded-[10px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-1)]",

        "shadow-[0_12px_30px_rgba(0,0,0,0.16)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex min-h-[76px] shrink-0 items-center",

          "border-b border-[var(--border-soft)]",

          "bg-[var(--surface-2)]",

          "px-5 py-3.5",
        ].join(" ")}
      >
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.075em] text-[var(--primary)]">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {title}
            </h2>
          </div>

          {action ? (
            <span
              className={[
                "inline-flex w-fit items-center",

                "rounded-[6px] border",

                "border-[rgba(93,135,163,0.28)]",

                "bg-[rgba(93,135,163,0.10)]",

                "px-2.5 py-1",

                "text-[12px] font-semibold",

                "text-[var(--info)]",
              ].join(" ")}
            >
              {action}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-5">
        {children}
      </div>
    </section>
  );
}


/* =========================================================
   Consistent Major Two-Column Layout

   BOTH paired rows use this exact template.
   That means the vertical dividing line never moves.
   ========================================================= */

function DebriefSplitRow({
  left,
  right,
}: {
  left:
    ReactNode;

  right:
    ReactNode;
}) {
  return (
    <div
      className={[
        "grid items-stretch gap-6",

        "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
      ].join(" ")}
    >
      <div className="min-w-0">
        {left}
      </div>

      <div className="min-w-0">
        {right}
      </div>
    </div>
  );
}


/* =========================================================
   Summary Card
   ========================================================= */

function SummaryCard({
  item,
}: {
  item:
    SummaryMetric;
}) {
  const Icon =
    item.icon;

  const tone =
    toneClass[
      item.tone
    ];

  return (
    <div
      className={[
        "flex h-full min-h-[132px] flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        "shadow-[0_8px_22px_rgba(0,0,0,0.14)]",

        tone.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.055em] text-[var(--muted)]">
          <Icon
            size={15}
            strokeWidth={1.7}
            className={
              tone.text
            }
          />

          {item.label}
        </div>

        <span
          className={[
            "h-2 w-2 rounded-full",

            tone.dot,
          ].join(" ")}
        />
      </div>

      <div
        className={[
          "mt-4 font-mono text-[21px] font-semibold",

          tone.text,
        ].join(" ")}
      >
        {item.value}
      </div>

      <p className="mt-auto pt-2 text-[12px] leading-[1.55] text-[var(--muted)]">
        {item.helper}
      </p>
    </div>
  );
}


/* =========================================================
   Timeline Field
   ========================================================= */

function TimelineField({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className={[
        "rounded-[7px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--input)]",

        "px-3 py-2.5",
      ].join(" ")}
    >
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.095em] text-[var(--muted-soft)]">
        {label}
      </div>

      <div className="mt-1.5 font-mono text-[13px] font-semibold text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}


/* =========================================================
   Mission Timeline
   ========================================================= */

function MissionTimeline({
  samples,
}: {
  samples:
    PythonSample[];
}) {
  return (
    <div className="grid h-full gap-3">
      {samples.map(
        (
          sample,
          index,
        ) => {
          const tone =
            toneClass[
              getRiskTone(
                sample.risk,
              )
            ];

          return (
            <article
              key={`${sample.time}-${sample.event}`}
              className={[
                "rounded-[9px] border",

                "bg-[var(--surface-2)]",

                "p-4",

                "transition-[background-color,border-color] duration-150",

                "hover:bg-[var(--surface-hover)]",

                tone.border,
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center",

                    "rounded-full border",

                    "font-mono text-[11px] font-semibold",

                    tone.border,
                    tone.bg,
                    tone.text,
                  ].join(" ")}
                >
                  {String(
                    index +
                      1,
                  ).padStart(
                    2,
                    "0",
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-soft)]">
                        {sample.time}
                      </div>

                      <h3 className="mt-1 text-[15px] font-semibold text-[var(--foreground)]">
                        {sample.event}
                      </h3>
                    </div>

                    <span
                      className={[
                        "w-fit rounded-full border",

                        "px-2.5 py-1",

                        "font-mono text-[10px] font-semibold uppercase tracking-[0.07em]",

                        tone.border,
                        tone.bg,
                        tone.text,
                      ].join(" ")}
                    >
                      Risk{" "}
                      {sample.risk}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                    <TimelineField
                      label="Altitude"
                      value={`${sample.altitude} m`}
                    />

                    <TimelineField
                      label="Speed"
                      value={`${sample.speed} m/s`}
                    />

                    <TimelineField
                      label="Battery"
                      value={`${sample.battery}%`}
                    />

                    <TimelineField
                      label="Link"
                      value={`${sample.link}%`}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        },
      )}
    </div>
  );
}


/* =========================================================
   Audit Table
   ========================================================= */

function AuditTable({
  actions,
}: {
  actions:
    PilotAction[];
}) {
  return (
    <div
      className={[
        "flex h-full min-h-[520px] flex-col",

        "overflow-hidden rounded-[9px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--surface-2)]",
      ].join(" ")}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[650px]">
          <div
            className={[
              "grid",

              "grid-cols-[88px_1fr_1.15fr_0.95fr_92px]",

              "border-b border-[var(--border)]",

              "bg-[var(--input)]",

              "px-4 py-3",

              "font-mono text-[10px] font-semibold uppercase tracking-[0.075em]",

              "text-[var(--muted-soft)]",
            ].join(" ")}
          >
            <span>
              Time
            </span>

            <span>
              Actor
            </span>

            <span>
              Action
            </span>

            <span>
              Signature
            </span>

            <span className="text-right">
              Result
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="grid min-h-full min-w-[650px] auto-rows-fr">
          {actions.map(
            (
              action,
            ) => {
              const tone =
                toneClass[
                  getActionTone(
                    action.result,
                  )
                ];

              return (
                <div
                  key={`${action.time}-${action.action}`}
                  className={[
                    "grid",

                    "grid-cols-[88px_1fr_1.15fr_0.95fr_92px]",

                    "items-center",

                    "border-b border-[var(--border-soft)]",

                    "px-4 py-4",

                    "text-[12px]",

                    "transition-colors",

                    "last:border-b-0",

                    "hover:bg-[var(--surface-hover)]",
                  ].join(" ")}
                >
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {action.time}
                  </span>

                  <span className="text-[var(--muted)]">
                    {action.actor}
                  </span>

                  <span className="font-medium text-[var(--foreground)]">
                    {action.action}
                  </span>

                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    {action.signature}
                  </span>

                  <span
                    className={[
                      "text-right font-mono text-[11px] font-medium",

                      tone.text,
                    ].join(" ")}
                  >
                    {action.result}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   Performance Metric
   ========================================================= */

function PerformanceMetric({
  label,
  value,
  tone,
}: {
  label:
    string;

  value:
    string;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "flex h-full min-h-[122px] flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        style.border,
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.065em] text-[var(--muted)]">
        {label}
      </div>

      <div
        className={[
          "mt-auto pt-4 font-mono text-[21px] font-semibold",

          style.text,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}


/* =========================================================
   Performance Panel
   ========================================================= */

function PerformancePanel({
  analytics,
}: {
  analytics:
    PythonAnalytics;
}) {
  const rows = [
    {
      label:
        "Peak Altitude",

      value:
        `${analytics.summary.peak_altitude_m} m`,

      tone:
        "info" as Tone,
    },

    {
      label:
        "Average Speed",

      value:
        `${analytics.summary.average_speed_ms} m/s`,

      tone:
        "nominal" as Tone,
    },

    {
      label:
        "Battery Drop",

      value:
        `${analytics.summary.battery_drop_percent}%`,

      tone:
        "caution" as Tone,
    },

    {
      label:
        "Average Link",

      value:
        `${analytics.summary.average_link_percent}%`,

      tone:
        "nominal" as Tone,
    },

    {
      label:
        "Peak Risk",

      value:
        `${analytics.summary.peak_risk_score}`,

      tone:
        "caution" as Tone,
    },

    {
      label:
        "Audit Actions",

      value:
        `${analytics.summary.audit_actions}`,

      tone:
        "info" as Tone,
    },
  ];

  return (
    <div className="grid h-full auto-rows-fr gap-4 sm:grid-cols-2">
      {rows.map(
        (
          row,
        ) => (
          <PerformanceMetric
            key={
              row.label
            }
            label={
              row.label
            }
            value={
              row.value
            }
            tone={
              row.tone
            }
          />
        ),
      )}
    </div>
  );
}


/* =========================================================
   Python Graph Panel
   ========================================================= */

function PythonGraphPanel({
  backendOnline,
  graphVersion,
}: {
  backendOnline:
    boolean;

  graphVersion:
    number;
}) {
  return (
    <div
      className={[
        "flex h-full min-h-[520px] flex-col",

        "rounded-[9px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--surface-2)]",

        "p-4",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--foreground)]">
            Python-generated mission graph
          </h3>

          <p className="mt-1 max-w-3xl text-[12px] leading-[1.6] text-[var(--muted)]">
            FastAPI renders mission altitude, battery and risk
            samples as an SVG debrief graph.
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit shrink-0 items-center",

            "rounded-[6px] border",

            "px-2.5 py-1",

            "text-[11px] font-semibold",

            backendOnline
              ? "border-[rgba(100,142,120,0.30)] bg-[rgba(100,142,120,0.11)] text-[var(--nominal)]"
              : "border-[rgba(199,155,89,0.30)] bg-[rgba(199,155,89,0.11)] text-[var(--caution)]",
          ].join(" ")}
        >
          {backendOnline
            ? "Python Online"
            : "Backend Offline"}
        </span>
      </div>

      <div
        className={[
          "mt-5 flex min-h-[390px] flex-1 items-center justify-center",

          "overflow-hidden rounded-[8px]",

          "border border-[var(--border-soft)]",

          "bg-[var(--input)]",
        ].join(" ")}
      >
        {backendOnline ? (
          <img
            src={`${BACKEND_URL}/api/logs-debrief/python-graph.svg?v=${graphVersion}`}
            alt="Python generated mission debrief graph"
            className="block h-auto max-h-full w-full object-contain"
          />
        ) : (
          <div className="flex min-h-[390px] items-center justify-center p-6 text-center">
            <div>
              <AlertTriangle
                size={32}
                strokeWidth={1.6}
                className="mx-auto text-[var(--caution)]"
              />

              <h3 className="mt-4 text-[16px] font-semibold text-[var(--foreground)]">
                Python graph backend is offline
              </h3>

              <p className="mt-2 max-w-xl text-[13px] leading-[1.6] text-[var(--muted)]">
                Start the FastAPI backend and refresh analytics.
                MissionNexus continues using fallback mission
                data so the debrief workspace remains usable.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   Insight Card
   ========================================================= */

function InsightCard({
  icon:
    Icon,

  label,

  value,

  helper,

  tone,
}: {
  icon:
    LucideIcon;

  label:
    string;

  value:
    string;

  helper:
    string;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "flex h-full min-h-[150px] flex-col",

        "rounded-[9px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        "shadow-[0_8px_22px_rgba(0,0,0,0.13)]",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.065em] text-[var(--muted)]">
        <Icon
          size={14}
          strokeWidth={1.7}
          className={
            style.text
          }
        />

        {label}
      </div>

      <div
        className={[
          "mt-4 font-mono text-[18px] font-semibold",

          style.text,
        ].join(" ")}
      >
        {value}
      </div>

      <p className="mt-auto pt-2 text-[12px] leading-[1.6] text-[var(--muted)]">
        {helper}
      </p>
    </div>
  );
}


/* =========================================================
   Page
   ========================================================= */

export function LogsDebrief() {
  const [
    analytics,
    setAnalytics,
  ] =
    useState<PythonAnalytics>(
      fallbackAnalytics,
    );


  const [
    backendOnline,
    setBackendOnline,
  ] =
    useState(
      false,
    );


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );


  const [
    graphVersion,
    setGraphVersion,
  ] =
    useState(
      Date.now(),
    );


  async function loadPythonAnalytics() {
    setIsLoading(
      true,
    );

    try {
      const response =
        await fetch(
          `${BACKEND_URL}/api/logs-debrief/python-analytics`,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "Python analytics request failed",
        );
      }

      const result =
        (await response.json()) as PythonAnalytics;

      setAnalytics(
        result,
      );

      setBackendOnline(
        true,
      );

      setGraphVersion(
        Date.now(),
      );
    } catch {
      setAnalytics(
        fallbackAnalytics,
      );

      setBackendOnline(
        false,
      );
    } finally {
      setIsLoading(
        false,
      );
    }
  }


  useEffect(
    () => {
      void loadPythonAnalytics();
    },
    [],
  );


  const summaryMetrics =
    useMemo<
      SummaryMetric[]
    >(
      () => [
        {
          label:
            "Mission ID",

          value:
            analytics.mission_id,

          helper:
            backendOnline
              ? "Python analytics loaded"
              : "Fallback analytics active",

          icon:
            FileText,

          tone:
            backendOnline
              ? "info"
              : "caution",
        },

        {
          label:
            "Log Samples",

          value:
            String(
              analytics
                .summary
                .samples,
            ),

          helper:
            "Mission telemetry points",

          icon:
            Activity,

          tone:
            "nominal",
        },

        {
          label:
            "Warnings",

          value:
            String(
              analytics
                .summary
                .warning_count,
            ),

          helper:
            "Safety and link events",

          icon:
            AlertTriangle,

          tone:
            analytics
              .summary
              .warning_count >
            0
              ? "caution"
              : "nominal",
        },

        {
          label:
            "Audit Trail",

          value:
            String(
              analytics
                .summary
                .audit_actions,
            ),

          helper:
            "Signed pilot and system actions",

          icon:
            ShieldCheck,

          tone:
            "nominal",
        },
      ],

      [
        analytics,
        backendOnline,
      ],
    );


  return (
    <div className="min-h-[calc(100vh-70px)] bg-transparent px-5 py-6 sm:px-6 lg:px-8">
      <div
        className={[
          "mx-auto flex w-full max-w-[1680px] flex-col",

          "gap-6",
        ].join(" ")}
      >
        {/* =================================================
            Header
            ================================================= */}

        <DebriefHeader
          backendOnline={
            backendOnline
          }
          isLoading={
            isLoading
          }
          onRefresh={() =>
            void loadPythonAnalytics()
          }
        />


        {/* =================================================
            Summary Metrics
            ================================================= */}

        <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map(
            (
              item,
            ) => (
              <SummaryCard
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


        {/* =================================================
            ROW 1
            Graph + Performance

            Uses SAME 50/50 divider as Timeline/Audit.
            ================================================= */}

        <DebriefSplitRow
          left={
            <SectionShell
              eyebrow="Python Analytics"
              title="Mission Debrief Graph"
              action="Backend Generated SVG"
            >
              <PythonGraphPanel
                backendOnline={
                  backendOnline
                }
                graphVersion={
                  graphVersion
                }
              />
            </SectionShell>
          }
          right={
            <SectionShell
              eyebrow="Performance"
              title="Mission Metrics"
              action="Computed Summary"
            >
              <PerformancePanel
                analytics={
                  analytics
                }
              />
            </SectionShell>
          }
        />


        {/* =================================================
            ROW 2
            Timeline + Audit

            EXACT SAME VERTICAL DIVIDER as Row 1.
            ================================================= */}

        <DebriefSplitRow
          left={
            <SectionShell
              eyebrow="Chronology"
              title="Mission Timeline"
              action={`${analytics.samples.length} Samples`}
            >
              <MissionTimeline
                samples={
                  analytics.samples
                }
              />
            </SectionShell>
          }
          right={
            <SectionShell
              eyebrow="Command Audit"
              title="Pilot & System Action Log"
              action={`${analytics.pilot_actions.length} Actions`}
            >
              <AuditTable
                actions={
                  analytics.pilot_actions
                }
              />
            </SectionShell>
          }
        />


        {/* =================================================
            Final Insights
            ================================================= */}

        <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon={
              CheckCircle2
            }
            label="Debrief State"
            value="Ready"
            helper="Mission analytics are structured for operator review."
            tone="nominal"
          />

          <InsightCard
            icon={
              Gauge
            }
            label="Peak Altitude"
            value={`${analytics.summary.peak_altitude_m} m`}
            helper="Highest altitude from the mission sample sequence."
            tone="info"
          />

          <InsightCard
            icon={
              Radio
            }
            label="Average Link"
            value={`${analytics.summary.average_link_percent}%`}
            helper="Average communication link quality during the log window."
            tone="nominal"
          />

          <InsightCard
            icon={
              ListChecks
            }
            label="Audit Completeness"
            value="Complete"
            helper="Pilot commands and system events are available for review."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}