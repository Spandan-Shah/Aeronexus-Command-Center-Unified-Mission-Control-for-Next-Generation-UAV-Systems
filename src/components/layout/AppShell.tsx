import type {
  ReactNode,
} from "react";

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
  LucideIcon,
} from "lucide-react";

import aeronexusWordmark from "../../assets/aeronexus-wordmark-dark.png";

import type {
  PageId,
} from "../../data/navigation";

import {
  telemetry,
} from "../../data/telemetry";

import {
  MissionButton,
  MissionStatus,
} from "../ui/mission";

/* =========================================================
   MissionNexus V2
   Global Application Shell

   Product family:
   AERONEXUS | MissionNexus

   Design goals:
   - same parent identity hierarchy as GeoFusion
   - compact Aeronexus branding
   - mission-first navigation
   - graphite / black aerospace interface
   - amber product identity
   - semantic operational status colors
   ========================================================= */

type AppShellProps = {
  children: ReactNode;

  activePage: PageId;

  onPageChange:
    (
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

  items:
    NavItem[];
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
            "Real-time aircraft command and mission awareness",

          icon:
            Radar,
        },

        {
          id:
            "mission-planner",

          label:
            "Mission Planner",

          description:
            "Waypoint planning, route design and geofencing",

          icon:
            Map,
        },

        {
          id:
            "drone-control",

          label:
            "Drone Control",

          description:
            "Flight commands, payload control and aircraft state",

          icon:
            Gamepad2,
        },

        {
          id:
            "fleet",

          label:
            "Fleet",

          description:
            "Aircraft assets, assignment and readiness",

          icon:
            Plane,
        },

        {
          id:
            "pre-flight",

          label:
            "Pre-Flight",

          description:
            "Aircraft readiness and launch validation",

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
            "YOLO, OpenCV and aerial detection workflows",

          icon:
            Camera,
        },

        {
          id:
            "logs",

          label:
            "Mission Debrief",

          description:
            "Logs, events, analytics and audit history",

          icon:
            FileText,
        },

        {
          id:
            "security",

          label:
            "Security",

          description:
            "Secure command sessions and telemetry integrity",

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
            "Aircraft diagnostics and system condition",

          icon:
            Gauge,
        },

        {
          id:
            "battery",

          label:
            "Battery & Power",

          description:
            "Power, thermal state and mission endurance",

          icon:
            Battery,
        },

        {
          id:
            "maintenance",

          label:
            "Maintenance",

          description:
            "Service scheduling and component condition",

          icon:
            Wrench,
        },

        {
          id:
            "inventory",

          label:
            "Inventory",

          description:
            "Parts, payloads and mission assets",

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
            "MissionNexus system configuration",

          icon:
            Settings,
        },
      ],
    },
  ];

/* =========================================================
   Footer Navigation
   ========================================================= */

const footerSections = [
  {
    title:
      "Mission Platform",

    pages: [
      {
        label:
          "Live Operations",

        id:
          "live-ops" as PageId,
      },

      {
        label:
          "Mission Planning",

        id:
          "mission-planner" as PageId,
      },

      {
        label:
          "Drone Control",

        id:
          "drone-control" as PageId,
      },

      {
        label:
          "Pre-Flight",

        id:
          "pre-flight" as PageId,
      },
    ],
  },

  {
    title:
      "Operational Systems",

    pages: [
      {
        label:
          "Fleet Intelligence",

        id:
          "fleet" as PageId,
      },

      {
        label:
          "Drone Health",

        id:
          "drone-health" as PageId,
      },

      {
        label:
          "Battery & Power",

        id:
          "battery" as PageId,
      },

      {
        label:
          "Maintenance",

        id:
          "maintenance" as PageId,
      },
    ],
  },

  {
    title:
      "Intelligence",

    pages: [
      {
        label:
          "Vision Intelligence",

        id:
          "camera-ai" as PageId,
      },

      {
        label:
          "Mission Debrief",

        id:
          "logs" as PageId,
      },

      {
        label:
          "Security",

        id:
          "security" as PageId,
      },

      {
        label:
          "Inventory",

        id:
          "inventory" as PageId,
      },
    ],
  },
];

