import { useState } from "react";
import { Camera, Crosshair, Maximize2, ScanLine } from "lucide-react";

type AiVideoPanelProps = {
  videoSrc?: string;
  videoTitle?: string;
  videoSourceName?: string;
};

export function AiVideoPanel({
  videoSrc,
  videoTitle = "Simulated EO/IR Feed",
  videoSourceName = "SIM-CAM-01",
}: AiVideoPanelProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  const showVideo = Boolean(videoSrc) && !videoFailed;

  return (
    <div className="relative h-135 overflow-hidden rounded border border-(--border) bg-[#07111f]">
      {showVideo ? (
        <video
          key={videoSrc}
          src={videoSrc}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(73,229,143,0.18),rgba(5,13,24,0.96)_58%)]" />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(rgba(41,211,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(41,211,255,0.04)_1px,transparent_1px)] bg-[size:12px_12px]" />

      <div className="absolute inset-0 bg-[rgba(5,13,24,0.18)]" />

      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
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
      </div>

      {videoFailed && (
        <div className="absolute left-1/2 top-1/2 z-30 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded border border-(--critical) bg-[#050d18]/95 p-4 text-center">
          <div className="text-hud text-sm text-(--critical)">
            Video failed to load
          </div>
          <div className="mt-2 text-xs text-(--muted)">
            Check file exists inside public/videos and file name matches exactly.
          </div>
        </div>
      )}

      <div className="absolute right-3 top-3 text-right text-hud text-[10px]">
        <div className="text-(--primary)">ZOOM 4.2X</div>
        <div className="mt-1 text-(--muted)">FOV 22°</div>
        <div className="mt-1 text-(--muted)">28 FPS</div>
      </div>

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
        <Maximize2 size={15} className="text-(--muted)" />
      </div>
    </div>
  );
}