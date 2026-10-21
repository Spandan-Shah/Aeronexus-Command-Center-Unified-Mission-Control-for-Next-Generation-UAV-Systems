import {
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Antenna,
  Battery,
  Cable,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Cpu,
  Gauge,
  HardDrive,
  Network,
  Plug,
  Radio,
  RefreshCw,
  Router,
  Satellite,
  Signal,
  Thermometer,
  Unplug,
  Usb,
  Video,
  Wifi,
  Zap,
} from "lucide-react";

import {
  useDeviceConnections,
} from "../hooks/useDeviceConnections";

import type {
  DeviceConnectionOption,
  DevicePairPayload,
  DeviceState,
} from "../types/device";


/* =========================================================
   Helpers
   ========================================================= */

function numberOrDash(
  value:
    number | null | undefined,
  digits = 0,
) {
  if (
    typeof value !==
    "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return "—";
  }

  return value.toFixed(
    digits,
  );
}


function stringFromUnknown(
  value:
    unknown,
  fallback = "—",
) {
  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value,
    );
  }

  return fallback;
}


function statusTone(
  status:
    string,
) {
  switch (
    status.toUpperCase()
  ) {
    case "CONNECTED":
    case "AVAILABLE":
    case "NOMINAL":
    case "HEALTHY":
      return {
        text:
          "text-[#49E58F]",

        border:
          "border-[rgba(73,229,143,0.28)]",

        background:
          "bg-[rgba(73,229,143,0.08)]",

        dot:
          "bg-[#49E58F]",
      };

    case "DEGRADED":
    case "WARNING":
    case "CONNECTING":
      return {
        text:
          "text-[#F6B23C]",

        border:
          "border-[rgba(246,178,60,0.30)]",

        background:
          "bg-[rgba(246,178,60,0.08)]",

        dot:
          "bg-[#F6B23C]",
      };

    case "FAULT":
    case "ERROR":
      return {
        text:
          "text-[#FF5A63]",

        border:
          "border-[rgba(255,90,99,0.30)]",

        background:
          "bg-[rgba(255,90,99,0.08)]",

        dot:
          "bg-[#FF5A63]",
      };

    default:
      return {
        text:
          "text-[#8E99A8]",

        border:
          "border-[#243047]",

        background:
          "bg-[#070A10]",

        dot:
          "bg-[#566174]",
      };
  }
}


/* =========================================================
   Status Badge
   ========================================================= */

function StatusBadge({
  value,
}: {
  value:
    string;
}) {
  const tone =
    statusTone(
      value,
    );

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-[6px] border px-2.5 py-1",

        "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",

        tone.text,
        tone.border,
        tone.background,
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          tone.dot,
        ].join(" ")}
      />

      {value}
    </span>
  );
}


/* =========================================================
   Metric
   ========================================================= */

