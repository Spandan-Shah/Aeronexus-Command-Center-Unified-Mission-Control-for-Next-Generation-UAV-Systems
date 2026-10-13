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

/* =========================================================
   Formatting
   ========================================================= */

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

function formatPercent(
  value:
    number,
) {
  return `${Math.round(
    value *
      100,
  )}%`;
}

/* =========================================================
   Metric Cell
   ========================================================= */

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
        <div className="truncate text-[14px] font-medium text-white/44">
          {metric.label}
        </div>

        <div
          className={[
            "mt-1 truncate font-mono text-[14px] font-semibold",

            toneClass[
              metric.tone
            ],
          ].join(" ")}
        >
          {metric.value}
        </div>
      </div>

      <Icon
        size={18}
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

/* =========================================================
   State Row
   ========================================================= */

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
    <div className="flex min-h-[38px] items-center justify-between gap-4 border-b border-white/[0.055] last:border-b-0">
      <span className="text-[14px] text-white/46">
        {label}
      </span>

      <span
        className={[
          "max-w-[64%] truncate text-right font-mono text-[14px] font-medium",

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
        : "border-white/[0.09] bg-[#05060d] text-white/68 hover:border-white/[0.18] hover:text-white";

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex h-[44px] items-center justify-center gap-2",

        "rounded-[5px] border px-3",

        "font-mono text-[14px] font-medium",

        "transition-colors",

        style,
      ].join(" ")}
    >
      <Icon
        size={15}
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
        "min-h-[82px] rounded-[5px] border p-3 text-left transition-colors",

        active
          ? "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.06)]"
          : "border-white/[0.08] bg-[#05060d] hover:border-white/[0.15]",
      ].join(" ")}
    >
      <div
        className={[
          "font-mono text-[14px] font-semibold",

          active
            ? "text-[#F6B23C]"
            : "text-white/66",
        ].join(" ")}
      >
        {label}
      </div>

      <div className="mt-1.5 text-[14px] leading-[1.45] text-white/40">
        {description}
      </div>
    </button>
  );
}

/* =========================================================
   Range Control
   ========================================================= */

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
        <span className="text-[14px] font-medium text-white/62">
          {label}
        </span>

        <span className="font-mono text-[14px] font-semibold text-[#F6B23C]">
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
        className="mt-4 w-full accent-[#F6B23C]"
      />
    </div>
  );
}

/* =========================================================
   Predictor Evidence
   ========================================================= */

