import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { alerts } from "../../data/alerts";

const iconMap = {
  critical: ShieldAlert,
  caution: AlertTriangle,
  info: Info,
  nominal: CheckCircle2,
};

const colorMap = {
  critical: "text-[var(--critical)] border-l-[var(--critical)]",
  caution: "text-[var(--caution)] border-l-[var(--caution)]",
  info: "text-[var(--info)] border-l-[var(--info)]",
  nominal: "text-[var(--nominal)] border-l-[var(--nominal)]",
};

export function AlertsPanel() {
  return (
    <div className="h-full rounded border border-[var(--border)] bg-[var(--panel)] flex flex-col">
      <div className="h-9 border-b border-[var(--border)] px-3 flex items-center justify-between">
        <h2 className="text-hud text-xs">Alert Stream</h2>
        <span className="text-hud text-[10px] text-[var(--muted)]">
          {alerts.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {alerts.map((alert) => {
          const Icon = iconMap[alert.severity];

          return (
            <div
              key={alert.id}
              className={`border-l-2 border-b border-[var(--border)] px-3 py-2 ${colorMap[alert.severity]}`}
            >
              <div className="flex gap-2">
                <Icon size={15} className="mt-0.5 shrink-0" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-hud text-[9px]">
                    <span className="text-[var(--muted)]">{alert.time}</span>
                    <span className="font-bold">{alert.code}</span>
                    <span className="ml-auto text-[var(--muted)]">
                      {alert.source}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[var(--foreground)]">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}