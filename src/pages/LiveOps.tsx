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

   Primary operational workspace.

   Layout philosophy:
   - GeoFusion-like information density
   - viewport-filling tactical workspace
   - dominant map
   - compact telemetry ribbon
   - bounded operational rail
   - command controls directly connected to map
   ========================================================= */

/* =========================================================
   Helpers
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
  value: number,
): MissionTone {
  if (
    value <= 20
  ) {
    return "critical";
  }

  if (
    value <= 40
  ) {
    return "caution";
  }

  return "nominal";
}

function getLinkTone(
  value: number,
): MissionTone {
  if (
    value < 55
  ) {
    return "critical";
  }

  if (
    value < 75
  ) {
    return "caution";
  }

  return "nominal";
}

function getTemperatureTone(
  value: number,
): MissionTone {
  if (
    value >= 70
  ) {
    return "critical";
  }

  if (
    value >= 55
  ) {
    return "caution";
  }

  return "nominal";
}

function getToneTextClass(
  tone: MissionTone,
) {
  if (
    tone === "primary"
  ) {
    return "text-(--primary)";
  }

  if (
    tone === "info"
  ) {
    return "text-(--info)";
  }

  if (
    tone === "nominal"
  ) {
    return "text-(--nominal)";
  }

  if (
    tone === "caution"
  ) {
    return "text-(--caution)";
  }

  if (
    tone === "critical"
  ) {
    return "text-(--critical)";
  }

  if (
    tone === "muted"
  ) {
    return "text-(--muted)";
  }

  return "text-(--foreground)";
}

/* =========================================================
   Mission Header Strip
   ========================================================= */

function MissionIdentityBar() {
  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

  return (
    <section className="flex shrink-0 flex-col gap-3 border-b border-(--border-soft) pb-3 lg:flex-row lg:items-center lg:justify-between">
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

          <span className="font-mono text-[8px] font-medium uppercase tracking-[0.08em] text-(--muted)">
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
          Risk {telemetry.risk}
        </MissionBadge>
      </div>
    </section>
  );
}

/* =========================================================
   Telemetry Ribbon
   ========================================================= */

type TelemetryRibbonItemProps = {
  icon: LucideIcon;

  label: string;

  value: string | number;

  unit?: string;

  tone?: MissionTone;

  helper?: string;
};

