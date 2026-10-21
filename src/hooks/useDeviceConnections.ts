import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createDeviceWebSocket,
  disconnectMissionNexusDevice,
  fetchDeviceOptions,
  fetchDeviceSnapshot,
  pairMissionNexusDevice,
  parseDeviceSocketMessage,
  reconnectMissionNexusDevice,
} from "../services/deviceApi";

import type {
  DeviceConnectionOption,
  DeviceConnectionState,
  DevicePairPayload,
  DeviceSnapshot,
  DeviceState,
} from "../types/device";


/* =========================================================
   Constants
   ========================================================= */

const SOCKET_STALE_AFTER_MS =
  3_000;

const SOCKET_DISCONNECTED_AFTER_MS =
  8_000;

const WATCHDOG_INTERVAL_MS =
  1_000;

const MIN_RECONNECT_DELAY_MS =
  1_000;

const MAX_RECONNECT_DELAY_MS =
  8_000;


/* =========================================================
   State
   ========================================================= */

type DeviceConnectionHookState = {
  devices:
    DeviceState[];

  options:
    DeviceConnectionOption[];

  connectionState:
    DeviceConnectionState;

  error:
    string | null;

  lastMessageAt:
    number | null;

  loading:
    boolean;
};

const initialState:
  DeviceConnectionHookState = {
  devices: [],

  options: [],

  connectionState:
    "CONNECTING",

  error:
    null,

  lastMessageAt:
    null,

  loading:
    true,
};


/* =========================================================
   Helpers
   ========================================================= */

function sortDevices(
  devices:
    DeviceState[],
) {
  return [
    ...devices,
  ].sort(
    (
      first,
      second,
    ) =>
      first.device_id.localeCompare(
        second.device_id,
      ),
  );
}


/* =========================================================
   Hook
   ========================================================= */

