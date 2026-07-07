import { MissionPlanningMap } from "../components/mission/MissionPlanningMap";
import { MissionSummary } from "../components/mission/MissionSummary";
import { MissionToolbox } from "../components/mission/MissionToolbox";
import { WaypointList } from "../components/mission/WaypointList";

export function MissionPlanner() {
  return (
    <div className="h-full p-3">
      <div className="grid h-full grid-cols-12 gap-3">
        <aside className="col-span-12 flex min-h-0 flex-col gap-3 xl:col-span-3">
          <MissionToolbox />
          <WaypointList />
        </aside>

        <section className="col-span-12 min-h-0 xl:col-span-6">
          <MissionPlanningMap />
        </section>

        <aside className="col-span-12 min-h-0 xl:col-span-3">
          <MissionSummary />
        </aside>
      </div>
    </div>
  );
}