import {
  Battery,
  Clock,
  Cpu,
  MapPin,
  Plane,
  Radio,
  Route,
  Timer,
} from "lucide-react";
import type { Drone, DroneHealth, DroneStatus } from "../../data/drones";

type DroneCardProps = {
  drone: Drone;
};

const statusLabel: Record<DroneStatus, string> = {
  IN_MISSION: "In Mission",
  READY: "Ready",
  STANDBY: "Standby",
  CHARGING: "Charging",
  MAINTENANCE: "Maintenance",
  OFFLINE: "Offline",
};

const healthStyle: Record<DroneHealth, string> = {
  nominal: "border-(--nominal) text-(--nominal) bg-[rgba(73,229,143,0.08)]",
  caution: "border-(--caution) text-(--caution) bg-[rgba(246,178,60,0.08)]",
  critical: "border-(--critical) text-(--critical) bg-[rgba(255,77,77,0.08)]",
};

function getBatteryTone(battery: number) {
  if (battery === 0) return "text-(--muted)";
  if (battery < 35) return "text-(--critical)";
  if (battery < 60) return "text-(--caution)";
  return "text-(--nominal)";
}

function getLinkTone(linkQuality: number) {
  if (linkQuality === 0) return "text-(--muted)";
  if (linkQuality < 75) return "text-(--caution)";
  return "text-(--nominal)";
}

export function DroneCard({ drone }: DroneCardProps) {
  const batteryTone = getBatteryTone(drone.battery);
  const linkTone = getLinkTone(drone.linkQuality);

  return (
    <article className="rounded border border-(--border) bg-(--panel) p-4 transition hover:border-(--primary)">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Plane size={18} className="text-(--primary)" />
            <h2 className="text-hud text-sm font-bold text-(--foreground)">
              {drone.id}
            </h2>
          </div>

          <p className="mt-1 text-hud text-[10px] text-(--muted)">
            {drone.model}
          </p>
        </div>

        <span
          className={`rounded border px-2 py-1 text-hud text-[9px] ${
            healthStyle[drone.health]
          }`}
        >
          {statusLabel[drone.status]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded border border-(--border) bg-[#081320] p-3">
          <div className="flex items-center gap-1.5 text-hud text-[9px] text-(--muted)">
            <Battery size={13} />
            Battery
          </div>
          <div className={`mt-1 text-hud text-lg font-bold ${batteryTone}`}>
            {drone.battery > 0 ? `${drone.battery}%` : "—"}
          </div>
        </div>

        <div className="rounded border border-(--border) bg-[#081320] p-3">
          <div className="flex items-center gap-1.5 text-hud text-[9px] text-(--muted)">
            <Radio size={13} />
            Link
          </div>
          <div className={`mt-1 text-hud text-lg font-bold ${linkTone}`}>
            {drone.linkQuality > 0 ? `${drone.linkQuality}%` : "Offline"}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-(--border) pt-3 text-[11px]">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-(--muted)">
            <MapPin size={13} />
            Location
          </span>
          <span className="text-(--foreground)">{drone.location}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-(--muted)">
            <Route size={13} />
            Mission
          </span>
          <span className="text-(--foreground)">{drone.assignedMission}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-(--muted)">
            <Cpu size={13} />
            Firmware
          </span>
          <span className="text-(--foreground)">{drone.firmware}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-(--muted)">
            <Clock size={13} />
            Last Flight
          </span>
          <span className="text-(--foreground)">{drone.lastFlight}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-(--muted)">
            <Timer size={13} />
            Flight Hours
          </span>
          <span className="text-(--foreground)">{drone.flightHours}h</span>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded bg-[#050d18]">
        <div
          className="h-full bg-(--primary)"
          style={{ width: `${drone.battery}%` }}
        />
      </div>
    </article>
  );
}