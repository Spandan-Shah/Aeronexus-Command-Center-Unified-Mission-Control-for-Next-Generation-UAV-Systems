import {
  Battery,
  Camera,
  ClipboardCheck,
  FileText,
  Gauge,
  Map,
  Package,
  Plane,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PagePlaceholder } from "../components/common/PagePlaceholder";
import { pageDetails } from "../data/navigation";

export function MissionPlanner() {
  return (
    <PagePlaceholder
      title={pageDetails["mission-planner"].title}
      subtitle={pageDetails["mission-planner"].subtitle}
      icon={Map}
      features={[
        "Waypoint list",
        "Altitude control",
        "Geofence boundary",
        "Home and rally points",
        "Mission save and upload",
        "Mission summary",
      ]}
    />
  );
}

export function Fleet() {
  return (
    <PagePlaceholder
      title={pageDetails.fleet.title}
      subtitle={pageDetails.fleet.subtitle}
      icon={Plane}
      features={[
        "Drone cards",
        "Battery and link status",
        "Firmware version",
        "Mission assignment",
        "Readiness status",
        "Maintenance state",
      ]}
    />
  );
}

export function DroneHealth() {
  return (
    <PagePlaceholder
      title={pageDetails["drone-health"].title}
      subtitle={pageDetails["drone-health"].subtitle}
      icon={Gauge}
      features={[
        "Motor status",
        "ESC temperature",
        "IMU status",
        "GPS status",
        "Compass status",
        "Vibration level",
      ]}
    />
  );
}

export function BatteryPower() {
  return (
    <PagePlaceholder
      title={pageDetails.battery.title}
      subtitle={pageDetails.battery.subtitle}
      icon={Battery}
      features={[
        "Battery percentage",
        "Voltage monitor",
        "Current draw",
        "Estimated flight time",
        "Battery health",
        "Charging status",
      ]}
    />
  );
}

export function CameraAI() {
  return (
    <PagePlaceholder
      title={pageDetails["camera-ai"].title}
      subtitle={pageDetails["camera-ai"].subtitle}
      icon={Camera}
      features={[
        "Live camera view",
        "Detection boxes",
        "Object event ledger",
        "Model pipeline",
        "Snapshot button",
        "Recording status",
      ]}
    />
  );
}

export function PreFlight() {
  return (
    <PagePlaceholder
      title={pageDetails["pre-flight"].title}
      subtitle={pageDetails["pre-flight"].subtitle}
      icon={ClipboardCheck}
      features={[
        "Battery check",
        "Propeller check",
        "GPS lock",
        "Compass calibration",
        "Home point set",
        "Mission upload check",
      ]}
    />
  );
}

export function LogsDebrief() {
  return (
    <PagePlaceholder
      title={pageDetails.logs.title}
      subtitle={pageDetails.logs.subtitle}
      icon={FileText}
      features={[
        "Flight summary",
        "Event timeline",
        "Alert history",
        "Battery usage",
        "Distance covered",
        "Report export",
      ]}
    />
  );
}

export function Maintenance() {
  return (
    <PagePlaceholder
      title={pageDetails.maintenance.title}
      subtitle={pageDetails.maintenance.subtitle}
      icon={Wrench}
      features={[
        "Motor runtime",
        "Propeller status",
        "Frame condition",
        "Sensor calibration",
        "Battery service",
        "Next maintenance reminder",
      ]}
    />
  );
}

export function Inventory() {
  return (
    <PagePlaceholder
      title={pageDetails.inventory.title}
      subtitle={pageDetails.inventory.subtitle}
      icon={Package}
      features={[
        "Frame",
        "Flight controller",
        "Motors and ESC",
        "Propellers",
        "Battery",
        "Receiver and camera",
      ]}
    />
  );
}

export function Security() {
  return (
    <PagePlaceholder
      title={pageDetails.security.title}
      subtitle={pageDetails.security.subtitle}
      icon={ShieldCheck}
      features={[
        "Operator roles",
        "Command audit trail",
        "Signed command status",
        "Session authentication",
        "Encrypted logs",
        "Failed login attempts",
      ]}
    />
  );
}

export function DashboardSettings() {
  return (
    <PagePlaceholder
      title={pageDetails.settings.title}
      subtitle={pageDetails.settings.subtitle}
      icon={Settings}
      features={[
        "MAVLink endpoint",
        "Simulator mode",
        "Map settings",
        "Safety thresholds",
        "Battery warnings",
        "Theme settings",
      ]}
    />
  );
}