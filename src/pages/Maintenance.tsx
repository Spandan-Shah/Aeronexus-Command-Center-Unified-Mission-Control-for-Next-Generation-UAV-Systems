import type {
  ReactNode,
} from "react";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gauge,
  History,
  ShieldCheck,
  TimerReset,
  Wrench,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  MaintenanceSchedule,
} from "../components/maintenance/MaintenanceSchedule";

import {
  MaintenanceSummary,
} from "../components/maintenance/MaintenanceSummary";

import {
  PartWearPanel,
} from "../components/maintenance/PartWearPanel";

import {
  ServiceTicketsPanel,
} from "../components/maintenance/ServiceTicketsPanel";


/* =========================================================
   Types
   ========================================================= */

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info";


type SummaryMetric = {
  label:
    string;

  value:
    string;

  helper:
    string;

  icon:
    LucideIcon;

  tone:
    Tone;
};


/* =========================================================
   Aerospace Graphite Tone System
   ========================================================= */

const toneClass:
  Record<
    Tone,
    {
      text:
        string;

      border:
        string;

      bg:
        string;

      dot:
        string;
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
};


/* =========================================================
   Summary Metrics
   ========================================================= */

const summaryMetrics:
  SummaryMetric[] = [
  {
    label:
      "Readiness",

    value:
      "94%",

    helper:
      "Fleet service readiness",

    icon:
      ShieldCheck,

    tone:
      "nominal",
  },

  {
    label:
      "Open Tickets",

    value:
      "03",

    helper:
      "Two routine, one review",

    icon:
      ClipboardList,

    tone:
      "caution",
  },

  {
    label:
      "Next Service",

    value:
      "36 h",

    helper:
      "Scheduled inspection window",

    icon:
      CalendarClock,

    tone:
      "info",
  },

  {
    label:
      "Part Wear",

    value:
      "Low",

    helper:
      "No critical wear detected",

    icon:
      Gauge,

    tone:
      "nominal",
  },
];


/* =========================================================
   Page Header
   ========================================================= */

function PageHeader() {
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
            Operational Systems · Fleet Service
          </p>

          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
            Maintenance
          </h1>

          <p className="mt-2 max-w-4xl text-[14px] leading-[1.65] text-[var(--muted)]">
            Service schedules, open tickets, component wear,
            inspection status and maintenance readiness across
            the active UAV fleet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={[
              "flex h-10 items-center gap-2",

              "rounded-[7px] border px-3.5",

              "border-[var(--border)]",

              "bg-[var(--surface-2)]",

              "text-[13px] font-semibold",

              "text-[var(--muted)]",

              "transition-[background-color,border-color,color] duration-150",

              "hover:border-[var(--border-strong)]",

              "hover:bg-[var(--surface-hover)]",

              "hover:text-[var(--foreground)]",
            ].join(" ")}
          >
            <ClipboardList
              size={15}
              strokeWidth={1.7}
            />

            Create Task
          </button>

          <button
            type="button"
            className={[
              "flex h-10 items-center gap-2",

              "rounded-[7px] border px-3.5",

              "border-[rgba(176,138,88,0.38)]",

              "bg-[rgba(176,138,88,0.14)]",

              "text-[13px] font-semibold",

              "text-[var(--primary)]",

              "transition-colors duration-150",

              "hover:bg-[rgba(176,138,88,0.21)]",
            ].join(" ")}
          >
            <Wrench
              size={15}
              strokeWidth={1.7}
            />

            Service Drone
          </button>
        </div>
      </div>
    </section>
  );
}


/* =========================================================
   Section Shell

   IMPORTANT:
   h-full + flex-col allows paired sections to share the
   exact same top and bottom lines.
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
          "mt-4 font-mono text-[22px] font-semibold",

          tone.text,
        ].join(" ")}
      >
        {item.value}
      </div>

      <p className="mt-auto pt-2 text-[13px] leading-[1.55] text-[var(--muted)]">
        {item.helper}
      </p>
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
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.065em] text-[var(--muted)]">
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
          "mt-4 font-mono text-[19px] font-semibold",

          style.text,
        ].join(" ")}
      >
        {value}
      </div>

      <p className="mt-auto pt-2 text-[13px] leading-[1.6] text-[var(--muted)]">
        {helper}
      </p>
    </div>
  );
}


/* =========================================================
   Maintenance Page
   ========================================================= */

export function Maintenance() {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-transparent px-5 py-6 sm:px-6 lg:px-8">
      <div
        className={[
          "mx-auto flex w-full max-w-[1680px] flex-col",

          "gap-6",
        ].join(" ")}
      >
        {/* Header */}

        <PageHeader />


        {/* Summary */}

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


        {/* Fleet Summary */}

        <SectionShell
          eyebrow="Maintenance Overview"
          title="Fleet Service Summary"
          action="Live Maintenance State"
        >
          <MaintenanceSummary />
        </SectionShell>


        {/* =================================================
            SERVICE ROW

            items-stretch:
            both outer cards now have identical height.

            left and right child wrappers are h-full.

            2 / 1 divider remains consistent.
            ================================================= */}

        <div
          className={[
            "grid items-stretch gap-6",

            "xl:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)]",
          ].join(" ")}
        >
          <div className="min-w-0">
            <SectionShell
              eyebrow="Service Planning"
              title="Maintenance Schedule"
              action="Upcoming Tasks"
            >
              <MaintenanceSchedule />
            </SectionShell>
          </div>

          <div className="min-w-0">
            <SectionShell
              eyebrow="Service Desk"
              title="Open Service Tickets"
              action="3 Active"
            >
              <ServiceTicketsPanel />
            </SectionShell>
          </div>
        </div>


        {/* Component Wear */}

        <SectionShell
          eyebrow="Component Wear"
          title="Part Wear Intelligence"
          action="Predictive Review"
        >
          <PartWearPanel />
        </SectionShell>


        {/* Insights */}

        <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon={
              CheckCircle2
            }
            label="Frame Status"
            value="Good"
            helper="No frame stress marker is currently flagged."
            tone="nominal"
          />

          <InsightCard
            icon={
              TimerReset
            }
            label="Calibration"
            value="After 3 Flights"
            helper="Preventive calibration reminder is scheduled."
            tone="info"
          />

          <InsightCard
            icon={
              AlertTriangle
            }
            label="Review Area"
            value="ESC Heat"
            helper="One ESC channel is trending warmer than baseline."
            tone="caution"
          />

          <InsightCard
            icon={
              History
            }
            label="Last Inspection"
            value="Today"
            helper="Latest inspection was recorded during the current session."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}