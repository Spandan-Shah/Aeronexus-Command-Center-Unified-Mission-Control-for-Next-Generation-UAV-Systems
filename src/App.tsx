import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { PageId } from "./data/navigation";
import { Fleet } from "./pages/Fleet";
import { DroneHealth } from "./pages/DroneHealth";
import { LiveOps } from "./pages/LiveOps";
import { BatteryPower } from "./pages/BatteryPower";
import { MissionPlanner } from "./pages/MissionPlanner";
import { CameraAI } from "./pages/CameraAI";
import { PreFlight } from "./pages/PreFlight";
import { LogsDebrief } from "./pages/LogsDebrief";
import { Maintenance } from "./pages/Maintenance";
import { Inventory } from "./pages/Inventory";
import { Security } from "./pages/Security";
import { DashboardSettings } from "./pages/DashboardSettings";

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