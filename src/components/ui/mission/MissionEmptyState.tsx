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

export type MissionEmptyStateProps = {
  icon?: LucideIcon;

  eyebrow?: ReactNode;

  title: ReactNode;

  description?: ReactNode;

  action?: ReactNode;

  tone?: MissionTone;

  compact?: boolean;

  className?: string;
};

export function MissionEmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  tone = "muted",
  compact = false,
  className,
}: MissionEmptyStateProps) {
  const toneStyle =
    MISSION_TONE_CLASSES[
      tone
    ];

  return (
    <MissionPanel
      tone={tone}
      padding={
        compact
          ? "md"
          : "lg"
      }
      className={joinMissionClasses(
        "flex min-h-[180px] items-center justify-center",

        className,
      )}
    >
      <div className="mx-auto max-w-lg text-center">
        {Icon ? (
          <div
            className={joinMissionClasses(
              "mx-auto flex items-center justify-center rounded-md border",

              compact
                ? "h-9 w-9"
                : "h-11 w-11",

              toneStyle.border,
              toneStyle.background,
            )}
          >
            <Icon
              size={
                compact
                  ? 16
                  : 19
              }
              strokeWidth={
                1.5
              }
              className={
                toneStyle.text
              }
            />
          </div>
        ) : null}

        {eyebrow ? (
          <div
            className={joinMissionClasses(
              "mn-eyebrow",

              Icon
                ? "mt-4"
                : "",
            )}
          >
            {eyebrow}
          </div>
        ) : null}

        <h3
          className={joinMissionClasses(
            "mn-heading",

            Icon ||
            eyebrow
              ? "mt-2"
              : "",

            compact
              ? "text-[16px]"
              : "text-[18px]",
          )}
        >
          {title}
        </h3>

        {description ? (
          <div className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
            {description}
          </div>
        ) : null}

        {action ? (
          <div className="mt-4 flex justify-center">
            {action}
          </div>
        ) : null}
      </div>
    </MissionPanel>
  );
}