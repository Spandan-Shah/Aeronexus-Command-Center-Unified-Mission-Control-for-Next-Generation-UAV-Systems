import {
  useState,
  type ReactNode,
} from "react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  AlertTriangle,
  Battery,
  Camera,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Flame,
  Home,
  Lock,
  MapPinned,
  Plane,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Unlock,
  Usb,
  Video,
  Wifi,
  XCircle,
} from "lucide-react";

import {
  useUnifiedTelemetry,
} from "../hooks/useUnifiedTelemetry";

/* =========================================================
   MissionNexus V2
   Drone Control
   ========================================================= */

type DroneCommand =
  | "ARM"
  | "DISARM"
  | "START_MISSION"
  | "RTL"
  | "LAND";

type CommandTone =
  | "nominal"
  | "caution"
  | "critical"
  | "primary";

type StatusTone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

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
  status:
    | "success"
    | "failed";
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

type FlightMetric = {
  label: string;
  value:
    | string
    | number;
  unit?: string;
  icon: LucideIcon;
  tone: StatusTone;
};

/* =========================================================
   Backend
   ========================================================= */

const API_BASE_URL =
  "http://127.0.0.1:8000";

/* =========================================================
   Commands
   ========================================================= */

const commandButtons: CommandButton[] = [
  {
    command:
      "ARM",

    label:
      "Arm Drone",

    description:
      "Enable aircraft systems after safety validation.",

    icon:
      Unlock,

    tone:
      "caution",

    requiresReady:
      true,
  },

  {
    command:
      "DISARM",

    label:
      "Disarm",

    description:
      "Disable aircraft armed state when safely grounded.",

    icon:
      Lock,

    tone:
      "nominal",

    requiresReady:
      false,
  },

  {
    command:
      "START_MISSION",

    label:
      "Start Mission",

    description:
      "Begin execution of the active mission route.",

    icon:
      CirclePlay,

    tone:
      "primary",

    requiresReady:
      true,
  },

  {
    command:
      "RTL",

    label:
      "Return Home",

    description:
      "Command the aircraft to return to launch.",

    icon:
      Home,

    tone:
      "caution",

    requiresReady:
      false,
  },

  {
    command:
      "LAND",

    label:
      "Land",

    description:
      "Command controlled landing at current position.",

    icon:
      RotateCcw,

    tone:
      "critical",

    requiresReady:
      false,
  },
];

/* =========================================================
   Future functionality
   ========================================================= */

const futureCommands = [
  {
    label:
      "Takeoff",

    description:
      "Pending real flight-controller safety validation.",

    icon:
      Plane,
  },

  {
    label:
      "Hold / Loiter",

    description:
      "Position hold after MAVLink command integration.",

    icon:
      CirclePause,
  },

  {
    label:
      "Pause Mission",

    description:
      "Pause active waypoint execution.",

    icon:
      CirclePause,
  },

  {
    label:
      "Resume Mission",

    description:
      "Resume mission from the paused waypoint.",

    icon:
      CirclePlay,
  },

  {
    label:
      "Skip Waypoint",

    description:
      "Advance mission execution to the next waypoint.",

    icon:
      MapPinned,
  },

  {
    label:
      "Abort Mission",

    description:
      "Controlled mission termination through backend safety gate.",

    icon:
      ShieldAlert,
  },
];

/* =========================================================
   Colors
   ========================================================= */

const commandToneClass:
  Record<
    CommandTone,
    {
      border: string;
      bg: string;
      text: string;
      hover: string;
    }
  > = {
  nominal: {
    border:
      "border-[rgba(89,217,154,0.28)]",

    bg:
      "bg-[rgba(89,217,154,0.045)]",

    text:
      "text-[#59D99A]",

    hover:
      "hover:bg-[rgba(89,217,154,0.08)]",
  },

  caution: {
    border:
      "border-[rgba(246,178,60,0.3)]",

    bg:
      "bg-[rgba(246,178,60,0.05)]",

    text:
      "text-[#F6B23C]",

    hover:
      "hover:bg-[rgba(246,178,60,0.09)]",
  },

  critical: {
    border:
      "border-[rgba(255,90,99,0.32)]",

    bg:
      "bg-[rgba(255,90,99,0.05)]",

    text:
      "text-[#FF5A63]",

    hover:
      "hover:bg-[rgba(255,90,99,0.1)]",
  },

  primary: {
    border:
      "border-[rgba(246,178,60,0.38)]",

    bg:
      "bg-[rgba(246,178,60,0.08)]",

    text:
      "text-[#F6B23C]",

    hover:
      "hover:bg-[rgba(246,178,60,0.13)]",
  },
};

const statusToneClass:
  Record<
    StatusTone,
    string
  > = {
  nominal:
    "text-[#59D99A]",

  caution:
    "text-[#F6B23C]",

  critical:
    "text-[#FF5A63]",

  info:
    "text-[#5AA9FF]",

  muted:
    "text-white/38",
};

/* =========================================================
   Status Helpers
   ========================================================= */

function getBatteryTone(
  battery: number,
): StatusTone {
  if (
    battery <= 20
  ) {
    return "critical";
  }

  if (
    battery <= 40
  ) {
    return "caution";
  }

  return "nominal";
}

