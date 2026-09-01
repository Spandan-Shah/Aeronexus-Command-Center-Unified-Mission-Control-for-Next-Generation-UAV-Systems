import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { debriefSummary, missionPerformance } from "../../data/logs";
import { Panel } from "../common/Panel";

export function PerformanceMetrics() {
  const waypointProgress = Math.round(
    (debriefSummary.waypointsCompleted / debriefSummary.totalWaypoints) * 100
  );

  return (
    <Panel title="Mission Performance" className="h-full">
      <div className="p-3">
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Waypoints
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--nominal)">
              {debriefSummary.waypointsCompleted}/{debriefSummary.totalWaypoints}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Completion
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              {waypointProgress}%
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Status
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--caution)">
              {debriefSummary.status}
            </div>
          </div>
        </div>

        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={missionPerformance}>
              <CartesianGrid
                stroke="rgba(143,163,184,0.15)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="time"
                stroke="var(--muted)"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#081320",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--primary)" }}
              />
              <Line
                type="monotone"
                dataKey="battery"
                name="Battery %"
                stroke="var(--nominal)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="altitude"
                name="Altitude"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="speed"
                name="Speed"
                stroke="var(--info)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}