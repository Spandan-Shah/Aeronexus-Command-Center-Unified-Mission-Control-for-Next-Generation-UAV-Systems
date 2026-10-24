#include <Arduino.h>
#include <WiFi.h>

#include <ArduinoJson.h>

#include <esp_now.h>
#include <esp_wifi.h>

#include <mbedtls/base64.h>

#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

#include <cstring>


// ============================================================
// Aeronexus / GoblinWisp
// Aircraft ESP32-S3 ESP-NOW Node
// ============================================================
//
// Architecture:
//
//   MissionNexus / Windows
//           |
//           | CH340 / UART0
//           |
//           v
//   Ground ESP32-S3
//           |
//           | ESP-NOW channel 1
//           |
//           v
//   Aircraft ESP32-S3
//           |
//           +-- future sensors
//           +-- future MAVLink
//           +-- future companion computer
//
// This firmware implements the AIRCRAFT-SIDE PHYSICAL
// ESP-NOW transport node.
//
// It does NOT implement:
//
//   GoblinWisp trusted enrollment
//   identity authentication
//   authenticated key establishment
//   session key derivation
//   encryption
//   directional cryptographic contexts
//   nonce management
//   replay protection
//   rekey
//
// Those belong to the future GoblinWisp security layer.
//
// ============================================================


// ============================================================
// Firmware Identity
// ============================================================

static constexpr char kFirmwareName[] =
    "Aeronexus GoblinWisp Aircraft Node";

static constexpr char kFirmwareVersion[] =
    "0.1.0";

static constexpr char kHardwareName[] =
    "ESP32-S3";


// ============================================================
// GoblinWisp Node Identity
// ============================================================

static constexpr char kAircraftNodeId[] =
    "GW-MN001";

static constexpr char kGroundNodeId[] =
    "GW-GROUND-001";


// ============================================================
// Local Serial Diagnostic Protocol
// ============================================================
//
// This is only the Aircraft board's local UART debug protocol.
// It is not the GoblinWisp cryptographic protocol.
//
// ============================================================

static constexpr char kAircraftDiagnosticProtocol[] =
    "GW-ESPNOW-AIRCRAFT";

static constexpr uint8_t kAircraftDiagnosticProtocolVersion =
    1;


// ============================================================
// ESP-NOW Air-Link Payload Protocol
// ============================================================
//
// The Ground bridge treats ESP-NOW payload bytes as transport
// payloads and forwards them to MissionNexus.
//
// This lightweight JSON heartbeat exists only to:
//
//   1. announce GW-MN001
//   2. cause Ground to learn the Aircraft MAC
//   3. keep physical air-link health current
//   4. provide an application-level sequence counter
//
// It is NOT authenticated and is NOT a secure GoblinWisp
// session packet.
//
// ============================================================

static constexpr char kAirLinkProtocol[] =
    "GW-ESPNOW-AIRLINK";

static constexpr uint8_t kAirLinkProtocolVersion =
    1;


// ============================================================
// Serial Configuration
// ============================================================

static constexpr uint32_t kSerialBaud =
    115200;


// ============================================================
// ESP-NOW Configuration
// ============================================================
//
// MUST match Ground ESP32-S3.
//
// ============================================================

static constexpr uint8_t kEspNowChannel =
    1;


// ============================================================
// Heartbeat Timing
// ============================================================
//
// Ground currently considers the air link stale after 5000 ms.
//
// A 1000 ms heartbeat provides multiple opportunities for a
// packet to arrive before Ground declares the link offline.
//
// ============================================================

static constexpr uint32_t kHeartbeatIntervalMs =
    1000;

static constexpr uint32_t kLocalStatusIntervalMs =
    5000;


// ============================================================
// Broadcast Address
// ============================================================
//
// Aircraft broadcasts while it has not yet received a packet
// from Ground.
//
// The Ground firmware learns the real Aircraft source MAC from
// the received ESP-NOW metadata.
//
// ============================================================

