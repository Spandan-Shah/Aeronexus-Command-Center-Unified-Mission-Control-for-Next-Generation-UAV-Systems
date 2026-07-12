import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import type {
  CameraDetectionBox,
  CameraOpenCvAnalysis,
} from "./OpenCvAnalysisPanel";

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

function getDetectionBorderClass(category: CameraDetectionBox["category"]) {
  if (category === "threat") return "border-(--critical)";
  if (category === "person") return "border-(--info)";
  if (category === "vehicle") return "border-(--caution)";
  return "border-(--primary)";
}

function getDetectionTextClass(category: CameraDetectionBox["category"]) {
  if (category === "threat") return "text-(--critical)";
  if (category === "person") return "text-(--info)";
  if (category === "vehicle") return "text-(--caution)";
  return "text-(--primary)";
}

function DetectionOverlayBox({
  detection,
  frameWidth,
  frameHeight,
}: {
  detection: CameraDetectionBox;
  frameWidth: number;
  frameHeight: number;
}) {
  const left = (detection.box.x1 / frameWidth) * 100;
  const top = (detection.box.y1 / frameHeight) * 100;
  const width = ((detection.box.x2 - detection.box.x1) / frameWidth) * 100;
  const height = ((detection.box.y2 - detection.box.y1) / frameHeight) * 100;

  return (
    <div
      className={`absolute border-2 ${getDetectionBorderClass(
        detection.category
      )}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
    >
      <div
        className={`absolute -top-6 left-0 whitespace-nowrap bg-[#050d18]/95 px-1.5 py-0.5 text-hud text-[9px] ${getDetectionTextClass(
          detection.category
        )}`}
      >
        {detection.display_label.toUpperCase()} ·{" "}
        {Math.round(detection.confidence * 100)}%
      </div>
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

  useEffect(() => {
    setVideoFailed(false);
    setVideoLoaded(false);

    if (!videoSrc) return;

    const videoElement = videoRef.current;

    if (videoElement) {
      videoElement.load();

      void videoElement.play().catch(() => {
        // Muted autoplay should normally work.
      });
    }
  }, [videoSrc]);

  const showVideo = Boolean(videoSrc) && !videoFailed;

  const confidence = Math.round(
    (openCvAnalysis?.detections.confidence ?? 0) * 100
  );

  const frameWidth = openCvAnalysis?.frame?.width ?? 640;
  const frameHeight = openCvAnalysis?.frame?.height ?? 360;

  const detectionBoxes = isAnnotatedPlayback
    ? []
    : openCvAnalysis?.detections.boxes ?? [];

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

      <div className="absolute inset-0 bg-[rgba(5,13,24,0.08)]" />

      <div className="absolute left-3 top-3 z-30 flex max-w-[78%] flex-wrap gap-2">
        <span className="flex items-center gap-2 rounded bg-[#050d18]/85 px-3 py-1.5 text-hud text-[10px] text-(--primary)">
          <Camera size={13} />
          {videoSourceName}
        </span>

        <span className="rounded bg-[#050d18]/85 px-3 py-1.5 text-hud text-[10px] text-(--muted)">
          {videoTitle}
        </span>

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

      <div className="absolute right-3 top-3 z-30 text-right text-hud text-[10px]">
        <div className="text-(--primary)">
          {isAnnotatedPlayback ? "LIVE YOLO ANNOTATED FEED" : "YOLO CAMERA FEED"}
        </div>
        <div className="mt-1 text-(--muted)">Model Ready</div>
        <div className="mt-1 text-(--muted)">
          {isAnnotatedPlayback ? "Frame-by-frame" : "28 FPS"}
        </div>
      </div>

      {openCvAnalysis && !isAnnotatedPlayback && (
        <div
          className={`absolute right-3 top-20 z-30 rounded border bg-[#050d18]/90 px-3 py-2 backdrop-blur ${getRiskBorderClass(
            openCvAnalysis.risk
          )}`}
        >
          <div
            className={`text-hud text-[10px] uppercase ${getRiskClass(
              openCvAnalysis.risk
            )}`}
          >
            YOLO · {openCvAnalysis.risk} RISK
          </div>

          <div className="mt-1 text-hud text-[9px] text-(--muted)">
            Confidence {confidence}% · Boxes {detectionBoxes.length}
          </div>
        </div>
      )}

      {isAnnotatedPlayback && (
        <div className="absolute right-3 top-20 z-30 rounded border border-(--nominal) bg-[#050d18]/90 px-3 py-2 backdrop-blur">
          <div className="text-hud text-[10px] uppercase text-(--nominal)">
            FRAME-BY-FRAME YOLO
          </div>

          <div className="mt-1 text-hud text-[9px] text-(--muted)">
            Boxes are drawn inside the video frames
          </div>
        </div>
      )}

      {detectionBoxes.map((detection, index) => (
        <DetectionOverlayBox
          key={`${detection.label}-${index}`}
          detection={detection}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
        />
      ))}

      {videoSrc && !videoFailed && !videoLoaded && (
        <div className="absolute left-1/2 top-1/2 z-40 w-80 -translate-x-1/2 -translate-y-1/2 rounded border border-(--primary) bg-[#050d18]/95 p-4 text-center">
          <div className="text-hud text-sm text-(--primary)">
            Loading video feed...
          </div>

          <div className="mt-2 break-all text-xs text-(--muted)">
            {videoSrc}
          </div>
        </div>
      )}

      {videoFailed && (
        <div className="absolute left-1/2 top-1/2 z-40 w-96 -translate-x-1/2 -translate-y-1/2 rounded border border-(--critical) bg-[#050d18]/95 p-4 text-center">
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

      <div className="absolute bottom-3 left-3 z-30 text-hud text-[10px]">
        <div className="text-(--caution)">
          {isAnnotatedPlayback
            ? "MODEL: CUSTOM YOLO · ANNOTATED VIDEO MODE"
            : "MODEL: CUSTOM YOLO · BEST FRAME MODE"}
        </div>

        <div className="mt-1 text-(--muted)">
          {isAnnotatedPlayback
            ? "Frame-by-frame YOLO annotated playback"
            : openCvAnalysis
              ? `Best frame: ${openCvAnalysis.frame?.best_frame_index ?? "-"}`
              : "Run analysis to show detection boxes"}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-30 rounded border border-(--border) bg-[#050d18]/85 px-2 py-1 text-hud text-[9px] text-(--muted)">
        640 × 360 analysis
      </div>
    </div>
  );
}