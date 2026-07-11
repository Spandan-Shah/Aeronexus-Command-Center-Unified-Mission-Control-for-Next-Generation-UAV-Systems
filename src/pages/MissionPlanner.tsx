import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Battery,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  MapPinned,
  Navigation,
  Plus,
  Route,
  Save,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { MetricCard } from "../components/common/MetricCard";
import { Panel } from "../components/common/Panel";
import { MissionPlanningMap } from "../components/mission/MissionPlanningMap";
import { geofenceZone, restrictedZones } from "../data/worldMap";
import {
  analyzeMission,
  createDefaultWaypoint,
  formatDistance,
  formatTime,
  type MissionWaypoint,
  type WaypointAction,
} from "../utils/missionAnalytics";

const initialWaypoints: MissionWaypoint[] = [
  {
    ...createDefaultWaypoint(23.0228, 72.5717, 1),
    name: "WP-1",
    altitude: 55,
    speed: 6,
    action: "scan",
  },
  {
    ...createDefaultWaypoint(23.0262, 72.5762, 2),
    name: "WP-2",
    altitude: 65,
    speed: 6,
    action: "photo",
  },
  {
    ...createDefaultWaypoint(23.0301, 72.5812, 3),
    name: "WP-3",
    altitude: 60,
    speed: 5,
    holdSeconds: 8,
    action: "hold",
  },
];

const actionOptions: {
  value: WaypointAction;
  label: string;
}[] = [
  { value: "none", label: "No Action" },
  { value: "scan", label: "Area Scan" },
  { value: "photo", label: "Capture Photo" },
  { value: "hold", label: "Hold Position" },
  { value: "return-check", label: "Return Check" },
];

function getBatteryStatus(value: number) {
  if (value >= 70) return "critical";
  if (value >= 45) return "caution";
  return "nominal";
}

function getReadinessStatus(ready: boolean) {
  return ready ? "nominal" : "caution";
}

function numberInputClass() {
  return "w-full rounded border border-(--border) bg-[#07111f] px-2 py-1.5 text-xs text-(--foreground) outline-none focus:border-(--primary)";
}

function selectInputClass() {
  return "w-full rounded border border-(--border) bg-[#07111f] px-2 py-1.5 text-xs text-(--foreground) outline-none focus:border-(--primary)";
}

