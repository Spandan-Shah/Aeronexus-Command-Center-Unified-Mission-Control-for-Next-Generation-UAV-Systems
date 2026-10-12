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
  MissionFooter,
} from "./MissionFooter";

/* =========================================================
   MissionNexus V2
   Application Shell

   Aeronexus family hierarchy:

   AERONEXUS | MissionNexus

   Header follows GeoFusion geometry:
   - 70px height
   - compact Aeronexus wordmark
   - single divider
   - Manrope product typography
   - Inter interface typography
   ========================================================= */

type AppShellProps = {
  children:
    ReactNode;

  activePage:
    PageId;

  onPageChange: (
    page:
      PageId,
  ) => void;
};

type NavItem = {
  id:
    PageId;

  label:
    string;

  description:
    string;

  icon:
    LucideIcon;
};

type NavGroup = {
  label:
    string;

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
            "Routes, waypoints, geofences and mission planning",

          icon:
            Map,
        },

        {
          id:
            "drone-control",

          label:
            "Drone Control",

          description:
            "Aircraft commands, payload and flight control",

          icon:
            Gamepad2,
        },

        {
          id:
            "fleet",

          label:
            "Fleet",

          description:
            "Aircraft assignment, state and operational readiness",

          icon:
            Plane,
        },

        {
          id:
            "pre-flight",

          label:
            "Pre-Flight",

          description:
            "Launch readiness and aircraft validation",

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
            "YOLO, OpenCV and aerial video analysis",

          icon:
            Camera,
        },

        {
          id:
            "logs",

          label:
            "Mission Debrief",

          description:
            "Logs, analytics, events and mission audit history",

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
            "Aircraft diagnostics and component condition",

          icon:
            Gauge,
        },

        {
          id:
            "battery",

          label:
            "Battery & Power",

          description:
            "Power state, thermal behavior and endurance",

          icon:
            Battery,
        },

        {
          id:
            "maintenance",

          label:
            "Maintenance",

          description:
            "Aircraft servicing and maintenance scheduling",

          icon:
            Wrench,
        },

        {
          id:
            "inventory",

          label:
            "Inventory",

          description:
            "Parts, payloads and operational assets",

          icon:
            Package,
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

/* =========================================================
   Desktop Navigation
   ========================================================= */

function DesktopNavGroup({
  group,
  activePage,
  onPageChange,
}: {
  group:
    NavGroup;

  activePage:
    PageId;

  onPageChange: (
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
        style={
          productFont
        }
        className={[
          "relative flex h-full items-center gap-1.5",

          "text-[11px] font-semibold uppercase tracking-[0.08em]",

          "transition-colors duration-150",

          active
            ? "text-white"
            : "text-white/70 hover:text-white",
        ].join(
          " ",
        )}
      >
        {
          group.label
        }

        <ChevronDown
          size={
            12
          }
          strokeWidth={
            1.8
          }
          className={[
            "opacity-60",

            "transition-transform duration-150",

            "group-hover:rotate-180",

            "group-focus-within:rotate-180",
          ].join(
            " ",
          )}
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

          "group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100",

          "group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100",
        ].join(
          " ",
        )}
      >
        <div className="px-3 pb-2 pt-1">
          <div
            style={
              productFont
            }
            className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35"
          >
            {
              group.label
            }
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
                  "flex w-full items-start gap-3 rounded-[6px] px-3 py-3 text-left",

                  "transition-colors duration-150",

                  itemActive
                    ? "bg-[rgba(246,178,60,0.08)]"
                    : "hover:bg-white/[0.045]",
                ].join(
                  " ",
                )}
              >
                <span
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border",

                    itemActive
                      ? "border-[rgba(246,178,60,0.26)] bg-[rgba(246,178,60,0.07)] text-(--primary)"
                      : "border-white/[0.08] bg-white/[0.025] text-white/50",
                  ].join(
                    " ",
                  )}
                >
                  <Icon
                    size={
                      14
                    }
                    strokeWidth={
                      1.6
                    }
                  />
                </span>

                <span className="min-w-0">
                  <span
                    style={
                      interfaceFont
                    }
                    className={[
                      "block text-[12px] font-medium",

                      itemActive
                        ? "text-(--primary)"
                        : "text-white/90",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      item.label
                    }
                  </span>

                  <span
                    style={
                      interfaceFont
                    }
                    className="mt-1 block text-[10px] leading-[1.55] text-white/40"
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
  activePage:
    PageId;

  onPageChange: (
    page:
      PageId,
  ) => void;

  onClose:
    () => void;
}) {
  function changePage(
    page:
      PageId,
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
            (
              group,
            ) => (
              <div
                key={
                  group.label
                }
              >
                <div
                  style={
                    productFont
                  }
                  className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-(--primary)"
                >
                  {
                    group.label
                  }
                </div>

                <div className="grid gap-1">
                  {group.items.map(
                    (
                      item,
                    ) => {
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
                              : "text-white/70 hover:bg-white/[0.035] hover:text-white",
                          ].join(
                            " ",
                          )}
                        >
                          <Icon
                            size={
                              14
                            }
                            strokeWidth={
                              1.6
                            }
                          />

                          <span
                            style={
                              interfaceFont
                            }
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
                : "bg-transparent text-white/70",
            ].join(
              " ",
            )}
          >
            <Settings
              size={
                14
              }
              strokeWidth={
                1.6
              }
            />

            <span
              style={
                interfaceFont
              }
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
  activePage:
    PageId;

  onPageChange: (
    page:
      PageId,
  ) => void;
}) {
  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(
      false,
    );

  function changePage(
    page:
      PageId,
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
      style={
        interfaceFont
      }
      className={[
        "fixed inset-x-0 top-0 z-50",

        "h-[70px]",

        "border-b border-white/10",

        "bg-[rgba(5,6,13,0.96)]",

        "backdrop-blur-[18px]",
      ].join(
        " ",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center px-5 sm:px-6 lg:px-10 2xl:px-14">
        {/* ===============================================
            Aeronexus | MissionNexus
            =============================================== */}

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
            src={
              aeronexusWordmark
            }
            alt="Aeronexus"
            className="h-auto w-[114px] shrink-0 object-contain"
          />

          <span
            aria-hidden="true"
            className="mx-[15px] h-[28px] w-px shrink-0 bg-white/12"
          />

          <span
            style={
              productFont
            }
            className="truncate whitespace-nowrap text-[16px] font-normal tracking-[-0.025em] text-white/90"
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
                  changePage
                }
              />
            ),
          )}
        </nav>

        {/* ===============================================
            Utilities
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
              "hidden h-[42px] items-center justify-center gap-2 rounded-[6px] border px-4 lg:flex",

              "transition-[background-color,border-color,color] duration-150",

              activePage ===
              "settings"
                ? "border-white/20 bg-white/[0.06] text-white"
                : "border-white/10 bg-[rgba(5,6,13,0.9)] text-white/70 hover:border-white/20 hover:bg-white/[0.035] hover:text-white",
            ].join(
              " ",
            )}
          >
            <Settings
              size={
                14
              }
              strokeWidth={
                1.6
              }
            />

            <span
              style={
                interfaceFont
              }
              className="text-[12px] font-normal"
            >
              Settings
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(
                (
                  current,
                ) =>
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
              "flex h-[42px] w-[42px] items-center justify-center rounded-[6px] border border-white/10",

              "bg-[rgba(5,6,13,0.9)] text-white/60",

              "transition-[background-color,border-color,color] duration-150",

              "hover:border-white/20 hover:bg-white/[0.035] hover:text-white",
            ].join(
              " ",
            )}
          >
            {mobileOpen ? (
              <X
                size={
                  16
                }
                strokeWidth={
                  1.6
                }
              />
            ) : (
              <Menu
                size={
                  16
                }
                strokeWidth={
                  1.6
                }
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
   Application Shell
   ========================================================= */

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  return (
    <div
      style={
        interfaceFont
      }
      className="flex min-h-screen flex-col bg-(--background) text-(--foreground)"
    >
      <MissionNexusHeader
        activePage={
          activePage
        }
        onPageChange={
          onPageChange
        }
      />

      {/* 70px matches the GeoFusion product-family header. */}

      <main className="min-h-[calc(100vh-70px)] flex-1 pt-[70px]">
        {
          children
        }
      </main>

      <MissionFooter
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