import { Compass, Crosshair, Home, Layers, Minus, Plus } from "lucide-react";

export function TacticalMap() {
  return (
    <div className="relative h-full min-h-[130] overflow-hidden rounded border border-[ (--border)] bg-[#081320] bg-tactical-grid">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative h-130 w-130 max-h-[90%] max-w-[90%]">
          {[1, 0.75, 0.5, 0.25].map((scale) => (
            <div
              key={scale}
              className="absolute inset-0 rounded-full border border-[rgba(246,178,60,0.18)]"
              style={{ transform: `scale(${scale})` }}
            />
          ))}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute h-px w-full bg-[rgba(246,178,60,0.12)]" />
            <div className="absolute w-px h-full bg-[rgba(246,178,60,0.12)]" />
          </div>

          <div className="absolute inset-0 radar-sweep">
            <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left bg-[linear-gradient(45deg,rgba(246,178,60,0.20),transparent_60%)]" />
          </div>
        </div>
      </div>

      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 12 78 L 28 60 L 46 52 L 60 40 L 78 32"
          stroke=" (--primary)"
          strokeWidth="0.45"
          strokeDasharray="1.2 1.2"
          fill="none"
        />
        <polygon
          points="72,18 91,26 86,58 63,50"
          stroke=" (--caution)"
          strokeWidth="0.45"
          strokeDasharray="1.5 1"
          fill="rgba(246,178,60,0.05)"
        />
      </svg>

      <div className="absolute left-[60%] top-[40%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative text-[(--primary)]">
          <div className="pulse-dot absolute h-3 w-3 rounded-full bg-current" />
          <div className="h-3 w-3 rounded-full bg-current ring-2 ring-[rgba(246,178,60,0.35)]" />
          <div className="absolute left-5 top-0 whitespace-nowrap text-hud text-[10px]">
            <div className="text-[(--primary)]">UAV-01</div>
            <div className="text-[(--muted)]">ALT 142M · 18.4M/S</div>
          </div>
        </div>
      </div>

      <div className="absolute left-[18%] top-[76%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative text-[(--nominal)]">
          <Home size={16} />
          <span className="absolute left-5 top-0 text-hud text-[10px] whitespace-nowrap">
            HOME
          </span>
        </div>
      </div>

      <div className="absolute left-[36%] top-[63%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative text-[(--critical)]">
          <Crosshair size={18} />
          <span className="absolute left-5 -top-1 text-hud text-[10px] whitespace-nowrap">
            CONTACT-07
          </span>
        </div>
      </div>

      <div className="absolute left-3 top-3 text-hud text-[10px]">
        <div className="text-[(--muted)]">SECTOR</div>
        <div>GRID 43QCG · SIMULATION</div>
      </div>

      <div className="absolute right-3 top-3 text-right text-hud text-[10px]">
        <div className="text-[(--muted)]">DATUM WGS-84</div>
        <div>23.0225°N · 72.5714°E</div>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-hud text-[10px]">
        <Compass size={14} className="text-[(--primary)]" />
        <span>HDG 042°</span>
        <span className="text-[(--muted)]">· SCALE 1:15K</span>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {[Plus, Minus, Layers].map((Icon, index) => (
          <button
            key={index}
            className="h-8 w-8 rounded border border-[(--border)] bg-[rgba(12,26,43,0.85)] flex items-center justify-center hover:border-[ (--primary)]"
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}