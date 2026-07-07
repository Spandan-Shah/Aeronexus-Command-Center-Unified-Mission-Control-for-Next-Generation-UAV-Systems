import { Crosshair, Home, MapPin, Shield } from "lucide-react";

export function MissionPlanningMap() {
  return (
    <div className="relative h-full min-h-130 overflow-hidden rounded border border-(--border) bg-[#081320] bg-tactical-grid">
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 15 78 L 28 64 L 42 55 L 58 45 L 72 36 L 60 55 L 42 64 L 15 78"
          stroke="var(--primary)"
          strokeWidth="0.55"
          strokeDasharray="1.4 1.2"
          fill="none"
        />

        <polygon
          points="20,18 82,22 88,72 18,82"
          stroke="var(--caution)"
          strokeWidth="0.45"
          strokeDasharray="1.5 1"
          fill="rgba(246,178,60,0.05)"
        />
      </svg>

      <div className="absolute left-3 top-3 text-hud text-[10px]">
        <div className="text-(--muted)">Planning Surface</div>
        <div className="text-(--foreground)">AeroNexus Mission Grid</div>
      </div>

      <div className="absolute right-3 top-3 text-right text-hud text-[10px]">
        <div className="text-(--muted)">Mission</div>
        <div className="text-(--primary)">SURVEY-ALPHA</div>
      </div>

      <div className="absolute left-[15%] top-[78%] -translate-x-1/2 -translate-y-1/2 text-(--nominal)">
        <div className="relative">
          <Home size={18} />
          <span className="absolute left-6 top-0 text-hud text-[10px] text-(--nominal)">
            HOME
          </span>
        </div>
      </div>

      {[
        { id: 1, left: "28%", top: "64%" },
        { id: 2, left: "42%", top: "55%" },
        { id: 3, left: "58%", top: "45%" },
        { id: 4, left: "72%", top: "36%" },
        { id: 5, left: "60%", top: "55%" },
        { id: 6, left: "42%", top: "64%" },
      ].map((point) => (
        <div
          key={point.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-(--primary)"
          style={{ left: point.left, top: point.top }}
        >
          <div className="relative">
            <MapPin size={18} />
            <span className="absolute left-5 -top-1 text-hud text-[9px]">
              WP-{point.id}
            </span>
          </div>
        </div>
      ))}

      <div className="absolute left-[82%] top-[22%] -translate-x-1/2 -translate-y-1/2 text-(--caution)">
        <div className="relative">
          <Shield size={20} />
          <span className="absolute left-6 -top-1 text-hud text-[10px]">
            GEOFENCE
          </span>
        </div>
      </div>

      <div className="absolute left-[72%] top-[36%] -translate-x-1/2 -translate-y-1/2 text-(--critical)">
        <div className="relative">
          <Crosshair size={18} />
          <span className="absolute left-5 -top-1 text-hud text-[10px]">
            ROI
          </span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded border border-(--border) bg-[rgba(5,13,24,0.8)] px-3 py-2 text-hud text-[10px]">
        <div className="text-(--muted)">Route</div>
        <div className="text-(--foreground)">7 points · 4.8 km · 18 min</div>
      </div>

      <div className="absolute bottom-3 right-3 rounded border border-(--border) bg-[rgba(5,13,24,0.8)] px-3 py-2 text-hud text-[10px]">
        <div className="text-(--muted)">Safety</div>
        <div className="text-(--nominal)">Geofence active</div>
      </div>
    </div>
  );
}