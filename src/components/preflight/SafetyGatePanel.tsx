import { AlertTriangle, Rocket, ShieldCheck } from "lucide-react";
import { preflightItems, preflightSummary } from "../../data/preflight";
import { Panel } from "../common/Panel";

export function SafetyGatePanel() {
  const blockingIssues = preflightItems.filter(
    (item) => item.required && item.status === "failed"
  );

  const warnings = preflightItems.filter((item) => item.status === "warning");
  const canStart = blockingIssues.length === 0;

  return (
    <Panel title="Safety Gate" className="h-full">
      <div className="p-4">
        <div
          className={`rounded border p-4 ${
            canStart
              ? "border-(--caution) bg-[rgba(246,178,60,0.08)]"
              : "border-(--critical) bg-[rgba(255,77,77,0.08)]"
          }`}
        >
          <div className="flex items-start gap-3">
            {canStart ? (
              <ShieldCheck size={24} className="text-(--caution)" />
            ) : (
              <AlertTriangle size={24} className="text-(--critical)" />
            )}

            <div>
              <h2
                className={`text-hud text-base font-bold ${
                  canStart ? "text-(--caution)" : "text-(--critical)"
                }`}
              >
                {preflightSummary.gateStatus}
              </h2>

              <p className="mt-1 text-sm text-(--muted)">
                {canStart
                  ? "Mission can start, but warning items should be reviewed before takeoff."
                  : "Mission start is blocked because required checks failed."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="text-(--muted)">Blocking Issues</span>
            <span className={blockingIssues.length > 0 ? "text-(--critical)" : "text-(--nominal)"}>
              {blockingIssues.length}
            </span>
          </div>

          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="text-(--muted)">Warnings</span>
            <span className={warnings.length > 0 ? "text-(--caution)" : "text-(--nominal)"}>
              {warnings.length}
            </span>
          </div>

          <div className="flex items-center justify-between rounded border border-(--border) bg-[#081320] p-3 text-[11px]">
            <span className="text-(--muted)">Operator</span>
            <span className="text-(--foreground)">
              {preflightSummary.operator}
            </span>
          </div>
        </div>

        <button
          disabled={!canStart}
          className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded text-hud text-[11px] font-bold transition ${
            canStart
              ? "bg-(--primary) text-[#07111f] hover:opacity-90"
              : "cursor-not-allowed bg-[#1a2432] text-(--muted)"
          }`}
        >
          <Rocket size={16} />
          {canStart ? "Arm Drone / Start Mission" : "Start Mission Blocked"}
        </button>

        <p className="mt-3 text-xs text-(--muted)">
          Final arming should always be confirmed by the operator and real flight
          controller safety logic.
        </p>
      </div>
    </Panel>
  );
}