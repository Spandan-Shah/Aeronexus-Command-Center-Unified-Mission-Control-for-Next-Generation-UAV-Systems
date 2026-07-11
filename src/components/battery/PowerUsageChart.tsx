import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { powerHistory } from "../../data/battery";
import { Panel } from "../common/Panel";

export function PowerUsageChart() {
  return (
    <Panel title="Power Usage Trend" className="h-full">
      <div className="h-80 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={powerHistory}>
            <CartesianGrid stroke="rgba(143,163,184,0.15)" strokeDasharray="3 3" />
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
              dataKey="voltage"
              name="Voltage"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="Current"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}