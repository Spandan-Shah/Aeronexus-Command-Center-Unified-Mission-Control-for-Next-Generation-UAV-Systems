import { Database, Map, MonitorCog, Radio } from "lucide-react";
import { settingsOverview } from "../../data/settings";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function SettingsSummary() {
  return (
    <Panel title="System Settings Summary">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Mode"
            value={settingsOverview.mode}
            icon={MonitorCog}
            status="info"
          />

          <MetricCard
            label="Telemetry"
            value={settingsOverview.telemetryRate}
            icon={Radio}
            status="nominal"
          />

          <MetricCard
            label="Map"
            value={settingsOverview.mapProvider}
            icon={Map}
            status="info"
          />

          <MetricCard
            label="Profile"
            value="Default"
            icon={Database}
            status="nominal"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Active Profile
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              {settingsOverview.activeProfile}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Theme
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
              {settingsOverview.theme}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Last Saved
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--nominal)">
              {settingsOverview.lastSaved}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}