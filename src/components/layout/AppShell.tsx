import {
  useState,
  type ReactNode,
} from "react";

import {
  Battery,
  Camera,
  ChevronDown,
  ClipboardCheck,
  Crosshair,
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
   Types
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
          "Real-time mission awareness, telemetry and tactical mapping",

        icon:
          Radar,
      },

      {
        id:
          "mission-planner",

        label:
          "Mission Planner",

        description:
          "Routes, waypoints, geofences and mission preparation",

        icon:
          Map,
      },

      {
        id:
          "drone-control",

        label:
          "Drone Control",

        description:
          "Aircraft commands, payload controls and flight interaction",

        icon:
          Gamepad2,
      },

      {
        id:
          "autonomous-intercept",

        label:
          "Autonomy Lab",

        description:
          "Predictive guidance and multi-aircraft simulation",

        icon:
          Crosshair,
      },

      {
        id:
          "fleet",

        label:
          "Fleet",

        description:
          "Aircraft assignment, availability and operational readiness",

        icon:
          Plane,
      },

      {
        id:
          "pre-flight",

        label:
          "Pre-Flight",

        description:
          "Launch readiness, validation and mission safety checks",

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
          "Aerial computer vision, tracking and video intelligence",

        icon:
          Camera,
      },

      {
        id:
          "logs",

        label:
          "Mission Debrief",

        description:
          "Mission logs, events, analytics and historical review",

        icon:
          FileText,
      },

      {
        id:
          "security",

        label:
          "Security",

        description:
          "Secure sessions, telemetry integrity and communications",

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
          "Aircraft diagnostics, component condition and system health",

        icon:
          Gauge,
      },

      {
        id:
          "battery",

        label:
          "Battery & Power",

        description:
          "Energy state, thermal behavior and endurance monitoring",

        icon:
          Battery,
      },

      {
        id:
          "maintenance",

        label:
          "Maintenance",

        description:
          "Aircraft servicing, maintenance records and scheduling",

        icon:
          Wrench,
      },

      {
        id:
          "inventory",

        label:
          "Inventory",

        description:
          "Parts, payloads, airframes and operational assets",

        icon:
          Package,
      },
    ],
  },
];


