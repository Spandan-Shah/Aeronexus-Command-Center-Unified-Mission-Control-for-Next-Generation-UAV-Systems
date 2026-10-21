import {
  Database,
  Radio,
  Server,
  ShieldCheck,
} from "lucide-react";

import {
  telemetry as fallbackTelemetry,
} from "../../data/telemetry";

import {
  useUnifiedTelemetry,
} from "../../hooks/useUnifiedTelemetry";

import {
  MissionBadge,
  MissionStatus,
} from "../ui/mission";

/* =========================================================
   MissionNexus V2
   Data Source Panel

   Compact operational source/status presentation inspired by
   the GeoFusion observation-source treatment.

   Goals:
   - no large nested cards
   - immediately show live vs fallback state
   - distinguish transport, backend and aircraft source
   - preserve graceful operation when backend is unavailable
   ========================================================= */

type SourceTone =
  | "default"
  | "primary"
  | "info"
  | "nominal"
  | "caution"
  | "critical"
  | "muted";

type SourceRowProps = {
  label: string;

  value: string;

  helper?: string;

  icon:
    typeof Database;

  tone?:
    SourceTone;

  badge?: string;
};

/* =========================================================
   Source Row
   ========================================================= */

function SourceRow({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
  badge,
}: SourceRowProps) {
  const iconClass =
    tone === "primary"
      ? "text-(--primary)"
      : tone === "info"
        ? "text-(--info)"
        : tone === "nominal"
          ? "text-(--nominal)"
          : tone === "caution"
            ? "text-(--caution)"
            : tone === "critical"
              ? "text-(--critical)"
              : "text-(--muted)";

  return (
    <div className="flex items-start gap-3 border-b border-(--border-soft) py-3 first:pt-0 last:border-b-0 last:pb-0">
      {/* ===============================================
          Icon
          =============================================== */}

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-(--border-soft) bg-black">
        <Icon
          size={13}
          strokeWidth={1.6}
          className={iconClass}
        />
      </div>

      {/* ===============================================
          Content
          =============================================== */}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.12em] text-(--muted-soft)">
            {label}
          </span>

          {badge ? (
            <MissionBadge
              tone={
                tone
              }
              variant="outline"
              size="sm"
            >
              {badge}
            </MissionBadge>
          ) : null}
        </div>

        <div className="mt-1 truncate text-[11px] font-medium text-(--foreground)">
          {value}
        </div>

        {helper ? (
          <div className="mt-1 text-[9px] leading-relaxed text-(--muted)">
            {helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* =========================================================
   Component
   ========================================================= */

export function DataSourcePanel() {
  const {
    telemetry,
  } =
    useUnifiedTelemetry();

  const liveTelemetryAvailable =
    telemetry !== null &&
    telemetry !== undefined;

  /* =======================================================
     Derived source state
     ======================================================= */

  const sourceName =
    liveTelemetryAvailable
      ? "Unified Telemetry"
      : "Local Telemetry Fallback";

  const sourceDescription =
    liveTelemetryAvailable
      ? "Runtime aircraft data is being received through the unified telemetry layer."
      : "MissionNexus is using the shared local telemetry dataset until the live source becomes available.";

  const transportName =
    liveTelemetryAvailable
      ? "Live Data Channel"
      : "Local Application State";

  const backendState =
    liveTelemetryAvailable
      ? "Connected"
      : "Standby";

  const aircraftIdentity =
    fallbackTelemetry.droneId;

  const missionIdentity =
    fallbackTelemetry.mission;

  return (
    <div className="grid gap-0">
      {/* ===================================================
          Overall source status
          =================================================== */}

      <div className="mb-3 flex items-center justify-between gap-3 border-b border-(--border-soft) pb-3">
        <MissionStatus
          label={
            liveTelemetryAvailable
              ? "Live Source"
              : "Fallback Source"
          }
          detail={
            liveTelemetryAvailable
              ? "Unified telemetry active"
              : "Local data active"
          }
          tone={
            liveTelemetryAvailable
              ? "nominal"
              : "caution"
          }
          pulse={
            liveTelemetryAvailable
          }
        />

        <MissionBadge
          tone={
            liveTelemetryAvailable
              ? "nominal"
              : "caution"
          }
          variant="soft"
          size="sm"
        >
          {liveTelemetryAvailable
            ? "LIVE"
            : "FALLBACK"}
        </MissionBadge>
      </div>

      {/* ===================================================
          Telemetry source
          =================================================== */}

      <SourceRow
        icon={
          Database
        }
        label="Telemetry Source"
        value={
          sourceName
        }
        helper={
          sourceDescription
        }
        tone={
          liveTelemetryAvailable
            ? "nominal"
            : "caution"
        }
      />

      {/* ===================================================
          Transport
          =================================================== */}

      <SourceRow
        icon={
          Radio
        }
        label="Transport"
        value={
          transportName
        }
        helper={
          liveTelemetryAvailable
            ? "Aircraft telemetry is available to the mission workspace."
            : "Runtime source unavailable; operational fallback remains active."
        }
        tone={
          liveTelemetryAvailable
            ? "info"
            : "muted"
        }
        badge={
          liveTelemetryAvailable
            ? "ACTIVE"
            : "LOCAL"
        }
      />

      {/* ===================================================
          Backend state
          =================================================== */}

      <SourceRow
        icon={
          Server
        }
        label="Backend"
        value={
          backendState
        }
        helper={
          liveTelemetryAvailable
            ? "Mission data pipeline is responding."
            : "Waiting for the live telemetry pipeline."
        }
        tone={
          liveTelemetryAvailable
            ? "nominal"
            : "caution"
        }
      />

      {/* ===================================================
          Bound mission context
          =================================================== */}

      <SourceRow
        icon={
          ShieldCheck
        }
        label="Mission Context"
        value={`${aircraftIdentity} · ${missionIdentity}`}
        helper="Operational data is bound to the currently selected aircraft and mission."
        tone="primary"
        badge="BOUND"
      />
    </div>
  );
}