static const uint8_t kBroadcastMac[6] = {
    0xFF,
    0xFF,
    0xFF,
    0xFF,
    0xFF,
    0xFF,
};


// ============================================================
// ESP-NOW RX Queue
// ============================================================
//
// Keep the Wi-Fi receive callback minimal.
//
// Wi-Fi callback
//      ↓
// FreeRTOS queue
//      ↓
// Arduino loop()
//      ↓
// processing / serial diagnostics
//
// ============================================================

struct EspNowRxFrame {
    uint8_t sourceMac[6];

    int length;
    int rssi;

    uint8_t payload[
        ESP_NOW_MAX_DATA_LEN
    ];
};


static constexpr size_t kRxQueueDepth =
    16;

static QueueHandle_t gRxQueue =
    nullptr;


// ============================================================
// Runtime State
// ============================================================

static bool gEspNowInitialized =
    false;

static bool gAircraftReady =
    false;

static bool gGroundPeerKnown =
    false;

static uint8_t gGroundPeerMac[6] = {
    0,
    0,
    0,
    0,
    0,
    0,
};

static uint32_t gLastGroundRxMs =
    0;

static int gLastGroundRssiDbm =
    0;

static uint32_t gLastHeartbeatMs =
    0;

static uint32_t gLastLocalStatusMs =
    0;

static uint64_t gHeartbeatSequence =
    0;

static uint64_t gPacketsTransmitted =
    0;

static uint64_t gTransmitFailures =
    0;

static uint64_t gPacketsReceived =
    0;

static uint64_t gDroppedRxFrames =
    0;


// ============================================================
// Forward Declarations
// ============================================================

static void sendLocalLog(
    const char *message
);

static void sendLocalError(
    const char *message,
    const char *code = nullptr
);

static void sendReadyFrame();

static void sendStatusFrame();

static bool initializeEspNow();

static bool addPeer(
    const uint8_t *macAddress
);

static bool learnGroundPeer(
    const uint8_t *macAddress
);

static void sendHeartbeatIfDue();

static bool sendHeartbeat();

static void processEspNowRxQueue();

static void handleEspNowPayload(
    const EspNowRxFrame &frame
);

static String formatMac(
    const uint8_t *macAddress
);

static int calculateQualityPercent(
    int rssiDbm
);


// ============================================================
// Serial JSON Helper
// ============================================================

static void sendSerialJson(
    JsonDocument &document
) {
    serializeJson(
        document,
        Serial
    );

    Serial.write(
        '\n'
    );
}


// ============================================================
// Local LOG
// ============================================================

static void sendLocalLog(
    const char *message
) {
    JsonDocument document;

    document["protocol"] =
        kAircraftDiagnosticProtocol;

    document["version"] =
        kAircraftDiagnosticProtocolVersion;

    document["type"] =
        "LOG";

    document["message"] =
        message;

    document["uptime_ms"] =
        millis();

    sendSerialJson(
        document
    );
}


// ============================================================
// Local ERROR
// ============================================================

static void sendLocalError(
    const char *message,
    const char *code
) {
    JsonDocument document;

    document["protocol"] =
        kAircraftDiagnosticProtocol;

    document["version"] =
        kAircraftDiagnosticProtocolVersion;

    document["type"] =
        "ERROR";

    document["message"] =
        message;

    if (
        code != nullptr
        && strlen(code) > 0
    ) {
        document["code"] =
            code;
    }

    document["uptime_ms"] =
        millis();

    sendSerialJson(
        document
    );
}


// ============================================================
// READY
// ============================================================

