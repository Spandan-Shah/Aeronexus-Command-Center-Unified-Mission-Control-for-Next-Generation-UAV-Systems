import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Waves,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Panel,
} from "../common/Panel";

import {
  useUnifiedTelemetry,
} from "../../hooks/useUnifiedTelemetry";

type AiAnalyticsPanelProps = {
  embedded?: boolean;
};

function getRiskClass(
  risk?: string,
) {
  if (
    risk === "critical"
  ) {
    return "text-[#FF5A63]";
  }

  if (
    risk === "high"
  ) {
    return "text-[#F6B23C]";
  }

  if (
    risk === "medium"
  ) {
    return "text-[#5AA9FF]";
  }

  return "text-[#59D99A]";
}

function DetectionStatus({
  label,
  active,
  icon: Icon,
  tone,
}: {
  label: string;
  active: boolean;
  icon: LucideIcon;

  tone:
    | "info"
    | "critical"
    | "caution";
}) {
  const activeClass =
    tone === "critical"
      ? "border-[rgba(255,90,99,0.3)] bg-[rgba(255,90,99,0.055)] text-[#FF5A63]"
      : tone === "caution"
        ? "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.055)] text-[#F6B23C]"
        : "border-[rgba(90,169,255,0.28)] bg-[rgba(90,169,255,0.055)] text-[#5AA9FF]";

  return (
    <div
      className={[
        "rounded-[4px] border p-2",
        active
          ? activeClass
          : "border-white/[0.07] bg-[#05060d] text-white/28",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon size={13} />

        <span
          className={[
            "font-mono text-[7px] font-semibold uppercase tracking-[0.05em]",
            active
              ? ""
              : "text-[#59D99A]",
          ].join(" ")}
        >
          {active
            ? "DETECTED"
            : "CLEAR"}
        </span>
      </div>

      <div className="mt-2 truncate text-[10px] font-medium text-white/72">
        {label}
      </div>
    </div>
  );
}

export function AiAnalyticsPanel({
  embedded = false,
}: AiAnalyticsPanelProps) {
  const {
    telemetry,
    error,
  } =
    useUnifiedTelemetry();

  const ml =
    telemetry?.ml;

  const risk =
    telemetry?.risk ??
    "low";

  const confidence =
    Math.round(
      (
        ml?.confidence ??
        0
      ) *
        100,
    );

  const personDetected =
    Boolean(
      ml?.person,
    );

  const fireDetected =
    Boolean(
      ml?.fire,
    );

  const smokeDetected =
    Boolean(
      ml?.smoke,
    );

  const threatDetected =
    personDetected ||
    fireDetected ||
    smokeDetected;

  const content = (
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        <DetectionStatus
          label="Person"
          active={
            personDetected
          }
          icon={
            UserRound
          }
          tone="info"
        />

        <DetectionStatus
          label="Fire"
          active={
            fireDetected
          }
          icon={
            Flame
          }
          tone="critical"
        />

        <DetectionStatus
          label="Smoke"
          active={
            smokeDetected
          }
          icon={
            Waves
          }
          tone="caution"
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[4px] border border-white/[0.07] bg-[#05060d] px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.055em] text-white/32">
              AI Confidence
            </span>

            <span className="font-mono text-[11px] font-semibold text-[#5AA9FF]">
              {confidence}%
            </span>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-[#5AA9FF]"
              style={{
                width:
                  `${confidence}%`,
              }}
            />
          </div>
        </div>

        {threatDetected ? (
          <ShieldAlert
            size={18}
            className="shrink-0 text-[#FF5A63]"
          />
        ) : (
          <ShieldCheck
            size={18}
            className="shrink-0 text-[#59D99A]"
          />
        )}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-[4px] border border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.05)] px-2.5 py-2 text-[9px] leading-[1.45] text-[#FF5A63]">
          <AlertTriangle
            size={11}
            className="mt-0.5 shrink-0"
          />

          Backend offline:{" "}
          {error}
        </div>
      ) : null}
    </div>
  );

  if (
    embedded
  ) {
    return content;
  }

  return (
    <Panel
      title="AI Detection Analytics"
      right={
        <span
          className={[
            "font-mono text-[9px] font-semibold uppercase",
            getRiskClass(
              risk,
            ),
          ].join(" ")}
        >
          {risk}
        </span>
      }
    >
      <div className="p-3">
        {content}
      </div>
    </Panel>
  );
}