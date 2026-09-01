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
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "live-ops", label: "Live Ops", icon: Radar },
  { id: "mission-planner", label: "Mission Planner", icon: Map },
  { id: "drone-control", label: "Drone Control", icon: Gamepad2 },
  { id: "fleet", label: "Fleet", icon: Plane },
  { id: "camera-ai", label: "Camera AI", icon: Camera },
  { id: "pre-flight", label: "Pre-Flight", icon: ClipboardCheck },
  { id: "drone-health", label: "Health", icon: Gauge },
  { id: "battery", label: "Battery", icon: Battery },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

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
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-(--border) bg-black px-3 py-1.5">
      <Icon size={14} className={tone} />

      <span className="text-hud text-[9px] uppercase tracking-[0.14em] text-(--muted)">
        {label}
      </span>

      <span className={`text-hud text-xs font-bold ${tone}`}>{value}</span>
    </div>
  );
}

export function AppShell({
  children,
  activePage,
  onPageChange,
}: AppShellProps) {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-(--foreground)">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-(--border) bg-black">
        <div className="mx-auto flex h-24 max-w-[1680px] items-center gap-7 px-8">
          <button
            type="button"
            onClick={() => onPageChange("live-ops")}
            className="flex h-20 w-84 shrink-0 items-center justify-start bg-black"
            title="Go to Live Ops"
          >
            <img
              src={aeronexusWordmark}
              alt="Aeronexus"
              className="h-14 w-auto object-contain"
            />
          </button>

          <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPageChange(item.id)}
                  className={`group flex shrink-0 items-center gap-2 rounded-sm border px-4 py-3 text-hud text-xs transition ${
                    active
                      ? "border-(--primary) bg-[rgba(246,178,60,0.14)] text-(--primary)"
                      : "border-transparent text-(--muted) hover:border-(--border) hover:bg-(--panel) hover:text-(--foreground)"
                  }`}
                >
                  <Icon
                    size={16}
                    className={
                      active
                        ? "text-(--primary)"
                        : "text-(--muted) group-hover:text-(--foreground)"
                    }
                  />

                  <span className="whitespace-nowrap uppercase tracking-[0.13em]">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 2xl:flex">
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
      </header>

      <main className="min-h-screen bg-[#07111f] pt-24">{children}</main>

      <footer className="border-t border-(--border) bg-black">
        <div className="mx-auto grid max-w-[1680px] gap-10 px-8 py-12 lg:grid-cols-[360px_1fr]">
          <div>
            <div className="flex h-44 w-64 items-center justify-center rounded-sm bg-white p-4">
              <img
                src={aeronexusFooterLogo}
                alt="Aeronexus"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-(--muted)">
              Autonomous UAV operations, mission planning, secure telemetry,
              aerial intelligence and command-control software.
            </p>

            <p className="mt-6 text-sm leading-relaxed text-(--muted)">
              Gujarat, India
              <br />
              General enquiries: via the contact form
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-hud text-[11px] tracking-[0.28em] text-(--muted)">
                Products
              </h3>

              <div className="mt-6 space-y-4 text-sm text-(--foreground)">
                <button onClick={() => onPageChange("mission-planner")}>
                  Mission Planner
                </button>
                <button onClick={() => onPageChange("drone-control")}>
                  Drone Control
                </button>
                <button onClick={() => onPageChange("camera-ai")}>
                  VisionOps AI
                </button>
                <button onClick={() => onPageChange("security")}>
                  Secure Access
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-hud text-[11px] tracking-[0.28em] text-(--muted)">
                Operations
              </h3>

              <div className="mt-6 space-y-4 text-sm text-(--foreground)">
                <button onClick={() => onPageChange("live-ops")}>
                  Live Ops
                </button>
                <button onClick={() => onPageChange("fleet")}>Fleet</button>
                <button onClick={() => onPageChange("pre-flight")}>
                  Pre-Flight
                </button>
                <button onClick={() => onPageChange("logs")}>
                  Logs & Debrief
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-hud text-[11px] tracking-[0.28em] text-(--muted)">
                Systems
              </h3>

              <div className="mt-6 space-y-4 text-sm text-(--foreground)">
                <button onClick={() => onPageChange("drone-health")}>
                  Drone Health
                </button>
                <button onClick={() => onPageChange("battery")}>
                  Battery & Power
                </button>
                <button onClick={() => onPageChange("maintenance")}>
                  Maintenance
                </button>
                <button onClick={() => onPageChange("inventory")}>
                  Inventory
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-hud text-[11px] tracking-[0.28em] text-(--muted)">
                Mission State
              </h3>

              <div className="mt-6 space-y-4 text-sm text-(--foreground)">
                <div>Drone: {telemetry.droneId}</div>
                <div>Platform: {telemetry.model}</div>
                <div>Mission: {telemetry.mission}</div>
                <div className="text-(--nominal)">Mode: Simulation</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-(--border)">
          <div className="mx-auto flex max-w-[1680px] items-center justify-between px-8 py-6 text-xs text-(--muted)">
            <span>© 2026 Aeronexus. All rights reserved.</span>
            <span className="text-hud">v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