static void sendReadyFrame() {
    JsonDocument document;

    document["protocol"] =
        kAircraftDiagnosticProtocol;

    document["version"] =
        kAircraftDiagnosticProtocolVersion;

    document["type"] =
        "READY";

    document["hardware"] =
        kHardwareName;

    document["firmware"] =
        kFirmwareName;

    document["firmware_version"] =
        kFirmwareVersion;

    document["node_id"] =
        kAircraftNodeId;

    document["ground_node_id"] =
        kGroundNodeId;

    document["aircraft_ready"] =
        gAircraftReady;

    document["espnow_initialized"] =
        gEspNowInitialized;

    document["channel"] =
        kEspNowChannel;

    document["aircraft_mac"] =
        WiFi.macAddress();

    document["ground_peer_known"] =
        gGroundPeerKnown;

    if (
        gGroundPeerKnown
    ) {
        document["ground_mac"] =
            formatMac(
                gGroundPeerMac
            );
    }
    else {
        document["ground_mac"] =
            nullptr;
    }

    document["uptime_ms"] =
        millis();

    sendSerialJson(
        document
    );
}


// ============================================================
// STATUS
// ============================================================

static void sendStatusFrame() {
    JsonDocument document;

    document["protocol"] =
        kAircraftDiagnosticProtocol;

    document["version"] =
        kAircraftDiagnosticProtocolVersion;

    document["type"] =
        "STATUS";

    document["node_id"] =
        kAircraftNodeId;

    document["aircraft_ready"] =
        gAircraftReady;

    document["espnow_initialized"] =
        gEspNowInitialized;

    document["channel"] =
        kEspNowChannel;

    document["aircraft_mac"] =
        WiFi.macAddress();

    document["ground_peer_known"] =
        gGroundPeerKnown;

    if (
        gGroundPeerKnown
    ) {
        document["ground_mac"] =
            formatMac(
                gGroundPeerMac
            );
    }
    else {
        document["ground_mac"] =
            nullptr;
    }

    if (
        gLastGroundRxMs != 0
    ) {
        document["last_ground_rx_age_ms"] =
            millis() - gLastGroundRxMs;

        document["last_ground_rssi_dbm"] =
            gLastGroundRssiDbm;

        document["ground_quality_percent"] =
            calculateQualityPercent(
                gLastGroundRssiDbm
            );
    }
    else {
        document["last_ground_rx_age_ms"] =
            nullptr;

        document["last_ground_rssi_dbm"] =
            nullptr;

        document["ground_quality_percent"] =
            nullptr;
    }

    document["heartbeat_sequence"] =
        gHeartbeatSequence;

    document["packets_transmitted"] =
        gPacketsTransmitted;

    document["transmit_failures"] =
        gTransmitFailures;

    document["packets_received"] =
        gPacketsReceived;

    document["dropped_rx_frames"] =
        gDroppedRxFrames;

    document["uptime_ms"] =
        millis();

    sendSerialJson(
        document
    );
}


// ============================================================
// ESP-NOW Receive Callback
// ============================================================
//
// Do not serialize JSON or write Serial output here.
//
// ============================================================

static void onEspNowReceive(
    const esp_now_recv_info_t *info,
    const uint8_t *data,
    int length
) {
    if (
        info == nullptr
        || data == nullptr
        || length <= 0
    ) {
        return;
    }

    if (
        length >
        static_cast<int>(
            ESP_NOW_MAX_DATA_LEN
        )
    ) {
        ++gDroppedRxFrames;

        return;
    }

    if (
        gRxQueue == nullptr
    ) {
        ++gDroppedRxFrames;

        return;
    }

    EspNowRxFrame frame{};

    memcpy(
        frame.sourceMac,
        info->src_addr,
        6
    );

    frame.length =
        length;

    frame.rssi =
        0;

    if (
        info->rx_ctrl != nullptr
    ) {
        frame.rssi =
            info->rx_ctrl->rssi;
    }

    memcpy(
        frame.payload,
        data,
        static_cast<size_t>(
            length
        )
    );

    BaseType_t result =
        xQueueSend(
            gRxQueue,
            &frame,
            0
        );

    if (
        result != pdTRUE
    ) {
        ++gDroppedRxFrames;
    }
}


