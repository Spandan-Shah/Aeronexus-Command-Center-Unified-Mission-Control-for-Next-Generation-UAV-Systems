import {
  Battery,
  Gauge,
  Mountain,
  Navigation,
  Radio,
  Satellite,
  ShieldCheck,
  Thermometer,
} from "lucide-react";

import {
  telemetry as fallbackTelemetry,
} from "../../data/telemetry";

import {
  useUnifiedTelemetry,
} from "../../hooks/useUnifiedTelemetry";

import {
  MissionMetric,
} from "../ui/mission";

import type {
  MissionTone,
} from "../ui/mission";

/* =========================================================
   MissionNexus V2
   Telemetry Grid

   Purpose:
   - unified live / fallback telemetry presentation
   - MissionNexus semantic status colors
   - compact GeoFusion-family information density
   - no legacy generic MetricCard dependency
   ========================================================= */

/* =========================================================
   Helpers
   ========================================================= */

function roundValue(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value *
        10,
    ) / 10
  );
}

/* =========================================================
   Battery
   ========================================================= */

function getBatteryTone(
  battery: number,
): MissionTone {
  if (
    battery <= 20
  ) {
    return "critical";
  }

  if (
    battery <= 40
  ) {
    return "caution";
  }

  return "nominal";
}

/* =========================================================
   Live Link Quality
   ========================================================= */

function getLinkQualityTone(
  quality: number,
): MissionTone {
  if (
    quality <= 45
  ) {
    return "critical";
  }

  if (
    quality <= 70
  ) {
    return "caution";
  }

  return "nominal";
}

/* =========================================================
   RSSI

   RSSI is not a percentage.

   Less-negative values represent stronger signal.
   ========================================================= */

function getRssiTone(
  rssi: number,
): MissionTone {
  if (
    rssi <= -85
  ) {
    return "critical";
  }

  if (
    rssi <= -72
  ) {
    return "caution";
  }

  return "nominal";
}

/* =========================================================
   Temperature
   ========================================================= */

function getTemperatureTone(
  temperature: number,
): MissionTone {
  if (
    temperature >= 70
  ) {
    return "critical";
  }

  if (
    temperature >= 55
  ) {
    return "caution";
  }

  return "nominal";
}

/* =========================================================
   Risk
   ========================================================= */

function getRiskTone(
  risk: string,
): MissionTone {
  const normalized =
    risk.toLowerCase();

  if (
    normalized ===
      "critical" ||
    normalized ===
      "high"
  ) {
    return "critical";
  }

  if (
    normalized ===
    "medium"
  ) {
    return "caution";
  }

  if (
    normalized ===
    "low"
  ) {
    return "nominal";
  }

  return "muted";
}

/* =========================================================
   Main Component
   ========================================================= */

