import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CirclePause,
  Cpu,
  Gauge,
  Home,
  Navigation,
  Pause,
  Plane,
  Play,
  Radio,
  RotateCcw,
  Route,
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
   Helpers
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
          {
            metric.label
          }
        </div>

        <div
          className={[
            "mt-1 truncate font-mono text-[15px] font-semibold leading-none",

            tone,
          ].join(" ")}
        >
          {
            metric.value
          }
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
   Small State Row
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
      onClick={
        onClick
      }
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
      onClick={
        onClick
      }
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
          {/* Header */}

          <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h1 className="text-[16px] font-medium tracking-[-0.02em] text-white">
                Autonomous Intercept
              </h1>

              <p className="mt-0.5 hidden truncate text-[11px] text-white/42 sm:block">
                ArduPlane leader–follower AI guidance · non-contact rendezvous and shadow simulation
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-[30px] items-center gap-2 rounded-[4px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.04)] px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-[#59D99A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#59D99A]" />

                Built-in Simulation
              </div>

              <div className="hidden h-[30px] items-center gap-2 rounded-[4px] border border-[rgba(90,169,255,0.22)] bg-[rgba(90,169,255,0.04)] px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.05em] text-[#5AA9FF] md:flex">
                <ShieldCheck
                  size={11}
                />

                Human-in-loop
              </div>
            </div>
          </header>

          {/* Metrics */}

          <section className="my-2 grid overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d] grid-cols-2 md:grid-cols-3 xl:my-0 xl:grid-cols-6">
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

          {/* Workspace */}

          <section className="mt-3 grid min-h-[780px] overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#020304] xl:mt-0 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_410px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
            {/* Map */}

            <div className="grid min-h-0 grid-rows-[42px_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex items-center gap-2">
                  <Route
                    size={13}
                    className="text-[#F6B23C]"
                  />

                  <span className="text-[12px] font-medium text-white/84">
                    Leader–Follower Intercept Map
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
                    className="flex h-[28px] items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-[#05060d] px-2.5 font-mono text-[8px] font-semibold uppercase text-white/54 transition hover:text-white"
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
                    className="flex h-[28px] items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-[#05060d] px-2.5 font-mono text-[8px] font-semibold uppercase text-white/54 transition hover:text-white"
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

            {/* =============================================
                RIGHT RAIL
                ============================================= */}

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              {/* Mission state */}

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
                        ? "border-[rgba(255,90,99,0.3)] text-[#FF5A63]"
                        : "border-[rgba(90,169,255,0.25)] text-[#5AA9FF]",
                    ].join(" ")}
                  >
                    {
                      snapshot.mode
                    }
                  </span>
                </div>
              </div>

              {/* Leader */}

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
                  label="Altitude"
                  value={`${snapshot.leader.altitude.toFixed(
                    1,
                  )} m`}
                />
              </div>

              {/* Follower */}

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
                  label="Altitude"
                  value={`${snapshot.follower.altitude.toFixed(
                    1,
                  )} m`}
                />
              </div>

              {/* AI */}

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
                    description="Online curved trajectory prediction"
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
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase text-white/34">
                    <span>
                      Shadow separation
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

              {/* Commands */}

              <div className="border-b border-white/[0.08] px-3 py-3">
                <div className="mb-2 text-[11px] font-medium text-white/72">
                  Mission Commands
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

              {/* RadioMaster */}

              <div className="px-3 py-3">
                <div className="flex items-start gap-3 rounded-[5px] border border-white/[0.08] bg-[#05060d] p-3">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border",

                      snapshot.gamepad.connected
                        ? "border-[rgba(89,217,154,0.24)] text-[#59D99A]"
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
                        : "Connect USB controller and move a stick/button."}
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
          SECONDARY PROOF / EVIDENCE
          =================================================== */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-2 xl:px-10 2xl:px-14">
          {/* ML proof */}

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
              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="font-mono text-[9px] uppercase text-white/34">
                  Baseline Error
                </div>

                <div className="mt-2 font-mono text-[18px] font-semibold text-white/64">
                  {formatError(
                    snapshot.performance.baselineErrorMeters,
                  )}
                </div>

                <div className="mt-1 text-[10px] text-white/30">
                  Constant velocity predictor
                </div>
              </div>

              <div className="rounded-[5px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.035)] p-3">
                <div className="font-mono text-[9px] uppercase text-white/34">
                  ML Error
                </div>

                <div className="mt-2 font-mono text-[18px] font-semibold text-[#59D99A]">
                  {formatError(
                    snapshot.performance.mlErrorMeters,
                  )}
                </div>

                <div className="mt-1 text-[10px] text-white/30">
                  Online quadratic regression
                </div>
              </div>

              <div className="rounded-[5px] border border-[rgba(246,178,60,0.2)] bg-[rgba(246,178,60,0.035)] p-3">
                <div className="font-mono text-[9px] uppercase text-white/34">
                  Improvement
                </div>

                <div className="mt-2 font-mono text-[18px] font-semibold text-[#F6B23C]">
                  {improvement ===
                  null
                    ? "WARMING"
                    : `${improvement.toFixed(
                        1,
                      )}%`}
                </div>

                <div className="mt-1 text-[10px] text-white/30">
                  {
                    snapshot.performance.validationSamples
                  }{" "}
                  validated predictions
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3 text-[10px] leading-[1.55] text-white/38">
                The ML predictor is an online quadratic regression model trained
                continuously from the leader's recent motion history. The baseline
                assumes constant velocity. Prediction errors are validated after
                the configured future horizon so the demo produces measurable
                evidence instead of a cosmetic AI label.
              </div>
            </div>
          </section>

          {/* Simulation integration */}

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex min-h-[52px] items-center justify-between border-b border-white/[0.07] px-4">
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#F6B23C]">
                  Simulation Integration
                </div>

                <div className="mt-0.5 text-[14px] font-medium text-white/86">
                  ArduPlane Phase-1 Interface
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
                value="SYSID 1 · manual / demo"
                valueClass="text-[#F6B23C]"
              />

              <StateRow
                label="Follower"
                value="SYSID 2 · AI guided"
                valueClass="text-[#5AA9FF]"
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
                label="Safety Model"
                value={`Non-contact · ${snapshot.minimumSeparationMeters} m floor`}
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="RadioMaster"
                value={
                  snapshot.gamepad.connected
                    ? "USB CONNECTED"
                    : "Browser Gamepad API"
                }
                valueClass={
                  snapshot.gamepad.connected
                    ? "text-[#59D99A]"
                    : "text-white/42"
                }
              />

              <StateRow
                label="Phase 2"
                value="ArduPilot SITL + MAVLink"
                valueClass="text-[#F6B23C]"
              />
            </div>
          </section>

          {/* Demo video */}

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d] xl:col-span-2">
            <div className="flex min-h-[52px] items-center justify-between border-b border-white/[0.07] px-4">
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#F6B23C]">
                  Mission Evidence
                </div>

                <div className="mt-0.5 text-[14px] font-medium text-white/86">
                  ArduPlane Leader–Follower Demonstration
                </div>
              </div>

              <Activity
                size={16}
                className="text-[#5AA9FF]"
              />
            </div>

            <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
              <div className="overflow-hidden rounded-[5px] border border-white/[0.08] bg-black">
                <video
                  src="/videos/autonomous-intercept-demo.mp4"
                  controls
                  muted
                  loop
                  playsInline
                  className="aspect-video w-full bg-black object-contain"
                />
              </div>

              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-4">
                <div className="flex items-center gap-2">
                  <Activity
                    size={14}
                    className="text-[#F6B23C]"
                  />

                  <span className="text-[12px] font-medium text-white/76">
                    What this proof demonstrates
                  </span>
                </div>

                <p className="mt-3 text-[11px] leading-[1.65] text-white/40">
                  Plane 1 acts as the leader while Plane 2 follows autonomously.
                  Straight-line matching is comparatively simple; turning creates
                  the more difficult guidance problem because naive look-ahead
                  guidance can force the follower onto a longer outside arc.
                </p>

                <p className="mt-3 text-[11px] leading-[1.65] text-white/40">
                  MissionNexus Phase 1 now exposes that problem directly and
                  compares a constant-velocity predictor against a learned
                  trajectory regression model while maintaining a configurable
                  non-contact shadow distance.
                </p>

                <div className="mt-4 flex items-start gap-2 rounded-[5px] border border-[rgba(89,217,154,0.2)] bg-[rgba(89,217,154,0.035)] p-3">
                  <ShieldCheck
                    size={14}
                    className="mt-0.5 shrink-0 text-[#59D99A]"
                  />

                  <div className="text-[10px] leading-[1.5] text-white/42">
                    Autonomous follower guidance is intentionally constrained to
                    rendezvous and shadowing. The guidance target remains offset
                    behind the leader rather than commanding contact.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}