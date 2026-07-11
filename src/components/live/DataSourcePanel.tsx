import {
  Cpu,
  Radio,
  Satellite,
  ShieldCheck,
  Usb,
  Video,
  Wifi,
} from "lucide-react";
import { Panel } from "../common/Panel";
import {
  type SourceStatus,
  type TelemetrySource,
  useUnifiedTelemetry,
} from "../../hooks/useUnifiedTelemetry";

const sourceIcon: Record<TelemetrySource, typeof Cpu> = {
  simulator: Cpu,
  esp32_usb: Usb,
  esp32_wifi: Wifi,
  mavlink: Satellite,
  lora: Radio,
  camera_ml: Video,
};

function formatLastSeen(lastSeen: string | null) {
  if (!lastSeen) return "Never";

  const time = new Date(lastSeen);
  return time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SourceRow({ source }: { source: SourceStatus }) {
  const Icon = sourceIcon[source.source];

  return (
    <div className="flex items-center justify-between rounded border border-(--border) bg-[#07111f] px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          size={14}
          className={source.connected ? "text-(--nominal)" : "text-(--muted)"}
        />

        <div className="min-w-0">
          <div className="truncate text-hud text-[10px] text-(--foreground)">
            {source.label}
          </div>

          <div className="text-hud text-[9px] text-(--muted)">
            {formatLastSeen(source.lastSeen)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div
          className={`text-hud text-[9px] ${
            source.connected ? "text-(--nominal)" : "text-(--muted)"
          }`}
        >
          {source.connected ? "ONLINE" : "OFFLINE"}
        </div>

        <div className="text-hud text-[9px] text-(--muted)">
          {source.packets} pkt
        </div>
      </div>
    </div>
  );
}

export function DataSourcePanel() {
  const { telemetry, sources, loading, error } = useUnifiedTelemetry();

  const risk = telemetry?.risk ?? "low";

  const riskClass = {
    low: "text-(--nominal)",
    medium: "text-(--info)",
    high: "text-(--caution)",
    critical: "text-(--critical)",
  }[risk];

  return (
    <Panel
      title="Data Sources"
      right={
        <span className={`text-hud text-[10px] uppercase ${riskClass}`}>
          {risk}
        </span>
      }
      className="min-h-0"
    >
      <div className="space-y-2 p-3">
        <div className="rounded border border-(--border) bg-[#07111f] p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-hud text-[10px] text-(--muted)">
                Active Device
              </div>

              <div className="mt-1 text-hud text-xs text-(--foreground)">
                {telemetry?.device ?? "Waiting for telemetry"}
              </div>
            </div>

            <ShieldCheck
              size={17}
              className={
                telemetry?.secureSession
                  ? "text-(--nominal)"
                  : "text-(--muted)"
              }
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-hud text-[9px]">
            <div>
              <div className="text-(--muted)">Temp</div>
              <div className="text-(--foreground)">
                {telemetry?.temperature ?? 0}°C
              </div>
            </div>

            <div>
              <div className="text-(--muted)">Smoke</div>
              <div className="text-(--foreground)">
                {telemetry?.smoke ?? 0}
              </div>
            </div>

            <div>
              <div className="text-(--muted)">Source</div>
              <div className="text-(--foreground)">
                {telemetry?.source ?? "none"}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-hud text-[10px] text-(--muted)">
            Loading telemetry sources...
          </div>
        )}

        {error && (
          <div className="rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-2 text-hud text-[10px] text-(--critical)">
            Backend offline: {error}
          </div>
        )}

        <div className="grid gap-1.5">
          {sources.map((source) => (
            <SourceRow key={source.source} source={source} />
          ))}
        </div>
      </div>
    </Panel>
  );
}