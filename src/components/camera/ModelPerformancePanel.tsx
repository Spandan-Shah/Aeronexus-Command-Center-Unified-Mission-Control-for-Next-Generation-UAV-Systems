import { Activity, Camera, Clock3, Cpu, Database, Timer } from "lucide-react";
import { Panel } from "../common/Panel";
import { useUnifiedTelemetry } from "../../hooks/useUnifiedTelemetry";

function PerformanceRow({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded border border-(--border) bg-[#07111f] p-3">
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-(--primary)" />

        <span className="text-hud text-xs text-(--foreground)">{value}</span>
      </div>

      <div className="mt-3 text-hud text-[10px] text-(--muted)">
        {label}
      </div>

      <div className="mt-1 text-[10px] text-(--muted)">
        {detail}
      </div>
    </div>
  );
}

export function ModelPerformancePanel() {
  const { telemetry, sources } = useUnifiedTelemetry();

  const cameraSource = sources.find((source) => source.source === "camera_ml");
  const confidence = Math.round((telemetry?.ml?.confidence ?? 0) * 100);

  const framesProcessed = cameraSource?.packets ?? 0;
  const cameraOnline = Boolean(cameraSource?.connected);

  return (
    <Panel
      title="Model Performance"
      right={
        <span
          className={`text-hud text-[10px] ${
            cameraOnline ? "text-(--nominal)" : "text-(--muted)"
          }`}
        >
          {cameraOnline ? "ONLINE" : "SIM / OFFLINE"}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 p-3">
        <PerformanceRow
          label="Camera Source"
          value={cameraOnline ? "ONLINE" : "SIM"}
          detail="Camera ML pipeline state"
          icon={Camera}
        />

        <PerformanceRow
          label="Confidence"
          value={`${confidence}%`}
          detail="Current AI detection confidence"
          icon={Activity}
        />

        <PerformanceRow
          label="Frames"
          value={String(framesProcessed)}
          detail="Processed camera packets"
          icon={Database}
        />

        <PerformanceRow
          label="Latency"
          value="42 ms"
          detail="Simulated inference latency"
          icon={Timer}
        />

        <PerformanceRow
          label="Model"
          value="YOLO"
          detail="Future detection model slot"
          icon={Cpu}
        />

        <PerformanceRow
          label="Last Frame"
          value="LIVE"
          detail="Updated from telemetry polling"
          icon={Clock3}
        />
      </div>
    </Panel>
  );
}