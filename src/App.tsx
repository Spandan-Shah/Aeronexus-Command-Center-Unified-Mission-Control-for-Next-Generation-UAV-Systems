import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { PageId } from "./data/navigation";
import { BatteryPower } from "./pages/BatteryPower";
import { CameraAI } from "./pages/CameraAI";
import { DashboardSettings } from "./pages/DashboardSettings";
import { DroneHealth } from "./pages/DroneHealth";
import { Fleet } from "./pages/Fleet";
import { Inventory } from "./pages/Inventory";
import { LiveOps } from "./pages/LiveOps";
import { LogsDebrief } from "./pages/LogsDebrief";
import { Maintenance } from "./pages/Maintenance";
import { MissionPlanner } from "./pages/MissionPlanner";
import { PreFlight } from "./pages/PreFlight";
import { Security } from "./pages/Security";

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
    <>
      <AppShell activePage={activePage} onPageChange={setActivePage}>
        {renderPage(activePage)}
      </AppShell>

      {activePage === "mission-planner" && <SimulatorControlDock />}
    </>
  );
}

export default App;