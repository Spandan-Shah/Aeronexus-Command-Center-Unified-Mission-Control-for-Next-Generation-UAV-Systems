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
  ShieldCheck,
  SlidersHorizontal,
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

type MetricTone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

type Metric = {
  label:
    string;

  value:
    string;

  icon:
    LucideIcon;

  tone:
    MetricTone;
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
    "text-white/42",
};

function formatDistance(
  meters:
    number,
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

function MetricCell({
  metric,
}: {
  metric:
    Metric;
}) {
  const Icon =
    metric.icon;

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-r border-white/[0.07] px-4 last:border-r-0">
      <div className="min-w-0">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-white/40">
          {metric.label}
        </div>

        <div
          className={[
            "mt-1.5 truncate font-mono text-[16px] font-semibold leading-none",

            toneClass[
              metric.tone
            ],
          ].join(" ")}
        >
          {metric.value}
        </div>
      </div>

      <Icon
        size={17}
        strokeWidth={1.6}
        className={[
          "shrink-0",

          toneClass[
            metric.tone
          ],
        ].join(" ")}
      />
    </div>
  );
}

function StateRow({
  label,
  value,
  valueClass =
    "text-white/72",
}: {
  label:
    string;

  value:
    string;

  valueClass?:
    string;
}) {
  return (
    <div className="flex min-h-[34px] items-center justify-between gap-4 border-b border-white/[0.055] last:border-b-0">
      <span className="text-[11px] text-white/44">
        {label}
      </span>

      <span
        className={[
          "max-w-[64%] truncate text-right font-mono text-[11px] font-medium",

          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function CommandButton({
  label,
  icon:
    Icon,
  onClick,
  tone =
    "normal",
}: {
  label:
    string;

  icon:
    LucideIcon;

  onClick:
    () => void;

  tone?:
    | "normal"
    | "primary"
    | "danger";
}) {
  const style =
    tone ===
    "danger"
      ? "border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.045)] text-[#FF5A63] hover:bg-[rgba(255,90,99,0.10)]"
      : tone ===
          "primary"
        ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.07)] text-[#F6B23C] hover:bg-[rgba(246,178,60,0.12)]"
        : "border-white/[0.09] bg-[#05060d] text-white/64 hover:border-white/[0.18] hover:text-white";

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex h-10 items-center justify-center gap-2 rounded-[5px] border px-3",

        "font-mono text-[10px] font-semibold uppercase tracking-[0.035em]",

        "transition-colors",

        style,
      ].join(" ")}
    >
      <Icon
        size={13}
      />

      {label}
    </button>
  );
}

function PredictorButton({
  label,
  description,
  active,
  onClick,
}: {
  label:
    string;

  description:
    string;

  active:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "min-h-[64px] rounded-[5px] border p-3 text-left transition-colors",

        active
          ? "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.06)]"
          : "border-white/[0.08] bg-[#05060d] hover:border-white/[0.15]",
      ].join(" ")}
    >
      <div
        className={[
          "font-mono text-[10px] font-semibold uppercase",

          active
            ? "text-[#F6B23C]"
            : "text-white/60",
        ].join(" ")}
      >
        {label}
      </div>

      <div className="mt-1.5 text-[10px] leading-[1.45] text-white/36">
        {description}
      </div>
    </button>
  );
}

