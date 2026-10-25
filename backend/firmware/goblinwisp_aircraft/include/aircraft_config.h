#pragma once

// -----------------------------------------------------------------------------
// Local physical authorization
// -----------------------------------------------------------------------------

// ESP32-S3 DevKitC-1 BOOT button is GPIO0.
// Trust enrollment/reset is accepted only while this pin is held LOW.
#define AERONEXUS_LOCAL_AUTHORIZE_PIN 0

// -----------------------------------------------------------------------------
// MissionNexus / GoblinWisp transport routing
// -----------------------------------------------------------------------------

// Stable transport routing tag for the MissionNexus host.
// This is NOT a cryptographic identity and must never be used as an
// authentication secret.
#define AERONEXUS_HOST_LINK_TAG_0 0x02
#define AERONEXUS_HOST_LINK_TAG_1 0x47
#define AERONEXUS_HOST_LINK_TAG_2 0x57
#define AERONEXUS_HOST_LINK_TAG_3 0xA1
#define AERONEXUS_HOST_LINK_TAG_4 0x00
#define AERONEXUS_HOST_LINK_TAG_5 0x01

// -----------------------------------------------------------------------------
// Flight-controller MAVLink receive-only interface
// -----------------------------------------------------------------------------

// UART0 / Serial:
//     USB provisioning/debug console.
//
// UART2 / Serial2:
//     GoblinWisp wired transport.
//     RX GPIO16 / TX GPIO17.
//
// UART1:
//     Flight-controller MAVLink receive-only interface.
//
// GPIO18 is exposed on ESP32-S3 DevKitC-1 and is the native U1RXD-capable pin.
// The FC TX line will eventually connect to GPIO18.
//
// IMPORTANT:
// No ESP32 TX pin is assigned to the FC interface in this stage.
#define AERONEXUS_FC_MAVLINK_RX_PIN 18

// Initial telemetry-port baud.
//
// 57600 is only the software default for bench integration.
// Before physically connecting the FC we will verify the exact configured
// telemetry baud of the actual flight-controller port.
#define AERONEXUS_FC_MAVLINK_BAUD 57600

// ESP-IDF UART driver RX ring buffer.
#define AERONEXUS_FC_MAVLINK_RX_BUFFER_SIZE 2048

// Limit GoblinWisp FC telemetry publishing so DEVICE_HEALTH, ACKs,
// handshake/rekey traffic and retransmission logic retain bandwidth.
#define AERONEXUS_FC_MAVLINK_PUBLISH_GAP_MS 120

// HEARTBEAT older than this means the FC link is considered offline.
#define AERONEXUS_FC_MAVLINK_HEARTBEAT_TIMEOUT_MS 3000