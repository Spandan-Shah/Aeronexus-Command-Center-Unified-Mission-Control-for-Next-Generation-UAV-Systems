import {
  Activity,
  Battery,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
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
      className={`relative shrink-0 border-r border-(--border) bg-[#050d18] transition-all duration-300 ${
        collapsed ? "w-18" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-(--border) px-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] text-(--primary)">
          <Activity size={18} />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-(--nominal)" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div className="text-hud text-sm font-bold">AeroNexus</div>
            <div className="text-hud text-[10px] text-(--muted)">
              Drone Ecosystem
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed((current) => !current)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-(--border) text-(--muted) hover:border-(--primary) hover:text-(--primary)"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <nav className="space-y-1 p-2">
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
                  ? "border-l-2 border-(--primary) bg-[rgba(246,178,60,0.12)] text-(--primary)"
                  : "text-(--muted) hover:bg-(--panel) hover:text-(--foreground)"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="absolute bottom-0 w-64 border-t border-(--border) p-3 text-hud text-[10px]">
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