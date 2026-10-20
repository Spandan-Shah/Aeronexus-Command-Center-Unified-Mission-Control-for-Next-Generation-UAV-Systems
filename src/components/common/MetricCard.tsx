import type {
  LucideIcon,
} from "lucide-react";


type MetricCardProps = {
  label:
    string;

  value:
    string | number;

  unit?:
    string;

  icon:
    LucideIcon;

  status?:
    | "nominal"
    | "caution"
    | "critical"
    | "info";
};


const statusClass = {
  nominal:
    "text-[var(--nominal)]",

  caution:
    "text-[var(--caution)]",

  critical:
    "text-[var(--critical)]",

  info:
    "text-[var(--info)]",
};


const iconBackground = {
  nominal:
    "bg-[rgba(51,125,92,0.08)]",

  caution:
    "bg-[rgba(169,115,36,0.08)]",

  critical:
    "bg-[rgba(189,79,89,0.08)]",

  info:
    "bg-[rgba(49,111,159,0.08)]",
};


export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  status = "info",
}: MetricCardProps) {
  return (
    <div
      className={[
        "flex min-h-[116px] flex-col justify-between",

        "rounded-[8px]",

        "border border-[var(--border)]",

        "bg-white",

        "p-4",

        "shadow-[0_8px_22px_rgba(25,35,45,0.05)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center",

              "rounded-[6px]",

              statusClass[
                status
              ],

              iconBackground[
                status
              ],
            ].join(" ")}
          >
            <Icon
              size={16}
              strokeWidth={1.7}
            />
          </span>

          <span className="truncate text-[13px] font-semibold text-[var(--muted)]">
            {label}
          </span>
        </div>

        <span
          className={[
            "h-2 w-2 shrink-0 rounded-full bg-current",

            statusClass[
              status
            ],
          ].join(" ")}
        />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-metric text-[28px] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)]">
          {value}
        </span>

        {unit ? (
          <span className="pb-0.5 font-mono text-[13px] font-medium text-[var(--muted)]">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}