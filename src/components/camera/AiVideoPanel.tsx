import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  CheckCircle2,
  Expand,
  ScanSearch,
  ShieldCheck,
  Shrink,
  Video,
} from "lucide-react";

import type {
  CameraOpenCvAnalysis,
} from "./OpenCvAnalysisPanel";


/* =========================================================
   Types
   ========================================================= */

type VideoFitMode =
  | "fill"
  | "native";


type AiVideoPanelProps = {
  videoSrc?:
    string;

  videoTitle:
    string;

  videoSourceName:
    string;

  openCvAnalysis:
    CameraOpenCvAnalysis | null;

  isAnnotatedPlayback?:
    boolean;
};


/* =========================================================
   Risk
   ========================================================= */

function riskClass(
  risk?:
    string,
) {
  switch (
    risk
  ) {
    case "critical":
      return {
        text:
          "text-[var(--critical)]",

        border:
          "border-[rgba(201,105,114,0.36)]",

        bg:
          "bg-[rgba(201,105,114,0.12)]",
      };

    case "high":
      return {
        text:
          "text-[var(--caution)]",

        border:
          "border-[rgba(199,155,89,0.36)]",

        bg:
          "bg-[rgba(199,155,89,0.12)]",
      };

    case "medium":
      return {
        text:
          "text-[var(--info)]",

        border:
          "border-[rgba(93,135,163,0.36)]",

        bg:
          "bg-[rgba(93,135,163,0.12)]",
      };

    default:
      return {
        text:
          "text-[var(--nominal)]",

        border:
          "border-[rgba(100,142,120,0.36)]",

        bg:
          "bg-[rgba(100,142,120,0.12)]",
      };
  }
}


/* =========================================================
   Player
   ========================================================= */

