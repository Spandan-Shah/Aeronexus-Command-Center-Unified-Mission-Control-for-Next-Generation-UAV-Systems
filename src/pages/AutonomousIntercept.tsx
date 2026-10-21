import {
  AlertTriangle,
  BrainCircuit,
  Cpu,
  MapPinned,
  Navigation,
  Pause,
  Plane,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Target,
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
  AiModuleState,
  InterceptorState,
  PredictorMode,
} from "../hooks/useInterceptSimulation";

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

type Metric = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneClass:
  Record<
    Tone,
    string
  > = {
  nominal:
    "text-[#59D99A]",

  caution:
    "text-[#F6B23C]",

  critical:
    "text-[#FF315A]",

  info:
    "text-[#5AA9FF]",

  muted:
    "text-white/40",
};

function formatDistance(
  value:
    number | null,
) {
  return value ===
    null
    ? "—"
    : `${Math.round(
        value,
      )} m`;
}

function formatEta(
  value:
    number | null,
) {
  if (
    value ===
      null ||
    !Number.isFinite(
      value,
    ) ||
    value >
      999
  ) {
    return "—";
  }

  return `${value.toFixed(
    1,
  )} s`;
}

function formatError(
  value:
    number | null,
) {
  return value ===
    null
    ? "WARMING"
    : `${value.toFixed(
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
    <div className="flex min-w-0 items-center justify-between gap-2 border-r border-white/[0.07] px-3 last:border-r-0">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-white/42">
          {
            metric.label
          }
        </div>

        <div
          className={[
            "mt-0.5 truncate font-mono text-[14px] font-semibold",

            toneClass[
              metric.tone
            ],
          ].join(" ")}
        >
          {
            metric.value
          }
        </div>
      </div>

      <Icon
        size={16}
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
    <div className="flex min-h-[36px] items-center justify-between gap-3 border-b border-white/[0.055] last:border-b-0">
      <span className="text-[14px] text-white/48">
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

function RangeControl({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
  accent =
    "#F6B23C",
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;

  onChange:
    (
      value:
        number,
    ) => void;

  accent?: string;
}) {
  return (
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] text-white/60">
          {label}
        </span>

        <span
          className="font-mono text-[14px] font-semibold"
          style={{
            color:
              accent,
          }}
        >
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
        style={{
          accentColor:
            accent,
        }}
        className="mt-3 w-full"
      />
    </div>
  );
}

function InterceptorCard({
  interceptor,
  onSpeedChange,
}: {
  interceptor:
    InterceptorState;

  onSpeedChange:
    (
      value:
        number,
    ) => void;
}) {
  const active =
    interceptor.status ===
      "PURSUIT" ||
    interceptor.status ===
      "RENDEZVOUS" ||
    interceptor.status ===
      "SHADOW";

  const statusDetail =
    interceptor.status ===
    "PURSUIT"
      ? interceptor.guidanceLocked
        ? "LOCKED LEAD"
        : "ACQUIRING"
      : interceptor.status ===
          "RENDEZVOUS"
        ? "SLOT CAPTURE"
        : interceptor.status ===
            "SHADOW"
          ? "SLOT HELD"
          : interceptor.status;

  return (
    <div
      className={[
        "rounded-[5px] border p-3",

        active
          ? "border-white/[0.15] bg-white/[0.025]"
          : "border-white/[0.07] bg-[#05060d]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                interceptor.color,

              boxShadow:
                `0 0 9px ${interceptor.color}`,
            }}
          />

          <span className="text-[15px] font-semibold text-white/82">
            {
              interceptor.callsign
            }
          </span>
        </div>

        <div className="text-right">
          <div
            className="font-mono text-[14px] font-semibold"
            style={{
              color:
                interceptor.assigned
                  ? interceptor.color
                  : "rgba(255,255,255,.34)",
            }}
          >
            {
              interceptor.status
            }
          </div>

          <div className="mt-0.5 font-mono text-[12px] text-white/32">
            {
              statusDetail
            }
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div>
          <div className="text-[12px] text-white/30">
            Current
          </div>

          <div className="font-mono text-[14px] text-white/68">
            {
              interceptor.airspeed.toFixed(
                0,
              )
            }
          </div>
        </div>

        <div>
          <div className="text-[12px] text-white/30">
            Command
          </div>

          <div
            className="font-mono text-[14px]"
            style={{
              color:
                interceptor.color,
            }}
          >
            {
              interceptor.targetAirspeed.toFixed(
                0,
              )
            }
          </div>
        </div>

        <div>
          <div className="text-[12px] text-white/30">
            Slot Err
          </div>

          <div className="font-mono text-[14px] text-white/68">
            {interceptor.slotErrorMeters ===
            null
              ? "—"
              : Math.round(
                  interceptor.slotErrorMeters,
                )}
          </div>
        </div>

        <div>
          <div className="text-[12px] text-white/30">
            ETA
          </div>

          <div className="font-mono text-[14px] text-[#F6B23C]">
            {interceptor.etaSeconds ===
            null
              ? "—"
              : interceptor.etaSeconds.toFixed(
                  0,
                )}
            s
          </div>
        </div>
      </div>

      <input
        type="range"
        min="40"
        max="90"
        step="1"
        value={
          interceptor.speedLimitMps
        }
        onChange={(
          event,
        ) =>
          onSpeedChange(
            Number(
              event.target.value,
            ),
          )
        }
        style={{
          accentColor:
            interceptor.color,
        }}
        className="mt-2 w-full"
      />
    </div>
  );
}

function AiModuleCard({
  module,
}: {
  module:
    AiModuleState;
}) {
  const ml =
    module.category ===
    "ML";

  const stateColor =
    module.state ===
      "ACTIVE" ||
    module.state ===
      "LEARNING"
      ? ml
        ? "text-[#A8FF4F]"
        : "text-[#5AA9FF]"
      : module.state ===
          "REJECTED"
        ? "text-[#FF5A63]"
        : module.state ===
            "WARMING"
          ? "text-[#F6B23C]"
          : "text-white/34";

  return (
    <div
      className={[
        "rounded-[5px] border p-3",

        ml
          ? "border-[rgba(168,255,79,.14)] bg-[rgba(168,255,79,.025)]"
          : "border-white/[0.07] bg-[#05060d]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ml ? (
              <BrainCircuit
                size={15}
                className="shrink-0 text-[#A8FF4F]"
              />
            ) : (
              <Cpu
                size={15}
                className="shrink-0 text-[#5AA9FF]"
              />
            )}

            <span className="truncate text-[14px] font-semibold text-white/76">
              {
                module.label
              }
            </span>
          </div>

          <div className="mt-1.5 text-[14px] leading-[1.45] text-white/38">
            {
              module.detail
            }
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={[
              "font-mono text-[12px] font-semibold",

              ml
                ? "text-[#A8FF4F]"
                : "text-[#5AA9FF]",
            ].join(" ")}
          >
            {
              module.category
            }
          </div>

          <div
            className={[
              "mt-1 font-mono text-[12px] font-semibold",

              stateColor,
            ].join(" ")}
          >
            {
              module.state
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutonomousIntercept() {
  const {
    snapshot,
    actions,
  } =
    useInterceptSimulation();

  const metrics:
    Metric[] = [
    {
      label:
        "Threat",

      value:
        snapshot.alert.phase,

      icon:
        AlertTriangle,

      tone:
        snapshot.alert.active
          ? "critical"
          : "nominal",
    },

    {
      label:
        "Fleet",

      value:
        snapshot.fleetPhase,

      icon:
        Radio,

      tone:
        snapshot.interceptAuthorized
          ? "info"
          : "muted",
    },

    {
      label:
        "Intruder",

      value:
        `${snapshot.intruder.airspeed.toFixed(
          1,
        )} m/s`,

      icon:
        Plane,

      tone:
        "critical",
    },

    {
      label:
        "Nearest",

      value:
        formatDistance(
          snapshot.nearestSeparationMeters,
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
        "Fleet ETA",

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
        "ML Gate",

      value:
        snapshot.mlValidation.status,

      icon:
        BrainCircuit,

      tone:
        snapshot.mlValidation.status ===
        "VALIDATED"
          ? "nominal"
          : snapshot.mlValidation.status ===
              "REJECTED"
            ? "critical"
            : "caution",
    },
  ];

  function setPredictor(
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
        <div className="mx-auto grid w-full max-w-[1640px] gap-2 px-4 pb-3 pt-2 sm:px-6 lg:px-8 xl:h-full xl:grid-rows-[40px_54px_minmax(0,1fr)] xl:px-10 2xl:px-14">
          <header className="flex items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="shrink-0 text-[16px] font-semibold">
                Autonomous Intercept
              </h1>

              <span className="hidden truncate text-[14px] text-white/42 lg:block">
                Locked predictive pursuit · capture gate · non-contact four-UAV shadow formation
              </span>
            </div>

            <div className="flex shrink-0 gap-2">
              <span className="rounded-[4px] border border-[rgba(89,217,154,.20)] px-2 py-1 font-mono text-[14px] text-[#59D99A]">
                ● SIM ACTIVE
              </span>

              <span className="hidden rounded-[4px] border border-[rgba(90,169,255,.20)] px-2 py-1 font-mono text-[14px] text-[#5AA9FF] md:block">
                HUMAN-IN-LOOP
              </span>
            </div>
          </header>

          <section className="grid grid-cols-2 overflow-hidden rounded-[5px] border border-white/[0.08] bg-[#07090d] md:grid-cols-3 xl:grid-cols-6">
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

          <section className="grid min-h-[920px] overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#020304] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_470px]">
            <div className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex items-center gap-2">
                  <MapPinned
                    size={15}
                    className="text-[#5AA9FF]"
                  />

                  <span className="text-[16px] font-medium text-white/82">
                    Predictive Intercept Workspace
                  </span>

                  <span className="hidden font-mono text-[14px] text-white/34 lg:inline">
                    {
                      snapshot.missionId
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[14px] text-white/38">
                    WP{" "}
                    {
                      snapshot.activeWaypointIndex
                    }
                    /
                    {
                      snapshot.intruderFlightPlan.length -
                      1
                    }
                  </span>

                  <button
                    type="button"
                    onClick={
                      actions.toggleRunning
                    }
                    className="flex h-8 items-center gap-1.5 rounded-[4px] border border-white/[0.08] px-2.5 text-[14px] text-white/60"
                  >
                    {snapshot.running ? (
                      <Pause
                        size={12}
                      />
                    ) : (
                      <Play
                        size={12}
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
                    className="flex h-8 items-center gap-1.5 rounded-[4px] border border-white/[0.08] px-2.5 text-[14px] text-white/60"
                  >
                    <RotateCcw
                      size={12}
                    />

                    New Plan
                  </button>
                </div>
              </div>

              <InterceptMap
                snapshot={
                  snapshot
                }
              />
            </div>

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              <section
                className={[
                  "border-b px-4 py-3",

                  snapshot.alert.active
                    ? "border-[rgba(255,49,90,.20)] bg-[rgba(255,49,90,.035)]"
                    : "border-white/[0.08]",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border",

                      snapshot.alert.active
                        ? "border-[rgba(255,49,90,.32)] text-[#FF315A]"
                        : "border-[rgba(89,217,154,.24)] text-[#59D99A]",
                    ].join(" ")}
                  >
                    {snapshot.alert.active ? (
                      <AlertTriangle
                        size={17}
                      />
                    ) : (
                      <ShieldCheck
                        size={17}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={[
                        "text-[16px] font-semibold",

                        snapshot.alert.active
                          ? "text-[#FF5A72]"
                          : "text-[#59D99A]",
                      ].join(" ")}
                    >
                      {
                        snapshot.alert.title
                      }
                    </div>

                    <div className="mt-1 text-[14px] leading-[1.45] text-white/46">
                      {
                        snapshot.alert.message
                      }
                    </div>

                    <button
                      type="button"
                      disabled={
                        !snapshot.alert.latched ||
                        snapshot.interceptAuthorized
                      }
                      onClick={
                        actions.interceptAll
                      }
                      className={[
                        "mt-3 h-10 w-full rounded-[5px] border text-[14px] font-semibold",

                        snapshot.interceptAuthorized
                          ? "border-[rgba(89,217,154,.26)] bg-[rgba(89,217,154,.05)] text-[#59D99A]"
                          : snapshot.alert.latched
                            ? "border-[rgba(246,178,60,.34)] bg-[rgba(246,178,60,.08)] text-[#F6B23C]"
                            : "cursor-not-allowed border-white/[0.07] text-white/22",
                      ].join(" ")}
                    >
                      {snapshot.interceptAuthorized
                        ? `${snapshot.fleetPhase} · 4-UAV RESPONSE`
                        : snapshot.alert.latched
                          ? "INTERCEPT ALL 4"
                          : "WAITING FOR AIRSPACE ALERT"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={16}
                      className="text-[#00E5FF]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Interceptor Fleet
                    </span>
                  </div>

                  <span className="font-mono text-[14px] text-white/38">
                    40–90 m/s
                  </span>
                </div>

                <div className="grid gap-2">
                  {snapshot.interceptors.map(
                    (
                      interceptor,
                    ) => (
                      <InterceptorCard
                        key={
                          interceptor.id
                        }
                        interceptor={
                          interceptor
                        }
                        onSpeedChange={(
                          value,
                        ) =>
                          actions.setInterceptorSpeedLimit(
                            interceptor.id,
                            value,
                          )
                        }
                      />
                    ),
                  )}
                </div>

                <div className="mt-2 grid gap-2">
                  <RangeControl
                    label="Intruder Target Airspeed"
                    value={
                      snapshot.speedControl
                        .intruderCommandedAirspeed
                    }
                    suffix="m/s"
                    min={12}
                    max={50}
                    step={0.5}
                    accent="#FF315A"
                    onChange={
                      actions.setIntruderCommandedAirspeed
                    }
                  />

                  <RangeControl
                    label="Shadow Standoff"
                    value={
                      snapshot.desiredSeparationMeters
                    }
                    suffix="m"
                    min={220}
                    max={420}
                    step={10}
                    accent="#F6B23C"
                    onChange={
                      actions.setDesiredSeparation
                    }
                  />
                </div>
              </section>

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit
                      size={16}
                      className="text-[#A8FF4F]"
                    />

                    <div>
                      <div className="text-[16px] font-semibold text-white/82">
                        AI / ML Pipeline
                      </div>

                      <div className="mt-0.5 text-[14px] text-white/38">
                        Measured model authority, not a cosmetic confidence score
                      </div>
                    </div>
                  </div>

                  <span
                    className={[
                      "font-mono text-[14px] font-semibold",

                      snapshot.mlValidation.status ===
                      "VALIDATED"
                        ? "text-[#A8FF4F]"
                        : snapshot.mlValidation.status ===
                            "REJECTED"
                          ? "text-[#FF5A63]"
                          : "text-[#F6B23C]",
                    ].join(" ")}
                  >
                    {
                      snapshot.mlValidation.status
                    }
                  </span>
                </div>

                <div className="grid gap-2">
                  {snapshot.ai.modules.map(
                    (
                      module,
                    ) => (
                      <AiModuleCard
                        key={
                          module.id
                        }
                        module={
                          module
                        }
                      />
                    ),
                  )}
                </div>
              </section>

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-white/82">
                    Trajectory Predictor
                  </span>

                  <span className="font-mono text-[14px] text-[#A8FF4F]">
                    {
                      snapshot.ai.selectedPredictor
                    }
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPredictor(
                        "baseline",
                      )
                    }
                    className={[
                      "rounded-[5px] border p-3 text-left",

                      snapshot.predictorMode ===
                      "baseline"
                        ? "border-white/30 bg-white/[0.05]"
                        : "border-white/[0.07] bg-[#05060d]",
                    ].join(" ")}
                  >
                    <div className="text-[14px] font-semibold text-white/72">
                      CV Baseline
                    </div>

                    <div className="mt-1 text-[14px] text-white/36">
                      No learned correction
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPredictor(
                        "ml",
                      )
                    }
                    className={[
                      "rounded-[5px] border p-3 text-left",

                      snapshot.predictorMode ===
                      "ml"
                        ? "border-[rgba(168,255,79,.30)] bg-[rgba(168,255,79,.04)]"
                        : "border-white/[0.07] bg-[#05060d]",
                    ].join(" ")}
                  >
                    <div className="text-[14px] font-semibold text-[#A8FF4F]">
                      Validated Ensemble
                    </div>

                    <div className="mt-1 text-[14px] text-white/36">
                      CV + CTRV + gated residual MLP
                    </div>
                  </button>
                </div>

                <div className="mt-2">
                  <StateRow
                    label="Training Samples"
                    value={`${snapshot.ai.trainingSamples}`}
                  />

                  <StateRow
                    label="Validation Samples"
                    value={`${snapshot.performance.validationSamples}`}
                  />

                  <StateRow
                    label="CV Error"
                    value={
                      formatError(
                        snapshot.performance
                          .baselineErrorMeters,
                      )
                    }
                  />

                  <StateRow
                    label="CTRV Error"
                    value={
                      formatError(
                        snapshot.performance
                          .ctrvErrorMeters,
                      )
                    }
                    valueClass="text-[#D77DFF]"
                  />

                  <StateRow
                    label="MLP Error"
                    value={
                      formatError(
                        snapshot.performance
                          .learnedErrorMeters,
                      )
                    }
                    valueClass="text-[#A8FF4F]"
                  />

                  <StateRow
                    label="Ensemble Error"
                    value={
                      formatError(
                        snapshot.performance
                          .mlErrorMeters,
                      )
                    }
                    valueClass="text-[#59D99A]"
                  />

                  <StateRow
                    label="ML Contribution"
                    value={`${snapshot.mlValidation.contributionPercent.toFixed(
                      0,
                    )}%`}
                    valueClass={
                      snapshot.mlValidation.status ===
                      "VALIDATED"
                        ? "text-[#A8FF4F]"
                        : "text-white/38"
                    }
                  />
                </div>
              </section>

              <section className="px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck
                    size={16}
                    className={
                      snapshot.anticipatorySafetyGate
                        ? "text-[#FF42A1]"
                        : "text-[#59D99A]"
                    }
                  />

                  <span className="text-[16px] font-semibold text-white/82">
                    Safety Controller
                  </span>
                </div>

                <StateRow
                  label="Nearest Interceptor"
                  value={
                    formatDistance(
                      snapshot.nearestSeparationMeters,
                    )
                  }
                />

                <StateRow
                  label="Predicted Closest"
                  value={
                    formatDistance(
                      snapshot.predictedClosestSeparationMeters,
                    )
                  }
                />

                <StateRow
                  label="Hard Protected Radius"
                  value={`${snapshot.minimumSeparationMeters + 22} m`}
                />

                <StateRow
                  label="Recovery Gate"
                  value={
                    snapshot.anticipatorySafetyGate
                      ? "ACTIVE"
                      : "CLEAR"
                  }
                  valueClass={
                    snapshot.anticipatorySafetyGate
                      ? "text-[#FF42A1]"
                      : "text-[#59D99A]"
                  }
                />

                <StateRow
                  label="Formation Stability"
                  value={`${snapshot.fleetStableSeconds.toFixed(
                    1,
                  )} / 2.0 s`}
                  valueClass={
                    snapshot.fleetPhase ===
                    "SHADOW"
                      ? "text-[#59D99A]"
                      : "text-[#F6B23C]"
                  }
                />
              </section>
            </aside>
          </section>
        </div>
      </section>
    </div>
  );
}