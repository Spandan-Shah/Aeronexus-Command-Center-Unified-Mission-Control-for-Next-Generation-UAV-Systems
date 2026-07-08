import { AlertTriangle, IndianRupee, Package, ShoppingCart } from "lucide-react";
import { inventoryOverview } from "../../data/inventory";
import { MetricCard } from "../common/MetricCard";
import { Panel } from "../common/Panel";

export function InventorySummary() {
  return (
    <Panel title="Inventory Summary">
      <div className="p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Parts"
            value={inventoryOverview.totalParts}
            unit="items"
            icon={Package}
            status="info"
          />

          <MetricCard
            label="Low Stock"
            value={inventoryOverview.lowStockItems}
            unit="items"
            icon={AlertTriangle}
            status="caution"
          />

          <MetricCard
            label="Critical"
            value={inventoryOverview.criticalItems}
            unit="items"
            icon={AlertTriangle}
            status="critical"
          />

          <MetricCard
            label="Pending Orders"
            value={inventoryOverview.pendingOrders}
            unit="orders"
            icon={ShoppingCart}
            status="info"
          />
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="flex items-center gap-2 text-hud text-[10px] text-(--muted)">
              <IndianRupee size={13} />
              Inventory Value
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--primary)">
              ₹{inventoryOverview.totalValue.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="rounded border border-(--border) bg-[#081320] p-3">
            <div className="text-hud text-[10px] text-(--muted)">
              Last Audit
            </div>
            <div className="mt-1 text-hud text-sm font-bold text-(--foreground)">
              {inventoryOverview.lastAudit}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}