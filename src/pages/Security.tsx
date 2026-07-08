import { KeyRound, ShieldCheck } from "lucide-react";
import { AccessControlPanel } from "../components/security/AccessControlPanel";
import { ActiveSessionsPanel } from "../components/security/ActiveSessionsPanel";
import { CommandAuditTable } from "../components/security/CommandAuditTable";
import { SecurityAlertsPanel } from "../components/security/SecurityAlertsPanel";
import { SecuritySummary } from "../components/security/SecuritySummary";

export function Security() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Security
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Secure command sessions, signed audit logs, role-based access,
              active sessions, blocked attempts, and security alerts.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-2 rounded border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-3 py-2 text-hud text-[10px] text-(--nominal)">
              <ShieldCheck size={14} />
              Secure Link Active
            </span>

            <button className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              <KeyRound size={14} />
              Rotate Key
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SecuritySummary />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <CommandAuditTable />
          </section>

          <aside className="space-y-3 xl:col-span-4">
            <ActiveSessionsPanel />
            <SecurityAlertsPanel />
          </aside>

          <section className="xl:col-span-12">
            <AccessControlPanel />
          </section>
        </div>
      </div>
    </div>
  );
}