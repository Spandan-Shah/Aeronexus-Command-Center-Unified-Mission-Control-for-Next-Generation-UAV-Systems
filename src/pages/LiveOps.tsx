import {
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  Activity,
  BatteryCharging,
  Compass,
  Focus,
  Gauge,
  Globe2,
  Home,
  LocateFixed,
  MapPinned,
  Minus,
  Navigation,
  Plus,
  Radio,
  RefreshCw,
  Satellite,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  AeroWorldMap,
} from "../components/map/AeroWorldMap";

import type {
  AeroWorldMapHandle,
  AeroWorldMapState,
  MapLayerId,
} from "../components/map/AeroWorldMap";

import {
  useVehicleTelemetry,
} from "../hooks/useVehicleTelemetry";

import type {
  MissionNexusConnectionState,
  VehicleState,
} from "../types/vehicle";


/* =========================================================
   MissionNexus V3.1
   Live Operations

   Backend
      ↓
   Vehicle Registry
      ↓
   WebSocket
      ↓
   useVehicleTelemetry()
      ↓
   Live Operations
   ========================================================= */


const initialMapState: AeroWorldMapState = {
  baseMap: "osm",

  zoom: 12,

  gpsAvailable: false,

  layers: {
    "live-drone": true,

    drones: true,

    route: true,

    geofence: true,

    restricted: true,

    contacts: true,

    heat: true,

    home: true,
  },
};


/* =========================================================
   Formatting Helpers
   ========================================================= */


function formatNumber(
  value: number | null | undefined,
  digits = 1,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(digits);
}


