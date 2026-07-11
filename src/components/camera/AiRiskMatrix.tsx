import { AlertTriangle, Flame, ShieldCheck, UserRound, Waves } from "lucide-react";
import { Panel } from "../common/Panel";
import { useUnifiedTelemetry } from "../../hooks/useUnifiedTelemetry";

type RiskLevel = "low" | "medium" | "high" | "critical";

function getRiskLevel({
  person,
  fire,
  smoke,
}: {
  person: boolean;
  fire: boolean;
  smoke: boolean;
}): RiskLevel {
  if (fire && smoke) return "critical";
  if (person && smoke) return "high";
  if (fire || smoke) return "high";
  if (person) return "medium";
  return "low";
}

function getRiskStyle(risk: RiskLevel) {
  if (risk === "critical") {
    return "border-(--critical) bg-[rgba(255,77,77,0.08)] text-(--critical)";
  }

  if (risk === "high") {
    return "border-(--caution) bg-[rgba(246,178,60,0.08)] text-(--caution)";
  }

  if (risk === "medium") {
    return "border-(--info) bg-[rgba(41,211,255,0.08)] text-(--info)";
  }

  return "border-(--nominal) bg-[rgba(73,229,143,0.08)] text-(--nominal)";
}

export function AiRiskMatrix() {
  const { telemetry } = useUnifiedTelemetry();

  const person = Boolean(telemetry?.ml?.person);
  const fire = Boolean(telemetry?.ml?.fire);
  const smoke = Boolean(telemetry?.ml?.smoke);

  const calculatedRisk = getRiskLevel({ person, fire, smoke });

  const riskNotes = [
    {
      label: "Person Detection",
      active: person,
      icon: UserRound,
      detail: person
        ? "Human presence found in camera frame."
        : "No human presence detected.",
    },
    {
      label: "Fire Detection",
      active: fire,
      icon: Flame,
      detail: fire
        ? "Fire signature detected by AI model."
        : "No fire signature detected.",
    },
    {
      label: "Smoke Detection",
      active: smoke,
      icon: Waves,
      detail: smoke
        ? "Smoke pattern detected in visual feed."
        : "No smoke pattern detected.",
    },
  ];

  return (
    <Panel
      title="AI Risk Matrix"
      right={
        <span className={`text-hud text-[10px] uppercase ${getRiskStyle(calculatedRisk)}`}>
          {calculatedRisk}
        </span>
      }
    >
      <div className="space-y-2 p-3">
        <div className={`rounded border p-3 ${getRiskStyle(calculatedRisk)}`}>
          <div className="flex items-center gap-2">
            {calculatedRisk === "low" ? (
              <ShieldCheck size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}

            <span className="text-hud text-xs">
              {calculatedRisk.toUpperCase()} RISK
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-(--muted)">
            Fire with smoke becomes critical. Person with smoke becomes rescue
            priority. Person-only detection stays medium until another hazard is
            confirmed.
          </p>
        </div>

        {riskNotes.map((note) => {
          const Icon = note.icon;

          return (
            <div
              key={note.label}
              className="flex items-start justify-between gap-3 rounded border border-(--border) bg-[#07111f] p-2"
            >
              <div className="flex items-start gap-2">
                <Icon
                  size={15}
                  className={note.active ? "text-(--critical)" : "text-(--muted)"}
                />

                <div>
                  <div className="text-hud text-[10px] text-(--foreground)">
                    {note.label}
                  </div>

                  <div className="mt-0.5 text-[10px] text-(--muted)">
                    {note.detail}
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 text-hud text-[9px] ${
                  note.active ? "text-(--critical)" : "text-(--nominal)"
                }`}
              >
                {note.active ? "ACTIVE" : "CLEAR"}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}