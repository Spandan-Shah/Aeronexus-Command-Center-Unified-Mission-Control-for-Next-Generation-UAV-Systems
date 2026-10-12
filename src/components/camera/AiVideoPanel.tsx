import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  ExternalLink,
  Radar,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import type {
  CameraOpenCvAnalysis,
} from "./OpenCvAnalysisPanel";

/* =========================================================
   Types
   ========================================================= */

type AiVideoPanelProps = {
  videoSrc?: string;
  videoTitle?: string;
  videoSourceName?: string;

  openCvAnalysis?:
    CameraOpenCvAnalysis | null;

  isAnnotatedPlayback?: boolean;
};

/* =========================================================
   Helpers
   ========================================================= */

function getRiskClass(
  risk?: string,
) {
  if (
    risk === "critical"
  ) {
    return "text-[#FF5A63]";
  }

  if (
    risk === "high"
  ) {
    return "text-[#F6B23C]";
  }

  if (
    risk === "medium"
  ) {
    return "text-[#5AA9FF]";
  }

  return "text-[#59D99A]";
}

function getRiskBorderClass(
  risk?: string,
) {
  if (
    risk === "critical"
  ) {
    return "border-[rgba(255,90,99,0.34)]";
  }

  if (
    risk === "high"
  ) {
    return "border-[rgba(246,178,60,0.34)]";
  }

  if (
    risk === "medium"
  ) {
    return "border-[rgba(90,169,255,0.32)]";
  }

  return "border-[rgba(89,217,154,0.3)]";
}

