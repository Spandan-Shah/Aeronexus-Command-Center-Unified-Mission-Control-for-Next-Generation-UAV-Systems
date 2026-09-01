import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: "nominal" | "caution" | "critical" | "info";
};

const statusClass = {
  nominal: "text-[var(--nominal)]",
  caution: "text-[var(--caution)]",
  critical: "text-[var(--critical)]",
  info: "text-[var(--info)]",
};

const borderClass = {
  nominal: "border-[rgba(73,229,143,0.32)]",
  caution: "border-[rgba(246,178,60,0.34)]",
  critical: "border-[rgba(255,77,77,0.34)]",
  info: "border-[rgba(90,169,255,0.34)]",
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
      className={`flex min-h-[104px] flex-col justify-between rounded-lg border bg-[#070a10] p-4 ${borderClass[status]}`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-hud text-[9px] tracking-[0.12em] text-(--muted)">
          <Icon size={13} className={statusClass[status]} />
          {label}
        </span>

        <span className={`h-2 w-2 rounded-full bg-current ${statusClass[status]}`} />
      </div>

      <div className="flex items-end gap-1.5">
        <span
          className={`text-hud text-[28px] font-bold leading-none tracking-tight ${statusClass[status]}`}
        >
          {value}
        </span>

        {unit && (
          <span className="pb-1 text-hud text-[10px] leading-none text-(--muted)">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}