import { type ReactNode } from "react";
import {
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
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import aeronexusWordmark from "../../assets/aeronexus-wordmark-dark.png";
import aeronexusFooterLogo from "../../assets/aeronexus-footer-logo.png";
import { type PageId } from "../../data/navigation";
import { telemetry } from "../../data/telemetry";

type AppShellProps = {
  children: ReactNode;
  activePage: PageId;
  onPageChange: (page: PageId) => void;
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
        label: "Live Ops",
        description: "Real-time UAV command overview",
        icon: Radar,
      },
      {
        id: "mission-planner",
        label: "Mission Planner",
        description: "Waypoint planning and route setup",
        icon: Map,
      },
      {
        id: "drone-control",
        label: "Drone Control",
        description: "Flight command and payload control",
        icon: Gamepad2,
      },
      {
        id: "fleet",
        label: "Fleet",
        description: "Drone fleet and asset overview",
        icon: Plane,
      },
      {
        id: "pre-flight",
        label: "Pre-Flight",
        description: "Readiness and checklist validation",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        id: "camera-ai",
        label: "Camera AI",
        description: "VisionOps AI and aerial detection",
        icon: Camera,
      },
      {
        id: "logs",
        label: "Logs",
        description: "Mission records and event history",
        icon: FileText,
      },
      {
        id: "security",
        label: "Security",
        description: "Secure telemetry and access layer",
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
        description: "System health and diagnostics",
        icon: Gauge,
      },
      {
        id: "battery",
        label: "Battery",
        description: "Battery and power monitoring",
        icon: Battery,
      },
      {
        id: "maintenance",
        label: "Maintenance",
        description: "Service and repair workflows",
        icon: Wrench,
      },
      {
        id: "inventory",
        label: "Inventory",
        description: "Parts, payloads and field assets",
        icon: Package,
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        id: "settings",
        label: "Settings",
        description: "Platform configuration",
        icon: Settings,
      },
    ],
  },
];

const footerColumns = [
  {
    title: "Mission Platform",
    links: [
      "MissionNexus Command",
      "Mission Planning Console",
      "Live Operations Interface",
      "Secure Telemetry Layer",
    ],
  },
  {
    title: "Operational Systems",
    links: [
      "Fleet Monitoring",
      "Pre-Flight Readiness",
      "Drone Health Intelligence",
      "Logs, Audit & Debrief",
    ],
  },
  {
    title: "Aerial Intelligence",
    links: [
      "VisionOps AI",
      "Camera Intelligence",
      "Risk Awareness",
      "Mission Data Review",
    ],
  },
];

function isGroupActive(group: NavGroup, activePage: PageId) {
  return group.items.some((item) => item.id === activePage);
}

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-black text-(--foreground)">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#151923] bg-black">
        <div className="mx-auto flex h-20 max-w-[1680px] items-center px-8">
          <button
            type="button"
            onClick={() => onPageChange("live-ops")}
            className="mr-6 flex h-16 w-64 shrink-0 items-center justify-start bg-black"
            title="Go to Live Ops"
          >
            <img
              src={aeronexusWordmark}
              alt="Aeronexus"
              className="h-11 w-auto object-contain"
            />
          </button>

          <nav className="flex flex-1 items-center justify-center gap-5">
            {navGroups.map((group) => {
              const active = isGroupActive(group, activePage);

              return (
                <div key={group.label} className="group relative">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 text-sm font-medium transition ${
                      active
                        ? "text-(--primary)"
                        : "text-(--muted) hover:text-(--foreground)"
                    }`}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      size={14}
                      className="transition group-hover:rotate-180"
                    />
                  </button>

                  <div className="pointer-events-none absolute left-1/2 top-9 z-50 w-80 -translate-x-1/2 rounded-xl border border-[#1d2533] bg-[#050609] p-2 opacity-0 shadow-[0_24px_70px_rgba(0,0,0,0.55)] transition group-hover:pointer-events-auto group-hover:opacity-100">
                    <div className="absolute -top-3 left-0 h-3 w-full" />

                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const itemActive = activePage === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onPageChange(item.id)}
                          className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${
                            itemActive
                              ? "bg-[rgba(246,178,60,0.13)] text-(--primary)"
                              : "text-(--foreground) hover:bg-[#0b0f16]"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                              itemActive
                                ? "border-(--primary) text-(--primary)"
                                : "border-[#1d2533] text-(--muted)"
                            }`}
                          >
                            <Icon size={15} />
                          </div>

                          <div>
                            <div className="text-sm font-semibold">
                              {item.label}
                            </div>

                            <div className="mt-1 text-xs leading-relaxed text-(--muted)">
                              {item.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => onPageChange("live-ops")}
            className="ml-6 flex shrink-0 items-center gap-2 rounded-sm bg-[#0537d8] px-5 py-3 text-hud text-[10px] font-bold tracking-[0.16em] text-white transition hover:bg-[#0b46ff]"
          >
            Mission Console
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="min-h-screen bg-[#09090b] pt-20">{children}</main>

      <footer className="border-t border-[#151923] bg-black">
        <div className="mx-auto max-w-[1680px] px-8 py-12">
          <div className="grid items-start gap-10 lg:grid-cols-5">
            <div className="min-w-0">
              <div className="flex h-36 w-56 items-center justify-center overflow-hidden rounded-sm bg-white p-4">
                <img
                  src={aeronexusFooterLogo}
                  alt="Aeronexus"
                  className="block max-h-full max-w-full object-contain"
                />
              </div>

              <p className="mt-5 max-w-[220px] text-left text-sm leading-relaxed text-(--muted)">
                Aeronexus develops mission-focused UAV software for planning,
                monitoring, telemetry awareness, aerial intelligence and
                command-control workflows.
              </p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title} className="min-w-0">
                <h3 className="text-hud text-[10px] font-bold tracking-[0.22em] text-(--primary)">
                  {column.title}
                </h3>

                <div className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <span
                      key={link}
                      className="block text-sm leading-relaxed text-(--foreground)"
                    >
                      {link}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            <div className="min-w-0">
              <h3 className="text-hud text-[10px] font-bold tracking-[0.22em] text-(--primary)">
                Mission State
              </h3>

              <div className="mt-5 flex flex-col gap-3 text-sm">
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <span className="text-(--muted)">Drone</span>
                  <span className="text-right text-(--foreground)">
                    {telemetry.droneId}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <span className="text-(--muted)">Platform</span>
                  <span className="text-right text-(--foreground)">
                    {telemetry.model}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <span className="text-(--muted)">Mission</span>
                  <span className="text-right text-(--foreground)">
                    {telemetry.mission}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <span className="text-(--muted)">Operating Mode</span>
                  <span className="text-right text-(--nominal)">
                    Simulation
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <span className="text-(--muted)">Interface Build</span>
                  <span className="text-right text-(--foreground)">v0.1.0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-[#151923] pt-5">
            <div className="flex flex-col gap-3 text-xs text-(--muted) md:flex-row md:items-center md:justify-between">
              <p>
                Product capabilities depend on configuration, available
                telemetry, integrations and deployment environment.
              </p>

              <p>© 2026 Aeronexus. Mission systems interface.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}