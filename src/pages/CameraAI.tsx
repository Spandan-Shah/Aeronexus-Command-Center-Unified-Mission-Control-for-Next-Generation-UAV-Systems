import { useState, type ReactNode } from "react";
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
import type { LucideIcon } from "lucide-react";

import { AiAnalyticsPanel } from "../components/camera/AiAnalyticsPanel";
import { AiRiskMatrix } from "../components/camera/AiRiskMatrix";
import { AiVideoPanel } from "../components/camera/AiVideoPanel";
import { CameraControls } from "../components/camera/CameraControls";
import { DetectionAccuracyMonitor } from "../components/camera/DetectionAccuracyMonitor";
import { DetectionEventLedger } from "../components/camera/DetectionEventLedger";
import { DisasterFeatureMatrixPanel } from "../components/camera/DisasterFeatureMatrixPanel";
import { ModelPerformancePanel } from "../components/camera/ModelPerformancePanel";
import { ModelPipeline } from "../components/camera/ModelPipeline";
import {
  type CameraOpenCvAnalysis,
  OpenCvAnalysisPanel,
} from "../components/camera/OpenCvAnalysisPanel";
import { type CameraVideoSource } from "../components/camera/VideoSourceLibrary";
import { cameraStatus } from "../data/camera";
import { useUnifiedTelemetry } from "../hooks/useUnifiedTelemetry";

const BACKEND_URL = "http://127.0.0.1:8000";
const STREAM_CONFIDENCE_THRESHOLD = 0.3;

const defaultVideoSource: CameraVideoSource = {
  id: "city-surveillance",
  title: "Drone City Surveillance",
  description:
    "Default aerial urban-style drone footage for surveillance and tracking UI testing.",
  sourceName: "AeroNexus Demo Feed",
  license: "Local MP4 / fallback simulation",
  category: "surveillance",
  src: "/videos/drone-city-surveillance.mp4",
};

const videoSources: CameraVideoSource[] = [
  defaultVideoSource,
  {
    id: "disaster-response",
    title: "Disaster Response Flight",
    description:
      "Aerial rescue/disaster-style footage for smoke, heat, and emergency review UI.",
    sourceName: "AeroNexus Disaster Feed",
    license: "Local MP4 / fallback simulation",
    category: "disaster",
    src: "/videos/drone-disaster-response.mp4",
  },
  {
    id: "forest-patrol",
    title: "Forest Patrol Flight",
    description:
      "Outdoor aerial footage for perimeter scan, forest patrol, and monitoring tests.",
    sourceName: "AeroNexus Patrol Feed",
    license: "Local MP4 / fallback simulation",
    category: "patrol",
    src: "/videos/drone-forest-patrol.mp4",
  },
  {
    id: "fire-response-demo",
    title: "Generated Fire EO/IR Simulation",
    description:
      "Fire-response demo footage with visible flame/smoke signatures for OpenCV fire-mode validation.",
    sourceName: "AeroNexus Fire Demo Feed",
    license: "Generated Aeronexus demo asset",
    category: "disaster",
    src: "/videos/fire-response-demo.mp4",
  },
  {
    id: "fire-response-1",
    title: "Fire Response 1",
    description:
      "User-added fire response mission footage for showing live fire detection, alert generation, and OpenCV fire analysis.",
    sourceName: "AeroNexus Fire Response 1",
    license: "User local MP4",
    category: "disaster",
    src: "/videos/Fire_Response_1.MP4",
  },
  {
    id: "wildfire-perimeter-slot",
    title: "Wildfire Perimeter Slot",
    description:
      "Reserved slot for future wildfire perimeter video, evacuation support, and aerial fireline monitoring.",
    sourceName: "AeroNexus Reserved Feed",
    license: "Reserved source slot",
    category: "disaster",
  },
  {
    id: "smoke-column-slot",
    title: "Smoke Column Watch Slot",
    description:
      "Reserved slot for smoke column tracking, haze confirmation, and emergency response review.",
    sourceName: "AeroNexus Reserved Feed",
    license: "Reserved source slot",
    category: "disaster",
  },
  {
    id: "thermal-hotspot-slot",
    title: "Thermal Hotspot Slot",
    description:
      "Reserved slot for future thermal-style hotspot scan, night fire watch, or IR simulation footage.",
    sourceName: "AeroNexus Reserved Feed",
    license: "Reserved source slot",
    category: "simulation",
  },
];

