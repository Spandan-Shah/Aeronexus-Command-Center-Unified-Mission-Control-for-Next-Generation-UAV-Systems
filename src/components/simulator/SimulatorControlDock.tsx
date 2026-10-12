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
  const {
    state,
    connected,
    lastResult,
    sendCommand,
  } = useSimulator();

  const containerClass =
    mode === "floating"
      ? [
          "fixed bottom-3 right-3 z-50",
          "w-[360px] max-w-[calc(100vw-24px)]",
          "rounded-md",
          "border border-[var(--border-soft)]",
          "bg-[rgba(5,7,9,0.95)]",
          "shadow-[0_24px_70px_rgba(0,0,0,0.58)]",
          "backdrop-blur-xl",
        ].join(" ")
      : [
          "relative",
          "w-full",
          "rounded-md",
          "border border-[var(--border-soft)]",
          "bg-[var(--surface-1)]",
        ].join(" ");

  return (
    <section className={containerClass}>
      {/* ===================================================
          Header
          =================================================== */}

      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3 py-2.5">
        <div>
          <div className="text-hud text-[10px] font-semibold tracking-[0.12em] text-[var(--foreground)]">
            MissionNexus Simulator
          </div>

          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted-soft)]">
            Backend · WebSocket · SQLite
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1",
            "font-mono text-[8px] font-semibold uppercase tracking-[0.1em]",

            connected
              ? "border-[rgba(89,217,154,0.25)] bg-[rgba(89,217,154,0.06)] text-[var(--nominal)]"
              : "border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.06)] text-[var(--critical)]",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",

              connected
                ? "bg-[var(--nominal)]"
                : "bg-[var(--critical)]",
            ].join(" ")}
          />

          {connected ? "Live" : "Offline"}
        </span>
      </div>

      {/* ===================================================
          Telemetry
          =================================================== */}

      <div className="grid grid-cols-2 gap-2 p-3">
        <MetricCard
          icon={Battery}
          label="Battery"
          value={`${Math.round(state.battery)}%`}
          valueClass="text-[var(--nominal)]"
        />

        <MetricCard
          icon={Radio}
          label="Link"
          value={`${state.linkQuality}%`}
          valueClass="text-[var(--nominal)]"
        />

        <MetricCard
          label="Altitude"
          value={`${state.altitude} m`}
          valueClass="text-[var(--primary)]"
        />

        <MetricCard
          label="Flight Mode"
          value={state.flightMode}
          valueClass="text-[var(--foreground)]"
        />
      </div>

      {/* ===================================================
          Command Dock
          =================================================== */}

      <div className="grid grid-cols-5 gap-2 border-t border-[var(--border-soft)] p-3">
        <CommandButton
          title="Arm"
          tone="nominal"
          onClick={() =>
            sendCommand(
              "ARM",
            )
          }
        >
          <Power size={15} />
        </CommandButton>

        <CommandButton
          title="Start Mission"
          tone="primary"
          onClick={() =>
            sendCommand(
              "START_MISSION",
            )
          }
        >
          <PlaneTakeoff size={15} />
        </CommandButton>

        <CommandButton
          title="Return To Home"
          tone="caution"
          onClick={() =>
            sendCommand(
              "RTL",
            )
          }
        >
          <RotateCcw size={15} />
        </CommandButton>

        <CommandButton
          title="Land"
          tone="info"
          onClick={() =>
            sendCommand(
              "LAND",
            )
          }
        >
          <LandPlot size={15} />
        </CommandButton>

        <CommandButton
          title="Disarm"
          tone="critical"
          onClick={() =>
            sendCommand(
              "DISARM",
            )
          }
        >
          <ShieldCheck size={15} />
        </CommandButton>
      </div>

      {/* ===================================================
          Last Command Result
          =================================================== */}

      <div className="border-t border-[var(--border-soft)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Send
            size={12}
            className="shrink-0 text-[var(--primary)]"
          />

          <span className="truncate font-mono text-[9px] text-[var(--muted)]">
            {lastResult}
          </span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   Metric Card
   ========================================================= */

function MetricCard({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon?: typeof Battery;
  label: string;
  value: string | number;
  valueClass: string;
}) {
  return (
    <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-0)] p-2.5">
      <div className="flex items-center gap-1.5">
        {Icon ? (
          <Icon
            size={12}
            strokeWidth={1.6}
            className="text-[var(--muted)]"
          />
        ) : null}

        <span className="font-mono text-[8px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </span>
      </div>

      <div
        className={[
          "mt-1.5 font-mono text-[13px] font-semibold",
          valueClass,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   Command Button
   ========================================================= */

type CommandTone =
  | "primary"
  | "nominal"
  | "caution"
  | "info"
  | "critical";

function CommandButton({
  title,
  tone,
  onClick,
  children,
}: {
  title: string;
  tone: CommandTone;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones: Record<
    CommandTone,
    string
  > = {
    primary:
      "text-[var(--primary)] hover:border-[rgba(246,178,60,0.45)] hover:bg-[rgba(246,178,60,0.07)]",

    nominal:
      "text-[var(--nominal)] hover:border-[rgba(89,217,154,0.4)] hover:bg-[rgba(89,217,154,0.06)]",

    caution:
      "text-[var(--caution)] hover:border-[rgba(246,178,60,0.45)] hover:bg-[rgba(246,178,60,0.06)]",

    info:
      "text-[var(--info)] hover:border-[rgba(90,169,255,0.4)] hover:bg-[rgba(90,169,255,0.06)]",

    critical:
      "text-[var(--critical)] hover:border-[rgba(255,90,99,0.45)] hover:bg-[rgba(255,90,99,0.06)]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        "flex h-9 items-center justify-center rounded-md",
        "border border-[var(--border-soft)]",
        "bg-[var(--surface-0)]",
        "transition",
        tones[tone],
      ].join(" ")}
    >
      {children}
    </button>
  );
}