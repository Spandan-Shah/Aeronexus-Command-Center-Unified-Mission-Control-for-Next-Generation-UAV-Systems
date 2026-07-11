import { useEffect, useState } from "react";

export type TelemetrySource =
  | "simulator"
  | "esp32_usb"
  | "esp32_wifi"
  | "mavlink"
  | "lora"
  | "camera_ml";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type UnifiedTelemetry = {
  source: TelemetrySource;
  device: string;
  timestamp: string;
  gps?: {
    lat: number;
    lng: number;
  };
  temperature?: number;
  smoke?: number;
  motion?: string;
  tilt?: string;
  altitude?: number;
  speed?: number;
  battery?: number;
  link?: number;
  flightMode?: string;
  ml?: {
    person?: boolean;
    fire?: boolean;
    smoke?: boolean;
    confidence?: number;
  };
  secureSession?: boolean;
  risk?: RiskLevel;
};

export type SourceStatus = {
  source: TelemetrySource;
  connected: boolean;
  lastSeen: string | null;
  packets: number;
  label: string;
};

type TelemetrySourcesResponse = {
  sources: SourceStatus[];
};

const API_BASE_URL = "http://127.0.0.1:8000";

export function useUnifiedTelemetry() {
  const [telemetry, setTelemetry] = useState<UnifiedTelemetry | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTelemetry() {
    try {
      const [telemetryResponse, sourcesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/telemetry/current`),
        fetch(`${API_BASE_URL}/api/telemetry/sources`),
      ]);

      if (!telemetryResponse.ok || !sourcesResponse.ok) {
        throw new Error("Telemetry API request failed");
      }

      const telemetryData =
        (await telemetryResponse.json()) as UnifiedTelemetry;

      const sourcesData =
        (await sourcesResponse.json()) as TelemetrySourcesResponse;

      setTelemetry(telemetryData);
      setSources(sourcesData.sources);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load telemetry"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTelemetry();

    const intervalId = window.setInterval(() => {
      void loadTelemetry();
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    telemetry,
    sources,
    loading,
    error,
    reload: loadTelemetry,
  };
}