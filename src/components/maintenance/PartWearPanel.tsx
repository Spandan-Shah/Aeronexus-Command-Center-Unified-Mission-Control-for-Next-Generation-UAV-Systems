import { Cpu, Gauge, RotateCcw } from "lucide-react";
import {
  partWear,
  type MaintenanceState,
} from "../../data/maintenance";
import { Panel } from "../common/Panel";

const stateStyle: Record<MaintenanceState, string> = {
  nominal: "border-(--nominal) text-(--nominal)",
  caution: "border-(--caution) text-(--caution)",
  critical: "border-(--critical) text-(--critical)",
};

const barColor: Record<MaintenanceState, string> = {
  nominal: "bg-(--nominal)",
  caution: "bg-(--caution)",
  critical: "bg-(--critical)",
};

export function PartWearPanel() {
  return (
    <Panel title="Part Wear Monitor" className="h-full">
      <div className="grid gap-3 p-3 md:grid-cols-2">
        {partWear.map((part) => (
          <article
            key={part.id}
            className={`rounded border bg-[#081320] p-3 ${
              stateStyle[part.state]
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu size={16} />
                  <h2 className="text-hud text-[11px] font-bold">
                    {part.part}
                  </h2>
                </div>

                <div className="mt-1 text-hud text-[9px] text-(--muted)">
                  {part.droneId}
                </div>
              </div>

              <span className="text-hud text-lg font-bold">
                {part.health}%
              </span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#050d18]">
              <div
                className={`h-full ${barColor[part.state]}`}
                style={{ width: `${part.health}%` }}
              />
            </div>

            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <RotateCcw size={13} />
                  Cycles
                </span>
                <span className="text-(--foreground)">{part.cycles}</span>
              </div>

              <div className="flex items-start gap-1.5 text-(--muted)">
                <Gauge size={13} className="mt-0.5 shrink-0" />
                <span>{part.recommendation}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}