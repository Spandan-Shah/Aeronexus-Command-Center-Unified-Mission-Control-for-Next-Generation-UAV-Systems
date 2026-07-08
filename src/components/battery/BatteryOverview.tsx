import { Battery, Clock, HeartPulse, Zap } from "lucide-react";
import { batteryOverview } from "../../data/battery";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function BatteryOverview() {
  return (
    <Panel title="Power Overview">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Voltage"
            value={batteryOverview.totalVoltage}
            unit="V"
            icon={Battery}
            status="nominal"
          />

          <MetricCard
            label="Current Draw"
            value={batteryOverview.currentDraw}
            unit="A"
            icon={Zap}
            status="caution"
          />

          <MetricCard
            label="Flight Time"
            value={batteryOverview.estimatedFlightTime}
            icon={Clock}
            status="info"
          />

          <MetricCard
            label="Battery Health"
            value={batteryOverview.batteryHealth}
            unit="%"
            icon={HeartPulse}
            status="nominal"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Active Pack
            </div>
            <div className="mt-1 text-hud text-base font-bold text-(--primary)">
              {batteryOverview.activePack}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Power Mode
            </div>
            <div className="mt-1 text-hud text-base font-bold text-(--nominal)">
              {batteryOverview.powerMode}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}