export function AiVideoPanel({
  videoSrc,
  videoTitle,
  videoSourceName,
  openCvAnalysis,
  isAnnotatedPlayback = false,
}: AiVideoPanelProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );


  /*
   * FILL is the default.
   *
   * This is the important change:
   * portrait / narrow footage will now fill the
   * MissionNexus viewport instead of leaving black bars.
   */
  const [
    fitMode,
    setFitMode,
  ] =
    useState<VideoFitMode>(
      "fill",
    );


  const [
    sourceResolution,
    setSourceResolution,
  ] =
    useState(
      "—",
    );


  const risk =
    openCvAnalysis?.risk ??
    "low";


  const riskStyle =
    riskClass(
      risk,
    );


  /* =======================================================
     Reset when source changes
     ======================================================= */

  useEffect(
    () => {
      /*
       * Always return a newly selected source to Fill mode.
       * That way every dropdown video occupies the complete
       * Vision Intelligence viewport.
       */
      setFitMode(
        "fill",
      );

      setSourceResolution(
        "—",
      );
    },
    [
      videoSrc,
    ],
  );


  /* =======================================================
     Autoplay
     ======================================================= */

  useEffect(
    () => {
      const video =
        videoRef.current;

      if (
        !video ||
        !videoSrc
      ) {
        return;
      }

      const play =
        async () => {
          try {
            await video.play();
          } catch {
            /*
             * Muted videos normally autoplay.
             * If the browser blocks autoplay,
             * the video remains available to the user.
             */
          }
        };

      void play();
    },
    [
      videoSrc,
    ],
  );


  /* =======================================================
     Metadata
     ======================================================= */

  function handleLoadedMetadata() {
    const video =
      videoRef.current;

    if (
      !video
    ) {
      return;
    }

    setSourceResolution(
      `${video.videoWidth} × ${video.videoHeight}`,
    );
  }


  /* =======================================================
     Render
     ======================================================= */

  return (
    <div
      className={[
        "relative h-full min-h-[640px] w-full",

        "overflow-hidden",

        "bg-[#050607]",

        "text-[var(--foreground)]",
      ].join(" ")}
    >
      {/* ===================================================
          Video
          =================================================== */}

      {videoSrc ? (
        <video
          ref={
            videoRef
          }
          src={
            videoSrc
          }
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={
            handleLoadedMetadata
          }
          className={[
            "absolute inset-0",

            "h-full w-full",

            "select-none",

            "transition-[object-fit] duration-200",

            /*
             * FILL:
             * fills the entire viewport.
             *
             * NATIVE:
             * preserves the whole frame and may show
             * black side bars depending on the source.
             */
            fitMode ===
            "fill"
              ? "object-cover"
              : "object-contain",

            "object-center",

            "bg-black",
          ].join(" ")}
        />
      ) : (
        <div
          className={[
            "absolute inset-0",

            "flex items-center justify-center",

            "bg-[#07090C]",
          ].join(" ")}
        >
          <div className="max-w-[440px] px-6 text-center">
            <div
              className={[
                "mx-auto flex h-14 w-14 items-center justify-center",

                "rounded-[10px] border",

                "border-[rgba(93,135,163,0.28)]",

                "bg-[rgba(93,135,163,0.10)]",

                "text-[var(--info)]",
              ].join(" ")}
            >
              <Video
                size={
                  24
                }
                strokeWidth={
                  1.6
                }
              />
            </div>

            <h3 className="mt-4 text-[17px] font-semibold text-[var(--foreground)]">
              Reserved Video Feed
            </h3>

            <p className="mt-2 text-[13px] leading-[1.6] text-[var(--muted)]">
              Add the assigned MP4 file to
              <span className="font-mono text-[var(--info)]">
                {" "}
                public/videos/
              </span>
              .
            </p>
          </div>
        </div>
      )}


      {/* ===================================================
          Subtle Video Treatment
          =================================================== */}

      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-0",

          "bg-[linear-gradient(180deg,rgba(0,0,0,0.10)_0%,transparent_18%,transparent_78%,rgba(0,0,0,0.18)_100%)]",
        ].join(" ")}
      />


      {/* ===================================================
          Top Left — Source
          =================================================== */}

      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <div
          className={[
            "flex min-h-[36px] items-center gap-2",

            "rounded-[6px] border",

            "border-[rgba(176,138,88,0.30)]",

            "bg-[rgba(7,9,12,0.86)]",

            "px-3",

            "backdrop-blur-md",

            "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
          ].join(" ")}
        >
          <Camera
            size={
              14
            }
            strokeWidth={
              1.7
            }
            className="text-[var(--primary)]"
          />

          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.045em] text-[#D4DADE]">
            {videoSourceName}
          </span>
        </div>
      </div>


      {/* ===================================================
          Top Right — Feed Type
          =================================================== */}

      <div className="absolute right-4 top-4 z-20">
        <div
          className={[
            "min-w-[126px]",

            "rounded-[7px] border",

            "border-[var(--border)]",

            "bg-[rgba(7,9,12,0.86)]",

            "px-3 py-2.5",

            "text-right",

            "backdrop-blur-md",

            "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
          ].join(" ")}
        >
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.055em] text-[var(--info)]">
            {isAnnotatedPlayback
              ? "AI FEED"
              : "SOURCE FEED"}
          </div>

          <div className="mt-1 text-[11px] text-[var(--muted)]">
            {isAnnotatedPlayback
              ? "Annotated video"
              : "Native video"}
          </div>
        </div>
      </div>


      {/* ===================================================
          Bottom Left — Feed State
          =================================================== */}

      <div className="absolute bottom-4 left-4 z-20">
        <div
          className={[
            "rounded-[7px] border",

            "border-[rgba(93,135,163,0.28)]",

            "bg-[rgba(7,9,12,0.88)]",

            "px-3 py-2.5",

            "backdrop-blur-md",

            "shadow-[0_8px_24px_rgba(0,0,0,0.30)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <ScanSearch
              size={
                14
              }
              strokeWidth={
                1.7
              }
              className="text-[var(--info)]"
            />

            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--info)]">
              Vision Ready
            </span>
          </div>

          <div className="mt-1.5 max-w-[260px] truncate text-[11px] text-[var(--muted)]">
            {videoTitle}
          </div>

          <div className="mt-1 font-mono text-[9px] text-[var(--muted-soft)]">
            {sourceResolution}
          </div>
        </div>
      </div>


      {/* ===================================================
          Bottom Center — Human Review
          =================================================== */}

      <div
        className={[
          "absolute bottom-4 left-1/2 z-20",

          "-translate-x-1/2",
      ].join(" ")}
      >
        <div
          className={[
            "flex h-[36px] items-center gap-2",

            "rounded-[6px] border",

            "border-[rgba(100,142,120,0.30)]",

            "bg-[rgba(7,9,12,0.88)]",

            "px-3",

            "backdrop-blur-md",
          ].join(" ")}
        >
          <ShieldCheck
            size={
              14
            }
            strokeWidth={
              1.7
            }
            className="text-[var(--nominal)]"
          />

          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.055em] text-[var(--nominal)]">
            Human Review
          </span>
        </div>
      </div>


      {/* ===================================================
          Risk Badge
          =================================================== */}

      {openCvAnalysis ? (
        <div className="absolute bottom-[66px] right-4 z-20">
          <div
            className={[
              "rounded-[6px] border",

              "px-3 py-2",

              "backdrop-blur-md",

              riskStyle.border,
              riskStyle.bg,
            ].join(" ")}
          >
            <div
              className={[
                "font-mono text-[10px] font-semibold uppercase tracking-[0.055em]",

                riskStyle.text,
              ].join(" ")}
            >
              Risk · {risk}
            </div>
          </div>
        </div>
      ) : null}


      {/* ===================================================
          Bottom Right — Fit Mode

          Default is FILL FRAME.
          User can switch back to Native Fit if required.
          =================================================== */}

      <div className="absolute bottom-4 right-4 z-20">
        <button
          type="button"
          onClick={() =>
            setFitMode(
              (
                current,
              ) =>
                current ===
                "fill"
                  ? "native"
                  : "fill",
            )
          }
          className={[
            "flex h-[38px] items-center gap-2",

            "rounded-[6px] border",

            fitMode ===
            "fill"
              ? "border-[rgba(176,138,88,0.34)] bg-[rgba(176,138,88,0.14)] text-[var(--primary)]"
              : "border-[var(--border)] bg-[rgba(7,9,12,0.88)] text-[var(--muted)]",

            "px-3",

            "backdrop-blur-md",

            "transition-[background-color,border-color,color] duration-150",

            "hover:border-[var(--border-strong)]",
          ].join(" ")}
        >
          {fitMode ===
          "fill" ? (
            <Shrink
              size={
                14
              }
              strokeWidth={
                1.7
              }
            />
          ) : (
            <Expand
              size={
                14
              }
              strokeWidth={
                1.7
              }
            />
          )}

          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.045em]">
            {fitMode ===
            "fill"
              ? "Fill Frame"
              : "Native Fit"}
          </span>
        </button>
      </div>


      {/* ===================================================
          Annotated Indicator
          =================================================== */}

      {isAnnotatedPlayback ? (
        <div className="absolute left-4 top-[64px] z-20">
          <div
            className={[
              "flex h-[32px] items-center gap-2",

              "rounded-[5px] border",

              "border-[rgba(100,142,120,0.30)]",

              "bg-[rgba(7,9,12,0.85)]",

              "px-2.5",

              "backdrop-blur-md",
            ].join(" ")}
          >
            <CheckCircle2
              size={
                12
              }
              strokeWidth={
                1.7
              }
              className="text-[var(--nominal)]"
            />

            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.055em] text-[var(--nominal)]">
              Annotated Playback
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}