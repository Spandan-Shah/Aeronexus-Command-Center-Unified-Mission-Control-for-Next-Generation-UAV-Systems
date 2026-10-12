import {
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Car,
  CheckCircle2,
  CloudFog,
  Flame,
  Gauge,
  Loader2,
  PlayCircle,
  ScanSearch,
  ShieldAlert,
  Target,
  UserRound,
  Waves,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import type {
  CameraVideoSource,
} from "./VideoSourceLibrary";

/* =========================================================
   Public Types
   ========================================================= */

export type CameraDetectionBox = {
  label: string;

  display_label: string;

  confidence: number;

  category:
    | "person"
    | "vehicle"
    | "threat"
    | "object";

  frame_index?: number;

  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
};

export type CameraOpenCvAnalysis = {
  source_id: string;
  title: string;
  category: string;
  video_path?: string;
  analyzed_at: string;

  model?: {
    provider: string;
    model: string;
    mode: string;
    confidence_threshold: number;
    opencv_fire_mode?: boolean;
    yolo_available?: boolean;
  };

  frame?: {
    width: number;
    height: number;
    best_frame_index: number;
  };

  frames: {
    source_fps: number;
    total_video_frames: number;
    sampled_frames: number;
    sample_every: number;
  };

  metrics: {
    brightness: number;
    contrast: number;
    edge_density: number;
    detection_count: number;
    best_frame_detection_count: number;
    fire_detection_count?: number;
    smoke_detection_count?: number;
    flood_detection_count?: number;
  };

  fire_analysis?: {
    mode: string;
    max_fire_pixels_pct: number;
    avg_fire_pixels_pct: number;
    max_smoke_pixels_pct: number;
    avg_smoke_pixels_pct: number;
    best_frame_fire_pixels_pct: number;
    best_frame_smoke_pixels_pct: number;
  };

  counts?: {
    person: number;
    vehicle: number;
    fire: number;
    smoke: number;
    flood: number;
    threat: number;
    object: number;
  };

  detections: {
    person: boolean;
    vehicle: boolean;
    fire: boolean;
    flame?: boolean;
    smoke: boolean;
    flood: boolean;
    confidence: number;
    boxes:
      CameraDetectionBox[];
  };

  risk:
    | "low"
    | "medium"
    | "high"
    | "critical";

  events: {
    type: string;
    severity: string;
    confidence: number;
    title: string;
    message: string;
    created_at: string;
  }[];
};

type AnalyzeResponse = {
  ok: boolean;

  analysis?:
    CameraOpenCvAnalysis;

  error?: string;
};

type AnalysisMode =
  | "full"
  | "control"
  | "details";

type OpenCvAnalysisPanelProps = {
  selectedVideo:
    CameraVideoSource;

  analysis:
    CameraOpenCvAnalysis | null;

  onAnalysisComplete: (
    analysis:
      CameraOpenCvAnalysis,
  ) => void;

  mode?: AnalysisMode;
};

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

/* =========================================================
   Backend
   ========================================================= */

const API_BASE_URL =
  "http://127.0.0.1:8000";

/* =========================================================
   Detection Labels
   ========================================================= */

const fireLabels =
  new Set([
    "fire",
    "flame",
    "wildfire",
    "blaze",
    "burning",
    "fire-color-signature",
    "flame-signature",
  ]);

const smokeLabels =
  new Set([
    "smoke",
    "haze",
    "smoke-signature",
    "smoke-haze-signature",
  ]);

const floodLabels =
  new Set([
    "flood",
    "water-flood",
    "floodwater",
    "water",
  ]);

/* =========================================================
   Tone System
   ========================================================= */

const toneClass:
  Record<
    Tone,
    {
      text: string;
      border: string;
      bg: string;
      dot: string;
    }
  > = {
  nominal: {
    text:
      "text-[#59D99A]",

    border:
      "border-[rgba(89,217,154,0.25)]",

    bg:
      "bg-[rgba(89,217,154,0.05)]",

    dot:
      "bg-[#59D99A]",
  },

  caution: {
    text:
      "text-[#F6B23C]",

    border:
      "border-[rgba(246,178,60,0.28)]",

    bg:
      "bg-[rgba(246,178,60,0.055)]",

    dot:
      "bg-[#F6B23C]",
  },

  critical: {
    text:
      "text-[#FF5A63]",

    border:
      "border-[rgba(255,90,99,0.28)]",

    bg:
      "bg-[rgba(255,90,99,0.055)]",

    dot:
      "bg-[#FF5A63]",
  },

  info: {
    text:
      "text-[#5AA9FF]",

    border:
      "border-[rgba(90,169,255,0.26)]",

    bg:
      "bg-[rgba(90,169,255,0.055)]",

    dot:
      "bg-[#5AA9FF]",
  },

  muted: {
    text:
      "text-white/34",

    border:
      "border-white/[0.07]",

    bg:
      "bg-[#05060d]",

    dot:
      "bg-white/24",
  },
};

/* =========================================================
   Detection Helpers
   ========================================================= */

function normalizeLabel(
  label: string,
) {
  return label
    .trim()
    .toLowerCase();
}

function isFireLabel(
  label: string,
) {
  return fireLabels.has(
    normalizeLabel(
      label,
    ),
  );
}

function isSmokeLabel(
  label: string,
) {
  return smokeLabels.has(
    normalizeLabel(
      label,
    ),
  );
}

function isFloodLabel(
  label: string,
) {
  return floodLabels.has(
    normalizeLabel(
      label,
    ),
  );
}

/* =========================================================
   Tone Helpers
   ========================================================= */

function getRiskTone(
  risk?: string,
): Tone {
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

  if (
    risk === "low"
  ) {
    return "nominal";
  }

  return "muted";
}

function getEventTone(
  severity: string,
): Tone {
  const value =
    severity.toLowerCase();

  if (
    value ===
    "critical"
  ) {
    return "critical";
  }

  if (
    value ===
      "high" ||
    value ===
      "medium" ||
    value ===
      "warning"
  ) {
    return "caution";
  }

  if (
    value ===
    "info"
  ) {
    return "info";
  }

  return "nominal";
}

/* =========================================================
   Metric Box
   ========================================================= */

function MetricBox({
  label,
  value,
  suffix = "",
  icon: Icon,
  tone = "info",
  compact = false,
}: {
  label: string;

  value:
    | string
    | number;

  suffix?: string;

  icon:
    LucideIcon;

  tone?: Tone;

  compact?: boolean;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "rounded-[4px] border bg-[#05060d]",

        compact
          ? "p-2"
          : "p-3",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.055em] text-white/30">
        <Icon
          size={10}
          className={
            style.text
          }
        />

        {label}
      </div>

      <div
        className={[
          "mt-1 font-mono font-semibold",

          compact
            ? "text-[12px]"
            : "text-[15px]",

          style.text,
        ].join(" ")}
      >
        {value}
        {suffix}
      </div>
    </div>
  );
}

