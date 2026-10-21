import type {
  ReactNode,
} from "react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  MissionPanel,
} from "./MissionPanel";

import {
  joinMissionClasses,
  MISSION_TONE_CLASSES,
  type MissionTone,
} from "./missionTheme";

export type MissionMetricProps = {
  label: string;

  value: ReactNode;

  unit?: ReactNode;

  helper?: ReactNode;

  icon?: LucideIcon;

  tone?: MissionTone;

  badge?: ReactNode;

  compact?: boolean;

  className?: string;

  valueClassName?: string;
};

export function MissionMetric({
  label,
  value,
  unit,
  helper,
  icon: Icon,
  tone = "default",
  badge,
  compact = false,
  className,
  valueClassName,
}: MissionMetricProps) {
  const toneStyle =
    MISSION_TONE_CLASSES[
      tone
    ];

  const showAccent =
    tone !== "default" &&
    tone !== "muted";

  return (
    <MissionPanel
      tone={tone}
      padding={
        compact
          ? "sm"
          : "md"
      }
      accent={
        showAccent
      }
      className={
        className
      }
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon
              size={
                compact
                  ? 12
                  : 14
              }
              strokeWidth={
                1.6
              }
              className={joinMissionClasses(
                "shrink-0",
                toneStyle.text,
              )}
            />
          ) : null}

          <span className="truncate font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {label}
          </span>
        </div>

        {badge ? (
          <div className="shrink-0">
            {badge}
          </div>
        ) : null}
      </div>

      <div
        className={joinMissionClasses(
          "mt-3 flex min-w-0 items-baseline gap-1.5",

          compact
            ? "mt-2"
            : "mt-3",
        )}
      >
        <div
          className={joinMissionClasses(
            "min-w-0 font-mono font-semibold tabular-nums",

            compact
              ? "text-[18px]"
              : "text-[24px]",

            toneStyle.text,

            valueClassName,
          )}
        >
          {value}
        </div>

        {unit ? (
          <div className="shrink-0 font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-[var(--muted-soft)]">
            {unit}
          </div>
        ) : null}
      </div>

      {helper ? (
        <div className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
          {helper}
        </div>
      ) : null}
    </MissionPanel>
  );
}