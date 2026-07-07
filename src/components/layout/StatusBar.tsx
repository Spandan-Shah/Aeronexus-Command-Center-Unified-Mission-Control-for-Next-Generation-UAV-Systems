import { Battery, Clock, Radio, Satellite, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { telemetry } from "../../data/telemetry";

export function StatusBar() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 border-b border-[(--border)] bg-[(--panel)] px-4 flex items-center gap-4">
      <div>
        <h1 className="text-hud text-sm font-bold text-[(--foreground)]">
          AeroNexus Live Ops
        </h1>
        <p className="text-hud text-[10px] text-[(--muted)]">
          {telemetry.droneId} · {telemetry.model} · {telemetry.mission}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-5 text-hud text-[10px]">
        <span className="flex items-center gap-1 text-[(--nominal)]">
          <ShieldCheck size={14} /> Secure
        </span>

        <span className="flex items-center gap-1 text-[(--nominal)]">
          <Satellite size={14} /> GPS {telemetry.gpsSatellites}
        </span>

        <span className="flex items-center gap-1 text-[(--caution)]">
          <Radio size={14} /> Link {telemetry.linkQuality}%
        </span>

        <span className="flex items-center gap-1 text-[(--primary)]">
          <Battery size={14} /> {telemetry.battery}%
        </span>

        <span className="flex items-center gap-1 text-[(--muted)]">
          <Clock size={14} /> {time}
        </span>
      </div>
    </header>
  );
}