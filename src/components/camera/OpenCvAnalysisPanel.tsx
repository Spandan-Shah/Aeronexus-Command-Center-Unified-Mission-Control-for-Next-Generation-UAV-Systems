import { useState } from "react";

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

import type { LucideIcon } from "lucide-react";

import type { CameraVideoSource } from "./VideoSourceLibrary";

export type CameraDetectionBox = {
  label: string;
  display_label: string;
  confidence: number;
  category: "person" | "vehicle" | "threat" | "object";
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
    boxes: CameraDetectionBox[];
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
  analysis?: CameraOpenCvAnalysis;
  error?: string;
};

type OpenCvAnalysisPanelProps = {
  selectedVideo: CameraVideoSource;
  analysis: CameraOpenCvAnalysis | null;

  onAnalysisComplete: (
    analysis: CameraOpenCvAnalysis,
  ) => void;
};

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

const API_BASE_URL =
  "http://127.0.0.1:8000";

/* =========================================================
   Detection Label Groups
   ========================================================= */

const fireLabels = new Set([
  "fire",
  "flame",
  "wildfire",
  "blaze",
  "burning",
  "fire-color-signature",
  "flame-signature",
]);

const smokeLabels = new Set([
  "smoke",
  "haze",
  "smoke-signature",
  "smoke-haze-signature",
]);

const floodLabels = new Set([
  "flood",
  "water-flood",
  "floodwater",
  "water",
]);

/* =========================================================
   Tone System
   ========================================================= */

