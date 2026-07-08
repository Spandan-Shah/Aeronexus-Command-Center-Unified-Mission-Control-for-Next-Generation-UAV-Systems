import { CloudSun, Database, Map, Plane, Route, ToggleRight } from "lucide-react";
import { simulatorSettings } from "../../data/settings";
import { Panel } from "../common/Panel";

const simulatorRows = [
  {
    label: "Simulator",
    value: simulatorSettings.simulatorEnabled ? "Enabled" : "Disabled",
    icon: ToggleRight,
  },
  {
    label: "Active Drone",
    value: simulatorSettings.activeDrone,
    icon: Plane,
  },
  {
    label: "Mission Profile",
    value: simulatorSettings.missionProfile,
    icon: Route,
  },
  {
    label: "Weather",
    value: simulatorSettings.weatherProfile,
    icon: CloudSun,
  },
  {
    label: "Map Mode",
    value: simulatorSettings.mapMode,
    icon: Map,
  },
  {
    label: "Data Source",
    value: simulatorSettings.dataSource,
    icon: Database,
  },
];

export function SimulatorSettingsPanel() {
  return (
    <Panel title="Simulator & Map Settings">
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
        {simulatorRows.map((row) => {
          const Icon = row.icon;

          return (
            <article
              key={row.label}
              className="rounded border border-(--border) bg-[#081320] p-3"
            >
              <div className="flex items-center gap-2 text-hud text-[10px] text-(--muted)">
                <Icon size={14} />
                {row.label}
              </div>

              <div className="mt-2 text-hud text-sm font-bold text-(--foreground)">
                {row.value}
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}