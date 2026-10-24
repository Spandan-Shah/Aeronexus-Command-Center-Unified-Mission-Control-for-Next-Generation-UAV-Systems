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
// Ground ESP32-S3 ESP-NOW Bridge
// ============================================================
//
// Architecture:
//
//   MissionNexus / Windows
//           |
//           | Native USB Serial/JTAG
//           |
//           v
//   Ground ESP32-S3
//           |
//           | ESP-NOW
//           |
//           v
//   Aircraft ESP32-S3
//
// This firmware implements the PHYSICAL TRANSPORT BRIDGE.
//
// It does NOT implement:
//
//   GoblinWisp identity authentication
//   authenticated key establishment
//   session key derivation
//   encryption
//   nonce management
//   replay protection
//
// Those belong to the future GoblinWisp security layer.
//
// ============================================================


// ============================================================
// Firmware Identity
// ============================================================

static constexpr char kFirmwareName[] =
    "Aeronexus GoblinWisp Ground Bridge";

static constexpr char kFirmwareVersion[] =
    "0.1.0";

static constexpr char kHardwareName[] =
    "ESP32-S3";

static constexpr char kBridgeProtocol[] =
    "GW-ESPNOW-BRIDGE";

static constexpr uint8_t kBridgeProtocolVersion =
    1;


// ============================================================
// GoblinWisp Node Identity
// ============================================================

static constexpr char kGroundNodeId[] =
    "GW-GROUND-001";

static constexpr char kAircraftNodeId[] =
    "GW-MN001";


// ============================================================
// Serial Configuration
// ============================================================

static constexpr uint32_t kSerialBaud =
    115200;

static constexpr size_t kMaxSerialLineLength =
    4096;


// ============================================================
// ESP-NOW Configuration
// ============================================================
//
// Both Ground and Aircraft firmware must ultimately operate
// on the same Wi-Fi channel.
//
// Channel 1 is our initial development channel.
// ============================================================

static constexpr uint8_t kEspNowChannel =
    1;


// ============================================================
// Air-Link Health
// ============================================================
//
// Aircraft firmware will eventually send periodic traffic /
// heartbeat messages.
//
// If Ground sees nothing from Aircraft for this interval,
// MissionNexus should not claim the air link is connected.
// ============================================================

static constexpr uint32_t kAirLinkTimeoutMs =
    5000;


// ============================================================
// ESP-NOW Broadcast Address
// ============================================================
//
// Used only as a transport-level discovery mechanism.
//
// Once an Aircraft ESP32-S3 packet is received, Ground learns
// its MAC address and switches subsequent transmission to
// that learned peer.
//
// GoblinWisp authentication will happen ABOVE this transport
// mechanism later.
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
// Never perform JSON serialization or Serial output directly
// inside the Wi-Fi callback.
//
// Instead:
//
//   Wi-Fi callback
//       ↓
//   FreeRTOS queue
//       ↓
//   Arduino loop()
//       ↓
//   USB Serial JSON
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

static String gSerialLine;

static bool gEspNowInitialized =
    false;

static bool gBridgeReady =
    false;

static bool gPeerKnown =
    false;

static uint8_t gPeerMac[6] = {
    0,
    0,
    0,
    0,
    0,
    0,
};

static uint32_t gLastAirRxMs =
    0;

static int gLastRssiDbm =
    0;

static uint64_t gPacketsReceived =
    0;

static uint64_t gPacketsTransmitted =
    0;

static uint64_t gTransmitFailures =
    0;

static uint64_t gDroppedRxFrames =
    0;


// ============================================================
// Forward Declarations
// ============================================================

static void sendReadyFrame();

static void sendLinkStatusFrame();

static void sendErrorFrame(
    const char *message,
    const char *code = nullptr
);

static void sendLogFrame(
    const char *message
);

static void processSerialInput();

static void processSerialFrame(
    const String &line
);

static void processEspNowRxQueue();

