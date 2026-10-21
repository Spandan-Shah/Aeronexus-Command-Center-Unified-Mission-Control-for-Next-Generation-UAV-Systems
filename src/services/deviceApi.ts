import {
  MISSIONNEXUS_API_BASE_URL,
  MISSIONNEXUS_WS_BASE_URL,
} from "./missionNexusApi";

import type {
  DeviceActionResponse,
  DeviceOptionsResponse,
  DevicePairPayload,
  DeviceSnapshot,
  DeviceState,
} from "../types/device";


/* =========================================================
   Response Helper
   ========================================================= */

async function readJsonResponse<T>(
  response: Response,
): Promise<T> {
  if (
    response.ok
  ) {
    return (
      await response.json()
    ) as T;
  }

  let detail =
    `HTTP ${response.status}`;

  try {
    const body =
      await response.json() as {
        detail?: unknown;
      };

    if (
      typeof body.detail ===
      "string"
    ) {
      detail =
        body.detail;
    }
  } catch {
    // Keep fallback HTTP status message.
  }

  throw new Error(
    detail,
  );
}


/* =========================================================
   Device Options
   ========================================================= */

export async function fetchDeviceOptions(
  signal?: AbortSignal,
): Promise<DeviceOptionsResponse> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/devices/options`,
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

  return readJsonResponse<
    DeviceOptionsResponse
  >(
    response,
  );
}


/* =========================================================
   Device Snapshot
   ========================================================= */

export async function fetchDeviceSnapshot(
  signal?: AbortSignal,
): Promise<DeviceSnapshot> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/devices`,
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

  return readJsonResponse<
    DeviceSnapshot
  >(
    response,
  );
}


/* =========================================================
   Individual Device
   ========================================================= */

export async function fetchDevice(
  deviceId: string,
  signal?: AbortSignal,
): Promise<DeviceState> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/devices/${encodeURIComponent(
        deviceId,
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

  return readJsonResponse<
    DeviceState
  >(
    response,
  );
}


/* =========================================================
   Pair Device
   ========================================================= */

export async function pairMissionNexusDevice(
  payload:
    DevicePairPayload,
): Promise<DeviceActionResponse> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/devices/pair`,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

  return readJsonResponse<
    DeviceActionResponse
  >(
    response,
  );
}


/* =========================================================
   Disconnect Device
   ========================================================= */

export async function disconnectMissionNexusDevice(
  deviceId: string,
): Promise<DeviceActionResponse> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/devices/${encodeURIComponent(
        deviceId,
      )}/disconnect`,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  return readJsonResponse<
    DeviceActionResponse
  >(
    response,
  );
}


/* =========================================================
   Reconnect Device
   ========================================================= */

export async function reconnectMissionNexusDevice(
  deviceId: string,
): Promise<DeviceActionResponse> {
  const response =
    await fetch(
      `${MISSIONNEXUS_API_BASE_URL}/api/missionnexus/devices/${encodeURIComponent(
        deviceId,
      )}/reconnect`,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  return readJsonResponse<
    DeviceActionResponse
  >(
    response,
  );
}


/* =========================================================
   Device WebSocket
   ========================================================= */

export function createDeviceWebSocket() {
  return new WebSocket(
    `${MISSIONNEXUS_WS_BASE_URL}/ws/missionnexus/devices`,
  );
}


/* =========================================================
   Device WebSocket Parser
   ========================================================= */

export function parseDeviceSocketMessage(
  rawMessage: string,
): DeviceSnapshot | null {
  try {
    const parsed =
      JSON.parse(
        rawMessage,
      ) as unknown;

    if (
      typeof parsed !==
        "object" ||
      parsed ===
        null
    ) {
      return null;
    }

    if (
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
      type !==
      "device_snapshot"
    ) {
      return null;
    }

    return (
      parsed as DeviceSnapshot
    );
  } catch {
    return null;
  }
}