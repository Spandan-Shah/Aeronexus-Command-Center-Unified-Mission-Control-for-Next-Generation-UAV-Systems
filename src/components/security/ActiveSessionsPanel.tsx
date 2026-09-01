import { Monitor, Smartphone, UserRoundCheck } from "lucide-react";
import { activeSessions, type SessionStatus } from "../../data/security";
import { Panel } from "../common/Panel";

const statusStyle: Record<SessionStatus, string> = {
  active: "text-(--nominal)",
  idle: "text-(--caution)",
  revoked: "text-(--critical)",
};

function getDeviceIcon(device: string) {
  if (device.toLowerCase().includes("tablet")) return Smartphone;
  return Monitor;
}

export function ActiveSessionsPanel() {
  return (
    <Panel
      title="Active Sessions"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {activeSessions.length} sessions
        </span>
      }
      className="h-full"
    >
      <div className="max-h-107.5 overflow-auto">
        {activeSessions.map((session) => {
          const DeviceIcon = getDeviceIcon(session.device);

          return (
            <article
              key={session.id}
              className="border-b border-(--border) px-3 py-3 hover:bg-[#081320]"
            >
              <div className="flex items-start gap-2">
                <UserRoundCheck
                  size={15}
                  className={`mt-0.5 ${statusStyle[session.status]}`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-hud text-[10px] font-bold text-(--foreground)">
                      {session.user}
                    </span>

                    <span className={`text-hud text-[9px] ${statusStyle[session.status]}`}>
                      {session.status}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-(--muted)">
                    {session.role}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-(--muted)">
                    <span className="flex items-center gap-1.5">
                      <DeviceIcon size={13} />
                      {session.device}
                    </span>
                    <span>{session.lastSeen}</span>
                  </div>

                  <div className="mt-2 text-hud text-[9px] text-(--primary)">
                    {session.location}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}