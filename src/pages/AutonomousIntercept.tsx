import {
  AlertTriangle,
  BrainCircuit,
  CirclePause,
  Cpu,
  Gauge,
  Home,
  MapPinned,
  Navigation,
  Pause,
  Plane,
  Play,
  Radio,
  RotateCcw,
  Route,
  Satellite,
  ShieldCheck,
  Target,
  Usb,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  InterceptMap,
} from "../components/intercept/InterceptMap";

import {
  useInterceptSimulation,
} from "../hooks/useInterceptSimulation";

import type {
  PredictorMode,
} from "../hooks/useInterceptSimulation";

/* =========================================================
   Types
   ========================================================= */

type MetricTone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

type Metric = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: MetricTone;
};

const toneClass:
  Record<
    MetricTone,
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
   Formatting
   ========================================================= */

function formatDistance(
  meters: number,
) {
  if (
    meters >=
    1000
  ) {
    return `${(
      meters /
      1000
    ).toFixed(
      2,
    )} km`;
  }

  return `${Math.round(
    meters,
  )} m`;
}

function formatEta(
  seconds:
    number | null,
) {
  if (
    seconds ===
      null ||
    !Number.isFinite(
      seconds,
    ) ||
    seconds >
      999
  ) {
    return "—";
  }

  return `${seconds.toFixed(
    1,
  )} s`;
}

function formatError(
  value:
    number | null,
) {
  if (
    value ===
    null
  ) {
    return "WARMING";
  }

  return `${value.toFixed(
    1,
  )} m`;
}

/* =========================================================
   Metric
   ========================================================= */

function MetricCell({
  metric,
}: {
  metric: Metric;
}) {
  const Icon =
    metric.icon;

  const tone =
    toneClass[
      metric.tone
    ];

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-r border-white/[0.07] px-3 last:border-r-0">
      <div className="min-w-0">
        <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.065em] text-white/36">
          {metric.label}
        </div>

        <div
          className={[
            "mt-1 truncate font-mono text-[15px] font-semibold leading-none",

            tone,
          ].join(" ")}
        >
          {metric.value}
        </div>
      </div>

      <Icon
        size={15}
        strokeWidth={1.6}
        className={[
          "shrink-0",
          tone,
        ].join(" ")}
      />
    </div>
  );
}

/* =========================================================
   State Row
   ========================================================= */

function StateRow({
  label,
  value,
  valueClass =
    "text-white/70",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex min-h-[29px] items-center justify-between gap-3 border-b border-white/[0.055] last:border-b-0">
      <span className="text-[10px] text-white/38">
        {label}
      </span>

      <span
        className={[
          "max-w-[62%] truncate text-right font-mono text-[10px] font-medium",

          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   Command Button
   ========================================================= */

function CommandButton({
  label,
  icon: Icon,
  onClick,
  tone =
    "normal",
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;

  tone?:
    | "normal"
    | "primary"
    | "danger";
}) {
  const style =
    tone ===
    "danger"
      ? "border-[rgba(255,90,99,0.26)] bg-[rgba(255,90,99,0.045)] text-[#FF5A63] hover:bg-[rgba(255,90,99,0.09)]"
      : tone ===
          "primary"
        ? "border-[rgba(246,178,60,0.3)] bg-[rgba(246,178,60,0.06)] text-[#F6B23C] hover:bg-[rgba(246,178,60,0.11)]"
        : "border-white/[0.08] bg-[#05060d] text-white/58 hover:border-white/[0.16] hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-[38px] items-center justify-center gap-2 rounded-[5px] border px-2",

        "font-mono text-[9px] font-semibold uppercase tracking-[0.04em]",

        "transition-colors duration-150",

        style,
      ].join(" ")}
    >
      <Icon
        size={12}
        strokeWidth={1.65}
      />

      {label}
    </button>
  );
}

/* =========================================================
   Predictor Button
   ========================================================= */

function PredictorButton({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[5px] border p-2.5 text-left transition-colors",

        active
          ? "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.06)]"
          : "border-white/[0.07] bg-[#05060d] hover:border-white/[0.14]",
      ].join(" ")}
    >
      <div
        className={[
          "font-mono text-[9px] font-semibold uppercase",

          active
            ? "text-[#F6B23C]"
            : "text-white/54",
        ].join(" ")}
      >
        {label}
      </div>

      <div className="mt-1 text-[9px] leading-[1.4] text-white/30">
        {description}
      </div>
    </button>
  );
}