/* =========================================================
   Generated Fallback
   ========================================================= */

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
    <div className="absolute inset-0 overflow-hidden bg-[#030609]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(90,169,255,0.15),rgba(3,4,5,0.98)_58%)]" />

      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(143,163,184,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(143,163,184,0.25)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(246,178,60,0.42)]">
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F6B23C]" />

        <div className="absolute left-1/2 top-1/2 h-px w-36 -translate-x-1/2 -translate-y-1/2 bg-[rgba(246,178,60,0.25)]" />

        <div className="absolute left-1/2 top-1/2 h-36 w-px -translate-x-1/2 -translate-y-1/2 bg-[rgba(246,178,60,0.25)]" />
      </div>

      <div className="absolute left-4 top-4 rounded-[4px] border border-white/[0.1] bg-[rgba(3,4,5,0.86)] px-2.5 py-1.5 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-[#F6B23C]">
          <Camera
            size={11}
          />

          {videoSourceName}
        </div>

        <div className="mt-0.5 max-w-[260px] truncate font-mono text-[8px] text-white/32">
          {videoTitle}
        </div>
      </div>

      {videoFailed ? (
        <div className="absolute bottom-4 left-4 rounded-[4px] border border-[rgba(246,178,60,0.26)] bg-[rgba(3,4,5,0.9)] px-2.5 py-1.5 font-mono text-[8px] uppercase text-[#F6B23C]">
          MP4 unavailable · fallback feed
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   Main
   ========================================================= */

export function AiVideoPanel({
  videoSrc,
  videoTitle =
    "Simulated EO/IR Feed",
  videoSourceName =
    "SIM-CAM-01",
  openCvAnalysis,
  isAnnotatedPlayback =
    false,
}: AiVideoPanelProps) {
  const videoRef =
    useRef<
      HTMLVideoElement | null
    >(null);

  const [
    videoFailed,
    setVideoFailed,
  ] =
    useState(
      false,
    );

  const [
    videoLoaded,
    setVideoLoaded,
  ] =
    useState(
      false,
    );

  const isMjpegStream =
    isAnnotatedPlayback &&
    Boolean(
      videoSrc?.includes(
        "/annotated-stream/",
      ),
    );

  /* =======================================================
     Source Reset
     ======================================================= */

  useEffect(
    () => {
      setVideoFailed(
        false,
      );

      setVideoLoaded(
        isMjpegStream,
      );

      const videoElement =
        videoRef.current;

      if (
        videoElement
      ) {
        videoElement.pause();

        videoElement.removeAttribute(
          "src",
        );

        videoElement.load();
      }

      if (
        !videoSrc ||
        isMjpegStream
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            const nextVideoElement =
              videoRef.current;

            if (
              !nextVideoElement
            ) {
              return;
            }

            nextVideoElement.load();

            void nextVideoElement
              .play()
              .catch(
                () => {
                  setVideoLoaded(
                    false,
                  );
                },
              );
          },
          60,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      videoSrc,
      isMjpegStream,
    ],
  );

  const showVideo =
    Boolean(
      videoSrc,
    ) &&
    !videoFailed;

  const confidence =
    Math.round(
      (
        openCvAnalysis
          ?.detections
          .confidence ??
        0
      ) *
        100,
    );

  /* =======================================================
     Render
     ======================================================= */

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-black xl:min-h-0">
      {/* ===============================================
          Video / MJPEG
          =============================================== */}

      {showVideo &&
      isMjpegStream ? (
        <img
          key={
            videoSrc
          }
          src={
            videoSrc
          }
          alt="YOLO annotated video stream"
          className="absolute inset-0 h-full w-full bg-black object-contain"
          onLoad={() =>
            setVideoLoaded(
              true,
            )
          }
          onError={() => {
            setVideoFailed(
              true,
            );

            setVideoLoaded(
              false,
            );
          }}
        />
      ) : showVideo ? (
        <video
          ref={
            videoRef
          }
          key={
            videoSrc
          }
          className="absolute inset-0 h-full w-full bg-black object-contain"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() =>
            setVideoLoaded(
              true,
            )
          }
          onLoadedData={() =>
            setVideoLoaded(
              true,
            )
          }
          onError={() => {
            setVideoFailed(
              true,
            );

            setVideoLoaded(
              false,
            );
          }}
        >
          <source
            src={
              videoSrc
            }
            type="video/mp4"
          />

          Your browser does not support video playback.
        </video>
      ) : (
        <GeneratedMissionFeed
          videoTitle={
            videoTitle
          }
          videoSourceName={
            videoSourceName
          }
          videoFailed={
            videoFailed
          }
        />
      )}

      {videoFailed ? (
        <GeneratedMissionFeed
          videoTitle={
            videoTitle
          }
          videoSourceName={
            videoSourceName
          }
          videoFailed
        />
      ) : null}

      {/* ===============================================
          Very subtle scan line texture
          =============================================== */}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:100%_6px] opacity-20" />

      {/* ===============================================
          Source
          =============================================== */}

      <div className="absolute left-3 top-3 z-30 flex max-w-[65%] items-center gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5 rounded-[4px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-2 py-1.5 backdrop-blur">
          <Camera
            size={11}
            className="shrink-0 text-[#F6B23C]"
          />

          <span className="truncate font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white/58">
            {videoSourceName}
          </span>
        </span>

        {videoSrc &&
        !videoFailed ? (
          <a
            href={
              videoSrc
            }
            target="_blank"
            rel="noreferrer"
            className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[4px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] text-white/36 transition hover:text-[#5AA9FF]"
            aria-label="Open video feed"
          >
            <ExternalLink
              size={11}
            />
          </a>
        ) : null}
      </div>

      {/* ===============================================
          Feed Mode
          =============================================== */}

      <div className="absolute right-3 top-3 z-30 rounded-[4px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-2.5 py-1.5 text-right backdrop-blur">
        <div
          className={[
            "font-mono text-[8px] font-semibold uppercase tracking-[0.055em]",

            isMjpegStream
              ? "text-[#59D99A]"
              : "text-[#5AA9FF]",
          ].join(" ")}
        >
          {isMjpegStream
            ? "YOLO LIVE"
            : videoFailed ||
                !videoSrc
              ? "SIMULATION"
              : "SOURCE FEED"}
        </div>

        <div className="mt-0.5 font-mono text-[7px] uppercase text-white/28">
          {isMjpegStream
            ? "annotated frames"
            : "native video"}
        </div>
      </div>

      {/* ===============================================
          Analysis State
          =============================================== */}

      {openCvAnalysis &&
      !isAnnotatedPlayback ? (
        <div
          className={[
            "absolute right-3 top-[58px] z-30 rounded-[4px] border",

            "bg-[rgba(3,4,5,0.9)] px-2.5 py-1.5 backdrop-blur",

            getRiskBorderClass(
              openCvAnalysis.risk,
            ),
          ].join(" ")}
        >
          <div
            className={[
              "font-mono text-[8px] font-semibold uppercase tracking-[0.055em]",

              getRiskClass(
                openCvAnalysis.risk,
              ),
            ].join(" ")}
          >
            {
              openCvAnalysis.risk
            }{" "}
            risk
          </div>

          <div className="mt-0.5 font-mono text-[7px] uppercase text-white/28">
            confidence{" "}
            {confidence}%
          </div>
        </div>
      ) : null}

      {/* ===============================================
          Loading
          =============================================== */}

      {videoSrc &&
      !videoFailed &&
      !videoLoaded ? (
        <div className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-[5px] border border-[rgba(246,178,60,0.28)] bg-[rgba(3,4,5,0.94)] px-4 py-3 text-center backdrop-blur">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-[#F6B23C]">
            Loading video feed
          </div>
        </div>
      ) : null}

      {/* ===============================================
          Bottom left model state
          =============================================== */}

      <div className="absolute bottom-3 left-3 z-30 rounded-[4px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-2.5 py-1.5 backdrop-blur">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.055em] text-[#5AA9FF]">
          <Radar
            size={10}
          />

          {isMjpegStream
            ? "YOLO + CV LIVE"
            : openCvAnalysis
              ? "ANALYSIS AVAILABLE"
              : "VISION READY"}
        </div>

        <div className="mt-0.5 max-w-[320px] truncate font-mono text-[7px] text-white/26">
          {videoTitle}
        </div>
      </div>

      {/* ===============================================
          Bottom right
          =============================================== */}

      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-[4px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-2 py-1.5 font-mono text-[7px] font-semibold uppercase tracking-[0.05em] text-white/32 backdrop-blur">
        <ScanLine
          size={10}
          className="text-[#F6B23C]"
        />

        Native fit
      </div>

      {/* ===============================================
          Human-in-loop
          =============================================== */}

      <div className="absolute bottom-3 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-1.5 rounded-[4px] border border-[rgba(89,217,154,0.2)] bg-[rgba(3,4,5,0.88)] px-2 py-1.5 font-mono text-[7px] font-semibold uppercase tracking-[0.05em] text-[#59D99A] backdrop-blur lg:flex">
        <ShieldCheck
          size={10}
        />

        Human review
      </div>
    </div>
  );
}