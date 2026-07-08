import { Camera, Focus, Radio, RotateCcw, Video, ZoomIn } from "lucide-react";
import { Panel } from "../common/Panel";

const controls = [
  { label: "Snapshot", icon: Camera },
  { label: "Record", icon: Video },
  { label: "Zoom", icon: ZoomIn },
  { label: "Focus", icon: Focus },
  { label: "Recenter", icon: RotateCcw },
  { label: "Stream", icon: Radio },
];

export function CameraControls() {
  return (
    <Panel title="Camera Controls">
      <div className="grid grid-cols-2 gap-2 p-3">
        {controls.map((control) => {
          const Icon = control.icon;

          return (
            <button
              key={control.label}
              className="flex h-14 items-center justify-center gap-2 rounded border border-(--border) bg-[#081320] text-hud text-[10px] text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
            >
              <Icon size={15} />
              {control.label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-(--border) p-3">
        <div className="rounded border border-(--border) bg-[#081320] p-3">
          <div className="text-hud text-[10px] text-(--muted)">
            AI Review Mode
          </div>
          <div className="mt-1 text-hud text-sm font-bold text-(--nominal)">
            Assisted Tagging Active
          </div>
        </div>
      </div>
    </Panel>
  );
}