/* =========================================================
   Detection State
   ========================================================= */

function DetectionStatusCard({
  icon: Icon,
  label,
  active,
  activeText,
  clearText =
    "CLEAR",
  tone,
}: {
  icon:
    LucideIcon;

  label: string;

  active: boolean;

  activeText: string;

  clearText?: string;

  tone: Tone;
}) {
  const style =
    active
      ? toneClass[
          tone
        ]
      : toneClass.muted;

  return (
    <div
      className={[
        "rounded-[5px] border bg-[#05060d] p-3",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon
          size={14}
          className={
            style.text
          }
        />

        <span
          className={[
            "h-1.5 w-1.5 rounded-full",

            active
              ? toneClass[
                  tone
                ].dot
              : toneClass
                  .muted
                  .dot,
          ].join(" ")}
        />
      </div>

      <div className="mt-2 font-mono text-[9px] font-semibold uppercase text-white/64">
        {label}
      </div>

      <div
        className={[
          "mt-0.5 font-mono text-[8px] font-semibold uppercase",

          style.text,
        ].join(" ")}
      >
        {active
          ? activeText
          : clearText}
      </div>
    </div>
  );
}

/* =========================================================
   Fire / Disaster Analysis
   ========================================================= */

function FireModePanel({
  analysis,
}: {
  analysis:
    CameraOpenCvAnalysis;
}) {
  const fireModeActive =
    Boolean(
      analysis
        .detections
        .fire,
    ) ||
    Boolean(
      analysis
        .detections
        .flame,
    );

  const smokeModeActive =
    Boolean(
      analysis
        .detections
        .smoke,
    );

  const floodModeActive =
    Boolean(
      analysis
        .detections
        .flood,
    );

  const maxFire =
    analysis
      .fire_analysis
      ?.max_fire_pixels_pct ??
    0;

  const maxSmoke =
    analysis
      .fire_analysis
      ?.max_smoke_pixels_pct ??
    0;

  const bestFire =
    analysis
      .fire_analysis
      ?.best_frame_fire_pixels_pct ??
    0;

  const bestSmoke =
    analysis
      .fire_analysis
      ?.best_frame_smoke_pixels_pct ??
    0;

  return (
    <div className="rounded-[5px] border border-[rgba(255,90,99,0.2)] bg-[rgba(255,90,99,0.025)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#FF5A63]">
          <Flame
            size={12}
          />

          Fire / disaster signatures
        </div>

        <span
          className={[
            "font-mono text-[8px] font-semibold uppercase",

            fireModeActive ||
            smokeModeActive
              ? "text-[#FF5A63]"
              : "text-[#59D99A]",
          ].join(" ")}
        >
          {fireModeActive ||
          smokeModeActive
            ? "Signal Found"
            : "Clear"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricBox
          icon={
            Flame
          }
          label="Fire Pixels"
          value={
            maxFire.toFixed(
              2,
            )
          }
          suffix="%"
          tone={
            fireModeActive
              ? "critical"
              : "muted"
          }
        />

        <MetricBox
          icon={
            CloudFog
          }
          label="Smoke Pixels"
          value={
            maxSmoke.toFixed(
              2,
            )
          }
          suffix="%"
          tone={
            smokeModeActive
              ? "caution"
              : "muted"
          }
        />

        <MetricBox
          icon={
            Gauge
          }
          label="Best Fire"
          value={
            bestFire.toFixed(
              2,
            )
          }
          suffix="%"
          tone={
            bestFire >
            0
              ? "critical"
              : "muted"
          }
        />

        <MetricBox
          icon={
            CloudFog
          }
          label="Best Smoke"
          value={
            bestSmoke.toFixed(
              2,
            )
          }
          suffix="%"
          tone={
            bestSmoke >
            0
              ? "caution"
              : "muted"
          }
        />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <DetectionStatusCard
          icon={
            Flame
          }
          label="Fire"
          active={
            fireModeActive
          }
          activeText="Detected"
          tone="critical"
        />

        <DetectionStatusCard
          icon={
            CloudFog
          }
          label="Smoke"
          active={
            smokeModeActive
          }
          activeText="Detected"
          tone="caution"
        />

        <DetectionStatusCard
          icon={
            Waves
          }
          label="Flood"
          active={
            floodModeActive
          }
          activeText="Detected"
          tone="info"
        />
      </div>
    </div>
  );
}

/* =========================================================
   Detection Box List
   ========================================================= */

function DetectionBoxList({
  analysis,
}: {
  analysis:
    CameraOpenCvAnalysis;
}) {
  const boxes =
    analysis
      .detections
      .boxes;

  return (
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#F6B23C]">
          <Target
            size={12}
          />

          Detection Boxes
        </div>

        <span className="font-mono text-[8px] uppercase text-white/28">
          Best frame
        </span>
      </div>

      <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {boxes.length ===
        0 ? (
          <div className="rounded-[4px] border border-white/[0.07] px-3 py-2 text-[10px] text-white/34">
            No objects detected above the current confidence threshold.
          </div>
        ) : null}

        {boxes.map(
          (
            box,
            index,
          ) => {
            const fireLike =
              isFireLabel(
                box.label,
              );

            const smokeLike =
              isSmokeLabel(
                box.label,
              );

            const floodLike =
              isFloodLabel(
                box.label,
              );

            const tone:
              Tone =
              fireLike
                ? "critical"
                : smokeLike
                  ? "caution"
                  : floodLike
                    ? "info"
                    : box.category ===
                        "person"
                      ? "info"
                      : box.category ===
                          "vehicle"
                        ? "caution"
                        : box.category ===
                            "threat"
                          ? "critical"
                          : "muted";

            const style =
              toneClass[
                tone
              ];

            return (
              <div
                key={`${box.label}-${box.frame_index ?? "frame"}-${index}`}
                className={[
                  "flex items-center justify-between gap-3 rounded-[4px] border px-3 py-2",

                  style.border,
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-[9px] font-semibold uppercase text-white/66">
                    {
                      box.display_label
                    }
                  </div>

                  <div className="mt-0.5 font-mono text-[8px] text-white/28">
                    {floodLike
                      ? "flood"
                      : box.category}
                    {" "}
                    · frame{" "}
                    {box.frame_index ??
                      analysis
                        .frame
                        ?.best_frame_index ??
                      "-"}
                  </div>
                </div>

                <span
                  className={[
                    "shrink-0 font-mono text-[10px] font-semibold",

                    style.text,
                  ].join(" ")}
                >
                  {Math.round(
                    box.confidence *
                      100,
                  )}
                  %
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Model Events
   ========================================================= */

function ModelEvents({
  analysis,
}: {
  analysis:
    CameraOpenCvAnalysis;
}) {
  return (
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
      <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#F6B23C]">
        <Activity
          size={12}
        />

        Model Events
      </div>

      <div className="mt-3 space-y-1.5">
        {analysis.events.length ===
        0 ? (
          <div className="rounded-[4px] border border-white/[0.07] px-3 py-2 text-[10px] text-white/34">
            No important model events.
          </div>
        ) : null}

        {analysis.events.map(
          (
            event,
          ) => {
            const style =
              toneClass[
                getEventTone(
                  event.severity,
                )
              ];

            return (
              <div
                key={`${event.type}-${event.created_at}`}
                className={[
                  "rounded-[4px] border px-3 py-2",
                  style.border,
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-medium text-white/72">
                    {
                      event.title
                    }
                  </div>

                  <span
                    className={[
                      "font-mono text-[8px] font-semibold uppercase",
                      style.text,
                    ].join(" ")}
                  >
                    {
                      event.severity
                    }
                  </span>
                </div>

                <div className="mt-1 text-[9px] leading-[1.45] text-white/32">
                  {
                    event.message
                  }
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

/* =========================================================
   OpenCV Analysis Panel
   ========================================================= */

export function OpenCvAnalysisPanel({
  selectedVideo,
  analysis,
  onAnalysisComplete,
  mode = "full",
}: OpenCvAnalysisPanelProps) {
  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const canAnalyze =
    Boolean(
      selectedVideo.src,
    );

  /* =======================================================
     Analyze
     ======================================================= */

  async function analyzeSelectedVideo() {
    if (
      !canAnalyze
    ) {
      setError(
        "Select a real MP4 video source first.",
      );

      return;
    }

    try {
      setLoading(
        true,
      );

      setError(
        null,
      );

      const response =
        await fetch(
          `${API_BASE_URL}/api/camera-ai/analyze`,
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
                  source_id:
                    selectedVideo.id,

                  sample_every:
                    5,

                  max_frames:
                    160,

                  confidence_threshold:
                    0.25,
                },
              ),
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `Camera analytics API failed with status ${response.status}`,
        );
      }

      const data =
        (
          await response.json()
        ) as AnalyzeResponse;

      if (
        !data.ok ||
        !data.analysis
      ) {
        throw new Error(
          data.error ??
            "Camera analysis failed",
        );
      }

      onAnalysisComplete(
        data.analysis,
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Unable to analyze video",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  /* =======================================================
     Derived Analysis
     ======================================================= */

  const confidence =
    Math.round(
      (
        analysis
          ?.detections
          .confidence ??
        0
      ) *
        100,
    );

  const riskTone =
    getRiskTone(
      analysis?.risk,
    );

  const riskStyle =
    toneClass[
      riskTone
    ];

  const personCount =
    analysis?.counts
      ?.person ??
    analysis
      ?.detections
      .boxes
      .filter(
        (
          box,
        ) =>
          box.category ===
          "person",
      )
      .length ??
    0;

  const vehicleCount =
    analysis?.counts
      ?.vehicle ??
    analysis
      ?.detections
      .boxes
      .filter(
        (
          box,
        ) =>
          box.category ===
          "vehicle",
      )
      .length ??
    0;

  const fireCount =
    analysis?.counts
      ?.fire ??
    analysis
      ?.detections
      .boxes
      .filter(
        (
          box,
        ) =>
          isFireLabel(
            box.label,
          ),
      )
      .length ??
    0;

  const smokeCount =
    analysis?.counts
      ?.smoke ??
    analysis
      ?.detections
      .boxes
      .filter(
        (
          box,
        ) =>
          isSmokeLabel(
            box.label,
          ),
      )
      .length ??
    0;

  const floodCount =
    analysis?.counts
      ?.flood ??
    analysis
      ?.detections
      .boxes
      .filter(
        (
          box,
        ) =>
          isFloodLabel(
            box.label,
          ),
      )
      .length ??
    0;

  /* =======================================================
     Compact First-Viewport Controls
     ======================================================= */

  const controlContent = (
    <div className="grid gap-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-medium text-white/64">
            {
              selectedVideo.title
            }
          </div>

          <div className="mt-0.5 font-mono text-[8px] uppercase text-white/28">
            YOLO + OpenCV
          </div>
        </div>

        <BrainCircuit
          size={14}
          className="shrink-0 text-[#F6B23C]"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          void analyzeSelectedVideo()
        }
        disabled={
          loading ||
          !canAnalyze
        }
        className="flex h-[34px] w-full items-center justify-center gap-1.5 rounded-[4px] border border-[rgba(246,178,60,0.3)] bg-[rgba(246,178,60,0.055)] font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-[#F6B23C] transition hover:bg-[rgba(246,178,60,0.1)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2
              size={11}
              className="animate-spin"
            />

            Analysing
          </>
        ) : (
          <>
            <PlayCircle
              size={11}
            />

            Analyze Feed
          </>
        )}
      </button>

      {error ? (
        <div className="flex items-start gap-1.5 rounded-[4px] border border-[rgba(255,90,99,0.26)] bg-[rgba(255,90,99,0.045)] px-2 py-1.5 text-[8px] leading-[1.4] text-[#FF5A63]">
          <AlertTriangle
            size={10}
            className="mt-0.5 shrink-0"
          />

          {error}
        </div>
      ) : null}

      {analysis ? (
        <>
          <div
            className={[
              "flex items-center justify-between rounded-[4px] border px-2.5 py-2",
              riskStyle.border,
              riskStyle.bg,
            ].join(" ")}
          >
            <div>
              <div className="font-mono text-[8px] uppercase text-white/30">
                Model Risk
              </div>

              <div
                className={[
                  "mt-0.5 font-mono text-[11px] font-semibold uppercase",
                  riskStyle.text,
                ].join(" ")}
              >
                {
                  analysis.risk
                }
              </div>
            </div>

            {analysis.risk ===
            "low" ? (
              <CheckCircle2
                size={16}
                className="text-[#59D99A]"
              />
            ) : (
              <ShieldAlert
                size={16}
                className={
                  riskStyle.text
                }
              />
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <MetricBox
              icon={
                Gauge
              }
              label="Conf."
              value={
                confidence
              }
              suffix="%"
              tone="info"
              compact
            />

            <MetricBox
              icon={
                Target
              }
              label="Detect"
              value={
                analysis
                  .metrics
                  .detection_count
              }
              tone="info"
              compact
            />

            <MetricBox
              icon={
                Flame
              }
              label="Fire"
              value={
                fireCount
              }
              tone={
                fireCount >
                0
                  ? "critical"
                  : "muted"
              }
              compact
            />

            <MetricBox
              icon={
                CloudFog
              }
              label="Smoke"
              value={
                smokeCount
              }
              tone={
                smokeCount >
                0
                  ? "caution"
                  : "muted"
              }
              compact
            />
          </div>
        </>
      ) : (
        <div className="rounded-[4px] border border-white/[0.07] bg-[#05060d] px-2.5 py-2 text-[9px] leading-[1.45] text-white/30">
          Run frame analysis to generate visual intelligence.
        </div>
      )}
    </div>
  );

  /* =======================================================
     Full Detailed Analysis
     ======================================================= */

  const detailsContent =
    analysis ? (
      <div className="grid gap-3">
        <div
          className={[
            "flex items-center justify-between rounded-[5px] border p-3",
            riskStyle.border,
            riskStyle.bg,
          ].join(" ")}
        >
          <div>
            <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.055em] text-white/30">
              Model Risk
            </div>

            <div
              className={[
                "mt-1 font-mono text-[17px] font-semibold uppercase",
                riskStyle.text,
              ].join(" ")}
            >
              {
                analysis.risk
              }
            </div>
          </div>

          {analysis.risk ===
          "low" ? (
            <CheckCircle2
              size={21}
              className="text-[#59D99A]"
            />
          ) : (
            <ShieldAlert
              size={21}
              className={
                riskStyle.text
              }
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <MetricBox
            icon={
              Gauge
            }
            label="Confidence"
            value={
              confidence
            }
            suffix="%"
            tone="info"
          />

          <MetricBox
            icon={
              Target
            }
            label="Detections"
            value={
              analysis
                .metrics
                .detection_count
            }
            tone="info"
          />

          <MetricBox
            icon={
              UserRound
            }
            label="Persons"
            value={
              personCount
            }
            tone={
              personCount >
              0
                ? "info"
                : "muted"
            }
          />

          <MetricBox
            icon={
              Car
            }
            label="Vehicles"
            value={
              vehicleCount
            }
            tone={
              vehicleCount >
              0
                ? "caution"
                : "muted"
            }
          />

          <MetricBox
            icon={
              ScanSearch
            }
            label="Frames"
            value={
              analysis
                .frames
                .sampled_frames
            }
            tone="nominal"
          />

          <MetricBox
            icon={
              Flame
            }
            label="Fire"
            value={
              fireCount
            }
            tone={
              fireCount >
              0
                ? "critical"
                : "muted"
            }
          />

          <MetricBox
            icon={
              CloudFog
            }
            label="Smoke"
            value={
              smokeCount
            }
            tone={
              smokeCount >
              0
                ? "caution"
                : "muted"
            }
          />

          <MetricBox
            icon={
              Waves
            }
            label="Flood"
            value={
              floodCount
            }
            tone={
              floodCount >
              0
                ? "info"
                : "muted"
            }
          />

          <MetricBox
            icon={
              Activity
            }
            label="Best Frame"
            value={
              analysis
                .frame
                ?.best_frame_index ??
              "-"
            }
            tone="nominal"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <DetectionStatusCard
            icon={
              UserRound
            }
            label="Person"
            active={
              analysis
                .detections
                .person
            }
            activeText="Detected"
            tone="info"
          />

          <DetectionStatusCard
            icon={
              Car
            }
            label="Vehicle"
            active={
              analysis
                .detections
                .vehicle
            }
            activeText="Detected"
            tone="caution"
          />

          <DetectionStatusCard
            icon={
              Flame
            }
            label="Fire"
            active={Boolean(
              analysis
                .detections
                .fire ||
                analysis
                  .detections
                  .flame,
            )}
            activeText="Detected"
            tone="critical"
          />

          <DetectionStatusCard
            icon={
              CloudFog
            }
            label="Smoke"
            active={
              analysis
                .detections
                .smoke
            }
            activeText="Detected"
            tone="caution"
          />

          <DetectionStatusCard
            icon={
              Waves
            }
            label="Flood"
            active={
              analysis
                .detections
                .flood
            }
            activeText="Detected"
            tone="info"
          />
        </div>

        <FireModePanel
          analysis={
            analysis
          }
        />

        <DetectionBoxList
          analysis={
            analysis
          }
        />

        <ModelEvents
          analysis={
            analysis
          }
        />
      </div>
    ) : (
      <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] px-3 py-4 text-[10px] leading-[1.5] text-white/34">
        No detailed analysis is available yet. Run analysis from the live
        intelligence panel above.
      </div>
    );

  /* =======================================================
     Render Mode
     ======================================================= */

  if (
    mode ===
    "control"
  ) {
    return controlContent;
  }

  if (
    mode ===
    "details"
  ) {
    return detailsContent;
  }

  return (
    <div className="grid gap-4">
      {controlContent}

      {detailsContent}
    </div>
  );
}