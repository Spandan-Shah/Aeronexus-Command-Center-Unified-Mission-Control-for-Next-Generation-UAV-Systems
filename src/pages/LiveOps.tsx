import { AlertsPanel } from "../components/live/AlertsPanel";
import { CommandDeck } from "../components/live/CommandDeck";
import { TelemetryGrid } from "../components/live/TelemetryGrid";
import { AeroWorldMap } from "../components/map/AeroWorldMap";
import { telemetry } from "../data/telemetry";
import { DataSourcePanel } from "../components/live/DataSourcePanel";

export function LiveOps() {
  const missionProgress = Math.round(
    (telemetry.currentWaypoint / telemetry.totalWaypoints) * 100
  );

  return (
    <div className="min-h-screen bg-[#09090b] p-5">
      <div className="mx-auto grid max-w-[1680px] items-start gap-5 xl:grid-cols-12">
        <section className="flex flex-col gap-5 xl:col-span-8">
          <div className="h-[760px] overflow-hidden rounded border border-(--border) bg-black">
            <AeroWorldMap />
          </div>

          <CommandDeck />
        </section>

        <section className="flex flex-col gap-5 xl:col-span-4">
          <TelemetryGrid />

          <div className="min-h-[360px]">
            <AlertsPanel />
          </div>

          <DataSourcePanel />

          <div className="rounded border border-(--border) bg-(--panel) p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-hud text-sm text-(--foreground)">
                  Mission Progress
                </h2>

                <p className="mt-1 text-sm text-(--muted)">
                  Current waypoint {telemetry.currentWaypoint} of{" "}
                  {telemetry.totalWaypoints}
                </p>
              </div>

              <div className="text-right">
                <div className="text-hud text-2xl text-(--primary)">
                  {missionProgress}%
                </div>

                <div className="text-hud text-[11px] text-(--muted)">
                  Completed
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded bg-black">
              <div
                className="h-full bg-(--primary)"
                style={{
                  width: `${missionProgress}%`,
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}