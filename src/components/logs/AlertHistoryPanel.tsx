import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import { alertLogs, type LogSeverity } from "../../data/logs";
import { Panel } from "../common/Panel";

const severityText: Record<LogSeverity, string> = {
  nominal: "text-(--nominal)",
  info: "text-(--info)",
  caution: "text-(--caution)",
  critical: "text-(--critical)",
};

const iconMap = {
  nominal: CheckCircle2,
  info: CheckCircle2,
  caution: AlertTriangle,
  critical: CircleX,
};

export function AlertHistoryPanel() {
  return (
    <Panel title="Alert History" className="h-full">
      <div className="overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Time</th>
              <th className="px-3 py-2 font-normal">Code</th>
              <th className="px-3 py-2 font-normal">Message</th>
              <th className="px-3 py-2 font-normal text-right">State</th>
            </tr>
          </thead>

          <tbody>
            {alertLogs.map((alert) => {
              const Icon = iconMap[alert.severity];

              return (
                <tr
                  key={alert.id}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3 text-(--muted)">
                    {alert.time}
                  </td>

                  <td className={`px-3 py-3 ${severityText[alert.severity]}`}>
                    <span className="flex items-center gap-1.5">
                      <Icon size={14} />
                      {alert.code}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-(--foreground)">
                    {alert.message}
                  </td>

                  <td className="px-3 py-3 text-right">
                    <span
                      className={
                        alert.resolved
                          ? "text-(--nominal)"
                          : "text-(--caution)"
                      }
                    >
                      {alert.resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}