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

import aeronexusWordmark from "../../assets/aeronexus-wordmark-dark.png";

import type {
  PageId,
} from "../../data/navigation";

import {
  telemetry,
} from "../../data/telemetry";

import {
  MissionStatus,
} from "../ui/mission";

/* =========================================================
   MissionNexus V2 Application Shell

   Aeronexus Product Family Lockup:

   AERONEXUS | MissionNexus

   Header geometry intentionally follows GeoFusion:
   - 70 px header
   - compact Aeronexus wordmark
   - single divider
   - single-line product name
   - Manrope / Inter typography
   - 42 px utility controls
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
          "Real-time aircraft command and mission awareness",
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
          "Aircraft assignment, state and operational readiness",
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
          "Logs, analytics, events and mission audit history",
        icon: FileText,
      },

      {
        id: "security",
        label: "Security",
        description:
          "Secure command sessions and telemetry integrity",
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
   Product Typography

   Mirrors GeoFusion's Manrope → Inter display stack.
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

function getActiveItem(
  activePage: PageId,
) {
  for (
    const group of navGroups
  ) {
    const item =
      group.items.find(
        (candidate) =>
          candidate.id === activePage,
      );

    if (item) {
      return item;
    }
  }

  if (
    activePage === "settings"
  ) {
    return {
      id: "settings" as PageId,
      label: "Settings",
      description:
        "MissionNexus system configuration",
      icon: Settings,
    };
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
      <button
        type="button"
        style={productFont}
        className={[
          "relative flex h-full items-center gap-1.5",

          "text-[11px] font-semibold uppercase tracking-[0.08em]",

          "transition-colors duration-150",

          active
            ? "text-white"
            : "text-white/72 hover:text-white",
        ].join(" ")}
      >
        {group.label}

        <ChevronDown
          size={12}
          strokeWidth={1.8}
          className={[
            "opacity-60",

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

      {/* Hover bridge */}

      <div className="pointer-events-none absolute left-1/2 top-full h-3 w-[320px] -translate-x-1/2" />

      {/* Dropdown */}

      <div
        className={[
          "pointer-events-none invisible absolute left-1/2 top-[calc(100%+10px)] z-[80]",

          "w-[320px] -translate-x-1/2",

          "rounded-[6px] border border-white/10",

          "bg-[rgba(5,6,13,0.97)] p-2",

          "opacity-0",

          "shadow-[0_22px_60px_rgba(0,0,0,0.42)]",

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
            className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35"
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
                  "flex w-full items-start gap-3 rounded-[6px] px-3 py-3 text-left",

                  "transition-colors duration-150",

                  itemActive
                    ? "bg-[rgba(246,178,60,0.08)]"
                    : "hover:bg-white/[0.045]",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center",

                    "rounded-[6px] border",

                    itemActive
                      ? "border-[rgba(246,178,60,0.26)] bg-[rgba(246,178,60,0.07)] text-(--primary)"
                      : "border-white/[0.08] bg-white/[0.025] text-white/50",
                  ].join(" ")}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.6}
                  />
                </span>

                <span className="min-w-0">
                  <span
                    style={interfaceFont}
                    className={[
                      "block text-[12px] font-medium",

                      itemActive
                        ? "text-(--primary)"
                        : "text-white/90",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>

                  <span
                    style={interfaceFont}
                    className="mt-1 block text-[10px] leading-[1.55] text-white/42"
                  >
                    {
                      item.description
                    }
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
    <div className="absolute inset-x-0 top-[70px] border-b border-white/10 bg-[rgba(5,6,13,0.98)] shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-[18px] xl:hidden">
      <div className="mx-auto max-h-[calc(100vh-70px)] max-w-[1600px] overflow-y-auto px-5 py-5 sm:px-6 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {navGroups.map(
            (group) => (
              <div
                key={
                  group.label
                }
              >
                <div
                  style={productFont}
                  className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-(--primary)"
                >
                  {
                    group.label
                  }
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
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            changePage(
                              item.id,
                            )
                          }
                          className={[
                            "flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-left",

                            active
                              ? "bg-[rgba(246,178,60,0.08)] text-(--primary)"
                              : "text-white/68 hover:bg-white/[0.035] hover:text-white",
                          ].join(" ")}
                        >
                          <Icon
                            size={14}
                            strokeWidth={1.6}
                          />

                          <span
                            style={interfaceFont}
                            className="text-[12px]"
                          >
                            {
                              item.label
                            }
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

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={() =>
              changePage(
                "settings",
              )
            }
            className={[
              "flex h-[42px] w-full items-center justify-center gap-2",

              "rounded-[6px] border border-white/10",

              activePage ===
              "settings"
                ? "bg-white/[0.06] text-white"
                : "bg-transparent text-white/68",
            ].join(" ")}
          >
            <Settings
              size={14}
              strokeWidth={1.6}
            />

            <span
              style={interfaceFont}
              className="text-[12px]"
            >
              Settings
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Header
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
        "fixed inset-x-0 top-0 z-50",

        "h-[70px]",

        "border-b border-white/10",

        "bg-[rgba(5,6,13,0.96)]",

        "backdrop-blur-[18px]",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center px-5 sm:px-6 lg:px-10 2xl:px-14">

        {/* ===============================================
            Aeronexus | MissionNexus

            GeoFusion-matched family lockup.
            =============================================== */}

        <button
          type="button"
          onClick={() =>
            changePage(
              "live-ops",
            )
          }
          aria-label="MissionNexus home"
          className="flex shrink-0 items-center"
        >
          <img
            src={
              aeronexusWordmark
            }
            alt="Aeronexus"
            className="h-auto w-[114px] object-contain"
          />

          <span
            aria-hidden="true"
            className="mx-[15px] h-[28px] w-px bg-white/12"
          />

          <span
            style={productFont}
            className="whitespace-nowrap text-[16px] font-normal tracking-[-0.025em] text-white/90"
          >
            MissionNexus
          </span>
        </button>

        {/* ===============================================
            Desktop Navigation
            =============================================== */}

        <nav
          aria-label="MissionNexus primary navigation"
          className="ml-auto hidden h-full items-center gap-8 xl:flex"
        >
          {navGroups.map(
            (group) => (
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
                  changePage
                }
              />
            ),
          )}
        </nav>

        {/* ===============================================
            Right Utilities
            =============================================== */}

        <div className="ml-auto flex items-center gap-2 xl:ml-8">
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
              "hidden h-[42px] items-center justify-center gap-2",

              "rounded-[6px] border px-4",

              "transition-[background-color,border-color,color] duration-150",

              "lg:flex",

              activePage ===
              "settings"
                ? "border-white/20 bg-white/[0.06] text-white"
                : "border-white/10 bg-[rgba(5,6,13,0.9)] text-white/68 hover:border-white/20 hover:bg-white/[0.035] hover:text-white",
            ].join(" ")}
          >
            <Settings
              size={14}
              strokeWidth={1.6}
            />

            <span
              style={interfaceFont}
              className="text-[12px] font-normal"
            >
              Settings
            </span>
          </button>

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
            aria-expanded={
              mobileOpen
            }
            className={[
              "flex h-[42px] w-[42px] items-center justify-center",

              "rounded-[6px] border border-white/10",

              "bg-[rgba(5,6,13,0.9)]",

              "text-white/58",

              "transition-[background-color,border-color,color] duration-150",

              "hover:border-white/20 hover:bg-white/[0.035] hover:text-white",
            ].join(" ")}
          >
            {mobileOpen ? (
              <X
                size={16}
                strokeWidth={1.6}
              />
            ) : (
              <Menu
                size={16}
                strokeWidth={1.6}
              />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <MobileNavigation
          activePage={
            activePage
          }
          onPageChange={
            onPageChange
          }
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
   Footer State
   ========================================================= */

function FooterState({
  label,
  value,
  tone = "default",
}: {
  label: string;

  value: string;

  tone?:
    | "default"
    | "primary"
    | "nominal";
}) {
  const valueClass =
    tone === "primary"
      ? "text-(--primary)"
      : tone ===
          "nominal"
        ? "text-(--nominal)"
        : "text-white/84";

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4">
      <span className="text-[9px] uppercase tracking-[0.08em] text-white/34">
        {label}
      </span>

      <span
        className={[
          "max-w-[160px] truncate text-right text-[10px] font-medium",

          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   Footer
   ========================================================= */

function MissionNexusFooter({
  activePage,
  onPageChange,
}: {
  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
}) {
  const activeItem =
    getActiveItem(
      activePage,
    );

  return (
    <footer
      style={interfaceFont}
      className="border-t border-white/[0.07] bg-[#05060d]"
    >
      <div className="mx-auto max-w-[1600px] px-5 py-9 sm:px-6 lg:px-10 2xl:px-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">

          {/* Product */}

          <div>
            <div className="flex items-center">
              <img
                src={
                  aeronexusWordmark
                }
                alt="Aeronexus"
                className="h-auto w-[105px] object-contain"
              />

              <span
                aria-hidden="true"
                className="mx-3 h-6 w-px bg-white/10"
              />

              <span
                style={productFont}
                className="text-[15px] font-normal tracking-[-0.02em] text-white/88"
              >
                MissionNexus
              </span>
            </div>

            <p className="mt-4 max-w-[320px] text-[11px] leading-[1.75] text-white/42">
              Autonomous mission command and operational intelligence for next-generation unmanned systems.
            </p>

            <div className="mt-5">
              <MissionStatus
                label="Platform Online"
                detail={
                  activeItem
                    ?.label ??
                  "MissionNexus"
                }
                tone="nominal"
              />
            </div>
          </div>

          {/* Operations */}

          <FooterColumn
            title="Operations"
            pages={[
              [
                "Live Operations",
                "live-ops",
              ],

              [
                "Mission Planner",
                "mission-planner",
              ],

              [
                "Drone Control",
                "drone-control",
              ],

              [
                "Fleet",
                "fleet",
              ],

              [
                "Pre-Flight",
                "pre-flight",
              ],
            ]}
            activePage={
              activePage
            }
            onPageChange={
              onPageChange
            }
          />

          {/* Intelligence */}

          <FooterColumn
            title="Intelligence"
            pages={[
              [
                "Vision Intelligence",
                "camera-ai",
              ],

              [
                "Mission Debrief",
                "logs",
              ],

              [
                "Security",
                "security",
              ],

              [
                "Settings",
                "settings",
              ],
            ]}
            activePage={
              activePage
            }
            onPageChange={
              onPageChange
            }
          />

          {/* Mission State */}

          <div>
            <div
              style={productFont}
              className="text-[9px] font-semibold uppercase tracking-[0.16em] text-(--primary)"
            >
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

        <div className="mt-9 border-t border-white/[0.07] pt-4">
          <div className="flex flex-col gap-2 text-[9px] uppercase tracking-[0.05em] text-white/28 md:flex-row md:items-center md:justify-between">
            <span>
              Aeronexus autonomous systems
            </span>

            <span>
              © 2026 Aeronexus · MissionNexus V2
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
   Footer Column
   ========================================================= */

function FooterColumn({
  title,
  pages,
  activePage,
  onPageChange,
}: {
  title: string;

  pages: Array<
    [
      string,
      PageId,
    ]
  >;

  activePage: PageId;

  onPageChange: (
    page: PageId,
  ) => void;
}) {
  return (
    <div>
      <div
        style={productFont}
        className="text-[9px] font-semibold uppercase tracking-[0.16em] text-(--primary)"
      >
        {title}
      </div>

      <div className="mt-4 grid gap-2.5">
        {pages.map(
          ([
            label,
            page,
          ]) => (
            <button
              key={
                page
              }
              type="button"
              onClick={() =>
                onPageChange(
                  page,
                )
              }
              className={[
                "w-fit text-left text-[11px]",

                "transition-colors duration-150",

                activePage ===
                page
                  ? "text-(--primary)"
                  : "text-white/42 hover:text-white/82",
              ].join(" ")}
            >
              {label}
            </button>
          ),
        )}
      </div>
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
  return (
    <div
      style={interfaceFont}
      className="min-h-screen bg-(--background) text-(--foreground)"
    >
      <MissionNexusHeader
        activePage={
          activePage
        }
        onPageChange={
          onPageChange
        }
      />

      {/* GeoFusion uses 70 px. MissionNexus now does too. */}

      <main className="min-h-screen pt-[70px]">
        {children}
      </main>

      <MissionNexusFooter
        activePage={
          activePage
        }
        onPageChange={
          onPageChange
        }
      />
    </div>
  );
}