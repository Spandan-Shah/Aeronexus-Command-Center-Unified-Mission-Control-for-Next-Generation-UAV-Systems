import { Truck } from "lucide-react";
import { supplierOrders } from "../../data/inventory";
import { Panel } from "../common/Panel";

const statusStyle: Record<string, string> = {
  Ordered: "text-(--info)",
  Shipped: "text-(--nominal)",
  Delayed: "text-(--critical)",
  Received: "text-(--nominal)",
};

export function SupplierOrdersPanel() {
  return (
    <Panel
      title="Supplier Orders"
      right={
        <span className="text-hud text-[10px] text-(--muted)">
          {supplierOrders.length} orders
        </span>
      }
      className="h-full"
    >
      <div className="max-h-[420px] overflow-auto">
        {supplierOrders.map((order) => (
          <article
            key={order.id}
            className="border-b border-(--border) px-3 py-3 hover:bg-[#081320]"
          >
            <div className="flex items-start gap-2">
              <Truck size={15} className="mt-0.5 text-(--primary)" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-hud text-[10px] font-bold text-(--foreground)">
                    {order.id}
                  </span>

                  <span className={`text-hud text-[9px] ${statusStyle[order.status]}`}>
                    {order.status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-(--foreground)">
                  {order.item}
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-(--muted)">
                  <span>{order.supplier}</span>
                  <span className="text-right">Qty {order.quantity}</span>
                  <span>ETA {order.eta}</span>
                  <span className="text-right">
                    ₹{order.cost.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}