import type {
  ReactNode,
} from "react";

import {
  MissionPanel,
} from "./MissionPanel";

import {
  joinMissionClasses,
  MISSION_TONE_CLASSES,
  type MissionTone,
} from "./missionTheme";

export type MissionPageMetaItem = {
  label: string;

  value: ReactNode;

  tone?: MissionTone;
};

export type MissionPageHeaderProps = {
  eyebrow: ReactNode;

  title: ReactNode;

  description?: ReactNode;

  status?: ReactNode;

  actions?: ReactNode;

  metadata?: MissionPageMetaItem[];

  footer?: ReactNode;

  tone?: MissionTone;

  className?: string;
};

export function MissionPageHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
  metadata = [],
  footer,
  tone = "primary",
  className,
}: MissionPageHeaderProps) {
  return (
    <MissionPanel
      tone={tone}
      surface="raised"
      padding="lg"
      accent
      className={
        className
      }
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mn-eyebrow">
            {eyebrow}
          </div>

          <h1 className="mn-heading mt-2 text-[28px] sm:text-[30px]">
            {title}
          </h1>

          {description ? (
            <div className="mt-2 max-w-4xl text-[13px] leading-[1.7] text-[var(--muted)]">
              {description}
            </div>
          ) : null}
        </div>

        {status ||
        actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {status}

            {actions}
          </div>
        ) : null}
      </div>

      {metadata.length >
      0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--border-soft)] pt-4">
          {metadata.map(
            (
              item,
              index,
            ) => {
              const toneStyle =
                MISSION_TONE_CLASSES[
                  item.tone ??
                    "default"
                ];

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                    {
                      item.label
                    }
                  </span>

                  <span
                    className={joinMissionClasses(
                      "font-mono text-[9px] font-semibold uppercase tracking-[0.06em]",

                      toneStyle.text,
                    )}
                  >
                    {
                      item.value
                    }
                  </span>
                </div>
              );
            },
          )}
        </div>
      ) : null}

      {footer ? (
        <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
          {footer}
        </div>
      ) : null}
    </MissionPanel>
  );
}