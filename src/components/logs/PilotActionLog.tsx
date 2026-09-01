import { UserCheck } from "lucide-react";
import { pilotActions } from "../../data/logs";
import { Panel } from "../common/Panel";

export function PilotActionLog() {
  return (
    <Panel
      title="Pilot Actions"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          Audit trail
        </span>
      }
      className="h-full"
    >
      <div className="max-h-90 overflow-auto">
        {pilotActions.map((action) => (
          <article
            key={action.id}
            className="border-b border-(--border) px-3 py-3 hover:bg-[#081320]"
          >
            <div className="flex items-start gap-2">
              <UserCheck size={15} className="mt-0.5 text-(--primary)" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-hud text-[10px] font-bold text-(--foreground)">
                    {action.action}
                  </span>

                  <span className="text-hud text-[9px] text-(--muted)">
                    {action.time}
                  </span>
                </div>

                <div className="mt-1 text-xs text-(--muted)">
                  {action.operator}
                </div>

                <div className="mt-2 text-hud text-[9px] text-(--nominal)">
                  Result · {action.result}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}