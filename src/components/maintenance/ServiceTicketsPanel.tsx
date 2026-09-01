import { TicketCheck } from "lucide-react";
import {
  serviceTickets,
  type ServicePriority,
} from "../../data/maintenance";
import { Panel } from "../common/Panel";

const priorityStyle: Record<ServicePriority, string> = {
  low: "border-(--info) text-(--info)",
  medium: "border-(--caution) text-(--caution)",
  high: "border-(--critical) text-(--critical)",
  urgent: "border-(--critical) text-(--critical) bg-[rgba(255,77,77,0.08)]",
};

export function ServiceTicketsPanel() {
  return (
    <Panel
      title="Service Tickets"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {serviceTickets.length} open
        </span>
      }
      className="h-full"
    >
      <div className="max-h-105 overflow-auto">
        {serviceTickets.map((ticket) => (
          <article
            key={ticket.id}
            className="border-b border-(--border) px-3 py-3 hover:bg-[#081320]"
          >
            <div className="flex items-start gap-2">
              <TicketCheck size={15} className="mt-0.5 text-(--primary)" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-hud text-[10px] font-bold text-(--foreground)">
                    {ticket.id} · {ticket.droneId}
                  </span>

                  <span
                    className={`rounded border px-2 py-1 text-hud text-[9px] ${
                      priorityStyle[ticket.priority]
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </div>

                <p className="mt-2 text-xs text-(--foreground)">
                  {ticket.issue}
                </p>

                <div className="mt-2 flex justify-between gap-3 text-[11px] text-(--muted)">
                  <span>{ticket.owner}</span>
                  <span>{ticket.status} · {ticket.opened}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}