/* =========================================================
   Evidence Metric
   ========================================================= */

function EvidenceMetric({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;

  tone:
    | "neutral"
    | "green"
    | "amber"
    | "red";
}) {
  const valueClass =
    tone ===
    "green"
      ? "text-[#59D99A]"
      : tone ===
          "amber"
        ? "text-[#F6B23C]"
        : tone ===
            "red"
          ? "text-[#FF5A63]"
          : "text-white/66";

  const borderClass =
    tone ===
    "green"
      ? "border-[rgba(89,217,154,0.20)] bg-[rgba(89,217,154,0.03)]"
      : tone ===
          "amber"
        ? "border-[rgba(246,178,60,0.20)] bg-[rgba(246,178,60,0.03)]"
        : tone ===
            "red"
          ? "border-[rgba(255,90,99,0.20)] bg-[rgba(255,90,99,0.03)]"
          : "border-white/[0.07] bg-[#05060d]";

  return (
    <div
      className={[
        "rounded-[5px] border p-3",
        borderClass,
      ].join(" ")}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.04em] text-white/34">
        {label}
      </div>

      <div
        className={[
          "mt-2 font-mono text-[18px] font-semibold",
          valueClass,
        ].join(" ")}
      >
        {value}
      </div>

      <div className="mt-1 text-[10px] leading-[1.45] text-white/30">
        {description}
      </div>
    </div>
  );
}

/* =========================================================
   Autonomous Intercept
   ========================================================= */

