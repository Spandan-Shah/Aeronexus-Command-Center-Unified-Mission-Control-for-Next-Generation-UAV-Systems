import {
  Battery,
  Gauge,
  Mountain,
  Navigation,
  Radio,
  Satellite,
  Thermometer,
} from "lucide-react";
import { telemetry as fallbackTelemetry } from "../../data/telemetry";
import { useUnifiedTelemetry } from "../../hooks/useUnifiedTelemetry";
import { MetricCard } from "../common/MetricCard";

function getBatteryStatus(battery: number) {
  if (battery <= 20) return "critical";
  if (battery <= 40) return "caution";
  return "nominal";
}

function getLinkStatus(link: number) {
  if (link <= 45) return "critical";
  if (link <= 70) return "caution";
  return "nominal";
}

function getTemperatureStatus(temperature: number) {
  if (temperature >= 60) return "critical";
  if (temperature >= 45) return "caution";
  return "nominal";
}

function getRiskStatus(risk?: string) {
  if (risk === "critical") return "critical";
  if (risk === "high") return "caution";
  if (risk === "medium") return "info";
  return "nominal";
}

function roundValue(value: number) {
  return Math.round(value * 10) / 10;
}

export function TelemetryGrid() {
  const { telemetry } = useUnifiedTelemetry();

  const battery = roundValue(telemetry?.battery ?? fallbackTelemetry.battery);
  const altitude = roundValue(telemetry?.altitude ?? fallbackTelemetry.altitude);
  const speed = roundValue(telemetry?.speed ?? fallbackTelemetry.speed);
  const heading = fallbackTelemetry.heading;
  const gpsStatus = telemetry?.gps ? "LOCK" : fallbackTelemetry.gpsSatellites;
  const link = roundValue(telemetry?.link ?? Math.abs(fallbackTelemetry.rssi));
  const temperature = roundValue(
    telemetry?.temperature ?? fallbackTelemetry.escTemp
  );

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
      <MetricCard
        label="Battery"
        value={battery}
        unit="%"
        icon={Battery}
        status={getBatteryStatus(battery)}
      />

      <MetricCard
        label="Altitude"
        value={altitude}
        unit="m"
        icon={Mountain}
        status="info"
      />

      <MetricCard
        label="Speed"
        value={speed}
        unit="m/s"
        icon={Gauge}
        status="info"
      />

      <MetricCard
        label="Heading"
        value={heading}
        unit="°"
        icon={Navigation}
        status="info"
      />

      <MetricCard
        label="GPS"
        value={gpsStatus}
        unit={telemetry?.gps ? "" : "sats"}
        icon={Satellite}
        status={telemetry?.gps ? "nominal" : "caution"}
      />

      <MetricCard
        label={telemetry ? "Link Quality" : "Link RSSI"}
        value={link}
        unit={telemetry ? "%" : "dBm"}
        icon={Radio}
        status={getLinkStatus(link)}
      />

      <MetricCard
        label="Sensor Temp"
        value={temperature}
        unit="°C"
        icon={Thermometer}
        status={getTemperatureStatus(temperature)}
      />

      <MetricCard
        label="Risk Level"
        value={(telemetry?.risk ?? "low").toUpperCase()}
        icon={Gauge}
        status={getRiskStatus(telemetry?.risk)}
      />
    </div>
  );
}