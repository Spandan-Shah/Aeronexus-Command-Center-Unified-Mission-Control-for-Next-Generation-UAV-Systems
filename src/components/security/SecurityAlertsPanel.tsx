import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  securityAlerts,
  type SecuritySeverity,
} from "../../data/security";
import { Panel } from "../common/Panel";

const alertConfig: Record<
  SecuritySeverity,
  {
    textClass: string;
    Icon: LucideIcon;
  }
> = {
  nominal: {
    textClass: "text-(--nominal)",
    Icon: CheckCircle2,
  },
  info: {
    textClass: "text-(--info)",
    Icon: Info,
  },
  caution: {
    textClass: "text-(--caution)",
    Icon: AlertTriangle,
  },
  critical: {
    textClass: "text-(--critical)",
    Icon: CircleAlert,
  },
};

export function SecurityAlertsPanel() {
  return (
    <Panel
      title="Security Alerts"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {securityAlerts.length} alerts
        </span>
      }
      className="h-full"
    >
      <div className="max-h-[430px] overflow-auto">
        {securityAlerts.map((alert) => {
          const config = alertConfig[alert.severity];
          const Icon = config.Icon;

          return (
            <article
              key={alert.id}
              className="border-b border-(--border) px-3 py-3 hover:bg-[#081320]"
            >
              <div className="flex items-start gap-2">
                <Icon size={15} className={`mt-0.5 ${config.textClass}`} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-hud text-[10px] font-bold text-(--foreground)">
                      {alert.title}
                    </span>

                    <span className="text-hud text-[9px] text-(--muted)">
                      {alert.time}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-(--muted)">
                    {alert.message}
                  </p>

                  <div className={`mt-2 text-hud text-[9px] ${config.textClass}`}>
                    Severity · {alert.severity}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}