function getLinkTone(
  link: number,
): StatusTone {
  if (
    link <= 45
  ) {
    return "critical";
  }

  if (
    link <= 70
  ) {
    return "caution";
  }

  return "nominal";
}

function getRiskTone(
  risk?: string,
): StatusTone {
  if (
    risk === "critical"
  ) {
    return "critical";
  }

  if (
    risk === "high"
  ) {
    return "caution";
  }

  if (
    risk === "medium"
  ) {
    return "info";
  }

  return "nominal";
}

function getTemperatureTone(
  temperature: number,
): StatusTone {
  if (
    temperature >= 60
  ) {
    return "critical";
  }

  if (
    temperature >= 45
  ) {
    return "caution";
  }

  return "nominal";
}

function formatTime() {
  return new Date().toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",
    },
  );
}

function createAuditId() {
  return (
    globalThis.crypto
      ?.randomUUID?.() ??
    `${Date.now()}-${Math.random()}`
  );
}

/* =========================================================
   Metric Cell
   ========================================================= */

function MetricCell({
  metric,
}: {
  metric: FlightMetric;
}) {
  const Icon =
    metric.icon;

  const tone =
    statusToneClass[
      metric.tone
    ];

  return (
    <div
      className={[
        "flex min-w-0 items-center justify-between gap-2",

        "border-r border-white/[0.07]",

        "px-3",

        "last:border-r-0",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.07em] text-white/36">
          {
            metric.label
          }
        </div>

        <div
          className={[
            "mt-1 flex items-baseline gap-1",

            tone,
          ].join(" ")}
        >
          <span className="truncate font-mono text-[16px] font-semibold leading-none">
            {
              metric.value
            }
          </span>

          {metric.unit ? (
            <span className="font-mono text-[9px] font-semibold uppercase text-white/38">
              {
                metric.unit
              }
            </span>
          ) : null}
        </div>
      </div>

      <Icon
        size={15}
        strokeWidth={1.55}
        className={[
          "shrink-0",
          tone,
        ].join(" ")}
      />
    </div>
  );
}

/* =========================================================
   Safety Check
   ========================================================= */

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
    <div className="flex min-h-[42px] items-center justify-between gap-3 border-b border-white/[0.055] px-3 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium text-white/78">
          {label}
        </div>

        <div className="mt-0.5 truncate font-mono text-[9px] text-white/34">
          {detail}
        </div>
      </div>

      {passed ? (
        <CheckCircle2
          size={14}
          strokeWidth={1.65}
          className="shrink-0 text-[#59D99A]"
        />
      ) : (
        <XCircle
          size={14}
          strokeWidth={1.65}
          className="shrink-0 text-[#FF5A63]"
        />
      )}
    </div>
  );
}

/* =========================================================
   Command Button
   ========================================================= */

function FlightCommandButton({
  button,
  loading,
  disabled,
  onClick,
}: {
  button: CommandButton;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon =
    button.icon;

  const tone =
    commandToneClass[
      button.tone
    ];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group min-h-[94px] rounded-[5px] border p-3 text-left",

        tone.border,
        tone.bg,
        tone.text,
        tone.hover,

        "transition-colors duration-150",

        "disabled:cursor-not-allowed disabled:opacity-35",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon
          size={17}
          strokeWidth={1.65}
        />

        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.055em]">
          {loading
            ? "Sending"
            : button.command}
        </span>
      </div>

      <div className="mt-3 text-[12px] font-medium">
        {
          button.label
        }
      </div>

      <p className="mt-1 text-[10px] leading-[1.45] text-white/36">
        {
          button.description
        }
      </p>
    </button>
  );
}

/* =========================================================
   Info Row
   ========================================================= */

