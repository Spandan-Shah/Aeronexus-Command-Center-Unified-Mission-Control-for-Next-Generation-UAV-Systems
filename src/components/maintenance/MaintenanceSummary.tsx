import { AlertTriangle, CalendarClock, Gauge, Wrench } from "lucide-react";
import { maintenanceOverview } from "../../data/maintenance";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function MaintenanceSummary() {
  return (
    <Panel title="Maintenance Summary">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Fleet Readiness"
            value={maintenanceOverview.fleetReadiness}
            unit="%"
            icon={Gauge}
            status="caution"
          />

          <MetricCard
            label="Open Tickets"
            value={maintenanceOverview.openTickets}
            unit="tickets"
            icon={Wrench}
            status="caution"
          />

          <MetricCard
            label="Due Soon"
            value={maintenanceOverview.dueSoon}
            unit="tasks"
            icon={CalendarClock}
            status="caution"
          />

          <MetricCard
            label="Overdue"
            value={maintenanceOverview.overdue}
            unit="task"
            icon={AlertTriangle}
            status="critical"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Next Service
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              {maintenanceOverview.nextService}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Total Fleet Flight Hours
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
              {maintenanceOverview.totalFlightHours}h
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}