function RangeControl({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label:
    string;

  value:
    number;

  suffix:
    string;

  min:
    number;

  max:
    number;

  step:
    number;

  onChange:
    (
      value:
        number,
    ) => void;
}) {
  return (
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-white/58">
          {label}
        </span>

        <span className="font-mono text-[13px] font-semibold text-[#F6B23C]">
          {value.toFixed(
            step <
            1
              ? 1
              : 0,
          )}{" "}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={
          min
        }
        max={
          max
        }
        step={
          step
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
        className="mt-3 w-full accent-[#F6B23C]"
      />
    </div>
  );
}

/* =========================================================
   Page
   ========================================================= */

export function AutonomousIntercept() {
  const {
    snapshot,
    actions,
  } =
    useInterceptSimulation();

  const confidence =
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

  const mlWinning =
    evidenceReady &&
    improvement !==
      null &&
    improvement >
      0;

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
            ? `${confidence}%`
            : "TRAINING",

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
    mode:
      PredictorMode,
  ) {
    actions.setPredictorMode(
      mode,
    );
  }

  return (
    <div className="bg-[#05060d] text-white">
      <section className="xl:h-[calc(100vh-70px)] xl:overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1600px] gap-2 px-4 pb-3 pt-2 sm:px-6 lg:px-8 xl:h-full xl:grid-rows-[50px_70px_minmax(0,1fr)] xl:px-10 2xl:px-14">
          {/* Header */}

          <header className="flex items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-white">
                Autonomous Intercept
              </h1>

              <p className="mt-0.5 hidden text-[12px] text-white/44 sm:block">
                Fixed-wing leader–follower prediction, adaptive airspeed control and non-contact shadowing
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-[4px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.04)] px-3 py-2 font-mono text-[10px] font-semibold uppercase text-[#59D99A]">
                ● Simulation Active
              </div>

              <div className="hidden rounded-[4px] border border-[rgba(90,169,255,0.22)] bg-[rgba(90,169,255,0.04)] px-3 py-2 font-mono text-[10px] font-semibold uppercase text-[#5AA9FF] md:block">
                Human-in-loop
              </div>
            </div>
          </header>

          {/* Metrics */}

          <section className="grid grid-cols-2 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d] md:grid-cols-3 xl:grid-cols-6">
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

          {/* Main workspace */}

          <section className="grid min-h-[800px] overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#020304] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
            {/* Left map */}

            <div className="grid min-h-0 grid-rows-[44px_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-4">
                <div className="flex items-center gap-2">
                  <MapPinned
                    size={14}
                    className="text-[#F6B23C]"
                  />

                  <span className="text-[13px] font-medium text-white/84">
                    Geospatial Intercept Workspace
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-white/36">
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
                    className="flex h-8 items-center gap-2 rounded-[4px] border border-white/[0.08] bg-[#05060d] px-3 font-mono text-[9px] font-semibold uppercase text-white/60 hover:text-white"
                  >
                    {snapshot.running ? (
                      <Pause
                        size={11}
                      />
                    ) : (
                      <Play
                        size={11}
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
                    className="flex h-8 items-center gap-2 rounded-[4px] border border-white/[0.08] bg-[#05060d] px-3 font-mono text-[9px] font-semibold uppercase text-white/60 hover:text-white"
                  >
                    <RotateCcw
                      size={11}
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

            {/* Right rail */}

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              {/* Mission state */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#F6B23C]">
                      Intercept State
                    </div>

                    <div className="mt-1 text-[11px] text-white/38">
                      Autonomous mission state machine
                    </div>
                  </div>

                  <span className="rounded-[4px] border border-[rgba(90,169,255,0.24)] bg-[rgba(90,169,255,0.04)] px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#5AA9FF]">
                    {
                      snapshot.mode
                    }
                  </span>
                </div>
              </section>

              {/* Aircraft */}

              <section className="grid border-b border-white/[0.08] md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="border-b border-white/[0.08] px-4 py-3 md:border-b-0 md:border-r xl:border-b xl:border-r-0 2xl:border-b-0 2xl:border-r">
                  <div className="mb-2 flex items-center gap-2">
                    <Plane
                      size={14}
                      className="text-[#F6B23C]"
                    />

                    <span className="text-[12px] font-semibold text-white/78">
                      Leader · SYSID 1
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
                </div>

                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Plane
                      size={14}
                      className="text-[#5AA9FF]"
                    />

                    <span className="text-[12px] font-semibold text-white/78">
                      Follower · SYSID 2
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
                    label="Speed Delta"
                    value={`${snapshot.speedControl.airspeedDelta.toFixed(
                      1,
                    )} m/s`}
                    valueClass="text-[#5AA9FF]"
                  />
                </div>
              </section>

              {/* Speed control */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={14}
                      className="text-[#F6B23C]"
                    />

                    <span className="text-[13px] font-semibold text-white/80">
                      Airspeed Control
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-[#59D99A]">
                    {
                      snapshot.speedControl
                        .adaptiveSync
                        ? "ADAPTIVE"
                        : "BASIC"
                    }
                  </span>
                </div>

                <div className="grid gap-2">
                  <RangeControl
                    label="Leader Target Airspeed"
                    value={
                      snapshot.speedControl
                        .leaderCommandedAirspeed
                    }
                    suffix="m/s"
                    min={
                      14
                    }
                    max={
                      34
                    }
                    step={
                      0.5
                    }
                    onChange={
                      actions.setLeaderCommandedAirspeed
                    }
                  />

                  <RangeControl
                    label="Follower Maximum Airspeed"
                    value={
                      snapshot.speedControl
                        .followerMaxAirspeed
                    }
                    suffix="m/s"
                    min={
                      18
                    }
                    max={
                      38
                    }
                    step={
                      0.5
                    }
                    onChange={
                      actions.setFollowerMaxAirspeed
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    actions.setAdaptiveSpeedSync(
                      !snapshot.speedControl
                        .adaptiveSync,
                    )
                  }
                  className={[
                    "mt-2 flex min-h-10 w-full items-center justify-between rounded-[5px] border px-3",

                    snapshot.speedControl
                      .adaptiveSync
                      ? "border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.035)]"
                      : "border-white/[0.08] bg-[#05060d]",
                  ].join(" ")}
                >
                  <div className="text-left">
                    <div className="text-[11px] font-medium text-white/66">
                      Adaptive Speed Synchronization
                    </div>

                    <div className="mt-0.5 text-[10px] text-white/32">
                      Distance error + closing-rate damping
                    </div>
                  </div>

                  <span
                    className={[
                      "font-mono text-[10px] font-semibold",

                      snapshot.speedControl
                        .adaptiveSync
                        ? "text-[#59D99A]"
                        : "text-white/30",
                    ].join(" ")}
                  >
                    {snapshot.speedControl
                      .adaptiveSync
                      ? "ON"
                      : "OFF"}
                  </span>
                </button>
              </section>

              {/* ML */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit
                      size={15}
                      className="text-[#59D99A]"
                    />

                    <span className="text-[13px] font-semibold text-white/80">
                      Machine Learning
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-[#59D99A]">
                    {snapshot.ai.ready
                      ? `${confidence}% CONF`
                      : "TRAINING"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PredictorButton
                    label="Baseline"
                    description="Constant-velocity future projection"
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
                    label="Online ML"
                    description="SGD model learning from future-position error"
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
                    label="Training Samples"
                    value={`${snapshot.ai.trainingSamples}`}
                  />

                  <StateRow
                    label="Prediction Horizon"
                    value={`${snapshot.ai.predictionHorizonSeconds}s`}
                  />

                  <StateRow
                    label="Mean ML Error"
                    value={
                      formatError(
                        snapshot.performance
                          .mlErrorMeters,
                      )
                    }
                  />

                  <StateRow
                    label="Baseline Error"
                    value={
                      formatError(
                        snapshot.performance
                          .baselineErrorMeters,
                      )
                    }
                  />
                </div>
              </section>

              {/* Mission commands */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 text-[13px] font-semibold text-white/80">
                  Mission Commands
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <CommandButton
                    label="Track"
                    icon={
                      Target
                    }
                    onClick={
                      actions.startTracking
                    }
                  />

                  <CommandButton
                    label="Intercept"
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
              </section>

              {/* Radio */}

              <section className="px-4 py-4">
                <div className="flex items-start gap-3 rounded-[5px] border border-white/[0.08] bg-[#05060d] p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-white/[0.08] text-white/42">
                    <Usb
                      size={15}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-white/72">
                        RadioMaster USB
                      </span>

                      <span
                        className={[
                          "font-mono text-[10px] font-semibold uppercase",

                          snapshot.gamepad.connected
                            ? "text-[#59D99A]"
                            : "text-white/32",
                        ].join(" ")}
                      >
                        {snapshot.gamepad.connected
                          ? "Connected"
                          : "Not detected"}
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] text-white/34">
                      {snapshot.gamepad.connected
                        ? snapshot.gamepad.id
                        : "Browser Gamepad API ready for leader control"}
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </section>

      {/* Secondary evidence */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-2 xl:px-10 2xl:px-14">
          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="border-b border-white/[0.07] px-4 py-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[#F6B23C]">
                Prediction Evidence
              </div>

              <div className="mt-1 text-[15px] font-semibold text-white/84">
                Measured Baseline vs Online ML
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-3">
              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="text-[10px] uppercase text-white/36">
                  Baseline Error
                </div>

                <div className="mt-2 font-mono text-[18px] font-semibold text-white/68">
                  {formatError(
                    snapshot.performance
                      .baselineErrorMeters,
                  )}
                </div>
              </div>

              <div className="rounded-[5px] border border-[rgba(89,217,154,0.20)] bg-[rgba(89,217,154,0.03)] p-3">
                <div className="text-[10px] uppercase text-white/36">
                  ML Error
                </div>

                <div className="mt-2 font-mono text-[18px] font-semibold text-[#59D99A]">
                  {formatError(
                    snapshot.performance
                      .mlErrorMeters,
                  )}
                </div>
              </div>

              <div className="rounded-[5px] border border-[rgba(246,178,60,0.20)] bg-[rgba(246,178,60,0.03)] p-3">
                <div className="text-[10px] uppercase text-white/36">
                  Improvement
                </div>

                <div
                  className={[
                    "mt-2 font-mono text-[18px] font-semibold",

                    !evidenceReady
                      ? "text-[#F6B23C]"
                      : mlWinning
                        ? "text-[#59D99A]"
                        : "text-[#FF5A63]",
                  ].join(" ")}
                >
                  {!evidenceReady
                    ? "TRAINING"
                    : `${improvement !== null &&
                      improvement >= 0
                        ? "+"
                        : ""}${improvement?.toFixed(
                        1,
                      )}%`}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[#F6B23C]">
                  System Status
                </div>

                <div className="mt-1 text-[15px] font-semibold text-white/84">
                  Phase-1 Intercept Architecture
                </div>
              </div>

              <Cpu
                size={17}
                className="text-[#5AA9FF]"
              />
            </div>

            <div className="p-4">
              <StateRow
                label="Leader"
                value="SYSID 1 · controlled"
                valueClass="text-[#F6B23C]"
              />

              <StateRow
                label="Follower"
                value="SYSID 2 · autonomous"
                valueClass="text-[#5AA9FF]"
              />

              <StateRow
                label="ML Training"
                value={`${snapshot.ai.trainingSamples} online samples`}
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Adaptive Speed"
                value={
                  snapshot.speedControl
                    .adaptiveSync
                    ? "ENABLED"
                    : "DISABLED"
                }
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Safety Radius"
                value={`${snapshot.minimumSeparationMeters} m`}
              />

              <StateRow
                label="Next"
                value="ArduPlane SITL + MAVLink"
                valueClass="text-[#F6B23C]"
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}