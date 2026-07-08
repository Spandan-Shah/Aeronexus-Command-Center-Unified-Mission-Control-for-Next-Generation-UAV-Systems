import {
  Activity,
  CalendarCheck,
  Gauge,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { droneHealth } from "../../data/health";
import { Panel } from "../common/Panel";

export function HealthScorePanel() {
  return (
    <Panel title="Health Score">
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-hud text-5xl font-bold text-(--nominal)">
              {droneHealth.overallScore}
            </div>
            <div className="mt-1 text-hud text-[10px] text-(--muted)">
              Overall health score
            </div>
          </div>

          <div className="rounded border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-3 py-2 text-hud text-[10px] text-(--nominal)">
            {droneHealth.status}
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded bg-[#050d18]">
          <div
            className="h-full bg-(--nominal)"
            style={{ width: `${droneHealth.overallScore}%` }}
          />
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="flex items-center gap-2 text-(--muted)">
              <ShieldCheck size={14} />
              Frame Condition
            </span>
            <span className="text-(--foreground)">
              {droneHealth.frameCondition}
            </span>
          </div>

          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="flex items-center gap-2 text-(--muted)">
              <Wrench size={14} />
              Calibration Due
            </span>
            <span className="text-(--foreground)">
              {droneHealth.calibrationDue}
            </span>
          </div>

          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="flex items-center gap-2 text-(--muted)">
              <Activity size={14} />
              Vibration Level
            </span>
            <span className="text-(--nominal)">
              {droneHealth.vibrationLevel}
            </span>
          </div>

          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="flex items-center gap-2 text-(--muted)">
              <CalendarCheck size={14} />
              Last Inspection
            </span>
            <span className="text-(--foreground)">
              {droneHealth.lastInspection}
            </span>
          </div>

          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="flex items-center gap-2 text-(--muted)">
              <Gauge size={14} />
              Drone ID
            </span>
            <span className="text-(--primary)">{droneHealth.droneId}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}