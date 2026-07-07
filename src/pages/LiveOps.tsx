import { AlertsPanel } from "../components/live/AlertsPanel";
import { CommandDeck } from "../components/live/CommandDeck";
import { TacticalMap } from "../components/live/TacticalMap";
import { TelemetryGrid } from "../components/live/TelemetryGrid";
import { VideoFeed } from "../components/live/VideoFeed";
import { telemetry } from "../data/telemetry";

export function LiveOps() {
  return (
    <div className="h-full p-3">
      <div className="grid h-full grid-cols-12 gap-3">
        <section className="col-span-12 xl:col-span-7 min-h-0">
          <TacticalMap />
        </section>

        <section className="col-span-12 xl:col-span-5 min-h-0 flex flex-col gap-3">
          <VideoFeed />

          <TelemetryGrid />

          <div className="rounded border border-[ (--border)] bg-[ (--panel)] p-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-hud text-xs">Mission Progress</h2>
                <p className="mt-1 text-xs text-[ (--muted)]">
                  Current waypoint {telemetry.currentWaypoint} of{" "}
                  {telemetry.totalWaypoints}
                </p>
              </div>

              <div className="text-right">
                <div className="text-hud text-xl text-[ (--primary)]">
                  {Math.round(
                    (telemetry.currentWaypoint / telemetry.totalWaypoints) * 100
                  )}
                  %
                </div>
                <div className="text-hud text-[10px] text-[ (--muted)]">
                  Completed
                </div>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded bg-[#07111f]">
              <div
                className="h-full bg-[ (--primary)]"
                style={{
                  width: `${
                    (telemetry.currentWaypoint / telemetry.totalWaypoints) * 100
                  }%`,
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