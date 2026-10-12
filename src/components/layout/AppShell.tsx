import type {
  LucideIcon,
} from "lucide-react";

import {
  ArrowRight,
  Battery,
  Camera,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Gamepad2,
  Gauge,
  Map,
  Package,
  Plane,
  Radar,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import type {
  ReactNode,
} from "react";

import aeronexusWordmark from "../../assets/aeronexus-wordmark-dark.png";
import aeronexusFooterLogo from "../../assets/aeronexus-footer-logo.png";

import type {
  PageId,
} from "../../data/navigation";

import {
  telemetry,
} from "../../data/telemetry";

/* =========================================================
   Types
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

const navGroups:
  NavGroup[] = [
    {
      label:
        "Operations",

      items: [
        {
          id:
            "live-ops",

          label:
            "Live Operations",

          description:
            "Real-time UAV command and mission overview",

          icon:
            Radar,
        },

        {
          id:
            "mission-planner",

          label:
            "Mission Planner",

          description:
            "Waypoints, routes and mission preparation",

          icon:
            Map,
        },

        {
          id:
            "drone-control",

          label:
            "Drone Control",

          description:
            "Flight commands and payload operations",

          icon:
            Gamepad2,
        },

        {
          id:
            "fleet",

          label:
            "Fleet",

          description:
            "Aircraft and operational asset overview",

          icon:
            Plane,
        },

        {
          id:
            "pre-flight",

          label:
            "Pre-Flight",

          description:
            "Mission readiness and validation",

          icon:
            ClipboardCheck,
        },
      ],
    },

    {
      label:
        "Intelligence",

      items: [
        {
          id:
            "camera-ai",

          label:
            "Vision Intelligence",

          description:
            "AI-assisted aerial imagery and detection",

          icon:
            Camera,
        },

        {
          id:
            "logs",

          label:
            "Logs & Debrief",

          description:
            "Mission records, telemetry and post-flight review",

          icon:
            FileText,
        },

        {
          id:
            "security",

          label:
            "Security",

          description:
            "Secure command sessions and telemetry trust",

          icon:
            ShieldCheck,
        },
      ],
    },

    {
      label:
        "Systems",

      items: [
        {
          id:
            "drone-health",

          label:
            "Drone Health",

          description:
            "Airframe, sensor and system diagnostics",

          icon:
            Gauge,
        },

        {
          id:
            "battery",

          label:
            "Battery & Power",

          description:
            "Electrical and battery-system monitoring",

          icon:
            Battery,
        },

        {
          id:
            "maintenance",

          label:
            "Maintenance",

          description:
            "Service, inspection and repair workflows",

          icon:
            Wrench,
        },

        {
          id:
            "inventory",

          label:
            "Inventory",

          description:
            "Parts, payloads and field assets",

          icon:
            Package,
        },
      ],
    },

    {
      label:
        "Admin",

      items: [
        {
          id:
            "settings",

          label:
            "Settings",

          description:
            "MissionNexus platform configuration",

          icon:
            Settings,
        },
      ],
    },
  ];

/* =========================================================
   Footer
   ========================================================= */

const footerColumns = [
  {
    title:
      "Mission Platform",

    links: [
      "MissionNexus",
      "Mission Planning",
      "Live Operations",
      "Secure Command",
    ],
  },

  {
    title:
      "Operational Systems",

    links: [
      "Fleet Intelligence",
      "Pre-Flight Readiness",
      "Drone Health",
      "Mission Debrief",
    ],
  },

  {
    title:
      "Aerial Intelligence",

    links: [
      "Vision Intelligence",
      "Camera Analytics",
      "Risk Awareness",
      "Mission Data",
    ],
  },
];

/* =========================================================
   Helpers
   ========================================================= */

function isGroupActive(
  group: NavGroup,
  activePage: PageId,
) {
  return group.items.some(
    (item) =>
      item.id ===
      activePage,
  );
}

/* =========================================================
   App Shell
   ========================================================= */

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* ===================================================
          MissionNexus Header
          =================================================== */}

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-black/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[70px] max-w-[1920px] items-center px-5 lg:px-7 xl:px-9">

          {/* =================================================
              Brand
              ================================================= */}

          <button
            type="button"
            onClick={() =>
              onPageChange(
                "live-ops",
              )
            }
            className="group flex shrink-0 items-center"
            title="MissionNexus · Live Operations"
          >

            <img
              src={
                aeronexusWordmark
              }
              alt="Aeronexus"
              className="h-[31px] w-auto object-contain opacity-95 transition-opacity group-hover:opacity-100"
            />

            <span
              aria-hidden="true"
              className="mx-4 h-7 w-px bg-white/[0.17]"
            />

            <div className="flex flex-col items-start">

              <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                MissionNexus
              </span>

              <span className="mt-[2px] font-mono text-[8px] font-medium uppercase tracking-[0.19em] text-white/30">
                Mission Command
              </span>

            </div>

          </button>

          {/* =================================================
              Desktop Navigation
              ================================================= */}

          <nav className="ml-12 hidden flex-1 items-center gap-7 xl:flex">

            {navGroups.map(
              (group) => {
                const active =
                  isGroupActive(
                    group,
                    activePage,
                  );

                return (
                  <div
                    key={
                      group.label
                    }
                    className="group relative"
                  >

                    <button
                      type="button"
                      className={[
                        "relative flex h-[70px] items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",

                        active
                          ? "text-[var(--primary)]"
                          : "text-white/45 hover:text-white/85",
                      ].join(
                        " ",
                      )}
                    >

                      <span>
                        {
                          group.label
                        }
                      </span>

                      <ChevronDown
                        size={12}
                        strokeWidth={
                          1.7
                        }
                        className="transition-transform duration-200 group-hover:rotate-180"
                      />

                      {active ? (
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--primary)]" />
                      ) : null}

                    </button>

                    {/* =======================================
                        Dropdown
                        ======================================= */}

                    <div className="pointer-events-none absolute left-1/2 top-[62px] z-50 w-[340px] -translate-x-1/2 translate-y-1 rounded-lg border border-white/[0.09] bg-[#07090d]/98 p-2 opacity-0 shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-2xl transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">

                      <div className="absolute -top-3 left-0 h-3 w-full" />

                      {group.items.map(
                        (item) => {
                          const Icon =
                            item.icon;

                          const itemActive =
                            activePage ===
                            item.id;

                          return (
                            <button
                              key={
                                item.id
                              }
                              type="button"
                              onClick={() =>
                                onPageChange(
                                  item.id,
                                )
                              }
                              className={[
                                "group/item flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition",

                                itemActive
                                  ? "border-[rgba(246,178,60,0.22)] bg-[rgba(246,178,60,0.075)]"
                                  : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.035]",
                              ].join(
                                " ",
                              )}
                            >

                              <div
                                className={[
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border transition",

                                  itemActive
                                    ? "border-[var(--primary)]/35 bg-[rgba(246,178,60,0.08)] text-[var(--primary)]"
                                    : "border-white/[0.08] bg-white/[0.02] text-white/35 group-hover/item:text-white/65",
                                ].join(
                                  " ",
                                )}
                              >

                                <Icon
                                  size={14}
                                  strokeWidth={
                                    1.55
                                  }
                                />

                              </div>

                              <div className="min-w-0">

                                <div
                                  className={[
                                    "text-[12px] font-semibold",

                                    itemActive
                                      ? "text-[var(--primary)]"
                                      : "text-white/80",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {
                                    item.label
                                  }
                                </div>

                                <div className="mt-1 text-[10px] leading-[1.55] text-white/30">
                                  {
                                    item.description
                                  }
                                </div>

                              </div>

                            </button>
                          );
                        },
                      )}

                    </div>

                  </div>
                );
              },
            )}

          </nav>

          {/* =================================================
              Mission State
              ================================================= */}

          <div className="ml-auto flex shrink-0 items-center gap-5">

            <div className="hidden items-center gap-2 lg:flex">

              <span className="relative flex h-2 w-2">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--nominal)] opacity-30" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--nominal)]" />

              </span>

              <div className="flex flex-col">

                <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.15em] text-[var(--nominal)]">
                  System Nominal
                </span>

                <span className="mt-[2px] font-mono text-[7px] uppercase tracking-[0.12em] text-white/25">
                  Mission Network
                </span>

              </div>

            </div>

            <span className="hidden h-7 w-px bg-white/[0.08] lg:block" />

            <button
              type="button"
              onClick={() =>
                onPageChange(
                  "live-ops",
                )
              }
              className="group flex h-9 items-center gap-2 rounded border border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.08)] px-4 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)] transition hover:border-[rgba(246,178,60,0.5)] hover:bg-[rgba(246,178,60,0.13)]"
            >

              Command Center

              <ArrowRight
                size={12}
                strokeWidth={
                  1.8
                }
                className="transition-transform group-hover:translate-x-0.5"
              />

            </button>

          </div>

        </div>

      </header>

      {/* ===================================================
          Application Content
          =================================================== */}

      <main className="min-h-screen bg-[#050608] pt-[70px]">

        {children}

      </main>

      {/* ===================================================
          Aeronexus Footer
          =================================================== */}

      <footer className="border-t border-white/[0.08] bg-black">

        <div className="mx-auto max-w-[1680px] px-8 py-12">

          <div className="grid items-start gap-10 lg:grid-cols-5">

            {/* ===============================================
                Brand
                =============================================== */}

            <div className="min-w-0">

              <img
                src={
                  aeronexusFooterLogo
                }
                alt="Aeronexus"
                className="h-auto w-[180px] object-contain"
              />

              <div className="mt-5 flex items-center">

                <span className="text-sm font-semibold text-white/85">
                  Aeronexus
                </span>

                <span className="mx-2.5 h-4 w-px bg-white/15" />

                <span className="text-sm font-medium text-white/55">
                  MissionNexus
                </span>

              </div>

              <p className="mt-4 max-w-[245px] text-xs leading-5 text-white/35">
                Unified mission command and operational intelligence for next-generation unmanned systems.
              </p>

            </div>

            {/* ===============================================
                Footer Columns
                =============================================== */}

            {footerColumns.map(
              (column) => (
                <div
                  key={
                    column.title
                  }
                  className="min-w-0"
                >

                  <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                    {
                      column.title
                    }
                  </h3>

                  <div className="mt-5 flex flex-col gap-3">

                    {column.links.map(
                      (link) => (
                        <span
                          key={
                            link
                          }
                          className="text-xs leading-relaxed text-white/45"
                        >
                          {
                            link
                          }
                        </span>
                      ),
                    )}

                  </div>

                </div>
              ),
            )}

            {/* ===============================================
                Current Mission
                =============================================== */}

            <div className="min-w-0">

              <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                Mission State
              </h3>

              <div className="mt-5 flex flex-col gap-3 font-mono text-[10px]">

                <div className="grid grid-cols-[1fr_auto] gap-4">

                  <span className="text-white/30">
                    Drone
                  </span>

                  <span className="text-right text-white/65">
                    {
                      telemetry.droneId
                    }
                  </span>

                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">

                  <span className="text-white/30">
                    Platform
                  </span>

                  <span className="text-right text-white/65">
                    {
                      telemetry.model
                    }
                  </span>

                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">

                  <span className="text-white/30">
                    Mission
                  </span>

                  <span className="text-right text-white/65">
                    {
                      telemetry.mission
                    }
                  </span>

                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">

                  <span className="text-white/30">
                    Operating Mode
                  </span>

                  <span className="text-right text-[var(--nominal)]">
                    Simulation
                  </span>

                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">

                  <span className="text-white/30">
                    Interface
                  </span>

                  <span className="text-right text-white/65">
                    MissionNexus
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* ===============================================
              Bottom Footer
              =============================================== */}

          <div className="mt-10 border-t border-white/[0.07] pt-5">

            <div className="flex flex-col gap-3 text-[10px] text-white/25 md:flex-row md:items-center md:justify-between">

              <p>
                Mission capabilities depend on aircraft configuration, telemetry availability and deployment environment.
              </p>

              <p>
                © 2026 Aeronexus · MissionNexus
              </p>

            </div>

          </div>

        </div>

      </footer>

    </div>
  );
}