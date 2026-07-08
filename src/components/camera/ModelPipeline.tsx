import { Cpu, Gauge, Timer } from "lucide-react";
import { aiModels } from "../../data/camera";
import { Panel } from "../common/Panel";

export function ModelPipeline() {
  return (
    <Panel title="Model Pipeline">
      <div className="space-y-3 p-3">
        {aiModels.map((model) => {
          const active = model.status === "ACTIVE";

          return (
            <article
              key={model.name}
              className="rounded border border-(--border) bg-[#081320] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Cpu
                    size={16}
                    className={active ? "text-(--nominal)" : "text-(--muted)"}
                  />
                  <div>
                    <div className="text-hud text-[10px] font-bold text-(--foreground)">
                      {model.name}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-(--muted)">
                      <span className="flex items-center gap-1">
                        <Gauge size={12} />
                        {model.fps} FPS
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer size={12} />
                        {model.latency}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded border px-2 py-1 text-hud text-[9px] ${
                    active
                      ? "border-(--nominal) text-(--nominal)"
                      : "border-(--border) text-(--muted)"
                  }`}
                >
                  {model.status}
                </span>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded bg-[#050d18]">
                <div
                  className={active ? "h-full bg-(--nominal)" : "h-full bg-(--muted)"}
                  style={{ width: `${model.load}%` }}
                />
              </div>

              <div className="mt-1 text-right text-hud text-[9px] text-(--muted)">
                Load {model.load}%
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}