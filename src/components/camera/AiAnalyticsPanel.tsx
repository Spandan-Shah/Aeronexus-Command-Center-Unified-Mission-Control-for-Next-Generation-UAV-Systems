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

type DetectionTone =
  | "info"
  | "critical"
  | "caution";

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
  tone: DetectionTone;
}) {
  const activeClasses =
    tone === "critical"
      ? "border-[rgba(255,90,99,0.30)] bg-[rgba(255,90,99,0.055)]"
      : tone === "caution"
        ? "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.055)]"
        : "border-[rgba(90,169,255,0.28)] bg-[rgba(90,169,255,0.055)]";

  const iconClasses =
    tone === "critical"
      ? "text-[#FF5A63]"
      : tone === "caution"
        ? "text-[#F6B23C]"
        : "text-[#5AA9FF]";

  return (
    <div
      className={[
        "flex min-h-[66px] flex-col justify-between",
        "rounded-[5px] border",
        "px-2.5 py-2.5",
        active
          ? activeClasses
          : "border-white/[0.07] bg-[#05060d]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon
          size={15}
          strokeWidth={1.65}
          className={
            active
              ? iconClasses
              : "text-white/32"
          }
        />

        <span
          className={[
            "font-mono text-[9px] font-semibold uppercase tracking-[0.045em]",
            active
              ? iconClasses
              : "text-[#59D99A]",
          ].join(" ")}
        >
          {active
            ? "Detected"
            : "Clear"}
        </span>
      </div>

      <div className="mt-2 text-[11px] font-medium text-white/78">
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
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
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

      <div className="flex min-h-[58px] items-center justify-between gap-4 rounded-[5px] border border-white/[0.08] bg-[#05060d] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.045em] text-white/42">
              AI Confidence
            </span>

            <span className="font-mono text-[14px] font-semibold text-[#5AA9FF]">
              {confidence}%
            </span>
          </div>

          <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#5AA9FF]"
              style={{
                width:
                  `${Math.max(
                    0,
                    Math.min(
                      100,
                      confidence,
                    ),
                  )}%`,
              }}
            />
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-white/[0.08] bg-white/[0.015]">
          {threatDetected ? (
            <ShieldAlert
              size={18}
              strokeWidth={1.65}
              className="text-[#FF5A63]"
            />
          ) : (
            <ShieldCheck
              size={18}
              strokeWidth={1.65}
              className="text-[#59D99A]"
            />
          )}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-[5px] border border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.05)] px-3 py-2.5 text-[10px] leading-[1.5] text-[#FF5A63]">
          <AlertTriangle
            size={13}
            className="mt-0.5 shrink-0"
          />

          <span>
            Backend offline:{" "}
            {error}
          </span>
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
            "font-mono text-[10px] font-semibold uppercase tracking-[0.05em]",
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