function MetricCard({
  label,
  value,
  helper,
  icon:
    Icon,
}: {
  label:
    string;

  value:
    string;

  helper:
    string;

  icon:
    typeof Activity;
}) {
  return (
    <div
      className={[
        "min-h-[116px]",

        "rounded-[10px]",

        "border border-[#1D2533]",

        "bg-[#070A10]",

        "p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7F8A99]">
            {label}
          </div>

          <div className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-[#F1F4F7]">
            {value}
          </div>

          <div className="mt-1.5 text-[13px] leading-5 text-[#7F8A99]">
            {helper}
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#243047] bg-[#07111F] text-[#5AA9FF]">
          <Icon
            size={17}
            strokeWidth={1.7}
          />
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   Section
   ========================================================= */

function Section({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow:
    string;

  title:
    string;

  description:
    string;

  children:
    React.ReactNode;

  action?:
    React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-[#1D2533] bg-[#000000]">
      <div className="flex min-h-[82px] items-center justify-between gap-5 border-b border-[#151923] px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#5AA9FF]">
            {eyebrow}
          </div>

          <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[#F1F4F7]">
            {title}
          </h2>

          <p className="mt-1 max-w-[760px] text-[13px] leading-5 text-[#7F8A99]">
            {description}
          </p>
        </div>

        {action ? (
          <div className="shrink-0">
            {action}
          </div>
        ) : null}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}


/* =========================================================
   Connection Option
   ========================================================= */

function ConnectionOptionCard({
  option,
  selected,
  onSelect,
}: {
  option:
    DeviceConnectionOption;

  selected:
    boolean;

  onSelect:
    () => void;
}) {
  const Icon =
    option.transport ===
    "SERIAL"
      ? Usb
      : option.transport ===
          "UDP" ||
        option.transport ===
          "TCP"
        ? Network
        : Cpu;

  return (
    <button
      type="button"
      onClick={
        onSelect
      }
      className={[
        "flex min-h-[132px] w-full flex-col rounded-[9px] border p-4 text-left",

        "transition-[border-color,background-color] duration-150",

        selected
          ? "border-[#35527A] bg-[#07111F]"
          : "border-[#1D2533] bg-[#070A10] hover:border-[#2B394D]",
      ].join(" ")}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[7px] border border-[#243047] bg-[#05080D] text-[#5AA9FF]">
          <Icon
            size={17}
            strokeWidth={1.7}
          />
        </div>

        <StatusBadge
          value={
            option.status
          }
        />
      </div>

      <div className="mt-4 text-[14px] font-semibold text-[#EEF2F6]">
        {option.label}
      </div>

      <div className="mt-1 text-[12px] leading-5 text-[#7F8A99]">
        {option.description}
      </div>

      <div className="mt-auto pt-3 font-mono text-[11px] text-[#647084]">
        {option.transport}
        {" · "}
        {option.protocol}
      </div>
    </button>
  );
}


/* =========================================================
   Diagnostic Cell
   ========================================================= */

function DiagnosticCell({
  label,
  value,
  icon:
    Icon,
}: {
  label:
    string;

  value:
    string;

  icon:
    typeof Activity;
}) {
  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-[8px] border border-[#1D2533] bg-[#070A10] px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-[#243047] bg-[#05080D] text-[#5AA9FF]">
        <Icon
          size={15}
          strokeWidth={1.7}
        />
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
          {label}
        </div>

        <div className="mt-1 truncate font-mono text-[13px] font-semibold text-[#E8EDF2]">
          {value}
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   Paired Device Card
   ========================================================= */

function PairedDeviceCard({
  device,
  busy,
  onDisconnect,
  onReconnect,
}: {
  device:
    DeviceState;

  busy:
    boolean;

  onDisconnect:
    () => void;

  onReconnect:
    () => void;
}) {
  return (
    <div className="rounded-[9px] border border-[#1D2533] bg-[#070A10]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#151923] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#243047] bg-[#07111F] text-[#5AA9FF]">
            <Cpu
              size={18}
              strokeWidth={1.7}
            />
          </div>

          <div>
            <div className="text-[15px] font-semibold text-[#F1F4F7]">
              {device.name}
            </div>

            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#6F7A8A]">
              {device.device_type}
            </div>
          </div>
        </div>

        <StatusBadge
          value={
            device.status
          }
        />
      </div>

      <div className="grid gap-px bg-[#151923] sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Vehicle",
            device.vehicle_id ??
              "—",
          ],

          [
            "Protocol",
            device.protocol,
          ],

          [
            "Transport",
            device.transport,
          ],

          [
            "Health",
            device.healthy
              ? "NOMINAL"
              : "NOT NOMINAL",
          ],
        ].map(
          (
            [
              label,
              value,
            ],
          ) => (
            <div
              key={
                label
              }
              className="bg-[#070A10] px-4 py-3"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                {label}
              </div>

              <div className="mt-1.5 font-mono text-[12px] font-semibold text-[#E5EAF0]">
                {value}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#151923] p-4">
        <div className="text-[12px] text-[#6F7A8A]">
          Device ID{" "}
          <span className="font-mono text-[#AAB3BF]">
            {device.device_id}
          </span>
        </div>

        {device.connected ? (
          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              onDisconnect
            }
            className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[rgba(255,90,99,0.30)] bg-[rgba(255,90,99,0.07)] px-3 text-[12px] font-semibold text-[#FF7B82] transition-colors hover:bg-[rgba(255,90,99,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Unplug
              size={14}
            />

            {busy
              ? "Disconnecting..."
              : "Disconnect"}
          </button>
        ) : (
          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              onReconnect
            }
            className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#35527A] bg-[#07111F] px-3 text-[12px] font-semibold text-[#79B8FF] transition-colors hover:bg-[#0A1728] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={
                busy
                  ? "animate-spin"
                  : ""
              }
            />

            {busy
              ? "Reconnecting..."
              : "Reconnect"}
          </button>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   Hardware Tree Row
   ========================================================= */

function HardwareTreeRow({
  label,
  value,
  icon:
    Icon,
  active = false,
}: {
  label:
    string;

  value:
    string;

  icon:
    typeof Activity;

  active?:
    boolean;
}) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 border-b border-[#151923] px-4 last:border-b-0">
      <ChevronRight
        size={14}
        className="shrink-0 text-[#465166]"
      />

      <Icon
        size={15}
        className={
          active
            ? "text-[#49E58F]"
            : "text-[#627083]"
        }
      />

      <span className="min-w-0 flex-1 text-[13px] font-medium text-[#B9C2CE]">
        {label}
      </span>

      <span
        className={[
          "font-mono text-[11px] font-semibold",

          active
            ? "text-[#49E58F]"
            : "text-[#687487]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}


/* =========================================================
   Page
   ========================================================= */

export function HardwareIntegration() {
  const {
    devices,
    options,
    connectedCount,
    healthyCount,
    activeDevice,
    connectionState,
    error,
    loading,
    pairing,
    actionDeviceId,
    pair,
    disconnect,
    reconnectDevice,
    refresh,
  } =
    useDeviceConnections();

  const [
    selectedConnectionType,
    setSelectedConnectionType,
  ] =
    useState(
      "SIMULATOR",
    );

  const [
    vehicleId,
    setVehicleId,
  ] =
    useState(
      "MN-001-SIM",
    );

  const [
    callsign,
    setCallsign,
  ] =
    useState(
      "MN-001",
    );

  const [
    serialPort,
    setSerialPort,
  ] =
    useState(
      "COM5",
    );

  const [
    baudRate,
    setBaudRate,
  ] =
    useState(
      57600,
    );

  const [
    host,
    setHost,
  ] =
    useState(
      "127.0.0.1",
    );

  const [
    networkPort,
    setNetworkPort,
  ] =
    useState(
      14550,
    );

  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(
      null,
    );


  /* =======================================================
     Selected Option
     ======================================================= */

  const selectedOption =
    useMemo(
      () =>
        options.find(
          (
            option,
          ) =>
            option.connection_type ===
            selectedConnectionType,
        ) ??
        options[
          0
        ] ??
        null,
      [
        options,
        selectedConnectionType,
      ],
    );


  /* =======================================================
     Diagnostics
     ======================================================= */

  const diagnostics =
    activeDevice?.diagnostics;

  const details =
    diagnostics?.details ??
    {};

  const telemetryRate =
    diagnostics?.packets_per_second;

  const overallConnectionStatus =
    activeDevice?.status ??
    connectionState;


  /* =======================================================
     Pair Selected Device
     ======================================================= */

  async function handlePair() {
    if (
      !selectedOption ||
      !selectedOption.supported
    ) {
      return;
    }

    setActionError(
      null,
    );

    const payload:
      DevicePairPayload = {
      connection_type:
        selectedOption.connection_type,

      vehicle_id:
        vehicleId.trim() ||
        "MN-001-SIM",

      callsign:
        callsign.trim() ||
        "MN-001",

      auto_reconnect:
        true,

      metadata: {
        source:
          "MissionNexus Hardware Integration UI",
      },
    };

    if (
      selectedOption.connection_type ===
      "MAVLINK_SERIAL"
    ) {
      payload.serial_port =
        serialPort;

      payload.baud_rate =
        baudRate;
    }

    if (
      selectedOption.connection_type ===
        "MAVLINK_UDP" ||
      selectedOption.connection_type ===
        "MAVLINK_TCP"
    ) {
      payload.host =
        host;

      payload.network_port =
        networkPort;
    }

    try {
      await pair(
        payload,
      );
    } catch (
      pairError
    ) {
      setActionError(
        pairError instanceof
        Error
          ? pairError.message
          : "Unable to pair device.",
      );
    }
  }


  /* =======================================================
     Disconnect
     ======================================================= */

  async function handleDisconnect(
    deviceId:
      string,
  ) {
    setActionError(
      null,
    );

    try {
      await disconnect(
        deviceId,
      );
    } catch (
      disconnectError
    ) {
      setActionError(
        disconnectError instanceof
        Error
          ? disconnectError.message
          : "Unable to disconnect device.",
      );
    }
  }


  /* =======================================================
     Reconnect
     ======================================================= */

  async function handleReconnect(
    deviceId:
      string,
  ) {
    setActionError(
      null,
    );

    try {
      await reconnectDevice(
        deviceId,
      );
    } catch (
      reconnectError
    ) {
      setActionError(
        reconnectError instanceof
        Error
          ? reconnectError.message
          : "Unable to reconnect device.",
      );
    }
  }


  return (
    <div className="min-h-full bg-[#09090B] text-[#EEF2F6]">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
        {/* =================================================
            Page Header
            ================================================= */}

        <div className="rounded-[10px] border border-[#1D2533] bg-[#07111F] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5AA9FF]">
                MissionNexus Systems
              </div>

              <h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-[#F4F6F8]">
                Hardware Integration
              </h1>

              <p className="mt-2 max-w-[840px] text-[14px] leading-6 text-[#8B97A6]">
                Pair aircraft interfaces, inspect connection health,
                manage telemetry sources and prepare MissionNexus for
                real flight-controller and payload hardware.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                value={
                  connectionState
                }
              />

              <button
                type="button"
                onClick={() =>
                  void refresh()
                }
                className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#243047] bg-[#070A10] px-3 text-[12px] font-semibold text-[#AAB4C1] hover:border-[#35527A] hover:bg-[#0A101A] hover:text-[#F0F4F7]"
              >
                <RefreshCw
                  size={14}
                />

                Refresh
              </button>
            </div>
          </div>
        </div>


        {/* =================================================
            Errors
            ================================================= */}

        {error ||
        actionError ? (
          <div className="mt-4 flex items-start gap-3 rounded-[8px] border border-[rgba(255,90,99,0.28)] bg-[rgba(255,90,99,0.07)] px-4 py-3">
            <CircleAlert
              size={17}
              className="mt-0.5 shrink-0 text-[#FF6F78]"
            />

            <div className="text-[13px] leading-5 text-[#E8A1A6]">
              {actionError ??
                error}
            </div>
          </div>
        ) : null}


        {/* =================================================
            Metrics
            ================================================= */}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Vehicle"
            value={
              activeDevice?.vehicle_id ??
              "—"
            }
            helper="Active paired aircraft source"
            icon={
              Radio
            }
          />

          <MetricCard
            label="Connection"
            value={
              overallConnectionStatus
            }
            helper="Current hardware connection state"
            icon={
              Plug
            }
          />

          <MetricCard
            label="Connected Devices"
            value={String(
              connectedCount,
            )}
            helper={`${devices.length} registered device${
              devices.length ===
              1
                ? ""
                : "s"
            }`}
            icon={
              Cpu
            }
          />

          <MetricCard
            label="Healthy Devices"
            value={String(
              healthyCount,
            )}
            helper="Nominal hardware sources"
            icon={
              CheckCircle2
            }
          />

          <MetricCard
            label="Telemetry Rate"
            value={
              telemetryRate !=
              null
                ? `${numberOrDash(
                    telemetryRate,
                    1,
                  )} Hz`
                : "—"
            }
            helper="Current source update rate"
            icon={
              Activity
            }
          />
        </div>


        {/* =================================================
            Connection Manager
            ================================================= */}

        <div className="mt-5">
          <Section
            eyebrow="Connection Manager"
            title="Select Aircraft Connection Source"
            description="Choose how MissionNexus receives aircraft telemetry and manages the hardware connection."
          >
            {loading ? (
              <div className="py-10 text-center text-[13px] text-[#7F8A99]">
                Loading hardware connection options...
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {options.map(
                    (
                      option,
                    ) => (
                      <ConnectionOptionCard
                        key={
                          option.connection_type
                        }
                        option={
                          option
                        }
                        selected={
                          option.connection_type ===
                          selectedConnectionType
                        }
                        onSelect={() =>
                          setSelectedConnectionType(
                            option.connection_type,
                          )
                        }
                      />
                    ),
                  )}
                </div>

                {selectedOption ? (
                  <div className="mt-5 rounded-[9px] border border-[#1D2533] bg-[#070A10] p-4">
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                      <label>
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                          Vehicle ID
                        </span>

                        <input
                          value={
                            vehicleId
                          }
                          onChange={(
                            event,
                          ) =>
                            setVehicleId(
                              event
                                .target
                                .value,
                            )
                          }
                          className="h-10 w-full rounded-[7px] border border-[#243047] bg-[#05080D] px-3 font-mono text-[13px] text-[#E8EDF2] outline-none transition-colors focus:border-[#35527A]"
                        />
                      </label>

                      <label>
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                          Callsign
                        </span>

                        <input
                          value={
                            callsign
                          }
                          onChange={(
                            event,
                          ) =>
                            setCallsign(
                              event
                                .target
                                .value,
                            )
                          }
                          className="h-10 w-full rounded-[7px] border border-[#243047] bg-[#05080D] px-3 font-mono text-[13px] text-[#E8EDF2] outline-none transition-colors focus:border-[#35527A]"
                        />
                      </label>

                      {selectedOption.connection_type ===
                      "MAVLINK_SERIAL" ? (
                        <>
                          <label>
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                              Serial Port
                            </span>

                            <input
                              value={
                                serialPort
                              }
                              onChange={(
                                event,
                              ) =>
                                setSerialPort(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              className="h-10 w-full rounded-[7px] border border-[#243047] bg-[#05080D] px-3 font-mono text-[13px] text-[#E8EDF2] outline-none"
                            />
                          </label>

                          <label>
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                              Baud Rate
                            </span>

                            <select
                              value={
                                baudRate
                              }
                              onChange={(
                                event,
                              ) =>
                                setBaudRate(
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                )
                              }
                              className="h-10 w-full rounded-[7px] border border-[#243047] bg-[#05080D] px-3 font-mono text-[13px] text-[#E8EDF2] outline-none"
                            >
                              <option value="57600">
                                57600
                              </option>

                              <option value="115200">
                                115200
                              </option>

                              <option value="921600">
                                921600
                              </option>
                            </select>
                          </label>
                        </>
                      ) : null}

                      {selectedOption.connection_type ===
                        "MAVLINK_UDP" ||
                      selectedOption.connection_type ===
                        "MAVLINK_TCP" ? (
                        <>
                          <label>
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                              Host
                            </span>

                            <input
                              value={
                                host
                              }
                              onChange={(
                                event,
                              ) =>
                                setHost(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              className="h-10 w-full rounded-[7px] border border-[#243047] bg-[#05080D] px-3 font-mono text-[13px] text-[#E8EDF2] outline-none"
                            />
                          </label>

                          <label>
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                              Network Port
                            </span>

                            <input
                              type="number"
                              value={
                                networkPort
                              }
                              onChange={(
                                event,
                              ) =>
                                setNetworkPort(
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                )
                              }
                              className="h-10 w-full rounded-[7px] border border-[#243047] bg-[#05080D] px-3 font-mono text-[13px] text-[#E8EDF2] outline-none"
                            />
                          </label>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#151923] pt-4">
                      <div className="text-[12px] text-[#748092]">
                        {selectedOption.supported
                          ? "Adapter available. This connection can be paired now."
                          : "Adapter is registered in MissionNexus but will be enabled in the next hardware phase."}
                      </div>

                      <button
                        type="button"
                        disabled={
                          !selectedOption.supported ||
                          pairing
                        }
                        onClick={() =>
                          void handlePair()
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-[7px] border border-[#35527A] bg-[#07111F] px-4 text-[13px] font-semibold text-[#79B8FF] hover:bg-[#0A1728] disabled:cursor-not-allowed disabled:border-[#202937] disabled:bg-[#070A10] disabled:text-[#536074]"
                      >
                        {pairing ? (
                          <RefreshCw
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Cable
                            size={15}
                          />
                        )}

                        {pairing
                          ? "Pairing..."
                          : selectedOption.supported
                            ? "Pair Device"
                            : "Adapter Coming Next"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </Section>
        </div>


        {/* =================================================
            Device + Diagnostics
            ================================================= */}

        <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Section
            eyebrow="Paired Hardware"
            title="Registered Device Connections"
            description="Manage the aircraft interfaces currently assigned to MissionNexus."
          >
            <div className="grid gap-3">
              {devices.length >
              0 ? (
                devices.map(
                  (
                    device,
                  ) => (
                    <PairedDeviceCard
                      key={
                        device.device_id
                      }
                      device={
                        device
                      }
                      busy={
                        actionDeviceId ===
                        device.device_id
                      }
                      onDisconnect={() =>
                        void handleDisconnect(
                          device.device_id,
                        )
                      }
                      onReconnect={() =>
                        void handleReconnect(
                          device.device_id,
                        )
                      }
                    />
                  ),
                )
              ) : (
                <div className="rounded-[8px] border border-dashed border-[#243047] bg-[#070A10] px-5 py-10 text-center">
                  <Unplug
                    size={24}
                    className="mx-auto text-[#4C586A]"
                  />

                  <div className="mt-3 text-[14px] font-semibold text-[#BAC3CF]">
                    No paired hardware
                  </div>

                  <div className="mt-1 text-[12px] text-[#6F7A8A]">
                    Select a supported connection source and pair it above.
                  </div>
                </div>
              )}
            </div>
          </Section>


          <Section
            eyebrow="Live Link"
            title="Connection Diagnostics"
            description="Live transport, heartbeat and aircraft-interface health."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DiagnosticCell
                label="Telemetry Rate"
                value={
                  diagnostics
                    ?.packets_per_second !=
                  null
                    ? `${numberOrDash(
                        diagnostics.packets_per_second,
                        1,
                      )} Hz`
                    : "—"
                }
                icon={
                  Activity
                }
              />

              <DiagnosticCell
                label="Heartbeat"
                value={
                  diagnostics
                    ?.heartbeat_age_ms !=
                  null
                    ? `${numberOrDash(
                        diagnostics.heartbeat_age_ms,
                        0,
                      )} ms`
                    : "—"
                }
                icon={
                  Gauge
                }
              />

              <DiagnosticCell
                label="Signal"
                value={
                  diagnostics
                    ?.rssi_dbm !=
                  null
                    ? `${numberOrDash(
                        diagnostics.rssi_dbm,
                        0,
                      )} dBm`
                    : "—"
                }
                icon={
                  Signal
                }
              />

              <DiagnosticCell
                label="Link Quality"
                value={
                  diagnostics
                    ?.quality_percent !=
                  null
                    ? `${numberOrDash(
                        diagnostics.quality_percent,
                        0,
                      )}%`
                    : "—"
                }
                icon={
                  Wifi
                }
              />

              <DiagnosticCell
                label="Packet Loss"
                value={
                  diagnostics
                    ?.packet_loss_percent !=
                  null
                    ? `${numberOrDash(
                        diagnostics.packet_loss_percent,
                        1,
                      )}%`
                    : "—"
                }
                icon={
                  Network
                }
              />

              <DiagnosticCell
                label="Flight Mode"
                value={
                  stringFromUnknown(
                    details.flight_mode,
                  )
                }
                icon={
                  Radio
                }
              />

              <DiagnosticCell
                label="Armed"
                value={
                  stringFromUnknown(
                    details.armed,
                  )
                }
                icon={
                  Zap
                }
              />

              <DiagnosticCell
                label="System / Component"
                value={`${stringFromUnknown(
                  details.system_id,
                )} / ${stringFromUnknown(
                  details.component_id,
                )}`}
                icon={
                  Cpu
                }
              />
            </div>

            <div className="mt-3 rounded-[8px] border border-[#1D2533] bg-[#070A10] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8A]">
                Aircraft
              </div>

              <div className="mt-1.5 text-[13px] font-medium text-[#DDE3EA]">
                {stringFromUnknown(
                  details.airframe,
                  "No active aircraft hardware source",
                )}
              </div>
            </div>
          </Section>
        </div>


        {/* =================================================
            Hardware Tree
            ================================================= */}

        <div className="mt-5">
          <Section
            eyebrow="Vehicle Architecture"
            title="MN-001 Hardware Tree"
            description="Logical view of the aircraft systems available to MissionNexus. Additional components will become live as sensor and payload adapters are enabled."
          >
            <div className="overflow-hidden rounded-[9px] border border-[#1D2533] bg-[#070A10]">
              <div className="flex min-h-[62px] items-center gap-3 border-b border-[#151923] bg-[#07111F] px-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[#35527A] bg-[#05080D] text-[#5AA9FF]">
                  <Radio
                    size={16}
                  />
                </div>

                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[#EEF2F6]">
                    MN-001
                  </div>

                  <div className="mt-0.5 text-[11px] text-[#6F7A8A]">
                    MissionNexus vehicle hardware architecture
                  </div>
                </div>

                <StatusBadge
                  value={
                    activeDevice?.connected
                      ? "CONNECTED"
                      : "DISCONNECTED"
                  }
                />
              </div>

              <HardwareTreeRow
                label="Flight Controller"
                value={
                  activeDevice?.name ??
                  "Not Assigned"
                }
                icon={
                  Cpu
                }
                active={
                  Boolean(
                    activeDevice?.connected,
                  )
                }
              />

              <HardwareTreeRow
                label="Navigation · GPS / Compass / Barometer"
                value="NEXT PHASE"
                icon={
                  Satellite
                }
              />

              <HardwareTreeRow
                label="Power · Battery Monitor / Power Module"
                value="NEXT PHASE"
                icon={
                  Battery
                }
              />

              <HardwareTreeRow
                label="Propulsion · ESC / Motor Telemetry"
                value="NEXT PHASE"
                icon={
                  Zap
                }
              />

              <HardwareTreeRow
                label="Communications · Telemetry Radio"
                value="NEXT PHASE"
                icon={
                  Antenna
                }
              />

              <HardwareTreeRow
                label="Companion Computer"
                value="NOT ASSIGNED"
                icon={
                  HardDrive
                }
              />

              <HardwareTreeRow
                label="EO Camera"
                value="NOT ASSIGNED"
                icon={
                  Video
                }
              />

              <HardwareTreeRow
                label="Thermal / IR Sensor"
                value="NOT ASSIGNED"
                icon={
                  Thermometer
                }
              />

              <HardwareTreeRow
                label="Payload Sensor Bus"
                value="NOT ASSIGNED"
                icon={
                  Router
                }
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}