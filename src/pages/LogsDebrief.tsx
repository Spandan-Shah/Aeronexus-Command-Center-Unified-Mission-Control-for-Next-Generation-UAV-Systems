import { Download, FileText } from "lucide-react";
import { AlertHistoryPanel } from "../components/logs/AlertHistoryPanel";
import { DebriefSummary } from "../components/logs/DebriefSummary";
import { MissionTimeline } from "../components/logs/MissionTimeline";
import { PerformanceMetrics } from "../components/logs/PerformanceMetrics";
import { PilotActionLog } from "../components/logs/PilotActionLog";
import { debriefSummary } from "../data/logs";

export function LogsDebrief() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Logs & Debrief
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Mission timeline, alerts, pilot actions, performance metrics, and
              export-ready debrief report.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-2 rounded border border-(--caution) bg-[rgba(246,178,60,0.08)] px-3 py-2 text-hud text-[10px] text-(--caution)">
              <FileText size={14} />
              {debriefSummary.missionId}
            </span>

            <button className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <DebriefSummary />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-5">
            <MissionTimeline />
          </section>

          <section className="space-y-3 xl:col-span-7">
            <PerformanceMetrics />

            <div className="grid gap-3 xl:grid-cols-2">
              <AlertHistoryPanel />
              <PilotActionLog />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}