export function useDeviceConnections() {
  const [
    state,
    setState,
  ] =
    useState<
      DeviceConnectionHookState
    >(
      initialState,
    );

  const [
    actionDeviceId,
    setActionDeviceId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    pairing,
    setPairing,
  ] =
    useState(
      false,
    );

  const socketRef =
    useRef<
      WebSocket | null
    >(
      null,
    );

  const reconnectTimerRef =
    useRef<
      number | null
    >(
      null,
    );

  const reconnectAttemptsRef =
    useRef(
      0,
    );

  const mountedRef =
    useRef(
      false,
    );

  const lastMessageAtRef =
    useRef<
      number | null
    >(
      null,
    );


  /* =======================================================
     Clear Reconnect Timer
     ======================================================= */

  const clearReconnectTimer =
    useCallback(
      () => {
        if (
          reconnectTimerRef.current ===
          null
        ) {
          return;
        }

        window.clearTimeout(
          reconnectTimerRef.current,
        );

        reconnectTimerRef.current =
          null;
      },
      [],
    );


  /* =======================================================
     Apply Snapshot
     ======================================================= */

  const applySnapshot =
    useCallback(
      (
        snapshot:
          DeviceSnapshot,
      ) => {
        const now =
          Date.now();

        lastMessageAtRef.current =
          now;

        setState(
          (
            current,
          ) => ({
            ...current,

            devices:
              sortDevices(
                snapshot.devices,
              ),

            connectionState:
              "CONNECTED",

            error:
              null,

            lastMessageAt:
              now,

            loading:
              false,
          }),
        );
      },
      [],
    );


  /* =======================================================
     REST Bootstrap
     ======================================================= */

  const bootstrapFromRest =
    useCallback(
      async () => {
        const controller =
          new AbortController();

        try {
          const [
            snapshot,
            optionsResponse,
          ] =
            await Promise.all(
              [
                fetchDeviceSnapshot(
                  controller.signal,
                ),

                fetchDeviceOptions(
                  controller.signal,
                ),
              ],
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const now =
            Date.now();

          lastMessageAtRef.current =
            now;

          setState(
            {
              devices:
                sortDevices(
                  snapshot.devices,
                ),

              options:
                optionsResponse.options,

              connectionState:
                "CONNECTED",

              error:
                null,

              lastMessageAt:
                now,

              loading:
                false,
            },
          );
        } catch (
          error
        ) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          const message =
            error instanceof
            Error
              ? error.message
              : "MissionNexus hardware bootstrap failed.";

          setState(
            (
              current,
            ) => ({
              ...current,

              connectionState:
                current.devices.length >
                0
                  ? "DEGRADED"
                  : "DISCONNECTED",

              error:
                message,

              loading:
                false,
            }),
          );
        }

        return () =>
          controller.abort();
      },
      [],
    );


  /* =======================================================
     WebSocket Reconnection
     ======================================================= */

  const connectRef =
    useRef<
      () => void
    >(
      () => undefined,
    );

  const scheduleReconnect =
    useCallback(
      () => {
        if (
          !mountedRef.current ||
          reconnectTimerRef.current !==
            null
        ) {
          return;
        }

        const attempt =
          reconnectAttemptsRef.current;

        const delay =
          Math.min(
            MIN_RECONNECT_DELAY_MS *
              2 **
                attempt,
            MAX_RECONNECT_DELAY_MS,
          );

        reconnectAttemptsRef.current +=
          1;

        reconnectTimerRef.current =
          window.setTimeout(
            () => {
              reconnectTimerRef.current =
                null;

              connectRef.current();
            },
            delay,
          );
      },
      [],
    );


  /* =======================================================
     Connect WebSocket
     ======================================================= */

  const connect =
    useCallback(
      () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        clearReconnectTimer();

        const existingSocket =
          socketRef.current;

        if (
          existingSocket &&
          (
            existingSocket.readyState ===
              WebSocket.CONNECTING ||
            existingSocket.readyState ===
              WebSocket.OPEN
          )
        ) {
          return;
        }

        setState(
          (
            current,
          ) => ({
            ...current,

            connectionState:
              current.devices.length >
              0
                ? "DEGRADED"
                : "CONNECTING",
          }),
        );

        let socket:
          WebSocket;

        try {
          socket =
            createDeviceWebSocket();
        } catch (
          error
        ) {
          const message =
            error instanceof
            Error
              ? error.message
              : "Unable to create MissionNexus hardware WebSocket.";

          setState(
            (
              current,
            ) => ({
              ...current,

              connectionState:
                "DISCONNECTED",

              error:
                message,
            }),
          );

          scheduleReconnect();

          return;
        }

        socketRef.current =
          socket;

        socket.onopen =
          () => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            reconnectAttemptsRef.current =
              0;

            const now =
              Date.now();

            lastMessageAtRef.current =
              now;

            setState(
              (
                current,
              ) => ({
                ...current,

                connectionState:
                  "CONNECTED",

                error:
                  null,

                lastMessageAt:
                  now,
              }),
            );
          };

        socket.onmessage =
          (
            event,
          ) => {
            if (
              !mountedRef.current ||
              typeof event.data !==
                "string"
            ) {
              return;
            }

            const snapshot =
              parseDeviceSocketMessage(
                event.data,
              );

            if (
              !snapshot
            ) {
              return;
            }

            applySnapshot(
              snapshot,
            );
          };

        socket.onerror =
          () => {
            if (
              !mountedRef.current
            ) {
              return;
            }

            setState(
              (
                current,
              ) => ({
                ...current,

                connectionState:
                  current.devices.length >
                  0
                    ? "DEGRADED"
                    : "DISCONNECTED",

                error:
                  "MissionNexus hardware WebSocket error.",
              }),
            );
          };

        socket.onclose =
          () => {
            if (
              socketRef.current ===
              socket
            ) {
              socketRef.current =
                null;
            }

            if (
              !mountedRef.current
            ) {
              return;
            }

            setState(
              (
                current,
              ) => ({
                ...current,

                connectionState:
                  current.devices.length >
                  0
                    ? "DEGRADED"
                    : "DISCONNECTED",

                error:
                  "MissionNexus hardware stream disconnected.",
              }),
            );

            scheduleReconnect();
          };
      },
      [
        applySnapshot,
        clearReconnectTimer,
        scheduleReconnect,
      ],
    );

  connectRef.current =
    connect;


  /* =======================================================
     Lifecycle
     ======================================================= */

  useEffect(
    () => {
      mountedRef.current =
        true;

      void bootstrapFromRest();

      connect();

      const watchdog =
        window.setInterval(
          () => {
            const lastMessageAt =
              lastMessageAtRef.current;

            if (
              !lastMessageAt
            ) {
              return;
            }

            const age =
              Date.now() -
              lastMessageAt;

            if (
              age >=
              SOCKET_DISCONNECTED_AFTER_MS
            ) {
              setState(
                (
                  current,
                ) => ({
                  ...current,

                  connectionState:
                    "DISCONNECTED",

                  error:
                    "MissionNexus hardware heartbeat timed out.",
                }),
              );

              return;
            }

            if (
              age >=
              SOCKET_STALE_AFTER_MS
            ) {
              setState(
                (
                  current,
                ) => ({
                  ...current,

                  connectionState:
                    "DEGRADED",
                }),
              );
            }
          },
          WATCHDOG_INTERVAL_MS,
        );

      return () => {
        mountedRef.current =
          false;

        window.clearInterval(
          watchdog,
        );

        clearReconnectTimer();

        const socket =
          socketRef.current;

        socketRef.current =
          null;

        if (
          socket
        ) {
          socket.onopen =
            null;

          socket.onmessage =
            null;

          socket.onerror =
            null;

          socket.onclose =
            null;

          socket.close();
        }
      };
    },
    [
      bootstrapFromRest,
      clearReconnectTimer,
      connect,
    ],
  );


  /* =======================================================
     Refresh
     ======================================================= */

  const refresh =
    useCallback(
      async () => {
        try {
          const [
            snapshot,
            optionsResponse,
          ] =
            await Promise.all(
              [
                fetchDeviceSnapshot(),
                fetchDeviceOptions(),
              ],
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setState(
            (
              current,
            ) => ({
              ...current,

              devices:
                sortDevices(
                  snapshot.devices,
                ),

              options:
                optionsResponse.options,

              error:
                null,

              loading:
                false,
            }),
          );
        } catch (
          error
        ) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          const message =
            error instanceof
            Error
              ? error.message
              : "Unable to refresh MissionNexus hardware.";

          setState(
            (
              current,
            ) => ({
              ...current,

              error:
                message,
            }),
          );
        }
      },
      [],
    );


  /* =======================================================
     Pair
     ======================================================= */

  const pair =
    useCallback(
      async (
        payload:
          DevicePairPayload,
      ) => {
        setPairing(
          true,
        );

        try {
          await (
            pairMissionNexusDevice(
              payload,
            )
          );

          await refresh();
        } finally {
          setPairing(
            false,
          );
        }
      },
      [
        refresh,
      ],
    );


  /* =======================================================
     Disconnect
     ======================================================= */

  const disconnect =
    useCallback(
      async (
        deviceId:
          string,
      ) => {
        setActionDeviceId(
          deviceId,
        );

        try {
          await (
            disconnectMissionNexusDevice(
              deviceId,
            )
          );

          await refresh();
        } finally {
          setActionDeviceId(
            null,
          );
        }
      },
      [
        refresh,
      ],
    );


  /* =======================================================
     Reconnect Device
     ======================================================= */

  const reconnectDevice =
    useCallback(
      async (
        deviceId:
          string,
      ) => {
        setActionDeviceId(
          deviceId,
        );

        try {
          await (
            reconnectMissionNexusDevice(
              deviceId,
            )
          );

          await refresh();
        } finally {
          setActionDeviceId(
            null,
          );
        }
      },
      [
        refresh,
      ],
    );


  /* =======================================================
     Active Device
     ======================================================= */

  const activeDevice =
    useMemo(
      () =>
        state.devices.find(
          (
            device,
          ) =>
            device.connected,
        ) ??
        state.devices[
          0
        ] ??
        null,
      [
        state.devices,
      ],
    );


  /* =======================================================
     Counts
     ======================================================= */

  const connectedCount =
    useMemo(
      () =>
        state.devices.filter(
          (
            device,
          ) =>
            device.connected,
        ).length,
      [
        state.devices,
      ],
    );

  const healthyCount =
    useMemo(
      () =>
        state.devices.filter(
          (
            device,
          ) =>
            device.healthy,
        ).length,
      [
        state.devices,
      ],
    );


  return {
    devices:
      state.devices,

    options:
      state.options,

    deviceCount:
      state.devices.length,

    connectedCount,

    healthyCount,

    activeDevice,

    connectionState:
      state.connectionState,

    error:
      state.error,

    loading:
      state.loading,

    lastMessageAt:
      state.lastMessageAt,

    pairing,

    actionDeviceId,

    pair,

    disconnect,

    reconnectDevice,

    refresh,
  };
}