/* =========================================================
   Fonts
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
   Helper
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
          "relative flex h-full items-center gap-1.5 px-1",

          "text-[14px] font-semibold tracking-[-0.01em]",

          "transition-colors duration-150",

          active
            ? "text-white"
            : "text-white/60 hover:text-white",
        ].join(" ")}
      >
        {
          group.label
        }

        <ChevronDown
          size={
            14
          }
          strokeWidth={
            1.7
          }
          className={[
            "text-white/38",

            "transition-transform duration-150",

            "group-hover:rotate-180",

            "group-focus-within:rotate-180",
          ].join(" ")}
        />

        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[2px] bg-[#A37B43]"
          />
        ) : null}
      </button>


      <div className="pointer-events-none absolute left-1/2 top-full h-4 w-[370px] -translate-x-1/2" />


      <div
        className={[
          "pointer-events-none invisible absolute left-1/2",

          "top-[calc(100%+10px)]",

          "z-[5100]",

          "w-[370px] -translate-x-1/2",

          "rounded-[8px]",

          "border border-white/[0.09]",

          "bg-[#0A0C0F]",

          "p-2.5",

          "opacity-0",

          "shadow-[0_26px_70px_rgba(0,0,0,0.48)]",

          "transition-[opacity,visibility] duration-150",

          "group-hover:pointer-events-auto",

          "group-hover:visible",

          "group-hover:opacity-100",

          "group-focus-within:pointer-events-auto",

          "group-focus-within:visible",

          "group-focus-within:opacity-100",
        ].join(" ")}
      >
        <div className="px-3 pb-2.5 pt-1.5">
          <div
            style={
              productFont
            }
            className="text-[14px] font-semibold text-white/90"
          >
            {
              group.label
            }
          </div>

          <div className="mt-1 text-[13px] text-white/42">
            MissionNexus workspace
          </div>
        </div>


        <div className="mb-2 h-px bg-white/[0.07]" />


        <div className="grid gap-1">
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
                    "group/item flex w-full items-start gap-3",

                    "rounded-[6px] border px-3 py-3",

                    "text-left",

                    "transition-[background-color,border-color] duration-150",

                    itemActive
                      ? "border-[rgba(163,123,67,0.28)] bg-[rgba(163,123,67,0.11)]"
                      : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center",

                      "rounded-[6px] border",

                      itemActive
                        ? "border-[rgba(163,123,67,0.36)] bg-[rgba(163,123,67,0.12)] text-[#D1AD74]"
                        : "border-white/[0.09] bg-white/[0.025] text-white/48 group-hover/item:text-white/72",
                    ].join(" ")}
                  >
                    <Icon
                      size={
                        15
                      }
                      strokeWidth={
                        1.6
                      }
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        "block text-[14px] font-semibold leading-[1.35]",

                        itemActive
                          ? "text-[#D9B97E]"
                          : "text-white/90",
                      ].join(" ")}
                    >
                      {
                        item.label
                      }
                    </span>

                    <span className="mt-1 block text-[13px] leading-[1.45] text-white/44">
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
    <div
      className={[
        "absolute inset-x-0 top-[70px]",

        "z-[5100]",

        "border-b border-white/[0.09]",

        "bg-[#050607]",

        "shadow-[0_26px_70px_rgba(0,0,0,0.46)]",

        "min-[1380px]:hidden",
      ].join(" ")}
    >
      <div className="mx-auto max-h-[calc(100vh-70px)] max-w-[1680px] overflow-y-auto px-5 py-6 sm:px-6 lg:px-10">
        <div className="grid gap-7 md:grid-cols-3">
          {navGroups.map(
            (
              group,
            ) => (
              <section
                key={
                  group.label
                }
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    style={
                      productFont
                    }
                    className="text-[15px] font-semibold text-white/90"
                  >
                    {
                      group.label
                    }
                  </span>

                  <span className="h-px flex-1 bg-white/[0.08]" />
                </div>

                <div className="grid gap-1.5">
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
                            "flex items-start gap-3 rounded-[6px] border px-3 py-3 text-left",

                            active
                              ? "border-[rgba(163,123,67,0.28)] bg-[rgba(163,123,67,0.10)] text-[#D9B97E]"
                              : "border-transparent text-white/70 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white",
                          ].join(" ")}
                        >
                          <Icon
                            size={
                              16
                            }
                            strokeWidth={
                              1.6
                            }
                            className="mt-0.5 shrink-0"
                          />

                          <span>
                            <span className="block text-[14px] font-semibold">
                              {
                                item.label
                              }
                            </span>

                            <span className="mt-1 block text-[13px] leading-[1.45] text-white/42">
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
              </section>
            ),
          )}
        </div>


        <div className="mt-7 border-t border-white/[0.08] pt-5">
          <button
            type="button"
            onClick={() =>
              changePage(
                "settings",
              )
            }
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[6px] border border-white/[0.10] bg-white/[0.03] text-[14px] font-semibold text-white/78"
          >
            <Settings
              size={
                16
              }
            />

            Settings
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
        "fixed inset-x-0 top-0 z-[5000]",

        "h-[70px]",

        "border-b border-white/[0.09]",

        "bg-[#050607]",

        "shadow-[0_8px_30px_rgba(0,0,0,0.26)]",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full w-full max-w-[1680px] items-center px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        {/* Brand */}

        <button
          type="button"
          onClick={() =>
            changePage(
              "live-ops",
            )
          }
          className="flex min-w-0 shrink-0 items-center"
          aria-label="MissionNexus home"
        >
          <img
            src={
              aeronexusWordmark
            }
            alt="Aeronexus"
            className="h-[36px] w-auto shrink-0 object-contain xl:h-[39px]"
          />

          <span className="mx-3.5 h-7 w-px bg-white/[0.14]" />

          <span className="min-w-0 text-left">
            <span
              style={
                productFont
              }
              className="block text-[16px] font-semibold tracking-[-0.02em] text-white"
            >
              MissionNexus
            </span>

            <span className="mt-0.5 hidden text-[12px] font-medium text-white/42 xl:block">
              Mission Operations Platform
            </span>
          </span>
        </button>


        {/* Desktop Nav */}

        <nav
          aria-label="MissionNexus primary navigation"
          className="ml-auto hidden h-full items-center gap-8 min-[1380px]:flex"
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


        {/* Header Controls */}

        <div className="ml-auto flex items-center gap-2.5 min-[1380px]:ml-8">
          <div className="hidden items-center gap-2 rounded-[6px] border border-white/[0.09] bg-white/[0.025] px-3 py-2 xl:flex">
            <span className="h-2 w-2 rounded-full bg-[#6FB28D]" />

            <span className="font-mono text-[13px] font-semibold tracking-[0.02em] text-white/56">
              MISSION CONSOLE
            </span>
          </div>


          <button
            type="button"
            onClick={() =>
              changePage(
                "settings",
              )
            }
            className={[
              "hidden h-[40px] items-center gap-2 rounded-[6px] border px-3.5",

              "text-[13px] font-semibold",

              "sm:flex",

              activePage ===
              "settings"
                ? "border-white/[0.18] bg-white/[0.08] text-white"
                : "border-white/[0.09] bg-white/[0.025] text-white/68 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white",
            ].join(" ")}
          >
            <Settings
              size={
                15
              }
            />

            Settings
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
            className="flex h-[40px] w-[40px] items-center justify-center rounded-[6px] border border-white/[0.10] bg-white/[0.025] text-white/70 min-[1380px]:hidden"
            aria-label={
              mobileOpen
                ? "Close navigation"
                : "Open navigation"
            }
          >
            {mobileOpen ? (
              <X
                size={
                  18
                }
              />
            ) : (
              <Menu
                size={
                  18
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
   App Shell
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
      className="min-h-screen bg-[#DDE3E8] text-[#18232D]"
    >
      <MissionNexusHeader
        activePage={
          activePage
        }
        onPageChange={
          onPageChange
        }
      />


      <main
        className={[
          "relative z-0",

          "min-h-[calc(100vh-70px)]",

          "pt-[70px]",

          "bg-[linear-gradient(180deg,#E7EBEF_0%,#DDE3E8_42%,#D7DEE4_100%)]",
        ].join(" ")}
      >
        {children}
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