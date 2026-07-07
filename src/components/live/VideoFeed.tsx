import { Camera, Focus, Video, ZoomIn } from "lucide-react";

const detections = [
  {
    id: "d1",
    label: "PERSON",
    confidence: 92,
    x: 22,
    y: 48,
    w: 9,
    h: 19,
    color: "var(--caution)",
  },
  {
    id: "d2",
    label: "VEHICLE",
    confidence: 87,
    x: 55,
    y: 60,
    w: 22,
    h: 15,
    color: "var(--info)",
  },
  {
    id: "d3",
    label: "UNKNOWN",
    confidence: 71,
    x: 74,
    y: 32,
    w: 8,
    h: 10,
    color: "var(--critical)",
  },
];

export function VideoFeed() {
  return (
    <div className="relative aspect-video overflow-hidden rounded border border-[var(--border)] bg-black scanline">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,#21452f_0%,#10262d_45%,#08111f_100%)]" />
      <div className="absolute inset-0 bg-tactical-grid-fine opacity-50" />

      {detections.map((item) => (
        <div
          key={item.id}
          className="absolute border"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.w}%`,
            height: `${item.h}%`,
            borderColor: item.color,
          }}
        >
          <div
            className="absolute -top-5 left-0 px-1 text-hud text-[9px]"
            style={{
              color: item.color,
              background: "rgba(0,0,0,0.7)",
            }}
          >
            {item.label} · {item.confidence}%
          </div>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-full w-px bg-[rgba(246,178,60,0.55)]" />
        <div className="absolute top-1/2 left-0 h-px w-full bg-[rgba(246,178,60,0.55)]" />
        <div className="absolute inset-3 rounded-full border border-[rgba(246,178,60,0.45)]" />
      </div>

      <div className="absolute left-2 top-2 flex gap-2">
        <span className="rounded bg-[var(--critical)] px-2 py-1 text-hud text-[9px] text-white">
          REC 00:14:22
        </span>
        <span className="rounded border border-[var(--border)] bg-[rgba(12,26,43,0.8)] px-2 py-1 text-hud text-[9px]">
          EO/IR CAM-01
        </span>
      </div>

      <div className="absolute right-2 top-2 text-right text-hud text-[10px] text-[var(--primary)]">
        <div>ZOOM ×4.2</div>
        <div className="text-[var(--muted)]">FOV 22°</div>
      </div>

      <div className="absolute bottom-2 left-2 text-hud text-[10px]">
        <div className="text-[var(--primary)]">GIMBAL P -32° · Y +018°</div>
        <div className="text-[var(--muted)]">23.0225°N · 72.5714°E</div>
      </div>

      <div className="absolute bottom-2 right-2 flex gap-1">
        {[ZoomIn, Focus, Camera, Video].map((Icon, index) => (
          <button
            key={index}
            className="h-8 w-8 rounded border border-[var(--border)] bg-[rgba(12,26,43,0.85)] flex items-center justify-center"
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}