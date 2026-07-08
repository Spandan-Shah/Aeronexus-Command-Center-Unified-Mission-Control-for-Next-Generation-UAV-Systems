import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import { powerAlerts, type BatteryState } from "../../data/battery";
import { Panel } from "../common/Panel";

const iconMap = {
  nominal: CheckCircle2,
  caution: AlertTriangle,
  critical: CircleX,
};

const stateStyle: Record<BatteryState, string> = {
  nominal: "border-l-(--nominal) text-(--nominal)",
  caution: "border-l-(--caution) text-(--caution)",
  critical: "border-l-(--critical) text-(--critical)",
};

export function PowerAlerts() {
  return (
    <Panel
      title="Power Alerts"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {powerAlerts.length} events
        </span>
      }
      className="h-full"
    >
      <div className="max-h-[320px] overflow-auto">
        {powerAlerts.map((alert) => {
          const Icon = iconMap[alert.level];

          return (
            <article
              key={alert.id}
              className={`border-b border-l-2 border-b-(--border) px-3 py-3 ${stateStyle[alert.level]}`}
            >
              <div className="flex gap-2">
                <Icon size={15} className="mt-0.5 shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-hud text-[10px] font-bold">
                      {alert.title}
                    </span>
                    <span className="text-hud text-[9px] text-(--muted)">
                      {alert.time}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-(--foreground)">
                    {alert.message}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}