import type {
  LucideIcon,
} from "lucide-react";

import {
  Battery,
  Gauge,
  Navigation,
  Radio,
  Route,
  Satellite,
  ShieldCheck,
  Thermometer,
} from "lucide-react";

import {
  AlertsPanel,
} from "../components/live/AlertsPanel";

import {
  CommandDeck,
} from "../components/live/CommandDeck";

import {
  DataSourcePanel,
} from "../components/live/DataSourcePanel";

import {
  AeroWorldMap,
} from "../components/map/AeroWorldMap";

import {
  telemetry,
} from "../data/telemetry";

import {
  MissionBadge,
  MissionPanel,
  MissionSectionHeader,
  MissionStatus,
} from "../components/ui/mission";

import type {
  MissionTone,
} from "../components/ui/mission";

/* =========================================================
   MissionNexus V2
   Live Operations

   Final first-page layout foundation.

   Visual direction:
   - Aeronexus / GeoFusion density
   - compact mission identity
   - dominant mission map
   - restrained operational rail
   - compact command deck
   - no oversized dashboard cards
   - five system states remain in one line on desktop
   ========================================================= */

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

function getRiskTone(
  risk: string,
): MissionTone {
  const normalized =
    risk.toLowerCase();

  if (
    normalized === "critical" ||
    normalized === "high"
  ) {
    return "critical";
  }

  if (
    normalized === "medium"
  ) {
    return "caution";
  }

  if (
    normalized === "low"
  ) {
    return "nominal";
  }

  return "muted";
}

function getBatteryTone(
  battery: number,
): MissionTone {
  if (
    battery <= 20
  ) {
    return "critical";
  }

  if (
    battery <= 40
  ) {
    return "caution";
  }

  return "nominal";
}

function getLinkTone(
  link: number,
): MissionTone {
  if (
    link < 55
  ) {
    return "critical";
  }

  if (
    link < 75
  ) {
    return "caution";
  }

  return "nominal";
}

function getThermalTone(
  temperature: number,
): MissionTone {
  if (
    temperature >= 70
  ) {
    return "critical";
  }

  if (
    temperature >= 55
  ) {
    return "caution";
  }

  return "nominal";
}

function toneTextClass(
  tone: MissionTone,
) {
  switch (tone) {
    case "primary":
      return "text-(--primary)";

    case "info":
      return "text-(--info)";

    case "nominal":
      return "text-(--nominal)";

    case "caution":
      return "text-(--caution)";

    case "critical":
      return "text-(--critical)";

    case "muted":
      return "text-(--muted)";

    default:
      return "text-(--foreground)";
  }
}

/* =========================================================
   Mission Identity
   ========================================================= */