export function AutonomousIntercept() {
  const {
    snapshot,
    actions,
  } =
    useInterceptSimulation();

  const aiConfidence =
    Math.round(
      snapshot.ai
        .confidence *
        100,
    );

  const improvement =
    snapshot.performance
      .improvementPercent;

  const evidenceReady =
    snapshot.performance
      .validationSamples >=
    3;

  const mlImproving =
    evidenceReady &&
    improvement !==
      null &&
    improvement >
      0;

  const improvementTone:
    | "green"
    | "amber"
    | "red" =
    !evidenceReady
      ? "amber"
      : mlImproving
        ? "green"
        : "red";

  const improvementValue =
    improvement ===
    null
      ? "WARMING"
      : `${improvement >=
          0
          ? "+"
          : ""}${improvement.toFixed(
          1,
        )}%`;

  const metrics:
    Metric[] = [
      {
        label:
          "Leader Link",

        value:
          snapshot.gamepad
            .connected
            ? "USB MANUAL"
            : "SIM AUTO",

        icon:
          Radio,

        tone:
          snapshot.gamepad
            .connected
            ? "nominal"
            : "info",
      },

      {
        label:
          "Follower",

        value:
          snapshot.follower
            .mode,

        icon:
          Plane,

        tone:
          snapshot.mode ===
            "ABORT"
            ? "critical"
            : "nominal",
      },

      {
        label:
          "Separation",

        value:
          formatDistance(
            snapshot.distanceMeters,
          ),

        icon:
          Navigation,

        tone:
          snapshot.separationSafe
            ? "nominal"
            : "critical",
      },

      {
        label:
          "Closing Rate",

        value:
          `${snapshot.closingRateMps.toFixed(
            1,
          )} m/s`,

        icon:
          Gauge,

        tone:
          snapshot.closingRateMps >
          0
            ? "info"
            : "caution",
      },

      {
        label:
          "Intercept ETA",

        value:
          formatEta(
            snapshot.etaSeconds,
          ),

        icon:
          Target,

        tone:
          snapshot.etaSeconds !==
          null
            ? "caution"
            : "muted",
      },

      {
        label:
          "ML Confidence",

        value:
          snapshot.ai
            .ready
            ? `${aiConfidence}%`
            : "WARMING",

        icon:
          BrainCircuit,

        tone:
          snapshot.ai
            .ready
            ? "nominal"
            : "caution",
      },
    ];

  function selectPredictor(
    predictor:
      PredictorMode,
  ) {
    actions.setPredictorMode(
      predictor,
    );
  }

  return (
    <div className="bg-[#05060d] text-white">
      {/* ===================================================
          PRIMARY VIEWPORT
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
          {/* =================================================
              Header
              ================================================= */}

          <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h1 className="text-[16px] font-medium tracking-[-0.02em] text-white">
                Autonomous Intercept
              </h1>

              <p className="mt-0.5 hidden truncate text-[11px] text-white/42 sm:block">
                Fixed-wing leader–follower AI guidance · trajectory prediction · non-contact shadowing
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-[30px] items-center gap-2 rounded-[4px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.04)] px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-[#59D99A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#59D99A]" />

                Phase 1 Simulation
              </div>

              <div className="hidden h-[30px] items-center gap-2 rounded-[4px] border border-[rgba(246,178,60,0.22)] bg-[rgba(246,178,60,0.04)] px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-[#F6B23C] md:flex">
                <Satellite
                  size={11}
                />

                Real Satellite Map
              </div>

              <div className="hidden h-[30px] items-center gap-2 rounded-[4px] border border-[rgba(90,169,255,0.22)] bg-[rgba(90,169,255,0.04)] px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-[#5AA9FF] lg:flex">
                <ShieldCheck
                  size={11}
                />

                Human-in-loop
              </div>
            </div>
          </header>

          {/* =================================================
              Metrics
              ================================================= */}

          <section className="my-2 grid grid-cols-2 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d] md:grid-cols-3 xl:my-0 xl:grid-cols-6">
            {metrics.map(
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

          {/* =================================================
              Workspace
              ================================================= */}

          <section className="mt-3 grid min-h-[780px] overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#020304] xl:mt-0 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_410px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
            {/* ===============================================
                Map
                =============================================== */}

            <div className="grid min-h-0 grid-rows-[42px_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <MapPinned
                    size={13}
                    className="shrink-0 text-[#F6B23C]"
                  />

                  <span className="truncate text-[12px] font-medium text-white/84">
                    Geospatial Intercept Workspace
                  </span>

                  <span className="hidden rounded-[3px] border border-[rgba(89,217,154,0.18)] bg-[rgba(89,217,154,0.035)] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[#59D99A] lg:inline">
                    Live
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-white/32">
                    T+
                    {
                      snapshot.simTimeSeconds.toFixed(
                        1,
                      )
                    }
                    s
                  </span>

                  <button
                    type="button"
                    onClick={
                      actions.toggleRunning
                    }
                    className="flex h-[28px] items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-[#05060d] px-2.5 font-mono text-[8px] font-semibold uppercase text-white/54 transition hover:border-white/[0.16] hover:text-white"
                  >
                    {snapshot.running ? (
                      <Pause
                        size={10}
                      />
                    ) : (
                      <Play
                        size={10}
                      />
                    )}

                    {snapshot.running
                      ? "Pause"
                      : "Run"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      actions.reset
                    }
                    className="flex h-[28px] items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-[#05060d] px-2.5 font-mono text-[8px] font-semibold uppercase text-white/54 transition hover:border-white/[0.16] hover:text-white"
                  >
                    <RotateCcw
                      size={10}
                    />

                    Reset
                  </button>
                </div>
              </div>

              <InterceptMap
                snapshot={
                  snapshot
                }
              />
            </div>

            {/* ===============================================
                RIGHT RAIL
                =============================================== */}

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              {/* =============================================
                  Mission State
                  ============================================= */}

              <div className="border-b border-white/[0.08]">
                <div className="flex h-[48px] items-center justify-between gap-3 px-3">
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.065em] text-[#F6B23C]">
                      Intercept State
                    </div>

                    <div className="mt-0.5 text-[10px] text-white/34">
                      Autonomous mission state machine
                    </div>
                  </div>

                  <span
                    className={[
                      "rounded-[4px] border px-2 py-1 font-mono text-[9px] font-semibold uppercase",

                      snapshot.mode ===
                      "ABORT"
                        ? "border-[rgba(255,90,99,0.3)] bg-[rgba(255,90,99,0.04)] text-[#FF5A63]"
                        : "border-[rgba(90,169,255,0.25)] bg-[rgba(90,169,255,0.04)] text-[#5AA9FF]",
                    ].join(" ")}
                  >
                    {
                      snapshot.mode
                    }
                  </span>
                </div>
              </div>

              {/* =============================================
                  Leader
                  ============================================= */}

              <div className="border-b border-white/[0.08] px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane
                      size={13}
                      className="text-[#F6B23C]"
                    />

                    <span className="text-[11px] font-medium text-white/76">
                      Leader · SYSID 1
                    </span>
                  </div>

                  <span className="font-mono text-[9px] text-[#F6B23C]">
                    {
                      snapshot.leader.mode
                    }
                  </span>
                </div>

                <StateRow
                  label="Airspeed"
                  value={`${snapshot.leader.airspeed.toFixed(
                    1,
                  )} m/s`}
                />

                <StateRow
                  label="Heading"
                  value={`${snapshot.leader.heading.toFixed(
                    0,
                  )}°`}
                />

                <StateRow
                  label="Turn Rate"
                  value={`${snapshot.leader.turnRate.toFixed(
                    1,
                  )}°/s`}
                />

                <StateRow
                  label="Bank"
                  value={`${snapshot.leader.bank.toFixed(
                    1,
                  )}°`}
                />

                <StateRow
                  label="Altitude"
                  value={`${snapshot.leader.altitude.toFixed(
                    1,
                  )} m`}
                />
              </div>

              {/* =============================================
                  Follower
                  ============================================= */}

              <div className="border-b border-white/[0.08] px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane
                      size={13}
                      className="text-[#5AA9FF]"
                    />

                    <span className="text-[11px] font-medium text-white/76">
                      Follower · SYSID 2
                    </span>
                  </div>

                  <span className="font-mono text-[9px] text-[#5AA9FF]">
                    {
                      snapshot.follower.mode
                    }
                  </span>
                </div>

                <StateRow
                  label="Airspeed"
                  value={`${snapshot.follower.airspeed.toFixed(
                    1,
                  )} m/s`}
                />

                <StateRow
                  label="Heading"
                  value={`${snapshot.follower.heading.toFixed(
                    0,
                  )}°`}
                />

                <StateRow
                  label="Relative Bearing"
                  value={`${snapshot.relativeBearingDegrees.toFixed(
                    0,
                  )}°`}
                />

                <StateRow
                  label="Bank"
                  value={`${snapshot.follower.bank.toFixed(
                    1,
                  )}°`}
                />

                <StateRow
                  label="Altitude"
                  value={`${snapshot.follower.altitude.toFixed(
                    1,
                  )} m`}
                />
              </div>

              {/* =============================================
                  AI / ML
                  ============================================= */}

              <div className="border-b border-white/[0.08] px-3 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit
                      size={13}
                      className="text-[#59D99A]"
                    />

                    <span className="text-[11px] font-medium text-white/76">
                      AI / ML Guidance
                    </span>
                  </div>

                  <span className="font-mono text-[9px] text-[#59D99A]">
                    {snapshot.ai.ready
                      ? `${aiConfidence}% CONF`
                      : "LEARNING"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PredictorButton
                    label="Baseline"
                    description="Constant velocity projection"
                    active={
                      snapshot.predictorMode ===
                      "baseline"
                    }
                    onClick={() =>
                      selectPredictor(
                        "baseline",
                      )
                    }
                  />

                  <PredictorButton
                    label="ML Regression"
                    description="Learned curved trajectory prediction"
                    active={
                      snapshot.predictorMode ===
                      "ml"
                    }
                    onClick={() =>
                      selectPredictor(
                        "ml",
                      )
                    }
                  />
                </div>

                <div className="mt-3">
                  <StateRow
                    label="Model"
                    value={
                      snapshot.ai.model
                    }
                    valueClass="text-[#59D99A]"
                  />

                  <StateRow
                    label="Prediction Horizon"
                    value={`${snapshot.ai.predictionHorizonSeconds}s`}
                  />

                  <StateRow
                    label="Model Residual"
                    value={`${snapshot.ai.residualMeters.toFixed(
                      1,
                    )} m`}
                  />

                  <StateRow
                    label="Target Separation"
                    value={`${snapshot.desiredSeparationMeters.toFixed(
                      0,
                    )} m`}
                    valueClass="text-[#59D99A]"
                  />

                  <StateRow
                    label="Protected Radius"
                    value={`${snapshot.minimumSeparationMeters.toFixed(
                      0,
                    )} m`}
                    valueClass={
                      snapshot.separationSafe
                        ? "text-[#59D99A]"
                        : "text-[#FF5A63]"
                    }
                  />
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase text-white/34">
                    <span>
                      Shadow Separation
                    </span>

                    <span className="text-[#F6B23C]">
                      {
                        snapshot.desiredSeparationMeters
                      }
                      m
                    </span>
                  </div>

                  <input
                    type="range"
                    min="110"
                    max="300"
                    step="10"
                    value={
                      snapshot.desiredSeparationMeters
                    }
                    onChange={(
                      event,
                    ) =>
                      actions.setDesiredSeparation(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    className="w-full accent-[#F6B23C]"
                  />
                </div>
              </div>

              {/* =============================================
                  Commands
                  ============================================= */}

              <div className="border-b border-white/[0.08] px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white/72">
                    Mission Commands
                  </span>

                  <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-white/28">
                    Operator Authorized
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <CommandButton
                    label="Start Track"
                    icon={
                      Target
                    }
                    onClick={
                      actions.startTracking
                    }
                  />

                  <CommandButton
                    label="Start Intercept"
                    icon={
                      Navigation
                    }
                    onClick={
                      actions.startIntercept
                    }
                    tone="primary"
                  />

                  <CommandButton
                    label="Shadow"
                    icon={
                      Route
                    }
                    onClick={
                      actions.shadow
                    }
                  />

                  <CommandButton
                    label="Hold"
                    icon={
                      CirclePause
                    }
                    onClick={
                      actions.hold
                    }
                  />

                  <CommandButton
                    label="RTL"
                    icon={
                      Home
                    }
                    onClick={
                      actions.rtl
                    }
                  />

                  <CommandButton
                    label="Abort"
                    icon={
                      AlertTriangle
                    }
                    onClick={
                      actions.abort
                    }
                    tone="danger"
                  />
                </div>
              </div>

              {/* =============================================
                  RadioMaster
                  ============================================= */}

              <div className="px-3 py-3">
                <div className="flex items-start gap-3 rounded-[5px] border border-white/[0.08] bg-[#05060d] p-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border",

                      snapshot.gamepad.connected
                        ? "border-[rgba(89,217,154,0.24)] bg-[rgba(89,217,154,0.035)] text-[#59D99A]"
                        : "border-white/[0.08] text-white/30",
                    ].join(" ")}
                  >
                    <Usb
                      size={14}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-white/72">
                        RadioMaster USB
                      </span>

                      <span
                        className={[
                          "font-mono text-[9px] font-semibold uppercase",

                          snapshot.gamepad.connected
                            ? "text-[#59D99A]"
                            : "text-white/30",
                        ].join(" ")}
                      >
                        {snapshot.gamepad.connected
                          ? "Connected"
                          : "Not detected"}
                      </span>
                    </div>

                    <div className="mt-1 truncate text-[9px] text-white/30">
                      {snapshot.gamepad.connected
                        ? snapshot.gamepad.id
                        : "Connect USB controller and move a stick or button."}
                    </div>

                    {snapshot.gamepad.connected ? (
                      <div className="mt-2 font-mono text-[9px] text-white/36">
                        A0 turn{" "}
                        {
                          snapshot.gamepad.steeringAxis.toFixed(
                            2,
                          )
                        }

                        {" · "}

                        A1 speed{" "}
                        {
                          snapshot.gamepad.speedAxis.toFixed(
                            2,
                          )
                        }
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </section>

      {/* ===================================================
          SECONDARY TECHNICAL EVIDENCE
          =================================================== */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-2 xl:px-10 2xl:px-14">
          {/* ===============================================
              Prediction Evidence
              =============================================== */}

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex min-h-[52px] items-center justify-between border-b border-white/[0.07] px-4">
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#F6B23C]">
                  Prediction Evidence
                </div>

                <div className="mt-0.5 text-[14px] font-medium text-white/86">
                  Baseline vs ML Trajectory Prediction
                </div>
              </div>

              <BrainCircuit
                size={16}
                className="text-[#59D99A]"
              />
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-3">
              <EvidenceMetric
                label="Baseline Error"
                value={
                  formatError(
                    snapshot.performance
                      .baselineErrorMeters,
                  )
                }
                description="Constant-velocity future-position error"
                tone="neutral"
              />

              <EvidenceMetric
                label="ML Error"
                value={
                  formatError(
                    snapshot.performance
                      .mlErrorMeters,
                  )
                }
                description="Learned curved-trajectory prediction error"
                tone="green"
              />

              <EvidenceMetric
                label="Measured Improvement"
                value={
                  improvementValue
                }
                description={`${snapshot.performance.validationSamples} validated future predictions`}
                tone={
                  improvementTone
                }
              />
            </div>

            <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-white/36">
                  Evaluation Method
                </div>

                <p className="mt-2 text-[10px] leading-[1.55] text-white/38">
                  Both predictors generate future leader positions over the same
                  horizon. Once that horizon expires, MissionNexus compares each
                  prediction against the leader's actual simulated position and
                  records the measured position error.
                </p>
              </div>

              <div
                className={[
                  "rounded-[5px] border p-3",

                  !evidenceReady
                    ? "border-[rgba(246,178,60,0.18)] bg-[rgba(246,178,60,0.025)]"
                    : mlImproving
                      ? "border-[rgba(89,217,154,0.18)] bg-[rgba(89,217,154,0.025)]"
                      : "border-[rgba(255,90,99,0.18)] bg-[rgba(255,90,99,0.025)]",
                ].join(" ")}
              >
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-white/36">
                  Current Verdict
                </div>

                <div
                  className={[
                    "mt-2 font-mono text-[14px] font-semibold",

                    !evidenceReady
                      ? "text-[#F6B23C]"
                      : mlImproving
                        ? "text-[#59D99A]"
                        : "text-[#FF5A63]",
                  ].join(" ")}
                >
                  {!evidenceReady
                    ? "MODEL WARMING"
                    : mlImproving
                      ? "ML PREDICTOR LEADING"
                      : "BASELINE CURRENTLY LEADING"}
                </div>

                <p className="mt-2 text-[10px] leading-[1.5] text-white/36">
                  MissionNexus reports the measured result directly. A learned
                  predictor is not marked superior unless its validated position
                  error is actually lower than the baseline.
                </p>
              </div>
            </div>
          </section>

          {/* ===============================================
              Integration Status
              =============================================== */}

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex min-h-[52px] items-center justify-between border-b border-white/[0.07] px-4">
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#F6B23C]">
                  Integration Status
                </div>

                <div className="mt-0.5 text-[14px] font-medium text-white/86">
                  Autonomous Intercept Architecture
                </div>
              </div>

              <Cpu
                size={16}
                className="text-[#5AA9FF]"
              />
            </div>

            <div className="p-4">
              <StateRow
                label="Leader"
                value="SYSID 1 · manual / simulation"
                valueClass="text-[#F6B23C]"
              />

              <StateRow
                label="Follower"
                value="SYSID 2 · AI guided"
                valueClass="text-[#5AA9FF]"
              />

              <StateRow
                label="Basemap"
                value="Real satellite imagery"
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Phase-1 Coordinates"
                value="Local ENU → geographic projection"
                valueClass="text-white/62"
              />

              <StateRow
                label="Current Predictor"
                value={
                  snapshot.predictorMode ===
                  "ml"
                    ? "Online ML Regression"
                    : "Constant Velocity"
                }
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Prediction Horizon"
                value={`${snapshot.ai.predictionHorizonSeconds}s`}
                valueClass="text-white/62"
              />

              <StateRow
                label="Safety Model"
                value={`Non-contact · ${snapshot.minimumSeparationMeters} m protected radius`}
                valueClass={
                  snapshot.separationSafe
                    ? "text-[#59D99A]"
                    : "text-[#FF5A63]"
                }
              />

              <StateRow
                label="Shadow Distance"
                value={`${snapshot.desiredSeparationMeters} m`}
                valueClass="text-[#F6B23C]"
              />

              <StateRow
                label="RadioMaster"
                value={
                  snapshot.gamepad.connected
                    ? "USB CONNECTED"
                    : "Browser Gamepad API ready"
                }
                valueClass={
                  snapshot.gamepad.connected
                    ? "text-[#59D99A]"
                    : "text-white/42"
                }
              />

              <StateRow
                label="Next Integration"
                value="ArduPlane SITL · MAVLink GPS"
                valueClass="text-[#F6B23C]"
              />
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-[5px] border border-[rgba(90,169,255,0.16)] bg-[rgba(90,169,255,0.025)] p-3">
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-[#5AA9FF]">
                  Phase-2 Transition
                </div>

                <p className="mt-2 text-[10px] leading-[1.55] text-white/38">
                  The map is already geographical. Phase 2 removes the temporary
                  ENU-to-map projection and feeds the same visualization from
                  leader and follower MAVLink GPS telemetry.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}