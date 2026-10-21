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
   Configuration
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
  title:
    string;

  message:
    string;

  severity:
    | "high"
    | "critical";

  source:
    string;

  time:
    string;
};


type VisionMetric = {
  label:
    string;

  value:
    string;

  icon:
    LucideIcon;

  tone:
    Tone;
};


/* =========================================================
   Tone System
   ========================================================= */

const toneClass:
  Record<
    Tone,
    {
      text:
        string;

      border:
        string;

      bg:
        string;

      dot:
        string;
    }
  > = {
  nominal: {
    text:
      "text-[var(--nominal)]",

    border:
      "border-[rgba(100,142,120,0.30)]",

    bg:
      "bg-[rgba(100,142,120,0.11)]",

    dot:
      "bg-[var(--nominal)]",
  },

  caution: {
    text:
      "text-[var(--caution)]",

    border:
      "border-[rgba(199,155,89,0.30)]",

    bg:
      "bg-[rgba(199,155,89,0.11)]",

    dot:
      "bg-[var(--caution)]",
  },

  critical: {
    text:
      "text-[var(--critical)]",

    border:
      "border-[rgba(201,105,114,0.32)]",

    bg:
      "bg-[rgba(201,105,114,0.11)]",

    dot:
      "bg-[var(--critical)]",
  },

  info: {
    text:
      "text-[var(--info)]",

    border:
      "border-[rgba(93,135,163,0.30)]",

    bg:
      "bg-[rgba(93,135,163,0.11)]",

    dot:
      "bg-[var(--info)]",
  },

  muted: {
    text:
      "text-[var(--muted-soft)]",

    border:
      "border-[var(--border)]",

    bg:
      "bg-[var(--surface-2)]",

    dot:
      "bg-[var(--muted-soft)]",
  },
};


const sourceToneClass:
  Record<
    string,
    string
  > = {
  surveillance:
    "border-[rgba(93,135,163,0.30)] bg-[rgba(93,135,163,0.11)] text-[var(--info)]",

  disaster:
    "border-[rgba(201,105,114,0.30)] bg-[rgba(201,105,114,0.11)] text-[var(--critical)]",

  patrol:
    "border-[rgba(100,142,120,0.30)] bg-[rgba(100,142,120,0.11)] text-[var(--nominal)]",

  simulation:
    "border-[rgba(176,138,88,0.30)] bg-[rgba(176,138,88,0.11)] text-[var(--primary)]",
};


/* =========================================================
   Helpers
   ========================================================= */