export function MissionPlanner() {
  const [waypoints, setWaypoints] = useState<MissionWaypoint[]>(initialWaypoints);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(
    initialWaypoints[0]?.id ?? null
  );

  const analysis = useMemo(
    () =>
      analyzeMission({
        waypoints,
        geofence: geofenceZone,
        restrictedZones,
      }),
    [waypoints]
  );

  const selectedWaypoint = waypoints.find(
    (waypoint) => waypoint.id === selectedWaypointId
  );

  function updateWaypoint(
    waypointId: string,
    updates: Partial<MissionWaypoint>
  ) {
    setWaypoints((current) =>
      current.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              ...updates,
            }
          : waypoint
      )
    );
  }

  function deleteWaypoint(waypointId: string) {
    setWaypoints((current) => {
      const nextWaypoints = current.filter(
        (waypoint) => waypoint.id !== waypointId
      );

      if (selectedWaypointId === waypointId) {
        setSelectedWaypointId(nextWaypoints[0]?.id ?? null);
      }

      return nextWaypoints.map((waypoint, index) => ({
        ...waypoint,
        name: `WP-${index + 1}`,
      }));
    });
  }

  function addDefaultWaypoint() {
    const lastWaypoint = waypoints[waypoints.length - 1];

    const nextWaypoint = createDefaultWaypoint(
      (lastWaypoint?.lat ?? 23.0225) + 0.002,
      (lastWaypoint?.lng ?? 72.5714) + 0.002,
      waypoints.length + 1
    );

    setWaypoints((current) => [...current, nextWaypoint]);
    setSelectedWaypointId(nextWaypoint.id);
  }

  function clearMission() {
    setWaypoints([]);
    setSelectedWaypointId(null);
  }

  function exportMissionJson() {
    const mission = {
      name: "AeroNexus Mission Plan",
      version: 1,
      createdAt: new Date().toISOString(),
      readiness: analysis.missionReady ? "ready" : "not_ready",
      analytics: analysis,
      waypoints,
    };

    const blob = new Blob([JSON.stringify(mission, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "aeronexus-mission-plan.json";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full overflow-hidden p-3">
      <div className="grid h-full min-h-0 grid-cols-12 gap-3">
        <section className="col-span-12 min-h-0 xl:col-span-8">
          <MissionPlanningMap
            waypoints={waypoints}
            selectedWaypointId={selectedWaypointId}
            onWaypointsChange={setWaypoints}
            onSelectWaypoint={setSelectedWaypointId}
          />
        </section>

        <section className="col-span-12 flex min-h-0 flex-col gap-3 overflow-auto xl:col-span-4">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Waypoints"
              value={analysis.waypointCount}
              icon={MapPinned}
              status={analysis.waypointCount >= 2 ? "nominal" : "caution"}
            />

            <MetricCard
              label="Distance"
              value={(analysis.totalDistanceMeters / 1000).toFixed(2)}
              unit="km"
              icon={Route}
              status="info"
            />

            <MetricCard
              label="Est. Time"
              value={Math.ceil(analysis.estimatedTimeSeconds / 60)}
              unit="min"
              icon={Clock}
              status="info"
            />

            <MetricCard
              label="Battery Use"
              value={analysis.estimatedBatteryPercent.toFixed(1)}
              unit="%"
              icon={Battery}
              status={getBatteryStatus(analysis.estimatedBatteryPercent)}
            />

            <MetricCard
              label="Geofence"
              value={analysis.geofencePassed ? "PASS" : "FAIL"}
              icon={Navigation}
              status={analysis.geofencePassed ? "nominal" : "critical"}
            />

            <MetricCard
              label="Readiness"
              value={analysis.missionReady ? "READY" : "CHECK"}
              icon={Gauge}
              status={getReadinessStatus(analysis.missionReady)}
            />
          </div>

          <Panel
            title="Mission Safety Analysis"
            right={
              <span
                className={`text-hud text-[10px] ${
                  analysis.missionReady
                    ? "text-(--nominal)"
                    : "text-(--caution)"
                }`}
              >
                {analysis.missionReady ? "READY" : "NEEDS REVIEW"}
              </span>
            }
          >
            <div className="space-y-2 p-3">
              {analysis.warnings.map((warning) => (
                <div
                  key={`${warning.title}-${warning.message}`}
                  className={`rounded border p-2 ${
                    warning.severity === "critical"
                      ? "border-(--critical) bg-[rgba(255,77,77,0.08)]"
                      : warning.severity === "caution"
                      ? "border-(--caution) bg-[rgba(246,178,60,0.08)]"
                      : "border-(--nominal) bg-[rgba(73,229,143,0.08)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {warning.severity === "critical" ? (
                      <XCircle size={14} className="text-(--critical)" />
                    ) : warning.severity === "caution" ? (
                      <AlertTriangle size={14} className="text-(--caution)" />
                    ) : (
                      <CheckCircle2 size={14} className="text-(--nominal)" />
                    )}

                    <span className="text-hud text-[10px] text-(--foreground)">
                      {warning.title}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] leading-relaxed text-(--muted)">
                    {warning.message}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Waypoint Editor">
            <div className="space-y-3 p-3">
              {!selectedWaypoint && (
                <div className="rounded border border-(--border) bg-[#07111f] p-3 text-xs text-(--muted)">
                  Select a waypoint on the map or from the list.
                </div>
              )}

              {selectedWaypoint && (
                <>
                  <div>
                    <label className="text-hud text-[10px] text-(--muted)">
                      Name
                    </label>
                    <input
                      value={selectedWaypoint.name}
                      onChange={(event) =>
                        updateWaypoint(selectedWaypoint.id, {
                          name: event.target.value,
                        })
                      }
                      className={numberInputClass()}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-hud text-[10px] text-(--muted)">
                        Latitude
                      </label>
                      <input
                        type="number"
                        value={selectedWaypoint.lat}
                        onChange={(event) =>
                          updateWaypoint(selectedWaypoint.id, {
                            lat: Number(event.target.value),
                          })
                        }
                        className={numberInputClass()}
                      />
                    </div>

                    <div>
                      <label className="text-hud text-[10px] text-(--muted)">
                        Longitude
                      </label>
                      <input
                        type="number"
                        value={selectedWaypoint.lng}
                        onChange={(event) =>
                          updateWaypoint(selectedWaypoint.id, {
                            lng: Number(event.target.value),
                          })
                        }
                        className={numberInputClass()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-hud text-[10px] text-(--muted)">
                        Altitude
                      </label>
                      <input
                        type="number"
                        value={selectedWaypoint.altitude}
                        onChange={(event) =>
                          updateWaypoint(selectedWaypoint.id, {
                            altitude: Number(event.target.value),
                          })
                        }
                        className={numberInputClass()}
                      />
                    </div>

                    <div>
                      <label className="text-hud text-[10px] text-(--muted)">
                        Speed
                      </label>
                      <input
                        type="number"
                        value={selectedWaypoint.speed}
                        onChange={(event) =>
                          updateWaypoint(selectedWaypoint.id, {
                            speed: Number(event.target.value),
                          })
                        }
                        className={numberInputClass()}
                      />
                    </div>

                    <div>
                      <label className="text-hud text-[10px] text-(--muted)">
                        Hold
                      </label>
                      <input
                        type="number"
                        value={selectedWaypoint.holdSeconds}
                        onChange={(event) =>
                          updateWaypoint(selectedWaypoint.id, {
                            holdSeconds: Number(event.target.value),
                          })
                        }
                        className={numberInputClass()}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-hud text-[10px] text-(--muted)">
                      Action
                    </label>
                    <select
                      value={selectedWaypoint.action}
                      onChange={(event) =>
                        updateWaypoint(selectedWaypoint.id, {
                          action: event.target.value as WaypointAction,
                        })
                      }
                      className={selectInputClass()}
                    >
                      {actionOptions.map((action) => (
                        <option key={action.value} value={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => deleteWaypoint(selectedWaypoint.id)}
                    className="flex w-full items-center justify-center gap-2 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-3 py-2 text-hud text-[10px] text-(--critical)"
                  >
                    <Trash2 size={14} />
                    Delete Selected Waypoint
                  </button>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Waypoint List" className="min-h-52">
            <div className="max-h-52 space-y-2 overflow-auto p-3">
              {waypoints.length === 0 && (
                <div className="text-xs text-(--muted)">
                  No waypoints. Click on the map to create mission points.
                </div>
              )}

              {waypoints.map((waypoint, index) => (
                <button
                  key={waypoint.id}
                  onClick={() => setSelectedWaypointId(waypoint.id)}
                  className={`w-full rounded border px-3 py-2 text-left ${
                    selectedWaypointId === waypoint.id
                      ? "border-(--primary) bg-[rgba(41,211,255,0.08)]"
                      : "border-(--border) bg-[#07111f]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-hud text-[10px] text-(--foreground)">
                      {index + 1}. {waypoint.name}
                    </span>

                    <span className="text-hud text-[9px] text-(--muted)">
                      {waypoint.altitude}m · {waypoint.speed}m/s
                    </span>
                  </div>

                  <div className="mt-1 text-[10px] text-(--muted)">
                    {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)} ·{" "}
                    {waypoint.action}
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Mission Actions">
            <div className="grid grid-cols-2 gap-2 p-3">
              <button
                onClick={addDefaultWaypoint}
                className="flex items-center justify-center gap-2 rounded border border-(--primary) bg-[rgba(41,211,255,0.08)] px-3 py-2 text-hud text-[10px] text-(--primary)"
              >
                <Plus size={14} />
                Add WP
              </button>

              <button
                onClick={exportMissionJson}
                className="flex items-center justify-center gap-2 rounded border border-(--nominal) bg-[rgba(73,229,143,0.08)] px-3 py-2 text-hud text-[10px] text-(--nominal)"
              >
                <Download size={14} />
                Export JSON
              </button>

              <button
                disabled
                className="flex cursor-not-allowed items-center justify-center gap-2 rounded border border-(--border) bg-[#07111f] px-3 py-2 text-hud text-[10px] text-(--muted) opacity-60"
              >
                <Save size={14} />
                Save Future
              </button>

              <button
                disabled
                className="flex cursor-not-allowed items-center justify-center gap-2 rounded border border-(--border) bg-[#07111f] px-3 py-2 text-hud text-[10px] text-(--muted) opacity-60"
              >
                <Send size={14} />
                Upload Future
              </button>

              <button
                onClick={clearMission}
                className="col-span-2 flex items-center justify-center gap-2 rounded border border-(--critical) bg-[rgba(255,77,77,0.08)] px-3 py-2 text-hud text-[10px] text-(--critical)"
              >
                <Trash2 size={14} />
                Clear Mission
              </button>
            </div>

            <div className="border-t border-(--border) p-3 text-[10px] leading-relaxed text-(--muted)">
              Distance: {formatDistance(analysis.totalDistanceMeters)} · Time:{" "}
              {formatTime(analysis.estimatedTimeSeconds)} · Battery:{" "}
              {analysis.estimatedBatteryPercent.toFixed(1)}%
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}