export function TelemetryGrid() {
  const {
    telemetry,
  } =
    useUnifiedTelemetry();

  const hasLiveTelemetry =
    telemetry !== null &&
    telemetry !== undefined;

  /* =======================================================
     Aircraft Telemetry
     ======================================================= */

  const battery =
    roundValue(
      telemetry?.battery ??
        fallbackTelemetry.battery,
    );

  const altitude =
    roundValue(
      telemetry?.altitude ??
        fallbackTelemetry.altitude,
    );

  const speed =
    roundValue(
      telemetry?.speed ??
        fallbackTelemetry.speed,
    );

  /*
   * Unified telemetry currently does not expose heading,
   * so MissionNexus retains the shared aircraft fallback
   * heading until that field is supplied by the backend.
   */
  const heading =
    roundValue(
      fallbackTelemetry.heading,
    );

  const temperature =
    roundValue(
      telemetry?.temperature ??
        fallbackTelemetry.escTemp,
    );

  /* =======================================================
     Navigation
     ======================================================= */

  const gpsLocked =
    hasLiveTelemetry
      ? Boolean(
          telemetry?.gps,
        )
      : fallbackTelemetry
          .gpsSatellites >=
        4;

  const gpsValue =
    hasLiveTelemetry
      ? gpsLocked
        ? "LOCK"
        : "SEARCH"
      : fallbackTelemetry
          .gpsSatellites;

  const gpsUnit =
    hasLiveTelemetry
      ? undefined
      : "SAT";

  /* =======================================================
     Communications

     Live unified telemetry:
       percentage quality.

     Shared fallback telemetry:
       real RSSI in dBm.

     We deliberately keep those two measurement systems
     separate rather than converting RSSI with Math.abs().
     ======================================================= */

  const linkValue =
    hasLiveTelemetry
      ? roundValue(
          telemetry?.link ??
            fallbackTelemetry
              .linkQuality,
        )
      : roundValue(
          fallbackTelemetry.rssi,
        );

  const linkUnit =
    hasLiveTelemetry
      ? "%"
      : "dBm";

  const linkLabel =
    hasLiveTelemetry
      ? "Link Quality"
      : "Link RSSI";

  const linkTone:
    MissionTone =
    hasLiveTelemetry
      ? getLinkQualityTone(
          linkValue,
        )
      : getRssiTone(
          linkValue,
        );

  /* =======================================================
     Mission Risk
     ======================================================= */

  const risk =
    (
      telemetry?.risk ??
      fallbackTelemetry.risk ??
      "low"
    ).toLowerCase();

  const riskTone =
    getRiskTone(
      risk,
    );

  /* =======================================================
     UI
     ======================================================= */

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {/* Battery */}

      <MissionMetric
        label="Battery"
        value={
          battery
        }
        unit="%"
        icon={
          Battery
        }
        tone={
          getBatteryTone(
            battery,
          )
        }
        helper={
          battery <= 20
            ? "Immediate power attention"
            : battery <= 40
              ? "Reserve threshold approaching"
              : "Power state nominal"
        }
        compact
      />

      {/* Altitude */}

      <MissionMetric
        label="Altitude"
        value={
          altitude
        }
        unit="m"
        icon={
          Mountain
        }
        tone="info"
        helper="Aircraft altitude"
        compact
      />

      {/* Speed */}

      <MissionMetric
        label="Ground Speed"
        value={
          speed
        }
        unit="m/s"
        icon={
          Gauge
        }
        tone="default"
        helper="Current velocity"
        compact
      />

      {/* Heading */}

      <MissionMetric
        label="Heading"
        value={
          heading
        }
        unit="°"
        icon={
          Navigation
        }
        tone="default"
        helper="Aircraft bearing"
        compact
      />

      {/* GPS */}

      <MissionMetric
        label="Navigation"
        value={
          gpsValue
        }
        unit={
          gpsUnit
        }
        icon={
          Satellite
        }
        tone={
          gpsLocked
            ? "nominal"
            : "caution"
        }
        helper={
          hasLiveTelemetry
            ? gpsLocked
              ? "GPS position locked"
              : "Acquiring navigation lock"
            : `${fallbackTelemetry.gpsSatellites} satellites available`
        }
        compact
      />

      {/* Link */}

      <MissionMetric
        label={
          linkLabel
        }
        value={
          linkValue
        }
        unit={
          linkUnit
        }
        icon={
          Radio
        }
        tone={
          linkTone
        }
        helper={
          hasLiveTelemetry
            ? "Unified telemetry channel"
            : "Fallback radio signal"
        }
        compact
      />

      {/* Thermal */}

      <MissionMetric
        label="Sensor Thermal"
        value={
          temperature
        }
        unit="°C"
        icon={
          Thermometer
        }
        tone={
          getTemperatureTone(
            temperature,
          )
        }
        helper={
          temperature >= 70
            ? "Thermal limit exceeded"
            : temperature >= 55
              ? "Temperature under watch"
              : "Thermal state nominal"
        }
        compact
      />

      {/* Risk */}

      <MissionMetric
        label="Mission Risk"
        value={
          risk.toUpperCase()
        }
        icon={
          ShieldCheck
        }
        tone={
          riskTone
        }
        helper="Current operational assessment"
        compact
        valueClassName="text-[15px]"
      />
    </div>
  );
}