import { Activity, AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  timelineEvents,
  type LogSeverity,
} from "../../data/logs";
import { Panel } from "../common/Panel";

const severityConfig: Record<
  LogSeverity,
  {
    textClass: string;
    Icon: LucideIcon;
  }
> = {
  nominal: {
    textClass: "text-(--nominal)",
    Icon: CheckCircle2,
  },
  info: {
    textClass: "text-(--info)",
    Icon: Activity,
  },
  caution: {
    textClass: "text-(--caution)",
    Icon: AlertTriangle,
  },
  critical: {
    textClass: "text-(--critical)",
    Icon: CircleAlert,
  },
};

export function MissionTimeline() {
  return (
    <Panel
      title="Mission Timeline"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {timelineEvents.length} events
        </span>
      }
      className="h-full"
    >
      <div className="max-h-130 overflow-auto p-3">
        <div className="space-y-3">
          {timelineEvents.map((event) => {
            const config = severityConfig[event.severity];
            const Icon = config.Icon;

            return (
              <article
                key={event.id}
                className="relative rounded border border-(--border) bg-[#081320] p-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.textClass}`}>
                    <Icon size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-hud text-[11px] font-bold text-(--foreground)">
                        {event.title}
                      </h2>

                      <span className="text-hud text-[10px] text-(--muted)">
                        {event.time}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-(--muted)">
                      {event.description}
                    </p>

                    <div className="mt-2 text-hud text-[9px] text-(--primary)">
                      Source · {event.source}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}