// ============================================================
// Add ESP-NOW Peer
// ============================================================

static bool addPeer(
    const uint8_t *macAddress
) {
    if (
        macAddress == nullptr
    ) {
        return false;
    }

    if (
        esp_now_is_peer_exist(
            macAddress
        )
    ) {
        return true;
    }

    esp_now_peer_info_t peerInfo{};

    memcpy(
        peerInfo.peer_addr,
        macAddress,
        6
    );

    peerInfo.channel =
        kEspNowChannel;

    peerInfo.ifidx =
        WIFI_IF_STA;

    peerInfo.encrypt =
        false;

    esp_err_t result =
        esp_now_add_peer(
            &peerInfo
        );

    return (
        result == ESP_OK
    );
}


// ============================================================
// Learn Ground Peer
// ============================================================
//
// This is transport-level MAC learning only.
//
// It is NOT GoblinWisp trust enrollment.
//
// ============================================================

static bool learnGroundPeer(
    const uint8_t *macAddress
) {
    if (
        macAddress == nullptr
    ) {
        return false;
    }

    if (
        memcmp(
            macAddress,
            kBroadcastMac,
            6
        ) == 0
    ) {
        return false;
    }

    if (
        !addPeer(
            macAddress
        )
    ) {
        return false;
    }

    bool changed =
        !gGroundPeerKnown
        || memcmp(
            gGroundPeerMac,
            macAddress,
            6
        ) != 0;

    memcpy(
        gGroundPeerMac,
        macAddress,
        6
    );

    gGroundPeerKnown =
        true;

    if (
        changed
    ) {
        sendLocalLog(
            "Ground ESP-NOW peer learned"
        );
    }

    return true;
}


// ============================================================
// ESP-NOW Initialization
// ============================================================

static bool initializeEspNow() {
    WiFi.mode(
        WIFI_STA
    );

    WiFi.disconnect();

    delay(
        100
    );

    esp_err_t powerSaveResult =
        esp_wifi_set_ps(
            WIFI_PS_NONE
        );

    if (
        powerSaveResult != ESP_OK
    ) {
        sendLocalLog(
            "Unable to disable Wi-Fi power saving"
        );
    }

    esp_err_t channelResult =
        esp_wifi_set_channel(
            kEspNowChannel,
            WIFI_SECOND_CHAN_NONE
        );

    if (
        channelResult != ESP_OK
    ) {
        sendLocalError(
            "Failed to configure ESP-NOW Wi-Fi channel",
            "ESPNOW_CHANNEL_FAILED"
        );

        return false;
    }

    esp_err_t initResult =
        esp_now_init();

    if (
        initResult != ESP_OK
    ) {
        sendLocalError(
            "Failed to initialize ESP-NOW",
            "ESPNOW_INIT_FAILED"
        );

        return false;
    }

    esp_err_t callbackResult =
        esp_now_register_recv_cb(
            onEspNowReceive
        );

    if (
        callbackResult != ESP_OK
    ) {
        sendLocalError(
            "Failed to register ESP-NOW receive callback",
            "ESPNOW_CALLBACK_FAILED"
        );

        esp_now_deinit();

        return false;
    }

    if (
        !addPeer(
            kBroadcastMac
        )
    ) {
        sendLocalError(
            "Failed to register ESP-NOW broadcast peer",
            "ESPNOW_BROADCAST_PEER_FAILED"
        );

        esp_now_deinit();

        return false;
    }

    return true;
}


// ============================================================
// Heartbeat
// ============================================================

