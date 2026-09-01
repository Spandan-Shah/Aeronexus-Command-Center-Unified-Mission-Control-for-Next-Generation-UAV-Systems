import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Camera,
  Cpu,
  Eye,
  Loader2,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Video,
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
import {
  type CameraVideoSource,
  VideoSourceLibrary,
} from "../components/camera/VideoSourceLibrary";
import { cameraStatus } from "../data/camera";
import { useUnifiedTelemetry } from "../hooks/useUnifiedTelemetry";

const BACKEND_URL = "http://127.0.0.1:8000";
const STREAM_CONFIDENCE_THRESHOLD = 0.3;

const videoSources: CameraVideoSource[] = [
  {
    id: "simulated-feed",
    title: "Simulated EO/IR Feed",
    description:
      "Default generated HUD feed for testing AI overlays without external video files.",
    sourceName: "AeroNexus Sim",
    license: "Internal simulation",
    category: "simulation",
  },
  {
    id: "city-surveillance",
    title: "Drone City Surveillance",
    description:
      "Aerial urban-style drone footage for surveillance and tracking UI testing.",
    sourceName: "Open Stock Video",
    license: "Check clip license",
    category: "surveillance",
    src: "/videos/drone-city-surveillance.mp4",
  },
  {
    id: "disaster-response",
    title: "Disaster Response Flight",
    description:
      "Aerial rescue/disaster-style footage for smoke, heat, and emergency review UI.",
    sourceName: "Open Stock Video",
    license: "Check clip license",
    category: "disaster",
    src: "/videos/drone-disaster-response.mp4",
  },
  {
    id: "forest-patrol",
    title: "Forest Patrol Flight",
    description:
      "Outdoor aerial footage for perimeter scan, forest patrol, and monitoring tests.",
    sourceName: "Open Stock Video",
    license: "Check clip license",
    category: "patrol",
    src: "/videos/drone-forest-patrol.mp4",
  },
];

type Tone = "nominal" | "caution" | "critical" | "info" | "muted";

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

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: string;
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

            <h2 className="mt-1 text-[18px] font-semibold leading-tight text-(--foreground)">
              {title}
            </h2>
          </div>

          {action && (
            <span className="inline-flex w-fit rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
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

      <div className={`mt-4 font-mono text-[24px] font-bold uppercase ${toneStyle.text}`}>
        {value}
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        {helper}
      </p>
    </div>
  );
}

