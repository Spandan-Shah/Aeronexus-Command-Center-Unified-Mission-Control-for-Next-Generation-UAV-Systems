import {
  Battery,
  Gauge,
  Navigation,
  Radio,
  Route,
  Satellite,
  ShieldCheck,
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
  MissionMetric,
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

   Design principles:
   - GeoFusion-family density
   - map-first operational workspace
   - compact mission identity
   - restrained graphite surfaces
   - semantic status colors
   - no oversized dashboard header
   ========================================================= */

function getRiskTone(
  risk: string,
): MissionTone {
  const normalized =
    risk.toLowerCase();

  if (
    normalized ===
    "critical"
  ) {
    return "critical";
  }

  if (
    normalized ===
    "high"
  ) {
    return "critical";
  }

  if (
    normalized ===
    "medium"
  ) {
    return "caution";
  }

  return "nominal";
}

function AircraftField({
  label,
  value,
  tone = "default",
}: {
  label: string;

  value:
    string | number;

  tone?:
    MissionTone;
}) {
  const valueClass =
    tone === "primary"
      ? "text-(--primary)"
      : tone === "nominal"
        ? "text-(--nominal)"
        : tone === "info"
          ? "text-(--info)"
          : tone === "caution"
            ? "text-(--caution)"
            : tone === "critical"
              ? "text-(--critical)"
              : "text-(--foreground)";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--border-soft) py-2.5 last:border-b-0">
      <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-(--muted-soft)">
        {label}
      </span>

      <span
        className={[
          "max-w-[170px] truncate text-right font-mono text-[10px] font-semibold tabular-nums",
          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function MissionProgress({
  progress,
}: {
  progress: number;
}) {
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

          <div className="mt-1 text-[14px] font-medium text-(--foreground)">
            Mission execution
          </div>

          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.07em] text-(--muted)">
            Waypoint{" "}
            {
              telemetry.currentWaypoint
            }{" "}
            of{" "}
            {
              telemetry.totalWaypoints
            }
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-[22px] font-semibold tracking-[-0.04em] text-(--primary)">
            {progress}%
          </div>

          <div className="mt-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-(--muted-soft)">
            Complete
          </div>
        </div>
      </div>

      <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-(--primary) transition-[width] duration-300"
          style={{
            width:
              `${progress}%`,
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted-soft)">
        <span>
          WP{" "}
          {
            telemetry.currentWaypoint
          }
        </span>

        <span>
          {
            telemetry.totalWaypoints -
            telemetry.currentWaypoint
          }{" "}
          remaining
        </span>
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Mission Identity Strip

   Intentionally much more compact than a normal page header.
   Live Operations should feel like GeoFusion's map workspace,
   not a dashboard landing page.
   ========================================================= */

function MissionIdentityStrip() {
  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

  return (
    <div className="flex flex-col gap-4 border-b border-(--border-soft) pb-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mn-eyebrow">
            Operations · Active Mission
          </span>

          <span className="h-3 w-px bg-white/10" />

          <MissionStatus
            label="Mission Live"
            tone="nominal"
            pulse
            compact
          />
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1
            className="text-[22px] font-normal tracking-[-0.035em] text-(--foreground)"
            style={{
              fontFamily:
                '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Live Operations
          </h1>

          <div className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-(--muted)">
            {
              telemetry.mission
            }
            {" · "}
            {
              telemetry.droneId
            }
            {" · "}
            {
              telemetry.flightMode
            }
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MissionBadge
          tone="info"
          variant="outline"
          size="md"
        >
          GPS{" "}
          {
            telemetry.gpsSatellites
          }
        </MissionBadge>

        <MissionBadge
          tone={
            telemetry.linkQuality >=
            80
              ? "nominal"
              : "caution"
          }
          variant="outline"
          size="md"
          dot
        >
          Link{" "}
          {
            telemetry.linkQuality
          }%
        </MissionBadge>

        <MissionBadge
          tone={
            riskTone
          }
          variant="soft"
          size="md"
        >
          Risk{" "}
          {
            telemetry.risk
          }
        </MissionBadge>
      </div>
    </div>
  );
}

/* =========================================================
   Map Workspace
   ========================================================= */

function TacticalMapWorkspace() {
  return (
    <MissionPanel
      tone="default"
      className="flex h-[560px] min-h-0 flex-col lg:h-[650px] xl:h-[calc(100vh-285px)] xl:min-h-[640px] xl:max-h-[820px]"
    >
      <MissionSectionHeader
        eyebrow="Mission Workspace"
        title="Tactical Operations Map"
        description="Live aircraft position, route context and mission-area awareness."
        compact
        action={
          <MissionStatus
            label="Map Live"
            detail="Aircraft tracking"
            tone="nominal"
            pulse
          />
        }
      />

      <div className="relative min-h-0 flex-1 bg-[#020304]">
        <AeroWorldMap />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border-soft) px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <MapFooterItem
            label="Aircraft"
            value={
              telemetry.droneId
            }
          />

          <MapFooterItem
            label="Mode"
            value={
              telemetry.flightMode
            }
            tone="primary"
          />

          <MapFooterItem
            label="Heading"
            value={`${telemetry.heading}°`}
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted-soft)">
          <Satellite
            size={11}
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

function MapFooterItem({
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
      <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.11em] text-(--muted-soft)">
        {label}
      </span>

      <span
        className={[
          "font-mono text-[9px] font-semibold uppercase",

          tone ===
          "primary"
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

function AircraftStatePanel() {
  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

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
        />

        <AircraftField
          label="ESC Thermal"
          value={`${telemetry.escTemp}°C`}
          tone={
            telemetry.escTemp >=
            70
              ? "critical"
              : telemetry.escTemp >=
                  55
                ? "caution"
                : "nominal"
          }
        />

        <AircraftField
          label="Risk State"
          value={
            telemetry.risk.toUpperCase()
          }
          tone={
            riskTone
          }
        />
      </div>
    </MissionPanel>
  );
}

/* =========================================================
   Page
   ========================================================= */

export function LiveOps() {
  const rawProgress =
    telemetry.totalWaypoints >
    0
      ? (
          telemetry.currentWaypoint /
          telemetry.totalWaypoints
        ) *
        100
      : 0;

  const missionProgress =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          rawProgress,
        ),
      ),
    );

  const riskTone =
    getRiskTone(
      telemetry.risk,
    );

  return (
    <div className="min-h-[calc(100vh-70px)] bg-(--background)">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-5 sm:px-6 lg:px-10 2xl:px-14">

        {/* ===============================================
            Compact mission identity
            =============================================== */}

        <MissionIdentityStrip />

        {/* ===============================================
            Primary telemetry strip
            =============================================== */}

        <section className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <MissionMetric
            label="Altitude"
            value={
              telemetry.altitude
            }
            unit="m"
            icon={Gauge}
            tone="info"
            compact
          />

          <MissionMetric
            label="Ground Speed"
            value={
              telemetry.speed
            }
            unit="m/s"
            icon={Navigation}
            tone="default"
            compact
          />

          <MissionMetric
            label="Battery"
            value={
              telemetry.battery
            }
            unit="%"
            icon={Battery}
            tone={
              telemetry.battery <=
              25
                ? "critical"
                : telemetry.battery <=
                    40
                  ? "caution"
                  : "nominal"
            }
            compact
          />

          <MissionMetric
            label="Secure Link"
            value={
              telemetry.linkQuality
            }
            unit="%"
            icon={Radio}
            tone={
              telemetry.linkQuality >=
              80
                ? "nominal"
                : telemetry.linkQuality >=
                    60
                  ? "caution"
                  : "critical"
            }
            compact
          />

          <MissionMetric
            label="Mission Risk"
            value={
              telemetry.risk.toUpperCase()
            }
            icon={ShieldCheck}
            tone={
              riskTone
            }
            compact
            valueClassName="text-[15px]"
          />
        </section>

        {/* ===============================================
            Main operations workspace
            =============================================== */}

        <section className="mt-4 grid items-start gap-3 xl:grid-cols-12">

          {/* Map */}

          <div className="min-w-0 xl:col-span-9">
            <TacticalMapWorkspace />
          </div>

          {/* Operational rail */}

          <aside className="grid min-w-0 gap-3 xl:col-span-3">
            <AircraftStatePanel />

            <MissionProgress
              progress={
                missionProgress
              }
            />

            <MissionPanel
              padding="none"
            >
              <MissionSectionHeader
                eyebrow="Data Link"
                title="Mission Sources"
                compact
              />

              <div className="p-3">
                <DataSourcePanel />
              </div>
            </MissionPanel>

            <MissionPanel
              padding="none"
            >
              <MissionSectionHeader
                eyebrow="Event Stream"
                title="Active Alerts"
                compact
                action={
                  <MissionBadge
                    tone="caution"
                    variant="outline"
                  >
                    Live
                  </MissionBadge>
                }
              />

              <div className="p-3">
                <AlertsPanel />
              </div>
            </MissionPanel>
          </aside>
        </section>

        {/* ===============================================
            Command operations
            =============================================== */}

        <section className="mt-3">
          <MissionPanel
            tone="primary"
            padding="none"
            accent
          >
            <MissionSectionHeader
              eyebrow="Aircraft Command"
              title="Mission Command Deck"
              description="Validated aircraft actions for the active mission session."
              compact
              action={
                <div className="flex items-center gap-3">
                  <MissionStatus
                    label="Authority Active"
                    tone="nominal"
                    compact
                  />

                  <MissionBadge
                    tone="primary"
                    variant="outline"
                  >
                    {
                      telemetry.flightMode
                    }
                  </MissionBadge>
                </div>
              }
            />

            <div className="p-3">
              <CommandDeck />
            </div>
          </MissionPanel>
        </section>

        {/* ===============================================
            Lower mission strip
            =============================================== */}

        <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OperationalState
            icon={
              Route
            }
            label="Mission"
            value={
              telemetry.mission
            }
            helper="Active route profile"
            tone="primary"
          />

          <OperationalState
            icon={
              Satellite
            }
            label="Navigation"
            value={`${telemetry.gpsSatellites} SAT`}
            helper="GPS constellation lock"
            tone="info"
          />

          <OperationalState
            icon={
              Radio
            }
            label="Telemetry"
            value={`${telemetry.rssi} dBm`}
            helper="Secure communication signal"
            tone={
              telemetry.linkQuality >=
              80
                ? "nominal"
                : "caution"
            }
          />

          <OperationalState
            icon={
              ShieldCheck
            }
            label="Operational State"
            value={
              telemetry.risk.toUpperCase()
            }
            helper="Current mission risk assessment"
            tone={
              riskTone
            }
          />
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   Lower State Tile
   ========================================================= */

function OperationalState({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon:
    typeof Route;

  label:
    string;

  value:
    string;

  helper:
    string;

  tone:
    MissionTone;
}) {
  return (
    <MissionPanel
      tone={
        tone
      }
      padding="sm"
      accent
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-(--border-soft) bg-black">
          <Icon
            size={13}
            strokeWidth={1.6}
            className={
              tone ===
              "primary"
                ? "text-(--primary)"
                : tone ===
                    "info"
                  ? "text-(--info)"
                  : tone ===
                      "nominal"
                    ? "text-(--nominal)"
                    : tone ===
                        "caution"
                      ? "text-(--caution)"
                      : tone ===
                          "critical"
                        ? "text-(--critical)"
                        : "text-(--muted)"
            }
          />
        </div>

        <div className="min-w-0">
          <div className="font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-(--muted-soft)">
            {label}
          </div>

          <div className="mt-1 truncate font-mono text-[11px] font-semibold text-(--foreground)">
            {value}
          </div>

          <div className="mt-1 text-[9px] leading-relaxed text-(--muted)">
            {helper}
          </div>
        </div>
      </div>
    </MissionPanel>
  );
}