function TelemetryRibbonItem({
  icon: Icon,
  label,
  value,
  unit,
  tone = "default",
  helper,
}: TelemetryRibbonItemProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-(--border-soft) px-3 py-2.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-(--border-soft) bg-black">
        <Icon
          size={13}
          strokeWidth={1.6}
          className={
            getToneTextClass(
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
              "font-mono text-[15px] font-semibold tabular-nums",
              getToneTextClass(
                tone,
              ),
            ].join(" ")}
          >
            {value}
          </span>

          {unit ? (
            <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-(--muted-soft)">
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
  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

  return (
    <MissionPanel className="shrink-0">
      <div className="grid sm:grid-cols-3 xl:grid-cols-6">
        <TelemetryRibbonItem
          icon={Gauge}
          label="Altitude"
          value={telemetry.altitude}
          unit="m"
          tone="info"
          helper="Aircraft altitude"
        />

        <TelemetryRibbonItem
          icon={Navigation}
          label="Ground Speed"
          value={telemetry.speed}
          unit="m/s"
          helper="Current velocity"
        />

        <TelemetryRibbonItem
          icon={Battery}
          label="Battery"
          value={telemetry.battery}
          unit="%"
          tone={
            getBatteryTone(
              telemetry.battery,
            )
          }
          helper="Main propulsion pack"
        />

        <TelemetryRibbonItem
          icon={Radio}
          label="Secure Link"
          value={telemetry.linkQuality}
          unit="%"
          tone={
            getLinkTone(
              telemetry.linkQuality,
            )
          }
          helper={`${telemetry.rssi} dBm`}
        />

        <TelemetryRibbonItem
          icon={Satellite}
          label="Navigation"
          value={telemetry.gpsSatellites}
          unit="SAT"
          tone="nominal"
          helper="GPS constellation"
        />

        <TelemetryRibbonItem
          icon={ShieldCheck}
          label="Mission Risk"
          value={
            telemetry.risk.toUpperCase()
          }
          tone={riskTone}
          helper="Operational assessment"
        />
      </div>
    </MissionPanel>
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

  value: string | number;

  tone?: MissionTone;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--border-soft) py-2.5 last:border-b-0">
      <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.11em] text-(--muted-soft)">
        {label}
      </span>

      <span
        className={[
          "max-w-[160px] truncate text-right font-mono text-[9px] font-semibold tabular-nums",
          getToneTextClass(
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
        title={telemetry.droneId}
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
          value={telemetry.model}
        />

        <AircraftField
          label="Flight Mode"
          value={telemetry.flightMode}
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
            getTemperatureTone(
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
   Route Progress
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

          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted)">
            Waypoint{" "}
            {telemetry.currentWaypoint}
            {" / "}
            {telemetry.totalWaypoints}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[22px] font-semibold tracking-[-0.04em] text-(--primary)">
            {progress}%
          </div>

          <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-(--muted-soft)">
            Complete
          </div>
        </div>
      </div>

      <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-(--primary)"
          style={{
            width:
              `${progress}%`,
          }}
        />
      </div>

      <div className="mt-3 flex justify-between font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted-soft)">
        <span>
          WP {telemetry.currentWaypoint}
        </span>

        <span>
          {remaining} remaining
        </span>
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Tactical Map
   ========================================================= */

function TacticalMapWorkspace() {
  return (
    <MissionPanel className="flex min-h-[500px] flex-1 flex-col xl:min-h-0">
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-(--border-soft) px-3.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-(--primary)">
            Tactical Operations
          </span>

          <span className="h-3 w-px bg-white/10" />

          <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted-soft)">
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

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#020304]">
        <AeroWorldMap />
      </div>

      <div className="flex min-h-[34px] shrink-0 flex-wrap items-center justify-between gap-3 border-t border-(--border-soft) px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-5">
          <MapState
            label="Aircraft"
            value={telemetry.droneId}
          />

          <MapState
            label="Mode"
            value={telemetry.flightMode}
            tone="primary"
          />

          <MapState
            label="Heading"
            value={`${telemetry.heading}°`}
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.08em] text-(--muted-soft)">
          <Satellite
            size={10}
            strokeWidth={1.6}
            className="text-(--info)"
          />

          {telemetry.gpsSatellites} satellites
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

  value: string | number;

  tone?:
    | "default"
    | "primary";
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
   Command Workspace
   ========================================================= */

function CommandWorkspace() {
  return (
    <MissionPanel
      tone="primary"
      padding="none"
      accent
      className="shrink-0"
    >
      <MissionSectionHeader
        eyebrow="Aircraft Command"
        title="Action Console"
        compact
        action={
          <div className="flex items-center gap-2">
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
              {telemetry.flightMode}
            </MissionBadge>
          </div>
        }
      />

      <div className="p-3">
        <CommandDeck />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Right Rail Panels
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

      <div className="p-3">
        <AlertsPanel />
      </div>
    </MissionPanel>
  );
}

function DataWorkspace() {
  return (
    <MissionPanel padding="none">
      <MissionSectionHeader
        eyebrow="Data Link"
        title="Mission Sources"
        compact
      />

      <div className="p-3">
        <DataSourcePanel />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Bottom Operational States
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
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-(--border-soft) bg-black">
          <Icon
            size={13}
            strokeWidth={1.6}
            className={
              getToneTextClass(
                tone,
              )
            }
          />
        </div>

        <div className="min-w-0">
          <div className="font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-(--muted-soft)">
            {label}
          </div>

          <div className="mt-1 truncate font-mono text-[10px] font-semibold text-(--foreground)">
            {value}
          </div>

          <div className="mt-1 truncate text-[8px] text-(--muted)">
            {helper}
          </div>
        </div>
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Main Page
   ========================================================= */

export function LiveOps() {
  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

  return (
    <div className="min-h-[calc(100vh-70px)] bg-(--background)">
      {/*
        Desktop:
        Fill the available browser viewport.

        Mobile/tablet:
        Allow normal document flow and scrolling.
      */}

      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-3 px-3 py-3 sm:px-4 lg:px-5 xl:h-[calc(100vh-70px)] xl:min-h-[760px] xl:overflow-hidden">

        {/* ===============================================
            Mission identity
            =============================================== */}

        <MissionIdentityBar />

        {/* ===============================================
            Telemetry ribbon
            =============================================== */}

        <TelemetryRibbon />

        {/* ===============================================
            Main viewport
            =============================================== */}

        <div className="grid min-h-0 flex-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* =============================================
              Map + commands
              ============================================= */}

          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <TacticalMapWorkspace />

            <CommandWorkspace />
          </div>

          {/* =============================================
              Operational rail
              ============================================= */}

          <aside className="grid min-w-0 content-start gap-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <AircraftStatePanel />

            <MissionProgress />

            <AlertsWorkspace />

            <DataWorkspace />
          </aside>
        </div>

        {/* ===============================================
            Compact system strip

            On large desktop this stays at the lower edge
            of the workspace rather than floating in empty
            black space.
            =============================================== */}

        <section className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <OperationalState
            icon={Route}
            label="Mission"
            value={telemetry.mission}
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
              getTemperatureTone(
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
            tone={riskTone}
          />
        </section>
      </div>
    </div>
  );
}