function MissionIdentityBar() {
  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

  return (
    <section className="flex flex-col gap-3 border-b border-(--border-soft) pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mn-eyebrow">
            Operations · Active Mission
          </span>

          <span
            aria-hidden="true"
            className="h-3 w-px bg-white/10"
          />

          <MissionStatus
            label="Mission Live"
            tone="nominal"
            pulse
            compact
          />
        </div>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1
            className="text-[21px] font-normal tracking-[-0.035em] text-(--foreground)"
            style={{
              fontFamily:
                '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Live Operations
          </h1>

          <span className="font-mono text-[8px] font-medium uppercase tracking-[0.09em] text-(--muted)">
            {telemetry.mission}
            {" · "}
            {telemetry.droneId}
            {" · "}
            {telemetry.flightMode}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MissionBadge
          tone="info"
          variant="outline"
          size="sm"
        >
          GPS {telemetry.gpsSatellites}
        </MissionBadge>

        <MissionBadge
          tone={
            getLinkTone(
              telemetry.linkQuality,
            )
          }
          variant="outline"
          size="sm"
          dot
        >
          Link {telemetry.linkQuality}%
        </MissionBadge>

        <MissionBadge
          tone={riskTone}
          variant="soft"
          size="sm"
        >
          Risk{" "}
          {telemetry.risk}
        </MissionBadge>
      </div>
    </section>
  );
}

/* =========================================================
   Telemetry Ribbon
   ========================================================= */

type TelemetryItemProps = {
  icon: LucideIcon;

  label: string;

  value:
    string | number;

  unit?: string;

  helper?: string;

  tone?: MissionTone;
};

function TelemetryItem({
  icon: Icon,
  label,
  value,
  unit,
  helper,
  tone = "default",
}: TelemetryItemProps) {
  return (
    <div
      className={[
        "flex min-w-0 items-center gap-3",

        "border-b border-(--border-soft)",

        "px-3 py-2.5",

        "sm:border-b-0",

        "xl:border-r xl:last:border-r-0",
      ].join(" ")}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-(--border-soft) bg-black">
        <Icon
          size={13}
          strokeWidth={1.6}
          className={
            toneTextClass(
              tone,
            )
          }
        />
      </div>

      <div className="min-w-0">
        <div className="font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-(--muted-soft)">
          {label}
        </div>

        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span
            className={[
              "truncate font-mono text-[15px] font-semibold tabular-nums",

              toneTextClass(
                tone,
              ),
            ].join(" ")}
          >
            {value}
          </span>

          {unit ? (
            <span className="shrink-0 font-mono text-[7px] uppercase tracking-[0.07em] text-(--muted-soft)">
              {unit}
            </span>
          ) : null}
        </div>

        {helper ? (
          <div className="mt-0.5 truncate text-[8px] text-(--muted)">
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TelemetryRibbon() {
  return (
    <MissionPanel className="overflow-hidden">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <TelemetryItem
          icon={Gauge}
          label="Altitude"
          value={
            telemetry.altitude
          }
          unit="m"
          tone="info"
          helper="Aircraft altitude"
        />

        <TelemetryItem
          icon={Navigation}
          label="Ground Speed"
          value={
            telemetry.speed
          }
          unit="m/s"
          helper="Current velocity"
        />

        <TelemetryItem
          icon={Battery}
          label="Battery"
          value={
            telemetry.battery
          }
          unit="%"
          tone={
            getBatteryTone(
              telemetry.battery,
            )
          }
          helper="Main power"
        />

        <TelemetryItem
          icon={Radio}
          label="Secure Link"
          value={
            telemetry.linkQuality
          }
          unit="%"
          tone={
            getLinkTone(
              telemetry.linkQuality,
            )
          }
          helper={`${telemetry.rssi} dBm`}
        />

        <TelemetryItem
          icon={Satellite}
          label="Navigation"
          value={
            telemetry.gpsSatellites
          }
          unit="SAT"
          tone="nominal"
          helper="GPS constellation"
        />

        <TelemetryItem
          icon={ShieldCheck}
          label="Mission Risk"
          value={
            telemetry.risk.toUpperCase()
          }
          tone={
            getRiskTone(
              telemetry.risk,
            )
          }
          helper="Operational state"
        />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Tactical Map
   ========================================================= */

function TacticalMapWorkspace() {
  return (
    <MissionPanel className="flex min-h-[520px] flex-1 flex-col overflow-hidden">
      {/* Compact map header */}

      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-(--border-soft) px-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-(--primary)">
            Tactical Operations
          </span>

          <span
            aria-hidden="true"
            className="h-3 w-px shrink-0 bg-white/10"
          />

          <span className="truncate font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted-soft)">
            Live mission map
          </span>
        </div>

        <MissionStatus
          label="Tracking"
          tone="nominal"
          pulse
          compact
        />
      </div>

      {/* Actual map */}

      <div className="relative min-h-[460px] flex-1 overflow-hidden bg-[#020304]">
        <AeroWorldMap />
      </div>

      {/* Compact map status rail */}

      <div className="flex min-h-[34px] shrink-0 flex-wrap items-center justify-between gap-3 border-t border-(--border-soft) px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <MapState
            label="Aircraft"
            value={
              telemetry.droneId
            }
          />

          <MapState
            label="Mode"
            value={
              telemetry.flightMode
            }
            tone="primary"
          />

          <MapState
            label="Heading"
            value={`${telemetry.heading}°`}
          />

          <MapState
            label="Signal"
            value={`${telemetry.rssi} dBm`}
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted-soft)">
          <Satellite
            size={10}
            strokeWidth={1.6}
            className="text-(--info)"
          />

          {
            telemetry.gpsSatellites
          }{" "}
          satellites
        </div>
      </div>
    </MissionPanel>
  );
}

function MapState({
  label,
  value,
  tone = "default",
}: {
  label: string;

  value:
    string | number;

  tone?:
    "default" |
    "primary";
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-(--muted-soft)">
        {label}
      </span>

      <span
        className={[
          "font-mono text-[8px] font-semibold uppercase",

          tone === "primary"
            ? "text-(--primary)"
            : "text-(--foreground)",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   Aircraft State
   ========================================================= */

function AircraftField({
  label,
  value,
  tone = "default",
}: {
  label: string;

  value:
    string | number;

  tone?: MissionTone;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--border-soft) py-2 last:border-b-0">
      <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.11em] text-(--muted-soft)">
        {label}
      </span>

      <span
        className={[
          "max-w-[165px] truncate text-right font-mono text-[9px] font-semibold tabular-nums",

          toneTextClass(
            tone,
          ),
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function AircraftStatePanel() {
  return (
    <MissionPanel
      padding="none"
      accent
    >
      <MissionSectionHeader
        eyebrow="Aircraft"
        title={
          telemetry.droneId
        }
        compact
        action={
          <MissionStatus
            label="Connected"
            tone="nominal"
            pulse
            compact
          />
        }
      />

      <div className="px-4 py-1">
        <AircraftField
          label="Platform"
          value={
            telemetry.model
          }
        />

        <AircraftField
          label="Flight Mode"
          value={
            telemetry.flightMode
          }
          tone="primary"
        />

        <AircraftField
          label="GPS Lock"
          value={`${telemetry.gpsSatellites} SAT`}
          tone="info"
        />

        <AircraftField
          label="Signal"
          value={`${telemetry.rssi} dBm`}
          tone={
            getLinkTone(
              telemetry.linkQuality,
            )
          }
        />

        <AircraftField
          label="ESC Thermal"
          value={`${telemetry.escTemp}°C`}
          tone={
            getThermalTone(
              telemetry.escTemp,
            )
          }
        />

        <AircraftField
          label="Risk"
          value={
            telemetry.risk.toUpperCase()
          }
          tone={
            getRiskTone(
              telemetry.risk,
            )
          }
        />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Mission Progress
   ========================================================= */

function MissionProgress() {
  const progress =
    telemetry.totalWaypoints >
    0
      ? clamp(
          Math.round(
            (
              telemetry.currentWaypoint /
              telemetry.totalWaypoints
            ) *
              100,
          ),
          0,
          100,
        )
      : 0;

  const remaining =
    Math.max(
      0,
      telemetry.totalWaypoints -
        telemetry.currentWaypoint,
    );

  return (
    <MissionPanel
      tone="primary"
      padding="md"
      accent
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mn-eyebrow">
            Route Progress
          </div>

          <div className="mt-1 text-[13px] font-medium text-(--foreground)">
            Mission execution
          </div>

          <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted)">
            WP{" "}
            {
              telemetry.currentWaypoint
            }
            {" / "}
            {
              telemetry.totalWaypoints
            }
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[21px] font-semibold tracking-[-0.04em] text-(--primary)">
            {progress}%
          </div>

          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-(--muted-soft)">
            Complete
          </div>
        </div>
      </div>

      <div className="mt-3.5 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-(--primary) transition-[width] duration-300"
          style={{
            width:
              `${progress}%`,
          }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted-soft)">
        <span>
          WP{" "}
          {
            telemetry.currentWaypoint
          }
        </span>

        <span>
          {remaining} remaining
        </span>
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Alerts
   ========================================================= */

function AlertsWorkspace() {
  return (
    <MissionPanel padding="none">
      <MissionSectionHeader
        eyebrow="Event Stream"
        title="Active Alerts"
        compact
        action={
          <MissionBadge
            tone="caution"
            variant="outline"
            size="sm"
          >
            Live
          </MissionBadge>
        }
      />

      <div className="p-2.5">
        <AlertsPanel />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Data Sources
   ========================================================= */

function DataSourcesWorkspace() {
  return (
    <MissionPanel padding="none">
      <MissionSectionHeader
        eyebrow="Data Link"
        title="Mission Sources"
        compact
      />

      <div className="p-2.5">
        <DataSourcePanel />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Command Deck

   Intentionally shallow.

   CommandDeck keeps its existing operational functionality;
   this page only controls the V2 placement and spacing.
   ========================================================= */

function CommandWorkspace() {
  return (
    <MissionPanel
      tone="primary"
      padding="none"
      accent
      className="shrink-0"
    >
      <div className="flex min-h-[42px] items-center justify-between gap-4 border-b border-(--border-soft) px-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div>
            <div className="font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-(--primary)">
              Flight Commands
            </div>

            <div className="mt-0.5 text-[12px] font-medium text-(--foreground)">
              Action Console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MissionStatus
            label="Authority Active"
            tone="nominal"
            compact
          />

          <MissionBadge
            tone="primary"
            variant="outline"
            size="sm"
          >
            {
              telemetry.flightMode
            }
          </MissionBadge>
        </div>
      </div>

      <div className="p-2.5">
        <CommandDeck />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Bottom Operational State
   ========================================================= */

function OperationalState({
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

  tone: MissionTone;
}) {
  return (
    <MissionPanel
      tone={tone}
      padding="sm"
      accent
      className="min-w-0"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-(--border-soft) bg-black">
          <Icon
            size={13}
            strokeWidth={1.6}
            className={
              toneTextClass(
                tone,
              )
            }
          />
        </div>

        <div className="min-w-0">
          <div className="font-mono text-[7px] font-semibold uppercase tracking-[0.11em] text-(--muted-soft)">
            {label}
          </div>

          <div className="mt-0.5 truncate font-mono text-[10px] font-semibold text-(--foreground)">
            {value}
          </div>

          <div className="mt-0.5 truncate text-[8px] text-(--muted)">
            {helper}
          </div>
        </div>
      </div>
    </MissionPanel>
  );
}

function OperationalStateStrip() {
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <OperationalState
        icon={Route}
        label="Mission"
        value={
          telemetry.mission
        }
        helper="Active route profile"
        tone="primary"
      />

      <OperationalState
        icon={Satellite}
        label="Navigation"
        value={`${telemetry.gpsSatellites} SAT`}
        helper="GPS constellation lock"
        tone="info"
      />

      <OperationalState
        icon={Radio}
        label="Telemetry"
        value={`${telemetry.rssi} dBm`}
        helper="Secure communication signal"
        tone={
          getLinkTone(
            telemetry.linkQuality,
          )
        }
      />

      <OperationalState
        icon={Thermometer}
        label="Aircraft Thermal"
        value={`${telemetry.escTemp}°C`}
        helper={
          telemetry.escTemp >= 55
            ? "Thermal state under watch"
            : "Thermal state nominal"
        }
        tone={
          getThermalTone(
            telemetry.escTemp,
          )
        }
      />

      <OperationalState
        icon={ShieldCheck}
        label="Operational Risk"
        value={
          telemetry.risk.toUpperCase()
        }
        helper="Current mission assessment"
        tone={
          getRiskTone(
            telemetry.risk,
          )
        }
      />
    </section>
  );
}

/* =========================================================
   Main Page
   ========================================================= */

export function LiveOps() {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-(--background)">
      {/*
        Wider than ordinary content pages because this is
        MissionNexus's primary command workspace.
      */}

      <div className="mx-auto w-full max-w-[1920px] px-3 py-3 sm:px-4 lg:px-5 2xl:px-6">
        {/* ===============================================
            Mission identity
            =============================================== */}

        <MissionIdentityBar />

        {/* ===============================================
            Telemetry
            =============================================== */}

        <div className="mt-3">
          <TelemetryRibbon />
        </div>

        {/* ===============================================
            Main mission workspace

            1fr + 320 px gives the tactical map clear visual
            priority while keeping the operational rail dense.
            =============================================== */}

        <section className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* =============================================
              Primary workspace
              ============================================= */}

          <div className="flex min-w-0 flex-col gap-3">
            <TacticalMapWorkspace />

            <CommandWorkspace />
          </div>

          {/* =============================================
              Operational rail
              ============================================= */}

          <aside className="grid min-w-0 content-start gap-3">
            <AircraftStatePanel />

            <MissionProgress />

            <AlertsWorkspace />

            <DataSourcesWorkspace />
          </aside>
        </section>

        {/* ===============================================
            Operational system strip

            IMPORTANT:
            five tiles = five desktop columns.
            This fixes the LOW RISK tile wrapping onto a
            second row in the current video.
            =============================================== */}

        <div className="mt-3">
          <OperationalStateStrip />
        </div>
      </div>
    </div>
  );
}