import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ExternalLink,
  Radar,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import type { CameraOpenCvAnalysis } from "./OpenCvAnalysisPanel";

type AiVideoPanelProps = {
  videoSrc?: string;
  videoTitle?: string;
  videoSourceName?: string;
  openCvAnalysis?: CameraOpenCvAnalysis | null;
  isAnnotatedPlayback?: boolean;
};

function getRiskClass(risk?: string) {
  if (risk === "critical") return "text-(--critical)";
  if (risk === "high") return "text-(--caution)";
  if (risk === "medium") return "text-(--info)";
  return "text-(--nominal)";
}

function getRiskBorderClass(risk?: string) {
  if (risk === "critical") return "border-(--critical)";
  if (risk === "high") return "border-(--caution)";
  if (risk === "medium") return "border-(--info)";
  return "border-(--nominal)";
}

function GeneratedMissionFeed({
  videoTitle,
  videoSourceName,
  videoFailed,
}: {
  videoTitle: string;
  videoSourceName: string;
  videoFailed: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#061018]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(73,229,143,0.22),rgba(5,13,24,0.96)_58%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(143,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(143,163,184,0.22)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="absolute left-[44%] top-[42%] h-24 w-24 rounded-full border border-[rgba(246,178,60,0.5)] bg-[rgba(246,178,60,0.08)]">
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--primary)" />
      </div>

      <div className="absolute left-5 top-5 rounded border border-[#1d2533] bg-[#050609]/88 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--primary)">
          <Camera size={13} />
          {videoSourceName}
        </div>

        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-(--muted)">
          {videoTitle}
        </div>
      </div>

      <div className="absolute right-5 top-5 rounded border border-[#1d2533] bg-[#050609]/88 px-3 py-2 text-right backdrop-blur">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--nominal)">
          Generated mission feed
        </div>

        <div className="mt-1 font-mono text-[8px] uppercase text-(--muted)">
          Live tactical simulation
        </div>
      </div>

      {videoFailed && (
        <div className="absolute left-5 bottom-16 rounded border border-[rgba(246,178,60,0.34)] bg-[rgba(246,178,60,0.08)] px-3 py-2 backdrop-blur">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--primary)">
            MP4 unavailable · check public/videos path
          </div>
        </div>
      )}
    </div>
  );
}

