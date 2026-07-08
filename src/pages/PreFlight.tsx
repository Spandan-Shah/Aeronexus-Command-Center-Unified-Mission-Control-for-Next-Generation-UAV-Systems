import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { PreFlightChecklistTable } from "../components/preflight/PreFlightChecklistTable";
import { PreFlightSummary } from "../components/preflight/PreFlightSummary";
import { SafetyGatePanel } from "../components/preflight/SafetyGatePanel";

export function PreFlight() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Pre-Flight Checklist
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Verify battery, propellers, GPS, compass, telemetry, mission upload,
              geofence, home point, and payload before takeoff.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-2 rounded border border-(--caution) bg-[rgba(246,178,60,0.08)] px-3 py-2 text-hud text-[10px] text-(--caution)">
              <ShieldAlert size={14} />
              Review Warnings
            </span>

            <span className="flex items-center gap-2 rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary)">
              <ClipboardCheck size={14} />
              Pre-Arm Check
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <PreFlightSummary />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <PreFlightChecklistTable />
          </section>

          <aside className="xl:col-span-4">
            <SafetyGatePanel />
          </aside>
        </div>
      </div>
    </div>
  );
}