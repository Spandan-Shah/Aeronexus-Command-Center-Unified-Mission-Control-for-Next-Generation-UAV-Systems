import { useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Camera,
  Loader2,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { AiAnalyticsPanel } from "../components/camera/AiAnalyticsPanel";
import { AiRiskMatrix } from "../components/camera/AiRiskMatrix";
import { AiVideoPanel } from "../components/camera/AiVideoPanel";
import { CameraControls } from "../components/camera/CameraControls";
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
      const response = await fetch(
        "http://127.0.0.1:8000/api/camera-ai/annotate-video",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_id: selectedVideo.id,
            confidence_threshold: 0.35,
            max_frames: 900,
          }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Video annotation failed.");
      }

      const result: {
        annotated_video_url: string;
      } = await response.json();

      setAnnotatedVideoUrl(`${result.annotated_video_url}?t=${Date.now()}`);
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
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Camera AI Analytics
            </h1>

            <p className="mt-1 text-sm text-(--muted)">
              Live video HUD, YOLO object detection, OpenCV frame analysis,
              disaster feature matrix, risk scoring, event ledger, and assisted
              review.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateAnnotatedVideo}
              disabled={isAnnotatingVideo || !selectedVideo.src}
              className="flex items-center gap-2 rounded border border-(--primary) bg-[rgba(41,211,255,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnnotatingVideo ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ScanSearch size={14} />
              )}
              {isAnnotatingVideo ? "Annotating..." : "Live YOLO Video"}
            </button>

            <span
              className={`flex items-center gap-2 rounded border px-3 py-2 text-hud text-[10px] ${
                cameraOnline
                  ? "border-(--nominal) bg-[rgba(73,229,143,0.08)] text-(--nominal)"
                  : "border-(--border) bg-[#07111f] text-(--muted)"
              }`}
            >
              <Camera size={14} />
              {cameraOnline ? "Camera Online" : "Camera Sim"}
            </span>

            <span className="flex items-center gap-2 rounded border border-(--primary) bg-[rgba(41,211,255,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary)">
              <BrainCircuit size={14} />
              {confidence}% Confidence
            </span>

            <span
              className={`flex items-center gap-2 rounded border px-3 py-2 text-hud text-[10px] uppercase ${getRiskClass(
                risk
              )}`}
            >
              {risk === "low" ? (
                <ShieldCheck size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              {risk} Risk
            </span>

            <span className="flex items-center gap-2 rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary)">
              <Camera size={14} />
              {cameraStatus.fps} FPS
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-3 py-2 text-xs text-(--critical)">
            Backend offline: {error}
          </div>
        )}

        {annotatorError && (
          <div className="mt-3 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-3 py-2 text-xs text-(--critical)">
            Annotator error: {annotatorError}
          </div>
        )}

        {isAnnotatedPlayback && (
          <div className="mt-3 rounded border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-3 py-2 text-xs text-(--nominal)">
            Frame-by-frame YOLO annotated video is active. Boxes are now drawn
            directly on each video frame.
          </div>
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <section className="xl:col-span-8">
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
        </section>

        <aside className="space-y-3 xl:col-span-4">
          <AiAnalyticsPanel />

          <OpenCvAnalysisPanel
            selectedVideo={selectedVideo}
            analysis={openCvAnalysis}
            onAnalysisComplete={setOpenCvAnalysis}
          />

          <CameraControls />
        </aside>

        <section className="xl:col-span-8">
          <DisasterFeatureMatrixPanel analysis={openCvAnalysis} />
        </section>

        <section className="xl:col-span-4">
          <VideoSourceLibrary
            selectedVideoId={selectedVideo.id}
            videos={videoSources}
            onSelectVideo={selectVideo}
          />
        </section>

        <section className="xl:col-span-4">
          <AiRiskMatrix />
        </section>

        <section className="xl:col-span-4">
          <ModelPerformancePanel />
        </section>

        <section className="xl:col-span-4">
          <ModelPipeline />
        </section>

        <section className="xl:col-span-8">
          <DetectionEventLedger />
        </section>
      </div>
    </div>
  );
}