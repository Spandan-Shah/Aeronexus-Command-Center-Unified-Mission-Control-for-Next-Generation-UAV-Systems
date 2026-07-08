import { CheckCircle2, CircleOff, RadioTower } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  telemetrySettings,
  type SettingState,
} from "../../data/settings";
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
    Icon: RadioTower,
  },
};

export function TelemetrySettingsPanel() {
  return (
    <Panel title="Telemetry & Secure Link" className="h-full">
      <div className="space-y-3 p-3">
        {telemetrySettings.map((setting) => {
          const config = stateConfig[setting.state];
          const Icon = config.Icon;

          return (
            <article
              key={setting.id}
              className="rounded border border-(--border) bg-[#081320] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-hud text-[11px] font-bold text-(--foreground)">
                    {setting.label}
                  </h2>
                  <p className="mt-1 text-xs text-(--muted)">
                    {setting.description}
                  </p>
                </div>

                <span className={`flex items-center gap-1.5 text-hud text-[9px] ${config.textClass}`}>
                  <Icon size={13} />
                  {config.label}
                </span>
              </div>

              <div className="mt-3 text-hud text-sm font-bold text-(--primary)">
                {setting.value}
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}