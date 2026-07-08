import { BrainCircuit, Camera } from "lucide-react";
import { AiVideoPanel } from "../components/camera/AiVideoPanel";
import { CameraControls } from "../components/camera/CameraControls";
import { DetectionEventLedger } from "../components/camera/DetectionEventLedger";
import { ModelPipeline } from "../components/camera/ModelPipeline";
import { cameraStatus } from "../data/camera";

export function CameraAI() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Camera AI Analytics
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Live video HUD, object detection, AI model pipeline, event ledger,
              and assisted review controls.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-2 rounded border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-3 py-2 text-hud text-[10px] text-(--nominal)">
              <BrainCircuit size={14} />
              AI Active
            </span>

            <span className="flex items-center gap-2 rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary)">
              <Camera size={14} />
              {cameraStatus.fps} FPS
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <AiVideoPanel />
        </section>

        <aside className="xl:col-span-4">
          <CameraControls />
        </aside>

        <section className="xl:col-span-5">
          <ModelPipeline />
        </section>

        <section className="xl:col-span-7">
          <DetectionEventLedger />
        </section>
      </div>
    </div>
  );
}