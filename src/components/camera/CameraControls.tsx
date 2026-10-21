import {
  Camera,
  Focus,
  Radio,
  RotateCcw,
  Video,
  ZoomIn,
} from "lucide-react";

import {
  Panel,
} from "../common/Panel";

type CameraControlsProps = {
  embedded?: boolean;
  compact?: boolean;
};

const controls = [
  {
    label:
      "Snapshot",

    icon:
      Camera,
  },

  {
    label:
      "Record",

    icon:
      Video,
  },

  {
    label:
      "Zoom",

    icon:
      ZoomIn,
  },

  {
    label:
      "Focus",

    icon:
      Focus,
  },

  {
    label:
      "Recenter",

    icon:
      RotateCcw,
  },

  {
    label:
      "Stream",

    icon:
      Radio,
  },
];

export function CameraControls({
  embedded = false,
  compact = false,
}: CameraControlsProps) {
  const content = (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {controls.map(
          (
            control,
          ) => {
            const Icon =
              control.icon;

            return (
              <button
                key={
                  control.label
                }
                type="button"
                className={[
                  "flex w-full flex-col items-center justify-center gap-1.5",

                  compact
                    ? "min-h-[48px]"
                    : "min-h-[58px]",

                  "rounded-[5px] border border-white/[0.08]",

                  "bg-[#05060d]",

                  "px-2 py-2",

                  "text-white/58",

                  "transition-colors duration-150",

                  "hover:border-[rgba(246,178,60,0.32)]",

                  "hover:bg-[rgba(246,178,60,0.035)]",

                  "hover:text-[#F6B23C]",
                ].join(" ")}
              >
                <Icon
                  size={14}
                  strokeWidth={1.65}
                />

                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.035em]">
                  {
                    control.label
                  }
                </span>
              </button>
            );
          },
        )}
      </div>

      <div className="flex min-h-[42px] items-center justify-between gap-3 rounded-[5px] border border-[rgba(89,217,154,0.18)] bg-[rgba(89,217,154,0.035)] px-3">
        <div>
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.045em] text-white/38">
            AI Review Mode
          </div>

          <div className="mt-0.5 text-[11px] font-medium text-white/66">
            Human-assisted review
          </div>
        </div>

        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-[#59D99A]">
          Active
        </span>
      </div>
    </div>
  );

  if (
    embedded
  ) {
    return content;
  }

  return (
    <Panel title="Camera Controls">
      <div className="p-3">
        {content}
      </div>
    </Panel>
  );
}