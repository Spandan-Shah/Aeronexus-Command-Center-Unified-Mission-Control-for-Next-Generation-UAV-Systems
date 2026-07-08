import { AlertTriangle, CheckCircle2, CircleOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { safetyLimits, type SettingState } from "../../data/settings";
import { Panel } from "../common/Panel";

const stateConfig: Record<
  SettingState,
  {
    label: string;
    textClass: string;
    Icon: LucideIcon;
  }
> = {
  enabled: {
    label: "Enabled",
    textClass: "text-(--nominal)",
    Icon: CheckCircle2,
  },
  disabled: {
    label: "Disabled",
    textClass: "text-(--muted)",
    Icon: CircleOff,
  },
  warning: {
    label: "Review",
    textClass: "text-(--caution)",
    Icon: AlertTriangle,
  },
};

export function SafetyLimitsPanel() {
  return (
    <Panel
      title="Safety Limits"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          Flight guardrails
        </span>
      }
      className="h-full"
    >
      <div className="space-y-3 p-3">
        {safetyLimits.map((limit) => {
          const config = stateConfig[limit.state];
          const Icon = config.Icon;

          return (
            <article
              key={limit.id}
              className="rounded border border-(--border) bg-[#081320] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-hud text-[11px] font-bold text-(--foreground)">
                    {limit.label}
                  </h2>
                  <p className="mt-1 text-xs text-(--muted)">
                    {limit.description}
                  </p>
                </div>

                <span className={`flex items-center gap-1.5 text-hud text-[9px] ${config.textClass}`}>
                  <Icon size={13} />
                  {config.label}
                </span>
              </div>

              <div className="mt-3 rounded border border-(--border) bg-[#050d18] px-3 py-2 text-hud text-sm font-bold text-(--primary)">
                {limit.value}
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}