/* =========================================================
   Helpers
   ========================================================= */

function isGroupActive(
  group:
    NavGroup,

  activePage:
    PageId,
) {
  return group.items.some(
    (
      item,
    ) =>
      item.id ===
      activePage,
  );
}

function getActiveItem(
  activePage:
    PageId,
) {
  for (
    const group of
      navGroups
  ) {
    const item =
      group.items.find(
        (
          candidate,
        ) =>
          candidate.id ===
          activePage,
      );

    if (
      item
    ) {
      return item;
    }
  }

  return null;
}

/* =========================================================
   Desktop Navigation Group
   ========================================================= */

function DesktopNavGroup({
  group,
  activePage,
  onPageChange,
}: {
  group: NavGroup;

  activePage:
    PageId;

  onPageChange:
    (
      page:
        PageId,
    ) => void;
}) {
  const active =
    isGroupActive(
      group,
      activePage,
    );

  return (
    <div className="group relative flex h-full items-center">
      <button
        type="button"
        className={[
          "relative flex h-full items-center gap-1.5 px-1",

          "font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",

          "transition-colors duration-150",

          active
            ? "text-(--primary)"
            : "text-(--muted) hover:text-(--foreground)",
        ].join(" ")}
      >
        {group.label}

        <ChevronDown
          size={12}
          strokeWidth={
            1.8
          }
          className="transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180"
        />

        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-(--primary)"
          />
        ) : null}
      </button>

      {/* Dropdown bridge */}

      <div className="pointer-events-none absolute left-1/2 top-full h-3 w-72 -translate-x-1/2" />

      {/* Dropdown */}

      <div
        className={[
          "pointer-events-none invisible absolute left-1/2 top-[calc(100%+10px)] z-[70]",

          "w-[310px] -translate-x-1/2",

          "rounded-md border border-(--border-soft)",

          "bg-[rgba(5,7,9,0.98)] p-2",

          "opacity-0 shadow-[0_24px_80px_rgba(0,0,0,0.6)]",

          "backdrop-blur-xl",

          "transition-[opacity,visibility,transform] duration-150",

          "group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100",

          "group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100",
        ].join(" ")}
      >
        <div className="px-3 pb-2 pt-1">
          <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-(--muted-soft)">
            {group.label}
          </div>
        </div>

        {group.items.map(
          (
            item,
          ) => {
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
                aria-current={
                  itemActive
                    ? "page"
                    : undefined
                }
                className={[
                  "group/item flex w-full items-start gap-3 rounded-md px-3 py-3 text-left",

                  "transition-colors duration-150",

                  itemActive
                    ? "bg-[rgba(246,178,60,0.08)]"
                    : "hover:bg-white/[0.035]",
                ].join(" ")}
              >
                <div
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",

                    itemActive
                      ? "border-[rgba(246,178,60,0.3)] bg-[rgba(246,178,60,0.07)] text-(--primary)"
                      : "border-(--border-soft) bg-(--surface-0) text-(--muted) group-hover/item:text-(--foreground)",
                  ].join(" ")}
                >
                  <Icon
                    size={14}
                    strokeWidth={
                      1.6
                    }
                  />
                </div>

                <div className="min-w-0">
                  <div
                    className={[
                      "text-[12px] font-medium",

                      itemActive
                        ? "text-(--primary)"
                        : "text-(--foreground)",
                    ].join(" ")}
                  >
                    {
                      item.label
                    }
                  </div>

                  <div className="mt-1 text-[10px] leading-relaxed text-(--muted)">
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
}

/* =========================================================
   Mobile / Compact Navigation
   ========================================================= */

