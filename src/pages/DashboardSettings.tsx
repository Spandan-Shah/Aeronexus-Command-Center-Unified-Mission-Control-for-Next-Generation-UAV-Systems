import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudSun,
  Database,
  Map,
  MonitorCog,
  Plane,
  Radio,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  VolumeX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StatusTone = "enabled" | "review" | "disabled" | "info";

type SummaryMetric = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatusTone;
};

type RuntimeItem = {
  label: string;
  value: string;
  icon: LucideIcon;
};

type SettingItem = {
  label: string;
  description: string;
  value: string;
  status: StatusTone;
};

const summaryMetrics: SummaryMetric[] = [
  {
    label: "Mode",
    value: "Simulation",
    icon: MonitorCog,
    tone: "info",
  },
  {
    label: "Telemetry",
    value: "10 Hz",
    icon: Radio,
    tone: "enabled",
  },
  {
    label: "Map",
    value: "Tactical Grid",
    icon: Map,
    tone: "info",
  },
  {
    label: "Profile",
    value: "Default",
    icon: Database,
    tone: "enabled",
  },
];

const runtimeSettings: RuntimeItem[] = [
  {
    label: "Simulator",
    value: "Enabled",
    icon: MonitorCog,
  },
  {
    label: "Active Drone",
    value: "UAV-01",
    icon: Plane,
  },
  {
    label: "Mission Profile",
    value: "Survey-Alpha",
    icon: SlidersHorizontal,
  },
  {
    label: "Weather",
    value: "Clear · Light Wind",
    icon: CloudSun,
  },
  {
    label: "Map Mode",
    value: "Grid + Geofence",
    icon: Map,
  },
  {
    label: "Data Source",
    value: "Mock Data",
    icon: Database,
  },
];

const safetySettings: SettingItem[] = [
  {
    label: "Maximum Altitude",
    description: "Drone should not cross this configured altitude limit.",
    value: "150 m",
    status: "enabled",
  },
  {
    label: "Geofence Boundary",
    description: "Mission area boundary protection is active.",
    value: "Enabled",
    status: "enabled",
  },
  {
    label: "Return-to-Home Battery",
    description: "Drone should return home when battery reaches this level.",
    value: "30%",
    status: "enabled",
  },
  {
    label: "Low Link Failsafe",
    description: "Failsafe warning triggers when telemetry link quality drops.",
    value: "75%",
    status: "review",
  },
];

const telemetrySettings: SettingItem[] = [
  {
    label: "Telemetry Rate",
    description: "Dashboard refresh rate for live drone telemetry.",
    value: "10 Hz",
    status: "enabled",
  },
  {
    label: "Command Signing",
    description: "Critical commands are marked as signed in the audit trail.",
    value: "Enabled",
    status: "enabled",
  },
  {
    label: "Secure Session",
    description: "Mock secure session mode used for dashboard simulation.",
    value: "AES-256 Session",
    status: "enabled",
  },
  {
    label: "Offline Buffer",
    description: "Stores recent telemetry if the drone link drops temporarily.",
    value: "120 sec",
    status: "enabled",
  },
];

const dashboardSettings: SettingItem[] = [
  {
    label: "Theme",
    description: "High contrast tactical dashboard theme.",
    value: "Dark Tactical",
    status: "enabled",
  },
  {
    label: "HUD Font",
    description: "Used for telemetry, command, and status labels.",
    value: "JetBrains Mono",
    status: "enabled",
  },
  {
    label: "Scanline Video Effect",
    description: "Adds tactical scanline effect to simulated video feed.",
    value: "Enabled",
    status: "enabled",
  },
  {
    label: "Alert Sound",
    description: "Audio alert is disabled in current browser prototype.",
    value: "Disabled",
    status: "disabled",
  },
];

const toneClass = {
  enabled: {
    value: "text-(--nominal)",
    border: "border-[rgba(73,229,143,0.28)]",
    dot: "bg-(--nominal)",
    icon: "text-(--nominal)",
    badge:
      "border-[rgba(73,229,143,0.3)] bg-[rgba(73,229,143,0.08)] text-(--nominal)",
  },
  review: {
    value: "text-(--primary)",
    border: "border-[rgba(246,178,60,0.32)]",
    dot: "bg-(--primary)",
    icon: "text-(--primary)",
    badge:
      "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.08)] text-(--primary)",
  },
  disabled: {
    value: "text-(--muted)",
    border: "border-[#1d2533]",
    dot: "bg-(--muted)",
    icon: "text-(--muted)",
    badge: "border-[#1d2533] bg-[#070a10] text-(--muted)",
  },
  info: {
    value: "text-(--info)",
    border: "border-[rgba(90,169,255,0.28)]",
    dot: "bg-(--info)",
    icon: "text-(--info)",
    badge:
      "border-[rgba(90,169,255,0.32)] bg-[rgba(90,169,255,0.08)] text-(--info)",
  },
};

function AdminSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1d2533] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[#151923] px-5 py-4">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-(--primary)">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-[16px] font-semibold leading-tight text-(--foreground)">
          {title}
        </h2>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function SummaryCard({ item }: { item: SummaryMetric }) {
  const Icon = item.icon;
  const tone = toneClass[item.tone];

  return (
    <div
      className={`flex min-h-[108px] flex-col justify-between rounded-lg border bg-[#070a10] p-4 ${tone.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon size={14} className={tone.icon} />
          {item.label}
        </div>

        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      </div>

      <div
        className={`font-mono text-[22px] font-bold uppercase leading-none tracking-[0.03em] ${tone.value}`}
      >
        {item.value}
      </div>
    </div>
  );
}

function RuntimeCard({ item }: { item: RuntimeItem }) {
  const Icon = item.icon;

  return (
    <div className="rounded-lg border border-[#1d2533] bg-[#070a10] p-4">
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        <Icon size={14} className="text-(--info)" />
        {item.label}
      </div>

      <div className="mt-4 font-mono text-[13px] font-bold uppercase tracking-[0.08em] text-(--foreground)">
        {item.value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusTone }) {
  const tone = toneClass[status];

  const label = {
    enabled: "Enabled",
    review: "Review",
    disabled: "Disabled",
    info: "Info",
  }[status];

  const Icon =
    status === "review"
      ? AlertTriangle
      : status === "disabled"
        ? VolumeX
        : CheckCircle2;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${tone.badge}`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

function SettingCard({ item }: { item: SettingItem }) {
  const tone = toneClass[item.status];

  return (
    <div className={`rounded-lg border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--foreground)">
            {item.label}
          </h3>

          <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
            {item.description}
          </p>
        </div>

        <StatusBadge status={item.status} />
      </div>

      <div className="mt-4 rounded border border-[#1d2533] bg-black px-3 py-3">
        <span
          className={`font-mono text-[13px] font-bold uppercase tracking-[0.08em] ${tone.value}`}
        >
          {item.value}
        </span>
      </div>
    </div>
  );
}

function SettingsColumn({
  title,
  eyebrow,
  items,
}: {
  title: string;
  eyebrow: string;
  items: SettingItem[];
}) {
  return (
    <AdminSection eyebrow={eyebrow} title={title}>
      <div className="grid gap-4">
        {items.map((item) => (
          <SettingCard key={item.label} item={item} />
        ))}
      </div>
    </AdminSection>
  );
}

export function DashboardSettings() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Admin Console
              </p>

              <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-(--foreground)">
                Settings
              </h1>

              <p className="mt-2 max-w-4xl text-[14px] leading-relaxed text-(--muted)">
                Configure dashboard preferences, simulator mode, map options,
                telemetry behavior, secure-link settings, and safety limits.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded border border-[#2a3547] bg-black px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
              >
                <RotateCcw size={14} />
                Reset
              </button>

              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded bg-(--primary) px-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-90"
              >
                <Save size={14} />
                Save Settings
              </button>
            </div>
          </div>
        </section>

        <AdminSection eyebrow="Overview" title="System Settings Summary">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map((item) => (
              <SummaryCard key={item.label} item={item} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <RuntimeCard
              item={{
                label: "Active Profile",
                value: "Aeronexus Default",
                icon: Settings2,
              }}
            />

            <RuntimeCard
              item={{
                label: "Theme",
                value: "Dark Tactical",
                icon: ShieldCheck,
              }}
            />

            <RuntimeCard
              item={{
                label: "Last Saved",
                value: "Today · 14:35",
                icon: CheckCircle2,
              }}
            />
          </div>
        </AdminSection>

        <AdminSection eyebrow="Runtime" title="Simulator & Map Settings">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {runtimeSettings.map((item) => (
              <RuntimeCard key={item.label} item={item} />
            ))}
          </div>
        </AdminSection>

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <SettingsColumn
            eyebrow="Flight Guardrails"
            title="Safety Limits"
            items={safetySettings}
          />

          <SettingsColumn
            eyebrow="Communication"
            title="Telemetry & Secure Link"
            items={telemetrySettings}
          />

          <SettingsColumn
            eyebrow="Interface"
            title="Dashboard Preferences"
            items={dashboardSettings}
          />
        </div>
      </div>
    </div>
  );
}