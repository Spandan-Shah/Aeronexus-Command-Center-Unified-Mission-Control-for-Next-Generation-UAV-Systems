import {
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  BellRing,
  BrainCircuit,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  CloudFog,
  Cpu,
  Eye,
  Film,
  Flame,
  Gauge,
  Loader2,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Video,
  Volume2,
  Waves,
  X,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  AiAnalyticsPanel,
} from "../components/camera/AiAnalyticsPanel";

import {
  AiRiskMatrix,
} from "../components/camera/AiRiskMatrix";

import {
  AiVideoPanel,
} from "../components/camera/AiVideoPanel";

import {
  CameraControls,
} from "../components/camera/CameraControls";

import {
  DetectionAccuracyMonitor,
} from "../components/camera/DetectionAccuracyMonitor";

import {
  DetectionEventLedger,
} from "../components/camera/DetectionEventLedger";

import {
  DisasterFeatureMatrixPanel,
} from "../components/camera/DisasterFeatureMatrixPanel";

import {
  ModelPerformancePanel,
} from "../components/camera/ModelPerformancePanel";

import {
  ModelPipeline,
} from "../components/camera/ModelPipeline";

import {
  type CameraOpenCvAnalysis,
  OpenCvAnalysisPanel,
} from "../components/camera/OpenCvAnalysisPanel";

import type {
  CameraVideoSource,
} from "../components/camera/VideoSourceLibrary";

import {
  cameraStatus,
} from "../data/camera";

import {
  useUnifiedTelemetry,
} from "../hooks/useUnifiedTelemetry";

/* =========================================================
   MissionNexus V2
   Vision Intelligence
   ========================================================= */

const BACKEND_URL =
  "http://127.0.0.1:8000";

const STREAM_CONFIDENCE_THRESHOLD =
  0.3;

/* =========================================================
   Video Sources
   ========================================================= */

const defaultVideoSource:
  CameraVideoSource = {
  id:
    "city-surveillance",

  title:
    "Drone City Surveillance",

  description:
    "Default aerial urban-style drone footage for surveillance and tracking UI testing.",

  sourceName:
    "AeroNexus Demo Feed",

  license:
    "Local MP4 / fallback simulation",

  category:
    "surveillance",

  src:
    "/videos/drone-city-surveillance.mp4",
};

const videoSources:
  CameraVideoSource[] = [
  defaultVideoSource,

  {
    id:
      "disaster-response",

    title:
      "Disaster Response Flight",

    description:
      "Aerial rescue and disaster footage for smoke, heat and emergency review.",

    sourceName:
      "AeroNexus Disaster Feed",

    license:
      "Local MP4 / fallback simulation",

    category:
      "disaster",

    src:
      "/videos/drone-disaster-response.mp4",
  },

  {
    id:
      "forest-patrol",

    title:
      "Forest Patrol Flight",

    description:
      "Outdoor aerial footage for perimeter scan, patrol and monitoring.",

    sourceName:
      "AeroNexus Patrol Feed",

    license:
      "Local MP4 / fallback simulation",

    category:
      "patrol",

    src:
      "/videos/drone-forest-patrol.mp4",
  },

  {
    id:
      "fire-response-demo",

    title:
      "Generated Fire EO/IR Simulation",

    description:
      "Fire-response demo footage with visible flame and smoke signatures.",

    sourceName:
      "AeroNexus Fire Demo Feed",

    license:
      "Generated Aeronexus demo asset",

    category:
      "disaster",

    src:
      "/videos/fire-response-demo.mp4",
  },

  {
    id:
      "fire-response-1",

    title:
      "Fire Response 1",

    description:
      "Mission footage for live fire detection, alert generation and OpenCV analysis.",

    sourceName:
      "AeroNexus Fire Response 1",

    license:
      "User local MP4",

    category:
      "disaster",

    src:
      "/videos/Fire_Response_1.MP4",
  },

  {
    id:
      "wildfire-perimeter-slot",

    title:
      "Wildfire Perimeter Slot",

    description:
      "Reserved source for future wildfire perimeter and evacuation monitoring.",

    sourceName:
      "AeroNexus Reserved Feed",

    license:
      "Reserved source slot",

    category:
      "disaster",
  },

  {
    id:
      "smoke-column-slot",

    title:
      "Smoke Column Watch Slot",

    description:
      "Reserved source for smoke-column tracking and emergency review.",

    sourceName:
      "AeroNexus Reserved Feed",

    license:
      "Reserved source slot",

    category:
      "disaster",
  },

  {
    id:
      "thermal-hotspot-slot",

    title:
      "Thermal Hotspot Slot",

    description:
      "Reserved source for thermal hotspot and night-fire monitoring.",

    sourceName:
      "AeroNexus Reserved Feed",

    license:
      "Reserved source slot",

    category:
      "simulation",
  },
];

/* =========================================================
   Types
   ========================================================= */

type Tone =
  | "nominal"
  | "caution"
  | "critical"
  | "info"
  | "muted";

type DashboardAlert = {
  title: string;
  message: string;

  severity:
    | "high"
    | "critical";

  source: string;
  time: string;
};

