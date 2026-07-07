import {
  Activity,
  Battery,
  Camera,
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
  return (
    <aside className="relative w-64 shrink-0 border-r border-(--border) bg-[#050d18]">
      <div className="h-16 border-b border-(--border) px-4 flex items-center gap-3">
        <div className="relative h-9 w-9 rounded border border-(--primary) bg-[rgba(246,178,60,0.08)] flex items-center justify-center text-(--primary)">
          <Activity size={18} />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-(--nominal)" />
        </div>

        <div>
          <div className="text-hud text-sm font-bold">AeroNexus</div>
          <div className="text-hud text-[10px] text-(--muted)">
            Drone Ecosystem
          </div>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left text-sm transition ${
                active
                  ? "bg-[rgba(246,178,60,0.12)] text-(--primary) border-l-2 border-(--primary)"
                  : "text-(--muted) hover:bg-(--panel) hover:text-(--foreground)"
              }`}
            >
              <Icon size={16} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

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
    </aside>
  );
}