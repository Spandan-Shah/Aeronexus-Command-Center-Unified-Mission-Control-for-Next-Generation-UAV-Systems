import {
  AlertTriangle,
  Camera,
  Flame,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Waves,
} from "lucide-react";
import { Panel } from "../common/Panel";
import { useUnifiedTelemetry } from "../../hooks/useUnifiedTelemetry";

function getRiskClass(risk?: string) {
  if (risk === "critical") return "text-(--critical)";
  if (risk === "high") return "text-(--caution)";
  if (risk === "medium") return "text-(--info)";
  return "text-(--nominal)";
}

function DetectionStatus({
  label,
  active,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  icon: typeof Camera;
}) {
  return (
    <div
      className={`rounded border p-3 ${
        active
          ? "border-(--critical) bg-[rgba(255,77,77,0.08)]"
          : "border-(--border) bg-[#07111f]"
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon
          size={18}
          className={active ? "text-(--critical)" : "text-(--muted)"}
        />

        <span
          className={`text-hud text-[10px] ${
            active ? "text-(--critical)" : "text-(--nominal)"
          }`}
        >
          {active ? "DETECTED" : "CLEAR"}
        </span>
      </div>

      <div className="mt-3 text-hud text-xs text-(--foreground)">
        {label}
      </div>
    </div>
  );
}

export function AiAnalyticsPanel() {
  const { telemetry, error } = useUnifiedTelemetry();

  const ml = telemetry?.ml;
  const risk = telemetry?.risk ?? "low";
  const confidence = Math.round((ml?.confidence ?? 0) * 100);

  const personDetected = Boolean(ml?.person);
  const fireDetected = Boolean(ml?.fire);
  const smokeDetected = Boolean(ml?.smoke);

  const threatDetected = personDetected || fireDetected || smokeDetected;

  return (
    <Panel
      title="AI Detection Analytics"
      right={
        <span className={`text-hud text-[10px] uppercase ${getRiskClass(risk)}`}>
          {risk}
        </span>
      }
    >
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-3 gap-2">
          <DetectionStatus
            label="Person"
            active={personDetected}
            icon={UserRound}
          />

          <DetectionStatus label="Fire" active={fireDetected} icon={Flame} />

          <DetectionStatus label="Smoke" active={smokeDetected} icon={Waves} />
        </div>

        <div className="rounded border border-(--border) bg-[#07111f] p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-hud text-[10px] text-(--muted)">
                AI Confidence
              </div>

              <div className="mt-1 text-hud text-xl text-(--primary)">
                {confidence}%
              </div>
            </div>

            {threatDetected ? (
              <ShieldAlert size={24} className="text-(--critical)" />
            ) : (
              <ShieldCheck size={24} className="text-(--nominal)" />
            )}
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded bg-[#050d18]">
            <div
              className="h-full bg-(--primary)"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] p-2 text-xs text-(--critical)">
            <AlertTriangle size={14} />
            Backend offline: {error}
          </div>
        )}
      </div>
    </Panel>
  );
}