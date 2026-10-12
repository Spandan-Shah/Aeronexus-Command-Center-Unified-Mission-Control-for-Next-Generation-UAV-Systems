import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  joinMissionClasses,
  MISSION_TONE_CLASSES,
  type MissionTone,
} from "./missionTheme";

export type MissionBadgeVariant =
  | "soft"
  | "outline"
  | "solid";

export type MissionBadgeSize =
  | "sm"
  | "md";

export type MissionBadgeProps =
  Omit<
    ComponentPropsWithoutRef<"span">,
    "children"
  > & {
    children: ReactNode;

    tone?: MissionTone;

    variant?: MissionBadgeVariant;

    size?: MissionBadgeSize;

    dot?: boolean;
  };

const sizeClasses: Record<
  MissionBadgeSize,
  string
> = {
  sm:
    "min-h-5 px-2 text-[8px] tracking-[0.11em]",

  md:
    "min-h-6 px-2.5 text-[9px] tracking-[0.1em]",
};

const solidClasses: Record<
  MissionTone,
  string
> = {
  default:
    "border-white bg-white text-black",

  primary:
    "border-[var(--primary)] bg-[var(--primary)] text-black",

  info:
    "border-[var(--info)] bg-[var(--info)] text-black",

  nominal:
    "border-[var(--nominal)] bg-[var(--nominal)] text-black",

  caution:
    "border-[var(--caution)] bg-[var(--caution)] text-black",

  critical:
    "border-[var(--critical)] bg-[var(--critical)] text-white",

  muted:
    "border-[var(--muted-soft)] bg-[var(--muted-soft)] text-black",
};

export function MissionBadge({
  children,
  tone = "default",
  variant = "soft",
  size = "sm",
  dot = false,
  className,
  ...spanProps
}: MissionBadgeProps) {
  const toneStyle =
    MISSION_TONE_CLASSES[tone];

  const variantClass =
    variant === "solid"
      ? solidClasses[tone]
      : variant === "outline"
        ? joinMissionClasses(
            toneStyle.border,
            toneStyle.text,
            "bg-transparent",
          )
        : joinMissionClasses(
            toneStyle.border,
            toneStyle.background,
            toneStyle.text,
          );

  return (
    <span
      {...spanProps}
      className={joinMissionClasses(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border",

        "font-mono font-semibold uppercase leading-none",

        sizeClasses[
          size
        ],

        variantClass,

        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={joinMissionClasses(
            "h-1.5 w-1.5 rounded-full",
            toneStyle.dot,
          )}
        />
      ) : null}

      {children}
    </span>
  );
}