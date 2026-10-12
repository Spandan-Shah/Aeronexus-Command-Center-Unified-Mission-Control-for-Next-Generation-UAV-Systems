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

const productFont = {
  fontFamily:
    '"Manrope", "Inter", ui-sans-serif, system-ui, sans-serif',
};

const interfaceFont = {
  fontFamily:
    '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

function isGroupActive(
  group: NavGroup,
  activePage: PageId,
) {
  return group.items.some(
    (item) =>
      item.id === activePage,
  );
}

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

          /*
           * Reduced from 13px.
           * Cleaner and closer to GeoFusion.
           */
          "text-[12px] font-semibold uppercase tracking-[0.06em]",

          "transition-colors duration-150",

          active
            ? "text-white"
            : "text-white/68 hover:text-white",
        ].join(" ")}
      >
        {group.label}

        <ChevronDown
          size={12}
          strokeWidth={1.7}
          className="opacity-55 transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180"
        />

        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-(--primary)"
          />
        ) : null}
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full h-3 w-[310px] -translate-x-1/2" />

      <div
        className={[
          "pointer-events-none invisible absolute left-1/2 top-[calc(100%+10px)] z-[80]",

          "w-[310px] -translate-x-1/2",

          "rounded-[6px] border border-white/10",

          "bg-[rgba(5,6,13,0.98)] p-2",

          "opacity-0",

          "shadow-[0_22px_60px_rgba(0,0,0,0.5)]",

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
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38"
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
                  "flex w-full items-start gap-3 rounded-[6px] px-3 py-2.5 text-left",

                  "transition-colors duration-150",

                  itemActive
                    ? "bg-[rgba(246,178,60,0.08)]"
                    : "hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center",

                    "rounded-[5px] border",

                    itemActive
                      ? "border-[rgba(246,178,60,0.28)] bg-[rgba(246,178,60,0.07)] text-(--primary)"
                      : "border-white/[0.08] bg-white/[0.02] text-white/50",
                  ].join(" ")}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.6}
                  />
                </span>

                <span className="min-w-0">
                  <span
                    className={[
                      "block text-[12px] font-medium",

                      itemActive
                        ? "text-(--primary)"
                        : "text-white/90",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>

                  <span className="mt-1 block text-[10px] leading-[1.45] text-white/42">
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
    <div className="absolute inset-x-0 top-[70px] border-b border-white/10 bg-[rgba(5,6,13,0.99)] shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-[18px] min-[1380px]:hidden">
      <div className="mx-auto max-h-[calc(100vh-70px)] max-w-[1600px] overflow-y-auto px-5 py-5 sm:px-6 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {navGroups.map(
            (group) => (
              <div
                key={group.label}
              >
                <div
                  style={productFont}
                  className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--primary)"
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
                          className={[
                            "flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-left",

                            active
                              ? "bg-[rgba(246,178,60,0.08)] text-(--primary)"
                              : "text-white/70 hover:bg-white/[0.035] hover:text-white",
                          ].join(" ")}
                        >
                          <Icon
                            size={14}
                            strokeWidth={1.6}
                          />

                          <span className="text-[12px]">
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

        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={() =>
              changePage(
                "settings",
              )
            }
            className={[
              "flex h-[40px] w-full items-center justify-center gap-2",

              "rounded-[6px] border border-white/10",

              "text-[12px]",

              activePage ===
              "settings"
                ? "bg-white/[0.06] text-white"
                : "bg-transparent text-white/70",
            ].join(" ")}
          >
            <Settings
              size={14}
              strokeWidth={1.6}
            />

            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

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
        "fixed inset-x-0 top-0 z-[100]",

        "h-[70px]",

        "border-b border-white/10",

        "bg-[#05060d]",

        "shadow-[0_8px_24px_rgba(0,0,0,0.22)]",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
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
            className="h-8 w-auto object-contain sm:h-9 xl:h-10"
          />

          <span
            aria-hidden="true"
            className="mx-3 h-6 w-px shrink-0 bg-white/15"
          />

          <span
            style={productFont}
            className="truncate text-[15px] font-medium tracking-[-0.01em] text-white/80"
          >
            MissionNexus
          </span>
        </button>

        <nav
          aria-label="MissionNexus primary navigation"
          className="ml-auto hidden h-full items-center gap-7 min-[1380px]:flex"
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

        <div className="ml-auto flex items-center gap-2 min-[1380px]:ml-7">
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
              "hidden h-[38px] items-center justify-center gap-2 rounded-[6px] border px-3.5",

              "text-[12px] font-medium",

              "transition-[background-color,border-color,color] duration-150",

              "sm:flex",

              activePage ===
              "settings"
                ? "border-white/20 bg-white/[0.06] text-white"
                : "border-white/10 bg-[#07090d] text-white/68 hover:border-white/20 hover:bg-white/[0.04] hover:text-white",
            ].join(" ")}
          >
            <Settings
              size={14}
              strokeWidth={1.6}
            />

            Settings
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
            aria-expanded={mobileOpen}
            className={[
              "flex h-[38px] w-[38px] items-center justify-center",

              "rounded-[6px] border border-white/10",

              "bg-[#07090d]",

              "text-white/60",

              "hover:border-white/20 hover:text-white",

              "min-[1380px]:hidden",
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

      <main className="pt-[70px]">
        {children}
      </main>

      <MissionFooter
        activePage={activePage}
        onPageChange={onPageChange}
      />
    </div>
  );
}