import { Shield, UsersRound } from "lucide-react";
import { accessRoles, type SecuritySeverity } from "../../data/security";
import { Panel } from "../common/Panel";

const levelStyle: Record<SecuritySeverity, string> = {
  nominal: "border-(--nominal) text-(--nominal)",
  info: "border-(--info) text-(--info)",
  caution: "border-(--caution) text-(--caution)",
  critical: "border-(--critical) text-(--critical)",
};

export function AccessControlPanel() {
  return (
    <Panel title="Access Control" className="h-full">
      <div className="grid gap-3 p-3 md:grid-cols-2">
        {accessRoles.map((role) => (
          <article
            key={role.id}
            className={`rounded border bg-[#081320] p-3 ${levelStyle[role.level]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield size={16} />
                  <h2 className="text-hud text-[11px] font-bold">
                    {role.role}
                  </h2>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-(--muted)">
                  <UsersRound size={13} />
                  {role.users} users
                </div>
              </div>

              <span className="rounded border border-current px-2 py-1 text-hud text-[9px]">
                {role.level}
              </span>
            </div>

            <p className="mt-3 text-xs text-(--foreground)">
              {role.permission}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}