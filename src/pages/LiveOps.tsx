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
   Home / Tactical Mission Map

   FIRST VIEWPORT

   ┌───────────────────────────────────────────────────────┐
   │ Global Aeronexus Header                       70px   │
   ├───────────────────────────────────────────────────────┤
   │ Tactical Mission Map                                │
   ├─────────────────────────────────────┬─────────────────┤
   │                                     │ MAP CONTROLS    │
   │                                     │                 │
   │                                     │ UAV     AOI     │
   │              MAP                    │ Mission Home    │
   │                                     │                 │
   │                                     │ Zoom / Base Map │
   │                                     │                 │
   │                                     │ Layers 2-col   │
   │                                     │                 │
   └─────────────────────────────────────┴─────────────────┘

   Nothing inside this workspace scrolls.

   The MissionNexus footer exists immediately below this
   viewport and appears only when the document is scrolled.
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
        "group flex h-[42px] min-w-0 items-center gap-2.5",

        "rounded-[5px] border px-2.5",

        "text-left",

        "transition-[background-color,border-color,color,transform] duration-150",

        "active:translate-y-px",

        primary
          ? "border-[rgba(246,178,60,0.32)] bg-[rgba(246,178,60,0.07)] text-(--primary)"
          : "border-white/[0.08] bg-white/[0.018] text-white/66 hover:border-white/15 hover:bg-white/[0.035] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center",

          "rounded-[4px] border",

          primary
            ? "border-[rgba(246,178,60,0.25)] bg-[rgba(246,178,60,0.06)]"
            : "border-white/[0.07] bg-black/30",
        ].join(" ")}
      >
        <Icon
          size={13}
          strokeWidth={1.6}
        />
      </span>

      <span className="min-w-0 truncate text-[10px] font-medium">
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
        "flex h-[32px] min-w-0 items-center justify-between",

        "rounded-[4px] border px-2.5",

        "font-mono text-[8px] font-semibold uppercase tracking-[0.055em]",

        "transition-[background-color,border-color,color] duration-150",

        enabled
          ? "border-[rgba(246,178,60,0.22)] bg-[rgba(246,178,60,0.045)] text-(--primary)"
          : "border-white/[0.065] bg-white/[0.01] text-white/34 hover:border-white/12 hover:text-white/64",
      ].join(" ")}
    >
      <span className="truncate">
        {label}
      </span>

      <span className="ml-2 shrink-0 text-[7px]">
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
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white/38">
          {title}
        </span>

        <span className="h-px min-w-0 flex-1 bg-white/[0.06]" />
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   Map Control Rail

   Important:
   - Entire rail remains visible in the first viewport.
   - No overflow-y-auto.
   - Navigation is 2 columns.
   - Layer controls are 2 columns.
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
          Rail Header
          =================================================== */}

      <div className="shrink-0 border-b border-white/[0.08] px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-(--primary)">
              Map Controls
            </div>

            <div className="mt-1 truncate text-[10px] text-white/38">
              Navigation · view · layers
            </div>
          </div>

          <div
            className={[
              "flex shrink-0 items-center gap-1.5",

              "font-mono text-[7px] font-semibold uppercase tracking-[0.09em]",

              gpsOnline
                ? "text-(--nominal)"
                : "text-(--caution)",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",

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
          Rail Content

          Fits inside available height.
          =================================================== */}

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
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
            View
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
              "mt-1.5 flex h-[34px] w-full items-center justify-between",

              "rounded-[4px] border border-[rgba(90,169,255,0.2)]",

              "bg-[rgba(90,169,255,0.04)] px-2.5",

              "text-(--info)",

              "transition-[background-color,border-color] duration-150",

              "hover:border-[rgba(90,169,255,0.36)]",

              "hover:bg-[rgba(90,169,255,0.07)]",
            ].join(" ")}
          >
            <span className="flex items-center gap-2 text-[9px] font-medium">
              <Globe2
                size={12}
                strokeWidth={1.6}
              />

              Base Map
            </span>

            <span className="font-mono text-[8px] font-semibold uppercase">
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
            Rail State

            Pushed to bottom without making rail scroll.
            =============================================== */}

        <div className="mt-auto border-t border-white/[0.07] pt-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[4px] border border-white/[0.06] bg-black/20 px-2.5 py-2">
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/28">
                Zoom
              </div>

              <div className="mt-0.5 font-mono text-[10px] font-semibold text-white/68">
                {mapState.zoom.toFixed(
                  1,
                )}
              </div>
            </div>

            <div className="rounded-[4px] border border-white/[0.06] bg-black/20 px-2.5 py-2">
              <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-white/28">
                Reference
              </div>

              <div className="mt-0.5 font-mono text-[10px] font-semibold text-white/68">
                WGS-84
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.08em] text-white/30">
            <Satellite
              size={10}
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
   Live Operations / Home
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
    /*
     * This section occupies EXACTLY the browser area below
     * the fixed 70px global header.
     *
     * The footer is the next element in AppShell.
     *
     * Therefore:
     *
     * 70px header
     * +
     * calc(100vh - 70px) home workspace
     * =
     * exactly 100vh.
     */
    <section className="h-[calc(100vh-70px)] w-full overflow-hidden bg-[#05060d]">
      <div
        className={[
          "mx-auto grid h-full w-full max-w-[1600px]",

          "grid-rows-[46px_minmax(0,1fr)]",

          "px-4 pb-3",

          "sm:px-6",

          "lg:px-8",

          "xl:px-10",

          "2xl:px-14",
        ].join(" ")}
      >
        {/* =================================================
            Tactical Map Header
            ================================================= */}

        <header className="flex min-w-0 items-center justify-between border-b border-white/[0.08]">
          <div className="flex min-w-0 items-center gap-2.5">
            <Navigation
              size={14}
              strokeWidth={1.6}
              className="shrink-0 text-(--info)"
            />

            <h1
              className="truncate text-[15px] font-medium tracking-[-0.02em] text-white"
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

            <span className="hidden font-mono text-[8px] uppercase tracking-[0.08em] text-white/30 sm:block">
              Live Operations
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-(--nominal)" />

            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-(--nominal)">
              Map Ready
            </span>
          </div>
        </header>

        {/* =================================================
            Map Workspace

            Both map and right rail are forced to exactly
            the same available height.

            No child scrollbars.
            ================================================= */}

        <div className="min-h-0 pt-3">
          <div
            className={[
              "grid h-full min-h-0",

              "overflow-hidden",

              "rounded-[6px]",

              "border border-white/[0.09]",

              "bg-[#020304]",

              "shadow-[0_18px_48px_rgba(0,0,0,0.2)]",

              /*
               * Wider right rail allows controls to use
               * compact two-column layout and remain inside
               * the screen height.
               */
              "lg:grid-cols-[minmax(0,1fr)_350px]",

              "xl:grid-cols-[minmax(0,1fr)_380px]",

              "2xl:grid-cols-[minmax(0,1fr)_400px]",
            ].join(" ")}
          >
            {/* =============================================
                Pure Map Canvas
                ============================================= */}

            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <AeroWorldMap
                ref={mapRef}
                onStateChange={
                  setMapState
                }
              />
            </div>

            {/* =============================================
                Map Controls
                ============================================= */}

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