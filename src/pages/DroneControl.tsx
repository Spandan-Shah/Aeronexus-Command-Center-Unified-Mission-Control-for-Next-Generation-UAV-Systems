import { useState } from "react";
import {
  AlertTriangle,
  Battery,
  Home,
  Lock,
  Plane,
  Power,
  Radio,
  RotateCcw,
  ShieldCheck,
  Skull,
  Unlock,
} from "lucide-react";
import { MetricCard } from "../components/common/MetricCard";
import { Panel } from "../components/common/Panel";
import { useUnifiedTelemetry } from "../hooks/useUnifiedTelemetry";

type DroneCommand = "ARM" | "DISARM" | "START_MISSION" | "RTL" | "LAND";

type CommandResponse = {
  command: string;
  result: string;
  state?: unknown;
};

const API_BASE_URL = "http://127.0.0.1:8000";

const commandButtons: {
  command: DroneCommand;
  label: string;
  description: string;
  icon: typeof Power;
  tone: "safe" | "warning" | "danger" | "primary";
}[] = [
  {
    command: "ARM",
    label: "Arm Drone",
    description: "Enable drone systems for mission readiness.",
    icon: Unlock,
    tone: "warning",
  },
  {
    command: "DISARM",
    label: "Disarm Drone",
    description: "Disable armed state after safe condition.",
    icon: Lock,
    tone: "safe",
  },
  {
    command: "START_MISSION",
    label: "Start Mission",
    description: "Begin planned autonomous mission sequence.",
    icon: Plane,
    tone: "primary",
  },
  {
    command: "RTL",
    label: "Return to Launch",
    description: "Command drone to return to home position.",
    icon: Home,
    tone: "warning",
  },
  {
    command: "LAND",
    label: "Land",
    description: "Command drone to land safely.",
    icon: RotateCcw,
    tone: "danger",
  },
];

const toneClass = {
  safe: "border-(--nominal) text-(--nominal) hover:bg-[rgba(73,229,143,0.08)]",
  warning:
    "border-(--caution) text-(--caution) hover:bg-[rgba(246,178,60,0.08)]",
  danger:
    "border-(--critical) text-(--critical) hover:bg-[rgba(255,77,77,0.08)]",
  primary:
    "border-(--primary) text-(--primary) hover:bg-[rgba(41,211,255,0.08)]",
};

function getBatteryStatus(battery: number) {
  if (battery <= 20) return "critical";
  if (battery <= 40) return "caution";
  return "nominal";
}

function getLinkStatus(link: number) {
  if (link <= 45) return "critical";
  if (link <= 70) return "caution";
  return "nominal";
}

function getRiskStatus(risk?: string) {
  if (risk === "critical") return "critical";
  if (risk === "high") return "caution";
  if (risk === "medium") return "info";
  return "nominal";
}

