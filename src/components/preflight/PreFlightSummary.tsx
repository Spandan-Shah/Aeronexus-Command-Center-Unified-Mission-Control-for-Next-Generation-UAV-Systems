import { AlertTriangle, CheckCircle2, ClipboardCheck, Plane } from "lucide-react";
import { preflightItems, preflightSummary } from "../../data/preflight";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function PreFlightSummary() {
  const passed = preflightItems.filter((item) => item.status === "passed").length;
  const warnings = preflightItems.filter(
    (item) => item.status === "warning"
  ).length;
  const failed = preflightItems.filter((item) => item.status === "failed").length;

  return (
    <Panel title="Readiness Summary">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Readiness"
            value={preflightSummary.readinessScore}
            unit="%"
            icon={ClipboardCheck}
            status={failed > 0 ? "critical" : warnings > 0 ? "caution" : "nominal"}
          />

          <MetricCard
            label="Passed"
            value={passed}
            unit="checks"
            icon={CheckCircle2}
            status="nominal"
          />

          <MetricCard
            label="Warnings"
            value={warnings}
            unit="checks"
            icon={AlertTriangle}
            status={warnings > 0 ? "caution" : "nominal"}
          />

          <MetricCard
            label="Drone"
            value={preflightSummary.droneId}
            icon={Plane}
            status="info"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">Mission</div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              {preflightSummary.mission}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">Gate Status</div>
            <div className="mt-1 text-hud text-sm font-bold text-(--caution)">
              {preflightSummary.gateStatus}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">Updated</div>
            <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
              {preflightSummary.lastUpdated}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}