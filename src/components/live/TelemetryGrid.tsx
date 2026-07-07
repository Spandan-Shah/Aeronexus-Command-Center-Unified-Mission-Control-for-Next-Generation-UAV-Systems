import {
  Battery,
  Gauge,
  Mountain,
  Navigation,
  Radio,
  Satellite,
  Thermometer,
} from "lucide-react";
import { telemetry } from "../../data/telemetry";
import { MetricCard } from "../common/MetricCard";

export function TelemetryGrid() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
      <MetricCard
        label="Battery"
        value={telemetry.battery}
        unit="%"
        icon={Battery}
        status="nominal"
      />
      <MetricCard
        label="Altitude"
        value={telemetry.altitude}
        unit="m"
        icon={Mountain}
        status="info"
      />
      <MetricCard
        label="Speed"
        value={telemetry.speed}
        unit="m/s"
        icon={Gauge}
        status="info"
      />
      <MetricCard
        label="Heading"
        value={telemetry.heading}
        unit="°"
        icon={Navigation}
        status="info"
      />
      <MetricCard
        label="GPS"
        value={telemetry.gpsSatellites}
        unit="sats"
        icon={Satellite}
        status="nominal"
      />
      <MetricCard
        label="Link RSSI"
        value={telemetry.rssi}
        unit="dBm"
        icon={Radio}
        status="caution"
      />
      <MetricCard
        label="ESC Temp"
        value={telemetry.escTemp}
        unit="°C"
        icon={Thermometer}
        status="nominal"
      />
    </div>
  );
}