function CompactNavigation({
  activePage,
  onPageChange,
}: {
  activePage:
    PageId;

  onPageChange:
    (
      page:
        PageId,
    ) => void;
}) {
  const items =
    navGroups.flatMap(
      (
        group,
      ) =>
        group.items,
    );

  return (
    <div className="border-t border-(--border-soft) xl:hidden">
      <nav
        className="flex h-10 items-center gap-1 overflow-x-auto px-4"
        aria-label="MissionNexus navigation"
      >
        {items.map(
          (
            item,
          ) => {
            const active =
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
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={[
                  "shrink-0 rounded-sm px-3 py-1.5",

                  "font-mono text-[8px] font-semibold uppercase tracking-[0.09em]",

                  active
                    ? "bg-[rgba(246,178,60,0.08)] text-(--primary)"
                    : "text-(--muted) hover:text-(--foreground)",
                ].join(" ")}
              >
                {
                  item.label
                }
              </button>
            );
          },
        )}
      </nav>
    </div>
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
  const activeItem =
    getActiveItem(
      activePage,
    );

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground)">
      {/* ===================================================
          Global Header
          =================================================== */}

      <header className="fixed inset-x-0 top-0 z-50 border-b border-(--border-soft) bg-black/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-5 px-5 lg:px-6">

          {/* ===============================================
              Aeronexus → MissionNexus Brand Family
              =============================================== */}

          <button
            type="button"
            onClick={() =>
              onPageChange(
                "live-ops",
              )
            }
            aria-label="MissionNexus Live Operations"
            className="flex shrink-0 items-center gap-3"
          >
            {/*
              IMPORTANT V2 CHANGE

              V1:
              h-11 logo inside 256px area.

              V2:
              approx. 20px visual height to match the
              compact GeoFusion / Aeronexus product-family
              hierarchy.
            */}

            <img
              src={
                aeronexusWordmark
              }
              alt="Aeronexus"
              className="h-[20px] w-auto max-w-[168px] object-contain"
            />

            <span
              aria-hidden="true"
              className="h-6 w-px bg-white/12"
            />

            <div className="text-left">
              <div className="text-[14px] font-semibold tracking-[-0.025em] text-white">
                MissionNexus
              </div>

              <div className="mt-0.5 font-mono text-[7px] font-medium uppercase tracking-[0.16em] text-(--muted-soft)">
                Mission Command
              </div>
            </div>
          </button>

          {/* ===============================================
              Desktop Navigation
              =============================================== */}

          <nav
            className="hidden h-full flex-1 items-center justify-center gap-7 xl:flex"
            aria-label="MissionNexus primary navigation"
          >
            {navGroups.map(
              (
                group,
              ) => (
                <DesktopNavGroup
                  key={
                    group.label
                  }
                  group={
                    group
                  }
                  activePage={
                    activePage
                  }
                  onPageChange={
                    onPageChange
                  }
                />
              ),
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-4">

            {/* System state */}

            <div className="hidden border-r border-(--border-soft) pr-4 2xl:block">
              <MissionStatus
                label="System Nominal"
                detail="Mission Network"
                tone="nominal"
                pulse
              />
            </div>

            {/* Command action */}

            <MissionButton
              tone="primary"
              variant="outline"
              size="md"
              trailingIcon={
                <ArrowRight
                  size={13}
                />
              }
              onClick={() =>
                onPageChange(
                  "live-ops",
                )
              }
              className="hidden sm:inline-flex"
            >
              Command Center
            </MissionButton>
          </div>
        </div>

        <CompactNavigation
          activePage={
            activePage
          }
          onPageChange={
            onPageChange
          }
        />
      </header>

      {/* ===================================================
          Application Workspace
          =================================================== */}

      <main className="min-h-screen bg-(--background) pt-[104px] xl:pt-16">
        {children}
      </main>

      {/* ===================================================
          MissionNexus V2 Footer
          =================================================== */}

      <footer className="border-t border-(--border-soft) bg-black">
        <div className="mx-auto max-w-[1680px] px-5 py-9 lg:px-6">
          <div className="grid items-start gap-8 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr_1.1fr]">

            {/* =============================================
                Product Identity

                The giant white V1 logo card has been
                intentionally removed.
                ============================================= */}

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src={
                    aeronexusWordmark
                  }
                  alt="Aeronexus"
                  className="h-[18px] w-auto max-w-[150px] object-contain"
                />

                <span
                  aria-hidden="true"
                  className="h-5 w-px bg-white/12"
                />

                <span className="text-[13px] font-semibold text-white">
                  MissionNexus
                </span>
              </div>

              <p className="mt-4 max-w-[280px] text-[11px] leading-[1.75] text-(--muted)">
                Autonomous mission command and operational intelligence for next-generation unmanned systems.
              </p>

              <div className="mt-5">
                <MissionStatus
                  label="Platform Online"
                  detail={
                    activeItem
                      ? activeItem.label
                      : "Mission Interface"
                  }
                  tone="nominal"
                />
              </div>
            </div>

            {/* =============================================
                Product Navigation
                ============================================= */}

            {footerSections.map(
              (
                section,
              ) => (
                <div
                  key={
                    section.title
                  }
                  className="min-w-0"
                >
                  <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-(--primary)">
                    {
                      section.title
                    }
                  </div>

                  <div className="mt-4 flex flex-col gap-2.5">
                    {section.pages.map(
                      (
                        page,
                      ) => (
                        <button
                          key={
                            page.id
                          }
                          type="button"
                          onClick={() =>
                            onPageChange(
                              page.id,
                            )
                          }
                          className={[
                            "w-fit text-left text-[11px] transition-colors",

                            activePage ===
                            page.id
                              ? "text-(--primary)"
                              : "text-(--muted) hover:text-(--foreground)",
                          ].join(" ")}
                        >
                          {
                            page.label
                          }
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ),
            )}

            {/* =============================================
                Mission State
                ============================================= */}

            <div className="min-w-0">
              <div className="font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-(--primary)">
                Mission State
              </div>

              <div className="mt-4 grid gap-3">
                <FooterState
                  label="Aircraft"
                  value={
                    telemetry.droneId
                  }
                />

                <FooterState
                  label="Platform"
                  value={
                    telemetry.model
                  }
                />

                <FooterState
                  label="Mission"
                  value={
                    telemetry.mission
                  }
                />

                <FooterState
                  label="Flight Mode"
                  value={
                    telemetry.flightMode
                  }
                  tone="primary"
                />

                <FooterState
                  label="Risk"
                  value={
                    telemetry.risk.toUpperCase()
                  }
                  tone="nominal"
                />
              </div>
            </div>
          </div>

          {/* ===============================================
              Legal / Build Bar
              =============================================== */}

          <div className="mt-8 border-t border-(--border-soft) pt-4">
            <div className="flex flex-col gap-2 font-mono text-[8px] uppercase tracking-[0.06em] text-(--muted-soft) md:flex-row md:items-center md:justify-between">
              <span>
                Aeronexus autonomous systems · operational capabilities depend on deployment configuration and connected aircraft.
              </span>

              <span>
                © 2026 Aeronexus · MissionNexus V2
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   Footer State Row
   ========================================================= */

function FooterState({
  label,
  value,
  tone = "default",
}: {
  label:
    string;

  value:
    string;

  tone?:
    | "default"
    | "primary"
    | "nominal";
}) {
  const valueClass =
    tone ===
    "primary"
      ? "text-(--primary)"
      : tone ===
          "nominal"
        ? "text-(--nominal)"
        : "text-(--foreground)";

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted-soft)">
        {label}
      </span>

      <span
        className={[
          "max-w-[140px] truncate text-right font-mono text-[9px] font-medium",

          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}