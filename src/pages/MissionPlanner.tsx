import { useMemo, useState, type ReactNode } from "react";
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
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

type Tone = "nominal" | "caution" | "critical" | "info" | "muted";

type MetricStatus = "nominal" | "caution" | "critical" | "info";

type MissionMetric = {
  label: string;
  value: string | number;
  unit?: string;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
};

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
    action: "hover",
  },
];

const actionOptions: {
  value: WaypointAction;
  label: string;
}[] = [
  { value: "none", label: "No Action" },
  { value: "scan", label: "Area Scan" },
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
  { value: "thermal-scan", label: "Thermal Scan" },
  { value: "hover", label: "Hover" },
  { value: "loiter", label: "Loiter" },
  { value: "perimeter-scan", label: "Perimeter" },
  { value: "search-grid", label: "Search Grid" },
  { value: "inspect-target", label: "Inspect" },
  { value: "speaker-alert", label: "Speaker Alert" },
  { value: "spotlight", label: "Spotlight" },
  { value: "payload-check", label: "Payload Check" },
  { value: "return-check", label: "Return Check" },
  { value: "emergency-mark", label: "Emergency Mark" },
];

const toneClass = {
  nominal: {
    text: "text-(--nominal)",
    border: "border-[rgba(73,229,143,0.28)]",
    bg: "bg-[rgba(73,229,143,0.08)]",
    dot: "bg-(--nominal)",
  },
  caution: {
    text: "text-(--primary)",
    border: "border-[rgba(246,178,60,0.32)]",
    bg: "bg-[rgba(246,178,60,0.08)]",
    dot: "bg-(--primary)",
  },
  critical: {
    text: "text-(--critical)",
    border: "border-[rgba(255,77,77,0.34)]",
    bg: "bg-[rgba(255,77,77,0.08)]",
    dot: "bg-(--critical)",
  },
  info: {
    text: "text-(--info)",
    border: "border-[rgba(90,169,255,0.3)]",
    bg: "bg-[rgba(90,169,255,0.08)]",
    dot: "bg-(--info)",
  },
  muted: {
    text: "text-(--muted)",
    border: "border-[#1d2533]",
    bg: "bg-[#070a10]",
    dot: "bg-(--muted)",
  },
};

function getBatteryStatus(value: number): MetricStatus {
  if (value >= 70) return "critical";
  if (value >= 45) return "caution";
  return "nominal";
}

function getBatteryTone(value: number): Tone {
  const status = getBatteryStatus(value);

  if (status === "critical") return "critical";
  if (status === "caution") return "caution";

  return "nominal";
}

function getReadinessTone(ready: boolean): Tone {
  return ready ? "nominal" : "caution";
}

function numberInputClass() {
  return "h-9 w-full rounded border border-[#1d2533] bg-black px-2.5 font-mono text-[12px] text-(--foreground) outline-none transition focus:border-(--primary)";
}

function selectInputClass() {
  return "h-9 w-full rounded border border-[#1d2533] bg-black px-2.5 font-mono text-[12px] text-(--foreground) outline-none transition focus:border-(--primary)";
}

function SectionShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1d2533] bg-black shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="border-b border-[#151923] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-(--primary)">
              {eyebrow}
            </p>

            <h2 className="mt-1 text-[17px] font-semibold leading-tight text-(--foreground)">
              {title}
            </h2>
          </div>

          {action && (
            <span className="inline-flex w-fit rounded-full border border-[#243147] bg-[#07111f] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--info)">
              {action}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricTile({ item }: { item: MissionMetric }) {
  const Icon = item.icon;
  const tone = toneClass[item.tone];

  return (
    <div className={`rounded-xl border bg-[#070a10] p-4 ${tone.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-(--muted)">
          <Icon size={14} className={tone.text} />
          {item.label}
        </div>

        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      </div>

      <div className={`mt-4 flex items-end gap-1.5 font-mono ${tone.text}`}>
        <span className="text-[24px] font-bold leading-none">
          {item.value}
        </span>

        {item.unit && (
          <span className="pb-0.5 text-[10px] font-bold uppercase text-(--muted)">
            {item.unit}
          </span>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
        {item.helper}
      </p>
    </div>
  );
}

function SafetyPanel({
  analysis,
}: {
  analysis: ReturnType<typeof analyzeMission>;
}) {
  return (
    <div className="grid gap-3">
      {analysis.warnings.map((warning) => {
        const tone: Tone =
          warning.severity === "critical"
            ? "critical"
            : warning.severity === "caution"
              ? "caution"
              : "nominal";

        const toneStyle = toneClass[tone];

        const Icon =
          warning.severity === "critical"
            ? XCircle
            : warning.severity === "caution"
              ? AlertTriangle
              : CheckCircle2;

        return (
          <div
            key={`${warning.title}-${warning.message}`}
            className={`rounded-lg border bg-[#070a10] p-4 ${toneStyle.border}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-lg border p-2 ${toneStyle.border} ${toneStyle.bg}`}
              >
                <Icon size={14} className={toneStyle.text} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-[13px] font-semibold text-(--foreground)">
                    {warning.title}
                  </h3>

                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text}`}
                  >
                    {warning.severity}
                  </span>
                </div>

                <p className="mt-2 text-[12px] leading-relaxed text-(--muted)">
                  {warning.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WaypointEditor({
  selectedWaypoint,
  onUpdate,
  onDelete,
}: {
  selectedWaypoint?: MissionWaypoint;
  onUpdate: (waypointId: string, updates: Partial<MissionWaypoint>) => void;
  onDelete: (waypointId: string) => void;
}) {
  if (!selectedWaypoint) {
    return (
      <div className="rounded-lg border border-[#1d2533] bg-[#070a10] p-4 text-[13px] leading-relaxed text-(--muted)">
        Select a waypoint from the list or click the map to edit mission point
        details.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <FieldLabel>Name</FieldLabel>

        <input
          value={selectedWaypoint.name}
          onChange={(event) =>
            onUpdate(selectedWaypoint.id, {
              name: event.target.value,
            })
          }
          className={numberInputClass()}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FieldLabel>Latitude</FieldLabel>

          <input
            type="number"
            value={selectedWaypoint.lat}
            onChange={(event) =>
              onUpdate(selectedWaypoint.id, {
                lat: Number(event.target.value),
              })
            }
            className={numberInputClass()}
          />
        </div>

        <div>
          <FieldLabel>Longitude</FieldLabel>

          <input
            type="number"
            value={selectedWaypoint.lng}
            onChange={(event) =>
              onUpdate(selectedWaypoint.id, {
                lng: Number(event.target.value),
              })
            }
            className={numberInputClass()}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <FieldLabel>Altitude</FieldLabel>

          <input
            type="number"
            value={selectedWaypoint.altitude}
            onChange={(event) =>
              onUpdate(selectedWaypoint.id, {
                altitude: Number(event.target.value),
              })
            }
            className={numberInputClass()}
          />
        </div>

        <div>
          <FieldLabel>Speed</FieldLabel>

          <input
            type="number"
            value={selectedWaypoint.speed}
            onChange={(event) =>
              onUpdate(selectedWaypoint.id, {
                speed: Number(event.target.value),
              })
            }
            className={numberInputClass()}
          />
        </div>

        <div>
          <FieldLabel>Hold</FieldLabel>

          <input
            type="number"
            value={selectedWaypoint.holdSeconds}
            onChange={(event) =>
              onUpdate(selectedWaypoint.id, {
                holdSeconds: Number(event.target.value),
              })
            }
            className={numberInputClass()}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Waypoint Action</FieldLabel>

        <select
          value={selectedWaypoint.action}
          onChange={(event) =>
            onUpdate(selectedWaypoint.id, {
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
        type="button"
        onClick={() => onDelete(selectedWaypoint.id)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded border border-[rgba(255,77,77,0.38)] bg-[rgba(255,77,77,0.08)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--critical) transition hover:bg-[rgba(255,77,77,0.12)]"
      >
        <Trash2 size={14} />
        Delete Selected Waypoint
      </button>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--muted)">
      {children}
    </label>
  );
}

function WaypointList({
  waypoints,
  selectedWaypointId,
  onSelect,
}: {
  waypoints: MissionWaypoint[];
  selectedWaypointId: string | null;
  onSelect: (waypointId: string) => void;
}) {
  if (waypoints.length === 0) {
    return (
      <div className="rounded-lg border border-[#1d2533] bg-[#070a10] p-4 text-[13px] leading-relaxed text-(--muted)">
        No waypoints yet. Add a waypoint or click on the map to create mission
        points.
      </div>
    );
  }

  return (
    <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
      {waypoints.map((waypoint, index) => {
        const selected = selectedWaypointId === waypoint.id;

        return (
          <button
            key={waypoint.id}
            type="button"
            onClick={() => onSelect(waypoint.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selected
                ? "border-(--primary) bg-[rgba(246,178,60,0.08)]"
                : "border-[#1d2533] bg-[#070a10] hover:border-(--primary)"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#2a3547] bg-black font-mono text-[9px] font-bold text-(--primary)">
                    {index + 1}
                  </span>

                  <h3 className="truncate text-[13px] font-semibold text-(--foreground)">
                    {waypoint.name}
                  </h3>
                </div>

                <p className="mt-2 truncate font-mono text-[10px] text-(--muted)">
                  {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
                </p>
              </div>

              {selected && (
                <CheckCircle2 size={15} className="shrink-0 text-(--nominal)" />
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniValue label="Alt" value={`${waypoint.altitude}m`} />
              <MiniValue label="Speed" value={`${waypoint.speed}m/s`} />
              <MiniValue label="Action" value={waypoint.action} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#1d2533] bg-black px-2 py-2">
      <div className="font-mono text-[7px] font-bold uppercase tracking-[0.12em] text-(--muted)">
        {label}
      </div>

      <div className="mt-1 truncate font-mono text-[10px] font-bold text-(--foreground)">
        {value}
      </div>
    </div>
  );
}

function MissionActions({
  onAddWaypoint,
  onExportMission,
  onClearMission,
  analysis,
}: {
  onAddWaypoint: () => void;
  onExportMission: () => void;
  onClearMission: () => void;
  analysis: ReturnType<typeof analyzeMission>;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <ActionButton
          icon={Plus}
          label="Add WP"
          tone="info"
          onClick={onAddWaypoint}
        />

        <ActionButton
          icon={Download}
          label="Export JSON"
          tone="nominal"
          onClick={onExportMission}
        />

        <ActionButton icon={Save} label="Save Future" tone="muted" disabled />

        <ActionButton icon={Send} label="Upload Future" tone="muted" disabled />

        <button
          type="button"
          onClick={onClearMission}
          className="flex h-10 items-center justify-center gap-2 rounded border border-[rgba(255,77,77,0.38)] bg-[rgba(255,77,77,0.08)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-(--critical) transition hover:bg-[rgba(255,77,77,0.12)] md:col-span-2"
        >
          <Trash2 size={14} />
          Clear Mission
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-[#1d2533] bg-[#070a10] p-4 md:grid-cols-3">
        <MiniValue
          label="Distance"
          value={formatDistance(analysis.totalDistanceMeters)}
        />

        <MiniValue
          label="Time"
          value={formatTime(analysis.estimatedTimeSeconds)}
        />

        <MiniValue
          label="Battery"
          value={`${analysis.estimatedBatteryPercent.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  tone,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const toneStyle = toneClass[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded border px-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition ${toneStyle.border} ${toneStyle.bg} ${toneStyle.text} ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-(--primary) hover:text-(--primary)"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function MissionStatusStrip({
  missionReady,
}: {
  missionReady: boolean;
}) {
  const tone = missionReady ? toneClass.nominal : toneClass.caution;

  return (
    <span
      className={`flex h-10 items-center gap-2 rounded-full border px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tone.border} ${tone.bg} ${tone.text}`}
    >
      {missionReady ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
      {missionReady ? "Mission Ready" : "Needs Review"}
    </span>
  );
}

export function MissionPlanner() {
  const [waypoints, setWaypoints] =
    useState<MissionWaypoint[]>(initialWaypoints);

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

  const missionMetrics: MissionMetric[] = [
    {
      label: "Waypoints",
      value: analysis.waypointCount,
      helper: "Mission route points",
      icon: MapPinned,
      tone: analysis.waypointCount >= 2 ? "nominal" : "caution",
    },
    {
      label: "Distance",
      value: (analysis.totalDistanceMeters / 1000).toFixed(2),
      unit: "km",
      helper: "Estimated route length",
      icon: Route,
      tone: "info",
    },
    {
      label: "Est. Time",
      value: Math.ceil(analysis.estimatedTimeSeconds / 60),
      unit: "min",
      helper: "Planned mission duration",
      icon: Clock,
      tone: "info",
    },
    {
      label: "Battery Use",
      value: analysis.estimatedBatteryPercent.toFixed(1),
      unit: "%",
      helper: "Estimated battery draw",
      icon: Battery,
      tone: getBatteryTone(analysis.estimatedBatteryPercent),
    },
    {
      label: "Geofence",
      value: analysis.geofencePassed ? "Pass" : "Fail",
      helper: "Boundary safety check",
      icon: Navigation,
      tone: analysis.geofencePassed ? "nominal" : "critical",
    },
    {
      label: "Readiness",
      value: analysis.missionReady ? "Ready" : "Check",
      helper: "Mission launch state",
      icon: Gauge,
      tone: getReadinessTone(analysis.missionReady),
    },
  ];

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
      name: "Aeronexus Mission Plan",
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
    <div className="min-h-screen bg-[#09090b] px-5 py-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <section className="rounded-xl border border-[#1d2533] bg-[#07111f] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary)">
                Operations
              </p>

              <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-(--foreground)">
                Mission Planner
              </h1>

              <p className="mt-2 max-w-5xl text-[13px] leading-relaxed text-(--muted)">
                Plan UAV routes, edit waypoint altitude and speed, validate
                geofence safety, estimate mission time, and export route JSON
                for later command-control integration.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MissionStatusStrip missionReady={analysis.missionReady} />

              <button
                type="button"
                onClick={addDefaultWaypoint}
                className="flex h-10 items-center gap-2 rounded border border-[#2a3547] bg-black px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-(--foreground) transition hover:border-(--primary) hover:text-(--primary)"
              >
                <Plus size={14} />
                Add Waypoint
              </button>

              <button
                type="button"
                onClick={exportMissionJson}
                className="flex h-10 items-center gap-2 rounded bg-(--primary) px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-90"
              >
                <Download size={14} />
                Export Plan
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {missionMetrics.map((item) => (
            <MetricTile key={item.label} item={item} />
          ))}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SectionShell
              eyebrow="Mission Map"
              title="Route Planning Map"
              action={`${analysis.waypointCount} Waypoints`}
            >
              <div className="min-h-[620px] overflow-hidden rounded-xl border border-[#1d2533] bg-[#070a10]">
                <MissionPlanningMap
                  waypoints={waypoints}
                  selectedWaypointId={selectedWaypointId}
                  onWaypointsChange={setWaypoints}
                  onSelectWaypoint={setSelectedWaypointId}
                />
              </div>
            </SectionShell>
          </div>

          <div className="grid gap-6 xl:col-span-4">
            <SectionShell
              eyebrow="Waypoint Control"
              title="Selected Waypoint Editor"
              action={selectedWaypoint?.name ?? "No Selection"}
            >
              <WaypointEditor
                selectedWaypoint={selectedWaypoint}
                onUpdate={updateWaypoint}
                onDelete={deleteWaypoint}
              />
            </SectionShell>

            <SectionShell
              eyebrow="Mission Tools"
              title="Route Actions"
              action="Plan Controls"
            >
              <MissionActions
                onAddWaypoint={addDefaultWaypoint}
                onExportMission={exportMissionJson}
                onClearMission={clearMission}
                analysis={analysis}
              />
            </SectionShell>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SectionShell
              eyebrow="Waypoint Stack"
              title="Mission Route List"
              action={`${waypoints.length} Active`}
            >
              <WaypointList
                waypoints={waypoints}
                selectedWaypointId={selectedWaypointId}
                onSelect={setSelectedWaypointId}
              />
            </SectionShell>
          </div>

          <div className="xl:col-span-5">
            <SectionShell
              eyebrow="Safety"
              title="Mission Safety Analysis"
              action={analysis.missionReady ? "Ready" : "Needs Review"}
            >
              <SafetyPanel analysis={analysis} />
            </SectionShell>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            item={{
              label: "Route Mode",
              value: "Manual",
              helper: "Operator-defined waypoints",
              icon: SlidersHorizontal,
              tone: "info",
            }}
          />

          <MetricTile
            item={{
              label: "Safety Engine",
              value: analysis.missionReady ? "Clear" : "Review",
              helper: "Geofence and warnings checked",
              icon: ShieldCheck,
              tone: analysis.missionReady ? "nominal" : "caution",
            }}
          />

          <MetricTile
            item={{
              label: "Export Format",
              value: "JSON",
              helper: "Mission plan download format",
              icon: Save,
              tone: "info",
            }}
          />

          <MetricTile
            item={{
              label: "Upload State",
              value: "Future",
              helper: "Drone upload integration pending",
              icon: Send,
              tone: "muted",
            }}
          />
        </section>
      </div>
    </div>
  );
}