static bool sendHeartbeat() {
    if (
        !gEspNowInitialized
    ) {
        return false;
    }

    JsonDocument heartbeat;

    heartbeat["protocol"] =
        kAirLinkProtocol;

    heartbeat["version"] =
        kAirLinkProtocolVersion;

    heartbeat["type"] =
        "HEARTBEAT";

    heartbeat["source_node_id"] =
        kAircraftNodeId;

    heartbeat["destination_node_id"] =
        kGroundNodeId;

    heartbeat["role"] =
        "AIRCRAFT";

    heartbeat["sequence"] =
        gHeartbeatSequence + 1;

    heartbeat["uptime_ms"] =
        millis();

    heartbeat["channel"] =
        kEspNowChannel;

    char payload[
        ESP_NOW_MAX_DATA_LEN
    ];

    size_t payloadLength =
        serializeJson(
            heartbeat,
            payload,
            sizeof(payload)
        );

    if (
        payloadLength == 0
        || payloadLength >=
            sizeof(payload)
    ) {
        ++gTransmitFailures;

        sendLocalError(
            "Heartbeat payload exceeded ESP-NOW payload buffer",
            "HEARTBEAT_SERIALIZE_FAILED"
        );

        return false;
    }

    const uint8_t *destination =
        gGroundPeerKnown
            ? gGroundPeerMac
            : kBroadcastMac;

    esp_err_t result =
        esp_now_send(
            destination,
            reinterpret_cast<
                const uint8_t *
            >(
                payload
            ),
            payloadLength
        );

    if (
        result != ESP_OK
    ) {
        ++gTransmitFailures;

        return false;
    }

    ++gHeartbeatSequence;
    ++gPacketsTransmitted;

    return true;
}


// ============================================================
// Timed Heartbeat
// ============================================================

static void sendHeartbeatIfDue() {
    uint32_t now =
        millis();

    if (
        gLastHeartbeatMs != 0
        && (
            now - gLastHeartbeatMs
        ) < kHeartbeatIntervalMs
    ) {
        return;
    }

    gLastHeartbeatMs =
        now;

    if (
        !sendHeartbeat()
    ) {
        // Avoid printing an error every second if the radio
        // enters a temporary degraded state.
        if (
            (
                gTransmitFailures
                % 5
            ) == 1
        ) {
            sendLocalError(
                "ESP-NOW heartbeat transmission failed",
                "HEARTBEAT_TX_FAILED"
            );
        }
    }
}


// ============================================================
// Received Ground Payload
// ============================================================

static void handleEspNowPayload(
    const EspNowRxFrame &frame
) {
    if (
        frame.length <= 0
    ) {
        return;
    }

    if (
        !learnGroundPeer(
            frame.sourceMac
        )
    ) {
        sendLocalLog(
            "Received ESP-NOW packet but could not learn Ground peer"
        );
    }

    gLastGroundRxMs =
        millis();

    gLastGroundRssiDbm =
        frame.rssi;

    ++gPacketsReceived;

    constexpr size_t kBase64BufferSize =
        (
            (
                ESP_NOW_MAX_DATA_LEN
                + 2
            )
            / 3
        )
        * 4
        + 1;

    unsigned char base64Buffer[
        kBase64BufferSize
    ];

    size_t base64Length =
        0;

    int encodeResult =
        mbedtls_base64_encode(
            base64Buffer,
            sizeof(base64Buffer),
            &base64Length,
            frame.payload,
            static_cast<size_t>(
                frame.length
            )
        );

    if (
        encodeResult != 0
        || base64Length >=
            sizeof(base64Buffer)
    ) {
        sendLocalError(
            "Failed to encode received Ground payload",
            "RX_BASE64_FAILED"
        );

        return;
    }

    base64Buffer[
        base64Length
    ] = '\0';

    JsonDocument document;

    document["protocol"] =
        kAircraftDiagnosticProtocol;

    document["version"] =
        kAircraftDiagnosticProtocolVersion;

    document["type"] =
        "DATA_RX";

    document["source_node_id"] =
        kGroundNodeId;

    document["destination_node_id"] =
        kAircraftNodeId;

    document["source_mac"] =
        formatMac(
            frame.sourceMac
        );

    document["rssi_dbm"] =
        frame.rssi;

    document["quality_percent"] =
        calculateQualityPercent(
            frame.rssi
        );

    document["channel"] =
        kEspNowChannel;

    document["payload_base64"] =
        reinterpret_cast<
            const char *
        >(
            base64Buffer
        );

    document["uptime_ms"] =
        millis();

    sendSerialJson(
        document
    );
}


