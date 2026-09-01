import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import {
  detectionEvents,
  type DetectionSeverity,
} from "../../data/camera";
import { Panel } from "../common/Panel";

const severityText: Record<DetectionSeverity, string> = {
  info: "text-(--info)",
  caution: "text-(--caution)",
  critical: "text-(--critical)",
};

const iconMap = {
  info: CheckCircle2,
  caution: AlertTriangle,
  critical: CircleAlert,
};

export function DetectionEventLedger() {
  return (
    <Panel
      title="Detection Event Ledger"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          Last 5 events
        </span>
      }
      className="h-full"
    >
      <div className="max-h-97.5 overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Time</th>
              <th className="px-3 py-2 font-normal">Object</th>
              <th className="px-3 py-2 font-normal text-right">Conf</th>
              <th className="px-3 py-2 font-normal">Sector</th>
              <th className="px-3 py-2 font-normal text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {detectionEvents.map((event) => {
              const Icon = iconMap[event.severity];

              return (
                <tr
                  key={event.id}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3 text-(--muted)">{event.time}</td>

                  <td className={`px-3 py-3 ${severityText[event.severity]}`}>
                    <span className="flex items-center gap-1.5">
                      <Icon size={14} />
                      {event.object}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right text-(--foreground)">
                    {event.confidence}%
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {event.sector}
                  </td>

                  <td className="px-3 py-3 text-right text-(--primary)">
                    {event.action}
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