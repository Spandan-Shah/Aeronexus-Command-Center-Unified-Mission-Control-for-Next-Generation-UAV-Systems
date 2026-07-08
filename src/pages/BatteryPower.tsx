import { BatteryOverview } from "../components/battery/BatteryOverview";
import { BatteryPackGrid } from "../components/battery/BatteryPackGrid";
import { PowerAlerts } from "../components/battery/PowerAlerts";
import { PowerUsageChart } from "../components/battery/PowerUsageChart";

export function BatteryPower() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Battery & Power
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Battery packs, voltage, current draw, flight time, health, cycle
              count, temperature, and power alerts.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="rounded border border-(--border) bg-[#081320] px-3 py-2 text-hud text-[10px] text-(--foreground) hover:border-(--primary)">
              Run Power Check
            </button>
            <button className="rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              Export Battery Log
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <BatteryOverview />
        <BatteryPackGrid />

        <div className="grid gap-3 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <PowerUsageChart />
          </section>

          <aside className="xl:col-span-4">
            <PowerAlerts />
          </aside>
        </div>
      </div>
    </div>
  );
}