function InfoRow({
  label,
  value,
  valueClass =
    "text-white/72",
}: {
  label: string;
  value: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex min-h-[31px] items-center justify-between gap-3 border-b border-white/[0.055] last:border-b-0">
      <span className="text-[11px] text-white/38">
        {label}
      </span>

      <span
        className={[
          "max-w-[60%] truncate text-right font-mono text-[10px] font-medium",

          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   Payload Toggle
   ========================================================= */

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
      type="button"
      onClick={
        onToggle
      }
      className={[
        "flex min-h-[54px] w-full items-center justify-between gap-3",

        "rounded-[5px] border",

        "px-3",

        "text-left",

        "transition-colors duration-150",

        enabled
          ? "border-[rgba(90,169,255,0.28)] bg-[rgba(90,169,255,0.055)]"
          : "border-white/[0.08] bg-[#05060d] hover:border-white/[0.14]",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          size={15}
          strokeWidth={1.6}
          className={
            enabled
              ? "shrink-0 text-[#5AA9FF]"
              : "shrink-0 text-white/34"
          }
        />

        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium text-white/78">
            {label}
          </div>

          <div className="mt-0.5 truncate text-[9px] text-white/34">
            {description}
          </div>
        </div>
      </div>

      <span
        className={[
          "shrink-0 font-mono text-[9px] font-semibold uppercase",

          enabled
            ? "text-[#5AA9FF]"
            : "text-white/30",
        ].join(" ")}
      >
        {enabled
          ? "ON"
          : "OFF"}
      </span>
    </button>
  );
}

/* =========================================================
   Secondary Section
   ========================================================= */

function SecondarySection({
  eyebrow,
  title,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
      <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-white/[0.07] px-4">
        <div>
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.09em] text-[#F6B23C]">
            {eyebrow}
          </div>

          <h2 className="mt-0.5 text-[14px] font-medium text-white/88">
            {title}
          </h2>
        </div>

        {right}
      </div>

      <div className="p-3">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   Future Command
   ========================================================= */

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
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3 opacity-60">
      <div className="flex items-center justify-between">
        <Icon
          size={14}
          strokeWidth={1.6}
          className="text-white/34"
        />

        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.07em] text-white/28">
          Future
        </span>
      </div>

      <div className="mt-2 text-[11px] font-medium text-white/68">
        {label}
      </div>

      <p className="mt-1 text-[9px] leading-[1.45] text-white/30">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   Drone Control
   ========================================================= */

export function DroneControl() {
  const {
    telemetry,
    sources,
    error,
  } =
    useUnifiedTelemetry();

  const [
    pendingCommand,
    setPendingCommand,
  ] =
    useState<
      DroneCommand | null
    >(null);

  const [
    lastCommand,
    setLastCommand,
  ] =
    useState<
      CommandResponse | null
    >(null);

  const [
    sendingCommand,
    setSendingCommand,
  ] =
    useState<
      DroneCommand | null
    >(null);

  const [
    commandError,
    setCommandError,
  ] =
    useState<
      string | null
    >(null);

  const [
    phase0Override,
    setPhase0Override,
  ] =
    useState(
      true,
    );

  const [
    auditLog,
    setAuditLog,
  ] =
    useState<
      AuditEntry[]
    >([]);

  const [
    payloadState,
    setPayloadState,
  ] =
    useState<PayloadState>({
      smokeSensor:
        true,

      temperatureSensor:
        true,

      cameraRecording:
        false,

      mlDetection:
        false,

      secureTelemetry:
        true,
    });

  /* =======================================================
     Telemetry
     ======================================================= */

  const connectedSources =
    sources.filter(
      (
        source,
      ) =>
        source.connected,
    );

  const battery =
    telemetry?.battery ??
    0;

  const link =
    telemetry?.link ??
    0;

  const temperature =
    telemetry?.temperature ??
    0;

  const smoke =
    telemetry?.smoke ??
    0;

  const risk =
    telemetry?.risk ??
    "low";

  const hasGps =
    Boolean(
      telemetry?.gps,
    );

  const backendOnline =
    !error;

  const secureSession =
    Boolean(
      telemetry?.secureSession,
    );

  const criticalRisk =
    risk ===
    "critical";

  /* =======================================================
     Safety
     ======================================================= */

  const safetyChecks = [
    {
      label:
        "Backend Link",

      detail:
        backendOnline
          ? "Command API responding"
          : "Command API offline",

      passed:
        backendOnline,
    },

    {
      label:
        "Battery Level",

      detail:
        `${battery}% available`,

      passed:
        battery >=
        25,
    },

    {
      label:
        "Telemetry Link",

      detail:
        `${link}% link quality`,

      passed:
        link >=
        60,
    },

    {
      label:
        "GPS Lock",

      detail:
        hasGps
          ? "Position available"
          : "GPS unavailable",

      passed:
        hasGps,
    },

    {
      label:
        "Risk State",

      detail:
        `Current risk ${risk.toUpperCase()}`,

      passed:
        !criticalRisk,
    },

    {
      label:
        "Secure Session",

      detail:
        secureSession
          ? "Secure telemetry active"
          : "Secure session off",

      passed:
        secureSession,
    },
  ];

  const passedSafetyChecks =
    safetyChecks.filter(
      (
        check,
      ) =>
        check.passed,
    ).length;

  const readyToArm =
    safetyChecks.every(
      (
        check,
      ) =>
        check.passed,
    );

  const commandAllowed =
    backendOnline &&
    (
      readyToArm ||
      phase0Override
    );

  /* =======================================================
     Metrics
     ======================================================= */

  const flightMetrics:
    FlightMetric[] = [
      {
        label:
          "Battery",

        value:
          battery,

        unit:
          "%",

        icon:
          Battery,

        tone:
          getBatteryTone(
            battery,
          ),
      },

      {
        label:
          "Link",

        value:
          link,

        unit:
          "%",

        icon:
          Radio,

        tone:
          getLinkTone(
            link,
          ),
      },

      {
        label:
          "Risk",

        value:
          risk.toUpperCase(),

        icon:
          AlertTriangle,

        tone:
          getRiskTone(
            risk,
          ),
      },

      {
        label:
          "Temperature",

        value:
          temperature,

        unit:
          "°C",

        icon:
          Thermometer,

        tone:
          getTemperatureTone(
            temperature,
          ),
      },

      {
        label:
          "GPS",

        value:
          hasGps
            ? "LOCK"
            : "NO LOCK",

        icon:
          MapPinned,

        tone:
          hasGps
            ? "nominal"
            : "caution",
      },

      {
        label:
          "Secure",

        value:
          secureSession
            ? "ACTIVE"
            : "OFF",

        icon:
          ShieldCheck,

        tone:
          secureSession
            ? "nominal"
            : "caution",
      },
    ];

  /* =======================================================
     Audit
     ======================================================= */

  function addAudit(
    entry: Omit<
      AuditEntry,
      "id" | "time"
    >,
  ) {
    setAuditLog(
      (
        current,
      ) => [
        {
          ...entry,

          id:
            createAuditId(),

          time:
            formatTime(),
        },

        ...current,
      ],
    );
  }

  /* =======================================================
     Commands
     ======================================================= */

  async function sendCommand(
    command: DroneCommand,
  ) {
    try {
      setSendingCommand(
        command,
      );

      setCommandError(
        null,
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/command`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  command,
                },
              ),
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `Command failed with status ${response.status}`,
        );
      }

      const data =
        (
          await response.json()
        ) as CommandResponse;

      setLastCommand(
        data,
      );

      addAudit({
        command,

        result:
          data.result,

        risk,

        source:
          telemetry?.source ??
          "unknown",

        status:
          "success",
      });
    } catch (
      requestError
    ) {
      const message =
        requestError instanceof
        Error
          ? requestError.message
          : "Unable to send command";

      setCommandError(
        message,
      );

      addAudit({
        command,

        result:
          message,

        risk,

        source:
          telemetry?.source ??
          "unknown",

        status:
          "failed",
      });
    } finally {
      setSendingCommand(
        null,
      );

      setPendingCommand(
        null,
      );
    }
  }

  function requestCommand(
    command: DroneCommand,
  ) {
    setPendingCommand(
      command,
    );
  }

  function isButtonDisabled(
    button: CommandButton,
  ) {
    if (
      Boolean(
        sendingCommand,
      )
    ) {
      return true;
    }

    if (
      !backendOnline
    ) {
      return true;
    }

    if (
      button.requiresReady &&
      !commandAllowed
    ) {
      return true;
    }

    return false;
  }

  /* =======================================================
     Payload
     ======================================================= */

  function togglePayload(
    key:
      keyof PayloadState,
  ) {
    setPayloadState(
      (
        current,
      ) => ({
        ...current,

        [key]:
          !current[
            key
          ],
      }),
    );
  }

  /* =======================================================
     Source state
     ======================================================= */

  const esp32Connected =
    connectedSources.some(
      (
        source,
      ) =>
        source.source ===
          "esp32_wifi" ||
        source.source ===
          "esp32_usb",
    );

  const cameraConnected =
    connectedSources.some(
      (
        source,
      ) =>
        source.source ===
        "camera_ml",
    );

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div className="bg-[#05060d] text-white">
      {/* ===================================================
          PRIMARY OPERATOR VIEWPORT
          =================================================== */}

      <section className="xl:h-[calc(100vh-70px)] xl:overflow-hidden">
        <div
          className={[
            "mx-auto w-full max-w-[1600px]",

            "px-4 pb-3 pt-2",

            "sm:px-6",

            "lg:px-8",

            "xl:grid xl:h-full",

            "xl:grid-rows-[44px_64px_minmax(0,1fr)]",

            "xl:gap-2",

            "xl:px-10",

            "2xl:px-14",
          ].join(" ")}
        >
          {/* ===============================================
              Page Header
              =============================================== */}

          <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h1 className="text-[16px] font-medium tracking-[-0.02em] text-white">
                Drone Control
              </h1>

              <p className="mt-0.5 hidden truncate text-[11px] text-white/42 sm:block">
                Aircraft commands · safety gate · live control state
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className={[
                  "flex h-[30px] items-center gap-2 rounded-[4px] border px-2.5",

                  "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                  backendOnline
                    ? "border-[rgba(89,217,154,0.24)] bg-[rgba(89,217,154,0.045)] text-[#59D99A]"
                    : "border-[rgba(255,90,99,0.26)] bg-[rgba(255,90,99,0.045)] text-[#FF5A63]",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",

                    backendOnline
                      ? "bg-[#59D99A]"
                      : "bg-[#FF5A63]",
                  ].join(" ")}
                />

                {backendOnline
                  ? "Command Link Online"
                  : "Command Link Offline"}
              </div>
            </div>
          </header>

          {/* ===============================================
              Flight Metric Strip
              =============================================== */}

          <section
            className={[
              "my-2 grid overflow-hidden",

              "rounded-[6px] border border-white/[0.08]",

              "bg-[#07090d]",

              "grid-cols-2",

              "md:grid-cols-3",

              "xl:my-0 xl:grid-cols-6",
            ].join(" ")}
          >
            {flightMetrics.map(
              (
                metric,
              ) => (
                <MetricCell
                  key={
                    metric.label
                  }
                  metric={
                    metric
                  }
                />
              ),
            )}
          </section>

          {/* ===============================================
              Primary Control Workspace
              =============================================== */}

          <section
            className={[
              "mt-3 grid min-h-[720px] overflow-hidden",

              "rounded-[6px] border border-white/[0.09]",

              "bg-[#020304]",

              "xl:mt-0 xl:min-h-0",

              "xl:grid-cols-[minmax(0,1fr)_390px]",

              "2xl:grid-cols-[minmax(0,1fr)_410px]",
            ].join(" ")}
          >
            {/* =============================================
                LEFT — COMMAND OPERATIONS
                ============================================= */}

            <div className="grid min-h-0 grid-rows-[42px_auto_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex items-center gap-2">
                  <Plane
                    size={13}
                    strokeWidth={1.6}
                    className="text-[#F6B23C]"
                  />

                  <span className="text-[12px] font-medium text-white/86">
                    Flight Command Console
                  </span>
                </div>

                <span
                  className={[
                    "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                    readyToArm
                      ? "text-[#59D99A]"
                      : "text-[#F6B23C]",
                  ].join(" ")}
                >
                  {readyToArm
                    ? "Ready to Arm"
                    : `${passedSafetyChecks}/${safetyChecks.length} Safety Checks`}
                </span>
              </div>

              {/* Primary Commands */}

              <div className="border-b border-white/[0.08] p-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  {commandButtons.map(
                    (
                      button,
                    ) => (
                      <FlightCommandButton
                        key={
                          button.command
                        }
                        button={
                          button
                        }
                        loading={
                          sendingCommand ===
                          button.command
                        }
                        disabled={isButtonDisabled(
                          button,
                        )}
                        onClick={() =>
                          requestCommand(
                            button.command,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              </div>

              {/* Safety Gate */}

              <div className="grid min-h-0 xl:grid-cols-[0.82fr_1.18fr]">
                <div className="border-b border-white/[0.08] p-3 xl:border-b-0 xl:border-r">
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center",

                        "rounded-[5px] border",

                        readyToArm
                          ? "border-[rgba(89,217,154,0.25)] bg-[rgba(89,217,154,0.055)]"
                          : "border-[rgba(246,178,60,0.26)] bg-[rgba(246,178,60,0.055)]",
                      ].join(" ")}
                    >
                      {readyToArm ? (
                        <ShieldCheck
                          size={17}
                          strokeWidth={1.65}
                          className="text-[#59D99A]"
                        />
                      ) : (
                        <ShieldAlert
                          size={17}
                          strokeWidth={1.65}
                          className="text-[#F6B23C]"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-white/86">
                        Safety Gate
                      </div>

                      <div className="mt-1 font-mono text-[10px] text-white/38">
                        {passedSafetyChecks}
                        /
                        {safetyChecks.length}{" "}
                        checks passed
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                    <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-white/34">
                      Command Authorization
                    </div>

                    <div
                      className={[
                        "mt-1.5 font-mono text-[12px] font-semibold",

                        commandAllowed
                          ? "text-[#59D99A]"
                          : "text-[#FF5A63]",
                      ].join(" ")}
                    >
                      {commandAllowed
                        ? "AUTHORIZED"
                        : "BLOCKED"}
                    </div>

                    <p className="mt-2 text-[10px] leading-[1.55] text-white/34">
                      Commands requiring flight readiness are gated by telemetry,
                      GPS, battery, link quality, backend state and secure session.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPhase0Override(
                        (
                          current,
                        ) =>
                          !current,
                      )
                    }
                    className={[
                      "mt-3 flex h-[36px] w-full items-center justify-between gap-2",

                      "rounded-[5px] border px-3",

                      "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                      phase0Override
                        ? "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.055)] text-[#F6B23C]"
                        : "border-white/[0.08] bg-[#05060d] text-white/38",
                    ].join(" ")}
                  >
                    <span>
                      Phase 0 Simulator Override
                    </span>

                    <span>
                      {phase0Override
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </button>
                </div>

                {/* Validation checks */}

                <div className="min-h-0 overflow-y-auto">
                  <div className="flex h-[38px] items-center justify-between border-b border-white/[0.07] px-3">
                    <span className="text-[12px] font-medium text-white/72">
                      Pre-Command Validation
                    </span>

                    <span className="font-mono text-[9px] text-white/32">
                      LIVE
                    </span>
                  </div>

                  <div>
                    {safetyChecks.map(
                      (
                        check,
                      ) => (
                        <SafetyCheckRow
                          key={
                            check.label
                          }
                          label={
                            check.label
                          }
                          detail={
                            check.detail
                          }
                          passed={
                            check.passed
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* =============================================
                RIGHT — AIRCRAFT STATE
                ============================================= */}

            <aside className="grid min-h-0 grid-rows-[52px_auto_auto_minmax(0,1fr)] border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3">
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.075em] text-[#F6B23C]">
                    Aircraft State
                  </div>

                  <div className="mt-0.5 font-mono text-[9px] text-white/34">
                    Live command context
                  </div>
                </div>

                <span
                  className={[
                    "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                    telemetry
                      ? "text-[#59D99A]"
                      : "text-white/32",
                  ].join(" ")}
                >
                  {telemetry
                    ? "Telemetry Live"
                    : "No Telemetry"}
                </span>
              </div>

              <div className="border-b border-white/[0.08] px-3 py-2">
                <InfoRow
                  label="Device"
                  value={
                    telemetry?.device ??
                    "Unknown"
                  }
                />

                <InfoRow
                  label="Source"
                  value={
                    telemetry?.source ??
                    "none"
                  }
                />

                <InfoRow
                  label="Flight Mode"
                  value={
                    telemetry?.flightMode ??
                    "UNKNOWN"
                  }
                  valueClass="text-[#5AA9FF]"
                />

                <InfoRow
                  label="GPS"
                  value={
                    telemetry?.gps
                      ? `${telemetry.gps.lat.toFixed(
                          5,
                        )}, ${telemetry.gps.lng.toFixed(
                          5,
                        )}`
                      : "No lock"
                  }
                  valueClass={
                    hasGps
                      ? "text-[#59D99A]"
                      : "text-[#F6B23C]"
                  }
                />

                <InfoRow
                  label="Smoke"
                  value={
                    smoke
                  }
                />

                <InfoRow
                  label="Secure Session"
                  value={
                    secureSession
                      ? "ACTIVE"
                      : "OFF"
                  }
                  valueClass={
                    secureSession
                      ? "text-[#59D99A]"
                      : "text-[#F6B23C]"
                  }
                />
              </div>

              <div className="grid grid-cols-2 border-b border-white/[0.08]">
                <div className="border-r border-white/[0.07] px-3 py-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/32">
                    Sources Online
                  </div>

                  <div className="mt-1 font-mono text-[15px] font-semibold text-[#5AA9FF]">
                    {
                      connectedSources.length
                    }
                    /
                    {
                      sources.length
                    }
                  </div>
                </div>

                <div className="px-3 py-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/32">
                    Safety Score
                  </div>

                  <div
                    className={[
                      "mt-1 font-mono text-[15px] font-semibold",

                      readyToArm
                        ? "text-[#59D99A]"
                        : "text-[#F6B23C]",
                    ].join(" ")}
                  >
                    {
                      passedSafetyChecks
                    }
                    /
                    {
                      safetyChecks.length
                    }
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-3">
                {error ? (
                  <div className="rounded-[5px] border border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.055)] p-3">
                    <div className="flex items-center gap-2 text-[#FF5A63]">
                      <XCircle
                        size={14}
                        strokeWidth={1.65}
                      />

                      <span className="text-[11px] font-medium">
                        Backend Offline
                      </span>
                    </div>

                    <p className="mt-1.5 text-[10px] leading-[1.5] text-white/38">
                      {error}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[5px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.04)] p-3">
                    <div className="flex items-center gap-2 text-[#59D99A]">
                      <CheckCircle2
                        size={14}
                        strokeWidth={1.65}
                      />

                      <span className="text-[11px] font-medium">
                        Command Backend Available
                      </span>
                    </div>

                    <p className="mt-1.5 text-[10px] leading-[1.5] text-white/38">
                      Backend command endpoint is responding. Flight commands
                      remain subject to the active safety gate.
                    </p>
                  </div>
                )}

                {phase0Override ? (
                  <div className="mt-2 rounded-[5px] border border-[rgba(246,178,60,0.22)] bg-[rgba(246,178,60,0.04)] p-3">
                    <div className="flex items-center gap-2 text-[#F6B23C]">
                      <AlertTriangle
                        size={14}
                        strokeWidth={1.65}
                      />

                      <span className="text-[11px] font-medium">
                        Simulator Override Active
                      </span>
                    </div>

                    <p className="mt-1.5 text-[10px] leading-[1.5] text-white/38">
                      Readiness-gated commands may be authorized for simulator
                      and indoor Phase 0 testing.
                    </p>
                  </div>
                ) : null}
              </div>
            </aside>
          </section>
        </div>
      </section>

      {/* ===================================================
          SECONDARY OPERATOR FEATURES
          =================================================== */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div
          className={[
            "mx-auto grid w-full max-w-[1600px] gap-4",

            "px-4 py-5",

            "sm:px-6",

            "lg:px-8",

            "xl:grid-cols-2 xl:px-10",

            "2xl:px-14",
          ].join(" ")}
        >
          {/* ===============================================
              Payload Controls
              =============================================== */}

          <SecondarySection
            eyebrow="Aircraft Payload"
            title="Payload Controls"
          >
            <div className="grid gap-2 md:grid-cols-2">
              <PayloadToggle
                label="Smoke Sensor"
                description="Payload smoke sensor stream"
                icon={
                  Flame
                }
                enabled={
                  payloadState.smokeSensor
                }
                onToggle={() =>
                  togglePayload(
                    "smokeSensor",
                  )
                }
              />

              <PayloadToggle
                label="Temperature Sensor"
                description="Thermal and temperature telemetry"
                icon={
                  Thermometer
                }
                enabled={
                  payloadState.temperatureSensor
                }
                onToggle={() =>
                  togglePayload(
                    "temperatureSensor",
                  )
                }
              />

              <PayloadToggle
                label="Camera Recording"
                description="Local camera capture state"
                icon={
                  Camera
                }
                enabled={
                  payloadState.cameraRecording
                }
                onToggle={() =>
                  togglePayload(
                    "cameraRecording",
                  )
                }
              />

              <PayloadToggle
                label="ML Detection"
                description="Human and fire detection pipeline"
                icon={
                  Video
                }
                enabled={
                  payloadState.mlDetection
                }
                onToggle={() =>
                  togglePayload(
                    "mlDetection",
                  )
                }
              />

              {/* ===========================================
                  Secure Telemetry

                  Last standalone card is centered while
                  preserving the same width as one grid card.
                  =========================================== */}

              <div className="flex justify-center md:col-span-2">
                <div className="w-full md:w-[calc(50%-0.25rem)]">
                  <PayloadToggle
                    label="Secure Telemetry"
                    description="Goblin Wisp secure session payload flag"
                    icon={
                      ShieldCheck
                    }
                    enabled={
                      payloadState.secureTelemetry
                    }
                    onToggle={() =>
                      togglePayload(
                        "secureTelemetry",
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </SecondarySection>

          {/* ===============================================
              Connection Sources
              =============================================== */}

          <SecondarySection
            eyebrow="Telemetry"
            title="Connection Sources"
            right={
              <span className="font-mono text-[9px] font-semibold uppercase text-[#5AA9FF]">
                {
                  connectedSources.length
                }{" "}
                Online
              </span>
            }
          >
            <div className="grid gap-2">
              {sources.length ===
              0 ? (
                <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3 text-[11px] text-white/36">
                  No telemetry sources registered.
                </div>
              ) : (
                sources.map(
                  (
                    source,
                  ) => (
                    <div
                      key={
                        source.source
                      }
                      className="flex min-h-[50px] items-center justify-between gap-3 rounded-[5px] border border-white/[0.07] bg-[#05060d] px-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {source.source.includes(
                          "wifi",
                        ) ? (
                          <Wifi
                            size={14}
                            strokeWidth={1.6}
                            className={
                              source.connected
                                ? "shrink-0 text-[#59D99A]"
                                : "shrink-0 text-white/30"
                            }
                          />
                        ) : source.source.includes(
                            "usb",
                          ) ? (
                          <Usb
                            size={14}
                            strokeWidth={1.6}
                            className={
                              source.connected
                                ? "shrink-0 text-[#59D99A]"
                                : "shrink-0 text-white/30"
                            }
                          />
                        ) : (
                          <Radio
                            size={14}
                            strokeWidth={1.6}
                            className={
                              source.connected
                                ? "shrink-0 text-[#59D99A]"
                                : "shrink-0 text-white/30"
                            }
                          />
                        )}

                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-medium text-white/72">
                            {
                              source.label
                            }
                          </div>

                          <div className="mt-0.5 truncate font-mono text-[9px] text-white/30">
                            {
                              source.source
                            }
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div
                          className={[
                            "font-mono text-[9px] font-semibold uppercase",

                            source.connected
                              ? "text-[#59D99A]"
                              : "text-white/30",
                          ].join(" ")}
                        >
                          {source.connected
                            ? "Online"
                            : "Offline"}
                        </div>

                        <div className="mt-0.5 font-mono text-[8px] text-white/28">
                          {
                            source.packets
                          }{" "}
                          pkt
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </SecondarySection>

          {/* ===============================================
              Real Flight Readiness
              =============================================== */}

          <SecondarySection
            eyebrow="Integration"
            title="Real Flight Readiness"
          >
            <div>
              <InfoRow
                label="Command Link"
                value="Simulator Backend"
                valueClass="text-[#5AA9FF]"
              />

              <InfoRow
                label="Flight Controller"
                value="Not connected"
                valueClass="text-white/34"
              />

              <InfoRow
                label="ESP32 Sensors"
                value={
                  esp32Connected
                    ? "Connected"
                    : "Offline"
                }
                valueClass={
                  esp32Connected
                    ? "text-[#59D99A]"
                    : "text-white/34"
                }
              />

              <InfoRow
                label="Camera ML"
                value={
                  cameraConnected
                    ? "Connected"
                    : "Offline"
                }
                valueClass={
                  cameraConnected
                    ? "text-[#59D99A]"
                    : "text-white/34"
                }
              />

              <InfoRow
                label="MAVLink"
                value="Future"
                valueClass="text-white/34"
              />

              <InfoRow
                label="LoRa / Secure Payload"
                value="Future"
                valueClass="text-white/34"
              />
            </div>
          </SecondarySection>

          {/* ===============================================
              Future Commands
              =============================================== */}

          <SecondarySection
            eyebrow="Flight Functions"
            title="Pending Command Integrations"
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {futureCommands.map(
                (
                  command,
                ) => (
                  <FutureCommandCard
                    key={
                      command.label
                    }
                    label={
                      command.label
                    }
                    description={
                      command.description
                    }
                    icon={
                      command.icon
                    }
                  />
                ),
              )}
            </div>
          </SecondarySection>

          {/* ===============================================
              Command Audit
              =============================================== */}

          <div className="xl:col-span-2">
            <SecondarySection
              eyebrow="Command History"
              title="Command Audit"
              right={
                <span className="font-mono text-[9px] uppercase text-white/32">
                  {
                    auditLog.length
                  }{" "}
                  Events
                </span>
              }
            >
              {auditLog.length ===
              0 ? (
                <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] px-3 py-4 text-[11px] text-white/36">
                  No command has been sent during this session.
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto rounded-[5px] border border-white/[0.07] bg-[#05060d]">
                  {auditLog.map(
                    (
                      entry,
                    ) => (
                      <div
                        key={
                          entry.id
                        }
                        className="grid min-h-[52px] grid-cols-[110px_minmax(0,1fr)_90px] items-center gap-3 border-b border-white/[0.055] px-3 last:border-b-0"
                      >
                        <div>
                          <div className="font-mono text-[10px] font-semibold text-white/72">
                            {
                              entry.command
                            }
                          </div>

                          <div className="mt-0.5 font-mono text-[8px] text-white/28">
                            {
                              entry.time
                            }
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[10px] text-white/46">
                            {
                              entry.result
                            }
                          </div>

                          <div className="mt-0.5 truncate font-mono text-[8px] text-white/28">
                            {
                              entry.source
                            }{" "}
                            · Risk{" "}
                            {
                              entry.risk.toUpperCase()
                            }
                          </div>
                        </div>

                        <div
                          className={[
                            "text-right font-mono text-[9px] font-semibold uppercase",

                            entry.status ===
                            "success"
                              ? "text-[#59D99A]"
                              : "text-[#FF5A63]",
                          ].join(" ")}
                        >
                          {
                            entry.status
                          }
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </SecondarySection>
          </div>
        </div>
      </section>

      {/* ===================================================
          COMMAND CONFIRMATION
          =================================================== */}

      {pendingCommand ? (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/72 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[440px] overflow-hidden rounded-[6px] border border-white/[0.12] bg-[#07090d] shadow-[0_28px_90px_rgba(0,0,0,0.72)]">
            <div className="flex items-start gap-3 border-b border-white/[0.08] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.055)]">
                <AlertTriangle
                  size={17}
                  strokeWidth={1.65}
                  className="text-[#F6B23C]"
                />
              </div>

              <div>
                <h2 className="text-[14px] font-medium text-white">
                  Confirm Command
                </h2>

                <p className="mt-1 text-[11px] leading-[1.55] text-white/40">
                  Confirm transmission of{" "}
                  <span className="font-mono font-semibold text-[#F6B23C]">
                    {
                      pendingCommand
                    }
                  </span>{" "}
                  through the active backend command link.
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 overflow-hidden rounded-[5px] border border-white/[0.07] bg-[#030405]">
                <div className="border-r border-white/[0.07] px-3 py-2.5">
                  <div className="font-mono text-[8px] uppercase tracking-[0.06em] text-white/30">
                    Risk
                  </div>

                  <div
                    className={[
                      "mt-1 font-mono text-[10px] font-semibold uppercase",

                      statusToneClass[
                        getRiskTone(
                          risk,
                        )
                      ],
                    ].join(" ")}
                  >
                    {
                      risk
                    }
                  </div>
                </div>

                <div className="px-3 py-2.5">
                  <div className="font-mono text-[8px] uppercase tracking-[0.06em] text-white/30">
                    Command Link
                  </div>

                  <div
                    className={[
                      "mt-1 font-mono text-[10px] font-semibold uppercase",

                      backendOnline
                        ? "text-[#59D99A]"
                        : "text-[#FF5A63]",
                    ].join(" ")}
                  >
                    {backendOnline
                      ? "Online"
                      : "Offline"}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-[1.55] text-white/34">
                Phase 0 currently controls the simulator backend. Real aircraft
                command authorization should remain subject to hardware and
                flight-controller safety validation.
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPendingCommand(
                      null,
                    )
                  }
                  className="h-[34px] rounded-[4px] border border-white/[0.1] px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-white/48 transition hover:border-white/[0.18] hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void sendCommand(
                      pendingCommand,
                    )
                  }
                  className="h-[34px] rounded-[4px] bg-[#F6B23C] px-4 font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-black transition hover:opacity-90"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================
          LAST COMMAND
          =================================================== */}

      {lastCommand ? (
        <div className="fixed bottom-4 left-1/2 z-[5900] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[5px] border border-[rgba(89,217,154,0.25)] bg-[rgba(7,9,13,0.96)] px-4 py-2 shadow-xl backdrop-blur">
          <div className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-[#59D99A]">
            Last Command ·{" "}
            {
              lastCommand.command
            }{" "}
            ·{" "}
            {
              lastCommand.result
            }
          </div>
        </div>
      ) : null}

      {/* ===================================================
          COMMAND ERROR
          =================================================== */}

      {commandError ? (
        <div className="fixed bottom-14 left-1/2 z-[5900] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[5px] border border-[rgba(255,90,99,0.28)] bg-[rgba(7,9,13,0.96)] px-4 py-2 shadow-xl backdrop-blur">
          <div className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-[#FF5A63]">
            {
              commandError
            }
          </div>
        </div>
      ) : null}
    </div>
  );
}