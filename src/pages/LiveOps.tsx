import { AlertsPanel } from "../components/live/AlertsPanel";
import { CommandDeck } from "../components/live/CommandDeck";
import { TelemetryGrid } from "../components/live/TelemetryGrid";
import { VideoFeed } from "../components/live/VideoFeed";
import { AeroWorldMap } from "../components/map/AeroWorldMap";
import { telemetry } from "../data/telemetry";

export function LiveOps() {
  const missionProgress = Math.round(
    (telemetry.currentWaypoint / telemetry.totalWaypoints) * 100
  );

  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid min-h-[calc(100vh-92px)] grid-cols-12 gap-3">
        <section className="col-span-12 min-h-155 xl:col-span-7">
          <AeroWorldMap />
        </section>

        <section className="col-span-12 flex min-h-0 flex-col gap-3 xl:col-span-5">
          <VideoFeed />

          <TelemetryGrid />

          <div className="rounded border border-(--border) bg-(--panel) p-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-hud text-xs text-(--foreground)">
                  Mission Progress
                </h2>

                <p className="mt-1 text-xs text-(--muted)">
                  Current waypoint {telemetry.currentWaypoint} of{" "}
                  {telemetry.totalWaypoints}
                </p>
              </div>

              <div className="text-right">
                <div className="text-hud text-xl text-(--primary)">
                  {missionProgress}%
                </div>

                <div className="text-hud text-[10px] text-(--muted)">
                  Completed
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded bg-[#07111f]">
              <div
                className="h-full bg-(--primary)"
                style={{
                  width: `${missionProgress}%`,
                }}
              />
            </div>
          </div>

          <div className="min-h-47.5 flex-1">
            <AlertsPanel />
          </div>

          <CommandDeck />
        </section>
      </div>
    </div>
  );
}