export function DroneControl() {
  const { telemetry, sources, error } = useUnifiedTelemetry();

  const [lastCommand, setLastCommand] = useState<CommandResponse | null>(null);
  const [sendingCommand, setSendingCommand] = useState<DroneCommand | null>(
    null
  );
  const [commandError, setCommandError] = useState<string | null>(null);

  const connectedSources = sources.filter((source) => source.connected);
  const battery = telemetry?.battery ?? 0;
  const link = telemetry?.link ?? 0;
  const risk = telemetry?.risk ?? "low";

  async function sendCommand(command: DroneCommand) {
    try {
      setSendingCommand(command);
      setCommandError(null);

      const response = await fetch(`${API_BASE_URL}/api/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
        }),
      });

      if (!response.ok) {
        throw new Error(`Command failed with status ${response.status}`);
      }

      const data = (await response.json()) as CommandResponse;
      setLastCommand(data);
    } catch (requestError) {
      setCommandError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send command"
      );
    } finally {
      setSendingCommand(null);
    }
  }

  return (
    <div className="h-full overflow-hidden p-3">
      <div className="grid h-full min-h-0 grid-cols-12 gap-3">
        <section className="col-span-12 min-h-0 xl:col-span-8">
          <Panel
            title="Drone Command Console"
            right={
              <span className="text-hud text-[10px] text-(--caution)">
                PHASE 0 / SIMULATED COMMAND LINK
              </span>
            }
            className="h-full"
          >
            <div className="flex h-full min-h-0 flex-col p-3">
              <div className="rounded border border-(--caution) bg-[rgba(246,178,60,0.08)] p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-(--caution)" size={18} />

                  <div>
                    <h2 className="text-hud text-xs text-(--caution)">
                      Safety Gate
                    </h2>

                    <p className="mt-1 text-xs leading-relaxed text-(--muted)">
                      These controls currently send commands to the backend
                      simulator. Before real drone use, hardware safety checks,
                      arming confirmation, GPS lock validation, battery limits,
                      propeller safety, and emergency cutoff must be enforced in
                      the backend.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {commandButtons.map((button) => {
                  const Icon = button.icon;
                  const loading = sendingCommand === button.command;

                  return (
                    <button
                      key={button.command}
                      onClick={() => void sendCommand(button.command)}
                      disabled={Boolean(sendingCommand)}
                      className={`rounded border bg-[#07111f] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        toneClass[button.tone]
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={20} />
                        <span className="text-hud text-[10px]">
                          {loading ? "SENDING" : button.command}
                        </span>
                      </div>

                      <div className="mt-4 text-hud text-sm">
                        {button.label}
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-(--muted)">
                        {button.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                <Panel title="Last Command">
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between rounded bg-[#07111f] px-3 py-2">
                      <span className="text-hud text-[10px] text-(--muted)">
                        Command
                      </span>
                      <span className="text-hud text-xs text-(--foreground)">
                        {lastCommand?.command ?? "No command sent"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded bg-[#07111f] px-3 py-2">
                      <span className="text-hud text-[10px] text-(--muted)">
                        Result
                      </span>
                      <span className="text-hud text-xs text-(--primary)">
                        {lastCommand?.result ?? "Waiting"}
                      </span>
                    </div>

                    {commandError && (
                      <div className="rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-2 text-xs text-(--critical)">
                        {commandError}
                      </div>
                    )}
                  </div>
                </Panel>

                <Panel title="Emergency Zone">
                  <div className="p-3">
                    <button
                      onClick={() => void sendCommand("LAND")}
                      disabled={Boolean(sendingCommand)}
                      className="flex w-full items-center justify-center gap-2 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-4 py-4 text-hud text-sm font-bold text-(--critical) transition hover:bg-[rgba(255,77,77,0.14)] disabled:opacity-50"
                    >
                      <Skull size={18} />
                      Emergency Land
                    </button>

                    <p className="mt-2 text-xs leading-relaxed text-(--muted)">
                      For real drone deployment, this must become a backend
                      safety-controlled command with confirmation and hardware
                      failsafe.
                    </p>
                  </div>
                </Panel>
              </div>
            </div>
          </Panel>
        </section>

        <section className="col-span-12 flex min-h-0 flex-col gap-3 xl:col-span-4">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Battery"
              value={battery}
              unit="%"
              icon={Battery}
              status={getBatteryStatus(battery)}
            />

            <MetricCard
              label="Link"
              value={link}
              unit="%"
              icon={Radio}
              status={getLinkStatus(link)}
            />

            <MetricCard
              label="Risk"
              value={risk.toUpperCase()}
              icon={AlertTriangle}
              status={getRiskStatus(risk)}
            />

            <MetricCard
              label="Secure"
              value={telemetry?.secureSession ? "YES" : "NO"}
              icon={ShieldCheck}
              status={telemetry?.secureSession ? "nominal" : "caution"}
            />
          </div>

          <Panel title="Active Telemetry">
            <div className="space-y-2 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-(--muted)">Device</span>
                <span className="text-(--foreground)">
                  {telemetry?.device ?? "Unknown"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-(--muted)">Source</span>
                <span className="text-(--foreground)">
                  {telemetry?.source ?? "none"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-(--muted)">GPS</span>
                <span className="text-(--foreground)">
                  {telemetry?.gps
                    ? `${telemetry.gps.lat.toFixed(5)}, ${telemetry.gps.lng.toFixed(5)}`
                    : "No lock"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-(--muted)">Temperature</span>
                <span className="text-(--foreground)">
                  {telemetry?.temperature ?? 0}°C
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-(--muted)">Smoke</span>
                <span className="text-(--foreground)">
                  {telemetry?.smoke ?? 0}
                </span>
              </div>

              {error && (
                <div className="rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-2 text-(--critical)">
                  Backend offline: {error}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Connected Sources" className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {connectedSources.length === 0 && (
                <div className="text-xs text-(--muted)">
                  No active data source detected.
                </div>
              )}

              {connectedSources.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between rounded border border-(--border) bg-[#07111f] px-3 py-2"
                >
                  <div>
                    <div className="text-hud text-[10px] text-(--foreground)">
                      {source.label}
                    </div>

                    <div className="text-hud text-[9px] text-(--muted)">
                      {source.source}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-hud text-[9px] text-(--nominal)">
                      ONLINE
                    </div>

                    <div className="text-hud text-[9px] text-(--muted)">
                      {source.packets} pkt
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}