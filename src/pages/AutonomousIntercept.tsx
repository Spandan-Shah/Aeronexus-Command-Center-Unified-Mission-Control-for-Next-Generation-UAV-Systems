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
  if (
    value ===
    null
  ) {
    return "—";
  }

  return `${Math.round(
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
        <div className="truncate text-[11px] font-medium text-white/38">
          {metric.label}
        </div>

        <div
          className={[
            "mt-0.5 truncate font-mono text-[13px] font-semibold",

            toneClass[
              metric.tone
            ],
          ].join(" ")}
        >
          {metric.value}
        </div>
      </div>

      <Icon
        size={15}
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
    <div className="flex min-h-[34px] items-center justify-between gap-3 border-b border-white/[0.055] last:border-b-0">
      <span className="text-[13px] text-white/44">
        {label}
      </span>

      <span
        className={[
          "max-w-[62%] truncate text-right font-mono text-[13px] font-medium",

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
        <span className="text-[13px] text-white/58">
          {label}
        </span>

        <span
          className="font-mono text-[13px] font-semibold"
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
  return (
    <div
      className={[
        "rounded-[5px] border p-3",

        interceptor.assigned
          ? "border-white/[0.14] bg-white/[0.025]"
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
                `0 0 8px ${interceptor.color}`,
            }}
          />

          <span className="text-[14px] font-semibold text-white/80">
            {
              interceptor.callsign
            }
          </span>
        </div>

        <span
          className="font-mono text-[11px] font-semibold"
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
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[11px] text-white/30">
            Current
          </div>

          <div className="font-mono text-[12px] text-white/68">
            {
              interceptor.airspeed.toFixed(
                0,
              )
            }
          </div>
        </div>

        <div>
          <div className="text-[11px] text-white/30">
            Target
          </div>

          <div
            className="font-mono text-[12px]"
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
          <div className="text-[11px] text-white/30">
            Limit
          </div>

          <div className="font-mono text-[12px] text-[#F6B23C]">
            {
              interceptor.speedLimitMps.toFixed(
                0,
              )
            }
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

  const activeCriticalZone =
    snapshot.criticalZones.find(
      (
        zone,
      ) =>
        zone.active,
    );

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
          "Response",

        value:
          snapshot.interceptAuthorized
            ? "4 / 4"
            : "STANDBY",

        icon:
          Radio,

        tone:
          snapshot.interceptAuthorized
            ? "info"
            : "muted",
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
          "Formation ETA",

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
          "AI",

        value:
          snapshot.ai.ready
            ? `${confidence}%`
            : "TRAINING",

        icon:
          BrainCircuit,

        tone:
          "nominal",
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
      <section className="xl:h-[calc(100vh-70px)] xl:overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1600px] gap-2 px-4 pb-3 pt-2 sm:px-6 lg:px-8 xl:h-full xl:grid-rows-[40px_52px_minmax(0,1fr)] xl:px-10 2xl:px-14">
          {/* Compact title */}

          <header className="flex items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="shrink-0 text-[18px] font-semibold">
                Autonomous Intercept
              </h1>

              <span className="hidden truncate text-[12px] text-white/38 lg:block">
                Predictive multi-UAV non-contact defence simulation
              </span>
            </div>

            <div className="flex shrink-0 gap-2">
              <span className="rounded-[4px] border border-[rgba(89,217,154,.20)] px-2 py-1 font-mono text-[11px] text-[#59D99A]">
                ● SIM ACTIVE
              </span>

              <span className="hidden rounded-[4px] border border-[rgba(90,169,255,.20)] px-2 py-1 font-mono text-[11px] text-[#5AA9FF] md:block">
                HUMAN-IN-LOOP
              </span>
            </div>
          </header>

          {/* Compact metrics */}

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

          {/* Workspace */}

          <section className="grid min-h-[880px] overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#020304] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_430px]">
            {/* Map */}

            <div className="grid min-h-0 grid-rows-[38px_minmax(0,1fr)]">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex items-center gap-2">
                  <MapPinned
                    size={14}
                    className="text-[#5AA9FF]"
                  />

                  <span className="text-[14px] font-medium text-white/80">
                    Ahmedabad Airspace Simulation
                  </span>

                  <span className="hidden font-mono text-[11px] text-white/32 lg:inline">
                    {
                      snapshot.missionId
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-white/34">
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
                    className="flex h-7 items-center gap-1.5 rounded-[4px] border border-white/[0.08] px-2 text-[11px] text-white/56"
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
                    className="flex h-7 items-center gap-1.5 rounded-[4px] border border-white/[0.08] px-2 text-[11px] text-white/56"
                  >
                    <RotateCcw
                      size={11}
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

            {/* Inspector */}

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              {/* Alert */}

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
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border",

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
                        "text-[15px] font-semibold",

                        snapshot.alert.active
                          ? "text-[#FF5A72]"
                          : "text-[#59D99A]",
                      ].join(" ")}
                    >
                      {
                        snapshot.alert.title
                      }
                    </div>

                    <div className="mt-1 text-[13px] leading-[1.45] text-white/42">
                      {
                        snapshot.alert.message
                      }
                    </div>

                    {activeCriticalZone ? (
                      <div className="mt-2 font-mono text-[12px] text-[#FF315A]">
                        ZONE:{" "}
                        {
                          activeCriticalZone.label
                        }
                      </div>
                    ) : null}

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
                        "mt-3 h-10 w-full rounded-[5px] border text-[14px] font-semibold transition-colors",

                        snapshot.interceptAuthorized
                          ? "cursor-default border-[rgba(89,217,154,.26)] bg-[rgba(89,217,154,.05)] text-[#59D99A]"
                          : snapshot.alert.latched
                            ? "border-[rgba(246,178,60,.34)] bg-[rgba(246,178,60,.08)] text-[#F6B23C] hover:bg-[rgba(246,178,60,.13)]"
                            : "cursor-not-allowed border-white/[0.07] text-white/22",
                      ].join(" ")}
                    >
                      {snapshot.interceptAuthorized
                        ? "4-UAV RESPONSE ACTIVE"
                        : snapshot.alert.latched
                          ? "INTERCEPT ALL 4"
                          : "WAITING FOR PERIMETER ALERT"}
                    </button>
                  </div>
                </div>
              </section>

              {/* Intruder */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane
                      size={16}
                      className="text-[#FF315A]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Unauthorized UAV
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-[#FF5A72]">
                    {
                      snapshot.intruder.mode
                    }
                  </span>
                </div>

                <RangeControl
                  label="Target Airspeed"
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

                <div className="mt-2">
                  <StateRow
                    label="Actual Airspeed"
                    value={`${snapshot.intruder.airspeed.toFixed(
                      1,
                    )} m/s`}
                    valueClass="text-[#FF5A72]"
                  />

                  <StateRow
                    label="Heading"
                    value={`${snapshot.intruder.heading.toFixed(
                      0,
                    )}°`}
                  />

                  <StateRow
                    label="Route"
                    value={`WP ${snapshot.activeWaypointIndex}`}
                  />
                </div>
              </section>

              {/* Four UAV controllers */}

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

                  <span className="font-mono text-[11px] text-white/36">
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

                <div className="mt-2">
                  <RangeControl
                    label="Formation Standoff"
                    value={
                      snapshot.desiredSeparationMeters
                    }
                    suffix="m"
                    min={140}
                    max={350}
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
                  className="mt-2 flex h-11 w-full items-center justify-between rounded-[5px] border border-[rgba(89,217,154,.18)] bg-[rgba(89,217,154,.025)] px-3"
                >
                  <div className="text-left">
                    <div className="text-[13px] text-white/64">
                      Adaptive Catch-up Control
                    </div>

                    <div className="text-[11px] text-white/30">
                      Range · closure · turn demand
                    </div>
                  </div>

                  <span className="font-mono text-[12px] font-semibold text-[#59D99A]">
                    {snapshot.speedControl.adaptiveSync
                      ? "ON"
                      : "OFF"}
                  </span>
                </button>
              </section>

              {/* AI */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit
                      size={16}
                      className="text-[#A8FF4F]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Predictive Guidance
                    </span>
                  </div>

                  <span className="font-mono text-[12px] font-semibold text-[#A8FF4F]">
                    {
                      snapshot.ai.selectedPredictor
                    }
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectPredictor(
                        "baseline",
                      )
                    }
                    className={[
                      "rounded-[5px] border p-2.5 text-left",

                      snapshot.predictorMode ===
                      "baseline"
                        ? "border-white/30 bg-white/[0.05]"
                        : "border-white/[0.07] bg-[#05060d]",
                    ].join(" ")}
                  >
                    <div className="text-[13px] font-semibold text-white/72">
                      CV Baseline
                    </div>

                    <div className="mt-1 text-[11px] text-white/32">
                      Straight-line model
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectPredictor(
                        "ml",
                      )
                    }
                    className={[
                      "rounded-[5px] border p-2.5 text-left",

                      snapshot.predictorMode ===
                      "ml"
                        ? "border-[rgba(168,255,79,.30)] bg-[rgba(168,255,79,.04)]"
                        : "border-white/[0.07] bg-[#05060d]",
                    ].join(" ")}
                  >
                    <div className="text-[13px] font-semibold text-[#A8FF4F]">
                      Adaptive
                    </div>

                    <div className="mt-1 text-[11px] text-white/32">
                      CV + CTRV + residual
                    </div>
                  </button>
                </div>

                <div className="mt-2">
                  <StateRow
                    label="Confidence"
                    value={`${confidence}%`}
                    valueClass="text-[#A8FF4F]"
                  />

                  <StateRow
                    label="Training Samples"
                    value={`${snapshot.ai.trainingSamples}`}
                  />

                  <StateRow
                    label="CV Weight"
                    value={`${Math.round(
                      snapshot.ai.weights.cv *
                        100,
                    )}%`}
                  />

                  <StateRow
                    label="CTRV Weight"
                    value={`${Math.round(
                      snapshot.ai.weights.ctrv *
                        100,
                    )}%`}
                    valueClass="text-[#D77DFF]"
                  />

                  <StateRow
                    label="Learned Weight"
                    value={`${Math.round(
                      snapshot.ai.weights.learned *
                        100,
                    )}%`}
                    valueClass="text-[#A8FF4F]"
                  />
                </div>
              </section>

              {/* Safety */}

              <section className="border-b border-white/[0.08] px-4 py-3">
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
                    Separation Safety
                  </span>
                </div>

                <StateRow
                  label="Protected Radius"
                  value={`${snapshot.minimumSeparationMeters} m`}
                />

                <StateRow
                  label="Nearest UAV"
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
                  valueClass={
                    snapshot.anticipatorySafetyGate
                      ? "text-[#FF42A1]"
                      : "text-[#59D99A]"
                  }
                />
              </section>
            </aside>
          </section>
        </div>
      </section>

      {/* Evidence below fold */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[1.2fr_0.8fr] xl:px-10 2xl:px-14">
          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="border-b border-white/[0.07] px-4 py-3">
              <div className="text-[16px] font-semibold text-[#F6B23C]">
                Prediction Evidence
              </div>

              <div className="mt-1 text-[13px] text-white/42">
                Every model is scored against the actual future intruder position
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-4">
              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="text-[13px] text-white/40">
                  CV Error
                </div>

                <div className="mt-2 font-mono text-[17px] text-white">
                  {formatError(
                    snapshot.performance
                      .baselineErrorMeters,
                  )}
                </div>
              </div>

              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="text-[13px] text-white/40">
                  CTRV Error
                </div>

                <div className="mt-2 font-mono text-[17px] text-[#D77DFF]">
                  {formatError(
                    snapshot.performance
                      .ctrvErrorMeters,
                  )}
                </div>
              </div>

              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="text-[13px] text-white/40">
                  Adaptive Error
                </div>

                <div className="mt-2 font-mono text-[17px] text-[#A8FF4F]">
                  {formatError(
                    snapshot.performance
                      .mlErrorMeters,
                  )}
                </div>
              </div>

              <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
                <div className="text-[13px] text-white/40">
                  vs CV
                </div>

                <div
                  className={[
                    "mt-2 font-mono text-[17px]",

                    (
                      snapshot.performance
                        .improvementPercent ??
                      0
                    ) >=
                    0
                      ? "text-[#59D99A]"
                      : "text-[#FF315A]",
                  ].join(" ")}
                >
                  {snapshot.performance
                    .improvementPercent ===
                  null
                    ? "TRAINING"
                    : `${snapshot.performance.improvementPercent >=
                        0
                        ? "+"
                        : ""}${snapshot.performance.improvementPercent.toFixed(
                        1,
                      )}%`}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <div className="text-[16px] font-semibold text-[#F6B23C]">
                  Mission State
                </div>

                <div className="mt-1 text-[13px] text-white/42">
                  One randomized scenario per reset / reload
                </div>
              </div>

              <Cpu
                size={18}
                className="text-[#5AA9FF]"
              />
            </div>

            <div className="p-4">
              <StateRow
                label="Mission"
                value={
                  snapshot.missionId
                }
              />

              <StateRow
                label="Perimeter"
                value="MONITORED"
                valueClass="text-[#5BFF8A]"
              />

              <StateRow
                label="Critical Zones"
                value="2 DEMO ZONES"
                valueClass="text-[#FF315A]"
              />

              <StateRow
                label="Interceptor Fleet"
                value="4 UAV"
                valueClass="text-[#00E5FF]"
              />

              <StateRow
                label="Dispatch"
                value="OPERATOR AUTHORIZED"
                valueClass="text-[#F6B23C]"
              />

              <StateRow
                label="Mode"
                value={
                  snapshot.mode
                }
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}