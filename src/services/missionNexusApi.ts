import type {
  MissionNexusSocketMessage,
  VehicleSnapshot,
  VehicleState,
} from "../types/vehicle";

const DEFAULT_API_BASE_URL =
  "http://127.0.0.1:8000";

function removeTrailingSlash(
  value: string,
) {
  return value.replace(
    /\/+$/,
    "",
  );
}

export const MISSIONNEXUS_API_BASE_URL =
  removeTrailingSlash(
    import.meta.env
      .VITE_MISSIONNEXUS_API_URL ||
      DEFAULT_API_BASE_URL,
  );

function buildWebSocketBaseUrl() {
  const explicitUrl =
    import.meta.env
      .VITE_MISSIONNEXUS_WS_URL;

  if (
    explicitUrl
  ) {
    return removeTrailingSlash(
      explicitUrl,
    );
  }

  const apiUrl =
    new URL(
      MISSIONNEXUS_API_BASE_URL,
    );

  apiUrl.protocol =
    apiUrl.protocol ===
    "https:"
      ? "wss:"
      : "ws:";

  return removeTrailingSlash(
    apiUrl.toString(),
  );
}

export const MISSIONNEXUS_WS_BASE_URL =
  buildWebSocketBaseUrl();

export async function fetchVehicleSnapshot(
  signal?: AbortSignal,
): Promise<VehicleSnapshot> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/vehicles`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },

        signal,
      },
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `MissionNexus vehicle request failed with HTTP ${response.status}.`,
    );
  }

  return (
    await response.json()
  ) as VehicleSnapshot;
}

export async function fetchVehicle(
  vehicleId: string,
  signal?: AbortSignal,
): Promise<VehicleState> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/vehicles/${encodeURIComponent(
        vehicleId,
      )}`,
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },

        signal,
      },
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `MissionNexus vehicle ${vehicleId} request failed with HTTP ${response.status}.`,
    );
  }

  return (
    await response.json()
  ) as VehicleState;
}

export function createVehicleWebSocket() {
  return new WebSocket(
    `${MISSIONNEXUS_WS_BASE_URL}/ws/missionnexus/vehicles`,
  );
}

export function parseMissionNexusSocketMessage(
  rawMessage: string,
): MissionNexusSocketMessage | null {
  try {
    const parsed =
      JSON.parse(
        rawMessage,
      ) as unknown;

    if (
      typeof parsed !==
        "object" ||
      parsed ===
        null ||
      !(
        "type" in
        parsed
      )
    ) {
      return null;
    }

    const type =
      (
        parsed as {
          type?: unknown;
        }
      ).type;

    if (
      type ===
      "vehicle_snapshot"
    ) {
      return parsed as VehicleSnapshot;
    }

    if (
      type ===
      "missionnexus_heartbeat"
    ) {
      return parsed as MissionNexusSocketMessage;
    }

    return null;
  } catch {
    return null;
  }
}