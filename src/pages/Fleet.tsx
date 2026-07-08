import { DroneCard } from "../components/fleet/DroneCard";
import { FleetSummary } from "../components/fleet/FleetSummary";
import { drones } from "../data/drones";

export function Fleet() {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 rounded border border-(--border) bg-(--panel) p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-hud text-lg font-bold text-(--foreground)">
              Fleet Management
            </h1>
            <p className="mt-1 text-sm text-(--muted)">
              Multi-drone readiness, mission assignment, battery, link, firmware,
              and maintenance status.
            </p>
          </div>

          <div className="flex gap-2">
            <button className="rounded border border-(--border) bg-[#081320] px-3 py-2 text-hud text-[10px] text-(--foreground) hover:border-(--primary)">
              Refresh Fleet
            </button>
            <button className="rounded bg-(--primary) px-3 py-2 text-hud text-[10px] font-bold text-[#07111f] hover:opacity-90">
              Add Drone
            </button>
          </div>
        </div>
      </div>

      <FleetSummary />

      <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {drones.map((drone) => (
          <DroneCard key={drone.id} drone={drone} />
        ))}
      </div>
    </div>
  );
}