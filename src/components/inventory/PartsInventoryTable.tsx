import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  inventoryParts,
  type StockState,
} from "../../data/inventory";
import { Panel } from "../common/Panel";

const stateConfig: Record<
  StockState,
  {
    label: string;
    textClass: string;
    Icon: LucideIcon;
  }
> = {
  nominal: {
    label: "In Stock",
    textClass: "text-(--nominal)",
    Icon: CheckCircle2,
  },
  caution: {
    label: "Low Stock",
    textClass: "text-(--caution)",
    Icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    textClass: "text-(--critical)",
    Icon: CircleX,
  },
};

export function PartsInventoryTable() {
  return (
    <Panel
      title="Parts Inventory"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {inventoryParts.length} items
        </span>
      }
    >
      <div className="overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-(--panel) text-hud text-[10px] text-(--muted)">
            <tr className="border-b border-(--border)">
              <th className="px-3 py-2 font-normal">Part</th>
              <th className="px-3 py-2 font-normal">Category</th>
              <th className="px-3 py-2 font-normal">Stock</th>
              <th className="px-3 py-2 font-normal">Cost</th>
              <th className="px-3 py-2 font-normal">Location</th>
              <th className="px-3 py-2 font-normal text-right">State</th>
            </tr>
          </thead>

          <tbody>
            {inventoryParts.map((part) => {
              const config = stateConfig[part.state];
              const Icon = config.Icon;

              return (
                <tr
                  key={part.id}
                  className="border-b border-(--border) hover:bg-[#081320]"
                >
                  <td className="px-3 py-3">
                    <div className="text-(--foreground)">
                      {part.name}
                    </div>
                    <div className="mt-1 text-[10px] text-(--muted)">
                      {part.id} · {part.compatibleWith}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {part.category}
                  </td>

                  <td className="px-3 py-3">
                    <div className="text-(--foreground)">
                      {part.stock} units
                    </div>
                    <div className="mt-1 text-[10px] text-(--muted)">
                      Reorder at {part.reorderLevel}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-(--foreground)">
                    ₹{part.unitCost.toLocaleString("en-IN")}
                  </td>

                  <td className="px-3 py-3 text-(--muted)">
                    {part.location}
                  </td>

                  <td className={`px-3 py-3 text-right ${config.textClass}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={14} />
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}