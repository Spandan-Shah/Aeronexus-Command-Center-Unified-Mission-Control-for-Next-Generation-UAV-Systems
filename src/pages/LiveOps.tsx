import {
  Battery,
  Gauge,
  Mountain,
  Navigation,
  Radio,
  Satellite,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import type { ReactNode } from "react";

import { AlertsPanel } from "../components/live/AlertsPanel";
import { CommandDeck } from "../components/live/CommandDeck";
import { DataSourcePanel } from "../components/live/DataSourcePanel";
import { MetricCard } from "../components/common/MetricCard";
import { AeroWorldMap } from "../components/map/AeroWorldMap";
import { telemetry } from "../data/telemetry";

type SectionCardProps = {
  eyebrow: string;
  title: string;
  badge?: string;
  badgeTone?: "green" | "amber" | "blue" | "red" | "muted";
  children: ReactNode;
};

const badgeToneClass = {
  green:
    "border-[rgba(73,229,143,0.32)] bg-[rgba(73,229,143,0.08)] text-(--nominal)",
  amber:
    "border-[rgba(246,178,60,0.34)] bg-[rgba(246,178,60,0.08)] text-(--primary)",
  blue:
    "border-[rgba(90,169,255,0.34)] bg-[rgba(90,169,255,0.08)] text-(--info)",
  red:
    "border-[rgba(255,77,77,0.34)] bg-[rgba(255,77,77,0.08)] text-(--critical)",
  muted: "border-[#1d2533] bg-[#070a10] text-(--muted)",
};

function SectionCard({
  eyebrow,
  title,
  badge,
  badgeTone = "muted",
  children,
}: SectionCardProps) {
  return (
    <section className="flex min-h-[360px] flex-col rounded-xl border border-[#1d2533] bg-black p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center justify-between border-b border-[#151923] pb-4">
        <div>
          <p className="text-hud text-[9px] tracking-[0.2em] text-(--primary)">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-[16px] font-semibold leading-tight text-(--foreground)">
            {title}
          </h2>
        </div>

        {badge && (
          <span
            className={`rounded-full border px-3 py-1 text-hud text-[9px] ${badgeToneClass[badgeTone]}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 text-[13px] text-(--foreground)">
        {children}
      </div>
    </section>
  );
}

function InfoTile({
  label,
  value,
  tone = "text-(--foreground)",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-[#1d2533] bg-[#070a10] p-4">
      <div className="text-hud text-[9px] tracking-[0.12em] text-(--muted)">
        {label}
      </div>

      <div className={`mt-2 text-[13px] font-medium ${tone}`}>{value}</div>
    </div>
  );
}

function getBatteryStatus(battery: number) {
  if (battery <= 20) return "critical";
  if (battery <= 40) return "caution";
  return "nominal";
}

function getLinkStatus(linkRssi: number) {
  if (linkRssi >= 85) return "critical";
  if (linkRssi >= 70) return "caution";
  return "nominal";
}

function getTemperatureStatus(temperature: number) {
  if (temperature >= 60) return "critical";
  if (temperature >= 45) return "caution";
  return "nominal";
}

function getRiskStatus(risk?: string) {
  if (risk === "critical") return "critical";
  if (risk === "high") return "caution";
  if (risk === "medium") return "info";
  return "nominal";
}

function roundValue(value: number) {
  return Math.round(value * 10) / 10;
}

export function LiveOps() {
  const missionProgress = Math.round(
    (telemetry.currentWaypoint / telemetry.totalWaypoints) * 100
  );

  const battery = roundValue(telemetry.battery);
  const altitude = roundValue(telemetry.altitude);
  const speed = roundValue(telemetry.speed);
  const heading = telemetry.heading;
  const gpsSatellites = telemetry.gpsSatellites;
  const linkRssi = Math.abs(telemetry.rssi);
  const sensorTemp = roundValue(telemetry.escTemp);
  const risk = (telemetry.risk ?? "low").toUpperCase();

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <section className="overflow-hidden rounded-xl border border-[#1d2533] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="border-b border-[#151923] bg-black px-5 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-hud text-[9px] tracking-[0.22em] text-(--primary)">
                  Aeronexus Mission Control
                </p>

                <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-(--foreground)">
                  Live Operations Map
                </h1>
              </div>

              <p className="max-w-xl text-[13px] leading-relaxed text-(--muted)">
                Real-time operational view for route awareness, geofence
                monitoring, simulated UAV position and mission overlays.
              </p>
            </div>
          </div>

          <div className="h-[760px] bg-black">
            <AeroWorldMap />
          </div>
        </section>

        <div className="grid items-stretch gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          <SectionCard
            eyebrow="Telemetry Overview"
            title="Flight Telemetry"
            badge="Live Feed"
            badgeTone="green"
          >
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="Battery"
                value={battery}
                unit="%"
                icon={Battery}
                status={getBatteryStatus(battery)}
              />

              <MetricCard
                label="Altitude"
                value={altitude}
                unit="m"
                icon={Mountain}
                status="info"
              />

              <MetricCard
                label="Speed"
                value={speed}
                unit="m/s"
                icon={Gauge}
                status="info"
              />

              <MetricCard
                label="Heading"
                value={heading}
                unit="°"
                icon={Navigation}
                status="info"
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Signal & Environment"
            title="Link Intelligence"
            badge="Stable"
            badgeTone="blue"
          >
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                label="GPS"
                value={gpsSatellites}
                unit="sats"
                icon={Satellite}
                status="caution"
              />

              <MetricCard
                label="Link RSSI"
                value={linkRssi}
                unit="dBm"
                icon={Radio}
                status={getLinkStatus(linkRssi)}
              />

              <MetricCard
                label="Sensor Temp"
                value={sensorTemp}
                unit="°C"
                icon={Thermometer}
                status={getTemperatureStatus(sensorTemp)}
              />

              <MetricCard
                label="Risk Level"
                value={risk}
                icon={ShieldCheck}
                status={getRiskStatus(telemetry.risk)}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Mission Progress"
            title="Waypoint Execution"
            badge={`${missionProgress}%`}
            badgeTone="amber"
          >
            <div className="flex h-full flex-col">
              <p className="text-[13px] text-(--muted)">
                Current waypoint {telemetry.currentWaypoint} of{" "}
                {telemetry.totalWaypoints}
              </p>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#09090b]">
                <div
                  className="h-full rounded-full bg-(--primary)"
                  style={{
                    width: `${missionProgress}%`,
                  }}
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <InfoTile label="Drone" value={telemetry.droneId} />
                <InfoTile label="Mission" value={telemetry.mission} />
                <InfoTile
                  label="Mode"
                  value="Simulation"
                  tone="text-(--nominal)"
                />
                <InfoTile label="Platform" value={telemetry.model} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Alert Stream"
            title="Mission Events"
            badge="4 Active"
            badgeTone="red"
          >
            <div className="h-full overflow-hidden rounded-lg border border-[#1d2533] bg-[#070a10]/60">
              <AlertsPanel />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Data Sources"
            title="Telemetry Input"
            badge="Backend Check"
            badgeTone="amber"
          >
            <div className="h-full overflow-hidden rounded-lg border border-[#1d2533] bg-[#070a10]/60 p-3">
              <DataSourcePanel />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Command Deck"
            title="Flight Command Console"
            badge="2-Step Confirm"
            badgeTone="muted"
          >
            <CommandDeck />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}