function formatPercent(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${Math.round(value)}%`;
}


function formatGpsFix(
  fixType: number | undefined,
) {
  if (fixType === undefined) {
    return "NO DATA";
  }

  if (fixType >= 6) {
    return "RTK FIXED";
  }

  if (fixType === 5) {
    return "RTK FLOAT";
  }

  if (fixType >= 3) {
    return "3D FIX";
  }

  if (fixType === 2) {
    return "2D FIX";
  }

  if (fixType === 1) {
    return "NO FIX";
  }

  return "NO GPS";
}


function formatWaypoint(
  vehicle: VehicleState | null,
) {
  if (!vehicle) {
    return "—";
  }

  if (
    vehicle.mission.total_waypoints <= 0
  ) {
    return "—";
  }

  return `${vehicle.mission.current_waypoint} / ${vehicle.mission.total_waypoints}`;
}


/* =========================================================
   Connection Helpers
   ========================================================= */


function connectionLabel(
  state: MissionNexusConnectionState,
) {
  if (state === "DISCONNECTED") {
    return "LINK LOST";
  }

  return state;
}


function connectionColor(
  state: MissionNexusConnectionState,
) {
  if (state === "CONNECTED") {
    return {
      text: "text-(--nominal)",

      dot: "bg-(--nominal)",

      border:
        "border-[rgba(89,217,154,0.26)]",

      background:
        "bg-[rgba(89,217,154,0.045)]",
    };
  }

  if (state === "DEGRADED") {
    return {
      text: "text-(--caution)",

      dot: "bg-(--caution)",

      border:
        "border-[rgba(246,178,60,0.28)]",

      background:
        "bg-[rgba(246,178,60,0.045)]",
    };
  }

  if (state === "CONNECTING") {
    return {
      text: "text-(--info)",

      dot: "bg-(--info)",

      border:
        "border-[rgba(90,169,255,0.26)]",

      background:
        "bg-[rgba(90,169,255,0.04)]",
    };
  }

  return {
    text: "text-(--critical)",

    dot: "bg-(--critical)",

    border:
      "border-[rgba(255,90,99,0.30)]",

    background:
      "bg-[rgba(255,90,99,0.05)]",
  };
}


function sourceClass(
  source: string | undefined,
) {
  if (source === "LIVE") {
    return "text-(--nominal)";
  }

  if (source === "SITL") {
    return "text-(--info)";
  }

  if (source === "SIM") {
    return "text-(--primary)";
  }

  return "text-white/42";
}


/* =========================================================
   Compact Action
   ========================================================= */


function CompactAction({
  icon: Icon,
  label,
  onClick,
  primary = false,
}: {
  icon: LucideIcon;

  label: string;

  onClick: () => void;

  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex h-[38px] min-w-0 items-center gap-2",

        "rounded-[5px] border px-2.5",

        "text-left",

        "transition-[background-color,border-color,color,transform] duration-150",

        "active:translate-y-px",

        primary
          ? "border-[rgba(246,178,60,0.30)] bg-[rgba(246,178,60,0.06)] text-(--primary)"
          : "border-white/[0.08] bg-white/[0.015] text-white/70 hover:border-white/15 hover:bg-white/[0.03] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center",

          "rounded-[4px] border",

          primary
            ? "border-[rgba(246,178,60,0.24)] bg-[rgba(246,178,60,0.05)]"
            : "border-white/[0.07] bg-black/25",
        ].join(" ")}
      >
        <Icon
          size={12}
          strokeWidth={1.6}
        />
      </span>

      <span className="min-w-0 truncate text-[13px] font-medium leading-none">
        {label}
      </span>
    </button>
  );
}


/* =========================================================
   Layer Toggle
   ========================================================= */


function CompactLayer({
  label,
  enabled,
  onClick,
}: {
  label: string;

  enabled: boolean;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={enabled}
      className={[
        "flex h-[30px] min-w-0 items-center justify-between",

        "rounded-[4px] border px-2.5",

        "transition-[background-color,border-color,color] duration-150",

        enabled
          ? "border-[rgba(246,178,60,0.22)] bg-[rgba(246,178,60,0.04)] text-(--primary)"
          : "border-white/[0.06] bg-white/[0.01] text-white/50 hover:border-white/12 hover:text-white/74",
      ].join(" ")}
    >
      <span className="min-w-0 truncate text-[13px] font-medium leading-none tracking-[-0.01em]">
        {label}
      </span>

      <span className="ml-2 shrink-0 font-mono text-[12px] font-semibold leading-none">
        {enabled
          ? "ON"
          : "OFF"}
      </span>
    </button>
  );
}


/* =========================================================
   Control Section
   ========================================================= */


function ControlSection({
  title,
  children,
}: {
  title: string;

  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="shrink-0 font-mono text-[13px] font-semibold uppercase tracking-[0.055em] text-white/52">
          {title}
        </span>

        <span className="h-px min-w-0 flex-1 bg-white/[0.07]" />
      </div>

      {children}
    </section>
  );
}


/* =========================================================
   Telemetry Metric
   ========================================================= */


function TelemetryMetric({
  icon: Icon,
  label,
  value,
  suffix,
  valueClass = "text-white/82",
}: {
  icon: LucideIcon;

  label: string;

  value: string;

  suffix?: string;

  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-[4px] border border-white/[0.065] bg-black/20 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Icon
          size={12}
          strokeWidth={1.6}
          className="shrink-0 text-white/36"
        />

        <span className="truncate text-[12px] font-medium text-white/38">
          {label}
        </span>
      </div>

      <div className="mt-1 flex min-w-0 items-baseline gap-1">
        <span
          className={[
            "truncate font-mono text-[14px] font-semibold",

            valueClass,
          ].join(" ")}
        >
          {value}
        </span>

        {suffix ? (
          <span className="shrink-0 font-mono text-[11px] text-white/28">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}


/* =========================================================
   Dense Status Row
   ========================================================= */


function StatusRow({
  label,
  value,
  valueClass = "text-white/74",
}: {
  label: string;

  value: string;

  valueClass?: string;
}) {
  return (
    <div className="flex h-[27px] min-w-0 items-center justify-between gap-3 border-b border-white/[0.05] last:border-b-0">
      <span className="truncate text-[12px] text-white/38">
        {label}
      </span>

      <span
        className={[
          "max-w-[62%] truncate text-right font-mono text-[12px] font-semibold",

          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}


/* =========================================================
   Vehicle Header
   ========================================================= */


function VehicleHeader({
  vehicle,
  connectionState,
  vehicleCount,
  selectedVehicleId,
  setSelectedVehicleId,
  vehicles,
  reconnect,
}: {
  vehicle: VehicleState | null;

  connectionState:
    MissionNexusConnectionState;

  vehicleCount: number;

  selectedVehicleId:
    string | null;

  setSelectedVehicleId: (
    id: string | null,
  ) => void;

  vehicles: VehicleState[];

  reconnect: () => void;
}) {
  const connection =
    connectionColor(
      connectionState,
    );

  const source =
    vehicle?.source ??
    "NO SOURCE";

  return (
    <div
      className={[
        "shrink-0 border-b px-3 py-2.5",

        connection.border,

        connection.background,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[16px] font-semibold tracking-[-0.015em] text-white">
              {vehicle?.callsign ??
                "NO VEHICLE"}
            </span>

            <span
              className={[
                "rounded-[3px] border border-white/[0.08] bg-black/25 px-1.5 py-0.5",

                "font-mono text-[11px] font-semibold",

                sourceClass(
                  vehicle?.source,
                ),
              ].join(" ")}
            >
              {source}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-white/38">
            <span>
              {vehicle?.vehicle_id ??
                "Vehicle Core"}
            </span>

            <span className="text-white/16">
              •
            </span>

            <span>
              {vehicle?.flight_mode ??
                "WAITING"}
            </span>

            <span className="text-white/16">
              •
            </span>

            <span>
              {vehicle?.armed
                ? "ARMED"
                : "DISARMED"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={[
              "flex items-center gap-1.5",

              "font-mono text-[12px] font-semibold uppercase",

              connection.text,
            ].join(" ")}
          >
            <span
              className={[
                "h-2 w-2 rounded-full",

                connection.dot,

                connectionState ===
                "CONNECTING"
                  ? "animate-pulse"
                  : "",
              ].join(" ")}
            />

            {connectionLabel(
              connectionState,
            )}
          </div>

          {connectionState !==
          "CONNECTED" ? (
            <button
              type="button"
              onClick={reconnect}
              title="Reconnect telemetry"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/[0.09] bg-black/25 text-white/55 transition hover:border-white/20 hover:text-white"
            >
              <RefreshCw
                size={12}
              />
            </button>
          ) : null}
        </div>
      </div>

      {vehicleCount > 1 ? (
        <select
          value={
            selectedVehicleId ??
            ""
          }
          onChange={(
            event,
          ) =>
            setSelectedVehicleId(
              event.target.value ||
                null,
            )
          }
          className="mt-2 h-8 w-full rounded-[4px] border border-white/[0.08] bg-[#05060d] px-2 font-mono text-[12px] text-white/72 outline-none"
        >
          {vehicles.map(
            (
              item,
            ) => (
              <option
                key={
                  item.vehicle_id
                }
                value={
                  item.vehicle_id
                }
              >
                {item.callsign} ·{" "}
                {item.source} ·{" "}
                {item.vehicle_id}
              </option>
            ),
          )}
        </select>
      ) : null}
    </div>
  );
}


/* =========================================================
   Vehicle Telemetry
   ========================================================= */


function VehicleTelemetryPanel({
  vehicle,
}: {
  vehicle: VehicleState | null;
}) {
  const gpsGood =
    Boolean(
      vehicle &&
        vehicle.gps.fix_type >=
          3 &&
        vehicle.health.gps_ok,
    );

  const batteryGood =
    Boolean(
      vehicle &&
        vehicle.health
          .battery_ok,
    );

  const linkGood =
    Boolean(
      vehicle &&
        vehicle.health.link_ok,
    );

  const overallHealthy =
    vehicle?.health.overall ===
    "NOMINAL";

  return (
    <>
      <ControlSection title="Flight Telemetry">
        <div className="grid grid-cols-2 gap-1.5">
          <TelemetryMetric
            icon={Gauge}
            label="Altitude"
            value={
              formatNumber(
                vehicle?.position
                  .altitude_relative_m,
                1,
              )
            }
            suffix="m AGL"
            valueClass="text-(--info)"
          />

          <TelemetryMetric
            icon={Navigation}
            label="Ground Speed"
            value={
              formatNumber(
                vehicle?.motion
                  .ground_speed_mps,
                1,
              )
            }
            suffix="m/s"
          />

          <TelemetryMetric
            icon={Compass}
            label="Heading"
            value={
              formatNumber(
                vehicle?.motion
                  .heading_deg,
                0,
              )
            }
            suffix="deg"
          />

          <TelemetryMetric
            icon={Activity}
            label="Vertical"
            value={
              formatNumber(
                vehicle?.motion
                  .vertical_speed_mps,
                1,
              )
            }
            suffix="m/s"
          />
        </div>
      </ControlSection>

      <ControlSection title="Power">
        <div className="grid grid-cols-3 gap-1.5">
          <TelemetryMetric
            icon={
              BatteryCharging
            }
            label="Battery"
            value={
              formatPercent(
                vehicle?.battery
                  .remaining_percent,
              )
            }
            valueClass={
              batteryGood
                ? "text-(--nominal)"
                : "text-(--critical)"
            }
          />

          <TelemetryMetric
            icon={Activity}
            label="Voltage"
            value={
              formatNumber(
                vehicle?.battery
                  .voltage_v,
                2,
              )
            }
            suffix="V"
          />

          <TelemetryMetric
            icon={Gauge}
            label="Current"
            value={
              formatNumber(
                vehicle?.battery
                  .current_a,
                1,
              )
            }
            suffix="A"
          />
        </div>
      </ControlSection>

      <ControlSection title="Navigation / Link">
        <div className="grid grid-cols-2 gap-x-3">
          <div>
            <StatusRow
              label="GPS"
              value={
                formatGpsFix(
                  vehicle?.gps
                    .fix_type,
                )
              }
              valueClass={
                gpsGood
                  ? "text-(--nominal)"
                  : "text-(--caution)"
              }
            />

            <StatusRow
              label="Satellites"
              value={
                vehicle
                  ? `${vehicle.gps.satellites_visible}`
                  : "—"
              }
            />

            <StatusRow
              label="HDOP"
              value={
                formatNumber(
                  vehicle?.gps
                    .hdop,
                  2,
                )
              }
            />
          </div>

          <div>
            <StatusRow
              label="Link"
              value={
                vehicle?.link.state ??
                "—"
              }
              valueClass={
                linkGood
                  ? "text-(--nominal)"
                  : "text-(--critical)"
              }
            />

            <StatusRow
              label="Quality"
              value={
                formatPercent(
                  vehicle?.link
                    .quality_percent,
                )
              }
            />

            <StatusRow
              label="RSSI"
              value={
                vehicle?.link
                  .rssi_dbm ===
                  null ||
                vehicle?.link
                  .rssi_dbm ===
                  undefined
                  ? "—"
                  : `${Math.round(
                      vehicle.link
                        .rssi_dbm,
                    )} dBm`
              }
            />
          </div>
        </div>
      </ControlSection>

      <ControlSection title="Mission / Health">
        <div className="grid grid-cols-2 gap-x-3">
          <div>
            <StatusRow
              label="Mission"
              value={
                vehicle?.mission
                  .mission_id ??
                "—"
              }
            />

            <StatusRow
              label="State"
              value={
                vehicle?.mission
                  .state ??
                "—"
              }
              valueClass="text-(--info)"
            />

            <StatusRow
              label="Waypoint"
              value={
                formatWaypoint(
                  vehicle,
                )
              }
            />
          </div>

          <div>
            <StatusRow
              label="Health"
              value={
                vehicle?.health
                  .overall ??
                "UNKNOWN"
              }
              valueClass={
                overallHealthy
                  ? "text-(--nominal)"
                  : "text-(--caution)"
              }
            />

            <StatusRow
              label="Failsafe"
              value={
                vehicle?.health
                  .failsafe_active
                  ? "ACTIVE"
                  : "CLEAR"
              }
              valueClass={
                vehicle?.health
                  .failsafe_active
                  ? "text-(--critical)"
                  : "text-(--nominal)"
              }
            />

            <StatusRow
              label="System ID"
              value={
                vehicle?.system_id !==
                  null &&
                vehicle?.system_id !==
                  undefined
                  ? `${vehicle.system_id}`
                  : "—"
              }
            />
          </div>
        </div>
      </ControlSection>
    </>
  );
}


/* =========================================================
   Map Controls
   ========================================================= */


function MapControls({
  mapRef,
  mapState,
  toggleLayer,
  gpsOnline,
}: {
  mapRef:
    RefObject<
      AeroWorldMapHandle | null
    >;

  mapState:
    AeroWorldMapState;

  toggleLayer: (
    layer: MapLayerId,
  ) => void;

  gpsOnline: boolean;
}) {
  return (
    <>
      <ControlSection title="Map Navigation">
        <div className="grid grid-cols-4 gap-1.5">
          <CompactAction
            icon={LocateFixed}
            label="UAV"
            primary
            onClick={() =>
              mapRef.current?.focusUav()
            }
          />

          <CompactAction
            icon={Focus}
            label="AOI"
            onClick={() =>
              mapRef.current?.focusAoi()
            }
          />

          <CompactAction
            icon={MapPinned}
            label="Mission"
            onClick={() =>
              mapRef.current?.focusMission()
            }
          />

          <CompactAction
            icon={Home}
            label="Home"
            onClick={() =>
              mapRef.current?.focusHome()
            }
          />
        </div>

        <div className="mt-1.5 grid grid-cols-[1fr_1fr_1.7fr] gap-1.5">
          <CompactAction
            icon={Plus}
            label="In"
            onClick={() =>
              mapRef.current?.zoomIn()
            }
          />

          <CompactAction
            icon={Minus}
            label="Out"
            onClick={() =>
              mapRef.current?.zoomOut()
            }
          />

          <button
            type="button"
            onClick={() =>
              mapRef.current?.toggleBaseMap()
            }
            className={[
              "flex h-[38px] min-w-0 items-center justify-between gap-2",

              "rounded-[5px] border",

              "border-[rgba(90,169,255,0.20)]",

              "bg-[rgba(90,169,255,0.04)]",

              "px-2.5 text-(--info)",

              "transition-[background-color,border-color] duration-150",

              "hover:border-[rgba(90,169,255,0.35)]",
            ].join(" ")}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Globe2
                size={12}
                strokeWidth={1.6}
              />

              <span className="truncate text-[12px]">
                Map
              </span>
            </span>

            <span className="shrink-0 font-mono text-[11px] font-semibold uppercase">
              {mapState.baseMap}
            </span>
          </button>
        </div>
      </ControlSection>

      <ControlSection title="Mission Layers">
        <div className="grid grid-cols-4 gap-1">
          <CompactLayer
            label="Aircraft"
            enabled={
              mapState.layers[
                "live-drone"
              ]
            }
            onClick={() =>
              toggleLayer(
                "live-drone",
              )
            }
          />

          <CompactLayer
            label="Route"
            enabled={
              mapState.layers
                .route
            }
            onClick={() =>
              toggleLayer(
                "route",
              )
            }
          />

          <CompactLayer
            label="Fence"
            enabled={
              mapState.layers
                .geofence
            }
            onClick={() =>
              toggleLayer(
                "geofence",
              )
            }
          />

          <CompactLayer
            label="Restricted"
            enabled={
              mapState.layers
                .restricted
            }
            onClick={() =>
              toggleLayer(
                "restricted",
              )
            }
          />

          <CompactLayer
            label="Contacts"
            enabled={
              mapState.layers
                .contacts
            }
            onClick={() =>
              toggleLayer(
                "contacts",
              )
            }
          />

          <CompactLayer
            label="Heat"
            enabled={
              mapState.layers
                .heat
            }
            onClick={() =>
              toggleLayer(
                "heat",
              )
            }
          />

          <CompactLayer
            label="Sim UAVs"
            enabled={
              mapState.layers
                .drones
            }
            onClick={() =>
              toggleLayer(
                "drones",
              )
            }
          />

          <CompactLayer
            label="Home"
            enabled={
              mapState.layers
                .home
            }
            onClick={() =>
              toggleLayer(
                "home",
              )
            }
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-[4px] border border-white/[0.055] bg-black/20 px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <Satellite
              size={12}
              className={
                gpsOnline
                  ? "text-(--nominal)"
                  : "text-(--caution)"
              }
            />

            <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-white/42">
              WGS-84
            </span>
          </div>

          <span className="font-mono text-[11px] text-white/56">
            Z{" "}
            {mapState.zoom.toFixed(
              1,
            )}
          </span>
        </div>
      </ControlSection>
    </>
  );
}


/* =========================================================
   Right Operations Rail
   ========================================================= */


function OperationsRail({
  mapRef,
  mapState,
  toggleLayer,
  vehicle,
  vehicles,
  vehicleCount,
  selectedVehicleId,
  setSelectedVehicleId,
  connectionState,
  reconnect,
}: {
  mapRef:
    RefObject<
      AeroWorldMapHandle | null
    >;

  mapState:
    AeroWorldMapState;

  toggleLayer: (
    layer: MapLayerId,
  ) => void;

  vehicle: VehicleState | null;

  vehicles: VehicleState[];

  vehicleCount: number;

  selectedVehicleId:
    string | null;

  setSelectedVehicleId: (
    id: string | null,
  ) => void;

  connectionState:
    MissionNexusConnectionState;

  reconnect: () => void;
}) {
  const gpsOnline =
    Boolean(
      vehicle &&
        vehicle.connected &&
        vehicle.gps.fix_type >=
          3 &&
        vehicle.health.gps_ok,
    );

  return (
    <aside
      className={[
        "flex h-full min-h-0 flex-col",

        "overflow-hidden",

        "border-l border-white/[0.08]",

        "bg-[#07090d]",
      ].join(" ")}
    >
      <VehicleHeader
        vehicle={vehicle}
        connectionState={
          connectionState
        }
        vehicleCount={
          vehicleCount
        }
        selectedVehicleId={
          selectedVehicleId
        }
        setSelectedVehicleId={
          setSelectedVehicleId
        }
        vehicles={vehicles}
        reconnect={reconnect}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        <VehicleTelemetryPanel
          vehicle={vehicle}
        />

        <MapControls
          mapRef={mapRef}
          mapState={mapState}
          toggleLayer={
            toggleLayer
          }
          gpsOnline={gpsOnline}
        />
      </div>
    </aside>
  );
}


/* =========================================================
   Live Operations
   ========================================================= */


export function LiveOps() {
  const mapRef =
    useRef<
      AeroWorldMapHandle | null
    >(
      null,
    );

  const [
    mapState,
    setMapState,
  ] =
    useState<AeroWorldMapState>(
      initialMapState,
    );

  const {
    vehicles,

    vehicleCount,

    activeVehicle,

    selectedVehicleId,

    setSelectedVehicleId,

    connectionState,

    reconnect,
  } =
    useVehicleTelemetry(
      "MN-001-SIM",
    );


  function toggleLayer(
    layer: MapLayerId,
  ) {
    mapRef.current?.toggleLayer(
      layer,
    );
  }


  const connection =
    connectionColor(
      connectionState,
    );


  const gpsOnline =
    Boolean(
      activeVehicle &&
        activeVehicle.connected &&
        activeVehicle.gps.fix_type >=
          3 &&
        activeVehicle.health.gps_ok,
    );


  return (
    <section className="h-[calc(100vh-70px)] w-full overflow-hidden bg-[#05060d]">
      <div
        className={[
          "mx-auto grid h-full w-full max-w-[1640px]",

          "grid-rows-[52px_minmax(0,1fr)]",

          "px-4 pb-4 pt-2",

          "sm:px-6",

          "lg:px-8",

          "xl:px-10",

          "2xl:px-14",
        ].join(" ")}
      >
        {/* =================================================
            Page Header
            ================================================= */}

        <header className="flex min-w-0 items-center justify-between border-b border-white/[0.08]">
          <div className="flex min-w-0 items-center gap-2.5">
            <Navigation
              size={15}
              strokeWidth={1.6}
              className="shrink-0 text-(--info)"
            />

            <h1
              className="truncate text-[16px] font-semibold tracking-[-0.02em] text-white"
              style={{
                fontFamily:
                  '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
              }}
            >
              Live Operations
            </h1>

            <span
              aria-hidden="true"
              className="hidden h-3 w-px bg-white/10 sm:block"
            />

            <span className="hidden truncate font-mono text-[13px] font-medium uppercase tracking-[0.045em] text-white/40 sm:block">
              Tactical Mission Map
            </span>

            {activeVehicle ? (
              <>
                <span
                  aria-hidden="true"
                  className="hidden h-3 w-px bg-white/10 lg:block"
                />

                <span className="hidden font-mono text-[12px] font-semibold text-white/68 lg:block">
                  {
                    activeVehicle.callsign
                  }
                </span>

                <span
                  className={[
                    "hidden rounded-[3px] border border-white/[0.08] bg-black/25 px-1.5 py-0.5",

                    "font-mono text-[11px] font-semibold lg:block",

                    sourceClass(
                      activeVehicle.source,
                    ),
                  ].join(" ")}
                >
                  {
                    activeVehicle.source
                  }
                </span>
              </>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden items-center gap-1.5 lg:flex">
              <Satellite
                size={13}
                className={
                  gpsOnline
                    ? "text-(--nominal)"
                    : "text-(--caution)"
                }
              />

              <span
                className={[
                  "font-mono text-[12px] font-semibold uppercase",

                  gpsOnline
                    ? "text-(--nominal)"
                    : "text-(--caution)",
                ].join(" ")}
              >
                {gpsOnline
                  ? "GPS 3D FIX"
                  : "GPS WAIT"}
              </span>
            </div>

            <div
              className={[
                "flex items-center gap-1.5",

                "font-mono text-[12px] font-semibold uppercase tracking-[0.04em]",

                connection.text,
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",

                  connection.dot,

                  connectionState ===
                  "CONNECTING"
                    ? "animate-pulse"
                    : "",
                ].join(" ")}
              />

              {connectionLabel(
                connectionState,
              )}
            </div>
          </div>
        </header>

        {/* =================================================
            Map + Operations Rail
            ================================================= */}

        <div className="min-h-0 pt-3">
          <div
            className={[
              "grid h-full min-h-0 overflow-hidden",

              "rounded-[6px]",

              "border border-white/[0.09]",

              "bg-[#020304]",

              "shadow-[0_18px_48px_rgba(0,0,0,0.2)]",

              "lg:grid-cols-[minmax(0,1fr)_390px]",

              "xl:grid-cols-[minmax(0,1fr)_410px]",

              "2xl:grid-cols-[minmax(0,1fr)_430px]",
            ].join(" ")}
          >
            {/* =============================================
                Map Workspace
                ============================================= */}

            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <AeroWorldMap
                ref={mapRef}
                onStateChange={
                  setMapState
                }
              />

              {/* ===========================================
                  Active Vehicle Source
                  =========================================== */}

              {activeVehicle ? (
                <div className="pointer-events-none absolute bottom-3 left-3 z-[450] hidden items-center gap-2 rounded-[4px] border border-white/[0.09] bg-[#05060d]/94 px-2.5 py-1.5 shadow-lg backdrop-blur lg:flex">
                  <Radio
                    size={12}
                    className={
                      connectionState ===
                      "CONNECTED"
                        ? "text-(--nominal)"
                        : "text-(--caution)"
                    }
                  />

                  <span className="font-mono text-[11px] font-semibold text-white/74">
                    {
                      activeVehicle.vehicle_id
                    }
                  </span>

                  <span className="text-white/18">
                    •
                  </span>

                  <span
                    className={[
                      "font-mono text-[11px] font-semibold",

                      sourceClass(
                        activeVehicle.source,
                      ),
                    ].join(" ")}
                  >
                    {
                      activeVehicle.source
                    }
                  </span>

                  <span className="text-white/18">
                    •
                  </span>

                  <span className="font-mono text-[11px] text-white/48">
                    {activeVehicle.position.latitude_deg.toFixed(
                      5,
                    )}
                    ,{" "}
                    {activeVehicle.position.longitude_deg.toFixed(
                      5,
                    )}
                  </span>
                </div>
              ) : null}
            </div>

            {/* =============================================
                Vehicle Operations Rail
                ============================================= */}

            <OperationsRail
              mapRef={mapRef}
              mapState={mapState}
              toggleLayer={
                toggleLayer
              }
              vehicle={
                activeVehicle
              }
              vehicles={vehicles}
              vehicleCount={
                vehicleCount
              }
              selectedVehicleId={
                selectedVehicleId
              }
              setSelectedVehicleId={
                setSelectedVehicleId
              }
              connectionState={
                connectionState
              }
              reconnect={reconnect}
            />
          </div>
        </div>
      </div>
    </section>
  );
}