type VisionMetric = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
};

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
      "text-white/38",

    border:
      "border-white/[0.08]",

    bg:
      "bg-white/[0.015]",

    dot:
      "bg-white/28",
  },
};

const sourceToneClass:
  Record<
    string,
    string
  > = {
  surveillance:
    "border-[rgba(90,169,255,0.28)] bg-[rgba(90,169,255,0.055)] text-[#5AA9FF]",

  disaster:
    "border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.055)] text-[#FF5A63]",

  patrol:
    "border-[rgba(89,217,154,0.25)] bg-[rgba(89,217,154,0.05)] text-[#59D99A]",

  simulation:
    "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.055)] text-[#F6B23C]",
};

/* =========================================================
   Helpers
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

function playDashboardAlertSound() {
  const AudioContextConstructor =
    window.AudioContext ||
    (
      window as unknown as {
        webkitAudioContext?:
          typeof AudioContext;
      }
    ).webkitAudioContext;

  if (
    !AudioContextConstructor
  ) {
    return;
  }

  const context =
    new AudioContextConstructor();

  const masterGain =
    context.createGain();

  masterGain.gain.setValueAtTime(
    0.0001,
    context.currentTime,
  );

  masterGain.gain.exponentialRampToValueAtTime(
    0.18,
    context.currentTime +
      0.03,
  );

  masterGain.gain.exponentialRampToValueAtTime(
    0.0001,
    context.currentTime +
      1.15,
  );

  masterGain.connect(
    context.destination,
  );

  const tones = [
    {
      start:
        0,

      frequency:
        880,
    },

    {
      start:
        0.22,

      frequency:
        660,
    },

    {
      start:
        0.44,

      frequency:
        880,
    },

    {
      start:
        0.66,

      frequency:
        660,
    },
  ];

  tones.forEach(
    (
      tone,
    ) => {
      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type =
        "sine";

      oscillator.frequency.setValueAtTime(
        tone.frequency,
        context.currentTime +
          tone.start,
      );

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime +
          tone.start,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.85,
        context.currentTime +
          tone.start +
          0.02,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime +
          tone.start +
          0.16,
      );

      oscillator.connect(
        gain,
      );

      gain.connect(
        masterGain,
      );

      oscillator.start(
        context.currentTime +
          tone.start,
      );

      oscillator.stop(
        context.currentTime +
          tone.start +
          0.18,
      );
    },
  );

  window.setTimeout(
    () => {
      void context.close();
    },
    1500,
  );
}

/* =========================================================
   Metric Strip
   ========================================================= */

function VisionMetricCell({
  metric,
}: {
  metric: VisionMetric;
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
        <div className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.07em] text-white/36">
          {metric.label}
        </div>

        <div
          className={[
            "mt-1 truncate font-mono text-[15px] font-semibold leading-none",

            tone.text,
          ].join(" ")}
        >
          {metric.value}
        </div>
      </div>

      <Icon
        size={15}
        strokeWidth={1.55}
        className={[
          "shrink-0",
          tone.text,
        ].join(" ")}
      />
    </div>
  );
}

/* =========================================================
   Rail Header
   ========================================================= */

function RailHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex h-[36px] items-center justify-between gap-3 border-b border-white/[0.07] px-3">
      <div className="min-w-0">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.065em] text-[#F6B23C]">
          {eyebrow}
        </span>

        <span className="ml-2 text-[11px] font-medium text-white/76">
          {title}
        </span>
      </div>

      {right}
    </div>
  );
}

/* =========================================================
   Secondary Section
   ========================================================= */

