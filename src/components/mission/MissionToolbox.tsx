import { Flag, Home, MapPin, Save, Shield, Upload } from "lucide-react";
import { Panel } from "../common/Panel";

const tools = [
  { label: "Waypoint", icon: MapPin },
  { label: "Geofence", icon: Shield },
  { label: "Home Point", icon: Home },
  { label: "Rally Point", icon: Flag },
];

export function MissionToolbox() {
  return (
    <Panel title="Mission Toolbox">
      <div className="grid grid-cols-2 gap-2 p-3">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <button
              key={tool.label}
              className="flex h-20 flex-col items-center justify-center gap-2 rounded border border-(--border) bg-[#081320] text-hud text-[10px] text-(--muted) transition hover:border-(--primary) hover:text-(--primary)"
            >
              <Icon size={18} />
              {tool.label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-(--border) p-3">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex h-9 items-center justify-center gap-2 rounded border border-(--border) bg-[#081320] text-hud text-[10px] text-(--foreground) hover:border-(--primary)">
            <Save size={14} />
            Save
          </button>

          <button className="flex h-9 items-center justify-center gap-2 rounded bg-(--primary) text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>
    </Panel>
  );
}