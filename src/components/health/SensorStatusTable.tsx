import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { sensorHealth, type HealthState } from "../../data/health";
import { Panel } from "../common/Panel";

const stateText: Record<HealthState, string> = {
  nominal: "text-(--nominal)",
  caution: "text-(--caution)",
  critical: "text-(--critical)",
};

const iconMap = {
  nominal: CheckCircle2,
  caution: CircleAlert,
  critical: CircleX,
};

export function SensorStatusTable() {
  return (
    <Panel title="Sensor Status" className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Sensor</th>
              <th className="px-3 py-2 font-normal">Value</th>
              <th className="px-3 py-2 font-normal">State</th>
              <th className="px-3 py-2 font-normal text-right">Checked</th>
            </tr>
          </thead>

          <tbody>
            {sensorHealth.map((sensor) => {
              const Icon = iconMap[sensor.state];

              return (
                <tr
                  key={sensor.name}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3 text-(--foreground)">
                    {sensor.name}
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {sensor.value}
                  </td>

                  <td className={`px-3 py-3 ${stateText[sensor.state]}`}>
                    <span className="flex items-center gap-1.5">
                      <Icon size={14} />
                      {sensor.state}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right text-(--muted)">
                    {sensor.lastChecked}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}