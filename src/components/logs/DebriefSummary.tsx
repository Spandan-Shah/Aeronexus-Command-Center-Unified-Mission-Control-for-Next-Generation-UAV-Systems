import { Battery, Clock, MapPinned, Route, ShieldAlert } from "lucide-react";
import { debriefSummary } from "../../data/logs";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function DebriefSummary() {
  return (
    <Panel title="Debrief Summary">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Duration"
            value={debriefSummary.duration}
            icon={Clock}
            status="info"
          />

          <MetricCard
            label="Distance"
            value={debriefSummary.distance}
            icon={Route}
            status="nominal"
          />

          <MetricCard
            label="Battery Used"
            value={debriefSummary.batteryUsed}
            unit="%"
            icon={Battery}
            status="caution"
          />

          <MetricCard
            label="Alerts"
            value={debriefSummary.alerts}
            unit="events"
            icon={ShieldAlert}
            status="caution"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Mission
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              {debriefSummary.missionName}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Drone
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
              {debriefSummary.droneId}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Max Altitude
            </div>
            <div className="mt-1 flex items-center gap-2 text-hud text-sm font-bold text-(--nominal)">
              <MapPinned size={14} />
              {debriefSummary.maxAltitude} m
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}