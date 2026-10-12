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
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-1.5">
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
                  "flex items-center justify-center gap-1.5",

                  compact
                    ? "h-[36px]"
                    : "h-[46px]",

                  "rounded-[4px] border border-white/[0.08]",

                  "bg-[#05060d]",

                  "font-mono text-[8px] font-semibold uppercase tracking-[0.04em]",

                  "text-white/52",

                  "transition-colors duration-150",

                  "hover:border-[rgba(246,178,60,0.32)] hover:text-[#F6B23C]",
                ].join(" ")}
              >
                <Icon
                  size={12}
                  strokeWidth={1.6}
                />

                {
                  control.label
                }
              </button>
            );
          },
        )}
      </div>

      <div className="flex min-h-[34px] items-center justify-between rounded-[4px] border border-[rgba(89,217,154,0.18)] bg-[rgba(89,217,154,0.035)] px-2.5">
        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white/34">
          AI Review
        </span>

        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-[#59D99A]">
          Assisted Tagging Active
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