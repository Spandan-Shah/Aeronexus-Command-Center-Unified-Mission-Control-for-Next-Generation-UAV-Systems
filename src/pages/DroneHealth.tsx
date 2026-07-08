import { CircleAlert, ShieldCheck } from "lucide-react";
import { HealthScorePanel } from "../components/health/HealthScorePanel";
import { MotorHealthGrid } from "../components/health/MotorHealthGrid";
import { SensorStatusTable } from "../components/health/SensorStatusTable";

export function DroneHealth() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Drone Health Monitor
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Live system health for motors, ESC, GPS, IMU, compass, vibration,
              calibration, and frame condition.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-2 rounded border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-3 py-2 text-hud text-[10px] text-(--nominal)">
              <ShieldCheck size={14} />
              Flight Ready
            </span>

            <span className="flex items-center gap-2 rounded border border-(--caution) bg-[rgba(246,178,60,0.08)] px-3 py-2 text-hud text-[10px] text-(--caution)">
              <CircleAlert size={14} />
              2 Warnings
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <aside className="xl:col-span-4">
          <HealthScorePanel />
        </aside>

        <section className="xl:col-span-8">
          <MotorHealthGrid />
        </section>

        <section className="min-h-80 xl:col-span-12">
          <SensorStatusTable />
        </section>
      </div>
    </div>
  );
}