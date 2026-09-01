import {
  AlertTriangle,
  CheckCircle2,
  Home,
  Pause,
  Plane,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
} from "lucide-react";

const commands = [
  { label: "ARM", icon: Plane },
  { label: "TAKEOFF", icon: Play },
  { label: "HOLD", icon: Pause },
  { label: "RTL", icon: Home },
  { label: "LAND", icon: Square },
  { label: "RESUME", icon: RotateCcw },
];

export function CommandDeck() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-lg border border-[#1d2533] bg-[#070a10] p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-(--nominal)" />

          <div className="min-w-0">
            <div className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-(--primary)">
              Command State
            </div>

            <div className="mt-1 text-[13px] font-semibold leading-tight text-(--foreground)">
              2-Step Safety Control
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between gap-3 rounded border border-[#1d2533] bg-black px-3 py-2">
            <span className="text-[12px] text-(--muted)">Confirmation</span>
            <span className="shrink-0 font-mono text-[8px] font-bold uppercase text-(--nominal)">
              Required
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded border border-[#1d2533] bg-black px-3 py-2">
            <span className="text-[12px] text-(--muted)">Mode</span>
            <span className="shrink-0 font-mono text-[8px] font-bold uppercase text-(--primary)">
              Auto Mission
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded border border-[#1d2533] bg-black px-3 py-2">
            <span className="text-[12px] text-(--muted)">Motor State</span>
            <span className="shrink-0 font-mono text-[8px] font-bold uppercase text-(--muted)">
              Off
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-lg border border-[#1d2533] bg-[#070a10] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-(--primary)">
              Flight Commands
            </div>

            <div className="mt-1 text-[13px] font-semibold leading-tight text-(--foreground)">
              Action Console
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-[rgba(73,229,143,0.32)] bg-[rgba(73,229,143,0.08)] px-2 py-0.5 font-mono text-[7px] font-bold uppercase text-(--nominal)">
            Ready
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {commands.map((command) => {
            const Icon = command.icon;

            return (
              <button
                key={command.label}
                type="button"
                className="flex h-9 min-w-0 items-center justify-center gap-1 rounded border border-[#2a3547] bg-black px-2 font-mono text-[8px] font-bold uppercase text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
              >
                <Icon size={11} className="shrink-0" />
                <span className="truncate">{command.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded border border-[rgba(255,77,77,0.46)] bg-[rgba(255,77,77,0.12)] px-2 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-(--critical) transition hover:bg-[rgba(255,77,77,0.18)]"
        >
          <AlertTriangle size={11} className="shrink-0" />
          <span className="truncate">Emergency · Motors Off</span>
        </button>

        <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-(--muted)">
          <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-(--nominal)" />
          <span>Commands are staged for confirmation before execution.</span>
        </div>
      </div>
    </div>
  );
}