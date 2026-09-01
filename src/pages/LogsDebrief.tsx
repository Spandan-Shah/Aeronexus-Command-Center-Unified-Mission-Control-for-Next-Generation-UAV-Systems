import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AlertHistoryPanel } from "../components/logs/AlertHistoryPanel";
import { DebriefSummary } from "../components/logs/DebriefSummary";
import { MissionTimeline } from "../components/logs/MissionTimeline";
import { PerformanceMetrics } from "../components/logs/PerformanceMetrics";
import { PilotActionLog } from "../components/logs/PilotActionLog";
import { debriefSummary } from "../data/logs";

type Tone = "nominal" | "caution" | "critical" | "info";

type SummaryMetric = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneClass = {
  nominal: {
    text: "text-(--nominal)",
    border: "border-[rgba(73,229,143,0.28)]",
    bg: "bg-[rgba(73,229,143,0.08)]",
    dot: "bg-(--nominal)",
  },
  caution: {
    text: "text-(--primary)",
    border: "border-[rgba(246,178,60,0.32)]",
    bg: "bg-[rgba(246,178,60,0.08)]",
    dot: "bg-(--primary)",
  },
  critical: {
    text: "text-(--critical)",
    border: "border-[rgba(255,77,77,0.34)]",
    bg: "bg-[rgba(255,77,77,0.08)]",
    dot: "bg-(--critical)",
  },
  info: {
    text: "text-(--info)",
    border: "border-[rgba(90,169,255,0.3)]",
    bg: "bg-[rgba(90,169,255,0.08)]",
    dot: "bg-(--info)",
  },
};

const summaryMetrics: SummaryMetric[] = [
  {
    label: "Mission ID",
    value: debriefSummary.missionId,
    helper: "Export-ready record",
    icon: FileText,
    tone: "info",
  },
  {
    label: "Timeline",
    value: "Live",
    helper: "Mission events ordered by time",
    icon: Clock3,
    tone: "nominal",
  },
  {
    label: "Alerts",
    value: "04",
    helper: "Safety and system events",
    icon: AlertTriangle,
    tone: "caution",
  },
  {
    label: "Audit Trail",
    value: "Signed",
    helper: "Pilot actions preserved",
    icon: ShieldCheck,
    tone: "nominal",
  },
];

function PageHeader() {
  return (
    <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
            Aerial Intelligence
          </p>

          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
            Logs & Debrief
          </h1>

          <p className="mt-2 max-w-4xl text-[14px] leading-relaxed text-(--muted)">
            Mission timeline, alerts, pilot actions, performance metrics, and
            export-ready debrief reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 items-center gap-2 rounded border border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.08)] px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--primary)">
            <FileText size={14} />
            {debriefSummary.missionId}
          </span>

          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded bg-(--primary) px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-90"
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>
    </section>
  );
}

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

          {action && (
            <span className="inline-flex w-fit rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryCard({ item }: { item: SummaryMetric }) {
  const Icon = item.icon;
  const tone = toneClass[item.tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon size={14} className={tone.text} />
          {item.label}
        </div>

        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      </div>

      <div className={`mt-4 font-mono text-[22px] font-bold uppercase ${tone.text}`}>
        {item.value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {item.helper}
      </p>
    </div>
  );
}

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
  const toneStyle = toneClass[tone];

  return (
    <div className={`rounded-xl border bg-black p-4 ${toneStyle.border}`}>
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
        <Icon size={13} className={toneStyle.text} />
        {label}
      </div>

      <div className={`mt-3 font-mono text-[18px] font-bold uppercase ${toneStyle.text}`}>
        {value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {helper}
      </p>
    </div>
  );
}

export function LogsDebrief() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <PageHeader />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((item) => (
            <SummaryCard key={item.label} item={item} />
          ))}
        </section>

        <SectionShell
          eyebrow="Debrief Overview"
          title="Mission Summary"
          action="Post-Mission Review"
        >
          <DebriefSummary />
        </SectionShell>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <SectionShell
              eyebrow="Chronology"
              title="Mission Timeline"
              action="Ordered Events"
            >
              <MissionTimeline />
            </SectionShell>
          </div>

          <div className="grid gap-6 xl:col-span-7">
            <SectionShell
              eyebrow="Mission Metrics"
              title="Performance Metrics"
              action="Flight Review"
            >
              <PerformanceMetrics />
            </SectionShell>

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionShell
                eyebrow="Alerts"
                title="Alert History"
                action="Safety Events"
              >
                <AlertHistoryPanel />
              </SectionShell>

              <SectionShell
                eyebrow="Pilot Audit"
                title="Pilot Action Log"
                action="Signed Trail"
              >
                <PilotActionLog />
              </SectionShell>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            icon={CheckCircle2}
            label="Debrief State"
            value="Ready"
            helper="Mission data is structured for review and export."
            tone="nominal"
          />

          <InsightCard
            icon={Gauge}
            label="Performance"
            value="Stable"
            helper="No major deviation observed in current mock metrics."
            tone="info"
          />

          <InsightCard
            icon={AlertTriangle}
            label="Safety Notes"
            value="Review"
            helper="Geofence and telemetry-link events need operator review."
            tone="caution"
          />

          <InsightCard
            icon={ListChecks}
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