import { Navigation, Route } from "lucide-react";
import { waypoints } from "../../data/missions";
import { Panel } from "../common/Panel";

const typeColor: Record<string, string> = {
  TAKEOFF: "text-(--nominal)",
  WAYPOINT: "text-(--info)",
  LOITER: "text-(--caution)",
  SCAN: "text-(--primary)",
  ROI: "text-(--critical)",
  RTL: "text-(--nominal)",
};

export function WaypointList() {
  return (
    <Panel
      title="Waypoints"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {waypoints.length} points
        </span>
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 overflow-auto">
        {waypoints.map((waypoint) => (
          <button
            key={waypoint.id}
            className="w-full border-b border-(--border) px-3 py-3 text-left transition hover:bg-[#081320]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-(--border) text-hud text-[10px] text-(--primary)">
                {waypoint.id.toString().padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-hud text-[10px] font-bold ${
                      typeColor[waypoint.type]
                    }`}
                  >
                    {waypoint.type}
                  </span>

                  <span className="text-hud text-[10px] text-(--muted)">
                    {waypoint.altitude}m
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-(--muted)">
                  <Navigation size={12} />
                  {waypoint.latitude}°N · {waypoint.longitude}°E
                </div>

                <div className="mt-1 flex items-center gap-1 text-[11px] text-(--foreground)">
                  <Route size={12} />
                  {waypoint.action}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}