import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Battery,
  Camera,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Crosshair,
  Flame,
  Gauge,
  Home,
  Lock,
  MapPinned,
  Plane,
  Power,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Thermometer,
  Unlock,
  Usb,
  Video,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import { MetricCard } from "../components/common/MetricCard";
import { Panel } from "../components/common/Panel";
import { useUnifiedTelemetry } from "../hooks/useUnifiedTelemetry";

type DroneCommand = "ARM" | "DISARM" | "START_MISSION" | "RTL" | "LAND";

type CommandTone = "safe" | "warning" | "danger" | "primary";

type MetricStatus = "nominal" | "caution" | "critical" | "info";

type CommandResponse = {
  command: string;
  result: string;
  state?: unknown;
};

type AuditEntry = {
  id: string;
  time: string;
  command: string;
  result: string;
  risk: string;
  source: string;
  status: "success" | "failed";
};

type CommandButton = {
  command: DroneCommand;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: CommandTone;
  requiresReady: boolean;
};

type PayloadState = {
  smokeSensor: boolean;
  temperatureSensor: boolean;
  cameraRecording: boolean;
  mlDetection: boolean;
  secureTelemetry: boolean;
};

const API_BASE_URL = "http://127.0.0.1:8000";

const commandButtons: CommandButton[] = [
  {
    command: "ARM",
    label: "Arm Drone",
    description: "Enable drone systems after safety checks pass.",
    icon: Unlock,
    tone: "warning",
    requiresReady: true,
  },
  {
    command: "DISARM",
    label: "Disarm Drone",
    description: "Disable armed state after safe condition.",
    icon: Lock,
    tone: "safe",
    requiresReady: false,
  },
  {
    command: "START_MISSION",
    label: "Start Mission",
    description: "Begin planned autonomous mission sequence.",
    icon: Plane,
    tone: "primary",
    requiresReady: true,
  },
  {
    command: "RTL",
    label: "Return to Launch",
    description: "Command drone to return to home position.",
    icon: Home,
    tone: "warning",
    requiresReady: false,
  },
  {
    command: "LAND",
    label: "Land",
    description: "Command drone to land safely.",
    icon: RotateCcw,
    tone: "danger",
    requiresReady: false,
  },
];

const futureCommands = [
  {
    label: "Takeoff",
    description: "Needs real flight controller safety validation.",
    icon: Plane,
  },
  {
    label: "Hold / Loiter",
    description: "Will pause position after MAVLink integration.",
    icon: CirclePause,
  },
  {
    label: "Pause Mission",
    description: "Will pause waypoint execution later.",
    icon: CirclePause,
  },
  {
    label: "Resume Mission",
    description: "Will resume mission after pause.",
    icon: CirclePlay,
  },
  {
    label: "Skip Waypoint",
    description: "Will move to next waypoint later.",
    icon: MapPinned,
  },
  {
    label: "Abort Mission",
    description: "Will stop mission with backend safety gate.",
    icon: ShieldAlert,
  },
];

const toneClass: Record<CommandTone, string> = {
  safe: "border-(--nominal) text-(--nominal) hover:bg-[rgba(73,229,143,0.08)]",
  warning:
    "border-(--caution) text-(--caution) hover:bg-[rgba(246,178,60,0.08)]",
  danger:
    "border-(--critical) text-(--critical) hover:bg-[rgba(255,77,77,0.08)]",
  primary:
    "border-(--primary) text-(--primary) hover:bg-[rgba(41,211,255,0.08)]",
};

function getBatteryStatus(battery: number): MetricStatus {
  if (battery <= 20) return "critical";
  if (battery <= 40) return "caution";
  return "nominal";
}

function getLinkStatus(link: number): MetricStatus {
  if (link <= 45) return "critical";
  if (link <= 70) return "caution";
  return "nominal";
}

function getRiskStatus(risk?: string): MetricStatus {
  if (risk === "critical") return "critical";
  if (risk === "high") return "caution";
  if (risk === "medium") return "info";
  return "nominal";
}

function getTemperatureStatus(temperature: number): MetricStatus {
  if (temperature >= 60) return "critical";
  if (temperature >= 45) return "caution";
  return "nominal";
}

function formatTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SafetyCheckRow({
  label,
  detail,
  passed,
}: {
  label: string;
  detail: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-(--border) bg-[#07111f] px-3 py-2">
      <div>
        <div className="text-hud text-[10px] text-(--foreground)">
          {label}
        </div>
        <div className="mt-0.5 text-[10px] text-(--muted)">{detail}</div>
      </div>

      {passed ? (
        <CheckCircle2 size={16} className="text-(--nominal)" />
      ) : (
        <XCircle size={16} className="text-(--critical)" />
      )}
    </div>
  );
}

function PayloadToggle({
  label,
  description,
  icon: Icon,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between rounded border px-3 py-2 text-left transition ${
        enabled
          ? "border-(--primary) bg-[rgba(41,211,255,0.08)]"
          : "border-(--border) bg-[#07111f]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          size={16}
          className={enabled ? "text-(--primary)" : "text-(--muted)"}
        />

        <div className="min-w-0">
          <div className="text-hud text-[10px] text-(--foreground)">
            {label}
          </div>
          <div className="text-[10px] text-(--muted)">{description}</div>
        </div>
      </div>

      <div
        className={`text-hud text-[9px] ${
          enabled ? "text-(--primary)" : "text-(--muted)"
        }`}
      >
        {enabled ? "ON" : "OFF"}
      </div>
    </button>
  );
}

function FutureCommandCard({
  label,
  description,
  icon: Icon,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded border border-(--border) bg-[#07111f] p-3 opacity-70">
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-(--muted)" />
        <span className="text-hud text-[9px] text-(--muted)">FUTURE</span>
      </div>

      <div className="mt-3 text-hud text-xs text-(--foreground)">{label}</div>
      <p className="mt-1 text-[10px] leading-relaxed text-(--muted)">
        {description}
      </p>
    </div>
  );
}

function SmallInfoRow({
  label,
  value,
  valueClass = "text-(--foreground)",
}: {
  label: string;
  value: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-(--muted)">{label}</span>
      <span className={`text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

export function DroneControl() {
  const { telemetry, sources, error } = useUnifiedTelemetry();

  const [pendingCommand, setPendingCommand] = useState<DroneCommand | null>(
    null
  );
  const [lastCommand, setLastCommand] = useState<CommandResponse | null>(null);
  const [sendingCommand, setSendingCommand] = useState<DroneCommand | null>(
    null
  );
  const [commandError, setCommandError] = useState<string | null>(null);
  const [phase0Override, setPhase0Override] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [payloadState, setPayloadState] = useState<PayloadState>({
    smokeSensor: true,
    temperatureSensor: true,
    cameraRecording: false,
    mlDetection: false,
    secureTelemetry: true,
  });

  const connectedSources = sources.filter((source) => source.connected);

  const battery = telemetry?.battery ?? 0;
  const link = telemetry?.link ?? 0;
  const temperature = telemetry?.temperature ?? 0;
  const smoke = telemetry?.smoke ?? 0;
  const risk = telemetry?.risk ?? "low";
  const hasGps = Boolean(telemetry?.gps);
  const backendOnline = !error;
  const secureSession = Boolean(telemetry?.secureSession);
  const criticalRisk = risk === "critical";

  const safetyChecks = [
    {
      label: "Backend Link",
      detail: backendOnline ? "Backend API responding" : "Backend offline",
      passed: backendOnline,
    },
    {
      label: "Battery Level",
      detail: `${battery}% available`,
      passed: battery >= 25,
    },
    {
      label: "Telemetry Link",
      detail: `${link}% link quality`,
      passed: link >= 60,
    },
    {
      label: "GPS Lock",
      detail: hasGps ? "GPS position available" : "GPS unavailable",
      passed: hasGps,
    },
    {
      label: "Risk State",
      detail: `Current risk is ${risk.toUpperCase()}`,
      passed: !criticalRisk,
    },
    {
      label: "Secure Session",
      detail: secureSession ? "Secure telemetry active" : "Secure session off",
      passed: secureSession,
    },
  ];

  const passedSafetyChecks = safetyChecks.filter((check) => check.passed).length;
  const readyToArm = safetyChecks.every((check) => check.passed);
  const commandAllowed = backendOnline && (readyToArm || phase0Override);

  function addAudit(entry: Omit<AuditEntry, "id" | "time">) {
    setAuditLog((current) => [
      {
        ...entry,
        id: crypto.randomUUID(),
        time: formatTime(),
      },
      ...current,
    ]);
  }

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

      addAudit({
        command,
        result: data.result,
        risk,
        source: telemetry?.source ?? "unknown",
        status: "success",
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to send command";

      setCommandError(message);

      addAudit({
        command,
        result: message,
        risk,
        source: telemetry?.source ?? "unknown",
        status: "failed",
      });
    } finally {
      setSendingCommand(null);
      setPendingCommand(null);
    }
  }

  function requestCommand(command: DroneCommand) {
    setPendingCommand(command);
  }

  function isButtonDisabled(button: CommandButton) {
    if (Boolean(sendingCommand)) return true;
    if (!backendOnline) return true;
    if (button.requiresReady && !commandAllowed) return true;

    return false;
  }

  function togglePayload(key: keyof PayloadState) {
    setPayloadState((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid min-h-full grid-cols-12 gap-3">
        <section className="col-span-12 space-y-3 xl:col-span-8">
          <Panel
            title="Safety Gate"
            right={
              <span
                className={`text-hud text-[10px] ${
                  readyToArm ? "text-(--nominal)" : "text-(--caution)"
                }`}
              >
                {readyToArm ? "READY TO ARM" : "NOT READY"}
              </span>
            }
          >
            <div className="grid gap-3 p-3 xl:grid-cols-2">
              <div className="rounded border border-(--border) bg-[#07111f] p-3">
                <div className="flex items-start gap-3">
                  {readyToArm ? (
                    <ShieldCheck
                      size={22}
                      className="mt-0.5 text-(--nominal)"
                    />
                  ) : (
                    <ShieldAlert
                      size={22}
                      className="mt-0.5 text-(--caution)"
                    />
                  )}

                  <div>
                    <h2 className="text-hud text-sm text-(--foreground)">
                      Safety Score: {passedSafetyChecks}/{safetyChecks.length}
                    </h2>

                    <p className="mt-1 text-xs leading-relaxed text-(--muted)">
                      Drone commands are protected by telemetry, GPS, battery,
                      secure session, and backend-link checks. Phase 0 override
                      is enabled for simulator and indoor testing only.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPhase0Override((current) => !current)}
                  className={`mt-3 flex w-full items-center justify-between rounded border px-3 py-2 text-hud text-[10px] ${
                    phase0Override
                      ? "border-(--caution) bg-[rgba(246,178,60,0.08)] text-(--caution)"
                      : "border-(--border) text-(--muted)"
                  }`}
                >
                  <span>Phase 0 Simulator Override</span>
                  <span>{phase0Override ? "ENABLED" : "DISABLED"}</span>
                </button>
              </div>

              <div className="grid gap-2">
                {safetyChecks.map((check) => (
                  <SafetyCheckRow
                    key={check.label}
                    label={check.label}
                    detail={check.detail}
                    passed={check.passed}
                  />
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Flight Command Console">
            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
              {commandButtons.map((button) => {
                const Icon = button.icon;
                const loading = sendingCommand === button.command;
                const disabled = isButtonDisabled(button);

                return (
                  <button
                    key={button.command}
                    onClick={() => requestCommand(button.command)}
                    disabled={disabled}
                    className={`rounded border bg-[#07111f] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      toneClass[button.tone]
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon size={20} />

                      <span className="text-hud text-[10px]">
                        {loading ? "SENDING" : button.command}
                      </span>
                    </div>

                    <div className="mt-4 text-hud text-sm">{button.label}</div>

                    <p className="mt-2 text-xs leading-relaxed text-(--muted)">
                      {button.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <Panel title="Mission Execution">
              <div className="grid gap-3 p-3 md:grid-cols-2">
                <button
                  onClick={() => requestCommand("START_MISSION")}
                  disabled={!commandAllowed || Boolean(sendingCommand)}
                  className="rounded border border-(--primary) bg-[rgba(41,211,255,0.08)] p-3 text-left text-(--primary) disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CirclePlay size={18} />
                  <div className="mt-3 text-hud text-xs">Start Mission</div>
                  <p className="mt-1 text-[10px] text-(--muted)">
                    Execute uploaded mission route.
                  </p>
                </button>

                {futureCommands.map((command) => (
                  <FutureCommandCard
                    key={command.label}
                    label={command.label}
                    description={command.description}
                    icon={command.icon}
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Payload Controls">
              <div className="grid gap-2 p-3">
                <PayloadToggle
                  label="Smoke Sensor"
                  description="Payload smoke sensor stream"
                  icon={Flame}
                  enabled={payloadState.smokeSensor}
                  onToggle={() => togglePayload("smokeSensor")}
                />

                <PayloadToggle
                  label="Temperature Sensor"
                  description="Thermal / temperature telemetry"
                  icon={Thermometer}
                  enabled={payloadState.temperatureSensor}
                  onToggle={() => togglePayload("temperatureSensor")}
                />

                <PayloadToggle
                  label="Camera Recording"
                  description="Local camera capture state"
                  icon={Camera}
                  enabled={payloadState.cameraRecording}
                  onToggle={() => togglePayload("cameraRecording")}
                />

                <PayloadToggle
                  label="ML Detection"
                  description="Human / fire detection pipeline"
                  icon={Video}
                  enabled={payloadState.mlDetection}
                  onToggle={() => togglePayload("mlDetection")}
                />

                <PayloadToggle
                  label="Secure Telemetry"
                  description="Goblin Wisp secure session flag"
                  icon={ShieldCheck}
                  enabled={payloadState.secureTelemetry}
                  onToggle={() => togglePayload("secureTelemetry")}
                />
              </div>
            </Panel>
          </div>

          <Panel
            title="Emergency Zone"
            right={
              <span className="text-hud text-[10px] text-(--critical)">
                HIGH RISK COMMANDS
              </span>
            }
          >
            <div className="grid gap-3 p-3 md:grid-cols-3">
              <button
                onClick={() => requestCommand("LAND")}
                disabled={!backendOnline || Boolean(sendingCommand)}
                className="flex items-center justify-center gap-2 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-4 py-4 text-hud text-sm font-bold text-(--critical) transition hover:bg-[rgba(255,77,77,0.14)] disabled:opacity-50"
              >
                <Skull size={18} />
                Emergency Land
              </button>

              <button
                onClick={() => requestCommand("RTL")}
                disabled={!backendOnline || Boolean(sendingCommand)}
                className="flex items-center justify-center gap-2 rounded border border-(--caution) bg-[rgba(246,178,60,0.08)] px-4 py-4 text-hud text-sm font-bold text-(--caution) transition hover:bg-[rgba(246,178,60,0.14)] disabled:opacity-50"
              >
                <Home size={18} />
                Return Home
              </button>

              <button
                disabled
                className="flex cursor-not-allowed items-center justify-center gap-2 rounded border border-(--border) bg-[#07111f] px-4 py-4 text-hud text-sm font-bold text-(--muted) opacity-50"
              >
                <Power size={18} />
                Kill Switch Future
              </button>
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
              label="Temp"
              value={temperature}
              unit="°C"
              icon={Thermometer}
              status={getTemperatureStatus(temperature)}
            />
          </div>

          <Panel title="Live Drone State">
            <div className="space-y-2 p-3 text-xs">
              <SmallInfoRow
                label="Device"
                value={telemetry?.device ?? "Unknown"}
              />

              <SmallInfoRow
                label="Source"
                value={telemetry?.source ?? "none"}
              />

              <SmallInfoRow
                label="Flight Mode"
                value={telemetry?.flightMode ?? "UNKNOWN"}
              />

              <SmallInfoRow
                label="GPS"
                value={
                  telemetry?.gps
                    ? `${telemetry.gps.lat.toFixed(
                        5
                      )}, ${telemetry.gps.lng.toFixed(5)}`
                    : "No lock"
                }
              />

              <SmallInfoRow label="Smoke" value={smoke} />

              <SmallInfoRow
                label="Secure Session"
                value={secureSession ? "ACTIVE" : "OFF"}
                valueClass={
                  secureSession ? "text-(--nominal)" : "text-(--caution)"
                }
              />

              {error && (
                <div className="rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-2 text-(--critical)">
                  Backend offline: {error}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Connection Sources">
            <div className="space-y-2 p-3">
              {sources.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between rounded border border-(--border) bg-[#07111f] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {source.source.includes("wifi") ? (
                      <Wifi
                        size={15}
                        className={
                          source.connected
                            ? "text-(--nominal)"
                            : "text-(--muted)"
                        }
                      />
                    ) : source.source.includes("usb") ? (
                      <Usb
                        size={15}
                        className={
                          source.connected
                            ? "text-(--nominal)"
                            : "text-(--muted)"
                        }
                      />
                    ) : (
                      <Radio
                        size={15}
                        className={
                          source.connected
                            ? "text-(--nominal)"
                            : "text-(--muted)"
                        }
                      />
                    )}

                    <div>
                      <div className="text-hud text-[10px] text-(--foreground)">
                        {source.label}
                      </div>

                      <div className="text-hud text-[9px] text-(--muted)">
                        {source.source}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-hud text-[9px] ${
                        source.connected
                          ? "text-(--nominal)"
                          : "text-(--muted)"
                      }`}
                    >
                      {source.connected ? "ONLINE" : "OFFLINE"}
                    </div>

                    <div className="text-hud text-[9px] text-(--muted)">
                      {source.packets} pkt
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Real Flight Readiness">
            <div className="space-y-2 p-3 text-xs">
              <SmallInfoRow
                label="Command Link"
                value="Simulator Backend"
                valueClass="text-(--primary)"
              />

              <SmallInfoRow
                label="Flight Controller"
                value="Not connected"
                valueClass="text-(--muted)"
              />

              <SmallInfoRow
                label="ESP32 Sensors"
                value={
                  connectedSources.some(
                    (source) =>
                      source.source === "esp32_wifi" ||
                      source.source === "esp32_usb"
                  )
                    ? "Connected"
                    : "Offline"
                }
                valueClass={
                  connectedSources.some(
                    (source) =>
                      source.source === "esp32_wifi" ||
                      source.source === "esp32_usb"
                  )
                    ? "text-(--nominal)"
                    : "text-(--muted)"
                }
              />

              <SmallInfoRow
                label="Camera ML"
                value={
                  connectedSources.some(
                    (source) => source.source === "camera_ml"
                  )
                    ? "Connected"
                    : "Offline"
                }
                valueClass={
                  connectedSources.some(
                    (source) => source.source === "camera_ml"
                  )
                    ? "text-(--nominal)"
                    : "text-(--muted)"
                }
              />

              <SmallInfoRow
                label="MAVLink"
                value="Future"
                valueClass="text-(--muted)"
              />

              <SmallInfoRow
                label="LoRa / Secure Payload"
                value="Future"
                valueClass="text-(--muted)"
              />
            </div>
          </Panel>

          <Panel title="Command Audit" className="min-h-70">
            <div className="max-h-70 space-y-2 overflow-auto p-3">
              {auditLog.length === 0 && (
                <div className="text-xs text-(--muted)">
                  No command sent yet.
                </div>
              )}

              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded border border-(--border) bg-[#07111f] p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-hud text-[10px] text-(--foreground)">
                      {entry.command}
                    </span>

                    <span
                      className={`text-hud text-[9px] ${
                        entry.status === "success"
                          ? "text-(--nominal)"
                          : "text-(--critical)"
                      }`}
                    >
                      {entry.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-1 text-[10px] text-(--muted)">
                    {entry.time} · {entry.source} · Risk{" "}
                    {entry.risk.toUpperCase()}
                  </div>

                  <div className="mt-1 text-[10px] text-(--primary)">
                    {entry.result}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>

      {pendingCommand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded border border-(--border) bg-[#050d18] p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="mt-0.5 text-(--caution)" />

              <div>
                <h2 className="text-hud text-sm text-(--foreground)">
                  Confirm Command
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-(--muted)">
                  You are about to send{" "}
                  <span className="text-(--primary)">{pendingCommand}</span> to
                  the backend command link. In Phase 0 this controls the
                  simulator. For real flight, backend hardware safety checks must
                  validate this command.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingCommand(null)}
                className="rounded border border-(--border) px-3 py-2 text-hud text-[10px] text-(--muted) hover:text-(--foreground)"
              >
                Cancel
              </button>

              <button
                onClick={() => void sendCommand(pendingCommand)}
                className="rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f]"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {lastCommand && (
        <div className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 rounded border border-(--primary) bg-[#050d18]/95 px-4 py-2 text-hud text-[10px] text-(--primary) shadow-xl">
          LAST COMMAND: {lastCommand.command} · {lastCommand.result}
        </div>
      )}

      {commandError && (
        <div className="fixed bottom-14 left-1/2 z-40 -translate-x-1/2 rounded border border-(--critical) bg-[#050d18]/95 px-4 py-2 text-hud text-[10px] text-(--critical) shadow-xl">
          {commandError}
        </div>
      )}
    </div>
  );
}