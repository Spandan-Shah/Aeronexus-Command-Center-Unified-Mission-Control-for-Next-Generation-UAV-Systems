import {
  useState,
  type ReactNode,
} from "react";

import {
  Battery,
  Camera,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Gamepad2,
  Gauge,
  Map,
  Menu,
  Package,
  Plane,
  Radar,
  Settings,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import aeronexusWordmark from "../../assets/aeronexus-wordmark.png";

import type {
  PageId,
} from "../../data/navigation";

import {
  MissionFooter,
} from "./MissionFooter";

/* =========================================================
   MissionNexus V2
   Global Application Shell

   Header stays above Leaflet:
   - Header: z-[5000]
   - Main: relative z-0

   Desktop primary navigation:
   - Operations
   - Intelligence
   - Systems

   Explicit font-size: 9px
   ========================================================= */

type AppShellProps = {
  children: ReactNode;

  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
};

type NavItem = {
  id: PageId;

  label: string;

  description: string;

  icon: LucideIcon;
};

type NavGroup = {
  label: string;

  items: NavItem[];
};

/* =========================================================
   Navigation
   ========================================================= */

const navGroups: NavGroup[] = [
  {
    label: "Operations",

    items: [
      {
        id: "live-ops",

        label: "Live Operations",

        description:
          "Tactical map and real-time mission awareness",

        icon: Radar,
      },

      {
        id: "mission-planner",

        label: "Mission Planner",

        description:
          "Routes, waypoints, geofences and mission planning",

        icon: Map,
      },

      {
        id: "drone-control",

        label: "Drone Control",

        description:
          "Aircraft commands, payload and flight control",

        icon: Gamepad2,
      },

      {
        id: "fleet",

        label: "Fleet",

        description:
          "Aircraft assignment and operational readiness",

        icon: Plane,
      },

      {
        id: "pre-flight",

        label: "Pre-Flight",

        description:
          "Launch readiness and aircraft validation",

        icon: ClipboardCheck,
      },
    ],
  },

  {
    label: "Intelligence",

    items: [
      {
        id: "camera-ai",

        label: "Vision Intelligence",

        description:
          "YOLO, OpenCV and aerial video analysis",

        icon: Camera,
      },

      {
        id: "logs",

        label: "Mission Debrief",

        description:
          "Logs, alerts, analytics and mission history",

        icon: FileText,
      },

      {
        id: "security",

        label: "Security",

        description:
          "Secure sessions and telemetry integrity",

        icon: ShieldCheck,
      },
    ],
  },

  {
    label: "Systems",

    items: [
      {
        id: "drone-health",

        label: "Drone Health",

        description:
          "Aircraft diagnostics and component condition",

        icon: Gauge,
      },

      {
        id: "battery",

        label: "Battery & Power",

        description:
          "Power state, thermal behavior and endurance",

        icon: Battery,
      },

      {
        id: "maintenance",

        label: "Maintenance",

        description:
          "Aircraft servicing and maintenance scheduling",

        icon: Wrench,
      },

      {
        id: "inventory",

        label: "Inventory",

        description:
          "Parts, payloads and operational assets",

        icon: Package,
      },
    ],
  },
];

/* =========================================================
   Typography
   ========================================================= */

const productFont = {
  fontFamily:
    '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
};

const interfaceFont = {
  fontFamily:
    '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/* =========================================================
   Helpers
   ========================================================= */

function isGroupActive(
  group: NavGroup,
  activePage: PageId,
) {
  return group.items.some(
    (item) =>
      item.id === activePage,
  );
}

/* =========================================================
   Desktop Navigation
   ========================================================= */

function DesktopNavGroup({
  group,
  activePage,
  onPageChange,
}: {
  group: NavGroup;

  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
}) {
  const active =
    isGroupActive(
      group,
      activePage,
    );

  return (
    <div className="group relative flex h-full items-center">
      {/* ===================================================
          Primary desktop navigation label

          Explicit 9px inline font-size is intentional.
          This prevents inherited or global CSS from
          overriding the compact header typography.
          =================================================== */}

      <button
        type="button"
        style={{
          ...productFont,

          fontSize: "12px",

          lineHeight: "1",
        }}
        className={[
          "relative flex h-full items-center gap-1",

          "font-semibold uppercase tracking-[0.055em]",

          "transition-colors duration-150",

          active
            ? "text-white"
            : "text-white/62 hover:text-white",
        ].join(" ")}
      >
        {group.label}

        <ChevronDown
          size={10}
          strokeWidth={1.7}
          className={[
            "opacity-50",

            "transition-transform duration-150",

            "group-hover:rotate-180",

            "group-focus-within:rotate-180",
          ].join(" ")}
        />

        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-(--primary)"
          />
        ) : null}
      </button>

      {/* ===================================================
          Hover bridge
          =================================================== */}

      <div className="pointer-events-none absolute left-1/2 top-full h-3 w-[300px] -translate-x-1/2" />

      {/* ===================================================
          Dropdown
          =================================================== */}

      <div
        className={[
          "pointer-events-none invisible absolute left-1/2 top-[calc(100%+10px)]",

          "z-[5100]",

          "w-[300px] -translate-x-1/2",

          "rounded-[6px] border border-white/10",

          "bg-[rgba(5,6,13,0.99)] p-2",

          "opacity-0",

          "shadow-[0_22px_60px_rgba(0,0,0,0.55)]",

          "backdrop-blur-[18px]",

          "transition-[opacity,visibility] duration-150",

          "group-hover:pointer-events-auto",

          "group-hover:visible",

          "group-hover:opacity-100",

          "group-focus-within:pointer-events-auto",

          "group-focus-within:visible",

          "group-focus-within:opacity-100",
        ].join(" ")}
      >
        <div className="px-3 pb-2 pt-1">
          <div
            style={productFont}
            className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/38"
          >
            {group.label}
          </div>
        </div>

        {group.items.map(
          (item) => {
            const Icon =
              item.icon;

            const itemActive =
              activePage ===
              item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  onPageChange(
                    item.id,
                  )
                }
                aria-current={
                  itemActive
                    ? "page"
                    : undefined
                }
                className={[
                  "flex w-full items-start gap-3",

                  "rounded-[6px] px-3 py-2.5",

                  "text-left",

                  "transition-colors duration-150",

                  itemActive
                    ? "bg-[rgba(246,178,60,0.08)]"
                    : "hover:bg-white/[0.04]",
                ].join(" ")}
              >
                {/* Icon */}

                <span
                  className={[
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center",

                    "rounded-[5px] border",

                    itemActive
                      ? "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.07)] text-(--primary)"
                      : "border-white/[0.08] bg-white/[0.02] text-white/48",
                  ].join(" ")}
                >
                  <Icon
                    size={13}
                    strokeWidth={1.6}
                  />
                </span>

                {/* Text */}

                <span className="min-w-0">
                  <span
                    className={[
                      "block text-[11px] font-medium",

                      itemActive
                        ? "text-(--primary)"
                        : "text-white/88",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>

                  <span className="mt-1 block text-[10px] leading-[1.45] text-white/40">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Mobile Navigation
   ========================================================= */

function MobileNavigation({
  activePage,
  onPageChange,
  onClose,
}: {
  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;

  onClose: () => void;
}) {
  function changePage(
    page: PageId,
  ) {
    onPageChange(
      page,
    );

    onClose();
  }

  return (
    <div
      className={[
        "absolute inset-x-0 top-[70px]",

        "z-[5100]",

        "border-b border-white/10",

        "bg-[rgba(5,6,13,0.99)]",

        "shadow-[0_22px_60px_rgba(0,0,0,0.55)]",

        "backdrop-blur-[18px]",

        "min-[1380px]:hidden",
      ].join(" ")}
    >
      <div className="mx-auto max-h-[calc(100vh-70px)] max-w-[1600px] overflow-y-auto px-5 py-5 sm:px-6 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {navGroups.map(
            (group) => (
              <div
                key={group.label}
              >
                <div
                  style={productFont}
                  className="mb-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-(--primary)"
                >
                  {group.label}
                </div>

                <div className="grid gap-1">
                  {group.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        activePage ===
                        item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            changePage(
                              item.id,
                            )
                          }
                          aria-current={
                            active
                              ? "page"
                              : undefined
                          }
                          className={[
                            "flex items-center gap-3",

                            "rounded-[6px] px-3 py-2.5",

                            "text-left",

                            "transition-colors duration-150",

                            active
                              ? "bg-[rgba(246,178,60,0.08)] text-(--primary)"
                              : "text-white/68 hover:bg-white/[0.035] hover:text-white",
                          ].join(" ")}
                        >
                          <Icon
                            size={13}
                            strokeWidth={1.6}
                          />

                          <span className="text-[11px]">
                            {item.label}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Settings */}

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={() =>
              changePage(
                "settings",
              )
            }
            aria-current={
              activePage ===
              "settings"
                ? "page"
                : undefined
            }
            className={[
              "flex h-[38px] w-full items-center justify-center gap-2",

              "rounded-[6px] border border-white/10",

              "text-[11px]",

              activePage ===
              "settings"
                ? "bg-white/[0.06] text-white"
                : "bg-transparent text-white/68",
            ].join(" ")}
          >
            <Settings
              size={13}
              strokeWidth={1.6}
            />

            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MissionNexus Header
   ========================================================= */

function MissionNexusHeader({
  activePage,
  onPageChange,
}: {
  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
}) {
  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(false);

  function changePage(
    page: PageId,
  ) {
    onPageChange(
      page,
    );

    setMobileOpen(
      false,
    );
  }

  return (
    <header
      style={interfaceFont}
      className={[
        /*
         * Leaflet uses high internal z-index values.
         * Header stays above the map.
         */
        "fixed inset-x-0 top-0 z-[5000]",

        "h-[70px]",

        "border-b border-white/10",

        "bg-[#05060d]",

        "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex h-full w-full max-w-[1600px] items-center",

          "px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14",
        ].join(" ")}
      >
        {/* =================================================
            Aeronexus | MissionNexus
            ================================================= */}

        <button
          type="button"
          onClick={() =>
            changePage(
              "live-ops",
            )
          }
          aria-label="MissionNexus home"
          className="flex min-w-0 shrink-0 items-center"
        >
          <img
            src={aeronexusWordmark}
            alt="Aeronexus"
            className="h-8 w-auto shrink-0 object-contain sm:h-9 xl:h-10"
          />

          <span
            aria-hidden="true"
            className="mx-3 h-6 w-px shrink-0 bg-white/15"
          />

          <span
            style={productFont}
            className="truncate text-[15px] font-medium tracking-[-0.01em] text-white/78"
          >
            MissionNexus
          </span>
        </button>

        {/* =================================================
            Desktop Header Navigation
            ================================================= */}

        <nav
          aria-label="MissionNexus primary navigation"
          className="ml-auto hidden h-full items-center gap-6 min-[1380px]:flex"
        >
          {navGroups.map(
            (group) => (
              <DesktopNavGroup
                key={group.label}
                group={group}
                activePage={activePage}
                onPageChange={changePage}
              />
            ),
          )}
        </nav>

        {/* =================================================
            Header Utilities
            ================================================= */}

        <div className="ml-auto flex items-center gap-2 min-[1380px]:ml-6">
          {/* Settings */}

          <button
            type="button"
            onClick={() =>
              changePage(
                "settings",
              )
            }
            aria-current={
              activePage ===
              "settings"
                ? "page"
                : undefined
            }
            className={[
              "hidden h-[36px] items-center justify-center gap-1.5",

              "rounded-[6px] border px-3",

              "text-[11px] font-medium",

              "transition-[background-color,border-color,color] duration-150",

              "sm:flex",

              activePage ===
              "settings"
                ? "border-white/20 bg-white/[0.06] text-white"
                : "border-white/10 bg-[#07090d] text-white/64 hover:border-white/20 hover:bg-white/[0.04] hover:text-white",
            ].join(" ")}
          >
            <Settings
              size={13}
              strokeWidth={1.6}
            />

            Settings
          </button>

          {/* Compact navigation */}

          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (current) =>
                  !current,
              )
            }
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={mobileOpen}
            className={[
              "flex h-[36px] w-[36px] items-center justify-center",

              "rounded-[6px] border border-white/10",

              "bg-[#07090d]",

              "text-white/58",

              "transition-[background-color,border-color,color] duration-150",

              "hover:border-white/20 hover:bg-white/[0.04] hover:text-white",

              "min-[1380px]:hidden",
            ].join(" ")}
          >
            {mobileOpen ? (
              <X
                size={15}
                strokeWidth={1.6}
              />
            ) : (
              <Menu
                size={15}
                strokeWidth={1.6}
              />
            )}
          </button>
        </div>
      </div>

      {/* ===================================================
          Mobile Navigation
          =================================================== */}

      {mobileOpen ? (
        <MobileNavigation
          activePage={activePage}
          onPageChange={onPageChange}
          onClose={() =>
            setMobileOpen(
              false,
            )
          }
        />
      ) : null}
    </header>
  );
}

/* =========================================================
   Application Shell
   ========================================================= */

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  return (
    <div
      style={interfaceFont}
      className="min-h-screen bg-(--background) text-(--foreground)"
    >
      <MissionNexusHeader
        activePage={activePage}
        onPageChange={onPageChange}
      />

      {/* ===================================================
          Main Content

          z-0 keeps Leaflet underneath the global header.
          =================================================== */}

      <main className="relative z-0 pt-[70px]">
        {children}
      </main>

      {/* ===================================================
          Footer
          =================================================== */}

      <div className="relative z-0">
        <MissionFooter
          activePage={activePage}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}