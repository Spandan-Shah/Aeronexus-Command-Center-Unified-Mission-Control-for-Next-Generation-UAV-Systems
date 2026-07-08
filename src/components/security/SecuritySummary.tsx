import { KeyRound, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { securityOverview } from "../../data/security";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function SecuritySummary() {
  return (
    <Panel title="Security Summary">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Command Integrity"
            value={securityOverview.commandIntegrity}
            unit="%"
            icon={ShieldCheck}
            status="nominal"
          />

          <MetricCard
            label="Active Sessions"
            value={securityOverview.activeSessions}
            unit="users"
            icon={UserCheck}
            status="info"
          />

          <MetricCard
            label="Failed Attempts"
            value={securityOverview.failedAttempts}
            unit="blocked"
            icon={LockKeyhole}
            status="caution"
          />

          <MetricCard
            label="Audit Events"
            value={securityOverview.auditEvents}
            unit="logs"
            icon={KeyRound}
            status="info"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Secure Link
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--nominal)">
              {securityOverview.secureLink}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Last Key Rotation
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              {securityOverview.lastKeyRotation}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}