type Tone = "nominal" | "caution" | "critical" | "info" | "muted";

type DashboardAlert = {
  title: string;
  message: string;
  severity: "high" | "critical";
  source: string;
  time: string;
};

const toneClass = {
  nominal: {
    text: "text-(--nominal)",
    border: "border-[rgba(73,229,143,0.28)]",
    bg: "bg-[rgba(73,229,143,0.08)]",
    dot: "bg-(--nominal)",
  },
  caution: {
    text: "text-(--primary)",
    border: "border-[rgba(246,178,60,0.32)]",
    bg: "bg-[rgba(246,178,60,0.08)]",
    dot: "bg-(--primary)",
  },
  critical: {
    text: "text-(--critical)",
    border: "border-[rgba(255,77,77,0.34)]",
    bg: "bg-[rgba(255,77,77,0.08)]",
    dot: "bg-(--critical)",
  },
  info: {
    text: "text-(--info)",
    border: "border-[rgba(90,169,255,0.3)]",
    bg: "bg-[rgba(90,169,255,0.08)]",
    dot: "bg-(--info)",
  },
  muted: {
    text: "text-(--muted)",
    border: "border-[#1d2533]",
    bg: "bg-[#070a10]",
    dot: "bg-(--muted)",
  },
};

const sourceToneClass: Record<string, string> = {
  surveillance:
    "border-[rgba(90,169,255,0.32)] bg-[rgba(90,169,255,0.08)] text-(--info)",
  disaster:
    "border-[rgba(255,77,77,0.34)] bg-[rgba(255,77,77,0.08)] text-(--critical)",
  patrol:
    "border-[rgba(73,229,143,0.3)] bg-[rgba(73,229,143,0.08)] text-(--nominal)",
  simulation:
    "border-[rgba(246,178,60,0.34)] bg-[rgba(246,178,60,0.08)] text-(--primary)",
};

function getRiskClass(risk?: string) {
  if (risk === "critical") {
    return "border-(--critical) bg-[rgba(255,77,77,0.08)] text-(--critical)";
  }

  if (risk === "high") {
    return "border-(--caution) bg-[rgba(246,178,60,0.08)] text-(--caution)";
  }

  if (risk === "medium") {
    return "border-(--info) bg-[rgba(41,211,255,0.08)] text-(--info)";
  }

  return "border-(--nominal) bg-[rgba(73,229,143,0.08)] text-(--nominal)";
}

function getRiskTone(risk?: string): Tone {
  if (risk === "critical") return "critical";
  if (risk === "high") return "caution";
  if (risk === "medium") return "info";
  if (risk === "low") return "nominal";
  return "muted";
}

function playDashboardAlertSound() {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) return;

  const context = new AudioContextConstructor();
  const masterGain = context.createGain();

  masterGain.gain.setValueAtTime(0.0001, context.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.15);
  masterGain.connect(context.destination);

  const tones = [
    { start: 0, frequency: 880 },
    { start: 0.22, frequency: 660 },
    { start: 0.44, frequency: 880 },
    { start: 0.66, frequency: 660 },
  ];

  tones.forEach((tone) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      tone.frequency,
      context.currentTime + tone.start
    );

    gain.gain.setValueAtTime(0.0001, context.currentTime + tone.start);
    gain.gain.exponentialRampToValueAtTime(
      0.85,
      context.currentTime + tone.start + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + tone.start + 0.16
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(context.currentTime + tone.start);
    oscillator.stop(context.currentTime + tone.start + 0.18);
  });

  window.setTimeout(() => {
    void context.close();
  }, 1500);
}

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
    <section className="overflow-hidden rounded-xl border border-[#1d2533] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[#151923] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-(--primary)">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[17px] font-semibold leading-tight text-(--foreground)">
              {title}
            </h2>
          </div>

          {action && (
            <span className="inline-flex w-fit rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          )}
        </div>
      </div>

      <div className={compact ? "p-4" : "p-5"}>{children}</div>
    </section>
  );
}

function StatusChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
}) {
  const toneStyle = toneClass[tone];

  return (
    <span
      className={`flex h-10 items-center gap-2 rounded border px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}
    >
      <Icon size={13} />
      {label}
    </span>
  );
}

function EmergencyAlertBanner({
  alert,
  onDismiss,
}: {
  alert: DashboardAlert;
  onDismiss: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[rgba(255,77,77,0.55)] bg-[linear-gradient(135deg,rgba(255,77,77,0.18),rgba(5,6,9,0.96)_58%)] shadow-[0_18px_60px_rgba(255,77,77,0.12)]">
      <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,77,77,0.55)] bg-[rgba(255,77,77,0.14)]">
            <BellRing size={22} className="text-(--critical)" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[rgba(255,77,77,0.5)] bg-[rgba(255,77,77,0.12)] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--critical)">
                Emergency Visual Alert Generated
              </span>

              <span className="rounded-full border border-[#2a3547] bg-black px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
                {alert.time}
              </span>

              <span className="rounded-full border border-[#2a3547] bg-black px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--primary)">
                Audio Alert Triggered
              </span>
            </div>

            <h3 className="mt-3 text-[18px] font-semibold text-(--foreground)">
              {alert.title}
            </h3>

            <p className="mt-1 max-w-5xl text-[13px] leading-relaxed text-(--muted)">
              {alert.message}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded border border-[rgba(255,77,77,0.4)] bg-black px-3 py-2 font-mono text-[9px] font-bold uppercase text-(--critical)">
                Source: {alert.source}
              </span>

              <span className="rounded border border-[rgba(255,77,77,0.4)] bg-black px-3 py-2 font-mono text-[9px] font-bold uppercase text-(--critical)">
                Severity: {alert.severity}
              </span>

              <span className="flex items-center gap-2 rounded border border-[rgba(246,178,60,0.36)] bg-black px-3 py-2 font-mono text-[9px] font-bold uppercase text-(--primary)">
                <Volume2 size={12} />
                JS Web Audio Alert
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="flex h-10 w-fit items-center gap-2 rounded border border-[#2a3547] bg-black px-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--foreground) transition hover:border-(--critical) hover:text-(--critical)"
        >
          <X size={14} />
          Dismiss
        </button>
      </div>
    </section>
  );
}

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
  const toneStyle = toneClass[tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${toneStyle.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon size={14} className={toneStyle.text} />
          {label}
        </div>

        <span className={`h-2.5 w-2.5 rounded-full ${toneStyle.dot}`} />
      </div>

      <div
        className={`mt-4 font-mono text-[22px] font-bold uppercase ${toneStyle.text}`}
      >
        {value}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
        {helper}
      </p>
    </div>
  );
}

function OperatorSafetyPanel({
  selectedVideo,
}: {
  selectedVideo: CameraVideoSource;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <SummaryCard
        icon={Sparkles}
        label="AI Assist"
        value="Enabled"
        helper="Assisted review supports live operator awareness."
        tone="nominal"
      />

      <SummaryCard
        icon={ShieldCheck}
        label="Safety Mode"
        value="Human-in-loop"
        helper="AI outputs are decision-support signals only."
        tone="nominal"
      />

      <SummaryCard
        icon={Camera}
        label="Video Source"
        value={selectedVideo.category}
        helper={selectedVideo.sourceName}
        tone="caution"
      />

      <SummaryCard
        icon={ScanSearch}
        label="Frame Review"
        value="Active"
        helper="Selected feed is ready for OpenCV analysis."
        tone="info"
      />
    </div>
  );
}

function VideoSourceSelector({
  videos,
  selectedVideo,
  onSelectVideo,
}: {
  videos: CameraVideoSource[];
  selectedVideo: CameraVideoSource;
  onSelectVideo: (video: CameraVideoSource) => void;
}) {
  return (
    <div className="rounded-xl border border-[#1d2533] bg-[#070a10] p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-(--primary)">
            Video Source
          </p>

          <h3 className="mt-1 text-[15px] font-semibold text-(--foreground)">
            Select active camera feed
          </h3>
        </div>

        <div className="w-fit rounded-full border border-[#1d2533] bg-black px-3 py-1 font-mono text-[8px] font-bold uppercase text-(--muted)">
          Active: <span className="text-(--primary)">{selectedVideo.title}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {videos.map((video) => {
          const selected = selectedVideo.id === video.id;

          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onSelectVideo(video)}
              className={`min-h-[104px] rounded-lg border p-4 text-left transition ${
                selected
                  ? "border-(--primary) bg-[rgba(246,178,60,0.1)]"
                  : "border-[#1d2533] bg-black hover:border-(--primary)"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {video.src ? (
                    <Film
                      size={15}
                      className="mt-0.5 shrink-0 text-(--primary)"
                    />
                  ) : (
                    <Camera
                      size={15}
                      className="mt-0.5 shrink-0 text-(--info)"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-(--foreground)">
                      {video.title}
                    </div>

                    <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-(--muted)">
                      {video.description}
                    </div>
                  </div>
                </div>

                {selected && (
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-(--nominal)"
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${
                    sourceToneClass[video.category] ?? sourceToneClass.simulation
                  }`}
                >
                  {video.category}
                </span>

                <span className="rounded border border-[#1d2533] px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-(--muted)">
                  {video.src ? "Local MP4" : "Reserved Slot"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const toneStyle = toneClass[tone];
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="rounded-lg border border-[#1d2533] bg-black p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon size={12} className={toneStyle.text} />
          {label}
        </div>

        <span className={`font-mono text-[10px] font-bold ${toneStyle.text}`}>
          {safeValue}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#07111f]">
        <div
          className={`h-full rounded-full ${toneStyle.dot}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function AnalysisWorkbench({
  selectedVideo,
  analysis,
  risk,
  confidence,
}: {
  selectedVideo: CameraVideoSource;
  analysis: CameraOpenCvAnalysis | null;
  risk: string;
  confidence: number;
}) {
  const riskTone = getRiskTone(risk);
  const riskStyle = toneClass[riskTone];

  const personCount = analysis?.counts?.person ?? 0;
  const vehicleCount = analysis?.counts?.vehicle ?? 0;
  const fireCount = analysis?.counts?.fire ?? 0;
  const smokeCount = analysis?.counts?.smoke ?? 0;
  const floodCount = analysis?.counts?.flood ?? 0;
  const objectCount = analysis?.counts?.object ?? 0;

  const totalSignals =
    personCount + vehicleCount + fireCount + smokeCount + floodCount + objectCount;

  const fireSignal = Math.min(
    100,
    Math.round((analysis?.fire_analysis?.max_fire_pixels_pct ?? 0) * 18)
  );

  const smokeSignal = Math.min(
    100,
    Math.round((analysis?.fire_analysis?.max_smoke_pixels_pct ?? 0) * 8)
  );

  const detectionSignal = analysis
    ? Math.min(100, Math.round((analysis.metrics.detection_count / 25) * 100))
    : 0;

  const frameSignal = analysis
    ? Math.min(100, Math.round((analysis.frames.sampled_frames / 160) * 100))
    : 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className={`rounded-xl border bg-[#070a10] p-4 ${riskStyle.border}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
              Triage State
            </div>

            <span className={`h-2.5 w-2.5 rounded-full ${riskStyle.dot}`} />
          </div>

          <div className={`mt-4 font-mono text-[24px] font-bold uppercase ${riskStyle.text}`}>
            {risk}
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
            Current operator risk state based on camera analysis and telemetry.
          </p>
        </div>

        <SummaryCard
          icon={Target}
          label="Total Signals"
          value={String(totalSignals)}
          helper="Combined detected objects and disaster signals."
          tone={totalSignals > 0 ? "info" : "muted"}
        />

        <SummaryCard
          icon={Gauge}
          label="Confidence"
          value={`${confidence}%`}
          helper="Latest model confidence from camera telemetry or OpenCV."
          tone={confidence >= 75 ? "nominal" : confidence >= 45 ? "caution" : "muted"}
        />

        <SummaryCard
          icon={ClipboardCheck}
          label="Operator Action"
          value={risk === "low" ? "Monitor" : "Review"}
          helper="Suggested response for current analysis state."
          tone={risk === "low" ? "nominal" : "caution"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[#1d2533] bg-[#070a10] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--primary)">
                Detection Evidence
              </p>

              <h3 className="mt-1 text-[15px] font-semibold text-(--foreground)">
                Signal Breakdown
              </h3>

              <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
                Useful evidence from YOLO and OpenCV fire/flame analysis.
              </p>
            </div>

            <span className="rounded-full border border-[#243147] bg-black px-3 py-1 font-mono text-[8px] font-bold uppercase text-(--info)">
              {selectedVideo.category}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SignalBar
              icon={Flame}
              label="Fire / Flame"
              value={fireSignal}
              tone={fireSignal > 0 ? "critical" : "muted"}
            />

            <SignalBar
              icon={CloudFog}
              label="Smoke / Haze"
              value={smokeSignal}
              tone={smokeSignal > 0 ? "caution" : "muted"}
            />

            <SignalBar
              icon={Target}
              label="Detection Load"
              value={detectionSignal}
              tone={detectionSignal > 0 ? "info" : "muted"}
            />

            <SignalBar
              icon={Video}
              label="Frames Analysed"
              value={frameSignal}
              tone={frameSignal > 0 ? "nominal" : "muted"}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <EvidenceTile icon={UserRound} label="Person" value={personCount} tone="info" />
            <EvidenceTile icon={Car} label="Vehicle" value={vehicleCount} tone="caution" />
            <EvidenceTile icon={Flame} label="Fire" value={fireCount} tone="critical" />
            <EvidenceTile icon={CloudFog} label="Smoke" value={smokeCount} tone="caution" />
            <EvidenceTile icon={Waves} label="Flood" value={floodCount} tone="info" />
            <EvidenceTile icon={Target} label="Object" value={objectCount} tone="muted" />
          </div>
        </div>

        <div className="rounded-xl border border-[#1d2533] bg-[#070a10] p-4">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-(--primary)">
            Operator Checklist
          </p>

          <h3 className="mt-1 text-[15px] font-semibold text-(--foreground)">
            Response Guidance
          </h3>

          <div className="mt-4 grid gap-3">
            <ChecklistItem
              complete={Boolean(analysis)}
              label="Run OpenCV / YOLO analysis"
              helper={
                analysis
                  ? `Analysed ${analysis.frames.sampled_frames} frames from selected feed.`
                  : "Click Analyze with YOLO + Fire Mode from the Frame Analysis panel."
              }
            />

            <ChecklistItem
              complete={risk === "low"}
              label="Confirm mission risk state"
              helper={
                risk === "low"
                  ? "Risk remains low. Continue monitoring."
                  : "Risk is elevated. Review detected events before continuing."
              }
            />

            <ChecklistItem
              complete={fireCount === 0 && smokeCount === 0}
              label="Validate disaster indicators"
              helper={
                fireCount > 0 || smokeCount > 0
                  ? "Fire or smoke indicator exists. Confirm visually before action."
                  : "No fire or smoke signal is currently confirmed."
              }
            />

            <ChecklistItem
              complete={confidence >= 50}
              label="Check confidence quality"
              helper={
                confidence >= 50
                  ? "Model confidence is usable for assisted review."
                  : "Confidence is low. Treat output as weak evidence."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const toneStyle = value > 0 ? toneClass[tone] : toneClass.muted;

  return (
    <div className={`rounded-lg border bg-black p-3 ${toneStyle.border}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon size={13} className={toneStyle.text} />

        <span className={`font-mono text-[15px] font-bold ${toneStyle.text}`}>
          {value}
        </span>
      </div>

      <div className="mt-2 truncate font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-(--muted)">
        {label}
      </div>
    </div>
  );
}

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
      className={`rounded-lg border p-3 ${
        complete
          ? "border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.045)]"
          : "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.045)]"
      }`}
    >
      <div className="flex items-start gap-3">
        {complete ? (
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-(--nominal)" />
        ) : (
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-(--primary)" />
        )}

        <div>
          <div className="text-[13px] font-semibold text-(--foreground)">
            {label}
          </div>

          <p className="mt-1 text-[12px] leading-relaxed text-(--muted)">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CameraAI() {
  const { telemetry, sources, error } = useUnifiedTelemetry();

  const [selectedVideo, setSelectedVideo] =
    useState<CameraVideoSource>(defaultVideoSource);

  const [openCvAnalysis, setOpenCvAnalysis] =
    useState<CameraOpenCvAnalysis | null>(null);

  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(
    null
  );

  const [isAnnotatingVideo, setIsAnnotatingVideo] = useState(false);
  const [annotatorError, setAnnotatorError] = useState<string | null>(null);
  const [videoPanelKey, setVideoPanelKey] = useState(0);
  const [dashboardAlert, setDashboardAlert] = useState<DashboardAlert | null>(
    null
  );

  const risk = telemetry?.risk ?? openCvAnalysis?.risk ?? "low";

  const confidence = Math.round(
    ((telemetry?.ml?.confidence ?? openCvAnalysis?.detections.confidence) ?? 0) *
      100
  );

  const cameraSource = sources.find((source) => source.source === "camera_ml");
  const cameraOnline = Boolean(cameraSource?.connected);
  const isAnnotatedPlayback = Boolean(annotatedVideoUrl);

  function resetVideoPanel() {
    setVideoPanelKey((current) => current + 1);
  }

  function selectVideo(video: CameraVideoSource) {
    setSelectedVideo(video);
    setOpenCvAnalysis(null);
    setAnnotatedVideoUrl(null);
    setAnnotatorError(null);
    setDashboardAlert(null);
    resetVideoPanel();
  }

  function handleAnalysisComplete(analysis: CameraOpenCvAnalysis) {
    setOpenCvAnalysis(analysis);

    const fireDetected =
      Boolean(analysis.detections.fire) ||
      Boolean(analysis.detections.flame) ||
      (analysis.counts?.fire ?? 0) > 0;

    const smokeDetected =
      Boolean(analysis.detections.smoke) || (analysis.counts?.smoke ?? 0) > 0;

    const elevatedRisk =
      analysis.risk === "high" || analysis.risk === "critical";

    if (fireDetected || smokeDetected || elevatedRisk) {
      const alertType = fireDetected
        ? "Fire / flame signature"
        : smokeDetected
          ? "Smoke / haze signature"
          : "Elevated visual risk";

      const severity: DashboardAlert["severity"] =
        analysis.risk === "critical" || fireDetected ? "critical" : "high";

      setDashboardAlert({
        title: `${alertType} detected`,
        message:
          "Aeronexus generated a dashboard alert from the camera AI analysis. The event is visible to the operator, audio feedback has been triggered, and the mission should be reviewed before continuing.",
        severity,
        source: analysis.title,
        time: new Date().toLocaleTimeString(),
      });

      playDashboardAlertSound();
    }
  }

  async function generateAnnotatedVideo() {
    if (!selectedVideo.src) {
      setAnnotatorError("Select a real MP4 video source first.");
      return;
    }

    setIsAnnotatingVideo(true);
    setAnnotatorError(null);
    setAnnotatedVideoUrl(null);
    resetVideoPanel();

    try {
      const response = await fetch(`${BACKEND_URL}/api/camera-ai/annotate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source_id: selectedVideo.id,
          confidence_threshold: STREAM_CONFIDENCE_THRESHOLD,
          max_frames: 900,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Video annotation failed.");
      }

      const result: {
        ok?: boolean;
        error?: string;
        annotated_video_url?: string;
      } = await response.json();

      if (result.ok === false || !result.annotated_video_url) {
        throw new Error(result.error ?? "Annotated stream URL missing.");
      }

      const separator = result.annotated_video_url.includes("?") ? "&" : "?";

      setAnnotatedVideoUrl(
        `${BACKEND_URL}${result.annotated_video_url}${separator}t=${Date.now()}`
      );

      resetVideoPanel();
    } catch (annotationError) {
      setAnnotatorError(
        annotationError instanceof Error
          ? annotationError.message
          : "Video annotation failed."
      );
    } finally {
      setIsAnnotatingVideo(false);
    }
  }

  return (
    <div className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-[#09090b] px-5 py-6">
      <div className="flex w-full flex-col gap-6">
        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Aerial Intelligence
              </p>

              <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
                Camera AI Analytics
              </h1>

              <p className="mt-2 max-w-6xl text-[14px] leading-relaxed text-(--muted)">
                Live video HUD, GPU YOLO detection, OpenCV frame analysis,
                source selection, detection confidence, disaster feature matrix,
                risk scoring, event ledger, and model-performance review.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={generateAnnotatedVideo}
                disabled={isAnnotatingVideo || !selectedVideo.src}
                className="flex h-10 items-center gap-2 rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--primary) transition hover:bg-[rgba(246,178,60,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnnotatingVideo ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ScanSearch size={13} />
                )}
                {isAnnotatingVideo ? "Starting Stream" : "Live YOLO Video"}
              </button>

              <StatusChip
                icon={Camera}
                label={cameraOnline ? "Camera Online" : "Camera Sim"}
                tone={cameraOnline ? "nominal" : "muted"}
              />

              <StatusChip
                icon={BrainCircuit}
                label={`${confidence}% Confidence`}
                tone="info"
              />

              <span
                className={`flex h-10 items-center gap-2 rounded border px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${getRiskClass(
                  risk
                )}`}
              >
                {risk === "low" ? (
                  <ShieldCheck size={13} />
                ) : (
                  <AlertTriangle size={13} />
                )}
                {risk} Risk
              </span>

              <StatusChip
                icon={Video}
                label={`${cameraStatus.fps} FPS`}
                tone="caution"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-(--critical) bg-[rgba(255,77,77,0.08)] px-4 py-3 text-[13px] text-(--critical)">
              Backend offline: {error}
            </div>
          )}

          {annotatorError && (
            <div className="mt-4 rounded-lg border border-(--critical) bg-[rgba(255,77,77,0.08)] px-4 py-3 text-[13px] text-(--critical)">
              Annotator error: {annotatorError}
            </div>
          )}

          {isAnnotatedPlayback && (
            <div className="mt-4 rounded-lg border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-4 py-3 text-[13px] text-(--nominal)">
              Frame-by-frame YOLO MJPEG stream is active. Moving detection boxes
              are drawn directly inside streamed frames.
              {annotatedVideoUrl && (
                <div className="mt-3 break-all rounded border border-[#1d2533] bg-black px-3 py-2 font-mono text-[10px] text-(--muted)">
                  Stream URL: {annotatedVideoUrl}
                </div>
              )}
            </div>
          )}
        </section>

        {dashboardAlert && (
          <EmergencyAlertBanner
            alert={dashboardAlert}
            onDismiss={() => setDashboardAlert(null)}
          />
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Eye}
            label="Vision Feed"
            value={cameraOnline ? "Online" : "Sim"}
            helper="Camera input state for current mission view"
            tone={cameraOnline ? "nominal" : "muted"}
          />

          <SummaryCard
            icon={BrainCircuit}
            label="AI Confidence"
            value={`${confidence}%`}
            helper="Combined telemetry and OpenCV detection confidence"
            tone="info"
          />

          <SummaryCard
            icon={Radar}
            label="Risk State"
            value={risk}
            helper="Current video-assisted risk classification"
            tone={
              risk === "low" ? "nominal" : risk === "medium" ? "info" : "caution"
            }
          />

          <SummaryCard
            icon={Cpu}
            label="Pipeline"
            value="YOLO + CV"
            helper="Detection, frame analysis, and event extraction"
            tone="caution"
          />
        </section>

        <SectionShell
          eyebrow="Feed Selection"
          title="Camera Source Library"
          action={`${videoSources.length} Sources`}
          compact
        >
          <VideoSourceSelector
            videos={videoSources}
            selectedVideo={selectedVideo}
            onSelectVideo={selectVideo}
          />
        </SectionShell>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(360px,0.8fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <SectionShell
              eyebrow="Live Vision"
              title="AI Video Panel"
              action={isAnnotatedPlayback ? "Annotated Stream" : selectedVideo.title}
            >
              <AiVideoPanel
                key={`${selectedVideo.id}-${videoPanelKey}-${annotatedVideoUrl ?? "raw"}`}
                videoSrc={annotatedVideoUrl ?? selectedVideo.src}
                videoTitle={
                  isAnnotatedPlayback
                    ? `${selectedVideo.title} · Frame-by-frame YOLO`
                    : selectedVideo.title
                }
                videoSourceName={selectedVideo.sourceName}
                openCvAnalysis={openCvAnalysis}
                isAnnotatedPlayback={isAnnotatedPlayback}
              />
            </SectionShell>

            <SectionShell
              eyebrow="Disaster Intelligence"
              title="Feature Matrix"
              action="Correlated Cues"
            >
              <DisasterFeatureMatrixPanel analysis={openCvAnalysis} />
            </SectionShell>

            <SectionShell
              eyebrow="Event Ledger"
              title="Detection Event Ledger"
              action="Mission Review"
            >
              <DetectionEventLedger />
            </SectionShell>

            <SectionShell
              eyebrow="Analysis Workbench"
              title="Detection Triage & Response"
              action="Operator Useful"
            >
              <AnalysisWorkbench
                selectedVideo={selectedVideo}
                analysis={openCvAnalysis}
                risk={risk}
                confidence={confidence}
              />
            </SectionShell>
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            <SectionShell
              eyebrow="Analytics"
              title="AI Detection Summary"
              action="Live Review"
              compact
            >
              <AiAnalyticsPanel />
            </SectionShell>

            <SectionShell
              eyebrow="OpenCV"
              title="Frame Analysis"
              action="Local Video"
              compact
            >
              <OpenCvAnalysisPanel
                selectedVideo={selectedVideo}
                analysis={openCvAnalysis}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </SectionShell>

            <SectionShell
              eyebrow="Controls"
              title="Camera Controls"
              action="Operator"
              compact
            >
              <CameraControls />
            </SectionShell>

            <SectionShell
              eyebrow="Accuracy"
              title="Detection Accuracy"
              action="Threshold 0.30"
              compact
            >
              <DetectionAccuracyMonitor
                selectedVideo={selectedVideo}
                confidenceThreshold={STREAM_CONFIDENCE_THRESHOLD}
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
          </aside>
        </div>

        <SectionShell
          eyebrow="Operator Safety"
          title="Human Review State"
          action="Required"
          compact
        >
          <OperatorSafetyPanel selectedVideo={selectedVideo} />
        </SectionShell>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionShell
            eyebrow="Performance"
            title="Model Performance"
            action="Inference"
          >
            <ModelPerformancePanel />
          </SectionShell>

          <SectionShell
            eyebrow="Model Flow"
            title="Detection Pipeline"
            action="VisionOps AI"
          >
            <ModelPipeline />
          </SectionShell>
        </section>
      </div>
    </div>
  );
}