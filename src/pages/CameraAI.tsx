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
      "text-[#507A65]",

    border:
      "border-[rgba(80,122,101,0.25)]",

    bg:
      "bg-[#DDEBE4]",

    dot:
      "bg-[#507A65]",
  },

  caution: {
    text:
      "text-[#8C642D]",

    border:
      "border-[rgba(165,122,59,0.26)]",

    bg:
      "bg-[#F2E7D5]",

    dot:
      "bg-[#A57A3B]",
  },

  critical: {
    text:
      "text-[#AC5C64]",

    border:
      "border-[rgba(172,92,100,0.26)]",

    bg:
      "bg-[#F2DFE2]",

    dot:
      "bg-[#AC5C64]",
  },

  info: {
    text:
      "text-[#3F6E8C]",

    border:
      "border-[rgba(63,110,140,0.25)]",

    bg:
      "bg-[#DCE8EF]",

    dot:
      "bg-[#3F6E8C]",
  },

  muted: {
    text:
      "text-[#6E7B86]",

    border:
      "border-[#C7D0D7]",

    bg:
      "bg-[#E4E9ED]",

    dot:
      "bg-[#929EA7]",
  },
};


const sourceToneClass:
  Record<
    string,
    string
  > = {
  surveillance:
    "border-[rgba(63,110,140,0.25)] bg-[#DCE8EF] text-[#3F6E8C]",

  disaster:
    "border-[rgba(172,92,100,0.25)] bg-[#F2DFE2] text-[#AC5C64]",

  patrol:
    "border-[rgba(80,122,101,0.25)] bg-[#DDEBE4] text-[#507A65]",

  simulation:
    "border-[rgba(163,123,67,0.26)] bg-[#EEE3D3] text-[#815E30]",
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
        "flex min-h-[94px] min-w-0 items-center justify-between gap-3",

        "rounded-[9px]",

        "border border-[#C5CDD5]",

        "bg-[#EEF2F5]",

        "px-4 py-3.5",

        "shadow-[0_5px_16px_rgba(34,48,60,0.055)]",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6E7B86]">
          {
            metric.label
          }
        </div>

        <div className="mt-2 truncate font-mono text-[16px] font-semibold leading-none text-[#18232D]">
          {
            metric.value
          }
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
          size={
            18
          }
          strokeWidth={
            1.65
          }
        />
      </div>
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
  eyebrow:
    string;

  title:
    string;

  right?:
    ReactNode;
}) {
  return (
    <div className="flex min-h-[50px] items-center justify-between gap-3 border-b border-[#CED5DB] px-4">
      <div className="min-w-0">
        <span className="text-[12px] font-semibold uppercase tracking-[0.055em] text-[#815E30]">
          {
            eyebrow
          }
        </span>

        <span className="ml-2 text-[14px] font-semibold text-[#25313B]">
          {
            title
          }
        </span>
      </div>

      {
        right
      }
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
  eyebrow:
    string;

  title:
    string;

  action?:
    string;

  compact?:
    boolean;

  children:
    ReactNode;
}) {
  return (
    <section
      className={[
        "overflow-hidden",

        "rounded-[10px]",

        "border border-[#C5CDD5]",

        "bg-[#EEF2F5]",

        "shadow-[0_8px_24px_rgba(34,48,60,0.065)]",
      ].join(" ")}
    >
      <div className="flex min-h-[64px] items-center justify-between gap-4 border-b border-[#D0D7DD] bg-[#E9EEF1] px-5">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#815E30]">
            {
              eyebrow
            }
          </div>

          <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.015em] text-[#18232D]">
            {
              title
            }
          </h2>
        </div>

        {action ? (
          <span className="rounded-[5px] border border-[rgba(63,110,140,0.18)] bg-[#DCE8EF] px-2.5 py-1 text-[12px] font-semibold text-[#3F6E8C]">
            {
              action
            }
          </span>
        ) : null}
      </div>

      <div
        className={
          compact
            ? "p-4"
            : "p-5"
        }
      >
        {
          children
        }
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
  alert:
    DashboardAlert;

  onDismiss:
    () => void;
}) {
  return (
    <div className="fixed right-5 top-[88px] z-[4500] w-[min(500px,calc(100vw-2rem))] overflow-hidden rounded-[9px] border border-[rgba(172,92,100,0.32)] bg-[#F7F9FA] shadow-[0_20px_60px_rgba(34,48,60,0.22)]">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-[rgba(172,92,100,0.24)] bg-[#F2DFE2]">
          <BellRing
            size={
              17
            }
            className="text-[#AC5C64]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#AC5C64]">
              Visual Alert
            </span>

            <span className="font-mono text-[12px] text-[#7A8792]">
              {
                alert.time
              }
            </span>
          </div>

          <div className="mt-1.5 text-[14px] font-semibold text-[#18232D]">
            {
              alert.title
            }
          </div>

          <p className="mt-1.5 text-[13px] leading-[1.55] text-[#596672]">
            {
              alert.message
            }
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-[4px] bg-[#E4E9ED] px-2 py-1 text-[12px] text-[#596672]">
              {
                alert.source
              }
            </span>

            <span className="rounded-[4px] bg-[#F2DFE2] px-2 py-1 text-[12px] font-semibold uppercase text-[#AC5C64]">
              {
                alert.severity
              }
            </span>

            <span className="flex items-center gap-1 rounded-[4px] bg-[#EEE3D3] px-2 py-1 text-[12px] text-[#815E30]">
              <Volume2
                size={
                  12
                }
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[#C5CDD5] bg-[#E4E9ED] text-[#67747F] hover:bg-[#D7DEE4]"
        >
          <X
            size={
              14
            }
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
        "rounded-[8px] border bg-[#F7F9FA] p-4",

        "shadow-[0_4px_14px_rgba(34,48,60,0.04)]",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-[6px]",

              style.bg,
              style.text,
            ].join(" ")}
          >
            <Icon
              size={
                15
              }
            />
          </div>

          <span className="text-[12px] font-semibold uppercase tracking-[0.045em] text-[#6F7C87]">
            {
              label
            }
          </span>
        </div>

        <span
          className={[
            "h-2 w-2 rounded-full",

            style.dot,
          ].join(" ")}
        />
      </div>

      <div className="mt-3 text-[16px] font-semibold capitalize text-[#18232D]">
        {
          value
        }
      </div>

      <p className="mt-1.5 text-[13px] leading-[1.5] text-[#64717D]">
        {
          helper
        }
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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                "min-h-[116px]",

                "rounded-[8px] border",

                "p-3.5 text-left",

                "transition-[background-color,border-color,box-shadow] duration-150",

                selected
                  ? "border-[rgba(163,123,67,0.38)] bg-[#EEE3D3] shadow-[0_5px_16px_rgba(75,55,25,0.07)]"
                  : "border-[#CBD3D9] bg-[#F7F9FA] hover:border-[#AFBAC2] hover:bg-[#EEF2F5]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px]",

                      video.src
                        ? "bg-[#EEE3D3] text-[#815E30]"
                        : "bg-[#DCE8EF] text-[#3F6E8C]",
                    ].join(" ")}
                  >
                    {video.src ? (
                      <Film
                        size={
                          15
                        }
                      />
                    ) : (
                      <Camera
                        size={
                          15
                        }
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[#18232D]">
                      {
                        video.title
                      }
                    </div>

                    <div className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-[#6A7782]">
                      {
                        video.description
                      }
                    </div>
                  </div>
                </div>

                {selected ? (
                  <CheckCircle2
                    size={
                      16
                    }
                    className="shrink-0 text-[#507A65]"
                  />
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <span
                  className={[
                    "rounded-[4px] border px-2 py-1",

                    "text-[11px] font-semibold uppercase",

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

                <span className="rounded-[4px] border border-[#C8D0D7] bg-[#E4E9ED] px-2 py-1 text-[11px] uppercase text-[#67747F]">
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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
    <div className="rounded-[7px] border border-[#C9D1D7] bg-[#E4E9ED] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5D6A75]">
          <Icon
            size={
              14
            }
            className={
              style.text
            }
          />

          {
            label
          }
        </div>

        <span
          className={[
            "font-mono text-[13px] font-semibold",

            style.text,
          ].join(" ")}
        >
          {
            safeValue
          }
          %
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#CDD5DB]">
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
    value > 0
      ? toneClass[
          tone
        ]
      : toneClass.muted;

  return (
    <div
      className={[
        "rounded-[7px] border bg-[#F7F9FA] p-3",

        style.border,
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <Icon
          size={
            14
          }
          className={
            style.text
          }
        />

        <span className="font-mono text-[16px] font-semibold text-[#18232D]">
          {
            value
          }
        </span>
      </div>

      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6D7A85]">
        {
          label
        }
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
          ? "border-[rgba(80,122,101,0.24)] bg-[#DDEBE4]"
          : "border-[rgba(165,122,59,0.25)] bg-[#F2E7D5]",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        {complete ? (
          <CheckCircle2
            size={
              16
            }
            className="mt-0.5 shrink-0 text-[#507A65]"
          />
        ) : (
          <AlertTriangle
            size={
              16
            }
            className="mt-0.5 shrink-0 text-[#A57A3B]"
          />
        )}

        <div>
          <div className="text-[13px] font-semibold text-[#24313B]">
            {
              label
            }
          </div>

          <p className="mt-1 text-[12px] leading-[1.55] text-[#63707B]">
            {
              helper
            }
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="rounded-[8px] border border-[#C9D1D7] bg-[#E4E9ED] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.055em] text-[#815E30]">
                Detection Evidence
              </div>

              <div className="mt-1 text-[15px] font-semibold text-[#18232D]">
                Signal Breakdown
              </div>
            </div>

            <span className="rounded-[4px] bg-[#DCE8EF] px-2 py-1 text-[11px] font-semibold uppercase text-[#3F6E8C]">
              {
                selectedVideo.category
              }
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


        <div className="rounded-[8px] border border-[#C9D1D7] bg-[#E4E9ED] p-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.055em] text-[#815E30]">
            Operator Checklist
          </div>

          <div className="mt-3 grid gap-2.5">
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
            "text-[13px] font-semibold",

            riskStyle.text,
          ].join(" ")}
        >
          Current analysis risk:{" "}
          <span className="uppercase">
            {
              risk
            }
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


  return (
    <div className="min-h-full bg-transparent text-[#18232D]">
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
          Primary Workspace
          =================================================== */}

      <section>
        <div className="mx-auto w-full max-w-[1460px] px-5 pb-8 pt-7 sm:px-6 lg:px-8 xl:px-10">
          {/* Header */}

          <header className="mb-6 flex min-w-0 items-end justify-between gap-5">
            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.075em] text-[#815E30]">
                Visual Operations
              </div>

              <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#18232D]">
                Vision Intelligence
              </h1>

              <p className="mt-1.5 text-[14px] text-[#5E6B76]">
                Aerial video · detection · tracking · disaster intelligence
              </p>
            </div>


            <div
              className={[
                "flex h-[40px] items-center gap-2 rounded-[7px] border px-3.5",

                "text-[12px] font-semibold uppercase tracking-[0.045em]",

                pipelineOnline
                  ? "border-[rgba(80,122,101,0.25)] bg-[#DDEBE4] text-[#507A65]"
                  : "border-[rgba(172,92,100,0.26)] bg-[#F2DFE2] text-[#AC5C64]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",

                  pipelineOnline
                    ? "bg-[#507A65]"
                    : "bg-[#AC5C64]",
                ].join(" ")}
              />

              {pipelineOnline
                ? "Vision Pipeline"
                : "Pipeline Offline"}
            </div>
          </header>


          {/* Metrics */}

          <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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


          {/* Main Workspace */}

          <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Video */}

            <div className="overflow-hidden rounded-[10px] border border-[#BFC8D0] bg-[#EEF2F5] shadow-[0_10px_30px_rgba(34,48,60,0.08)]">
              <div className="flex min-h-[56px] items-center justify-between gap-4 border-b border-[#CBD3DA] bg-[#E4E9ED] px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#DCE8EF] text-[#3F6E8C]">
                    <Eye
                      size={
                        16
                      }
                    />
                  </div>

                  <span className="hidden text-[14px] font-semibold text-[#26323C] sm:block">
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
                    className="h-[36px] min-w-0 max-w-[290px] rounded-[6px] border border-[#BCC6CE] bg-[#F7F9FA] px-3 text-[13px] font-medium text-[#43515D] outline-none focus:border-[#A37B43]"
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


                <div className="flex items-center gap-2">
                  {isAnnotatedPlayback ? (
                    <button
                      type="button"
                      onClick={
                        showRawFeed
                      }
                      className="h-[36px] rounded-[6px] border border-[#BEC7CF] bg-[#F7F9FA] px-3 text-[12px] font-semibold text-[#596672] hover:bg-[#E8EDF0]"
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
                    className="flex h-[36px] items-center gap-2 rounded-[6px] border border-[rgba(163,123,67,0.32)] bg-[#EEE3D3] px-3 text-[12px] font-semibold text-[#815E30] hover:bg-[#E8DAC6] disabled:opacity-40"
                  >
                    {isAnnotatingVideo ? (
                      <Loader2
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <ScanSearch
                        size={
                          14
                        }
                      />
                    )}

                    {isAnnotatingVideo
                      ? "Starting"
                      : "Live YOLO"}
                  </button>
                </div>
              </div>


              {/* Intentional Black Video Canvas */}

              <div className="relative min-h-[640px] overflow-hidden bg-black xl:h-[720px]">
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
                  <div className="absolute bottom-4 left-1/2 z-[700] max-w-[82%] -translate-x-1/2 rounded-[7px] border border-[rgba(172,92,100,0.28)] bg-[#F7F9FA] px-3.5 py-2.5 text-[12px] font-medium text-[#AC5C64] shadow-lg">
                    {
                      annotatorError
                    }
                  </div>
                ) : null}
              </div>
            </div>


            {/* Intelligence Rail */}

            <aside className="overflow-hidden rounded-[10px] border border-[#BFC8D0] bg-[#EEF2F5] shadow-[0_10px_30px_rgba(34,48,60,0.075)]">
              <div className="flex min-h-[66px] items-center justify-between gap-3 border-b border-[#CAD2D9] bg-[#E4E9ED] px-4">
                <div>
                  <div className="text-[14px] font-semibold uppercase tracking-[0.045em] text-[#815E30]">
                    Live Intelligence
                  </div>

                  <div className="mt-1 text-[12px] text-[#67747F]">
                    Detection · analysis · camera
                  </div>
                </div>


                <div className="text-right">
                  <div
                    className={[
                      "text-[13px] font-semibold uppercase",

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

                  <div className="mt-1 font-mono text-[12px] text-[#77838E]">
                    {
                      detectionCount
                    }{" "}
                    detections
                  </div>
                </div>
              </div>


              <div className="border-b border-[#CCD4DA] bg-[#F2F5F7]">
                <RailHeader
                  eyebrow="AI"
                  title="Detection Summary"
                  right={
                    <span className="font-mono text-[13px] font-semibold text-[#3F6E8C]">
                      {
                        confidence
                      }
                      %
                    </span>
                  }
                />

                <div className="p-3.5">
                  <AiAnalyticsPanel
                    embedded
                  />
                </div>
              </div>


              <div className="border-b border-[#CCD4DA] bg-[#E9EEF1]">
                <RailHeader
                  eyebrow="CV"
                  title="Frame Analysis"
                  right={
                    <span className="text-[11px] uppercase text-[#71808B]">
                      0.25 threshold
                    </span>
                  }
                />

                <div className="p-3.5">
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


              <div className="bg-[#F2F5F7]">
                <RailHeader
                  eyebrow="Camera"
                  title="Operator Controls"
                  right={
                    <span className="rounded-[4px] bg-[#DDEBE4] px-2 py-1 text-[11px] font-semibold uppercase text-[#507A65]">
                      Assisted
                    </span>
                  }
                />

                <div className="p-3.5">
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
          Secondary Intelligence
          =================================================== */}

      <section className="border-t border-[#BDC7CF] bg-[rgba(205,214,221,0.42)]">
        <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-5 px-5 py-8 sm:px-6 lg:px-8 xl:px-10">
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


          <div className="grid gap-5 xl:grid-cols-2">
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


          <SectionShell
            eyebrow="Event Intelligence"
            title="Detection Event Ledger"
            action="Mission Review"
            compact
          >
            <DetectionEventLedger />
          </SectionShell>


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


          <div className="grid gap-5 xl:grid-cols-2">
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


          <div className="grid gap-5 xl:grid-cols-2">
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