import type {
  ReactNode,
} from "react";

import {
  joinMissionClasses,
} from "./missionTheme";

export type MissionSectionHeaderProps = {
  /**
   * Small technical label shown above the section title.
   *
   * Example:
   * OPERATIONS · TELEMETRY
   */
  eyebrow?: ReactNode;

  /**
   * Primary section heading.
   */
  title: ReactNode;

  /**
   * Optional supporting explanation.
   */
  description?: ReactNode;

  /**
   * Optional right-side control, badge, button or status.
   */
  action?: ReactNode;

  /**
   * Reduces vertical spacing for dense operational panels.
   */
  compact?: boolean;

  /**
   * Shows the bottom structural divider.
   */
  bordered?: boolean;

  /**
   * Additional custom classes.
   */
  className?: string;
};

export function MissionSectionHeader({
  eyebrow,
  title,
  description,
  action,
  compact = false,
  bordered = true,
  className,
}: MissionSectionHeaderProps) {
  const hasEyebrow =
    eyebrow !== undefined &&
    eyebrow !== null &&
    eyebrow !== false;

  return (
    <div
      className={joinMissionClasses(
        "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",

        bordered
          ? "border-b border-(--border-soft)"
          : undefined,

        compact
          ? "px-4 py-3"
          : "px-5 py-4",

        className,
      )}
    >
      {/* ===================================================
          Section Identity
          =================================================== */}

      <div className="min-w-0">
        {hasEyebrow ? (
          <div className="mn-eyebrow">
            {eyebrow}
          </div>
        ) : null}

        <h2
          className={joinMissionClasses(
            "mn-heading",

            hasEyebrow
              ? "mt-1"
              : undefined,

            compact
              ? "text-[15px]"
              : "text-[18px]",
          )}
        >
          {title}
        </h2>

        {description ? (
          <div className="mt-1.5 max-w-3xl text-[11px] leading-relaxed text-(--muted)">
            {description}
          </div>
        ) : null}
      </div>

      {/* ===================================================
          Optional Action
          =================================================== */}

      {action ? (
        <div className="flex shrink-0 items-center">
          {action}
        </div>
      ) : null}
    </div>
  );
}