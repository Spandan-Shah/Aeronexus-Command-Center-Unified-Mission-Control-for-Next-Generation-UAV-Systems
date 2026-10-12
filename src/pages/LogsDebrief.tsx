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

const BACKEND_URL =
  "http://127.0.0.1:8000";

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

  samples:
    PythonSample[];

  pilot_actions:
    PilotAction[];

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
   Tone System
   ========================================================= */

const toneClass = {
  nominal: {
    text:
      "text-(--nominal)",

    border:
      "border-[rgba(73,229,143,0.28)]",

    bg:
      "bg-[rgba(73,229,143,0.08)]",

    dot:
      "bg-(--nominal)",
  },

  caution: {
    text:
      "text-(--primary)",

    border:
      "border-[rgba(246,178,60,0.32)]",

    bg:
      "bg-[rgba(246,178,60,0.08)]",

    dot:
      "bg-(--primary)",
  },

  critical: {
    text:
      "text-(--critical)",

    border:
      "border-[rgba(255,77,77,0.34)]",

    bg:
      "bg-[rgba(255,77,77,0.08)]",

    dot:
      "bg-(--critical)",
  },

  info: {
    text:
      "text-(--info)",

    border:
      "border-[rgba(90,169,255,0.3)]",

    bg:
      "bg-[rgba(90,169,255,0.08)]",

    dot:
      "bg-(--info)",
  },

  muted: {
    text:
      "text-(--muted)",

    border:
      "border-[#1d2533]",

    bg:
      "bg-[#070a10]",

    dot:
      "bg-(--muted)",
  },
};

