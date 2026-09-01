import {
  CheckCircle2,
  Info,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AlertTone = "critical" | "caution" | "info" | "nominal";

type AlertItem = {
  time: string;
  label: string;
  source: string;
  message: string;
  tone: AlertTone;
  icon: LucideIcon;
};

const alerts: AlertItem[] = [
  {
    time: "14:22:41",
    label: "Geofence",
    source: "Safety Engine",
    message: "Drone is close to restricted boundary.",
    tone: "critical",
    icon: ShieldAlert,
  },
  {
    time: "14:21:08",
    label: "Link",
    source: "Telemetry Link",
    message: "Signal strength dropped to 92%.",
    tone: "caution",
    icon: TriangleAlert,
  },
  {
    time: "14:19:52",
    label: "Waypoint",
    source: "Mission Planner",
    message: "Waypoint 04 reached successfully.",
    tone: "info",
    icon: Info,
  },
  {
    time: "14:18:03",
    label: "System",
    source: "Health Monitor",
    message: "All drone systems are running normally.",
    tone: "nominal",
    icon: CheckCircle2,
  },
];

const toneClass = {
  critical: {
    border: "border-[rgba(255,77,77,0.75)]",
    bg: "bg-[rgba(255,77,77,0.045)]",
    icon: "text-(--critical)",
    label: "text-(--critical)",
  },
  caution: {
    border: "border-[rgba(246,178,60,0.75)]",
    bg: "bg-[rgba(246,178,60,0.045)]",
    icon: "text-(--caution)",
    label: "text-(--caution)",
  },
  info: {
    border: "border-[rgba(90,169,255,0.75)]",
    bg: "bg-[rgba(90,169,255,0.045)]",
    icon: "text-(--info)",
    label: "text-(--info)",
  },
  nominal: {
    border: "border-[rgba(73,229,143,0.75)]",
    bg: "bg-[rgba(73,229,143,0.045)]",
    icon: "text-(--nominal)",
    label: "text-(--nominal)",
  },
};

export function AlertsPanel() {
  return (
    <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-lg border border-[#2a3547] bg-[#070a10]">
      <div className="flex items-center justify-between border-b border-[#2a3547] bg-black px-4 py-3">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-(--foreground)">
          Alert Stream
        </div>

        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--foreground)">
          {alerts.length} Active
        </div>
      </div>

      <div className="grid flex-1 grid-rows-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          const tone = toneClass[alert.tone];

          return (
            <div
              key={`${alert.time}-${alert.label}`}
              className={`flex min-h-0 border-b last:border-b-0 ${tone.border} ${tone.bg}`}
            >
              <div className="flex w-full items-start gap-3 px-4 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#2a3547] bg-black">
                  <Icon size={15} className={tone.icon} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[9px] font-bold text-(--muted)">
                        {alert.time}
                      </span>

                      <span
                        className={`font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${tone.label}`}
                      >
                        {alert.label}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.12em] ${tone.label}`}
                    >
                      {alert.source}
                    </span>
                  </div>

                  <p className={`mt-2 text-[13px] leading-relaxed ${tone.label}`}>
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}