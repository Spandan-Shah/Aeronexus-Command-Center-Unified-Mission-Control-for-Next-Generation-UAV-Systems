import {
  Activity,
  CircleAlert,
  Gauge,
  ShieldCheck,
  Thermometer,
} from "lucide-react";

import { HealthScorePanel } from "../components/health/HealthScorePanel";
import { MotorHealthGrid } from "../components/health/MotorHealthGrid";
import { SensorStatusTable } from "../components/health/SensorStatusTable";

type StatusTone = "nominal" | "caution" | "info";

function OverviewCard({
  label,
  value,
  helper,
  tone = "info",
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  tone?: StatusTone;
  icon: typeof Activity;
}) {
  const toneMap = {
    nominal: {
      border: "border-[rgba(73,229,143,0.28)]",
      value: "text-(--nominal)",
      badge:
        "border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] text-(--nominal)",
      dot: "bg-(--nominal)",
    },
    caution: {
      border: "border-[rgba(246,178,60,0.3)]",
      value: "text-(--primary)",
      badge:
        "border-[rgba(246,178,60,0.3)] bg-[rgba(246,178,60,0.08)] text-(--primary)",
      dot: "bg-(--primary)",
    },
    info: {
      border: "border-[rgba(90,169,255,0.28)]",
      value: "text-(--info)",
      badge:
        "border-[rgba(90,169,255,0.3)] bg-[rgba(90,169,255,0.08)] text-(--info)",
      dot: "bg-(--info)",
    },
  };

  const toneStyle = toneMap[tone];

  return (
    <div
      className={`rounded-xl border bg-[#070a10] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.24)] ${toneStyle.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-(--muted)">
          <Icon size={14} className={toneStyle.value} />
          {label}
        </div>

        <span className={`h-2.5 w-2.5 rounded-full ${toneStyle.dot}`} />
      </div>

      <div className={`mt-4 font-mono text-[26px] font-bold uppercase ${toneStyle.value}`}>
        {value}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-(--muted)">{helper}</p>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${toneStyle.badge}`}
        >
          {tone === "nominal" ? "Stable" : tone === "caution" ? "Review" : "Live"}
        </span>
      </div>
    </div>
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
  children: React.ReactNode;
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
            <span className="inline-flex w-fit items-center rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

export function DroneHealth() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Systems
              </p>

              <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
                Drone Health Monitor
              </h1>

              <p className="mt-2 max-w-4xl text-[14px] leading-relaxed text-(--muted)">
                Live airframe and subsystem health across propulsion, navigation,
                telemetry integrity, calibration readiness, and onboard sensor status.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--nominal)">
                <ShieldCheck size={14} />
                Flight Ready
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(246,178,60,0.3)] bg-[rgba(246,178,60,0.08)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--primary)">
                <CircleAlert size={14} />
                2 Warnings
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            label="Overall Health"
            value="92%"
            helper="Composite airframe readiness score"
            tone="nominal"
            icon={ShieldCheck}
          />

          <OverviewCard
            label="Motor Fleet"
            value="4 / 4"
            helper="All propulsion channels reporting"
            tone="nominal"
            icon={Activity}
          />

          <OverviewCard
            label="Active Alerts"
            value="02"
            helper="Review ESC heat and compass drift"
            tone="caution"
            icon={CircleAlert}
          />

          <OverviewCard
            label="Avg Temperature"
            value="51°C"
            helper="Live thermal average across subsystems"
            tone="info"
            icon={Thermometer}
          />
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <SectionShell eyebrow="Airframe Overview" title="Platform Readiness" action="Live Score">
              <HealthScorePanel />
            </SectionShell>
          </div>

          <div className="xl:col-span-8">
            <SectionShell eyebrow="Propulsion Diagnostics" title="Motor Health Grid" action="Per-Motor Telemetry">
              <MotorHealthGrid />
            </SectionShell>
          </div>

          <div className="xl:col-span-12">
            <SectionShell eyebrow="Navigation & Sensor Integrity" title="Sensor Status Table" action="Realtime Checks">
              <SensorStatusTable />
            </SectionShell>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#1d2533] bg-black p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
              <Gauge size={13} className="text-(--info)" />
              ESC Status
            </div>
            <div className="mt-3 font-mono text-[18px] font-bold uppercase text-(--foreground)">
              Stable Output
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
              Three ESC lines are nominal. ESC-3 is under observation due to elevated temperature.
            </p>
          </div>

          <div className="rounded-xl border border-[#1d2533] bg-black p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
              <Activity size={13} className="text-(--nominal)" />
              Vibration
            </div>
            <div className="mt-3 font-mono text-[18px] font-bold uppercase text-(--nominal)">
              Low
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
              Frame vibration remains within acceptable mission thresholds during simulation.
            </p>
          </div>

          <div className="rounded-xl border border-[#1d2533] bg-black p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
              <ShieldCheck size={13} className="text-(--info)" />
              Calibration
            </div>
            <div className="mt-3 font-mono text-[18px] font-bold uppercase text-(--foreground)">
              Due After 3 Flights
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
              Current sensor calibration is valid. Preventive calibration reminder is scheduled.
            </p>
          </div>

          <div className="rounded-xl border border-[#1d2533] bg-black p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
              <CircleAlert size={13} className="text-(--primary)" />
              Attention Area
            </div>
            <div className="mt-3 font-mono text-[18px] font-bold uppercase text-(--primary)">
              Compass Drift
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
              Minor magnetic deviation detected. Review before deploying in dense urban conditions.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}