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

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  status = "info",
}: MetricCardProps) {
  return (
    <div className="bg-[(--panel)] border border-[(--border)] rounded p-3">
      <div className="flex items-center justify-between text-hud text-[10px] text-[(--muted)]">
        <span className="flex items-center gap-1.5">
          <Icon size={13} />
          {label}
        </span>

        <span className={`h-2 w-2 rounded-full bg-current ${statusClass[status]}`} />
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-hud text-2xl font-bold ${statusClass[status]}`}>
          {value}
        </span>
        {unit && (
          <span className="text-hud text-[10px] text-[(--muted)]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}