static bool initializeEspNow();

static bool addPeer(
    const uint8_t *macAddress
);

static bool learnPeer(
    const uint8_t *macAddress
);

static bool isAirLinkConnected();

static void handleDataFromHost(
    JsonDocument &document
);

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
// JSON Transmission Helper
// ============================================================

static void sendJson(
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
// LOG
// ============================================================

static void sendLogFrame(
    const char *message
) {
    JsonDocument document;

    document["protocol"] =
        kBridgeProtocol;

    document["version"] =
        kBridgeProtocolVersion;

    document["type"] =
        "LOG";

    document["message"] =
        message;

    document["uptime_ms"] =
        millis();

    sendJson(
        document
    );
}


// ============================================================
// ERROR
// ============================================================

static void sendErrorFrame(
    const char *message,
    const char *code
) {
    JsonDocument document;

    document["protocol"] =
        kBridgeProtocol;

    document["version"] =
        kBridgeProtocolVersion;

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

    sendJson(
        document
    );
}


// ============================================================
// READY
// ============================================================

static void sendReadyFrame() {
    JsonDocument document;

    document["protocol"] =
        kBridgeProtocol;

    document["version"] =
        kBridgeProtocolVersion;

    document["type"] =
        "READY";

    document["hardware"] =
        kHardwareName;

    document["firmware"] =
        kFirmwareName;

    document["firmware_version"] =
        kFirmwareVersion;

    document["node_id"] =
        kGroundNodeId;

    document["aircraft_node_id"] =
        kAircraftNodeId;

    document["bridge_ready"] =
        gBridgeReady;

    document["espnow_initialized"] =
        gEspNowInitialized;

    document["air_link_connected"] =
        isAirLinkConnected();

    document["channel"] =
        kEspNowChannel;

    document["ground_mac"] =
        WiFi.macAddress();

    if (
        gPeerKnown
    ) {
        document["peer_mac"] =
            formatMac(
                gPeerMac
            );
    }
    else {
        document["peer_mac"] =
            nullptr;
    }

    document["uptime_ms"] =
        millis();

    sendJson(
        document
    );
}


// ============================================================
// LINK STATUS
// ============================================================

static void sendLinkStatusFrame() {
    JsonDocument document;

    document["protocol"] =
        kBridgeProtocol;

    document["version"] =
        kBridgeProtocolVersion;

    document["type"] =
        "LINK_STATUS";

    document["connected"] =
        isAirLinkConnected();

    document["air_link_connected"] =
        isAirLinkConnected();

    document["bridge_ready"] =
        gBridgeReady;

    document["espnow_initialized"] =
        gEspNowInitialized;

    document["channel"] =
        kEspNowChannel;

    document["ground_mac"] =
        WiFi.macAddress();

    if (
        gPeerKnown
    ) {
        document["peer_mac"] =
            formatMac(
                gPeerMac
            );
    }
    else {
        document["peer_mac"] =
            nullptr;
    }

    if (
        gLastAirRxMs != 0
    ) {
        document["rssi_dbm"] =
            gLastRssiDbm;

        document["quality_percent"] =
            calculateQualityPercent(
                gLastRssiDbm
            );
    }
    else {
        document["rssi_dbm"] =
            nullptr;

        document["quality_percent"] =
            nullptr;
    }

    // Packet-loss estimation requires an application-level
    // sequence number / heartbeat mechanism on Aircraft.
    // Do not invent one here.
    document["packet_loss_percent"] =
        nullptr;

    document["packets_received"] =
        gPacketsReceived;

    document["packets_transmitted"] =
        gPacketsTransmitted;

    document["transmit_failures"] =
        gTransmitFailures;

    document["dropped_rx_frames"] =
        gDroppedRxFrames;

    if (
        gLastAirRxMs != 0
    ) {
        document["last_air_rx_age_ms"] =
            millis() - gLastAirRxMs;
    }
    else {
        document["last_air_rx_age_ms"] =
            nullptr;
    }

    document["uptime_ms"] =
        millis();

    sendJson(
        document
    );
}


// ============================================================
// ACK
// ============================================================

static void sendAckFrame(
    const char *operation,
    const String &packetId,
    bool accepted
) {
    JsonDocument document;

    document["protocol"] =
        kBridgeProtocol;

    document["version"] =
        kBridgeProtocolVersion;

    document["type"] =
        "ACK";

    document["operation"] =
        operation;

    document["accepted"] =
        accepted;

    if (
        packetId.length() > 0
    ) {
        document["packet_id"] =
            packetId;
    }

    document["uptime_ms"] =
        millis();

    sendJson(
        document
    );
}


// ============================================================
// PONG
// ============================================================

static void sendPongFrame(
    JsonDocument &request
) {
    JsonDocument response;

    response["protocol"] =
        kBridgeProtocol;

    response["version"] =
        kBridgeProtocolVersion;

    response["type"] =
        "PONG";

    // MissionNexus calculates round-trip latency using the
    // timestamp it originally sent.
    if (
        request["timestamp_unix"].is<double>()
        || request["timestamp_unix"].is<float>()
        || request["timestamp_unix"].is<long>()
        || request["timestamp_unix"].is<unsigned long>()
    ) {
        response["timestamp_unix"] =
            request["timestamp_unix"];
    }

    response["uptime_ms"] =
        millis();

    sendJson(
        response
    );
}


// ============================================================
// ESP-NOW Receive Callback
// ============================================================
//
// Current ESP-IDF / Arduino-ESP32 uses esp_now_recv_info_t.
//
// Keep callback work minimal.
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
// Learn Aircraft Peer
// ============================================================

static bool learnPeer(
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

    memcpy(
        gPeerMac,
        macAddress,
        6
    );

    gPeerKnown =
        true;

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
        sendLogFrame(
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
        sendErrorFrame(
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
        sendErrorFrame(
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
        sendErrorFrame(
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
        sendErrorFrame(
            "Failed to register ESP-NOW broadcast peer",
            "ESPNOW_BROADCAST_PEER_FAILED"
        );

        esp_now_deinit();

        return false;
    }

    return true;
}


// ============================================================
// Air Link State
// ============================================================

static bool isAirLinkConnected() {
    if (
        !gEspNowInitialized
        || !gPeerKnown
        || gLastAirRxMs == 0
    ) {
        return false;
    }

    uint32_t age =
        millis() - gLastAirRxMs;

    return (
        age <= kAirLinkTimeoutMs
    );
}


// ============================================================
// RSSI → Approximate UI Quality
// ============================================================
//
// This is only a presentation/diagnostic estimate.
//
// It is not a cryptographic or packet-delivery measurement.
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
// Host DATA → ESP-NOW
// ============================================================

static void handleDataFromHost(
    JsonDocument &document
) {
    const char *payloadBase64 =
        document[
            "payload_base64"
        ];

    if (
        payloadBase64 == nullptr
        || strlen(payloadBase64) == 0
    ) {
        sendErrorFrame(
            "DATA frame missing payload_base64",
            "DATA_PAYLOAD_MISSING"
        );

        return;
    }

    String packetId;

    if (
        document["packet_id"].is<const char *>()
    ) {
        packetId =
            document[
                "packet_id"
            ].as<const char *>();
    }

    uint8_t decoded[
        ESP_NOW_MAX_DATA_LEN
    ];

    size_t decodedLength =
        0;

    int decodeResult =
        mbedtls_base64_decode(
            decoded,
            sizeof(decoded),
            &decodedLength,
            reinterpret_cast<
                const unsigned char *
            >(
                payloadBase64
            ),
            strlen(
                payloadBase64
            )
        );

    if (
        decodeResult != 0
    ) {
        sendErrorFrame(
            "DATA frame contains invalid or oversized base64 payload",
            "DATA_BASE64_INVALID"
        );

        return;
    }

    if (
        decodedLength == 0
    ) {
        sendErrorFrame(
            "DATA frame decoded to an empty payload",
            "DATA_EMPTY"
        );

        return;
    }

    if (
        !gEspNowInitialized
    ) {
        sendErrorFrame(
            "ESP-NOW is not initialized",
            "ESPNOW_NOT_READY"
        );

        return;
    }

    const uint8_t *destination =
        gPeerKnown
            ? gPeerMac
            : kBroadcastMac;

    esp_err_t sendResult =
        esp_now_send(
            destination,
            decoded,
            decodedLength
        );

    if (
        sendResult != ESP_OK
    ) {
        ++gTransmitFailures;

        sendAckFrame(
            "ESPNOW_TX",
            packetId,
            false
        );

        sendErrorFrame(
            "ESP-NOW rejected DATA transmission",
            "ESPNOW_SEND_FAILED"
        );

        return;
    }

    ++gPacketsTransmitted;

    // This means ESP-NOW accepted the packet for
    // transmission. It is NOT a GoblinWisp security ACK.
    sendAckFrame(
        "ESPNOW_TX_QUEUED",
        packetId,
        true
    );
}


// ============================================================
// ESP-NOW → Host DATA
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
        !learnPeer(
            frame.sourceMac
        )
    ) {
        sendLogFrame(
            "Received ESP-NOW packet but could not learn peer"
        );
    }

    gLastAirRxMs =
        millis();

    gLastRssiDbm =
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
    ) {
        sendErrorFrame(
            "Failed to encode ESP-NOW payload for USB bridge",
            "BASE64_ENCODE_FAILED"
        );

        return;
    }

    if (
        base64Length >=
        sizeof(base64Buffer)
    ) {
        sendErrorFrame(
            "Encoded ESP-NOW payload exceeded bridge buffer",
            "BASE64_BUFFER_OVERFLOW"
        );

        return;
    }

    base64Buffer[
        base64Length
    ] = '\0';

    JsonDocument document;

    document["protocol"] =
        kBridgeProtocol;

    document["version"] =
        kBridgeProtocolVersion;

    document["type"] =
        "DATA";

    document["source_node_id"] =
        kAircraftNodeId;

    document["destination_node_id"] =
        kGroundNodeId;

    document["payload_base64"] =
        reinterpret_cast<
            const char *
        >(
            base64Buffer
        );

    JsonObject metadata =
        document[
            "metadata"
        ].to<JsonObject>();

    metadata["transport"] =
        "ESP-NOW";

    metadata["source_mac"] =
        formatMac(
            frame.sourceMac
        );

    metadata["rssi_dbm"] =
        frame.rssi;

    metadata["quality_percent"] =
        calculateQualityPercent(
            frame.rssi
        );

    metadata["channel"] =
        kEspNowChannel;

    metadata["received_by"] =
        kGroundNodeId;

    sendJson(
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
// Serial JSON Frame Processor
// ============================================================

static void processSerialFrame(
    const String &line
) {
    if (
        line.length() == 0
    ) {
        return;
    }

    JsonDocument document;

    DeserializationError error =
        deserializeJson(
            document,
            line
        );

    if (
        error
    ) {
        sendErrorFrame(
            "Invalid JSON frame received over USB serial",
            "INVALID_JSON"
        );

        return;
    }

    const char *protocol =
        document[
            "protocol"
        ];

    if (
        protocol == nullptr
        || strcmp(
            protocol,
            kBridgeProtocol
        ) != 0
    ) {
        sendErrorFrame(
            "Unsupported bridge protocol",
            "INVALID_PROTOCOL"
        );

        return;
    }

    int protocolVersion =
        document[
            "version"
        ]
        | 0;

    if (
        protocolVersion !=
        kBridgeProtocolVersion
    ) {
        sendErrorFrame(
            "Unsupported GW-ESPNOW-BRIDGE protocol version",
            "INVALID_VERSION"
        );

        return;
    }

    const char *type =
        document[
            "type"
        ];

    if (
        type == nullptr
    ) {
        sendErrorFrame(
            "Bridge frame missing type",
            "TYPE_MISSING"
        );

        return;
    }

    // --------------------------------------------------------
    // HELLO
    // --------------------------------------------------------

    if (
        strcmp(
            type,
            "HELLO"
        ) == 0
    ) {
        sendReadyFrame();

        return;
    }

    // --------------------------------------------------------
    // STATUS_REQUEST
    // --------------------------------------------------------

    if (
        strcmp(
            type,
            "STATUS_REQUEST"
        ) == 0
    ) {
        sendLinkStatusFrame();

        return;
    }

    // --------------------------------------------------------
    // PING
    // --------------------------------------------------------

    if (
        strcmp(
            type,
            "PING"
        ) == 0
    ) {
        sendPongFrame(
            document
        );

        return;
    }

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    if (
        strcmp(
            type,
            "DATA"
        ) == 0
    ) {
        handleDataFromHost(
            document
        );

        return;
    }

    // --------------------------------------------------------
    // Unknown
    // --------------------------------------------------------

    sendErrorFrame(
        "Unsupported bridge frame type",
        "UNKNOWN_FRAME_TYPE"
    );
}


// ============================================================
// Serial Input Processing
// ============================================================

static void processSerialInput() {
    while (
        Serial.available() > 0
    ) {
        char character =
            static_cast<char>(
                Serial.read()
            );

        if (
            character == '\r'
        ) {
            continue;
        }

        if (
            character == '\n'
        ) {
            if (
                gSerialLine.length() > 0
            ) {
                processSerialFrame(
                    gSerialLine
                );

                gSerialLine.clear();
            }

            continue;
        }

        if (
            gSerialLine.length()
            >= kMaxSerialLineLength
        ) {
            gSerialLine.clear();

            sendErrorFrame(
                "Serial frame exceeded maximum bridge length",
                "SERIAL_FRAME_TOO_LARGE"
            );

            continue;
        }

        gSerialLine +=
            character;
    }
}


// ============================================================
// Arduino setup()
// ============================================================

void setup() {
    // --------------------------------------------------------
    // USB CDC Serial
    // --------------------------------------------------------

    Serial.begin(
        kSerialBaud
    );

    gSerialLine.reserve(
        1024
    );

    // Allow native USB CDC to enumerate, but never prevent the
    // bridge from booting just because MissionNexus is absent.
    uint32_t serialWaitStarted =
        millis();

    while (
        !Serial
        && (
            millis()
            - serialWaitStarted
        ) < 2500
    ) {
        delay(
            10
        );
    }

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
        sendErrorFrame(
            "Failed to allocate ESP-NOW receive queue",
            "RX_QUEUE_FAILED"
        );

        gBridgeReady =
            false;

        return;
    }

    // --------------------------------------------------------
    // ESP-NOW
    // --------------------------------------------------------

    gEspNowInitialized =
        initializeEspNow();

    gBridgeReady =
        gEspNowInitialized;

    if (
        !gEspNowInitialized
    ) {
        sendErrorFrame(
            "GoblinWisp Ground Bridge started without ESP-NOW",
            "BRIDGE_DEGRADED"
        );

        return;
    }

    // --------------------------------------------------------
    // Initial Runtime Announcement
    // --------------------------------------------------------

    sendLogFrame(
        "GoblinWisp Ground ESP32-S3 bridge started"
    );

    sendReadyFrame();
}


// ============================================================
// Arduino loop()
// ============================================================

void loop() {
    processSerialInput();

    processEspNowRxQueue();

    // Keep the loop responsive for:
    //
    //   USB serial
    //   ESP-NOW
    //   FreeRTOS Wi-Fi tasks
    //
    delay(
        1
    );
}