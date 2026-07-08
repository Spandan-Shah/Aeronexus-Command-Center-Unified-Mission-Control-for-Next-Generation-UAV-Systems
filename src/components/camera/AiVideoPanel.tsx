import { Circle, Crosshair } from "lucide-react";
import {
  cameraStatus,
  detectionBoxes,
  type DetectionSeverity,
} from "../../data/camera";

const severityStyle: Record<DetectionSeverity, string> = {
  info: "border-(--info) text-(--info)",
  caution: "border-(--caution) text-(--caution)",
  critical: "border-(--critical) text-(--critical)",
};

export function AiVideoPanel() {
  return (
    <div className="relative aspect-video overflow-hidden rounded border border-(--border) bg-black scanline">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,#21452f_0%,#10262d_45%,#08111f_100%)]" />
      <div className="absolute inset-0 bg-tactical-grid-fine opacity-50" />

      {detectionBoxes.map((box) => (
        <div
          key={box.id}
          className={`absolute border ${severityStyle[box.severity]}`}
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
        >
          <div className="absolute -top-5 left-0 bg-black/70 px-1 text-hud text-[9px]">
            {box.label} · {box.confidence}%
          </div>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2">
        <Crosshair className="h-20 w-20 text-(--primary) opacity-60" />
      </div>

      <div className="absolute left-2 top-2 flex gap-2">
        <span className="flex items-center gap-1 rounded bg-(--critical) px-2 py-1 text-hud text-[9px] text-white">
          <Circle size={8} className="fill-current" />
          REC {cameraStatus.recordTime}
        </span>

        <span className="rounded border border-(--border) bg-[rgba(12,26,43,0.8)] px-2 py-1 text-hud text-[9px] text-(--foreground)">
          {cameraStatus.mode} · {cameraStatus.cameraId}
        </span>
      </div>

      <div className="absolute right-2 top-2 text-right text-hud text-[10px] text-(--primary)">
        <div>ZOOM {cameraStatus.zoom}</div>
        <div className="text-(--muted)">FOV {cameraStatus.fov}</div>
        <div className="text-(--muted)">{cameraStatus.fps} FPS</div>
      </div>

      <div className="absolute bottom-2 left-2 text-hud text-[10px]">
        <div className="text-(--primary)">GIMBAL {cameraStatus.gimbal}</div>
        <div className="text-(--muted)">{cameraStatus.location}</div>
      </div>

      <div className="absolute bottom-2 right-2 rounded border border-(--border) bg-[rgba(5,13,24,0.8)] px-2 py-1 text-hud text-[9px] text-(--muted)">
        {cameraStatus.resolution}
      </div>
    </div>
  );
}