import { ClipboardList, Wrench } from "lucide-react";
import { MaintenanceSchedule } from "../components/maintenance/MaintenanceSchedule";
import { MaintenanceSummary } from "../components/maintenance/MaintenanceSummary";
import { PartWearPanel } from "../components/maintenance/PartWearPanel";
import { ServiceTicketsPanel } from "../components/maintenance/ServiceTicketsPanel";

export function Maintenance() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Maintenance
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Service schedules, open tickets, part wear, inspection status, and
              maintenance readiness for the drone fleet.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded border border-(--border) bg-[#081320] px-3 py-2 text-hud text-[10px] text-(--foreground) hover:border-(--primary)">
              <ClipboardList size={14} />
              Create Task
            </button>

            <button className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              <Wrench size={14} />
              Service Drone
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <MaintenanceSummary />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <MaintenanceSchedule />
          </section>

          <aside className="xl:col-span-4">
            <ServiceTicketsPanel />
          </aside>

          <section className="xl:col-span-12">
            <PartWearPanel />
          </section>
        </div>
      </div>
    </div>
  );
}