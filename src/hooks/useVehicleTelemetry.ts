import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createVehicleWebSocket,
  fetchVehicleSnapshot,
  parseMissionNexusSocketMessage,
} from "../services/missionNexusApi";

import type {
  MissionNexusConnectionState,
  VehicleSnapshot,
  VehicleState,
} from "../types/vehicle";

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

type VehicleTelemetryState = {
  vehicles:
    VehicleState[];

  connectionState:
    MissionNexusConnectionState;

  error:
    string | null;

  lastMessageAt:
    number | null;
};

const initialState:
  VehicleTelemetryState = {
  vehicles: [],

  connectionState:
    "CONNECTING",

  error:
    null,

  lastMessageAt:
    null,
};

function sortVehicles(
  vehicles:
    VehicleState[],
) {
  return [
    ...vehicles,
  ].sort(
    (
      first,
      second,
    ) =>
      first.vehicle_id.localeCompare(
        second.vehicle_id,
      ),
  );
}

export function useVehicleTelemetry(
  preferredVehicleId?: string,
) {
  const [
    state,
    setState,
  ] =
    useState<VehicleTelemetryState>(
      initialState,
    );

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] =
    useState<
      string | null
    >(
      preferredVehicleId ??
        null,
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

  const applySnapshot =
    useCallback(
      (
        snapshot:
          VehicleSnapshot,
      ) => {
        const now =
          Date.now();

        lastMessageAtRef.current =
          now;

        const vehicles =
          sortVehicles(
            snapshot.vehicles,
          );

        setState(
          {
            vehicles,

            connectionState:
              "CONNECTED",

            error:
              null,

            lastMessageAt:
              now,
          },
        );

        setSelectedVehicleId(
          (
            currentVehicleId,
          ) => {
            if (
              currentVehicleId &&
              vehicles.some(
                (
                  vehicle,
                ) =>
                  vehicle.vehicle_id ===
                  currentVehicleId,
              )
            ) {
              return currentVehicleId;
            }

            if (
              preferredVehicleId &&
              vehicles.some(
                (
                  vehicle,
                ) =>
                  vehicle.vehicle_id ===
                  preferredVehicleId,
              )
            ) {
              return preferredVehicleId;
            }

            const connectedVehicle =
              vehicles.find(
                (
                  vehicle,
                ) =>
                  vehicle.connected,
              );

            return (
              connectedVehicle?.vehicle_id ??
              vehicles[
                0
              ]?.vehicle_id ??
              null
            );
          },
        );
      },
      [
        preferredVehicleId,
      ],
    );

  const bootstrapFromRest =
    useCallback(
      async () => {
        const controller =
          new AbortController();

        try {
          const snapshot =
            await fetchVehicleSnapshot(
              controller.signal,
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          applySnapshot(
            snapshot,
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
              : "MissionNexus telemetry bootstrap failed.";

          setState(
            (
              current,
            ) => ({
              ...current,

              connectionState:
                current.vehicles.length >
                0
                  ? "DEGRADED"
                  : "DISCONNECTED",

              error:
                message,
            }),
          );
        }

        return () =>
          controller.abort();
      },
      [
        applySnapshot,
      ],
    );

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
              current.vehicles.length >
              0
                ? "DEGRADED"
                : "CONNECTING",
          }),
        );

        let socket:
          WebSocket;

        try {
          socket =
            createVehicleWebSocket();
        } catch (
          error
        ) {
          const message =
            error instanceof
            Error
              ? error.message
              : "Unable to create MissionNexus WebSocket.";

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

            const message =
              parseMissionNexusSocketMessage(
                event.data,
              );

            if (
              !message
            ) {
              return;
            }

            const now =
              Date.now();

            lastMessageAtRef.current =
              now;

            if (
              message.type ===
              "vehicle_snapshot"
            ) {
              applySnapshot(
                message,
              );

              return;
            }

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
                  current.vehicles.length >
                  0
                    ? "DEGRADED"
                    : "DISCONNECTED",

                error:
                  "MissionNexus WebSocket connection error.",
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
                  current.vehicles.length >
                  0
                    ? "DEGRADED"
                    : "DISCONNECTED",

                error:
                  "MissionNexus vehicle stream disconnected.",
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
                    "MissionNexus telemetry heartbeat timed out.",
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

  const activeVehicle =
    useMemo(
      () => {
        if (
          state.vehicles.length ===
          0
        ) {
          return null;
        }

        if (
          selectedVehicleId
        ) {
          const selected =
            state.vehicles.find(
              (
                vehicle,
              ) =>
                vehicle.vehicle_id ===
                selectedVehicleId,
            );

          if (
            selected
          ) {
            return selected;
          }
        }

        return (
          state.vehicles.find(
            (
              vehicle,
            ) =>
              vehicle.connected,
          ) ??
          state.vehicles[
            0
          ] ??
          null
        );
      },
      [
        selectedVehicleId,
        state.vehicles,
      ],
    );

  const reconnect =
    useCallback(
      () => {
        reconnectAttemptsRef.current =
          0;

        clearReconnectTimer();

        const socket =
          socketRef.current;

        socketRef.current =
          null;

        if (
          socket
        ) {
          socket.close();
        }

        void bootstrapFromRest();

        connect();
      },
      [
        bootstrapFromRest,
        clearReconnectTimer,
        connect,
      ],
    );

  return {
    vehicles:
      state.vehicles,

    vehicleCount:
      state.vehicles.length,

    activeVehicle,

    activeVehicleId:
      activeVehicle?.vehicle_id ??
      null,

    selectedVehicleId,

    setSelectedVehicleId,

    connectionState:
      state.connectionState,

    connected:
      state.connectionState ===
      "CONNECTED",

    error:
      state.error,

    lastMessageAt:
      state.lastMessageAt,

    reconnect,
  };
}