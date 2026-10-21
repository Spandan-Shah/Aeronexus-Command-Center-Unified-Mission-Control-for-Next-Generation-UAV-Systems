import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  joinMissionClasses,
  MISSION_TONE_CLASSES,
  type MissionTone,
} from "./missionTheme";

export type MissionPanelSurface =
  | "base"
  | "raised"
  | "glass";

export type MissionPanelPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

export type MissionPanelProps =
  Omit<
    ComponentPropsWithoutRef<"section">,
    "children"
  > & {
    children: ReactNode;

    tone?: MissionTone;

    surface?: MissionPanelSurface;

    padding?: MissionPanelPadding;

    accent?: boolean;

    interactive?: boolean;
  };

const surfaceClasses: Record<
  MissionPanelSurface,
  string
> = {
  base: [
    "bg-[var(--surface-1)]",
    "shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
  ].join(" "),

  raised: [
    "bg-[var(--surface-2)]",
    "shadow-[0_20px_65px_rgba(0,0,0,0.32)]",
  ].join(" "),

  glass: [
    "bg-[rgba(5,7,9,0.78)]",
    "shadow-[0_18px_55px_rgba(0,0,0,0.3)]",
    "backdrop-blur-xl",
  ].join(" "),
};

const paddingClasses: Record<
  MissionPanelPadding,
  string
> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function MissionPanel({
  children,
  tone = "default",
  surface = "base",
  padding = "none",
  accent = false,
  interactive = false,
  className,
  ...sectionProps
}: MissionPanelProps) {
  const toneStyle =
    MISSION_TONE_CLASSES[tone];

  return (
    <section
      {...sectionProps}
      data-mission-panel
      data-tone={tone}
      data-surface={surface}
      className={joinMissionClasses(
        "relative overflow-hidden rounded-md border",

        toneStyle.border,

        surfaceClasses[
          surface
        ],

        paddingClasses[
          padding
        ],

        interactive &&
          [
            "transition-[border-color,background-color,transform]",
            "duration-150",
            "ease-out",
            "hover:-translate-y-px",
            "hover:border-white/15",
            "hover:bg-[var(--surface-2)]",
          ].join(" "),

        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className={joinMissionClasses(
            "pointer-events-none absolute left-0 top-0 h-px w-12",
            toneStyle.dot,
          )}
        />
      ) : null}

      {children}
    </section>
  );
}