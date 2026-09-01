import { useEffect, useState, type ReactNode } from "react";
import {
  Battery,
  Camera,
  ClipboardCheck,
  Clock,
  FileText,
  Gamepad2,
  Gauge,
  Map,
  Package,
  Plane,
  Radio,
  Radar,
  Settings,
  ShieldCheck,
  Satellite,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import aeroNexusLogo from "../../assets/aeronexus-logo.png";
import { pageDetails, type PageId } from "../../data/navigation";
import { telemetry } from "../../data/telemetry";

type AppShellProps = {
  children: ReactNode;
  activePage: PageId;
  onPageChange: (page: PageId) => void;
};

type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

const primaryNavItems: NavItem[] = [
  { id: "live-ops", label: "Live Ops", icon: Radar },
  { id: "mission-planner", label: "Mission Planner", icon: Map },
  { id: "drone-control", label: "Drone Control", icon: Gamepad2 },
  { id: "fleet", label: "Fleet", icon: Plane },
  { id: "camera-ai", label: "Camera AI", icon: Camera },
  { id: "pre-flight", label: "Pre-Flight", icon: ClipboardCheck },
];

const secondaryNavItems: NavItem[] = [
  { id: "drone-health", label: "Health", icon: Gauge },
  { id: "battery", label: "Battery", icon: Battery },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

const navItems = [...primaryNavItems, ...secondaryNavItems];

function getStatusTone(value: number) {
  if (value >= 80) return "text-(--nominal)";
  if (value >= 45) return "text-(--caution)";
  return "text-(--critical)";
}

function StatusPill({
  icon: Icon,
  label,
  value,
  tone = "text-(--muted)",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-(--border) bg-[#050d18]/80 px-3 py-1.5">
      <Icon size={14} className={tone} />
      <span className="text-hud text-[9px] text-(--muted)">{label}</span>
      <span className={`text-hud text-[10px] font-bold ${tone}`}>{value}</span>
    </div>
  );
}

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  const [time, setTime] = useState("--:--:--");
  const activeDetails = pageDetails[activePage];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-(--background) text-(--foreground)">
      <header className="shrink-0 border-b border-(--border) bg-[#050d18]">
        <div className="flex h-18 items-center gap-4 px-4">
          <button
            type="button"
            onClick={() => onPageChange("live-ops")}
            className="flex min-w-0 items-center gap-3 rounded border border-transparent p-1 pr-4 transition hover:border-(--border) hover:bg-(--panel)"
            title="Go to Live Ops"
          >
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-(--primary) bg-black">
              <img
                src={aeroNexusLogo}
                alt="Aeronexus Logo"
                className="h-10 w-10 object-contain"
              />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-(--nominal)" />
            </div>

            <div className="hidden min-w-0 text-left sm:block">
              <div className="text-hud text-sm font-black tracking-[0.18em] text-(--foreground)">
                AERONEXUS
              </div>
              <div className="text-hud text-[9px] tracking-[0.12em] text-(--muted)">
                Unified UAV Mission Control
              </div>
            </div>
          </button>

          <div className="hidden min-w-0 flex-1 border-l border-(--border) pl-4 lg:block">
            <div className="text-hud text-xs font-bold text-(--foreground)">
              {activeDetails.title}
            </div>
            <div className="mt-1 truncate text-hud text-[9px] text-(--muted)">
              {activeDetails.subtitle}
            </div>
          </div>

          <div className="ml-auto hidden items-center gap-2 xl:flex">
            <StatusPill
              icon={ShieldCheck}
              label="Secure"
              value="Active"
              tone="text-(--nominal)"
            />

            <StatusPill
              icon={Satellite}
              label="GPS"
              value={`${telemetry.gpsSatellites}`}
              tone="text-(--nominal)"
            />

            <StatusPill
              icon={Radio}
              label="Link"
              value={`${telemetry.linkQuality}%`}
              tone={getStatusTone(telemetry.linkQuality)}
            />

            <StatusPill
              icon={Battery}
              label="Battery"
              value={`${telemetry.battery}%`}
              tone={getStatusTone(telemetry.battery)}
            />

            <StatusPill
              icon={Clock}
              label="Time"
              value={time}
              tone="text-(--muted)"
            />
          </div>
        </div>

        <nav className="flex h-12 items-center gap-2 overflow-x-auto border-t border-(--border) bg-[#07111f]/96 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPageChange(item.id)}
                className={`group flex shrink-0 items-center gap-2 rounded border px-3 py-2 text-hud text-[10px] transition ${
                  active
                    ? "border-(--primary) bg-[rgba(246,178,60,0.14)] text-(--primary)"
                    : "border-transparent text-(--muted) hover:border-(--border) hover:bg-(--panel) hover:text-(--foreground)"
                }`}
              >
                <Icon
                  size={14}
                  className={
                    active
                      ? "text-(--primary)"
                      : "text-(--muted) group-hover:text-(--foreground)"
                  }
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden bg-[#07111f]">
        {children}
      </main>

      <footer className="flex h-10 shrink-0 items-center gap-3 border-t border-(--border) bg-[#050d18] px-4">
        <div className="flex items-center gap-2">
          <img
            src={aeroNexusLogo}
            alt="Aeronexus Logo"
            className="h-6 w-6 object-contain"
          />

          <span className="text-hud text-[10px] font-bold text-(--foreground)">
            AERONEXUS
          </span>

          <span className="hidden text-hud text-[9px] text-(--muted) sm:inline">
            Aerospace Mission Systems
          </span>
        </div>

        <div className="ml-auto flex items-center gap-4 text-hud text-[9px] text-(--muted)">
          <span>{telemetry.droneId}</span>
          <span className="hidden sm:inline">{telemetry.model}</span>
          <span className="hidden md:inline">{telemetry.mission}</span>
          <span className="text-(--nominal)">Simulation Mode</span>
          <span>v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}