/* =========================================================
   Section Shell
   ========================================================= */

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1d2533] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[#151923] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-(--primary)">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[18px] font-semibold leading-tight text-(--foreground)">
              {title}
            </h2>
          </div>

          {action ? (
            <span className="inline-flex w-fit rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
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
      className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon
            size={14}
            className={
              tone.text
            }
          />

          {item.label}
        </div>

        <span
          className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
        />
      </div>

      <div
        className={`mt-4 font-mono text-[22px] font-bold uppercase ${tone.text}`}
      >
        {item.value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {item.helper}
      </p>
    </div>
  );
}

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
    <div className="grid gap-3">
      {samples.map(
        (
          sample,
          index,
        ) => {
          const tone:
            Tone =
            sample.risk >=
            40
              ? "caution"
              : sample.risk >=
                  25
                ? "info"
                : "nominal";

          const toneStyle =
            toneClass[
              tone
            ];

          return (
            <div
              key={`${sample.time}-${sample.event}`}
              className={`rounded-lg border bg-[#070a10] p-4 ${toneStyle.border}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}
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
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--muted)">
                        {
                          sample.time
                        }
                      </div>

                      <h3 className="mt-1 text-[14px] font-semibold text-(--foreground)">
                        {
                          sample.event
                        }
                      </h3>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}
                    >
                      Risk{" "}
                      {
                        sample.risk
                      }
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
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
            </div>
          );
        },
      )}
    </div>
  );
}

function TimelineField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-[#1d2533] bg-black px-3 py-2">
      <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        {label}
      </div>

      <div className="mt-1 font-mono text-[12px] font-bold text-(--foreground)">
        {value}
      </div>
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
    <div className="overflow-hidden rounded-xl border border-[#1d2533] bg-[#070a10]">
      <div className="grid grid-cols-[110px_1fr_1fr_1fr_120px] border-b border-[#1d2533] bg-black px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
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
              className="grid grid-cols-[110px_1fr_1fr_1fr_120px] border-b border-[#1d2533] px-4 py-4 text-[13px] last:border-b-0"
            >
              <span className="font-mono text-[11px] text-(--muted)">
                {
                  action.time
                }
              </span>

              <span className="text-(--foreground)">
                {
                  action.actor
                }
              </span>

              <span className="font-medium text-(--foreground)">
                {
                  action.action
                }
              </span>

              <span className="font-mono text-[11px] text-(--muted)">
                {
                  action.signature
                }
              </span>

              <span
                className={`text-right font-mono text-[11px] ${tone.text}`}
              >
                {
                  action.result
                }
              </span>
            </div>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   Performance
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
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map(
        (
          row,
        ) => {
          const tone =
            toneClass[
              row.tone
            ];

          return (
            <div
              key={
                row.label
              }
              className={`rounded-lg border bg-[#070a10] p-4 ${tone.border}`}
            >
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
                {
                  row.label
                }
              </div>

              <div
                className={`mt-3 font-mono text-[20px] font-bold ${tone.text}`}
              >
                {
                  row.value
                }
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   Python Graph
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
    <div className="rounded-xl border border-[#1d2533] bg-[#070a10] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-(--foreground)">
            Python generated mission graph
          </h3>

          <p className="mt-1 text-[13px] leading-relaxed text-(--muted)">
            This graph is rendered by the FastAPI Python backend as SVG using mission altitude, battery, and risk samples.
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
            backendOnline
              ? "border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] text-(--nominal)"
              : "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.08)] text-(--primary)"
          }`}
        >
          {backendOnline
            ? "Python Online"
            : "Backend Offline"}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#1d2533] bg-black">
        {backendOnline ? (
          <img
            src={`${BACKEND_URL}/api/logs-debrief/python-graph.svg?v=${graphVersion}`}
            alt="Python generated mission debrief graph"
            className="block w-full"
          />
        ) : (
          <div className="flex min-h-[360px] items-center justify-center p-6 text-center">
            <div>
              <AlertTriangle
                size={32}
                className="mx-auto text-(--primary)"
              />

              <h3 className="mt-4 text-[16px] font-semibold text-(--foreground)">
                Python graph backend is offline
              </h3>

              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-(--muted)">
                Start the FastAPI backend, then refresh analytics. The page is still showing fallback mission log data so the layout remains usable.
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
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  const toneStyle =
    toneClass[
      tone
    ];

  return (
    <div
      className={`rounded-xl border bg-black p-4 ${toneStyle.border}`}
    >
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
        <Icon
          size={13}
          className={
            toneStyle.text
          }
        />

        {label}
      </div>

      <div
        className={`mt-3 font-mono text-[18px] font-bold uppercase ${toneStyle.text}`}
      >
        {value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
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
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

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

  useEffect(() => {
    void loadPythonAnalytics();
  }, []);

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
              : "Fallback data active",

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
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        {/* =================================================
            Header
            ================================================= */}

        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Aerial Intelligence
              </p>

              <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
                Logs & Debrief
              </h1>

              <p className="mt-2 max-w-5xl text-[14px] leading-relaxed text-(--muted)">
                Mission telemetry samples, pilot actions, alert history, Python-generated mission graph, performance metrics, and export-ready debrief reporting.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`flex h-11 items-center gap-2 rounded border px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${
                  backendOnline
                    ? "border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] text-(--nominal)"
                    : "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.08)] text-(--primary)"
                }`}
              >
                {backendOnline ? (
                  <CheckCircle2
                    size={14}
                  />
                ) : (
                  <AlertTriangle
                    size={14}
                  />
                )}

                {backendOnline
                  ? "Python Backend Online"
                  : "Fallback Mode"}
              </span>

              <button
                type="button"
                onClick={
                  loadPythonAnalytics
                }
                className="flex h-11 items-center gap-2 rounded border border-[#2a3547] bg-black px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
              >
                {isLoading ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <TimerReset
                    size={14}
                  />
                )}

                Refresh Analytics
              </button>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded bg-(--primary) px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-90"
              >
                <Download
                  size={14}
                />

                Export Report
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            Summary
            ================================================= */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            Graph + Performance
            ================================================= */}

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
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
          </div>

          <div className="xl:col-span-4">
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
          </div>
        </div>

        {/* =================================================
            Timeline + Audit
            ================================================= */}

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
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
          </div>

          <div className="xl:col-span-7">
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
          </div>
        </div>

        {/* =================================================
            Final Insights
            ================================================= */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            label="Avg Link"
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
            helper="Pilot commands and system events are available."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}