export function CameraAI() {
  const { telemetry, sources, error } = useUnifiedTelemetry();

  const [selectedVideo, setSelectedVideo] = useState<CameraVideoSource>(
    videoSources[0]
  );

  const [openCvAnalysis, setOpenCvAnalysis] =
    useState<CameraOpenCvAnalysis | null>(null);

  const [annotatedVideoUrl, setAnnotatedVideoUrl] = useState<string | null>(
    null
  );

  const [isAnnotatingVideo, setIsAnnotatingVideo] = useState(false);
  const [annotatorError, setAnnotatorError] = useState<string | null>(null);

  const risk = telemetry?.risk ?? openCvAnalysis?.risk ?? "low";

  const confidence = Math.round(
    ((telemetry?.ml?.confidence ?? openCvAnalysis?.detections.confidence) ?? 0) *
      100
  );

  const cameraSource = sources.find((source) => source.source === "camera_ml");
  const cameraOnline = Boolean(cameraSource?.connected);
  const isAnnotatedPlayback = Boolean(annotatedVideoUrl);

  function selectVideo(video: CameraVideoSource) {
    setSelectedVideo(video);
    setOpenCvAnalysis(null);
    setAnnotatedVideoUrl(null);
    setAnnotatorError(null);
  }

  async function generateAnnotatedVideo() {
    if (!selectedVideo.src) {
      setAnnotatorError(
        "Simulated feed has no local MP4 file. Select city, disaster, or forest video."
      );
      return;
    }

    setIsAnnotatingVideo(true);
    setAnnotatorError(null);
    setAnnotatedVideoUrl(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/camera-ai/annotate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        annotated_video_url: string;
        mode?: string;
        preferred_model?: string;
        loaded_model?: string;
        fallback_model?: string;
        cuda_available?: boolean;
        gpu?: string | null;
      } = await response.json();

      const separator = result.annotated_video_url.includes("?") ? "&" : "?";

      setAnnotatedVideoUrl(
        `${BACKEND_URL}${result.annotated_video_url}${separator}t=${Date.now()}`
      );
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
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Aerial Intelligence
              </p>

              <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-(--foreground)">
                Camera AI Analytics
              </h1>

              <p className="mt-2 max-w-5xl text-[14px] leading-relaxed text-(--muted)">
                Live video HUD, GPU YOLO detection, OpenCV frame analysis,
                person and vehicle accuracy monitoring, disaster feature matrix,
                risk scoring, event ledger, and assisted review.
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

              <StatusChip icon={Video} label={`${cameraStatus.fps} FPS`} tone="caution" />
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
            tone={risk === "low" ? "nominal" : risk === "medium" ? "info" : "caution"}
          />

          <SummaryCard
            icon={Cpu}
            label="Pipeline"
            value="YOLO + CV"
            helper="Detection, frame analysis, and event extraction"
            tone="caution"
          />
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Live Vision"
              title="AI Video Panel"
              action={isAnnotatedPlayback ? "Annotated Stream" : selectedVideo.title}
            >
              <AiVideoPanel
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
          </div>

          <div className="grid gap-6 xl:col-span-4">
            <SectionShell
              eyebrow="Analytics"
              title="AI Detection Summary"
              action="Live Review"
            >
              <AiAnalyticsPanel />
            </SectionShell>

            <SectionShell
              eyebrow="OpenCV"
              title="Frame Analysis"
              action="Local Video"
            >
              <OpenCvAnalysisPanel
                selectedVideo={selectedVideo}
                analysis={openCvAnalysis}
                onAnalysisComplete={setOpenCvAnalysis}
              />
            </SectionShell>

            <SectionShell
              eyebrow="Controls"
              title="Camera Controls"
              action="Operator"
            >
              <CameraControls />
            </SectionShell>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Disaster Intelligence"
              title="Feature Matrix"
              action="Correlated Cues"
            >
              <DisasterFeatureMatrixPanel analysis={openCvAnalysis} />
            </SectionShell>
          </div>

          <div className="xl:col-span-4">
            <SectionShell
              eyebrow="Source Library"
              title="Video Source Selection"
              action="4 Feeds"
            >
              <VideoSourceLibrary
                selectedVideoId={selectedVideo.id}
                videos={videoSources}
                onSelectVideo={selectVideo}
              />
            </SectionShell>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-3">
          <SectionShell
            eyebrow="Accuracy"
            title="Detection Accuracy"
            action="Threshold 0.30"
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
          >
            <AiRiskMatrix />
          </SectionShell>

          <SectionShell
            eyebrow="Performance"
            title="Model Performance"
            action="Inference"
          >
            <ModelPerformancePanel />
          </SectionShell>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <SectionShell
              eyebrow="Model Flow"
              title="Detection Pipeline"
              action="VisionOps AI"
            >
              <ModelPipeline />
            </SectionShell>
          </div>

          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Event Ledger"
              title="Detection Event Ledger"
              action="Mission Review"
            >
              <DetectionEventLedger />
            </SectionShell>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Sparkles}
            label="AI Assist"
            value="Enabled"
            helper="Assisted review supports, not replaces, operator judgment."
            tone="nominal"
          />

          <SummaryCard
            icon={ScanSearch}
            label="Frame Review"
            value="Active"
            helper="Selected video can be analysed through OpenCV pipeline."
            tone="info"
          />

          <SummaryCard
            icon={Camera}
            label="Video Source"
            value={selectedVideo.category}
            helper={selectedVideo.sourceName}
            tone="caution"
          />

          <SummaryCard
            icon={ShieldCheck}
            label="Safety Mode"
            value="Human-in-loop"
            helper="Operator remains responsible for mission decisions."
            tone="nominal"
          />
        </section>
      </div>
    </div>
  );
}