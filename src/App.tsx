import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { PageId } from "./data/navigation";
import { Fleet } from "./pages/Fleet";
import { LiveOps } from "./pages/LiveOps";
import { MissionPlanner } from "./pages/MissionPlanner";
import {
  BatteryPower,
  CameraAI,
  DashboardSettings,
  DroneHealth,
  Inventory,
  LogsDebrief,
  Maintenance,
  PreFlight,
  Security,
} from "./pages/PlaceholderPages";

function renderPage(activePage: PageId) {
  switch (activePage) {
    case "live-ops":
      return <LiveOps />;
    case "mission-planner":
      return <MissionPlanner />;
    case "fleet":
      return <Fleet />;
    case "drone-health":
      return <DroneHealth />;
    case "battery":
      return <BatteryPower />;
    case "camera-ai":
      return <CameraAI />;
    case "pre-flight":
      return <PreFlight />;
    case "logs":
      return <LogsDebrief />;
    case "maintenance":
      return <Maintenance />;
    case "inventory":
      return <Inventory />;
    case "security":
      return <Security />;
    case "settings":
      return <DashboardSettings />;
    default:
      return <LiveOps />;
  }
}

function App() {
  const [activePage, setActivePage] = useState<PageId>("live-ops");

  return (
    <AppShell activePage={activePage} onPageChange={setActivePage}>
      {renderPage(activePage)}
    </AppShell>
  );
}

export default App;