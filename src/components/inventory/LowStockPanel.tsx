import { AlertTriangle, PackagePlus } from "lucide-react";
import { inventoryParts, type StockState } from "../../data/inventory";
import { Panel } from "../common/Panel";

const stateStyle: Record<StockState, string> = {
  nominal: "text-(--nominal)",
  caution: "text-(--caution)",
  critical: "text-(--critical)",
};

export function LowStockPanel() {
  const lowStockParts = inventoryParts.filter(
    (part) => part.stock <= part.reorderLevel
  );

  return (
    <Panel
      title="Low Stock Alerts"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {lowStockParts.length} alerts
        </span>
      }
      className="h-full"
    >
      <div className="max-h-[420px] overflow-auto">
        {lowStockParts.map((part) => (
          <article
            key={part.id}
            className="border-b border-(--border) px-3 py-3 hover:bg-[#081320]"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={15}
                className={`mt-0.5 ${stateStyle[part.state]}`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-hud text-[10px] font-bold text-(--foreground)">
                    {part.name}
                  </span>

                  <span className={`text-hud text-[9px] ${stateStyle[part.state]}`}>
                    {part.stock}/{part.reorderLevel}
                  </span>
                </div>

                <div className="mt-1 text-xs text-(--muted)">
                  {part.id} · {part.supplier}
                </div>

                <button className="mt-3 flex items-center gap-2 rounded border border-(--border) bg-[#050d18] px-2 py-1.5 text-hud text-[9px] text-(--primary) hover:border-(--primary)">
                  <PackagePlus size={13} />
                  Create Reorder
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}