import {
  Battery,
  LandPlot,
  PlaneTakeoff,
  Power,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useSimulator } from "../../hooks/useSimulator";

type SimulatorControlDockProps = {
  mode?: "floating" | "inline";
};

export function SimulatorControlDock({
  mode = "floating",
}: SimulatorControlDockProps) {
  const { state, connected, lastResult, sendCommand } = useSimulator();

  return (
    <div className="fixed bottom-3 right-3 z-50 w-[360px] rounded border border-(--border) bg-[#050d18]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-(--border) px-3 py-2">
        <div>
          <div className="text-hud text-[11px] font-bold text-(--foreground)">
            AeroNexus Simulator
          </div>
          <div className="text-hud text-[9px] text-(--muted)">
            Backend · WebSocket · SQLite
          </div>
        </div>

        <span
          className={`rounded border px-2 py-1 text-hud text-[9px] ${
            connected
              ? "border-(--nominal) text-(--nominal)"
              : "border-(--critical) text-(--critical)"
          }`}
        >
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 text-[11px]">
        <div className="rounded border border-(--border) bg-[#081320] p-2">
          <div className="flex items-center gap-1.5 text-(--muted)">
            <Battery size={13} />
            Battery
          </div>
          <div className="mt-1 text-hud text-sm font-bold text-(--nominal)">
            {Math.round(state.battery)}%
          </div>
        </div>

        <div className="rounded border border-(--border) bg-[#081320] p-2">
          <div className="flex items-center gap-1.5 text-(--muted)">
            <Radio size={13} />
            Link
          </div>
          <div className="mt-1 text-hud text-sm font-bold text-(--nominal)">
            {state.linkQuality}%
          </div>
        </div>

        <div className="rounded border border-(--border) bg-[#081320] p-2">
          <div className="text-(--muted)">Altitude</div>
          <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
            {state.altitude} m
          </div>
        </div>

        <div className="rounded border border-(--border) bg-[#081320] p-2">
          <div className="text-(--muted)">Mode</div>
          <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
            {state.flightMode}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 border-t border-(--border) p-3">
        <button
          onClick={() => sendCommand("ARM")}
          className="flex h-9 items-center justify-center rounded border border-(--border) bg-[#081320] text-(--nominal) hover:border-(--nominal)"
          title="Arm"
        >
          <Power size={15} />
        </button>

        <button
          onClick={() => sendCommand("START_MISSION")}
          className="flex h-9 items-center justify-center rounded border border-(--border) bg-[#081320] text-(--primary) hover:border-(--primary)"
          title="Start Mission"
        >
          <PlaneTakeoff size={15} />
        </button>

        <button
          onClick={() => sendCommand("RTL")}
          className="flex h-9 items-center justify-center rounded border border-(--border) bg-[#081320] text-(--caution) hover:border-(--caution)"
          title="Return To Home"
        >
          <RotateCcw size={15} />
        </button>

        <button
          onClick={() => sendCommand("LAND")}
          className="flex h-9 items-center justify-center rounded border border-(--border) bg-[#081320] text-(--info) hover:border-(--info)"
          title="Land"
        >
          <LandPlot size={15} />
        </button>

        <button
          onClick={() => sendCommand("DISARM")}
          className="flex h-9 items-center justify-center rounded border border-(--border) bg-[#081320] text-(--critical) hover:border-(--critical)"
          title="Disarm"
        >
          <ShieldCheck size={15} />
        </button>
      </div>

      <div className="border-t border-(--border) px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-(--muted)">
          <Send size={13} />
          {lastResult}
        </div>
      </div>
    </div>
  );
}