function SectionShell({
  eyebrow,
  title,
  action,
  compact = false,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  compact?: boolean;
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

        {action ? (
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-[#5AA9FF]">
            {action}
          </span>
        ) : null}
      </div>

      <div
        className={
          compact
            ? "p-3"
            : "p-4"
        }
      >
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   Emergency Alert
   ========================================================= */

function EmergencyAlertToast({
  alert,
  onDismiss,
}: {
  alert: DashboardAlert;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed right-4 top-[84px] z-[4500] w-[min(500px,calc(100vw-2rem))] overflow-hidden rounded-[6px] border border-[rgba(255,90,99,0.42)] bg-[rgba(7,9,13,0.97)] shadow-[0_24px_70px_rgba(0,0,0,0.65)] backdrop-blur">
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[rgba(255,90,99,0.3)] bg-[rgba(255,90,99,0.07)]">
          <BellRing
            size={15}
            strokeWidth={1.7}
            className="text-[#FF5A63]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[#FF5A63]">
              Visual Alert
            </span>

            <span className="font-mono text-[8px] text-white/30">
              {alert.time}
            </span>
          </div>

          <div className="mt-1 text-[12px] font-medium text-white/88">
            {alert.title}
          </div>

          <p className="mt-1 text-[10px] leading-[1.5] text-white/40">
            {alert.message}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[8px] uppercase text-white/32">
              {alert.source}
            </span>

            <span className="font-mono text-[8px] uppercase text-[#FF5A63]">
              {alert.severity}
            </span>

            <span className="flex items-center gap-1 font-mono text-[8px] uppercase text-[#F6B23C]">
              <Volume2
                size={10}
              />

              audio
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onDismiss
          }
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-white/[0.08] text-white/38 transition hover:text-white"
          aria-label="Dismiss alert"
        >
          <X
            size={13}
          />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Summary Card
   ========================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "rounded-[5px] border bg-[#05060d] p-3",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            size={13}
            className={
              style.text
            }
          />

          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-white/34">
            {label}
          </span>
        </div>

        <span
          className={[
            "h-1.5 w-1.5 rounded-full",

            style.dot,
          ].join(" ")}
        />
      </div>

      <div
        className={[
          "mt-2 font-mono text-[14px] font-semibold uppercase",

          style.text,
        ].join(" ")}
      >
        {value}
      </div>

      <p className="mt-1 text-[10px] leading-[1.45] text-white/34">
        {helper}
      </p>
    </div>
  );
}

/* =========================================================
   Source Library
   ========================================================= */

function VideoSourceSelector({
  videos,
  selectedVideo,
  onSelectVideo,
}: {
  videos:
    CameraVideoSource[];

  selectedVideo:
    CameraVideoSource;

  onSelectVideo: (
    video:
      CameraVideoSource,
  ) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {videos.map(
        (
          video,
        ) => {
          const selected =
            selectedVideo.id ===
            video.id;

          return (
            <button
              key={
                video.id
              }
              type="button"
              onClick={() =>
                onSelectVideo(
                  video,
                )
              }
              className={[
                "min-h-[92px] rounded-[5px] border p-3 text-left",

                "transition-colors duration-150",

                selected
                  ? "border-[rgba(246,178,60,0.36)] bg-[rgba(246,178,60,0.06)]"
                  : "border-white/[0.07] bg-[#05060d] hover:border-white/[0.16]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  {video.src ? (
                    <Film
                      size={13}
                      className="mt-0.5 shrink-0 text-[#F6B23C]"
                    />
                  ) : (
                    <Camera
                      size={13}
                      className="mt-0.5 shrink-0 text-[#5AA9FF]"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-medium text-white/78">
                      {
                        video.title
                      }
                    </div>

                    <div className="mt-1 line-clamp-2 text-[9px] leading-[1.45] text-white/32">
                      {
                        video.description
                      }
                    </div>
                  </div>
                </div>

                {selected ? (
                  <CheckCircle2
                    size={13}
                    className="shrink-0 text-[#59D99A]"
                  />
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={[
                    "rounded-[3px] border px-1.5 py-0.5",

                    "font-mono text-[8px] font-semibold uppercase",

                    sourceToneClass[
                      video.category
                    ] ??
                      sourceToneClass.simulation,
                  ].join(" ")}
                >
                  {
                    video.category
                  }
                </span>

                <span className="rounded-[3px] border border-white/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase text-white/28">
                  {video.src
                    ? "MP4"
                    : "Reserved"}
                </span>
              </div>
            </button>
          );
        },
      )}
    </div>
  );
}

/* =========================================================
   Operator Safety
   ========================================================= */

function OperatorSafetyPanel({
  selectedVideo,
}: {
  selectedVideo:
    CameraVideoSource;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={
          Sparkles
        }
        label="AI Assist"
        value="Enabled"
        helper="Assisted live operator review."
        tone="nominal"
      />

      <SummaryCard
        icon={
          ShieldCheck
        }
        label="Safety Mode"
        value="Human-in-loop"
        helper="AI remains decision support."
        tone="nominal"
      />

      <SummaryCard
        icon={
          Camera
        }
        label="Video Source"
        value={
          selectedVideo.category
        }
        helper={
          selectedVideo.sourceName
        }
        tone="caution"
      />

      <SummaryCard
        icon={
          ScanSearch
        }
        label="Frame Review"
        value="Active"
        helper="Selected feed ready for analysis."
        tone="info"
      />
    </div>
  );
}

/* =========================================================
   Signal Bar
   ========================================================= */

function SignalBar({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: Tone;
  icon: LucideIcon;
}) {
  const style =
    toneClass[
      tone
    ];

  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        value,
      ),
    );

  return (
    <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] text-white/34">
          <Icon
            size={11}
            className={
              style.text
            }
          />

          {label}
        </div>

        <span
          className={[
            "font-mono text-[9px] font-semibold",

            style.text,
          ].join(" ")}
        >
          {safeValue}%
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={[
            "h-full rounded-full",

            style.dot,
          ].join(" ")}
          style={{
            width:
              `${safeValue}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   Evidence Tile
   ========================================================= */

function EvidenceTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: Tone;
}) {
  const style =
    value > 0
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
          size={12}
          className={
            style.text
          }
        />

        <span
          className={[
            "font-mono text-[14px] font-semibold",

            style.text,
          ].join(" ")}
        >
          {value}
        </span>
      </div>

      <div className="mt-2 truncate font-mono text-[8px] font-semibold uppercase tracking-[0.06em] text-white/30">
        {label}
      </div>
    </div>
  );
}

/* =========================================================
   Checklist
   ========================================================= */

function ChecklistItem({
  complete,
  label,
  helper,
}: {
  complete: boolean;
  label: string;
  helper: string;
}) {
  return (
    <div
      className={[
        "rounded-[5px] border p-3",

        complete
          ? "border-[rgba(89,217,154,0.22)] bg-[rgba(89,217,154,0.035)]"
          : "border-[rgba(246,178,60,0.24)] bg-[rgba(246,178,60,0.035)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        {complete ? (
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-[#59D99A]"
          />
        ) : (
          <AlertTriangle
            size={14}
            className="mt-0.5 shrink-0 text-[#F6B23C]"
          />
        )}

        <div>
          <div className="text-[11px] font-medium text-white/76">
            {label}
          </div>

          <p className="mt-1 text-[10px] leading-[1.5] text-white/34">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Analysis Workbench
   ========================================================= */

function AnalysisWorkbench({
  selectedVideo,
  analysis,
  risk,
  confidence,
}: {
  selectedVideo:
    CameraVideoSource;

  analysis:
    CameraOpenCvAnalysis | null;

  risk: string;
  confidence: number;
}) {
  const riskTone =
    getRiskTone(
      risk,
    );

  const riskStyle =
    toneClass[
      riskTone
    ];

  const personCount =
    analysis?.counts?.person ??
    0;

  const vehicleCount =
    analysis?.counts?.vehicle ??
    0;

  const fireCount =
    analysis?.counts?.fire ??
    0;

  const smokeCount =
    analysis?.counts?.smoke ??
    0;

  const floodCount =
    analysis?.counts?.flood ??
    0;

  const objectCount =
    analysis?.counts?.object ??
    0;

  const totalSignals =
    personCount +
    vehicleCount +
    fireCount +
    smokeCount +
    floodCount +
    objectCount;

  const fireSignal =
    Math.min(
      100,
      Math.round(
        (
          analysis
            ?.fire_analysis
            ?.max_fire_pixels_pct ??
          0
        ) *
          18,
      ),
    );

  const smokeSignal =
    Math.min(
      100,
      Math.round(
        (
          analysis
            ?.fire_analysis
            ?.max_smoke_pixels_pct ??
          0
        ) *
          8,
      ),
    );

  const detectionSignal =
    analysis
      ? Math.min(
          100,
          Math.round(
            (
              analysis
                .metrics
                .detection_count /
              25
            ) *
              100,
          ),
        )
      : 0;

  const frameSignal =
    analysis
      ? Math.min(
          100,
          Math.round(
            (
              analysis
                .frames
                .sampled_frames /
              160
            ) *
              100,
          ),
        )
      : 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            Radar
          }
          label="Triage"
          value={
            risk
          }
          helper="Current visual risk state."
          tone={
            riskTone
          }
        />

        <SummaryCard
          icon={
            Target
          }
          label="Signals"
          value={String(
            totalSignals,
          )}
          helper="Combined detected visual signals."
          tone={
            totalSignals >
            0
              ? "info"
              : "muted"
          }
        />

        <SummaryCard
          icon={
            Gauge
          }
          label="Confidence"
          value={`${confidence}%`}
          helper="Latest model confidence."
          tone={
            confidence >=
            75
              ? "nominal"
              : confidence >=
                  45
                ? "caution"
                : "muted"
          }
        />

        <SummaryCard
          icon={
            ClipboardCheck
          }
          label="Operator"
          value={
            risk ===
            "low"
              ? "Monitor"
              : "Review"
          }
          helper="Suggested operator response."
          tone={
            risk ===
            "low"
              ? "nominal"
              : "caution"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.07em] text-[#F6B23C]">
                Detection Evidence
              </div>

              <div className="mt-1 text-[13px] font-medium text-white/82">
                Signal Breakdown
              </div>
            </div>

            <span className="font-mono text-[8px] uppercase text-[#5AA9FF]">
              {
                selectedVideo.category
              }
            </span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <SignalBar
              icon={
                Flame
              }
              label="Fire / Flame"
              value={
                fireSignal
              }
              tone={
                fireSignal >
                0
                  ? "critical"
                  : "muted"
              }
            />

            <SignalBar
              icon={
                CloudFog
              }
              label="Smoke / Haze"
              value={
                smokeSignal
              }
              tone={
                smokeSignal >
                0
                  ? "caution"
                  : "muted"
              }
            />

            <SignalBar
              icon={
                Target
              }
              label="Detection Load"
              value={
                detectionSignal
              }
              tone={
                detectionSignal >
                0
                  ? "info"
                  : "muted"
              }
            />

            <SignalBar
              icon={
                Video
              }
              label="Frames Analysed"
              value={
                frameSignal
              }
              tone={
                frameSignal >
                0
                  ? "nominal"
                  : "muted"
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <EvidenceTile
              icon={
                UserRound
              }
              label="Person"
              value={
                personCount
              }
              tone="info"
            />

            <EvidenceTile
              icon={
                Car
              }
              label="Vehicle"
              value={
                vehicleCount
              }
              tone="caution"
            />

            <EvidenceTile
              icon={
                Flame
              }
              label="Fire"
              value={
                fireCount
              }
              tone="critical"
            />

            <EvidenceTile
              icon={
                CloudFog
              }
              label="Smoke"
              value={
                smokeCount
              }
              tone="caution"
            />

            <EvidenceTile
              icon={
                Waves
              }
              label="Flood"
              value={
                floodCount
              }
              tone="info"
            />

            <EvidenceTile
              icon={
                Target
              }
              label="Object"
              value={
                objectCount
              }
              tone="muted"
            />
          </div>
        </div>

        <div className="rounded-[5px] border border-white/[0.07] bg-[#05060d] p-4">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.07em] text-[#F6B23C]">
            Operator Checklist
          </div>

          <div className="mt-3 grid gap-2">
            <ChecklistItem
              complete={
                Boolean(
                  analysis,
                )
              }
              label="Run visual analysis"
              helper={
                analysis
                  ? `Analysed ${analysis.frames.sampled_frames} sampled frames.`
                  : "Run YOLO + OpenCV analysis on the selected feed."
              }
            />

            <ChecklistItem
              complete={
                risk ===
                "low"
              }
              label="Confirm mission risk"
              helper={
                risk ===
                "low"
                  ? "Risk remains low."
                  : "Elevated risk requires operator review."
              }
            />

            <ChecklistItem
              complete={
                fireCount ===
                  0 &&
                smokeCount ===
                  0
              }
              label="Validate disaster cues"
              helper={
                fireCount >
                  0 ||
                smokeCount >
                  0
                  ? "Fire or smoke evidence requires visual confirmation."
                  : "No active fire or smoke indication."
              }
            />

            <ChecklistItem
              complete={
                confidence >=
                50
              }
              label="Check confidence"
              helper={
                confidence >=
                50
                  ? "Confidence usable for assisted review."
                  : "Low confidence; treat output as weak evidence."
              }
            />
          </div>
        </div>
      </div>

      <div
        className={[
          "rounded-[5px] border p-3",

          riskStyle.border,
          riskStyle.bg,
        ].join(" ")}
      >
        <div
          className={[
            "font-mono text-[10px] font-semibold uppercase",

            riskStyle.text,
          ].join(" ")}
        >
          Current analysis risk:
          {" "}
          {risk}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Main Page
   ========================================================= */

export function CameraAI() {
  const {
    telemetry,
    sources,
    error,
  } =
    useUnifiedTelemetry();

  const [
    selectedVideo,
    setSelectedVideo,
  ] =
    useState<CameraVideoSource>(
      defaultVideoSource,
    );

  const [
    openCvAnalysis,
    setOpenCvAnalysis,
  ] =
    useState<
      CameraOpenCvAnalysis | null
    >(null);

  const [
    annotatedVideoUrl,
    setAnnotatedVideoUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    isAnnotatingVideo,
    setIsAnnotatingVideo,
  ] =
    useState(
      false,
    );

  const [
    annotatorError,
    setAnnotatorError,
  ] =
    useState<
      string | null
    >(null);

  const [
    videoPanelKey,
    setVideoPanelKey,
  ] =
    useState(
      0,
    );

  const [
    dashboardAlert,
    setDashboardAlert,
  ] =
    useState<
      DashboardAlert | null
    >(null);

  /* =======================================================
     State
     ======================================================= */

  const risk =
    telemetry?.risk ??
    openCvAnalysis?.risk ??
    "low";

  const confidence =
    Math.round(
      (
        (
          telemetry?.ml
            ?.confidence ??
          openCvAnalysis
            ?.detections
            .confidence
        ) ??
        0
      ) *
        100,
    );

  const cameraSource =
    sources.find(
      (
        source,
      ) =>
        source.source ===
        "camera_ml",
    );

  const cameraOnline =
    Boolean(
      cameraSource?.connected,
    );

  const isAnnotatedPlayback =
    Boolean(
      annotatedVideoUrl,
    );

  const detectionCount =
    openCvAnalysis
      ?.metrics
      .detection_count ??
    0;

  const pipelineOnline =
    !error;

  /* =======================================================
     Metrics
     ======================================================= */

  const visionMetrics:
    VisionMetric[] = [
      {
        label:
          "Camera",

        value:
          cameraOnline
            ? "ONLINE"
            : "SIM",

        icon:
          Eye,

        tone:
          cameraOnline
            ? "nominal"
            : "muted",
      },

      {
        label:
          "Source",

        value:
          selectedVideo.category.toUpperCase(),

        icon:
          Camera,

        tone:
          "info",
      },

      {
        label:
          "Frame Rate",

        value:
          `${cameraStatus.fps} FPS`,

        icon:
          Video,

        tone:
          "info",
      },

      {
        label:
          "Confidence",

        value:
          `${confidence}%`,

        icon:
          BrainCircuit,

        tone:
          confidence >=
          60
            ? "nominal"
            : "caution",
      },

      {
        label:
          "Risk",

        value:
          risk.toUpperCase(),

        icon:
          Radar,

        tone:
          getRiskTone(
            risk,
          ),
      },

      {
        label:
          "Pipeline",

        value:
          pipelineOnline
            ? "YOLO + CV"
            : "OFFLINE",

        icon:
          Cpu,

        tone:
          pipelineOnline
            ? "caution"
            : "critical",
      },
    ];

  /* =======================================================
     Helpers
     ======================================================= */

  function resetVideoPanel() {
    setVideoPanelKey(
      (
        current,
      ) =>
        current +
        1,
    );
  }

  function selectVideo(
    video:
      CameraVideoSource,
  ) {
    setSelectedVideo(
      video,
    );

    setOpenCvAnalysis(
      null,
    );

    setAnnotatedVideoUrl(
      null,
    );

    setAnnotatorError(
      null,
    );

    setDashboardAlert(
      null,
    );

    resetVideoPanel();
  }

  function selectVideoById(
    sourceId: string,
  ) {
    const source =
      videoSources.find(
        (
          video,
        ) =>
          video.id ===
          sourceId,
      );

    if (
      source
    ) {
      selectVideo(
        source,
      );
    }
  }

  function showRawFeed() {
    setAnnotatedVideoUrl(
      null,
    );

    setAnnotatorError(
      null,
    );

    resetVideoPanel();
  }

  /* =======================================================
     Analysis
     ======================================================= */

  function handleAnalysisComplete(
    analysis:
      CameraOpenCvAnalysis,
  ) {
    setOpenCvAnalysis(
      analysis,
    );

    const fireDetected =
      Boolean(
        analysis
          .detections
          .fire,
      ) ||
      Boolean(
        analysis
          .detections
          .flame,
      ) ||
      (
        analysis.counts
          ?.fire ??
        0
      ) >
        0;

    const smokeDetected =
      Boolean(
        analysis
          .detections
          .smoke,
      ) ||
      (
        analysis.counts
          ?.smoke ??
        0
      ) >
        0;

    const elevatedRisk =
      analysis.risk ===
        "high" ||
      analysis.risk ===
        "critical";

    if (
      fireDetected ||
      smokeDetected ||
      elevatedRisk
    ) {
      const alertType =
        fireDetected
          ? "Fire / flame signature"
          : smokeDetected
            ? "Smoke / haze signature"
            : "Elevated visual risk";

      const severity:
        DashboardAlert["severity"] =
        analysis.risk ===
          "critical" ||
        fireDetected
          ? "critical"
          : "high";

      setDashboardAlert({
        title:
          `${alertType} detected`,

        message:
          "Camera AI generated a visual alert. Review the highlighted evidence before continuing mission operations.",

        severity,

        source:
          analysis.title,

        time:
          new Date().toLocaleTimeString(),
      });

      playDashboardAlertSound();
    }
  }

  /* =======================================================
     Annotated Video
     ======================================================= */

  async function generateAnnotatedVideo() {
    if (
      !selectedVideo.src
    ) {
      setAnnotatorError(
        "Select a real MP4 video source first.",
      );

      return;
    }

    setIsAnnotatingVideo(
      true,
    );

    setAnnotatorError(
      null,
    );

    setAnnotatedVideoUrl(
      null,
    );

    resetVideoPanel();

    try {
      const response =
        await fetch(
          `${BACKEND_URL}/api/camera-ai/annotate-video`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify(
                {
                  source_id:
                    selectedVideo.id,

                  confidence_threshold:
                    STREAM_CONFIDENCE_THRESHOLD,

                  max_frames:
                    900,
                },
              ),
          },
        );

      if (
        !response.ok
      ) {
        const message =
          await response.text();

        throw new Error(
          message ||
            "Video annotation failed.",
        );
      }

      const result:
        {
          ok?: boolean;
          error?: string;
          annotated_video_url?: string;
        } =
        await response.json();

      if (
        result.ok ===
          false ||
        !result.annotated_video_url
      ) {
        throw new Error(
          result.error ??
            "Annotated stream URL missing.",
        );
      }

      const separator =
        result.annotated_video_url.includes(
          "?",
        )
          ? "&"
          : "?";

      setAnnotatedVideoUrl(
        `${BACKEND_URL}${result.annotated_video_url}${separator}t=${Date.now()}`,
      );

      resetVideoPanel();
    } catch (
      annotationError
    ) {
      setAnnotatorError(
        annotationError instanceof
          Error
          ? annotationError.message
          : "Video annotation failed.",
      );
    } finally {
      setIsAnnotatingVideo(
        false,
      );
    }
  }

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div className="bg-[#05060d] text-white">
      {dashboardAlert ? (
        <EmergencyAlertToast
          alert={
            dashboardAlert
          }
          onDismiss={() =>
            setDashboardAlert(
              null,
            )
          }
        />
      ) : null}

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
              Header
              =============================================== */}

          <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <h1 className="text-[16px] font-medium tracking-[-0.02em] text-white">
                Vision Intelligence
              </h1>

              <p className="mt-0.5 hidden truncate text-[11px] text-white/42 sm:block">
                Aerial video · detection · tracking · disaster intelligence
              </p>
            </div>

            <div
              className={[
                "flex h-[30px] shrink-0 items-center gap-2 rounded-[4px] border px-2.5",

                "font-mono text-[9px] font-semibold uppercase tracking-[0.055em]",

                pipelineOnline
                  ? "border-[rgba(89,217,154,0.24)] bg-[rgba(89,217,154,0.045)] text-[#59D99A]"
                  : "border-[rgba(255,90,99,0.26)] bg-[rgba(255,90,99,0.045)] text-[#FF5A63]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",

                  pipelineOnline
                    ? "bg-[#59D99A]"
                    : "bg-[#FF5A63]",
                ].join(" ")}
              />

              {pipelineOnline
                ? "Vision Pipeline"
                : "Pipeline Offline"}
            </div>
          </header>

          {/* ===============================================
              Metrics
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
            {visionMetrics.map(
              (
                metric,
              ) => (
                <VisionMetricCell
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
              Main Vision Workspace
              =============================================== */}

          <section
            className={[
              "mt-3 grid min-h-[760px] overflow-hidden",

              "rounded-[6px] border border-white/[0.09]",

              "bg-[#020304]",

              "xl:mt-0 xl:min-h-0",

              "xl:grid-cols-[minmax(0,1fr)_390px]",

              "2xl:grid-cols-[minmax(0,1fr)_410px]",
            ].join(" ")}
          >
            {/* =============================================
                VIDEO
                ============================================= */}

            <div className="grid min-h-0 grid-rows-[40px_minmax(0,1fr)]">
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#06080b] px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Eye
                    size={13}
                    strokeWidth={1.6}
                    className="shrink-0 text-[#5AA9FF]"
                  />

                  <span className="hidden shrink-0 text-[12px] font-medium text-white/82 sm:inline">
                    Live AI Video
                  </span>

                  <select
                    value={
                      selectedVideo.id
                    }
                    onChange={(
                      event,
                    ) =>
                      selectVideoById(
                        event
                          .target
                          .value,
                      )
                    }
                    className="h-[28px] min-w-0 max-w-[250px] rounded-[4px] border border-white/[0.09] bg-[#030405] px-2 font-mono text-[9px] text-white/58 outline-none focus:border-[rgba(246,178,60,0.4)]"
                  >
                    {videoSources.map(
                      (
                        video,
                      ) => (
                        <option
                          key={
                            video.id
                          }
                          value={
                            video.id
                          }
                        >
                          {
                            video.title
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isAnnotatedPlayback ? (
                    <button
                      type="button"
                      onClick={
                        showRawFeed
                      }
                      className="h-[28px] rounded-[4px] border border-white/[0.1] px-2.5 font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white/52 transition hover:text-white"
                    >
                      Raw Feed
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      void generateAnnotatedVideo()
                    }
                    disabled={
                      isAnnotatingVideo ||
                      !selectedVideo.src
                    }
                    className="flex h-[28px] items-center gap-1.5 rounded-[4px] border border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.055)] px-2.5 font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-[#F6B23C] transition hover:bg-[rgba(246,178,60,0.1)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAnnotatingVideo ? (
                      <Loader2
                        size={11}
                        className="animate-spin"
                      />
                    ) : (
                      <ScanSearch
                        size={11}
                      />
                    )}

                    {isAnnotatingVideo
                      ? "Starting"
                      : "Live YOLO"}
                  </button>
                </div>
              </div>

              <div className="relative min-h-0">
                <AiVideoPanel
                  key={`${selectedVideo.id}-${videoPanelKey}-${annotatedVideoUrl ?? "raw"}`}
                  videoSrc={
                    annotatedVideoUrl ??
                    selectedVideo.src
                  }
                  videoTitle={
                    isAnnotatedPlayback
                      ? `${selectedVideo.title} · YOLO`
                      : selectedVideo.title
                  }
                  videoSourceName={
                    selectedVideo.sourceName
                  }
                  openCvAnalysis={
                    openCvAnalysis
                  }
                  isAnnotatedPlayback={
                    isAnnotatedPlayback
                  }
                />

                {annotatorError ? (
                  <div className="absolute bottom-3 left-1/2 z-[700] max-w-[80%] -translate-x-1/2 rounded-[4px] border border-[rgba(255,90,99,0.3)] bg-[rgba(7,9,13,0.95)] px-3 py-2 font-mono text-[9px] text-[#FF5A63]">
                    {annotatorError}
                  </div>
                ) : null}
              </div>
            </div>

            {/* =============================================
                RIGHT INTELLIGENCE RAIL
                ============================================= */}

            <aside className="min-h-0 border-t border-white/[0.08] bg-[#07090d] xl:border-l xl:border-t-0">
              <div className="flex h-[44px] items-center justify-between gap-3 border-b border-white/[0.08] px-3">
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.075em] text-[#F6B23C]">
                    Live Intelligence
                  </div>

                  <div className="mt-0.5 font-mono text-[9px] text-white/32">
                    Detection · analysis · camera
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={[
                      "font-mono text-[10px] font-semibold uppercase",

                      toneClass[
                        getRiskTone(
                          risk,
                        )
                      ].text,
                    ].join(" ")}
                  >
                    {
                      risk
                    }
                  </div>

                  <div className="font-mono text-[8px] text-white/28">
                    {
                      detectionCount
                    }{" "}
                    detections
                  </div>
                </div>
              </div>

              {/* Analytics */}

              <div className="border-b border-white/[0.08]">
                <RailHeader
                  eyebrow="AI"
                  title="Detection Summary"
                  right={
                    <span className="font-mono text-[9px] text-[#5AA9FF]">
                      {
                        confidence
                      }
                      %
                    </span>
                  }
                />

                <div className="p-2.5">
                  <AiAnalyticsPanel
                    embedded
                  />
                </div>
              </div>

              {/* Frame analysis */}

              <div className="border-b border-white/[0.08]">
                <RailHeader
                  eyebrow="CV"
                  title="Frame Analysis"
                  right={
                    <span className="font-mono text-[8px] uppercase text-white/28">
                      0.25 threshold
                    </span>
                  }
                />

                <div className="p-2.5">
                  <OpenCvAnalysisPanel
                    selectedVideo={
                      selectedVideo
                    }
                    analysis={
                      openCvAnalysis
                    }
                    onAnalysisComplete={
                      handleAnalysisComplete
                    }
                    mode="control"
                  />
                </div>
              </div>

              {/* Camera controls */}

              <div>
                <RailHeader
                  eyebrow="Camera"
                  title="Operator Controls"
                  right={
                    <span className="font-mono text-[8px] uppercase text-[#59D99A]">
                      assisted
                    </span>
                  }
                />

                <div className="p-2.5">
                  <CameraControls
                    embedded
                    compact
                  />
                </div>
              </div>
            </aside>
          </section>
        </div>
      </section>

      {/* ===================================================
          SECONDARY INTELLIGENCE
          =================================================== */}

      <section className="border-t border-white/[0.08] bg-[#05060d]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
          {/* Source Library */}

          <SectionShell
            eyebrow="Video Sources"
            title="Camera Source Library"
            action={`${videoSources.length} Sources`}
            compact
          >
            <VideoSourceSelector
              videos={
                videoSources
              }
              selectedVideo={
                selectedVideo
              }
              onSelectVideo={
                selectVideo
              }
            />
          </SectionShell>

          {/* Detailed analysis + disaster matrix */}

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionShell
              eyebrow="Detailed Analysis"
              title="YOLO + OpenCV Results"
              action={
                openCvAnalysis
                  ? "Analysis Available"
                  : "Awaiting Analysis"
              }
              compact
            >
              <OpenCvAnalysisPanel
                selectedVideo={
                  selectedVideo
                }
                analysis={
                  openCvAnalysis
                }
                onAnalysisComplete={
                  handleAnalysisComplete
                }
                mode="details"
              />
            </SectionShell>

            <SectionShell
              eyebrow="Disaster Intelligence"
              title="Feature Matrix"
              action="Correlated Cues"
              compact
            >
              <DisasterFeatureMatrixPanel
                analysis={
                  openCvAnalysis
                }
              />
            </SectionShell>
          </div>

          {/* Event Ledger */}

          <SectionShell
            eyebrow="Event Intelligence"
            title="Detection Event Ledger"
            action="Mission Review"
            compact
          >
            <DetectionEventLedger />
          </SectionShell>

          {/* Workbench */}

          <SectionShell
            eyebrow="Analysis Workbench"
            title="Detection Triage & Response"
            action="Operator Review"
          >
            <AnalysisWorkbench
              selectedVideo={
                selectedVideo
              }
              analysis={
                openCvAnalysis
              }
              risk={
                risk
              }
              confidence={
                confidence
              }
            />
          </SectionShell>

          {/* Accuracy / Risk */}

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionShell
              eyebrow="Accuracy"
              title="Detection Accuracy"
              action="Threshold 0.30"
              compact
            >
              <DetectionAccuracyMonitor
                selectedVideo={
                  selectedVideo
                }
                confidenceThreshold={
                  STREAM_CONFIDENCE_THRESHOLD
                }
              />
            </SectionShell>

            <SectionShell
              eyebrow="Risk"
              title="AI Risk Matrix"
              action="Live Score"
              compact
            >
              <AiRiskMatrix />
            </SectionShell>
          </div>

          {/* Operator Safety */}

          <SectionShell
            eyebrow="Operator Safety"
            title="Human Review State"
            action="Human-in-loop"
            compact
          >
            <OperatorSafetyPanel
              selectedVideo={
                selectedVideo
              }
            />
          </SectionShell>

          {/* Models */}

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionShell
              eyebrow="Performance"
              title="Model Performance"
              action="Inference"
              compact
            >
              <ModelPerformancePanel />
            </SectionShell>

            <SectionShell
              eyebrow="Model Flow"
              title="Detection Pipeline"
              action="Vision AI"
              compact
            >
              <ModelPipeline />
            </SectionShell>
          </div>
        </div>
      </section>
    </div>
  );
}