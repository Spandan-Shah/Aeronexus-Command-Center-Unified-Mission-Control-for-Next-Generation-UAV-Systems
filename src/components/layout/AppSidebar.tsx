import {
  Battery,
  Camera,
  ChevronLeft,
  ChevronRight,
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

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import aeroNexusLogo from "../../assets/aeronexus-logo.png";
import type { PageId } from "../../data/navigation";

type MenuItem = {
  id: PageId;
  title: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
};

const menuItems: MenuItem[] = [
  { id: "live-ops", title: "Live Ops", icon: Radar },
  { id: "mission-planner", title: "Mission Planner", icon: Map },
  { id: "drone-control", title: "Drone Control", icon: Gamepad2 },
  { id: "fleet", title: "Fleet", icon: Plane },
  { id: "drone-health", title: "Drone Health", icon: Gauge },
  { id: "battery", title: "Battery", icon: Battery },
  { id: "camera-ai", title: "Camera AI", icon: Camera },
  { id: "pre-flight", title: "Pre-Flight", icon: ClipboardCheck },
  { id: "logs", title: "Logs", icon: FileText },
  { id: "maintenance", title: "Maintenance", icon: Wrench },
  { id: "inventory", title: "Inventory", icon: Package },
  { id: "security", title: "Security", icon: ShieldCheck },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AppSidebar({ activePage, onPageChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-(--border) bg-[#050d18] transition-all duration-300 ${
        collapsed ? "w-18" : "w-64"
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-(--border) ${
          collapsed ? "justify-center px-2" : "gap-3 px-3 pr-12"
        }`}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-(--primary) bg-[rgba(246,178,60,0.08)]">
          <img
            src={aeroNexusLogo}
            alt="AeroNexus Logo"
            className="h-8 w-8 object-contain"
          />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-(--nominal)" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-hud text-sm font-bold text-(--foreground)">
              AeroNexus
            </div>
            <div className="truncate text-hud text-[10px] text-(--muted)">
              Drone Ecosystem
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed((current) => !current)}
        className={`absolute top-4 z-20 flex h-7 w-7 items-center justify-center rounded border border-(--border) bg-[#050d18] text-(--muted) shadow hover:border-(--primary) hover:text-(--primary) ${
          collapsed ? "-right-3" : "right-3"
        }`}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              title={collapsed ? item.title : undefined}
              className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition ${
                active
                  ? collapsed
                    ? "border border-(--primary) bg-[rgba(246,178,60,0.12)] text-(--primary)"
                    : "border-l-2 border-(--primary) bg-[rgba(246,178,60,0.12)] text-(--primary)"
                  : "text-(--muted) hover:bg-(--panel) hover:text-(--foreground)"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-(--border) p-3 text-hud text-[10px]">
          <div className="flex justify-between text-(--muted)">
            <span>Mode</span>
            <span className="text-(--nominal)">Simulation</span>
          </div>

          <div className="mt-1 flex justify-between text-(--muted)">
            <span>Version</span>
            <span>v0.1.0</span>
          </div>
        </div>
      )}
    </aside>
  );
}