export function AiVideoPanel({
  videoSrc,
  videoTitle = "Simulated EO/IR Feed",
  videoSourceName = "SIM-CAM-01",
  openCvAnalysis,
  isAnnotatedPlayback = false,
}: AiVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const isMjpegStream =
    isAnnotatedPlayback && Boolean(videoSrc?.includes("/annotated-stream/"));

  useEffect(() => {
    setVideoFailed(false);
    setVideoLoaded(isMjpegStream);

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.pause();
      videoElement.removeAttribute("src");
      videoElement.load();
    }

    if (!videoSrc || isMjpegStream) return;

    window.setTimeout(() => {
      const nextVideoElement = videoRef.current;

      if (!nextVideoElement) return;

      nextVideoElement.load();

      void nextVideoElement.play().catch(() => {
        setVideoLoaded(false);
      });
    }, 60);
  }, [videoSrc, isMjpegStream]);

  const showVideo = Boolean(videoSrc) && !videoFailed;

  const confidence = Math.round(
    (openCvAnalysis?.detections.confidence ?? 0) * 100
  );

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-[#1d2533] bg-black 2xl:min-h-[620px]">
      {showVideo && isMjpegStream ? (
        <img
          key={videoSrc}
          src={videoSrc}
          alt="Frame-by-frame YOLO annotated stream"
          className="absolute inset-0 h-full w-full bg-black object-contain"
          onLoad={() => setVideoLoaded(true)}
          onError={() => {
            setVideoFailed(true);
            setVideoLoaded(false);
          }}
        />
      ) : showVideo ? (
        <video
          ref={videoRef}
          key={videoSrc}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoLoaded(true)}
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => {
            setVideoFailed(true);
            setVideoLoaded(false);
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support MP4 video playback.
        </video>
      ) : (
        <GeneratedMissionFeed
          videoTitle={videoTitle}
          videoSourceName={videoSourceName}
          videoFailed={videoFailed}
        />
      )}

      {videoFailed && (
        <GeneratedMissionFeed
          videoTitle={videoTitle}
          videoSourceName={videoSourceName}
          videoFailed={videoFailed}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:100%_5px] opacity-20" />

      <div className="absolute left-4 top-4 z-30 flex max-w-[78%] flex-wrap gap-2">
        <span className="flex items-center gap-2 rounded bg-[#050609]/88 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-(--primary)">
          <Camera size={13} />
          {videoSourceName}
        </span>

        <span className="rounded bg-[#050609]/88 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-(--muted)">
          {videoTitle}
        </span>

        {videoSrc && !videoFailed && (
          <a
            href={videoSrc}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded bg-[#050609]/88 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-(--nominal) hover:text-(--primary)"
          >
            <ExternalLink size={12} />
            Open Feed
          </a>
        )}
      </div>

      <div className="absolute right-4 top-4 z-30 rounded border border-[#1d2533] bg-[#050609]/88 px-3 py-2 text-right backdrop-blur">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--primary)">
          {isMjpegStream
            ? "Live YOLO MJPEG Stream"
            : videoFailed || !videoSrc
              ? "Generated Tactical Feed"
              : "YOLO Camera Feed"}
        </div>

        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted)">
          {isMjpegStream
            ? "Frame-by-frame boxes"
            : videoFailed || !videoSrc
              ? "Fallback mode"
              : "Source video"}
        </div>
      </div>

      {openCvAnalysis && !isAnnotatedPlayback && (
        <div
          className={`absolute right-4 top-24 z-30 rounded border bg-[#050609]/90 px-3 py-2 backdrop-blur ${getRiskBorderClass(
            openCvAnalysis.risk
          )}`}
        >
          <div
            className={`font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${getRiskClass(
              openCvAnalysis.risk
            )}`}
          >
            YOLO · {openCvAnalysis.risk} Risk
          </div>

          <div className="mt-1 font-mono text-[8px] uppercase text-(--muted)">
            Confidence {confidence}% · source video preserved
          </div>
        </div>
      )}

      {isAnnotatedPlayback && (
        <div className="absolute right-4 top-24 z-30 rounded border border-(--nominal) bg-[#050609]/90 px-3 py-2 backdrop-blur">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--nominal)">
            Frame-by-frame YOLO
          </div>

          <div className="mt-1 font-mono text-[8px] uppercase text-(--muted)">
            Boxes are drawn inside streamed frames
          </div>
        </div>
      )}

      {videoSrc && !videoFailed && !videoLoaded && (
        <div className="absolute left-1/2 top-1/2 z-40 w-80 -translate-x-1/2 -translate-y-1/2 rounded border border-(--primary) bg-[#050609]/95 p-4 text-center">
          <div className="font-mono text-[12px] font-bold uppercase text-(--primary)">
            Loading camera feed
          </div>

          <div className="mt-2 break-all text-xs text-(--muted)">
            {videoSrc}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-30 rounded border border-[#1d2533] bg-[#050609]/88 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--primary)">
          <Radar size={12} />
          {isMjpegStream
            ? "Model: YOLO + fire mode · live MJPEG"
            : videoFailed || !videoSrc
              ? "Model: simulated vision feed"
              : "Model: source video"}
        </div>

        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted)">
          {isMjpegStream
            ? "Moving boxes are drawn into each streamed frame"
            : openCvAnalysis
              ? `Best frame ${
                  openCvAnalysis.frame?.best_frame_index ?? "-"
                } · source video not blurred`
              : "Select a feed above, then analyse with YOLO"}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded border border-[#1d2533] bg-[#050609]/88 px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-(--muted) backdrop-blur">
        <ScanLine size={12} className="text-(--primary)" />
        Native fit display
      </div>

      <div className="absolute left-1/2 bottom-4 z-30 hidden -translate-x-1/2 items-center gap-2 rounded border border-[rgba(73,229,143,0.28)] bg-[rgba(73,229,143,0.08)] px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-(--nominal) backdrop-blur md:flex">
        <ShieldCheck size={12} />
        Human-in-loop review
      </div>
    </div>
  );
}