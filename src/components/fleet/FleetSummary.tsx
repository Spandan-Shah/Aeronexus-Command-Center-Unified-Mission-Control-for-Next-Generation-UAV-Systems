import { Battery, Plane, Radio, Wrench } from "lucide-react";
import { drones } from "../../data/drones";
import { MetricCard } from "../common/MetricCard";

export function FleetSummary() {
  const totalDrones = drones.length;
  const activeDrones = drones.filter((drone) =>
    ["IN_MISSION", "READY", "STANDBY"].includes(drone.status)
  ).length;
  const averageBattery = Math.round(
    drones.reduce((sum, drone) => sum + drone.battery, 0) / totalDrones
  );
  const linkedDrones = drones.filter((drone) => drone.linkQuality > 0).length;
  const maintenanceDrones = drones.filter(
    (drone) => drone.status === "MAINTENANCE"
  ).length;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total Drones"
        value={totalDrones}
        unit="units"
        icon={Plane}
        status="info"
      />

      <MetricCard
        label="Active"
        value={activeDrones}
        unit="ready"
        icon={Radio}
        status="nominal"
      />

      <MetricCard
        label="Avg Battery"
        value={averageBattery}
        unit="%"
        icon={Battery}
        status={averageBattery < 50 ? "caution" : "nominal"}
      />

      <MetricCard
        label="Maintenance"
        value={maintenanceDrones}
        unit="units"
        icon={Wrench}
        status={maintenanceDrones > 0 ? "critical" : "nominal"}
      />

      <div className="hidden">{linkedDrones}</div>
    </div>
  );
}