function PredictorEvidence({
  label,
  value,
  tone =
    "muted",
}: {
  label:
    string;

  value:
    string;

  tone?:
    MetricTone;
}) {
  return (
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
      <div className="text-[14px] text-white/42">
        {label}
      </div>

      <div
        className={[
          "mt-2 font-mono text-[16px] font-semibold",

          toneClass[
            tone
          ],
        ].join(" ")}
      >
        {value}
      </div>
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
    5;

  const adaptiveWinning =
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
          "AI Confidence",

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

            "xl:grid-rows-[58px_82px_minmax(0,1fr)]",

            "xl:gap-2",

            "xl:px-10",

            "2xl:px-14",
          ].join(" ")}
        >
          {/* ===============================================
              Header
              =============================================== */}

          <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-white">
                Autonomous Intercept
              </h1>

              <p className="mt-1 hidden truncate text-[14px] text-white/46 sm:block">
                Predictive leader–follower guidance · adaptive airspeed control · non-contact rendezvous and shadow
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="rounded-[4px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.04)] px-3 py-2 font-mono text-[14px] font-medium text-[#59D99A]">
                ● Simulation Active
              </div>

              <div className="hidden rounded-[4px] border border-[rgba(90,169,255,0.22)] bg-[rgba(90,169,255,0.04)] px-3 py-2 font-mono text-[14px] font-medium text-[#5AA9FF] lg:block">
                Human-in-loop
              </div>
            </div>
          </header>

          {/* ===============================================
              Metrics
              =============================================== */}

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

          {/* ===============================================
              Workspace
              =============================================== */}

          <section
            className={[
              "mt-3 grid min-h-[850px] overflow-hidden",

              "rounded-[6px] border border-white/[0.09]",

              "bg-[#020304]",

              "xl:mt-0 xl:min-h-0",

              "xl:grid-cols-[minmax(0,1fr)_470px]",
            ].join(" ")}
          >
            {/* =============================================
                MAP
                ============================================= */}

            <div className="grid min-h-0 grid-rows-[42px_minmax(0,1fr)]">
              <div className="flex min-w-0 items-center justify-between border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <MapPinned
                    size={15}
                    strokeWidth={1.6}
                    className="shrink-0 text-[#5AA9FF]"
                  />

                  <span className="truncate text-[16px] font-semibold text-white/86">
                    Geospatial Intercept Workspace
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[14px] text-white/42">
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
                    className="flex h-[34px] items-center gap-2 rounded-[4px] border border-white/[0.08] bg-[#030405] px-3 font-mono text-[14px] text-white/60 hover:text-white"
                  >
                    {snapshot.running ? (
                      <Pause
                        size={14}
                      />
                    ) : (
                      <Play
                        size={14}
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
                    className="flex h-[34px] items-center gap-2 rounded-[4px] border border-white/[0.08] bg-[#030405] px-3 font-mono text-[14px] text-white/60 hover:text-white"
                  >
                    <RotateCcw
                      size={14}
                    />

                    Reset
                  </button>
                </div>
              </div>

              <div className="relative min-h-0">
                <InterceptMap
                  snapshot={
                    snapshot
                  }
                />
              </div>
            </div>

            {/* =============================================
                RIGHT INSPECTOR
                ============================================= */}

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              {/* Mission state */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[16px] font-semibold text-[#F6B23C]">
                      Intercept State
                    </div>

                    <div className="mt-1 text-[14px] text-white/42">
                      Autonomous mission state machine
                    </div>
                  </div>

                  <span
                    className={[
                      "rounded-[4px] border px-3 py-1.5",

                      "font-mono text-[14px] font-semibold",

                      snapshot.mode ===
                      "ABORT"
                        ? "border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.04)] text-[#FF5A63]"
                        : "border-[rgba(90,169,255,0.24)] bg-[rgba(90,169,255,0.04)] text-[#5AA9FF]",
                    ].join(" ")}
                  >
                    {
                      snapshot.mode
                    }
                  </span>
                </div>
              </section>

              {/* Aircraft */}

              <section className="grid border-b border-white/[0.08] 2xl:grid-cols-2">
                <div className="border-b border-white/[0.08] px-4 py-4 2xl:border-b-0 2xl:border-r">
                  <div className="mb-3 flex items-center gap-2">
                    <Plane
                      size={17}
                      className="text-[#F6B23C]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
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

                  <StateRow
                    label="Bank"
                    value={`${snapshot.leader.bank.toFixed(
                      1,
                    )}°`}
                  />
                </div>

                <div className="px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Plane
                      size={17}
                      className="text-[#5AA9FF]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
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
                    label="Target Speed"
                    value={`${snapshot.speedControl.followerCommandedAirspeed.toFixed(
                      1,
                    )} m/s`}
                    valueClass="text-[#5AA9FF]"
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
                  />
                </div>
              </section>

              {/* Airspeed Control */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={17}
                      className="text-[#F6B23C]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Airspeed Control
                    </span>
                  </div>

                  <span className="font-mono text-[14px] text-[#59D99A]">
                    {snapshot.speedControl.adaptiveSync
                      ? "ADAPTIVE"
                      : "BASIC"}
                  </span>
                </div>

                <div className="grid gap-3">
                  <RangeControl
                    label="Leader Target Airspeed"
                    value={
                      snapshot.speedControl
                        .leaderCommandedAirspeed
                    }
                    suffix="m/s"
                    min={14}
                    max={34}
                    step={0.5}
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
                    min={18}
                    max={38}
                    step={0.5}
                    onChange={
                      actions.setFollowerMaxAirspeed
                    }
                  />

                  <RangeControl
                    label="Desired Shadow Distance"
                    value={
                      snapshot.desiredSeparationMeters
                    }
                    suffix="m"
                    min={110}
                    max={300}
                    step={10}
                    onChange={
                      actions.setDesiredSeparation
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
                    "mt-3 flex min-h-[62px] w-full items-center justify-between",

                    "rounded-[5px] border px-3",

                    snapshot.speedControl.adaptiveSync
                      ? "border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.035)]"
                      : "border-white/[0.08] bg-[#05060d]",
                  ].join(" ")}
                >
                  <div className="text-left">
                    <div className="text-[14px] font-medium text-white/68">
                      Adaptive Speed Synchronization
                    </div>

                    <div className="mt-1 text-[14px] text-white/38">
                      Separation · closing rate · predicted turn demand
                    </div>
                  </div>

                  <span
                    className={[
                      "font-mono text-[14px] font-semibold",

                      snapshot.speedControl.adaptiveSync
                        ? "text-[#59D99A]"
                        : "text-white/34",
                    ].join(" ")}
                  >
                    {snapshot.speedControl.adaptiveSync
                      ? "ON"
                      : "OFF"}
                  </span>
                </button>
              </section>

              {/* AI */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit
                      size={17}
                      className="text-[#59D99A]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Predictive AI
                    </span>
                  </div>

                  <span className="font-mono text-[14px] font-semibold text-[#59D99A]">
                    {snapshot.ai.ready
                      ? `${confidence}% CONF`
                      : "TRAINING"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <PredictorButton
                    label="CV Baseline"
                    description="Straight-line constant velocity prediction"
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
                    label="Adaptive AI"
                    description="CV + CTRV + online residual ensemble"
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
                    label="Selected Model"
                    value={
                      snapshot.ai.selectedPredictor
                    }
                    valueClass="text-[#F6B23C]"
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
                    label="CV Weight"
                    value={
                      formatPercent(
                        snapshot.ai.weights.cv,
                      )
                    }
                  />

                  <StateRow
                    label="CTRV Weight"
                    value={
                      formatPercent(
                        snapshot.ai.weights.ctrv,
                      )
                    }
                  />

                  <StateRow
                    label="Learned Weight"
                    value={
                      formatPercent(
                        snapshot.ai.weights.learned,
                      )
                    }
                  />
                </div>
              </section>

              {/* Safety */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck
                    size={17}
                    className={
                      snapshot.anticipatorySafetyGate
                        ? "text-[#FF5A63]"
                        : "text-[#59D99A]"
                    }
                  />

                  <span className="text-[16px] font-semibold text-white/82">
                    Safety Gate
                  </span>
                </div>

                <StateRow
                  label="Current Separation"
                  value={
                    formatDistance(
                      snapshot.distanceMeters,
                    )
                  }
                  valueClass={
                    snapshot.separationSafe
                      ? "text-[#59D99A]"
                      : "text-[#FF5A63]"
                  }
                />

                <StateRow
                  label="Protected Radius"
                  value={`${snapshot.minimumSeparationMeters} m`}
                />

                <StateRow
                  label="Predicted Closest"
                  value={`${snapshot.predictedClosestSeparationMeters.toFixed(
                    0,
                  )} m`}
                  valueClass={
                    snapshot.anticipatorySafetyGate
                      ? "text-[#FF5A63]"
                      : "text-[#59D99A]"
                  }
                />

                <StateRow
                  label="Gate State"
                  value={
                    snapshot.anticipatorySafetyGate
                      ? "RECOVERY ACTIVE"
                      : "CLEAR"
                  }
                  valueClass={
                    snapshot.anticipatorySafetyGate
                      ? "text-[#FF5A63]"
                      : "text-[#59D99A]"
                  }
                />
              </section>

              {/* Commands */}

              <section className="border-b border-white/[0.08] px-4 py-4">
                <div className="mb-3 text-[16px] font-semibold text-white/82">
                  Mission Commands
                </div>

                <div className="grid grid-cols-2 gap-3">
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

              {/* RadioMaster */}

              <section className="px-4 py-4">
                <div className="mb-3 text-[16px] font-semibold text-white/82">
                  RadioMaster Control
                </div>

                <div className="flex items-start gap-3 rounded-[5px] border border-white/[0.08] bg-[#05060d] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-white/[0.08] text-white/46">
                    <Usb
                      size={17}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] font-semibold text-white/74">
                        RadioMaster USB
                      </span>

                      <span
                        className={[
                          "font-mono text-[14px] font-semibold",

                          snapshot.gamepad.connected
                            ? "text-[#59D99A]"
                            : "text-white/36",
                        ].join(" ")}
                      >
                        {snapshot.gamepad.connected
                          ? "CONNECTED"
                          : "NOT DETECTED"}
                      </span>
                    </div>

                    <div className="mt-2 text-[14px] leading-[1.45] text-white/38">
                      {snapshot.gamepad.connected
                        ? snapshot.gamepad.id
                        : "Browser Gamepad API ready for manual leader control."}
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </section>

      {/* ===================================================
          EVIDENCE
          =================================================== */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[1.3fr_0.7fr] xl:px-10 2xl:px-14">
          {/* Prediction Evidence */}

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="border-b border-white/[0.07] px-4 py-4">
              <div className="text-[16px] font-semibold text-[#F6B23C]">
                Prediction Evidence
              </div>

              <div className="mt-1 text-[14px] text-white/54">
                Constant velocity vs turn-aware and adaptive prediction
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-4">
              <PredictorEvidence
                label="CV Error"
                value={
                  formatError(
                    snapshot.performance
                      .baselineErrorMeters,
                  )
                }
              />

              <PredictorEvidence
                label="CTRV Error"
                value={
                  formatError(
                    snapshot.performance
                      .ctrvErrorMeters,
                  )
                }
                tone="caution"
              />

              <PredictorEvidence
                label="Adaptive Error"
                value={
                  formatError(
                    snapshot.performance
                      .mlErrorMeters,
                  )
                }
                tone="nominal"
              />

              <PredictorEvidence
                label="vs CV"
                value={
                  !evidenceReady ||
                  improvement ===
                    null
                    ? "TRAINING"
                    : `${improvement >=
                        0
                        ? "+"
                        : ""}${improvement.toFixed(
                        1,
                      )}%`
                }
                tone={
                  !evidenceReady
                    ? "caution"
                    : adaptiveWinning
                      ? "nominal"
                      : "critical"
                }
              />
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-4 text-[14px] leading-[1.6] text-white/42">
                MissionNexus validates every predictor against the leader's
                actual future position. Adaptive weighting automatically reduces
                authority for predictors with larger rolling error, so the
                learned component is not trusted merely because it is labelled AI.
              </div>
            </div>
          </section>

          {/* Architecture */}

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
              <div>
                <div className="text-[16px] font-semibold text-[#F6B23C]">
                  System Status
                </div>

                <div className="mt-1 text-[14px] text-white/54">
                  Phase-1 predictive guidance architecture
                </div>
              </div>

              <Cpu
                size={18}
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
                label="Prediction"
                value="CV + CTRV + residual"
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Validated Samples"
                value={`${snapshot.performance.validationSamples}`}
              />

              <StateRow
                label="Adaptive Speed"
                value={
                  snapshot.speedControl.adaptiveSync
                    ? "ENABLED"
                    : "DISABLED"
                }
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Safety"
                value="Anticipatory separation gate"
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Next Integration"
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