const toneClass = {
  nominal: {
    text: "text-(--nominal)",
    border:
      "border-[rgba(73,229,143,0.28)]",
    bg:
      "bg-[rgba(73,229,143,0.08)]",
    dot: "bg-(--nominal)",
  },

  caution: {
    text: "text-(--primary)",
    border:
      "border-[rgba(246,178,60,0.34)]",
    bg:
      "bg-[rgba(246,178,60,0.08)]",
    dot: "bg-(--primary)",
  },

  critical: {
    text: "text-(--critical)",
    border:
      "border-[rgba(255,77,77,0.36)]",
    bg:
      "bg-[rgba(255,77,77,0.08)]",
    dot: "bg-(--critical)",
  },

  info: {
    text: "text-(--info)",
    border:
      "border-[rgba(90,169,255,0.3)]",
    bg:
      "bg-[rgba(90,169,255,0.08)]",
    dot: "bg-(--info)",
  },

  muted: {
    text: "text-(--muted)",
    border: "border-[#1d2533]",
    bg: "bg-[#070a10]",
    dot: "bg-(--muted)",
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
    value === "critical"
  ) {
    return "critical";
  }

  if (
    value === "high" ||
    value === "medium" ||
    value === "warning"
  ) {
    return "caution";
  }

  if (
    value === "info"
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
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const toneStyle =
    toneClass[
      tone
    ];

  return (
    <div
      className={`rounded-lg border bg-[#07111f] p-3 ${toneStyle.border}`}
    >
      <div className="flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        <Icon
          size={12}
          className={
            toneStyle.text
          }
        />

        {label}
      </div>

      <div
        className={`mt-2 font-mono text-[16px] font-bold ${toneStyle.text}`}
      >
        {value}
        {suffix}
      </div>
    </div>
  );
}

/* =========================================================
   Detection Status
   ========================================================= */

function DetectionStatusCard({
  icon: Icon,
  label,
  active,
  activeText,
  clearText = "CLEAR",
  tone,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  activeText: string;
  clearText?: string;
  tone: Tone;
}) {
  const toneStyle =
    active
      ? toneClass[
          tone
        ]
      : toneClass.muted;

  return (
    <div
      className={`rounded-lg border bg-[#07111f] p-3 ${toneStyle.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon
          size={17}
          className={
            toneStyle.text
          }
        />

        <span
          className={`h-2 w-2 rounded-full ${
            active
              ? toneClass[
                  tone
                ].dot
              : toneClass
                  .muted
                  .dot
          }`}
        />
      </div>

      <div className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--foreground)">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-[9px] font-bold uppercase ${toneStyle.text}`}
      >
        {active
          ? activeText
          : clearText}
      </div>
    </div>
  );
}

/* =========================================================
   OpenCV Disaster Signature Panel
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
    <div className="rounded-xl border border-[rgba(255,77,77,0.34)] bg-[rgba(255,77,77,0.045)] p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--critical)">
            <Flame
              size={14}
            />

            OpenCV Fire / Flame Mode
          </div>

          <h3 className="mt-1 text-[15px] font-semibold text-(--foreground)">
            Disaster signature analysis
          </h3>

          <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
            Uses YOLO labels plus OpenCV HSV colour masks for fire/flame signatures and smoke-like haze patterns.
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] ${
            fireModeActive ||
            smokeModeActive
              ? "border-[rgba(255,77,77,0.36)] bg-[rgba(255,77,77,0.08)] text-(--critical)"
              : "border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] text-(--nominal)"
          }`}
        >
          {fireModeActive ||
          smokeModeActive
            ? "Signal Found"
            : "No Fire Signal"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricBox
          icon={Flame}
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
          icon={CloudFog}
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
          icon={Gauge}
          label="Best Fire"
          value={
            bestFire.toFixed(
              2,
            )
          }
          suffix="%"
          tone={
            bestFire > 0
              ? "critical"
              : "muted"
          }
        />

        <MetricBox
          icon={CloudFog}
          label="Best Smoke"
          value={
            bestSmoke.toFixed(
              2,
            )
          }
          suffix="%"
          tone={
            bestSmoke > 0
              ? "caution"
              : "muted"
          }
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DetectionStatusCard
          icon={Flame}
          label="Fire / Flame"
          active={
            fireModeActive
          }
          activeText="DETECTED"
          tone="critical"
        />

        <DetectionStatusCard
          icon={CloudFog}
          label="Smoke / Haze"
          active={
            smokeModeActive
          }
          activeText="DETECTED"
          tone="caution"
        />

        <DetectionStatusCard
          icon={Waves}
          label="Flood / Water"
          active={
            floodModeActive
          }
          activeText="DETECTED"
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
    <div className="rounded-xl border border-[#1d2533] bg-[#07111f] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--primary)">
          <Target
            size={14}
          />

          Detection Boxes
        </div>

        <span className="rounded-full border border-[#243147] bg-black px-2.5 py-1 font-mono text-[8px] font-bold uppercase text-(--muted)">
          Best frame
        </span>
      </div>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {boxes.length ===
          0 && (
          <div className="rounded border border-[#1d2533] bg-black p-3 text-[12px] text-(--muted)">
            No objects detected above confidence threshold.
          </div>
        )}

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

            /**
             * This now uses the flood helper, fixing TS6133
             * while preserving flood/water classification.
             */
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

            const toneStyle =
              toneClass[
                tone
              ];

            return (
              <div
                key={`${box.label}-${box.frame_index ?? "frame"}-${index}`}
                className={`rounded-lg border bg-black p-3 ${toneStyle.border}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-(--foreground)">
                    {
                      box.display_label
                    }
                  </span>

                  <span
                    className={`font-mono text-[10px] font-bold ${toneStyle.text}`}
                  >
                    {Math.round(
                      box.confidence *
                        100,
                    )}
                    %
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded border px-2 py-1 font-mono text-[8px] font-bold uppercase ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}
                  >
                    {
                      floodLike
                        ? "flood"
                        : box.category
                    }
                  </span>

                  <span className="rounded border border-[#1d2533] px-2 py-1 font-mono text-[8px] font-bold uppercase text-(--muted)">
                    Frame{" "}
                    {box.frame_index ??
                      analysis
                        .frame
                        ?.best_frame_index ??
                      "-"}
                  </span>
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
   Model Events
   ========================================================= */

function ModelEvents({
  analysis,
}: {
  analysis:
    CameraOpenCvAnalysis;
}) {
  return (
    <div className="rounded-xl border border-[#1d2533] bg-[#07111f] p-4">
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--primary)">
        <Activity
          size={14}
        />

        Model Events
      </div>

      <div className="mt-3 space-y-2">
        {analysis
          .events
          .length ===
          0 && (
          <div className="rounded border border-[#1d2533] bg-black p-3 text-[12px] text-(--muted)">
            No important detection event found.
          </div>
        )}

        {analysis.events.map(
          (
            event,
          ) => {
            const tone =
              toneClass[
                getEventTone(
                  event.severity,
                )
              ];

            return (
              <div
                key={`${event.type}-${event.created_at}`}
                className={`rounded-lg border bg-black p-3 ${tone.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-mono text-[10px] font-bold uppercase text-(--foreground)">
                    {
                      event.title
                    }
                  </div>

                  <span
                    className={`font-mono text-[8px] font-bold uppercase ${tone.text}`}
                  >
                    {
                      event.severity
                    }
                  </span>
                </div>

                <div className="mt-2 text-[12px] leading-relaxed text-(--muted)">
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
   Main Component
   ========================================================= */

export function OpenCvAnalysisPanel({
  selectedVideo,
  analysis,
  onAnalysisComplete,
}: OpenCvAnalysisPanelProps) {
  const [
    loading,
    setLoading,
  ] =
    useState(false);

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
              JSON.stringify({
                source_id:
                  selectedVideo.id,

                sample_every:
                  5,

                max_frames:
                  160,

                confidence_threshold:
                  0.25,
              }),
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
        (await response.json()) as AnalyzeResponse;

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
    analysis
      ?.counts
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
    analysis
      ?.counts
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
    analysis
      ?.counts
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
    analysis
      ?.counts
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
    analysis
      ?.counts
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
     UI
     ======================================================= */

  return (
    <div className="grid gap-4">
      {/* ===================================================
          Analyzer Header
          =================================================== */}

      <div className="rounded-xl border border-[#1d2533] bg-[#07111f] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--primary)">
              YOLO + OpenCV Camera Analytics
            </div>

            <h3 className="mt-1 text-[15px] font-semibold text-(--foreground)">
              {
                selectedVideo.title
              }
            </h3>

            <p className="mt-1 break-all text-[11px] leading-relaxed text-(--muted)">
              {selectedVideo.src ??
                "Simulated HUD feed"}
            </p>
          </div>

          <BrainCircuit
            size={20}
            className="shrink-0 text-(--primary)"
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--primary) transition hover:bg-[rgba(246,178,60,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2
                size={14}
                className="animate-spin"
              />

              Running YOLO + OpenCV Analysis
            </>
          ) : (
            <>
              <PlayCircle
                size={14}
              />

              Analyze with YOLO + Fire Mode
            </>
          )}
        </button>
      </div>

      {/* ===================================================
          Error
          =================================================== */}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-(--critical) bg-[rgba(255,77,77,0.08)] p-3 text-[12px] leading-relaxed text-(--critical)">
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0"
          />

          {error}
        </div>
      ) : null}

      {/* ===================================================
          Empty State
          =================================================== */}

      {!analysis ? (
        <div className="rounded-xl border border-[#1d2533] bg-[#07111f] p-4 text-[12px] leading-relaxed text-(--muted)">
          Select a real video source and click analysis. The backend will read frames through OpenCV, run YOLO object detection, and run the OpenCV fire/flame colour-signature mode.
        </div>
      ) : null}

      {/* ===================================================
          Analysis Result
          =================================================== */}

      {analysis ? (
        <>
          {/* Risk */}

          <div
            className={`rounded-xl border p-4 ${riskStyle.border} ${riskStyle.bg}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
                  Model Risk
                </div>

                <div
                  className={`mt-1 font-mono text-[24px] font-bold uppercase ${riskStyle.text}`}
                >
                  {
                    analysis.risk
                  }
                </div>
              </div>

              {analysis.risk ===
              "low" ? (
                <CheckCircle2
                  size={28}
                  className="text-(--nominal)"
                />
              ) : (
                <ShieldAlert
                  size={28}
                  className={
                    riskStyle.text
                  }
                />
              )}
            </div>
          </div>

          {/* Metrics */}

          <div className="grid grid-cols-2 gap-3">
            <MetricBox
              icon={Gauge}
              label="Confidence"
              value={
                confidence
              }
              suffix="%"
              tone="info"
            />

            <MetricBox
              icon={Target}
              label="Detections"
              value={
                analysis
                  .metrics
                  .detection_count
              }
              tone="info"
            />

            <MetricBox
              icon={UserRound}
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
              icon={Car}
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
              icon={Flame}
              label="Fire / Flame"
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
              icon={CloudFog}
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
              icon={Waves}
              label="Flood / Water"
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
              icon={ScanSearch}
              label="Frames"
              value={
                analysis
                  .frames
                  .sampled_frames
              }
              tone="nominal"
            />

            <MetricBox
              icon={Activity}
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

          {/* Detection State */}

          <div className="grid grid-cols-2 gap-3">
            <DetectionStatusCard
              icon={UserRound}
              label="Person"
              active={
                analysis
                  .detections
                  .person
              }
              activeText="DETECTED"
              tone="info"
            />

            <DetectionStatusCard
              icon={Car}
              label="Vehicle"
              active={
                analysis
                  .detections
                  .vehicle
              }
              activeText="DETECTED"
              tone="caution"
            />

            <DetectionStatusCard
              icon={Flame}
              label="Fire / Flame"
              active={Boolean(
                analysis
                  .detections
                  .fire ||
                  analysis
                    .detections
                    .flame,
              )}
              activeText="DETECTED"
              tone="critical"
            />

            <DetectionStatusCard
              icon={CloudFog}
              label="Smoke"
              active={
                analysis
                  .detections
                  .smoke
              }
              activeText="DETECTED"
              tone="caution"
            />

            <DetectionStatusCard
              icon={Waves}
              label="Flood / Water"
              active={
                analysis
                  .detections
                  .flood
              }
              activeText="DETECTED"
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
        </>
      ) : null}
    </div>
  );
}