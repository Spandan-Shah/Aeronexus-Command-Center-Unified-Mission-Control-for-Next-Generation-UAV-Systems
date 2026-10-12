import {
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  Focus,
  Globe2,
  Home,
  LocateFixed,
  MapPinned,
  Minus,
  Navigation,
  Plus,
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

/* =========================================================
   MissionNexus V2
   Tactical Mission Map

   Typography:
   - Headings: 16px
   - Content: 13px

   Layout:
   - entire map workspace fits first viewport
   - right panel remains two-column
   - no internal scrolling
   - footer begins after first viewport
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
        "group flex h-[42px] min-w-0 items-center gap-2",

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
          "flex h-7 w-7 shrink-0 items-center justify-center",

          "rounded-[4px] border",

          primary
            ? "border-[rgba(246,178,60,0.24)] bg-[rgba(246,178,60,0.05)]"
            : "border-white/[0.07] bg-black/25",
        ].join(" ")}
      >
        <Icon
          size={13}
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

   Label = 13px
   ON/OFF = 13px
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
        "flex h-[34px] min-w-0 items-center justify-between",

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

      <span className="ml-2 shrink-0 font-mono text-[13px] font-semibold leading-none">
        {enabled
          ? "ON"
          : "OFF"}
      </span>
    </button>
  );
}

/* =========================================================
   Control Section

   Heading = 16px
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
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 font-mono text-[16px] font-semibold uppercase tracking-[0.055em] text-white/58">
          {title}
        </span>

        <span className="h-px min-w-0 flex-1 bg-white/[0.07]" />
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   Map Control Rail
   ========================================================= */

function MapControlRail({
  mapRef,
  mapState,
  toggleLayer,
}: {
  mapRef:
    RefObject<AeroWorldMapHandle | null>;

  mapState:
    AeroWorldMapState;

  toggleLayer: (
    layer: MapLayerId,
  ) => void;
}) {
  const gpsOnline =
    mapState.gpsAvailable;

  return (
    <aside
      className={[
        "flex h-full min-h-0 flex-col",

        "overflow-hidden",

        "border-l border-white/[0.08]",

        "bg-[#07090d]",
      ].join(" ")}
    >
      {/* ===================================================
          Map Control Header
          =================================================== */}

      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[16px] font-semibold uppercase tracking-[0.055em] text-(--primary)">
              Map Controls
            </div>

            <div className="mt-0.5 truncate text-[13px] leading-[1.3] text-white/52">
              Navigation · view · layers
            </div>
          </div>

          <div
            className={[
              "flex shrink-0 items-center gap-1.5",

              "font-mono text-[13px] font-semibold uppercase tracking-[0.035em]",

              gpsOnline
                ? "text-(--nominal)"
                : "text-(--caution)",
            ].join(" ")}
          >
            <span
              className={[
                "h-2 w-2 rounded-full",

                gpsOnline
                  ? "bg-(--nominal)"
                  : "bg-(--caution)",
              ].join(" ")}
            />

            {gpsOnline
              ? "GPS LIVE"
              : "GPS SEARCH"}
          </div>
        </div>
      </div>

      {/* ===================================================
          Control Content
          =================================================== */}

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
        {/* ===============================================
            Navigation
            =============================================== */}

        <ControlSection title="Navigation">
          <div className="grid grid-cols-2 gap-1.5">
            <CompactAction
              icon={LocateFixed}
              label="Follow UAV"
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
        </ControlSection>

        {/* ===============================================
            Map View
            =============================================== */}

        <ControlSection title="Map View">
          <div className="grid grid-cols-2 gap-1.5">
            <CompactAction
              icon={Plus}
              label="Zoom In"
              onClick={() =>
                mapRef.current?.zoomIn()
              }
            />

            <CompactAction
              icon={Minus}
              label="Zoom Out"
              onClick={() =>
                mapRef.current?.zoomOut()
              }
            />
          </div>

          <button
            type="button"
            onClick={() =>
              mapRef.current?.toggleBaseMap()
            }
            className={[
              "mt-1.5 flex h-[35px] w-full items-center justify-between",

              "rounded-[4px] border",

              "border-[rgba(90,169,255,0.20)]",

              "bg-[rgba(90,169,255,0.04)]",

              "px-2.5",

              "text-(--info)",

              "transition-[background-color,border-color] duration-150",

              "hover:border-[rgba(90,169,255,0.35)]",

              "hover:bg-[rgba(90,169,255,0.07)]",
            ].join(" ")}
          >
            <span className="flex items-center gap-2 text-[13px] font-medium">
              <Globe2
                size={13}
                strokeWidth={1.6}
              />

              Base Map
            </span>

            <span className="font-mono text-[13px] font-semibold uppercase">
              {mapState.baseMap}
            </span>
          </button>
        </ControlSection>

        {/* ===============================================
            Mission Layers
            =============================================== */}

        <ControlSection title="Mission Layers">
          <div className="grid grid-cols-2 gap-1.5">
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
                mapState.layers.route
              }
              onClick={() =>
                toggleLayer(
                  "route",
                )
              }
            />

            <CompactLayer
              label="Geofence"
              enabled={
                mapState.layers.geofence
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
                mapState.layers.restricted
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
                mapState.layers.contacts
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
                mapState.layers.heat
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
                mapState.layers.drones
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
                mapState.layers.home
              }
              onClick={() =>
                toggleLayer(
                  "home",
                )
              }
            />
          </div>
        </ControlSection>

        {/* ===============================================
            Map State
            =============================================== */}

        <div className="mt-auto border-t border-white/[0.07] pt-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-[4px] border border-white/[0.06] bg-black/20 px-2.5 py-2">
              <div className="font-mono text-[16px] font-semibold uppercase tracking-[0.05em] text-white/52">
                Zoom
              </div>

              <div className="mt-0.5 font-mono text-[13px] font-semibold text-white/80">
                {mapState.zoom.toFixed(
                  1,
                )}
              </div>
            </div>

            <div className="rounded-[4px] border border-white/[0.06] bg-black/20 px-2.5 py-2">
              <div className="font-mono text-[16px] font-semibold uppercase tracking-[0.05em] text-white/52">
                Reference
              </div>

              <div className="mt-0.5 font-mono text-[13px] font-semibold text-white/80">
                WGS-84
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.035em] text-white/48">
            <Satellite
              size={13}
              strokeWidth={1.6}
              className={
                gpsOnline
                  ? "text-(--nominal)"
                  : "text-(--caution)"
              }
            />

            Mission map workspace
          </div>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   Live Operations
   ========================================================= */

export function LiveOps() {
  const mapRef =
    useRef<AeroWorldMapHandle | null>(
      null,
    );

  const [
    mapState,
    setMapState,
  ] =
    useState<AeroWorldMapState>(
      initialMapState,
    );

  function toggleLayer(
    layer: MapLayerId,
  ) {
    mapRef.current?.toggleLayer(
      layer,
    );
  }

  return (
    <section className="h-[calc(100vh-70px)] w-full overflow-hidden bg-[#05060d]">
      <div
        className={[
          "mx-auto grid h-full w-full max-w-[1600px]",

          "grid-rows-[48px_minmax(0,1fr)]",

          "px-4 pb-4 pt-2",

          "sm:px-6",

          "lg:px-8",

          "xl:px-10",

          "2xl:px-14",
        ].join(" ")}
      >
        {/* =================================================
            Map Page Header
            ================================================= */}

        <header className="flex min-w-0 items-center justify-between border-b border-white/[0.08]">
          <div className="flex min-w-0 items-center gap-2.5">
            <Navigation
              size={14}
              strokeWidth={1.6}
              className="shrink-0 text-(--info)"
            />

            <h1
              className="truncate text-[16px] font-medium tracking-[-0.02em] text-white"
              style={{
                fontFamily:
                  '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
              }}
            >
              Tactical Mission Map
            </h1>

            <span
              aria-hidden="true"
              className="hidden h-3 w-px bg-white/10 sm:block"
            />

            <span className="hidden font-mono text-[13px] font-medium uppercase tracking-[0.045em] text-white/44 sm:block">
              Live Operations
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-(--nominal)" />

            <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.04em] text-(--nominal)">
              Map Ready
            </span>
          </div>
        </header>

        {/* =================================================
            Map + Right Panel
            ================================================= */}

        <div className="min-h-0 pt-3">
          <div
            className={[
              "grid h-full min-h-0 overflow-hidden",

              "rounded-[6px]",

              "border border-white/[0.09]",

              "bg-[#020304]",

              "shadow-[0_18px_48px_rgba(0,0,0,0.2)]",

              "lg:grid-cols-[minmax(0,1fr)_340px]",

              "xl:grid-cols-[minmax(0,1fr)_360px]",

              "2xl:grid-cols-[minmax(0,1fr)_380px]",
            ].join(" ")}
          >
            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <AeroWorldMap
                ref={mapRef}
                onStateChange={
                  setMapState
                }
              />
            </div>

            <MapControlRail
              mapRef={mapRef}
              mapState={mapState}
              toggleLayer={
                toggleLayer
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}