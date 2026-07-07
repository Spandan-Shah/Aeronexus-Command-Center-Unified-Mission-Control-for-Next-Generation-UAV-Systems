import {
  Battery,
  Clock,
  Gauge,
  Home,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { activeMission } from "../../data/missions";
import { Panel } from "../common/Panel";

const summaryItems = [
  {
    label: "Distance",
    value: activeMission.distance,
    icon: MapPinned,
  },
  {
    label: "ETA",
    value: activeMission.estimatedTime,
    icon: Clock,
  },
  {
    label: "Max Alt",
    value: `${activeMission.maxAltitude} m`,
    icon: Gauge,
  },
  {
    label: "Drone",
    value: activeMission.droneId,
    icon: Battery,
  },
];

export function MissionSummary() {
  return (
    <Panel title="Mission Summary">
      <div className="p-3">
        <div className="rounded border border-(--border) bg-[#081320] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-hud text-sm font-bold text-(--foreground)">
                {activeMission.name}
              </div>
              <div className="mt-1 text-hud text-[10px] text-(--muted)">
                ID {activeMission.id} · {activeMission.status}
              </div>
            </div>

            <span className="rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-2 py-1 text-hud text-[9px] text-(--primary)">
              Draft
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {summaryItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded border border-(--border) bg-[#081320] p-3"
              >
                <div className="flex items-center gap-1.5 text-hud text-[9px] text-(--muted)">
                  <Icon size={13} />
                  {item.label}
                </div>
                <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-2 rounded border border-(--border) bg-[#081320] p-3">
          <div className="flex items-center gap-2 text-hud text-[10px] text-(--nominal)">
            <ShieldCheck size={14} />
            Geofence enabled
          </div>

          <div className="flex items-center gap-2 text-[11px] text-(--muted)">
            <Home size={13} />
            Home · {activeMission.homePoint}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-(--muted)">
            <MapPinned size={13} />
            Rally · {activeMission.rallyPoint}
          </div>
        </div>
      </div>
    </Panel>
  );
}