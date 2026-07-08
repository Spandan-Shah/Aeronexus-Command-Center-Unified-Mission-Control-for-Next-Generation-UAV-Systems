import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import {
  preflightItems,
  type CheckStatus,
} from "../../data/preflight";
import { Panel } from "../common/Panel";

const statusConfig: Record<
  CheckStatus,
  {
    label: string;
    textClass: string;
    Icon: LucideIcon;
  }
> = {
  passed: {
    label: "Passed",
    textClass: "text-(--nominal)",
    Icon: CheckCircle2,
  },
  warning: {
    label: "Warning",
    textClass: "text-(--caution)",
    Icon: CircleAlert,
  },
  failed: {
    label: "Failed",
    textClass: "text-(--critical)",
    Icon: CircleX,
  },
};

export function PreFlightChecklistTable() {
  return (
    <Panel
      title="Checklist"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {preflightItems.length} checks
        </span>
      }
    >
      <div className="overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Check</th>
              <th className="px-3 py-2 font-normal">Category</th>
              <th className="px-3 py-2 font-normal">Value</th>
              <th className="px-3 py-2 font-normal">Requirement</th>
              <th className="px-3 py-2 font-normal text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            {preflightItems.map((item) => {
              const config = statusConfig[item.status];
              const Icon = config.Icon;

              return (
                <tr
                  key={item.id}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3">
                    <div className="text-(--foreground)">{item.title}</div>
                    <div className="mt-1 text-[10px] text-(--muted)">
                      {item.detail}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {item.category}
                  </td>

                  <td className="px-3 py-3 text-(--foreground)">
                    {item.value}
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {item.requirement}
                  </td>

                  <td className={`px-3 py-3 text-right ${config.textClass}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={14} />
                      {config.label}
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