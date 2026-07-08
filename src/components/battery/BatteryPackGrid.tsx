import { Battery, Gauge, HeartPulse, Thermometer, Timer, Zap } from "lucide-react";
import { batteryPacks, type BatteryState } from "../../data/battery";
import { Panel } from "../common/Panel";

const stateStyle: Record<BatteryState, string> = {
  nominal: "border-(--nominal) text-(--nominal)",
  caution: "border-(--caution) text-(--caution)",
  critical: "border-(--critical) text-(--critical)",
};

const barColor: Record<BatteryState, string> = {
  nominal: "bg-(--nominal)",
  caution: "bg-(--caution)",
  critical: "bg-(--critical)",
};

export function BatteryPackGrid() {
  return (
    <Panel title="Battery Packs">
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
        {batteryPacks.map((pack) => (
          <article
            key={pack.id}
            className={`rounded border bg-[#081320] p-4 ${stateStyle[pack.state]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Battery size={18} />
                  <h2 className="text-hud text-sm font-bold">{pack.id}</h2>
                </div>
                <p className="mt-1 text-hud text-[10px] text-(--muted)">
                  {pack.type}
                </p>
              </div>

              <span className="rounded border border-current px-2 py-1 text-hud text-[9px]">
                {pack.status}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between">
                <span className="text-hud text-3xl font-bold">
                  {pack.percentage}%
                </span>
                <span className="text-hud text-[10px] text-(--muted)">
                  {pack.estimatedFlightTime}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded bg-[#050d18]">
                <div
                  className={`h-full ${barColor[pack.state]}`}
                  style={{ width: `${pack.percentage}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Gauge size={13} />
                  Voltage
                </span>
                <span className="text-(--foreground)">{pack.voltage}V</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Zap size={13} />
                  Current
                </span>
                <span className="text-(--foreground)">{pack.currentDraw}A</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Thermometer size={13} />
                  Temp
                </span>
                <span className="text-(--foreground)">{pack.temperature}°C</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Timer size={13} />
                  Cycles
                </span>
                <span className="text-(--foreground)">{pack.cycleCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <HeartPulse size={13} />
                  Health
                </span>
                <span className="text-(--foreground)">{pack.health}%</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}