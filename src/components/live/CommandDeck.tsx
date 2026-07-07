import { Home, Pause, Plane, Play, RotateCcw, Square } from "lucide-react";

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
    <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-2">
      <div className="mb-2 flex items-center justify-between px-1 text-hud text-[10px]">
        <span className="text-[var(--muted)]">Command Deck · 2-Step Confirm</span>
        <span className="text-[var(--nominal)]">Mode · Auto Mission</span>
      </div>

      <div className="grid grid-cols-3 xl:grid-cols-6 gap-1">
        {commands.map((command) => {
          const Icon = command.icon;

          return (
            <button
              key={command.label}
              className="h-9 rounded border border-[var(--border)] bg-[#081320] text-hud text-[10px] flex items-center justify-center gap-1.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <Icon size={13} />
              {command.label}
            </button>
          );
        })}
      </div>

      <button className="mt-2 h-9 w-full rounded bg-[var(--critical)] text-hud text-[10px] font-bold tracking-widest text-white hover:opacity-90">
        Emergency · Motors Off
      </button>
    </div>
  );
}