import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  commandAudits,
  type SecuritySeverity,
} from "../../data/security";
import { Panel } from "../common/Panel";

const severityConfig: Record<
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

export function CommandAuditTable() {
  return (
    <Panel
      title="Command Audit"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          Signed command log
        </span>
      }
    >
      <div className="overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Time</th>
              <th className="px-3 py-2 font-normal">Operator</th>
              <th className="px-3 py-2 font-normal">Command</th>
              <th className="px-3 py-2 font-normal">Target</th>
              <th className="px-3 py-2 font-normal text-right">Result</th>
            </tr>
          </thead>

          <tbody>
            {commandAudits.map((audit) => {
              const config = severityConfig[audit.severity];
              const Icon = config.Icon;

              return (
                <tr
                  key={audit.id}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3 text-(--muted)">
                    {audit.time}
                  </td>

                  <td className="px-3 py-3 text-(--foreground)">
                    {audit.operator}
                  </td>

                  <td className={`px-3 py-3 ${config.textClass}`}>
                    <span className="flex items-center gap-1.5">
                      <Icon size={14} />
                      {audit.command}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-(--primary)">
                    {audit.target}
                  </td>

                  <td className="px-3 py-3 text-right text-(--foreground)">
                    {audit.result}
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