function getRiskTone(
  risk?:
    string,
): Tone {
  if (
    risk ===
    "critical"
  ) {
    return "critical";
  }

  if (
    risk ===
    "high"
  ) {
    return "caution";
  }

  if (
    risk ===
    "medium"
  ) {
    return "info";
  }

  if (
    risk ===
    "low"
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
   Vision Intelligence Typography Guard

   Scoped only to this page.

   It also catches typography from imported camera
   components so meaningful explanatory text is never
   rendered at 9px / 10px / 11px.
   ========================================================= */

function VisionTypographyGuard() {
  return (
    <style>
      {`
        .vision-intelligence-page [class*="text-[9px]"] {
          font-size: 11px !important;
          line-height: 1.5 !important;
        }

        .vision-intelligence-page [class*="text-[10px]"] {
          font-size: 12px !important;
          line-height: 1.5 !important;
        }

        .vision-intelligence-page [class*="text-[11px]"] {
          font-size: 13px !important;
          line-height: 1.55 !important;
        }

        .vision-intelligence-page [class*="text-[12px]"] {
          font-size: 13px !important;
          line-height: 1.55 !important;
        }

        .vision-intelligence-page [class*="text-[13px]"] {
          font-size: 14px !important;
          line-height: 1.6 !important;
        }

        .vision-intelligence-page .text-xs {
          font-size: 13px !important;
          line-height: 1.55 !important;
        }

        .vision-intelligence-page .text-sm {
          font-size: 14px !important;
          line-height: 1.6 !important;
        }

        .vision-intelligence-page p {
          font-size: 14px;
          line-height: 1.65;
        }

        .vision-intelligence-page select,
        .vision-intelligence-page input,
        .vision-intelligence-page textarea {
          font-size: 14px !important;
        }

        .vision-intelligence-page table th {
          font-size: 12px !important;
          line-height: 1.5 !important;
        }

        .vision-intelligence-page table td {
          font-size: 13px !important;
          line-height: 1.55 !important;
        }
      `}
    </style>
  );
}


/* =========================================================
   Metric Card
   ========================================================= */

function VisionMetricCell({
  metric,
}: {
  metric:
    VisionMetric;
}) {
  const Icon =
    metric.icon;

  const tone =
    toneClass[
      metric.tone
    ];

  return (
    <div
      className={[
        "flex min-h-[112px] min-w-0 items-center justify-between gap-3",

        "rounded-[9px] border",

        "border-[var(--border)]",

        "bg-[var(--surface-2)]",

        "px-4 py-3.5",

        "shadow-[0_8px_22px_rgba(0,0,0,0.14)]",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold uppercase tracking-[0.055em] text-[var(--muted-soft)]">
          {metric.label}
        </div>

        <div className="mt-2 truncate font-mono text-[18px] font-semibold leading-none text-[var(--foreground)]">
          {metric.value}
        </div>
      </div>

      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center",

          "rounded-[7px] border",

          tone.border,
          tone.bg,
          tone.text,
        ].join(" ")}
      >
        <Icon
          size={18}
          strokeWidth={1.65}
        />
      </div>
    </div>
  );
}


/* =========================================================
   Shared Rail Header
   ========================================================= */

function RailHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow:
    string;

  title:
    string;

  right?:
    ReactNode;
}) {
  return (
    <div
      className={[
        "flex min-h-[60px] items-center justify-between gap-3",

        "border-b border-[var(--border-soft)]",

        "bg-[var(--surface-2)]",

        "px-4",
      ].join(" ")}
    >
      <div className="min-w-0">
        <span className="text-[13px] font-semibold uppercase tracking-[0.055em] text-[var(--primary)]">
          {eyebrow}
        </span>

        <span className="ml-2 text-[15px] font-semibold text-[var(--foreground)]">
          {title}
        </span>
      </div>

      {right}
    </div>
  );
}


