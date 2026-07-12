import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Crosshair,
  ExternalLink,
  Flame,
  Maximize2,
  ScanLine,
  Waves,
} from "lucide-react";
import type { CameraOpenCvAnalysis } from "./OpenCvAnalysisPanel";

type AiVideoPanelProps = {
  videoSrc?: string;
  videoTitle?: string;
  videoSourceName?: string;
  openCvAnalysis?: CameraOpenCvAnalysis | null;
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

export function AiVideoPanel({
  videoSrc,
  videoTitle = "Simulated EO/IR Feed",
  videoSourceName = "SIM-CAM-01",
  openCvAnalysis,
}: AiVideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
    setVideoLoaded(false);

    if (!videoSrc) return;

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.load();

      void videoElement.play().catch(() => {
        // muted autoplay should normally work
      });
    }
  }, [videoSrc]);

  const showVideo = Boolean(videoSrc) && !videoFailed;
  const confidence = Math.round(
    (openCvAnalysis?.detections.confidence ?? 0) * 100
  );

  return (
    <div className="relative h-135 overflow-hidden rounded border border-(--border) bg-[#07111f]">
      {showVideo ? (
        <video
          ref={videoRef}
          key={videoSrc}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(73,229,143,0.18),rgba(5,13,24,0.96)_58%)]" />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(rgba(41,211,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(41,211,255,0.04)_1px,transparent_1px)] bg-[size:12px_12px]" />

      <div className="absolute inset-0 bg-[rgba(5,13,24,0.18)]" />

      <div className="absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-2">
        <span className="flex items-center gap-2 rounded bg-[#050d18]/85 px-3 py-1.5 text-hud text-[10px] text-(--primary)">
          <Camera size={13} />
          {videoSourceName}
        </span>

        <span className="rounded bg-[#050d18]/85 px-3 py-1.5 text-hud text-[10px] text-(--muted)">
          {videoTitle}
        </span>

        {videoSrc && (
          <span className="rounded bg-[#050d18]/85 px-3 py-1.5 text-hud text-[10px] text-(--caution)">
            {videoSrc}
          </span>
        )}

        {videoSrc && (
          <a
            href={videoSrc}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded bg-[#050d18]/85 px-3 py-1.5 text-hud text-[10px] text-(--nominal) hover:text-(--primary)"
          >
            <ExternalLink size={12} />
            Open Video
          </a>
        )}
      </div>

      {openCvAnalysis && (
        <div
          className={`absolute right-3 top-20 z-20 rounded border bg-[#050d18]/90 px-3 py-2 backdrop-blur ${getRiskBorderClass(
            openCvAnalysis.risk
          )}`}
        >
          <div className={`text-hud text-[10px] uppercase ${getRiskClass(openCvAnalysis.risk)}`}>
            OPENCV · {openCvAnalysis.risk} RISK
          </div>

          <div className="mt-1 text-hud text-[9px] text-(--muted)">
            Confidence {confidence}% · Frames{" "}
            {openCvAnalysis.frames.sampled_frames}
          </div>
        </div>
      )}

      {videoSrc && !videoFailed && !videoLoaded && (
        <div className="absolute left-1/2 top-1/2 z-30 w-80 -translate-x-1/2 -translate-y-1/2 rounded border border-(--primary) bg-[#050d18]/95 p-4 text-center">
          <div className="text-hud text-sm text-(--primary)">
            Loading video feed...
          </div>
          <div className="mt-2 break-all text-xs text-(--muted)">
            {videoSrc}
          </div>
        </div>
      )}

      {videoFailed && (
        <div className="absolute left-1/2 top-1/2 z-30 w-96 -translate-x-1/2 -translate-y-1/2 rounded border border-(--critical) bg-[#050d18]/95 p-4 text-center">
          <div className="text-hud text-sm text-(--critical)">
            Video failed to load
          </div>

          <div className="mt-2 text-xs leading-relaxed text-(--muted)">
            The file is missing, the name does not match, or the MP4 codec is
            not browser-supported.
          </div>

          {videoSrc && (
            <div className="mt-3 break-all rounded border border-(--border) bg-[#07111f] p-2 text-[10px] text-(--caution)">
              {videoSrc}
            </div>
          )}
        </div>
      )}

      <div className="absolute right-3 top-3 text-right text-hud text-[10px]">
        <div className="text-(--primary)">ZOOM 4.2X</div>
        <div className="mt-1 text-(--muted)">FOV 22°</div>
        <div className="mt-1 text-(--muted)">28 FPS</div>
      </div>

      {openCvAnalysis?.detections.fire && (
        <div className="absolute left-[18%] top-[42%] h-28 w-36 border border-(--critical)">
          <div className="absolute -top-6 left-0 flex items-center gap-1 bg-[#050d18]/90 px-1 text-hud text-[9px] text-(--critical)">
            <Flame size={11} />
            FIRE · {confidence}%
          </div>
        </div>
      )}

      {openCvAnalysis?.detections.smoke && (
        <div className="absolute left-[52%] top-[54%] h-28 w-44 border border-(--caution)">
          <div className="absolute -top-6 left-0 flex items-center gap-1 bg-[#050d18]/90 px-1 text-hud text-[9px] text-(--caution)">
            <Waves size={11} />
            SMOKE · {confidence}%
          </div>
        </div>
      )}

      {!openCvAnalysis && (
        <>
          <div className="absolute left-[22%] top-[48%] h-28 w-24 border border-(--caution)">
            <div className="absolute -top-5 left-0 bg-[#050d18]/90 px-1 text-hud text-[9px] text-(--caution)">
              PERSON · 92%
            </div>
          </div>

          <div className="absolute left-[55%] top-[60%] h-20 w-52 border border-(--primary)">
            <div className="absolute -top-5 left-0 bg-[#050d18]/90 px-1 text-hud text-[9px] text-(--primary)">
              VEHICLE · 87%
            </div>
          </div>

          <div className="absolute right-[18%] top-[28%] h-20 w-20 border border-(--critical)">
            <div className="absolute -top-6 left-0 bg-[#050d18]/90 px-1 text-hud text-[9px] text-(--critical)">
              UNKNOWN HEAT · 71%
            </div>
          </div>
        </>
      )}

      <div className="absolute left-1/2 top-1/2 h-18 w-18 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-(--caution)/70">
        <div className="absolute left-1/2 top-0 h-5 w-1 -translate-x-1/2 bg-(--caution)/70" />
        <div className="absolute bottom-0 left-1/2 h-5 w-1 -translate-x-1/2 bg-(--caution)/70" />
        <div className="absolute left-0 top-1/2 h-1 w-5 -translate-y-1/2 bg-(--caution)/70" />
        <div className="absolute right-0 top-1/2 h-1 w-5 -translate-y-1/2 bg-(--caution)/70" />
      </div>

      <div className="absolute bottom-3 left-3 text-hud text-[10px]">
        <div className="text-(--caution)">GIMBAL PITCH -32° · YAW +018°</div>
        <div className="mt-1 text-(--muted)">23.0225°N · 72.5714°E</div>
      </div>

      <div className="absolute bottom-3 right-3 rounded border border-(--border) bg-[#050d18]/85 px-2 py-1 text-hud text-[9px] text-(--muted)">
        1920 × 1080
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded border border-(--border) bg-[#050d18]/80 px-3 py-2">
        <Crosshair size={15} className="text-(--primary)" />
        <ScanLine size={15} className="text-(--caution)" />
      </div>
    </div>
  );
}