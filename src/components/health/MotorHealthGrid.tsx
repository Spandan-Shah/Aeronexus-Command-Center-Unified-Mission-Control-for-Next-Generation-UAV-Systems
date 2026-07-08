import { Activity, Fan, Thermometer } from "lucide-react";
import { motorHealth, type HealthState } from "../../data/health";
import { Panel } from "../common/Panel";

const stateStyle: Record<HealthState, string> = {
  nominal: "text-(--nominal) border-(--nominal)",
  caution: "text-(--caution) border-(--caution)",
  critical: "text-(--critical) border-(--critical)",
};

export function MotorHealthGrid() {
  return (
    <Panel title="Motor Health">
      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
        {motorHealth.map((motor) => (
          <article
            key={motor.id}
            className={`rounded border bg-[#081320] p-4 ${
              stateStyle[motor.state]
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fan size={18} />
                <h2 className="text-hud text-sm font-bold">{motor.id}</h2>
              </div>

              <span className="text-hud text-[9px]">{motor.state}</span>
            </div>

            <div className="mt-4 space-y-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Fan size={13} />
                  RPM
                </span>
                <span className="text-(--foreground)">{motor.rpm}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Thermometer size={13} />
                  Temperature
                </span>
                <span className="text-(--foreground)">
                  {motor.temperature}°C
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-(--muted)">
                  <Activity size={13} />
                  Vibration
                </span>
                <span className="text-(--foreground)">
                  {motor.vibration.toFixed(2)}g
                </span>
              </div>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded bg-[#050d18]">
              <div
                className={
                  motor.state === "nominal"
                    ? "h-full bg-(--nominal)"
                    : motor.state === "caution"
                      ? "h-full bg-(--caution)"
                      : "h-full bg-(--critical)"
                }
                style={{
                  width:
                    motor.state === "nominal"
                      ? "90%"
                      : motor.state === "caution"
                        ? "62%"
                        : "35%",
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}