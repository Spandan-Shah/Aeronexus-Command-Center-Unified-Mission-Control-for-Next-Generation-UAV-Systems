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
  InterceptorState,
  PredictorMode,
} from "../hooks/useInterceptSimulation";

/* =========================================================
   Types
   ========================================================= */

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
    "text-[#FF5A63]",

  info:
    "text-[#5AA9FF]",

  muted:
    "text-white/42",
};

/* =========================================================
   Helpers
   ========================================================= */

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

  if (
    value >=
    1000
  ) {
    return `${(
      value /
      1000
    ).toFixed(
      2,
    )} km`;
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

function percentage(
  value:
    number,
) {
  return `${Math.round(
    value *
      100,
  )}%`;
}

/* =========================================================
   Metric
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
    <div className="flex min-w-0 items-center justify-between gap-2 border-r border-white/[0.07] px-3 last:border-r-0">
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-white/42">
          {metric.label}
        </div>

        <div
          className={[
            "mt-0.5 truncate font-mono text-[14px] font-semibold",

            toneClass[
              metric.tone
            ],
          ].join(" ")}
        >
          {metric.value}
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
    <div className="flex min-h-[36px] items-center justify-between gap-4 border-b border-white/[0.055] last:border-b-0">
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
   Range
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
        <span className="text-[14px] font-medium text-white/60">
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
        className="mt-3 w-full accent-[#F6B23C]"
      />
    </div>
  );
}

/* =========================================================
   Command
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
      ? "border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.045)] text-[#FF5A63]"
      : tone ===
          "primary"
        ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.07)] text-[#F6B23C]"
        : "border-white/[0.09] bg-[#05060d] text-white/68";

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex h-10 items-center justify-center gap-2 rounded-[5px] border px-2",

        "text-[14px] font-medium",

        "transition-colors hover:bg-white/[0.03]",

        style,
      ].join(" ")}
    >
      <Icon
        size={14}
      />

      {label}
    </button>
  );
}

/* =========================================================
   Predictor
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
        "rounded-[5px] border p-3 text-left",

        active
          ? "border-[rgba(89,217,154,0.28)] bg-[rgba(89,217,154,0.045)]"
          : "border-white/[0.08] bg-[#05060d]",
      ].join(" ")}
    >
      <div
        className={[
          "text-[14px] font-semibold",

          active
            ? "text-[#59D99A]"
            : "text-white/68",
        ].join(" ")}
      >
        {label}
      </div>

      <div className="mt-1 text-[13px] leading-[1.4] text-white/38">
        {description}
      </div>
    </button>
  );
}

/* =========================================================
   Interceptor Card
   ========================================================= */

function InterceptorCard({
  interceptor,
  color,
  onSpeedChange,
  onDispatch,
}: {
  interceptor:
    InterceptorState;

  color:
    string;

  onSpeedChange:
    (
      value:
        number,
    ) => void;

  onDispatch:
    () => void;
}) {
  return (
    <div
      className={[
        "rounded-[5px] border p-3",

        interceptor.assigned
          ? "border-[rgba(0,217,255,0.32)] bg-[rgba(0,217,255,0.035)]"
          : "border-white/[0.07] bg-[#05060d]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  color,
              }}
            />

            <span className="text-[14px] font-semibold text-white/80">
              INT-
              {
                interceptor.id
              }
            </span>
          </div>

          <div
            className={[
              "mt-1 font-mono text-[12px] font-semibold",

              interceptor.assigned
                ? "text-[#00D9FF]"
                : "text-white/38",
            ].join(" ")}
          >
            {
              interceptor.status
            }
          </div>
        </div>

        <button
          type="button"
          onClick={
            onDispatch
          }
          className="h-8 rounded-[4px] border border-[rgba(90,169,255,0.24)] bg-[rgba(90,169,255,0.04)] px-2.5 text-[12px] font-medium text-[#5AA9FF]"
        >
          Dispatch
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[12px] text-white/36">
            Current
          </div>

          <div className="mt-0.5 font-mono text-[14px] text-white/72">
            {
              interceptor.airspeed.toFixed(
                1,
              )
            }{" "}
            m/s
          </div>
        </div>

        <div>
          <div className="text-[12px] text-white/36">
            Target
          </div>

          <div className="mt-0.5 font-mono text-[14px] text-[#00D9FF]">
            {
              interceptor.targetAirspeed.toFixed(
                1,
              )
            }{" "}
            m/s
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[13px] text-white/44">
          Speed Limit
        </span>

        <span className="font-mono text-[13px] font-semibold text-[#F6B23C]">
          {
            interceptor.speedLimitMps.toFixed(
              0,
            )
          }{" "}
          m/s
        </span>
      </div>

      <input
        type="range"
        min="25"
        max="80"
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
        className="mt-2 w-full accent-[#00D9FF]"
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

  const activeSector =
    snapshot.sectors.find(
      (
        sector,
      ) =>
        sector.active,
    );

  const assignedInterceptor =
    snapshot.interceptors.find(
      (
        interceptor,
      ) =>
        interceptor.id ===
        snapshot.assignedInterceptorId,
    );

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

  const metrics:
    Metric[] = [
      {
        label:
          "Defence Zone",

        value:
          activeSector
            ? activeSector.label
            : "CLEAR",

        icon:
          ShieldCheck,

        tone:
          activeSector
            ? "critical"
            : "nominal",
      },

      {
        label:
          "Intruder Speed",

        value:
          `${snapshot.intruder.airspeed.toFixed(
            1,
          )} m/s`,

        icon:
          Plane,

        tone:
          activeSector
            ? "critical"
            : "caution",
      },

      {
        label:
          "Assigned",

        value:
          assignedInterceptor
            ? `INT-${assignedInterceptor.id}`
            : "STANDBY",

        icon:
          Radio,

        tone:
          assignedInterceptor
            ? "info"
            : "muted",
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
          snapshot.ai.ready
            ? `${confidence}%`
            : "TRAINING",

        icon:
          BrainCircuit,

        tone:
          snapshot.ai.ready
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
          Compact primary viewport
          =================================================== */}

      <section className="xl:h-[calc(100vh-70px)] xl:overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1600px] gap-2 px-4 pb-3 pt-2 sm:px-6 lg:px-8 xl:h-full xl:grid-rows-[44px_58px_minmax(0,1fr)] xl:px-10 2xl:px-14">
          {/* ===============================================
              Compact header
              =============================================== */}

          <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="shrink-0 text-[18px] font-semibold text-white">
                Autonomous Intercept
              </h1>

              <span className="hidden truncate text-[13px] text-white/40 lg:block">
                Multi-sector predictive defence · non-contact autonomous shadowing
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-[4px] border border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.04)] px-2 py-1 font-mono text-[12px] font-semibold text-[#59D99A]">
                ● SIM ACTIVE
              </span>

              <span className="hidden rounded-[4px] border border-[rgba(90,169,255,0.22)] bg-[rgba(90,169,255,0.04)] px-2 py-1 font-mono text-[12px] font-semibold text-[#5AA9FF] md:block">
                HUMAN-IN-LOOP
              </span>
            </div>
          </header>

          {/* ===============================================
              Compact metric strip
              =============================================== */}

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

          {/* ===============================================
              Main workspace
              =============================================== */}

          <section className="grid min-h-[900px] overflow-hidden rounded-[6px] border border-white/[0.09] bg-[#020304] xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_445px]">
            {/* Map */}

            <div className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex items-center gap-2">
                  <MapPinned
                    size={15}
                    className="text-[#5AA9FF]"
                  />

                  <span className="text-[14px] font-semibold text-white/82">
                    Ahmedabad Defence Simulation
                  </span>

                  {activeSector ? (
                    <span className="font-mono text-[12px] font-semibold text-[#FF375F]">
                      {activeSector.label} INTRUSION
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-white/38">
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
                    className="flex h-8 items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-[#030405] px-2.5 text-[12px] text-white/58"
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
                    className="flex h-8 items-center gap-1.5 rounded-[4px] border border-white/[0.08] bg-[#030405] px-2.5 text-[12px] text-white/58"
                  >
                    <RotateCcw
                      size={12}
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
                Inspector
                ============================================= */}

            <aside className="min-h-0 overflow-y-auto border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              {/* Defence network */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[16px] font-semibold text-[#F6B23C]">
                      Defence Network
                    </div>

                    <div className="mt-1 text-[14px] text-white/40">
                      Four simulated protected sectors
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      actions.setAutoDefenseEnabled(
                        !snapshot.autoDefenseEnabled,
                      )
                    }
                    className={[
                      "rounded-[4px] border px-2.5 py-1.5 font-mono text-[12px] font-semibold",

                      snapshot.autoDefenseEnabled
                        ? "border-[rgba(89,217,154,0.24)] bg-[rgba(89,217,154,0.04)] text-[#59D99A]"
                        : "border-white/[0.08] text-white/40",
                    ].join(" ")}
                  >
                    AUTO{" "}
                    {snapshot.autoDefenseEnabled
                      ? "ON"
                      : "OFF"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {snapshot.sectors.map(
                    (
                      sector,
                    ) => (
                      <div
                        key={
                          sector.id
                        }
                        className={[
                          "rounded-[4px] border p-2.5",

                          sector.active
                            ? "border-[rgba(255,55,95,0.35)] bg-[rgba(255,55,95,0.055)]"
                            : "border-white/[0.07] bg-[#05060d]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[14px] font-semibold"
                            style={{
                              color:
                                sector.active
                                  ? "#FF375F"
                                  : sector.color,
                            }}
                          >
                            {
                              sector.label
                            }
                          </span>

                          <span className="font-mono text-[11px] text-white/38">
                            INT-
                            {
                              sector.interceptorId
                            }
                          </span>
                        </div>

                        <div className="mt-1 text-[12px] text-white/36">
                          {sector.active
                            ? "Restricted-zone intrusion"
                            : "Sector clear"}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              {/* Intruder */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center gap-2">
                  <Plane
                    size={17}
                    className="text-[#FF375F]"
                  />

                  <span className="text-[16px] font-semibold text-white/82">
                    Intruder UAV
                  </span>
                </div>

                <RangeControl
                  label="Intruder Target Speed"
                  value={
                    snapshot.speedControl
                      .intruderCommandedAirspeed
                  }
                  suffix="m/s"
                  min={12}
                  max={50}
                  step={0.5}
                  onChange={
                    actions.setIntruderCommandedAirspeed
                  }
                />

                <div className="mt-2">
                  <StateRow
                    label="Actual Speed"
                    value={`${snapshot.intruder.airspeed.toFixed(
                      1,
                    )} m/s`}
                    valueClass="text-[#FF657F]"
                  />

                  <StateRow
                    label="Heading"
                    value={`${snapshot.intruder.heading.toFixed(
                      0,
                    )}°`}
                  />

                  <StateRow
                    label="Turn Rate"
                    value={`${snapshot.intruder.turnRate.toFixed(
                      1,
                    )}°/s`}
                  />

                  <StateRow
                    label="Active Sector"
                    value={
                      activeSector?.label ??
                      "None"
                    }
                    valueClass={
                      activeSector
                        ? "text-[#FF375F]"
                        : "text-[#59D99A]"
                    }
                  />
                </div>
              </section>

              {/* Interceptor fleet */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      size={17}
                      className="text-[#00D9FF]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Interceptor Fleet
                    </span>
                  </div>

                  <span className="font-mono text-[12px] text-white/38">
                    25–80 m/s
                  </span>
                </div>

                <div className="grid gap-2">
                  {snapshot.interceptors.map(
                    (
                      interceptor,
                    ) => {
                      const sector =
                        snapshot.sectors.find(
                          (
                            item,
                          ) =>
                            item.interceptorId ===
                            interceptor.id,
                        );

                      return (
                        <InterceptorCard
                          key={
                            interceptor.id
                          }
                          interceptor={
                            interceptor
                          }
                          color={
                            sector?.color ??
                            "#00D9FF"
                          }
                          onDispatch={() =>
                            actions.dispatchInterceptor(
                              interceptor.id,
                            )
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
                      );
                    },
                  )}
                </div>

                <div className="mt-3">
                  <RangeControl
                    label="Desired Shadow Distance"
                    value={
                      snapshot.desiredSeparationMeters
                    }
                    suffix="m"
                    min={130}
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
                  className={[
                    "mt-2 flex min-h-[52px] w-full items-center justify-between rounded-[5px] border px-3",

                    snapshot.speedControl
                      .adaptiveSync
                      ? "border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.035)]"
                      : "border-white/[0.08] bg-[#05060d]",
                  ].join(" ")}
                >
                  <div className="text-left">
                    <div className="text-[14px] font-medium text-white/68">
                      Adaptive Speed Controller
                    </div>

                    <div className="text-[12px] text-white/34">
                      Distance · closure · turn demand
                    </div>
                  </div>

                  <span className="font-mono text-[13px] font-semibold text-[#59D99A]">
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
                      size={17}
                      className="text-[#A7FF4F]"
                    />

                    <span className="text-[16px] font-semibold text-white/82">
                      Predictive AI
                    </span>
                  </div>

                  <span className="font-mono text-[13px] font-semibold text-[#A7FF4F]">
                    {snapshot.ai.ready
                      ? `${confidence}% CONF`
                      : "TRAINING"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PredictorButton
                    label="CV Baseline"
                    description="Straight-line prediction"
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
                    description="CV + CTRV + learned residual"
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

                <div className="mt-2">
                  <StateRow
                    label="Selected"
                    value={
                      snapshot.ai.selectedPredictor
                    }
                    valueClass="text-[#A7FF4F]"
                  />

                  <StateRow
                    label="Training Samples"
                    value={`${snapshot.ai.trainingSamples}`}
                  />

                  <StateRow
                    label="CV Weight"
                    value={
                      percentage(
                        snapshot.ai.weights.cv,
                      )
                    }
                  />

                  <StateRow
                    label="CTRV Weight"
                    value={
                      percentage(
                        snapshot.ai.weights.ctrv,
                      )
                    }
                    valueClass="text-[#D77DFF]"
                  />

                  <StateRow
                    label="Learned Weight"
                    value={
                      percentage(
                        snapshot.ai.weights.learned,
                      )
                    }
                    valueClass="text-[#A7FF4F]"
                  />
                </div>
              </section>

              {/* Safety */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck
                    size={17}
                    className={
                      snapshot.anticipatorySafetyGate
                        ? "text-[#FF4D9D]"
                        : "text-[#59D99A]"
                    }
                  />

                  <span className="text-[16px] font-semibold text-white/82">
                    Non-Contact Safety
                  </span>
                </div>

                <StateRow
                  label="Protected Radius"
                  value={`${snapshot.minimumSeparationMeters} m`}
                />

                <StateRow
                  label="Predicted Closest"
                  value={
                    snapshot.predictedClosestSeparationMeters ===
                    null
                      ? "—"
                      : `${snapshot.predictedClosestSeparationMeters.toFixed(
                          0,
                        )} m`
                  }
                  valueClass={
                    snapshot.anticipatorySafetyGate
                      ? "text-[#FF4D9D]"
                      : "text-[#59D99A]"
                  }
                />

                <StateRow
                  label="Safety Gate"
                  value={
                    snapshot.anticipatorySafetyGate
                      ? "RECOVERY"
                      : "CLEAR"
                  }
                  valueClass={
                    snapshot.anticipatorySafetyGate
                      ? "text-[#FF4D9D]"
                      : "text-[#59D99A]"
                  }
                />
              </section>

              {/* Commands */}

              <section className="border-b border-white/[0.08] px-4 py-3">
                <div className="mb-3 text-[16px] font-semibold text-white/82">
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

              {/* RadioMaster */}

              <section className="px-4 py-3">
                <div className="mb-2 text-[16px] font-semibold text-white/82">
                  RadioMaster Target Control
                </div>

                <div className="flex items-start gap-3 rounded-[5px] border border-white/[0.08] bg-[#05060d] p-3">
                  <Usb
                    size={18}
                    className="mt-0.5 shrink-0 text-white/42"
                  />

                  <div className="min-w-0">
                    <div className="font-mono text-[13px] font-semibold text-white/68">
                      {snapshot.gamepad.connected
                        ? "CONNECTED"
                        : "NOT DETECTED"}
                    </div>

                    <div className="mt-1 text-[13px] text-white/36">
                      {snapshot.gamepad.connected
                        ? snapshot.gamepad.id
                        : "Gamepad API available for target-flight demonstration."}
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </section>

      {/* ===================================================
          Evidence
          =================================================== */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[1.3fr_0.7fr] xl:px-10 2xl:px-14">
          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="border-b border-white/[0.07] px-4 py-3">
              <div className="text-[16px] font-semibold text-[#F6B23C]">
                Prediction Evidence
              </div>

              <div className="mt-1 text-[14px] text-white/46">
                Live comparison against actual future target position
              </div>
            </div>

            <div className="grid gap-3 p-4 md:grid-cols-4">
              {[
                {
                  label:
                    "CV Error",

                  value:
                    formatError(
                      snapshot.performance
                        .baselineErrorMeters,
                    ),

                  color:
                    "text-white",
                },

                {
                  label:
                    "CTRV Error",

                  value:
                    formatError(
                      snapshot.performance
                        .ctrvErrorMeters,
                    ),

                  color:
                    "text-[#D77DFF]",
                },

                {
                  label:
                    "Adaptive Error",

                  value:
                    formatError(
                      snapshot.performance
                        .mlErrorMeters,
                    ),

                  color:
                    "text-[#A7FF4F]",
                },

                {
                  label:
                    "vs CV",

                  value:
                    !evidenceReady ||
                    improvement ===
                      null
                      ? "TRAINING"
                      : `${improvement >=
                          0
                          ? "+"
                          : ""}${improvement.toFixed(
                          1,
                        )}%`,

                  color:
                    improvement !==
                        null &&
                      improvement >
                        0
                      ? "text-[#59D99A]"
                      : "text-[#FF5A63]",
                },
              ].map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.label
                    }
                    className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3"
                  >
                    <div className="text-[14px] text-white/42">
                      {
                        item.label
                      }
                    </div>

                    <div
                      className={[
                        "mt-2 font-mono text-[17px] font-semibold",

                        item.color,
                      ].join(" ")}
                    >
                      {
                        item.value
                      }
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#07090d]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <div className="text-[16px] font-semibold text-[#F6B23C]">
                  Defence System Status
                </div>

                <div className="mt-1 text-[14px] text-white/46">
                  Four-sector autonomous response simulation
                </div>
              </div>

              <Cpu
                size={18}
                className="text-[#5AA9FF]"
              />
            </div>

            <div className="p-4">
              <StateRow
                label="Protected Sectors"
                value="4"
              />

              <StateRow
                label="Interceptor Fleet"
                value={`${snapshot.interceptors.length} UAV`}
                valueClass="text-[#00D9FF]"
              />

              <StateRow
                label="Automatic Dispatch"
                value={
                  snapshot.autoDefenseEnabled
                    ? "ENABLED"
                    : "DISABLED"
                }
                valueClass="text-[#59D99A]"
              />

              <StateRow
                label="Predictor"
                value="CV + CTRV + residual"
                valueClass="text-[#A7FF4F]"
              />

              <StateRow
                label="Validated Samples"
                value={`${snapshot.performance.validationSamples}`}
              />

              <StateRow
                label="Safety"
                value="Non-contact separation"
                valueClass="text-[#59D99A]"
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