/* =========================================================
   Section Shell
   ========================================================= */

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow:
    string;

  title:
    string;

  action?:
    string;

  children:
    ReactNode;
}) {
  return (
    <section
      className={[
        "flex h-full min-w-0 flex-col",

        "overflow-hidden rounded-[10px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-1)]",

        "shadow-[0_12px_30px_rgba(0,0,0,0.16)]",
      ].join(" ")}
    >
      <div
        className={[
          "flex min-h-[82px] shrink-0 items-center",

          "border-b border-[var(--border-soft)]",

          "bg-[var(--surface-2)]",

          "px-5 py-3.5",
        ].join(" ")}
      >
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.075em] text-[var(--primary)]">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {title}
            </h2>
          </div>

          {action ? (
            <span
              className={[
                "inline-flex w-fit items-center",

                "rounded-[6px] border",

                "border-[rgba(93,135,163,0.28)]",

                "bg-[rgba(93,135,163,0.10)]",

                "px-2.5 py-1",

                "text-[13px] font-semibold",

                "text-[var(--info)]",
              ].join(" ")}
            >
              {action}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-5">
        {children}
      </div>
    </section>
  );
}


/* =========================================================
   Consistent Vision Split Row
   ========================================================= */

function VisionSplitRow({
  left,
  right,
}: {
  left:
    ReactNode;

  right:
    ReactNode;
}) {
  return (
    <div
      className={[
        "grid items-stretch gap-6",

        "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
      ].join(" ")}
    >
      <div className="min-w-0">
        {left}
      </div>

      <div className="min-w-0">
        {right}
      </div>
    </div>
  );
}


/* =========================================================
   Emergency Alert
   ========================================================= */

function EmergencyAlertToast({
  alert,
  onDismiss,
}: {
  alert:
    DashboardAlert;

  onDismiss:
    () => void;
}) {
  return (
    <div
      className={[
        "fixed right-5 top-[88px] z-[4500]",

        "w-[min(500px,calc(100vw-2rem))]",

        "overflow-hidden rounded-[9px]",

        "border border-[rgba(201,105,114,0.34)]",

        "bg-[var(--surface-2)]",

        "shadow-[0_22px_65px_rgba(0,0,0,0.42)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center",

            "rounded-[7px] border",

            "border-[rgba(201,105,114,0.28)]",

            "bg-[rgba(201,105,114,0.11)]",
          ].join(" ")}
        >
          <BellRing
            size={17}
            strokeWidth={1.7}
            className="text-[var(--critical)]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold uppercase tracking-[0.055em] text-[var(--critical)]">
              Visual Alert
            </span>

            <span className="font-mono text-[13px] text-[var(--muted-soft)]">
              {alert.time}
            </span>
          </div>

          <div className="mt-1.5 text-[15px] font-semibold text-[var(--foreground)]">
            {alert.title}
          </div>

          <p className="mt-1.5 text-[14px] leading-[1.55] text-[var(--muted)]">
            {alert.message}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-[4px] bg-[var(--surface-3)] px-2 py-1 text-[13px] text-[var(--muted)]">
              {alert.source}
            </span>

            <span className="rounded-[4px] bg-[rgba(201,105,114,0.11)] px-2 py-1 text-[13px] font-semibold uppercase text-[var(--critical)]">
              {alert.severity}
            </span>

            <span className="flex items-center gap-1 rounded-[4px] bg-[rgba(176,138,88,0.11)] px-2 py-1 text-[13px] text-[var(--primary)]">
              <Volume2
                size={12}
              />

              Audio
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onDismiss
          }
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center",

            "rounded-[6px] border",

            "border-[var(--border)]",

            "bg-[var(--surface-3)]",

            "text-[var(--muted)]",

            "hover:border-[var(--border-strong)]",

            "hover:bg-[var(--surface-hover)]",

            "hover:text-[var(--foreground)]",
          ].join(" ")}
          aria-label="Dismiss alert"
        >
          <X
            size={14}
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
  icon:
    Icon,

  label,

  value,

  helper,

  tone,
}: {
  icon:
    LucideIcon;

  label:
    string;

  value:
    string;

  helper:
    string;

  tone:
    Tone;
}) {
  const style =
    toneClass[
      tone
    ];

  return (
    <div
      className={[
        "flex h-full min-h-[156px] flex-col",

        "rounded-[8px] border",

        "bg-[var(--surface-2)]",

        "p-4",

        "shadow-[0_7px_20px_rgba(0,0,0,0.13)]",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={[
              "flex h-8 w-8 items-center justify-center",

              "rounded-[6px] border",

              style.border,
              style.bg,
              style.text,
            ].join(" ")}
          >
            <Icon
              size={15}
              strokeWidth={1.7}
            />
          </div>

          <span className="text-[13px] font-semibold uppercase tracking-[0.045em] text-[var(--muted-soft)]">
            {label}
          </span>
        </div>

        <span
          className={[
            "h-2 w-2 rounded-full",

            style.dot,
          ].join(" ")}
        />
      </div>

      <div className="mt-3 text-[17px] font-semibold capitalize text-[var(--foreground)]">
        {value}
      </div>

      <p className="mt-auto pt-2 text-[14px] leading-[1.5] text-[var(--muted)]">
        {helper}
      </p>
    </div>
  );
}


/* =========================================================
   Source Selector
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
    <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                "flex min-h-[142px] flex-col",

                "rounded-[8px] border",

                "p-3.5 text-left",

                "transition-[background-color,border-color,box-shadow] duration-150",

                selected
                  ? "border-[rgba(176,138,88,0.40)] bg-[rgba(176,138,88,0.12)] shadow-[0_7px_20px_rgba(0,0,0,0.15)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center",

                      "rounded-[6px] border",

                      video.src
                        ? "border-[rgba(176,138,88,0.28)] bg-[rgba(176,138,88,0.10)] text-[var(--primary)]"
                        : "border-[rgba(93,135,163,0.28)] bg-[rgba(93,135,163,0.10)] text-[var(--info)]",
                    ].join(" ")}
                  >
                    {video.src ? (
                      <Film
                        size={15}
                      />
                    ) : (
                      <Camera
                        size={15}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-[var(--foreground)]">
                      {video.title}
                    </div>

                    <div className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-[var(--muted)]">
                      {video.description}
                    </div>
                  </div>
                </div>

                {selected ? (
                  <CheckCircle2
                    size={16}
                    className="shrink-0 text-[var(--nominal)]"
                  />
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <span
                  className={[
                    "rounded-[4px] border px-2 py-1",

                    "text-[12px] font-semibold uppercase",

                    sourceToneClass[
                      video.category
                    ] ??
                      sourceToneClass.simulation,
                  ].join(" ")}
                >
                  {video.category}
                </span>

                <span
                  className={[
                    "rounded-[4px] border",

                    "border-[var(--border)]",

                    "bg-[var(--surface-3)]",

                    "px-2 py-1",

                    "text-[12px] font-medium uppercase",

                    "text-[var(--muted-soft)]",
                  ].join(" ")}
                >
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
    <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
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
  icon:
    Icon,
}: {
  label:
    string;

  value:
    number;

  tone:
    Tone;

  icon:
    LucideIcon;
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
    <div
      className={[
        "rounded-[7px]",

        "border border-[var(--border-soft)]",

        "bg-[var(--surface-3)]",

        "p-3.5",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">
          <Icon
            size={14}
            className={
              style.text
            }
          />

          {label}
        </div>

        <span
          className={[
            "font-mono text-[14px] font-semibold",

            style.text,
          ].join(" ")}
        >
          {safeValue}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--input)]">
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
  icon:
    Icon,

  label,

  value,

  tone,
}: {
  icon:
    LucideIcon;

  label:
    string;

  value:
    number;

  tone:
    Tone;
}) {
  const style =
    value >
    0
      ? toneClass[
          tone
        ]
      : toneClass.muted;

  return (
    <div
      className={[
        "rounded-[7px] border",

        "bg-[var(--surface-2)]",

        "p-3",

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

        <span className="font-mono text-[17px] font-semibold text-[var(--foreground)]">
          {value}
        </span>
      </div>

      <div className="mt-2 truncate text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--muted-soft)]">
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
  complete:
    boolean;

  label:
    string;

  helper:
    string;
}) {
  return (
    <div
      className={[
        "rounded-[7px] border p-3.5",

        complete
          ? "border-[rgba(100,142,120,0.26)] bg-[rgba(100,142,120,0.10)]"
          : "border-[rgba(199,155,89,0.26)] bg-[rgba(199,155,89,0.10)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        {complete ? (
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 text-[var(--nominal)]"
          />
        ) : (
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-[var(--caution)]"
          />
        )}

        <div>
          <div className="text-[14px] font-semibold text-[var(--foreground)]">
            {label}
          </div>

          <p className="mt-1 text-[13px] leading-[1.55] text-[var(--muted)]">
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

  risk:
    string;

  confidence:
    number;
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
    <div className="grid gap-5">
      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <div
          className={[
            "flex h-full flex-col",

            "rounded-[8px]",

            "border border-[var(--border-soft)]",

            "bg-[var(--surface-3)]",

            "p-4",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.055em] text-[var(--primary)]">
                Detection Evidence
              </div>

              <div className="mt-1 text-[16px] font-semibold text-[var(--foreground)]">
                Signal Breakdown
              </div>
            </div>

            <span className="rounded-[4px] border border-[rgba(93,135,163,0.24)] bg-[rgba(93,135,163,0.10)] px-2 py-1 text-[12px] font-semibold uppercase text-[var(--info)]">
              {selectedVideo.category}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
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

          <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
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

        <div
          className={[
            "flex h-full flex-col",

            "rounded-[8px]",

            "border border-[var(--border-soft)]",

            "bg-[var(--surface-3)]",

            "p-4",
          ].join(" ")}
        >
          <div className="text-[13px] font-semibold uppercase tracking-[0.055em] text-[var(--primary)]">
            Operator Checklist
          </div>

          <div className="mt-3 grid flex-1 auto-rows-fr gap-2.5">
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
          "rounded-[7px] border p-3.5",

          riskStyle.border,
          riskStyle.bg,
        ].join(" ")}
      >
        <div
          className={[
            "text-[14px] font-semibold",

            riskStyle.text,
          ].join(" ")}
        >
          Current analysis risk:{" "}
          <span className="uppercase">
            {risk}
          </span>
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
    >(
      null,
    );

  const [
    annotatedVideoUrl,
    setAnnotatedVideoUrl,
  ] =
    useState<
      string | null
    >(
      null,
    );

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
    >(
      null,
    );

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
    >(
      null,
    );


  /* =======================================================
     Derived State
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
            ? "info"
            : "critical",
      },
    ];


  /* =======================================================
     Video Helpers
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
    sourceId:
      string,
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
     Analysis Completion
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
          ok?:
            boolean;

          error?:
            string;

          annotated_video_url?:
            string;
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
    <div className="vision-intelligence-page min-h-[calc(100vh-70px)] bg-transparent px-5 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <VisionTypographyGuard />

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

      <div
        className={[
          "mx-auto flex w-full max-w-[1680px] flex-col",

          "gap-6",
        ].join(" ")}
      >
        {/* =================================================
            Page Header
            ================================================= */}

        <section
          className={[
            "rounded-[10px]",

            "border border-[var(--border)]",

            "bg-[var(--surface-1)]",

            "p-5",

            "shadow-[0_14px_36px_rgba(0,0,0,0.18)]",
          ].join(" ")}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.085em] text-[var(--primary)]">
                Visual Operations · AI Intelligence
              </p>

              <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                Vision Intelligence
              </h1>

              <p className="mt-2 max-w-5xl text-[14px] leading-[1.65] text-[var(--muted)]">
                Aerial video, assisted detection, OpenCV analysis,
                disaster intelligence and operator-supervised
                visual mission review.
              </p>
            </div>

            <div
              className={[
                "inline-flex h-10 w-fit items-center gap-2",

                "rounded-[7px] border px-3.5",

                "text-[13px] font-semibold uppercase tracking-[0.045em]",

                pipelineOnline
                  ? "border-[rgba(100,142,120,0.30)] bg-[rgba(100,142,120,0.11)] text-[var(--nominal)]"
                  : "border-[rgba(201,105,114,0.30)] bg-[rgba(201,105,114,0.11)] text-[var(--critical)]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",

                  pipelineOnline
                    ? "bg-[var(--nominal)]"
                    : "bg-[var(--critical)]",
                ].join(" ")}
              />

              {pipelineOnline
                ? "Vision Pipeline Online"
                : "Pipeline Offline"}
            </div>
          </div>
        </section>


        {/* =================================================
            Metrics
            ================================================= */}

        <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-6">
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


        {/* =================================================
            Primary Visual Workspace
            ================================================= */}

        <section
          className={[
            "grid items-stretch gap-6",

            "xl:grid-cols-[minmax(0,2fr)_minmax(390px,0.92fr)]",
          ].join(" ")}
        >
          {/* Video Card */}

          <div
            className={[
              "flex h-full min-w-0 flex-col",

              "overflow-hidden rounded-[10px]",

              "border border-[var(--border)]",

              "bg-[var(--surface-1)]",

              "shadow-[0_14px_36px_rgba(0,0,0,0.20)]",
            ].join(" ")}
          >
            <div
              className={[
                "flex min-h-[72px] shrink-0 items-center justify-between gap-4",

                "border-b border-[var(--border-soft)]",

                "bg-[var(--surface-2)]",

                "px-4",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center",

                    "rounded-[7px] border",

                    "border-[rgba(93,135,163,0.28)]",

                    "bg-[rgba(93,135,163,0.10)]",

                    "text-[var(--info)]",
                  ].join(" ")}
                >
                  <Eye
                    size={16}
                    strokeWidth={1.7}
                  />
                </div>

                <span className="hidden shrink-0 text-[15px] font-semibold text-[var(--foreground)] sm:inline">
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
                      event.target.value,
                    )
                  }
                  className={[
                    "h-[40px] min-w-0 max-w-[300px]",

                    "rounded-[6px]",

                    "border border-[var(--border)]",

                    "bg-[var(--input)]",

                    "px-3",

                    "text-[14px] font-medium",

                    "text-[var(--foreground-soft)]",

                    "outline-none",

                    "focus:border-[var(--primary)]",
                  ].join(" ")}
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
                        {video.title}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isAnnotatedPlayback ? (
                  <button
                    type="button"
                    onClick={
                      showRawFeed
                    }
                    className={[
                      "h-[40px] rounded-[6px] border px-3",

                      "border-[var(--border)]",

                      "bg-[var(--surface-3)]",

                      "text-[13px] font-semibold",

                      "text-[var(--muted)]",

                      "hover:border-[var(--border-strong)]",

                      "hover:bg-[var(--surface-hover)]",

                      "hover:text-[var(--foreground)]",
                    ].join(" ")}
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
                  className={[
                    "flex h-[40px] items-center gap-2",

                    "rounded-[6px] border px-3",

                    "border-[rgba(176,138,88,0.34)]",

                    "bg-[rgba(176,138,88,0.12)]",

                    "text-[13px] font-semibold",

                    "text-[var(--primary)]",

                    "hover:bg-[rgba(176,138,88,0.18)]",

                    "disabled:cursor-not-allowed",

                    "disabled:opacity-40",
                  ].join(" ")}
                >
                  {isAnnotatingVideo ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <ScanSearch
                      size={14}
                    />
                  )}

                  {isAnnotatingVideo
                    ? "Starting"
                    : "Live YOLO"}
                </button>
              </div>
            </div>

            <div className="relative min-h-[700px] flex-1 overflow-hidden bg-black">
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
                <div
                  className={[
                    "absolute bottom-4 left-1/2 z-[700]",

                    "max-w-[82%] -translate-x-1/2",

                    "rounded-[7px] border",

                    "border-[rgba(201,105,114,0.30)]",

                    "bg-[var(--surface-2)]",

                    "px-3.5 py-2.5",

                    "text-[13px] font-medium",

                    "text-[var(--critical)]",

                    "shadow-[0_12px_34px_rgba(0,0,0,0.35)]",
                  ].join(" ")}
                >
                  {annotatorError}
                </div>
              ) : null}
            </div>
          </div>


          {/* Intelligence Rail */}

          <aside
            className={[
              "flex h-full min-w-0 flex-col",

              "overflow-hidden rounded-[10px]",

              "border border-[var(--border)]",

              "bg-[var(--surface-1)]",

              "shadow-[0_14px_36px_rgba(0,0,0,0.20)]",
            ].join(" ")}
          >
            <div
              className={[
                "flex min-h-[72px] shrink-0 items-center justify-between gap-3",

                "border-b border-[var(--border-soft)]",

                "bg-[var(--surface-2)]",

                "px-4",
              ].join(" ")}
            >
              <div>
                <div className="text-[15px] font-semibold uppercase tracking-[0.045em] text-[var(--primary)]">
                  Live Intelligence
                </div>

                <div className="mt-1 text-[13px] text-[var(--muted-soft)]">
                  Detection · analysis · camera
                </div>
              </div>

              <div className="text-right">
                <div
                  className={[
                    "text-[14px] font-semibold uppercase",

                    toneClass[
                      getRiskTone(
                        risk,
                      )
                    ].text,
                  ].join(" ")}
                >
                  {risk}
                </div>

                <div className="mt-1 font-mono text-[13px] text-[var(--muted-soft)]">
                  {detectionCount} detections
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex-1 border-b border-[var(--border-soft)] bg-[var(--surface-1)]">
                <RailHeader
                  eyebrow="AI"
                  title="Detection Summary"
                  right={
                    <span className="font-mono text-[14px] font-semibold text-[var(--info)]">
                      {confidence}%
                    </span>
                  }
                />

                <div className="p-4">
                  <AiAnalyticsPanel
                    embedded
                  />
                </div>
              </div>

              <div className="flex-1 border-b border-[var(--border-soft)] bg-[var(--surface-1)]">
                <RailHeader
                  eyebrow="CV"
                  title="Frame Analysis"
                  right={
                    <span className="text-[12px] font-medium uppercase text-[var(--muted-soft)]">
                      0.25 threshold
                    </span>
                  }
                />

                <div className="p-4">
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

              <div className="flex-1 bg-[var(--surface-1)]">
                <RailHeader
                  eyebrow="Camera"
                  title="Operator Controls"
                  right={
                    <span className="rounded-[4px] border border-[rgba(100,142,120,0.24)] bg-[rgba(100,142,120,0.10)] px-2 py-1 text-[12px] font-semibold uppercase text-[var(--nominal)]">
                      Assisted
                    </span>
                  }
                />

                <div className="p-4">
                  <CameraControls
                    embedded
                    compact
                  />
                </div>
              </div>
            </div>
          </aside>
        </section>


        {/* =================================================
            Video Source Library
            ================================================= */}

        <SectionShell
          eyebrow="Video Sources"
          title="Camera Source Library"
          action={`${videoSources.length} Sources`}
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


        {/* =================================================
            Detailed Analysis + Feature Matrix
            ================================================= */}

        <VisionSplitRow
          left={
            <SectionShell
              eyebrow="Detailed Analysis"
              title="YOLO + OpenCV Results"
              action={
                openCvAnalysis
                  ? "Analysis Available"
                  : "Awaiting Analysis"
              }
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
          }
          right={
            <SectionShell
              eyebrow="Disaster Intelligence"
              title="Feature Matrix"
              action="Correlated Cues"
            >
              <DisasterFeatureMatrixPanel
                analysis={
                  openCvAnalysis
                }
              />
            </SectionShell>
          }
        />


        {/* =================================================
            Event Ledger
            ================================================= */}

        <SectionShell
          eyebrow="Event Intelligence"
          title="Detection Event Ledger"
          action="Mission Review"
        >
          <DetectionEventLedger />
        </SectionShell>


        {/* =================================================
            Analysis Workbench
            ================================================= */}

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


        {/* =================================================
            Accuracy + Risk
            ================================================= */}

        <VisionSplitRow
          left={
            <SectionShell
              eyebrow="Accuracy"
              title="Detection Accuracy"
              action="Threshold 0.30"
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
          }
          right={
            <SectionShell
              eyebrow="Risk"
              title="AI Risk Matrix"
              action="Live Score"
            >
              <AiRiskMatrix />
            </SectionShell>
          }
        />


        {/* =================================================
            Operator Safety
            ================================================= */}

        <SectionShell
          eyebrow="Operator Safety"
          title="Human Review State"
          action="Human-in-loop"
        >
          <OperatorSafetyPanel
            selectedVideo={
              selectedVideo
            }
          />
        </SectionShell>


        {/* =================================================
            Performance + Model Flow
            ================================================= */}

        <VisionSplitRow
          left={
            <SectionShell
              eyebrow="Performance"
              title="Model Performance"
              action="Inference"
            >
              <ModelPerformancePanel />
            </SectionShell>
          }
          right={
            <SectionShell
              eyebrow="Model Flow"
              title="Detection Pipeline"
              action="Vision AI"
            >
              <ModelPipeline />
            </SectionShell>
          }
        />
      </div>
    </div>
  );
}