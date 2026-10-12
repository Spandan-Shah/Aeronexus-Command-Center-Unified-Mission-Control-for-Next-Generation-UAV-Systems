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

type AiVideoPanelProps = {
  videoSrc?: string;
  videoTitle?: string;
  videoSourceName?: string;

  openCvAnalysis?:
    CameraOpenCvAnalysis | null;

  isAnnotatedPlayback?: boolean;
};

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

      <div className="absolute left-4 top-4 rounded-[5px] border border-white/[0.1] bg-[rgba(3,4,5,0.88)] px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] text-[#F6B23C]">
          <Camera
            size={13}
          />

          {videoSourceName}
        </div>

        <div className="mt-1 max-w-[300px] truncate text-[10px] text-white/40">
          {videoTitle}
        </div>
      </div>

      {videoFailed ? (
        <div className="absolute bottom-4 left-4 rounded-[5px] border border-[rgba(246,178,60,0.26)] bg-[rgba(3,4,5,0.9)] px-3 py-2 font-mono text-[9px] uppercase text-[#F6B23C]">
          MP4 unavailable · fallback feed
        </div>
      ) : null}
    </div>
  );
}

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

  return (
    <div className="relative h-full min-h-[440px] w-full overflow-hidden bg-black xl:min-h-0">
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

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:100%_6px] opacity-20" />

      {/* Top left */}

      <div className="absolute left-3 top-3 z-30 flex max-w-[68%] items-center gap-2">
        <span className="flex min-w-0 items-center gap-2 rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-3 py-2 backdrop-blur">
          <Camera
            size={13}
            className="shrink-0 text-[#F6B23C]"
          />

          <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-white/68">
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
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] text-white/46 transition hover:border-[rgba(90,169,255,0.3)] hover:text-[#5AA9FF]"
            aria-label="Open video feed"
          >
            <ExternalLink
              size={13}
            />
          </a>
        ) : null}
      </div>

      {/* Top right */}

      <div className="absolute right-3 top-3 z-30 min-w-[120px] rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-3 py-2 text-right backdrop-blur">
        <div
          className={[
            "font-mono text-[10px] font-semibold uppercase tracking-[0.045em]",
            isMjpegStream
              ? "text-[#59D99A]"
              : "text-[#5AA9FF]",
          ].join(" ")}
        >
          {isMjpegStream
            ? "YOLO Live"
            : videoFailed ||
                !videoSrc
              ? "Simulation"
              : "Source Feed"}
        </div>

        <div className="mt-1 text-[9px] text-white/34">
          {isMjpegStream
            ? "Annotated frames"
            : "Native video"}
        </div>
      </div>

      {/* Risk */}

      {openCvAnalysis &&
      !isAnnotatedPlayback ? (
        <div
          className={[
            "absolute right-3 top-[72px] z-30 rounded-[5px] border",
            "bg-[rgba(3,4,5,0.9)] px-3 py-2 backdrop-blur",
            getRiskBorderClass(
              openCvAnalysis.risk,
            ),
          ].join(" ")}
        >
          <div
            className={[
              "font-mono text-[10px] font-semibold uppercase tracking-[0.045em]",
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

          <div className="mt-1 text-[9px] text-white/34">
            Confidence{" "}
            {confidence}%
          </div>
        </div>
      ) : null}

      {/* Loading */}

      {videoSrc &&
      !videoFailed &&
      !videoLoaded ? (
        <div className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-[5px] border border-[rgba(246,178,60,0.28)] bg-[rgba(3,4,5,0.94)] px-5 py-3 text-center backdrop-blur">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.045em] text-[#F6B23C]">
            Loading video feed
          </div>
        </div>
      ) : null}

      {/* Bottom left */}

      <div className="absolute bottom-3 left-3 z-30 rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-[#5AA9FF]">
          <Radar
            size={12}
          />

          {isMjpegStream
            ? "YOLO + CV Live"
            : openCvAnalysis
              ? "Analysis Available"
              : "Vision Ready"}
        </div>

        <div className="mt-1 max-w-[330px] truncate text-[9px] text-white/34">
          {videoTitle}
        </div>
      </div>

      {/* Human review */}

      <div className="absolute bottom-3 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-[5px] border border-[rgba(89,217,154,0.2)] bg-[rgba(3,4,5,0.88)] px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-[#59D99A] backdrop-blur lg:flex">
        <ShieldCheck
          size={12}
        />

        Human Review
      </div>

      {/* Bottom right */}

      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 rounded-[5px] border border-white/[0.09] bg-[rgba(3,4,5,0.88)] px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-white/42 backdrop-blur">
        <ScanLine
          size={12}
          className="text-[#F6B23C]"
        />

        Native Fit
      </div>
    </div>
  );
}