// ============================================================
// Process ESP-NOW RX Queue
// ============================================================

static void processEspNowRxQueue() {
    if (
        gRxQueue == nullptr
    ) {
        return;
    }

    EspNowRxFrame frame{};

    while (
        xQueueReceive(
            gRxQueue,
            &frame,
            0
        )
        == pdTRUE
    ) {
        handleEspNowPayload(
            frame
        );
    }
}


// ============================================================
// MAC Formatting
// ============================================================

static String formatMac(
    const uint8_t *macAddress
) {
    if (
        macAddress == nullptr
    ) {
        return String();
    }

    char buffer[18];

    snprintf(
        buffer,
        sizeof(buffer),
        "%02X:%02X:%02X:%02X:%02X:%02X",
        macAddress[0],
        macAddress[1],
        macAddress[2],
        macAddress[3],
        macAddress[4],
        macAddress[5]
    );

    return String(
        buffer
    );
}


// ============================================================
// RSSI → Approximate Diagnostic Quality
// ============================================================
//
// Diagnostic/UI estimate only.
//
// It is NOT packet-delivery quality and has no security
// significance.
//
// ============================================================

static int calculateQualityPercent(
    int rssiDbm
) {
    if (
        rssiDbm <= -100
    ) {
        return 0;
    }

    if (
        rssiDbm >= -50
    ) {
        return 100;
    }

    return (
        2 * (
            rssiDbm + 100
        )
    );
}


// ============================================================
// Arduino setup()
// ============================================================

void setup() {
    // --------------------------------------------------------
    // UART0 / CH340 Serial Debug
    // --------------------------------------------------------

    Serial.begin(
        kSerialBaud
    );

    delay(
        150
    );

    // --------------------------------------------------------
    // ESP-NOW Receive Queue
    // --------------------------------------------------------

    gRxQueue =
        xQueueCreate(
            kRxQueueDepth,
            sizeof(
                EspNowRxFrame
            )
        );

    if (
        gRxQueue == nullptr
    ) {
        sendLocalError(
            "Failed to allocate ESP-NOW receive queue",
            "RX_QUEUE_FAILED"
        );

        gAircraftReady =
            false;

        return;
    }

    // --------------------------------------------------------
    // ESP-NOW
    // --------------------------------------------------------

    gEspNowInitialized =
        initializeEspNow();

    gAircraftReady =
        gEspNowInitialized;

    if (
        !gEspNowInitialized
    ) {
        sendLocalError(
            "GoblinWisp Aircraft Node started without ESP-NOW",
            "AIRCRAFT_DEGRADED"
        );

        return;
    }

    // --------------------------------------------------------
    // Startup Announcement
    // --------------------------------------------------------

    sendLocalLog(
        "GoblinWisp Aircraft ESP32-S3 node started"
    );

    sendReadyFrame();

    sendLocalLog(
        "ESP-NOW discovery heartbeat enabled"
    );

    // Send the first heartbeat immediately from loop().
    gLastHeartbeatMs =
        0;

    gLastLocalStatusMs =
        millis();
}


// ============================================================
// Arduino loop()
// ============================================================

void loop() {
    processEspNowRxQueue();

    sendHeartbeatIfDue();

    uint32_t now =
        millis();

    if (
        (
            now - gLastLocalStatusMs
        ) >= kLocalStatusIntervalMs
    ) {
        gLastLocalStatusMs =
            now;

        sendStatusFrame();
    }

    delay(
        1
    );
}