import { PackagePlus, ScanLine } from "lucide-react";
import { InventorySummary } from "../components/inventory/InventorySummary";
import { LowStockPanel } from "../components/inventory/LowStockPanel";
import { PartsInventoryTable } from "../components/inventory/PartsInventoryTable";
import { SupplierOrdersPanel } from "../components/inventory/SupplierOrdersPanel";

export function Inventory() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Parts Inventory
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Track spare parts, stock levels, reorder points, supplier orders,
              cost, location, and drone compatibility.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded border border-(--border) bg-[#081320] px-3 py-2 text-hud text-[10px] text-(--foreground) hover:border-(--primary)">
              <ScanLine size={14} />
              Scan Part
            </button>

            <button className="flex items-center gap-2 rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              <PackagePlus size={14} />
              Add Stock
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <InventorySummary />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <PartsInventoryTable />
          </section>

          <aside className="space-y-3 xl:col-span-4">
            <LowStockPanel />
            <SupplierOrdersPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}