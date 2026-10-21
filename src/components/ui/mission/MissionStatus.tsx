import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  joinMissionClasses,
  MISSION_TONE_CLASSES,
  type MissionTone,
} from "./missionTheme";

export type MissionStatusProps =
  Omit<
    ComponentPropsWithoutRef<"div">,
    "children"
  > & {
    label: ReactNode;

    detail?: ReactNode;

    tone?: MissionTone;

    pulse?: boolean;

    compact?: boolean;
  };

export function MissionStatus({
  label,
  detail,
  tone = "nominal",
  pulse = false,
  compact = false,
  className,
  ...divProps
}: MissionStatusProps) {
  const toneStyle =
    MISSION_TONE_CLASSES[tone];

  return (
    <div
      {...divProps}
      className={joinMissionClasses(
        "inline-flex min-w-0 items-center gap-2",

        className,
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse ? (
          <span
            aria-hidden="true"
            className={joinMissionClasses(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-30",
              toneStyle.dot,
            )}
          />
        ) : null}

        <span
          aria-hidden="true"
          className={joinMissionClasses(
            "relative inline-flex h-2 w-2 rounded-full",
            toneStyle.dot,
          )}
        />
      </span>

      <div className="min-w-0">
        <div
          className={joinMissionClasses(
            "font-mono font-semibold uppercase leading-none",

            compact
              ? "text-[8px] tracking-[0.11em]"
              : "text-[9px] tracking-[0.12em]",

            toneStyle.text,
          )}
        >
          {label}
        </div>

        {!compact &&
        detail ? (
          <div className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--muted-soft)]">
            {detail}
          </div>
        ) : null}
      </div>
    </div>
  );
}