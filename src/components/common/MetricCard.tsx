import type {
  LucideIcon,
} from "lucide-react";


type MetricCardProps = {
  label: string;

  value:
    string | number;

  unit?: string;

  icon: LucideIcon;

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


const statusBackground = {
  nominal:
    "border-[rgba(100,142,120,0.24)] bg-[rgba(100,142,120,0.11)]",

  caution:
    "border-[rgba(199,155,89,0.24)] bg-[rgba(199,155,89,0.11)]",

  critical:
    "border-[rgba(201,105,114,0.24)] bg-[rgba(201,105,114,0.11)]",

  info:
    "border-[rgba(93,135,163,0.24)] bg-[rgba(93,135,163,0.11)]",
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

        "rounded-[9px]",

        "border border-[var(--border)]",

        "bg-[var(--surface-2)]",

        "p-4",

        "shadow-[0_10px_24px_rgba(0,0,0,0.16)]",

        "transition-[background-color,border-color,transform] duration-150",

        "hover:-translate-y-px",

        "hover:border-[var(--border-strong)]",

        "hover:bg-[var(--surface-hover)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center",

              "rounded-[7px] border",

              statusClass[
                status
              ],

              statusBackground[
                status
              ],
            ].join(" ")}
          >
            <Icon
              size={17}
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
          <span className="pb-0.5 font-mono text-[13px] font-medium text-[var(--muted-soft)]">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}