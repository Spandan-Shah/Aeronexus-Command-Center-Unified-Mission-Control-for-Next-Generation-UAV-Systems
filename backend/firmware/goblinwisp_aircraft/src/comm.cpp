// GoblinWisp File 15/23 - integrated ESP-NOW transport and SSIP runtime.
// Fixed physical topology: CACTUS <-> SAFED SAGAR only. An unrecognized
// logical peer ID has no authorized MAC binding and is refused.
// This transport must never advertise full multi-peer routing until explicit
// per-peer MAC bindings, queues and application multiplexing are implemented.

#include <Arduino.h>

#if defined(__has_include)
# if __has_include(<esp_idf_version.h>)
#  include <esp_idf_version.h>
# endif
#endif
#include <esp_err.h>
#include <esp_now.h>
#include <esp_system.h>
#include <esp_mac.h>
#if defined(__has_include)
# if __has_include(<esp_secure_boot.h>)
#  include <esp_secure_boot.h>
#  define GW_HAS_SECURE_BOOT_PROBE 1
# endif
# if __has_include(<esp_flash_encrypt.h>)
#  include <esp_flash_encrypt.h>
#  define GW_HAS_FLASH_ENCRYPTION_PROBE 1
# endif
#endif

#include <WiFi.h>
#include <WiFiUdp.h>
#include "gw_peer_discovery.h"
#include "gw_device_catalog.h"
#include "gw_contacts.h"
#include "gw_ble_link.h"
#include "gw_transport_io.h"
#include <Preferences.h>

#include <cstring>

#include "comm.h"
#include "gw_events.h"
#include "ui.h"

#include "gw_context.h"
#include "gw_crypto.h"
#include "gw_handshake.h"
#include "gw_identity.h"
#include "gw_rekey.h"
#include "gw_storage.h"
#include "gw_pairing.h"
#include "gw_replay.h"
#include "gw_security_policy.h"
#include "gw_security_types.h"
#include "gw_trust.h"
#include "gw_uart_framing.h"

// =======================================================
// Central COMM logger (USB Serial + shared TFT event journal)
// =======================================================
// This adapter collects complete lines from existing gw_comm_log.print()/println()
// statements without calling any TFT drawing code or exposing key material.
// All writes must be invoked from the normal application loop, never an ISR.
// Other modules are expected to call gw::gw_log()/gw::gw_logf() directly.
class GwCommEventPrint final : public Print
{
public:
    size_t write(uint8_t byte) override
    {
        if (byte == '\r') return 1;
        if (byte == '\n') { flushLine(); return 1; }
        if (length_ >= sizeof(line_) - 1) flushLine();
        line_[length_++] = static_cast<char>(byte);
        return 1;
    }

    size_t write(const uint8_t *buffer, size_t length) override
    {
        if (!buffer && length) return 0;
        for (size_t i = 0; i < length; ++i) write(buffer[i]);
        return length;
    }
    using Print::write;

private:
    void flushLine()
    {
        if (length_ == 0) return;
        line_[length_] = '\0';
        // Extract an existing prefix such as [SSIP] or [PAIR], if present.
        char category[gw::EVENT_CATEGORY_SIZE] = "COMM";
        const char *message = line_;
        if (line_[0] == '[')
        {
            const char *close = std::strchr(line_, ']');
            if (close && close > line_ + 1 &&
                static_cast<size_t>(close - line_ - 1) < sizeof(category))
            {
                const size_t n = static_cast<size_t>(close - line_ - 1);
                std::memcpy(category, line_ + 1, n);
                category[n] = '\0';
                message = close + 1;
                if (*message == ' ') ++message;
            }
        }
        const bool warning = std::strstr(message, "timeout") ||
            std::strstr(message, "FAIL") || std::strstr(message, "failed") ||
            std::strstr(message, "replay") || std::strstr(message, "REPLAY");
        gw::gw_log(warning ? gw::LogLevel::WARNING : gw::LogLevel::INFO,
                   category, message);
        length_ = 0;
        line_[0] = '\0';
    }
    char line_[gw::EVENT_MESSAGE_SIZE] = {};
    size_t length_ = 0;
};
static GwCommEventPrint gw_comm_log;

// =======================================================
// GoblinWisp SSIP Communication Integration
// =======================================================
//
// Persistent identity
//        ↓
// Trusted pairing
//        ↓
// Signed ephemeral handshake
//        ↓
// P-256 ECDH
//        ↓
// Transcript-bound HKDF
//        ↓
// Independent A→B / B→A contexts
//        ↓
// AES-256-GCM
//        ↓
// ESP-NOW
//
// No automatic legacy-PSK fallback.
// =======================================================


// =======================================================
// Shared Application Events
// =======================================================

static volatile bool activity_flag = false;

volatile bool rx_event = false;
volatile bool rx_secure_event = false;

uint8_t rx_buffer[
    GW_MAX_LONG_MESSAGE + 1
] = {0};

static uint8_t rx_plain_buffer[
    GW_MAX_PAYLOAD
] = {0};

volatile bool rx_fault_event = false;
volatile uint8_t rx_fault_code = 0;
volatile uint32_t rx_fault_counter = 0;
volatile bool rx_fault_latched = false;

volatile bool gw_secure_session_active = false;

volatile bool tx_ack_event = false;
volatile uint32_t tx_ack_counter = 0;

volatile bool rx_ack_event = false;
volatile uint32_t rx_ack_counter = 0;

volatile bool tx_timeout_event = false;
volatile uint32_t tx_timeout_counter = 0;

volatile bool tx_fragment_done_event = false;
volatile uint16_t tx_fragment_total_event = 0;

volatile bool handshake_retry_event = false;
volatile uint8_t handshake_retry_count_event = 0;

volatile bool handshake_timeout_event = false;
volatile uint8_t handshake_timeout_retries = 0;

volatile bool session_timeout_event = false;
volatile bool session_reset_event = false;

volatile bool gw_status_event = false;

volatile uint8_t gw_status_code =
    GW_STATUS_NONE;

volatile uint32_t gw_status_value = 0;

volatile gw_session_state_t
    gw_session_state =
        GW_SESSION_NONE;


// =======================================================
// Transport-readiness, runtime counters and rekey transition tracking
// =======================================================
// UART framing is deliberately NOT part of the authenticated SSIP payload.
// Frame: 0x47,0x57, length (1..250), one's-complement length, payload.
// Corrupted framing is dropped; all accepted messages still undergo SSIP
// signature or AES-GCM verification. No plaintext application fallback.
static GwTransport gw_selected_transport = GwTransport::ESP_NOW;
static gw::DeviceKind gw_selected_device = gw::DeviceKind::ESP32_DEVKIT;
static constexpr int GW_UART_RX_PIN = 16;
static constexpr int GW_UART_TX_PIN = 17;
static constexpr uint32_t GW_UART_BAUD = 115200;
static_assert(GW_MAX_PAYLOAD == gw::UART_FRAME_MAX_PAYLOAD,
              "UART and SSIP packet maxima must match");
static gw::UartFrameDecoder gw_uart_decoder;
static uint32_t gw_uart_last_byte_at = 0;

static bool gw_load_transport_choice() {
    Preferences p;
    if (!p.begin("gw_link", false)) return false;
    const uint8_t mode = p.getUChar("medium", 0);
    p.end();
    if (mode > static_cast<uint8_t>(GwTransport::BLE_GATT)) return false;
    gw_selected_transport = static_cast<GwTransport>(mode);
    return true;
}

static uint8_t gw_transport_bit(GwTransport transport) {
    switch(transport) {
        case GwTransport::ESP_NOW: return gw::TRANSPORT_ESPNOW;
        case GwTransport::WIFI_SOFTAP_UDP: return gw::TRANSPORT_WIFI_UDP;
        case GwTransport::BLE_GATT: return gw::TRANSPORT_BLE;
        case GwTransport::UART_WIRED: return gw::TRANSPORT_UART;
    }
    return 0;
}
static constexpr uint8_t GW_COMPILED_BASE_TRANSPORTS =
    gw::TRANSPORT_ESPNOW | gw::TRANSPORT_WIFI_UDP | gw::TRANSPORT_UART;
static uint8_t gw_compiled_transport_mask() {
    return GW_COMPILED_BASE_TRANSPORTS |
           (gw_ble::compiled() ? gw::TRANSPORT_BLE : 0);
}
static bool gw_load_device_kind() {
    Preferences p;
    if(!p.begin("gw_link",true)) return false;
    uint8_t n = p.getUChar("device",static_cast<uint8_t>(gw::DeviceKind::ESP32_DEVKIT));
    p.end();
    auto kind = static_cast<gw::DeviceKind>(n);
    if(!gw::device_profile(kind)) return false;
    gw_selected_device = kind;
    return true;
}
static bool gw_transport_ready = false;
// The Wi-Fi access point is a radio link, NOT a security anchor. The
// pre-shared demo AP password must not be treated as authentication; signed
// pairing, fingerprint continuity and AES-GCM remain mandatory.
static WiFiUDP gw_wifi_udp;
static constexpr uint16_t GW_WIFI_PORT = 42381;
static const char GW_WIFI_SSID[] = "GoblinWisp-Link";
static const char GW_WIFI_DEMO_PASSWORD[] = "GWdemo-CHANGE-ME-2026";
static IPAddress gw_selected_ip;
static bool gw_selected_ip_valid = false;
static gw::DiscoveryRoster gw_discovered;
static uint32_t gw_discovery_until = 0;
static uint32_t gw_last_beacon_at = 0;
static const uint8_t GW_BROADCAST_MAC[6] = {0xff,0xff,0xff,0xff,0xff,0xff};
struct GwWifiEndpoint {
    uint8_t mac[6]{};
    IPAddress ip;
    uint32_t seen=0;
    bool valid=false;
};
static GwWifiEndpoint gw_wifi_endpoints[gw::DISCOVERY_SLOTS];

static IPAddress gw_wifi_broadcast_ip() {
    const IPAddress ip = WiFi.localIP();
    const IPAddress mask = WiFi.subnetMask();
    if (ip == IPAddress(0, 0, 0, 0) || mask == IPAddress(0, 0, 0, 0)) {
        return IPAddress(255, 255, 255, 255);
    }
    IPAddress broadcast;
    for (uint8_t i = 0; i < 4; ++i) {
        broadcast[i] = static_cast<uint8_t>(ip[i] | static_cast<uint8_t>(~mask[i]));
    }
    return broadcast;
}

static void gw_remember_endpoint(const uint8_t mac[6], IPAddress ip) {
    if (!gw::discovery_valid_mac(mac) || ip == IPAddress(0,0,0,0)) return;
    for (auto &e: gw_wifi_endpoints) if(e.valid && memcmp(e.mac,mac,6)==0){e.ip=ip;e.seen=millis();return;}
    for (auto &e: gw_wifi_endpoints)
        if(!e.valid || millis()-e.seen>gw::DISCOVERY_LIFETIME_MS){memcpy(e.mac,mac,6);e.ip=ip;e.seen=millis();e.valid=true;return;}
}
static bool gw_lookup_endpoint(const uint8_t mac[6], IPAddress &ip) {
    for(const auto &e:gw_wifi_endpoints) if(e.valid && millis()-e.seen<=gw::DISCOVERY_LIFETIME_MS &&
        memcmp(e.mac,mac,6)==0){ip=e.ip;return true;}
    return false;
}

static bool gw_self_test_ok = false;
static uint32_t gw_auth_failures = 0;
static uint32_t gw_replay_drops = 0;
static volatile uint32_t gw_queue_drops = 0;
static uint32_t gw_malformed_frames = 0;
static uint32_t gw_retry_total = 0;
static gw::RekeyState gw_last_rekey_state = gw::RekeyState::UNINITIALIZED;
static uint32_t gw_last_rekey_successes = 0;
static uint32_t gw_last_rekey_failures = 0;

// =======================================================
// ESP-NOW TX Completion Diagnostics
// =======================================================

volatile bool tx_done_event = false;
volatile bool tx_ok_event = false;


// =======================================================
// Existing UI-Compatible Session ID
// =======================================================
//
// Actual SSIP Session ID is 64-bit.
//
// Existing UI continues using the lower 32 bits.
// =======================================================

static uint32_t gw_session_id = 0;


// =======================================================
// Session Activity
// =======================================================

static uint32_t gw_last_session_activity_ms = 0;


// =======================================================
// Physical Peer MAC Addresses
// =======================================================
//
// CACTUS / TX:
//     4C:11:AE:66:6E:BC
//
// SAFED SAGAR / RX:
//     00:4B:12:EE:44:3C
// =======================================================

#if GW_DEVICE_ROLE == GW_ROLE_TX

static uint8_t peer_mac[6] =
{
    0x00,
    0x4B,
    0x12,
    0xEE,
    0x44,
    0x3C
};

#else

static uint8_t peer_mac[6] =
{
    0x4C,
    0x11,
    0xAE,
    0x66,
    0x6E,
    0xBC
};

#endif


// The ESP-NOW receive callback runs on a Wi-Fi task. Serialize the short
// selected-address check with user selection on the application task.
static portMUX_TYPE gw_peer_address_mux = portMUX_INITIALIZER_UNLOCKED;

// Device-selected MAC is a routing hint only. Trust remains pinned to the
// separately stored P-256 key and must be confirmed by SAS on first pairing.
// Discoverable/saved network endpoints are NOT trusted identities.
// An NVS checksum catches accidental corruption but is not an integrity MAC.
static bool gw_load_contact_book(gw::ContactBook &book) {
    gw::contact_book_init(book);
    Preferences p;
    if(!p.begin("gw_peers",true))return false;
    const size_t n=p.getBytesLength("addresses");
    if(n==0){p.end();return true;}
    if(n!=sizeof(book)){p.end();return false;}
    const size_t got=p.getBytes("addresses",&book,sizeof(book));
    p.end();
    return got==sizeof(book) && gw::contact_book_valid(book);
}
static bool gw_save_contact_book(const gw::ContactBook &book) {
    if(!gw::contact_book_valid(book))return false;
    Preferences p;
    if(!p.begin("gw_peers",false))return false;
    const size_t n=p.putBytes("addresses",&book,sizeof(book));
    p.end();
    return n==sizeof(book);
}
static bool gw_load_peer_address() {
    Preferences p;
    if (!p.begin("gw_link",true)) return false;
    const size_t n=p.getBytesLength("peer_mac");
    uint8_t candidate[6]{};
    const size_t read=n==6?p.getBytes("peer_mac",candidate,6):0;
    p.end();
    if(n==0)return true; // preserve known existing two-board topology
    if(read!=6 || !gw::discovery_valid_mac(candidate))return false;
    memcpy(peer_mac,candidate,6);
    return true;
}
static bool gw_add_espnow_peer(const uint8_t mac[6]) {
    return gw_transport_io::ensure_espnow_peer(mac);
}
// =======================================================
// Local Device Side
// =======================================================

static gw::DeviceSide gw_local_side()
{

#if GW_DEVICE_ROLE == GW_ROLE_TX

    return gw::DeviceSide::SIDE_A;

#else

    return gw::DeviceSide::SIDE_B;

#endif
}


// =======================================================
// Local Callsign
// =======================================================

static const char *gw_local_callsign()
{

#if GW_DEVICE_ROLE == GW_ROLE_TX

    return "CACTUS";

#else

    return "SAFED SAGAR";

#endif
}


// =======================================================
// Status Event Helper
// =======================================================

static void gw_emit_status(
    uint8_t code,
    uint32_t value
)
{
    gw_status_code = code;
    gw_status_value = value;
    gw_status_event = true;
}


// =======================================================
// Session Activity Helper
// =======================================================

static void gw_mark_session_activity()
{
    gw_last_session_activity_ms =
        millis();
}


// =======================================================
// Fault Helper
// =======================================================

static void gw_set_fault(
    uint8_t code,
    uint64_t value,
    bool latch
)
{
    if (code == GW_FAULT_AUTH_FAIL || code == GW_FAULT_DECRYPT_FAIL)
        ++gw_auth_failures;
    else if (code == GW_FAULT_REPLAY)
        ++gw_replay_drops;
    else if (code == GW_FAULT_LEN_MISM || code == GW_FAULT_BAD_TYPE ||
             code == GW_FAULT_FRAGMENT)
        ++gw_malformed_frames;
    rx_fault_code = code;

    rx_fault_counter =
        static_cast<uint32_t>(
            value &
            0xFFFFFFFFULL
        );

    rx_fault_event = true;

    if (latch)
    {
        rx_fault_latched = true;
    }
}


// =======================================================
// Big-Endian Helpers
// =======================================================

static void write_u16_be(
    uint8_t output[2],
    uint16_t value
)
{
    output[0] =
        static_cast<uint8_t>(
            value >> 8
        );

    output[1] =
        static_cast<uint8_t>(
            value
        );
}


static uint16_t read_u16_be(
    const uint8_t input[2]
)
{
    return
        (
            static_cast<uint16_t>(
                input[0]
            ) << 8
        ) |
        static_cast<uint16_t>(
            input[1]
        );
}


static void write_u32_be(
    uint8_t output[4],
    uint32_t value
)
{
    output[0] =
        static_cast<uint8_t>(
            value >> 24
        );

    output[1] =
        static_cast<uint8_t>(
            value >> 16
        );

    output[2] =
        static_cast<uint8_t>(
            value >> 8
        );

    output[3] =
        static_cast<uint8_t>(
            value
        );
}


static uint32_t read_u32_be(
    const uint8_t input[4]
)
{
    return
        (
            static_cast<uint32_t>(
                input[0]
            ) << 24
        ) |
        (
            static_cast<uint32_t>(
                input[1]
            ) << 16
        ) |
        (
            static_cast<uint32_t>(
                input[2]
            ) << 8
        ) |
        static_cast<uint32_t>(
            input[3]
        );
}


static void write_u64_be(
    uint8_t output[8],
    uint64_t value
)
{
    for (
        int index = 7;
        index >= 0;
        index--
    )
    {
        output[
            7 - index
        ] =
            static_cast<uint8_t>(
                value >>
                (
                    index * 8
                )
            );
    }
}


static uint64_t read_u64_be(
    const uint8_t input[8]
)
{
    uint64_t value = 0;

    for (
        size_t index = 0;
        index < 8;
        index++
    )
    {
        value =
            (
                value << 8
            ) |
            static_cast<uint64_t>(
                input[index]
            );
    }

    return value;
}


// =======================================================
// SSIP Secure Packet Format
// =======================================================

static constexpr uint8_t
    GW_SSIP_DATA_MAGIC[4] =
{
    'G',
    'W',
    'S',
    'D'
};


enum class GwSecureType : uint8_t
{
    DATA = 1,
    ACK = 2,
    FRAGMENT = 3
};


#pragma pack(push, 1)

struct gw_ssip_wire_header_t
{
    uint8_t magic[4];

    uint8_t protocol_major;
    uint8_t protocol_minor;

    uint8_t type;
    uint8_t sender_id;

    uint8_t counter[8];

    uint8_t ciphertext_length[2];
};


struct gw_frag_wire_header_t
{
    uint8_t msg_id[4];

    uint8_t frag_index[2];

    uint8_t frag_total[2];

    uint8_t frag_len[2];
};

#pragma pack(pop)


static constexpr size_t
    GW_SSIP_MAX_SINGLE_PLAINTEXT =
        GW_MAX_PAYLOAD -
        sizeof(gw_ssip_wire_header_t) -
        GW_TAG_LEN;


static_assert(
    GW_SSIP_MAX_SINGLE_PLAINTEXT >=
        (
            sizeof(
                gw_frag_wire_header_t
            ) +
            GW_FRAG_DATA_MAX
        ),

    "GW_FRAG_DATA_MAX does not fit SSIP packet"
);


// =======================================================
// TX Retry State
// =======================================================

static volatile bool tx_waiting_ack = false;

static uint64_t tx_wait_counter64 = 0;

// Store only the exact encrypted wire bytes while awaiting ACK.
static uint8_t tx_pending_frame[GW_MAX_PAYLOAD] = {0};
static size_t tx_pending_frame_length = 0;

static uint8_t tx_retry_count = 0;

static uint32_t tx_last_send_ms = 0;

static constexpr uint32_t
    GW_ACK_TIMEOUT_MS =
        400UL;

static constexpr uint8_t
    GW_MAX_RETRIES =
        3;


// =======================================================
// UI Compatibility Counter Shadows
// =======================================================

static uint32_t tx_counter_shadow = 0;

static uint32_t rx_counter_shadow = 0;


// =======================================================
// Fragmentation State
// =======================================================

static uint8_t tx_fragment_payload[
    GW_MAX_LONG_MESSAGE
] = {0};

static size_t tx_fragment_len = 0;

static uint32_t tx_fragment_msg_id = 0;

static uint16_t tx_fragment_total = 0;

static uint16_t tx_fragment_next_index = 0;

static bool tx_fragment_active = false;


static uint8_t rx_reassembly_buffer[
    GW_MAX_LONG_MESSAGE + 1
] = {0};

static size_t rx_reassembly_len = 0;

static uint32_t rx_fragment_msg_id = 0;

static uint16_t rx_fragment_total = 0;

static uint16_t rx_fragment_next_index = 0;

static bool rx_fragment_active = false;


// =======================================================
// Handshake / Pairing State Tracking
// =======================================================

static gw::HandshakeState
    last_handshake_state =
        gw::HandshakeState::UNINITIALIZED;


static gw::PairingState
    last_pairing_state =
        gw::PairingState::UNINITIALIZED;


static uint32_t
    last_handshake_failure_ms = 0;


// =======================================================
// ESP-NOW RX Queue
// =======================================================
//
// No expensive cryptographic operations are performed
// from inside the Wi-Fi callback.
//
// ESP-NOW callback only copies packets.
// comm_loop() processes them.
// =======================================================

static constexpr uint8_t
    GW_RX_QUEUE_CAPACITY =
        4;


struct GwRxFrame
{
    uint8_t mac[6];

    uint16_t length;

    uint8_t data[
        GW_MAX_PAYLOAD
    ];
};


static GwRxFrame
    gw_rx_queue[
        GW_RX_QUEUE_CAPACITY
    ];


static volatile uint8_t
    gw_rx_queue_head = 0;


static volatile uint8_t
    gw_rx_queue_tail = 0;


static volatile uint8_t
    gw_rx_queue_count = 0;


static portMUX_TYPE
    gw_rx_queue_mux =
        portMUX_INITIALIZER_UNLOCKED;


// =======================================================
// Forward Declarations
// =======================================================

#if defined(ESP_IDF_VERSION) && ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 5, 0)
static void on_espnow_send(
    const esp_now_send_info_t *tx_info,
    esp_now_send_status_t status
);
#else
static void on_espnow_send(
    const uint8_t *mac_address,
    esp_now_send_status_t status
);
#endif


#if defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
static void on_espnow_recv(const esp_now_recv_info_t *info,
                           const uint8_t *incoming_data, int length);
#else
static void on_espnow_recv(const uint8_t *mac_address,
                           const uint8_t *incoming_data, int length);
#endif


static bool tx_send_next_fragment();


static void send_ack_for_counter(
    uint64_t counter
);


// =======================================================
// Peer MAC Validation
// =======================================================

static bool gw_mac_is_trusted_peer(
    const uint8_t *mac
)
{
    if (mac == nullptr)
    {
        return false;
    }

    bool matches = false;
    portENTER_CRITICAL(&gw_peer_address_mux);
    matches = memcmp(mac,peer_mac,sizeof(peer_mac)) == 0;
    portEXIT_CRITICAL(&gw_peer_address_mux);
    return matches;
}


// =======================================================
// Raw ESP-NOW Transport Adapter
// =======================================================

static bool gw_transport_send_raw(
    const uint8_t *data,
    size_t length
)
{
    if (!comm_transport_compatible(gw_selected_transport)) return false;
    if (gw_selected_transport == GwTransport::BLE_GATT) {
        const bool sent = gw_ble::send(data,length);
        tx_done_event=true;tx_ok_event=sent;
        return sent;
    }
    if (gw_selected_transport == GwTransport::WIFI_SOFTAP_UDP) {
        if (!gw_transport_ready || !data || length == 0 ||
            length > GW_MAX_PAYLOAD || !gw_selected_ip_valid) return false;
        const bool sent=gw_transport_io::wifi_udp_send(
            gw_wifi_udp,gw_selected_ip,GW_WIFI_PORT,data,length);
        tx_done_event=true;tx_ok_event=sent;
        return sent;
    }
    if (gw_selected_transport == GwTransport::UART_WIRED) {
        if (!gw_transport_ready || !data || length == 0 ||
            length > GW_MAX_PAYLOAD) return false;
        const bool sent=gw_transport_io::uart_send(Serial2,data,length);
        tx_done_event=true;tx_ok_event=sent;
        return sent;
    }

    if (
        data == nullptr ||
        length == 0 ||
        length > GW_MAX_PAYLOAD
    )
    {
        return false;
    }


    return gw_transport_ready &&
           gw_transport_io::espnow_send(peer_mac,data,length);
}


// A logical peer ID must have a fixed, independently verified transport
// mapping. This hardware configuration has exactly ONE provisioned MAC.
// Other IDs fail closed; no peer-MACs are inferred from untrusted frames.
static bool gw_transport_send_peer(uint8_t destination_peer_id,
                                   const uint8_t *data, size_t length)
{
    return destination_peer_id == GW_TRUSTED_PEER_ID &&
           gw_transport_send_raw(data, length);
}

// =======================================================
// RX Queue Push
// =======================================================

static bool gw_rx_queue_push(
    const uint8_t *mac,
    const uint8_t *data,
    size_t length
)
{
    if (
        mac == nullptr ||
        data == nullptr ||
        length == 0 ||
        length > GW_MAX_PAYLOAD
    )
    {
        return false;
    }


    bool success = false;


    portENTER_CRITICAL(
        &gw_rx_queue_mux
    );


    if (
        gw_rx_queue_count <
        GW_RX_QUEUE_CAPACITY
    )
    {
        GwRxFrame &frame =
            gw_rx_queue[
                gw_rx_queue_head
            ];


        memcpy(
            frame.mac,
            mac,
            sizeof(frame.mac)
        );


        memcpy(
            frame.data,
            data,
            length
        );


        frame.length =
            static_cast<uint16_t>(
                length
            );


        gw_rx_queue_head =
            static_cast<uint8_t>(
                (
                    gw_rx_queue_head +
                    1
                ) %
                GW_RX_QUEUE_CAPACITY
            );


        gw_rx_queue_count++;


        success = true;
    }


    portEXIT_CRITICAL(
        &gw_rx_queue_mux
    );


    return success;
}


// UART parser executes only in comm_loop(), never from an ISR.
// Frames from this *wired single-peer connection* use peer_mac only as
// an internal queue tag; remote identity is established cryptographically.
// Do not reuse this synthetic tag for radio-based multi-peer discovery.
static void gw_poll_uart() {
    if (gw_selected_transport != GwTransport::UART_WIRED ||
        !gw_transport_ready) return;
    // Reset abandoned partial frames so a broken/injected stream cannot
    // indefinitely consume the next legitimate frame as payload bytes.
    if (gw_uart_decoder.in_progress() &&
        static_cast<uint32_t>(millis() - gw_uart_last_byte_at) > 400UL)
        gw_uart_decoder.reset();
    size_t budget = 1024; // bounded work on noisy links
    while (budget-- && Serial2.available() > 0) {
        const uint8_t byte = static_cast<uint8_t>(Serial2.read());
        gw_uart_last_byte_at = millis();
        uint8_t payload[GW_MAX_PAYLOAD] = {};
        size_t payload_length = 0;
        const gw::UartFrameResult result = gw_uart_decoder.consume(
            byte, payload, sizeof(payload), payload_length);
        if (result == gw::UartFrameResult::READY) {
            if (!gw_rx_queue_push(peer_mac, payload, payload_length))
                ++gw_queue_drops;
        } else if (result == gw::UartFrameResult::MALFORMED) {
            ++gw_malformed_frames;
        }
        gw::secure_zero(payload, sizeof(payload));
    }
}

// Wi-Fi Direct uses an on-device SoftAP on A and STA on B; neither an
// external router nor extra radio is needed. Endpoint hints from unauthenticated
// discovery never authorize a secure session by themselves.
static void gw_poll_wifi() {
    if(gw_selected_transport!=GwTransport::WIFI_SOFTAP_UDP || !gw_transport_ready) return;
    for(int budget=0;budget<4;budget++){
        const int packet_size=gw_wifi_udp.parsePacket();
        if(packet_size<=0)break;
        IPAddress sender=gw_wifi_udp.remoteIP();
        if(packet_size>GW_MAX_PAYLOAD+6){gw_wifi_udp.clear();continue;}
        uint8_t buffer[GW_MAX_PAYLOAD+6]{};
        const int received=gw_wifi_udp.read(buffer,sizeof buffer);
        gw_wifi_udp.clear();
        if(received<1)continue;
        gw::DiscoveryBeacon candidate{};
        if(received==static_cast<int>(sizeof candidate+6) &&
           gw::discovery_decode(buffer,sizeof candidate,candidate) &&
           candidate.logical_id==GW_TRUSTED_PEER_ID) {
            const uint8_t* remote_mac=buffer+sizeof candidate;
            if(!gw::discovery_valid_mac(remote_mac))continue;
            if(!comm_session_ready())gw_remember_endpoint(remote_mac,sender);
            if(memcmp(peer_mac,remote_mac,6)==0 && !comm_session_ready()){
                gw_selected_ip=sender;gw_selected_ip_valid=true;
            }
            gw_rx_queue_push(remote_mac,buffer,sizeof candidate);
            continue;
        }
        if(gw_selected_ip_valid && sender==gw_selected_ip &&
           received<=GW_MAX_PAYLOAD) gw_rx_queue_push(peer_mac,buffer,static_cast<size_t>(received));
    }
}
static void gw_ble_received_frame(const uint8_t* bytes, size_t length) {
    if (!bytes || length==0 || length>GW_MAX_PAYLOAD) return;
    // The physical bearer is not proof of identity. All packets must pass
    // the same trusted static-key verification and SSIP AEAD checks.
    (void)gw_rx_queue_push(peer_mac,bytes,length);
}
static void gw_ble_candidate(const uint8_t mac[6], const char* name) {
    if (!name || !gw::discovery_valid_mac(mac)) return;
    gw::DiscoveryBeacon beacon{};
    if (!gw::discovery_encode(beacon,static_cast<uint8_t>(
            gw_local_side()==gw::DeviceSide::SIDE_A ? 2 : 1),
            GW_TRUSTED_PEER_ID,name)) return;
    gw_discovered.observe(mac,beacon,static_cast<uint8_t>(gw_local_side()),millis());
}
static bool gw_ble_previously_connected = false;
static void gw_poll_ble() {
    if (!gw_transport_ready || gw_selected_transport != GwTransport::BLE_GATT)return;
    const bool live=gw_ble::connected();
    if(gw_ble_previously_connected && !live) {
        // Do not resurrect a prior authenticated session after GATT loss.
        comm_reset_session();
    }
    gw_ble_previously_connected=live;
    gw_ble::poll(gw_ble_received_frame);
    if(comm_discovery_scanning())gw_ble::scan_candidates(gw_ble_candidate);
}
static void gw_broadcast_discovery() {
    if(!gw_transport_ready || gw_discovery_until==0 ||
       static_cast<int32_t>(gw_discovery_until-millis())<0)return;
    if(static_cast<uint32_t>(millis()-gw_last_beacon_at)<1700UL)return;
    gw_last_beacon_at=millis();
    gw::DiscoveryBeacon b{};
    if(!gw::discovery_encode(b,static_cast<uint8_t>(gw_local_side()),
                             GW_THIS_DEVICE_ID,gw_local_callsign()))return;
    if(gw_selected_transport==GwTransport::ESP_NOW){
        esp_now_send(GW_BROADCAST_MAC,reinterpret_cast<const uint8_t*>(&b),sizeof b);
    }else if(gw_selected_transport==GwTransport::WIFI_SOFTAP_UDP){
        uint8_t message[sizeof b+6]{};
        memcpy(message,&b,sizeof b);
        // A SoftAP has a distinct MAC; use STA MAC consistently on both ends.
        esp_read_mac(message+sizeof b,ESP_MAC_WIFI_STA);
        const IPAddress broadcast = gw_wifi_broadcast_ip();
        if(gw_wifi_udp.beginPacket(broadcast,GW_WIFI_PORT)){
            gw_wifi_udp.write(message,sizeof message);
            gw_wifi_udp.endPacket();
        }
    }
}
// =======================================================
// RX Queue Pop
// =======================================================

static bool gw_rx_queue_pop(
    GwRxFrame &output
)
{
    bool success = false;


    portENTER_CRITICAL(
        &gw_rx_queue_mux
    );


    if (
        gw_rx_queue_count > 0
    )
    {
        memcpy(
            &output,

            &gw_rx_queue[
                gw_rx_queue_tail
            ],

            sizeof(output)
        );


        gw_rx_queue_tail =
            static_cast<uint8_t>(
                (
                    gw_rx_queue_tail +
                    1
                ) %
                GW_RX_QUEUE_CAPACITY
            );


        gw_rx_queue_count--;


        success = true;
    }


    portEXIT_CRITICAL(
        &gw_rx_queue_mux
    );


    return success;
}


// =======================================================
// Trusted Peer Check
// =======================================================

static bool gw_peer_is_enrolled()
{
    gw::PeerRecord peer{};
    const bool valid = gw::trust_copy_trusted_peer(GW_TRUSTED_PEER_ID, peer) &&
                       peer.valid && peer.trust_state == gw::TrustState::TRUSTED;
    gw::secure_zero(&peer, sizeof(peer));
    return valid;
}

// =======================================================
// Build AEAD AAD
// =======================================================
//
// Authenticated metadata:
//
// - wire header
// - session ID
// - key epoch
// - negotiated suite
// - directional context
// - intended receiver
// =======================================================

static bool gw_build_aad(
    const gw_ssip_wire_header_t &header,

    const gw::SessionSecrets &session,

    const gw::DirectionalContext &context,

    uint8_t receiver_id,

    uint8_t *output,

    size_t output_capacity,

    size_t &output_length
)
{
    output_length = 0;


    if (output == nullptr)
    {
        return false;
    }


    const size_t required =
        sizeof(header) +
        8 +
        4 +
        2 +
        1 +
        1;


    if (
        required >
        output_capacity
    )
    {
        return false;
    }


    memcpy(
        output + output_length,
        &header,
        sizeof(header)
    );


    output_length +=
        sizeof(header);


    write_u64_be(
        output + output_length,
        session.session_id
    );


    output_length += 8;


    write_u32_be(
        output + output_length,
        session.key_epoch
    );


    output_length += 4;


    write_u16_be(
        output + output_length,

        static_cast<uint16_t>(
            session.suite
        )
    );


    output_length += 2;


    output[
        output_length++
    ] =
        static_cast<uint8_t>(
            context.direction
        );


    output[
        output_length++
    ] =
        receiver_id;


    return true;
}


// =======================================================
// Reserve TX Counter
// =======================================================

static bool gw_reserve_tx_counter(
    uint64_t &counter
)
{
    gw::SessionSecrets *session =
        gw::handshake_active_session_mutable();


    if (session == nullptr)
    {
        return false;
    }


    gw::DirectionalContext *context =
        gw::context_tx(
            *session,
            gw_local_side()
        );


    if (context == nullptr)
    {
        return false;
    }


    // Reserve no further nonce once the hard counter ceiling is reached.
    // The policy-triggered rekey engine runs from comm_loop().
    if (!gw::counter_allows_next_packet(context->tx_counter)) {
        gw_set_fault(GW_FAULT_COUNTER, context->tx_counter, true);
        return false;
    }

    uint8_t nonce[GW_NONCE_LEN] = {};

    const gw::ContextStatus result =
        gw::context_reserve_tx(
            *context,
            counter,
            nonce
        );


    gw::secure_zero(
        nonce,
        sizeof(nonce)
    );


    if (
        result !=
        gw::ContextStatus::OK
    )
    {
        gw_set_fault(
            GW_FAULT_COUNTER,
            context->tx_counter,
            true
        );


        return false;
    }


    tx_counter_shadow =
        static_cast<uint32_t>(
            counter &
            0xFFFFFFFFULL
        );


    return true;
}


// =======================================================
// Secure Packet Transmission
// =======================================================

static bool gw_send_secure_packet_with_counter(
    GwSecureType packet_type,

    uint64_t counter,

    const uint8_t *plaintext,

    size_t plaintext_length
)
{
    if (
        plaintext == nullptr ||
        plaintext_length == 0 ||
        plaintext_length >
            GW_SSIP_MAX_SINGLE_PLAINTEXT
    )
    {
        return false;
    }


    gw::SessionSecrets *session =
        gw::handshake_active_session_mutable();


    if (
        session == nullptr ||
        !session->active ||
        gw::rekey_blocks_application_data_for_peer(GW_TRUSTED_PEER_ID)
    )
    {
        return false;
    }


    gw::DirectionalContext *context =
        gw::context_tx(
            *session,
            gw_local_side()
        );


    if (
        context == nullptr ||
        !context->active
    )
    {
        return false;
    }


    uint8_t packet[
        GW_MAX_PAYLOAD
    ] = {0};


    gw_ssip_wire_header_t header {};


    memcpy(
        header.magic,
        GW_SSIP_DATA_MAGIC,
        sizeof(header.magic)
    );


    header.protocol_major =
        gw::PROTOCOL_MAJOR;


    header.protocol_minor =
        gw::PROTOCOL_MINOR;


    header.type =
        static_cast<uint8_t>(
            packet_type
        );


    header.sender_id =
        GW_THIS_DEVICE_ID;


    write_u64_be(
        header.counter,
        counter
    );


    write_u16_be(
        header.ciphertext_length,

        static_cast<uint16_t>(
            plaintext_length
        )
    );


    memcpy(
        packet,
        &header,
        sizeof(header)
    );


    uint8_t nonce[
        GW_NONCE_LEN
    ] = {0};


    gw::crypto_build_nonce(
        context->nonce_prefix,
        counter,
        nonce
    );


    uint8_t aad[64] = {0};

    size_t aad_length = 0;


    if (
        !gw_build_aad(
            header,
            *session,
            *context,

            GW_TRUSTED_PEER_ID,

            aad,
            sizeof(aad),
            aad_length
        )
    )
    {
        gw::secure_zero(
            nonce,
            sizeof(nonce)
        );


        return false;
    }


    uint8_t *ciphertext =
        packet +
        sizeof(header);


    uint8_t *tag =
        ciphertext +
        plaintext_length;


    const bool encrypted =
        gw::crypto_aes256_gcm_encrypt(
            context->traffic_key,
            nonce,
            aad,
            aad_length,
            plaintext,
            plaintext_length,
            ciphertext,
            tag
        );


    gw::secure_zero(
        nonce,
        sizeof(nonce)
    );


    gw::secure_zero(
        aad,
        sizeof(aad)
    );


    if (!encrypted)
    {
        return false;
    }


    const size_t packet_length =
        sizeof(header) +
        plaintext_length +
        GW_TAG_LEN;


    if (
        packet_length >
        GW_MAX_PAYLOAD
    )
    {
        gw::secure_zero(
            packet,
            sizeof(packet)
        );


        return false;
    }


    if (packet_type != GwSecureType::ACK &&
        tx_waiting_ack && counter == tx_wait_counter64)
    {
        memcpy(tx_pending_frame, packet, packet_length);
        tx_pending_frame_length = packet_length;
    }

    const bool sent =
        gw_transport_send_raw(
            packet,
            packet_length
        );


    gw::secure_zero(
        packet,
        sizeof(packet)
    );


    return sent;
}


// =======================================================
// Send Authenticated ACK
// =======================================================

static void send_ack_for_counter(
    uint64_t acknowledged_counter
)
{
    if (!comm_session_ready())
    {
        return;
    }


    uint64_t ack_packet_counter = 0;


    if (
        !gw_reserve_tx_counter(
            ack_packet_counter
        )
    )
    {
        return;
    }


    uint8_t plaintext[8] = {0};


    write_u64_be(
        plaintext,
        acknowledged_counter
    );


    const bool sent =
        gw_send_secure_packet_with_counter(
            GwSecureType::ACK,
            ack_packet_counter,
            plaintext,
            sizeof(plaintext)
        );


    gw::secure_zero(
        plaintext,
        sizeof(plaintext)
    );


    gw_comm_log.print(
        "[SSIP] ACK for="
    );


    gw_comm_log.print(
        static_cast<uint32_t>(
            acknowledged_counter &
            0xFFFFFFFFULL
        )
    );


    gw_comm_log.print(
        " send="
    );


    gw_comm_log.println(
        sent
            ? "OK"
            : "FAIL"
    );
}


// =======================================================
// Send Next Fragment
// =======================================================

static bool tx_send_next_fragment()
{

    if (
        !comm_session_ready() ||
        !tx_fragment_active ||
        tx_waiting_ack
    )
    {
        return false;
    }


    if (
        tx_fragment_next_index >=
        tx_fragment_total
    )
    {
        tx_fragment_active = false;

        tx_fragment_done_event = true;

        tx_fragment_total_event =
            tx_fragment_total;


        gw_emit_status(
            GW_STATUS_LONG_MESSAGE_SENT,
            tx_fragment_total
        );


        return true;
    }


    const size_t offset =
        static_cast<size_t>(
            tx_fragment_next_index
        ) *
        GW_FRAG_DATA_MAX;


    const size_t remaining =
        tx_fragment_len -
        offset;


    size_t chunk_length =
        remaining;


    if (
        chunk_length >
        GW_FRAG_DATA_MAX
    )
    {
        chunk_length =
            GW_FRAG_DATA_MAX;
    }


    uint8_t fragment_plaintext[
        sizeof(gw_frag_wire_header_t) +
        GW_FRAG_DATA_MAX
    ] = {0};


    gw_frag_wire_header_t
        fragment_header {};


    write_u32_be(
        fragment_header.msg_id,
        tx_fragment_msg_id
    );


    write_u16_be(
        fragment_header.frag_index,
        tx_fragment_next_index
    );


    write_u16_be(
        fragment_header.frag_total,
        tx_fragment_total
    );


    write_u16_be(
        fragment_header.frag_len,

        static_cast<uint16_t>(
            chunk_length
        )
    );


    memcpy(
        fragment_plaintext,
        &fragment_header,
        sizeof(fragment_header)
    );


    memcpy(
        fragment_plaintext +
            sizeof(fragment_header),

        tx_fragment_payload +
            offset,

        chunk_length
    );


    const size_t plaintext_length =
        sizeof(fragment_header) +
        chunk_length;


    uint64_t counter = 0;


    if (
        !gw_reserve_tx_counter(
            counter
        )
    )
    {
        gw::secure_zero(
            fragment_plaintext,
            sizeof(fragment_plaintext)
        );


        return false;
    }


    tx_wait_counter64 =
        counter;


    tx_waiting_ack =
        true;


    tx_retry_count =
        0;


    tx_last_send_ms =
        millis();


    const bool sent =
        gw_send_secure_packet_with_counter(
            GwSecureType::FRAGMENT,
            counter,
            fragment_plaintext,
            plaintext_length
        );


    gw::secure_zero(
        fragment_plaintext,
        sizeof(fragment_plaintext)
    );


    gw_comm_log.print(
        "[SSIP] FRAG "
    );


    gw_comm_log.print(
        tx_fragment_next_index + 1
    );


    gw_comm_log.print("/");


    gw_comm_log.print(
        tx_fragment_total
    );


    gw_comm_log.print(
        " counter="
    );


    gw_comm_log.print(
        static_cast<uint32_t>(
            counter &
            0xFFFFFFFFULL
        )
    );


    gw_comm_log.print(
        " send="
    );


    gw_comm_log.println(
        sent
            ? "OK"
            : "FAIL"
    );


    if (!sent)
    {
        tx_waiting_ack =
            false;
            gw::secure_zero(tx_pending_frame, sizeof(tx_pending_frame));
            tx_pending_frame_length = 0;


        return false;
    }


    return true;

}


// =======================================================
// Process Secure SSIP Packet
// =======================================================

static void gw_process_secure_packet(
    const uint8_t *incoming_data,
    size_t length
)
{
    if (
        incoming_data == nullptr ||
        length <
            sizeof(gw_ssip_wire_header_t) +
            GW_TAG_LEN
    )
    {
        gw_set_fault(
            GW_FAULT_LEN_MISM,
            0,
            false
        );


        return;
    }


    gw_ssip_wire_header_t header {};


    memcpy(
        &header,
        incoming_data,
        sizeof(header)
    );


    if (
        memcmp(
            header.magic,
            GW_SSIP_DATA_MAGIC,
            sizeof(header.magic)
        ) != 0
    )
    {
        gw_set_fault(
            GW_FAULT_BAD_TYPE,
            0,
            false
        );


        return;
    }


    if (
        header.protocol_major !=
            gw::PROTOCOL_MAJOR ||

        header.protocol_minor !=
            gw::PROTOCOL_MINOR
    )
    {
        gw_set_fault(
            GW_FAULT_BAD_TYPE,
            0,
            false
        );


        return;
    }


    if (
        header.sender_id !=
        GW_TRUSTED_PEER_ID
    )
    {
        gw_set_fault(
            GW_FAULT_UNKNOWN_PEER,
            header.sender_id,
            false
        );


        gw_emit_status(
            GW_STATUS_UNKNOWN_PEER,
            header.sender_id
        );


        return;
    }


    if (header.type != static_cast<uint8_t>(GwSecureType::DATA) &&
        header.type != static_cast<uint8_t>(GwSecureType::ACK) &&
        header.type != static_cast<uint8_t>(GwSecureType::FRAGMENT)) {
        gw_set_fault(GW_FAULT_BAD_TYPE, 0, false);
        return;
    }

    const uint16_t ciphertext_length =
        read_u16_be(
            header.ciphertext_length
        );


    if (
        ciphertext_length == 0 ||
        ciphertext_length >
            GW_SSIP_MAX_SINGLE_PLAINTEXT
    )
    {
        gw_set_fault(
            GW_FAULT_LEN_MISM,
            0,
            false
        );


        return;
    }


    const size_t expected_length =
        sizeof(header) +
        ciphertext_length +
        GW_TAG_LEN;


    if (
        length !=
        expected_length
    )
    {
        gw_set_fault(
            GW_FAULT_LEN_MISM,
            0,
            false
        );


        return;
    }


    if (!comm_session_ready_for_peer(GW_TRUSTED_PEER_ID))
    {
        gw_set_fault(
            GW_FAULT_BAD_TYPE,
            0,
            false
        );


        return;
    }


    gw::SessionSecrets *session =
        gw::handshake_active_session_mutable();


    if (
        session == nullptr ||
        !session->active
    )
    {
        gw_set_fault(
            GW_FAULT_AUTH_FAIL,
            0,
            true
        );


        return;
    }


    gw::DirectionalContext *context =
        gw::context_rx(
            *session,
            gw_local_side()
        );


    if (
        context == nullptr ||
        !context->active
    )
    {
        gw_set_fault(
            GW_FAULT_AUTH_FAIL,
            0,
            true
        );


        return;
    }


    const uint64_t counter =
        read_u64_be(
            header.counter
        );


    // ===================================================
    // Authentication MUST happen before replay semantics.
    // =======================================================

    uint8_t nonce[
        GW_NONCE_LEN
    ] = {0};


    gw::crypto_build_nonce(
        context->nonce_prefix,
        counter,
        nonce
    );


    uint8_t aad[64] = {0};

    size_t aad_length = 0;


    if (
        !gw_build_aad(
            header,
            *session,
            *context,

            GW_THIS_DEVICE_ID,

            aad,
            sizeof(aad),
            aad_length
        )
    )
    {
        gw::secure_zero(
            nonce,
            sizeof(nonce)
        );


        return;
    }


    const uint8_t *ciphertext =
        incoming_data +
        sizeof(header);


    const uint8_t *tag =
        ciphertext +
        ciphertext_length;


    if (
        ciphertext_length >
        sizeof(rx_plain_buffer)
    )
    {
        gw::secure_zero(
            nonce,
            sizeof(nonce)
        );


        gw::secure_zero(
            aad,
            sizeof(aad)
        );


        gw_set_fault(
            GW_FAULT_LEN_MISM,
            counter,
            false
        );


        return;
    }


    const bool authenticated =
        gw::crypto_aes256_gcm_decrypt(
            context->traffic_key,
            nonce,
            aad,
            aad_length,
            ciphertext,
            ciphertext_length,
            tag,
            rx_plain_buffer
        );


    gw::secure_zero(
        nonce,
        sizeof(nonce)
    );


    gw::secure_zero(
        aad,
        sizeof(aad)
    );


    // ===================================================
    // Authentication First
    // =======================================================

    if (!authenticated)
    {
        gw::secure_zero(
            rx_plain_buffer,
            sizeof(rx_plain_buffer)
        );


        gw_set_fault(
            GW_FAULT_AUTH_FAIL,
            counter,
            true
        );


        gw_emit_status(
            GW_STATUS_AUTH_FAIL,

            static_cast<uint32_t>(
                counter &
                0xFFFFFFFFULL
            )
        );


        return;
    }


    // ===================================================
    // Replay Check After Authentication
    // =======================================================

    const gw::ReplayResult
        replay_result =
            gw::replay_check(
                context->replay,
                counter
            );


    // ===================================================
    // Authenticated Duplicate
    // =======================================================

    if (
        replay_result ==
        gw::ReplayResult::DUPLICATE
    )
    {
        const GwSecureType packet_type =
            static_cast<GwSecureType>(
                header.type
            );


        if (
            packet_type ==
                GwSecureType::DATA ||

            packet_type ==
                GwSecureType::FRAGMENT
        )
        {
            send_ack_for_counter(
                counter
            );
        }


        gw::secure_zero(
            rx_plain_buffer,
            sizeof(rx_plain_buffer)
        );


        return;
    }


    if (
        replay_result !=
        gw::ReplayResult::ACCEPT
    )
    {
        gw::secure_zero(
            rx_plain_buffer,
            sizeof(rx_plain_buffer)
        );


        gw_set_fault(
            GW_FAULT_REPLAY,
            counter,
            true
        );


        gw_emit_status(
            GW_STATUS_REPLAY_DETECTED,

            static_cast<uint32_t>(
                counter &
                0xFFFFFFFFULL
            )
        );


        return;
    }


    const GwSecureType packet_type =
        static_cast<GwSecureType>(
            header.type
        );


    // ===================================================
    // ACK
    // =======================================================

    if (
        packet_type ==
        GwSecureType::ACK
    )
    {
        if (
            ciphertext_length !=
            8
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_LEN_MISM,
                counter,
                false
            );


            return;
        }


        const uint64_t
            acknowledged_counter =
                read_u64_be(
                    rx_plain_buffer
                );


        if (
            !gw::replay_commit(
                context->replay,
                counter
            )
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_REPLAY,
                counter,
                true
            );


            return;
        }


        rx_counter_shadow =
            static_cast<uint32_t>(
                context->replay
                    .highest_counter &
                0xFFFFFFFFULL
            );


        gw_mark_session_activity();




        if (
            tx_waiting_ack &&

            acknowledged_counter ==
                tx_wait_counter64
        )
        {
            tx_ack_counter =
                static_cast<uint32_t>(
                    acknowledged_counter &
                    0xFFFFFFFFULL
                );


            tx_ack_event =
                true;


            gw_emit_status(
                GW_STATUS_ACK_OK,
                tx_ack_counter
            );


            tx_waiting_ack =
                false;


            tx_retry_count =
                0;

            gw::secure_zero(tx_pending_frame, sizeof(tx_pending_frame));
            tx_pending_frame_length = 0;


            if (
                tx_fragment_active
            )
            {
                tx_fragment_next_index++;


                if (
                    tx_fragment_next_index >=
                    tx_fragment_total
                )
                {
                    tx_fragment_active =
                        false;


                    tx_fragment_done_event =
                        true;


                    tx_fragment_total_event =
                        tx_fragment_total;


                    gw_emit_status(
                        GW_STATUS_LONG_MESSAGE_SENT,
                        tx_fragment_total
                    );


                    gw::secure_zero(
                        tx_fragment_payload,
                        sizeof(
                            tx_fragment_payload
                        )
                    );
                }
            }
        }




        gw::secure_zero(
            rx_plain_buffer,
            sizeof(rx_plain_buffer)
        );


        return;
    }


    // ===================================================
    // Normal Secure Application Data
    // =======================================================

    if (
        packet_type ==
        GwSecureType::DATA
    )
    {
        if (
            ciphertext_length >
            sizeof(rx_buffer) - 1
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_LEN_MISM,
                counter,
                false
            );


            return;
        }


        // Backpressure: do not overwrite a message the application has not
        // consumed, and do not ACK an undelivered message.
        if (rx_event)
        {
            gw::secure_zero(rx_plain_buffer, sizeof(rx_plain_buffer));
            return;
        }

        if (
            !gw::replay_commit(
                context->replay,
                counter
            )
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_REPLAY,
                counter,
                true
            );


            return;
        }


        rx_counter_shadow =
            static_cast<uint32_t>(
                context->replay
                    .highest_counter &
                0xFFFFFFFFULL
            );


        memcpy(
            rx_buffer,
            rx_plain_buffer,
            ciphertext_length
        );


        rx_buffer[
            ciphertext_length
        ] = '\0';


        rx_event =
            true;


        rx_secure_event =
            true;


        rx_fault_latched =
            false;


        gw_mark_session_activity();


        gw_emit_status(
            GW_STATUS_DATA_RX,
            ciphertext_length
        );


        send_ack_for_counter(
            counter
        );


        gw::secure_zero(
            rx_plain_buffer,
            sizeof(rx_plain_buffer)
        );


        return;
    }


    // ===================================================
    // Secure Fragment
    // =======================================================

    if (
        packet_type ==
        GwSecureType::FRAGMENT
    )
    {
        if (
            ciphertext_length <
            sizeof(
                gw_frag_wire_header_t
            )
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_FRAGMENT,
                counter,
                false
            );


            return;
        }


        gw_frag_wire_header_t
            fragment_header {};


        memcpy(
            &fragment_header,
            rx_plain_buffer,
            sizeof(fragment_header)
        );


        const uint32_t msg_id =
            read_u32_be(
                fragment_header.msg_id
            );


        const uint16_t frag_index =
            read_u16_be(
                fragment_header.frag_index
            );


        const uint16_t frag_total =
            read_u16_be(
                fragment_header.frag_total
            );


        const uint16_t frag_len =
            read_u16_be(
                fragment_header.frag_len
            );


        if (
            frag_len >
                GW_FRAG_DATA_MAX ||

            frag_total == 0 ||
            frag_total > (GW_MAX_LONG_MESSAGE + GW_FRAG_DATA_MAX - 1) /
                         GW_FRAG_DATA_MAX ||
            frag_len == 0 ||

            frag_index >=
                frag_total ||

            ciphertext_length !=
                sizeof(
                    gw_frag_wire_header_t
                ) +
                frag_len
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_FRAGMENT,
                counter,
                false
            );


            gw_emit_status(
                GW_STATUS_FRAGMENT_ERROR,
                frag_index
            );


            return;
        }


        const bool starts_new_message =
            frag_index == 0;

        if (starts_new_message && rx_event)
        {
            gw::secure_zero(rx_plain_buffer, sizeof(rx_plain_buffer));
            return;
        }


        // =================================================
        // Fragment Semantic Validation
        // =================================================

        if (!starts_new_message)
        {
            if (
                !rx_fragment_active ||

                msg_id !=
                    rx_fragment_msg_id ||

                frag_total !=
                    rx_fragment_total ||

                frag_index !=
                    rx_fragment_next_index
            )
            {
                gw::secure_zero(
                    rx_plain_buffer,
                    sizeof(rx_plain_buffer)
                );


                gw_set_fault(
                    GW_FAULT_FRAGMENT,
                    counter,
                    false
                );


                gw_emit_status(
                    GW_STATUS_FRAGMENT_ERROR,
                    frag_index
                );


                return;
            }
        }


        const size_t prospective_length =
            (
                starts_new_message
                    ? 0
                    : rx_reassembly_len
            ) +
            frag_len;


        if (
            prospective_length >
            GW_MAX_LONG_MESSAGE
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_FRAGMENT,
                counter,
                false
            );


            return;
        }


        // =================================================
        // Authentication succeeded.
        // Replay check succeeded.
        // Fragment semantics succeeded.
        //
        // Now replay state may be committed.
        // =================================================

        if (
            !gw::replay_commit(
                context->replay,
                counter
            )
        )
        {
            gw::secure_zero(
                rx_plain_buffer,
                sizeof(rx_plain_buffer)
            );


            gw_set_fault(
                GW_FAULT_REPLAY,
                counter,
                true
            );


            return;
        }


        rx_counter_shadow =
            static_cast<uint32_t>(
                context->replay
                    .highest_counter &
                0xFFFFFFFFULL
            );


        if (starts_new_message)
        {
            rx_fragment_active =
                true;


            rx_fragment_msg_id =
                msg_id;


            rx_fragment_total =
                frag_total;


            rx_fragment_next_index =
                0;


            rx_reassembly_len =
                0;


            gw::secure_zero(
                rx_reassembly_buffer,
                sizeof(
                    rx_reassembly_buffer
                )
            );
        }


        const uint8_t *fragment_data =
            rx_plain_buffer +
            sizeof(
                gw_frag_wire_header_t
            );


        memcpy(
            rx_reassembly_buffer +
                rx_reassembly_len,

            fragment_data,

            frag_len
        );


        rx_reassembly_len +=
            frag_len;


        rx_fragment_next_index++;


        rx_secure_event =
            true;


        rx_fault_latched =
            false;


        gw_mark_session_activity();


        gw_comm_log.print(
            "[SSIP] RX FRAG "
        );


        gw_comm_log.print(
            frag_index + 1
        );


        gw_comm_log.print("/");


        gw_comm_log.println(
            frag_total
        );


        send_ack_for_counter(
            counter
        );


        // =================================================
        // Complete Reassembly
        // =================================================

        if (
            rx_fragment_next_index >=
            rx_fragment_total
        )
        {
            size_t final_length =
                rx_reassembly_len;


            if (
                final_length >
                sizeof(rx_buffer) - 1
            )
            {
                final_length =
                    sizeof(rx_buffer) - 1;
            }


            memcpy(
                rx_buffer,
                rx_reassembly_buffer,
                final_length
            );


            rx_buffer[
                final_length
            ] = '\0';


            rx_event =
                true;


            gw_emit_status(
                GW_STATUS_LONG_MESSAGE_RX,
                final_length
            );


            rx_fragment_active =
                false;


            rx_reassembly_len =
                0;


            gw::secure_zero(
                rx_reassembly_buffer,
                sizeof(
                    rx_reassembly_buffer
                )
            );
        }


        gw::secure_zero(
            rx_plain_buffer,
            sizeof(rx_plain_buffer)
        );


        return;
    }


    // ===================================================
    // Authenticated but Unknown Secure Packet
    // =======================================================

    gw::secure_zero(
        rx_plain_buffer,
        sizeof(rx_plain_buffer)
    );


    gw_set_fault(
        GW_FAULT_BAD_TYPE,
        counter,
        true
    );
}


// =======================================================
// Process Queued ESP-NOW Frame
// =======================================================

static void gw_process_incoming_frame(
    const GwRxFrame &frame
)
{
    gw::DiscoveryBeacon announcement{};
    if (gw::discovery_decode(frame.data,frame.length,announcement)) {
        // Unknown nearby MACs may only populate an untrusted, bounded roster;
        // discovery alone never grants permission to send encrypted data.
        if(announcement.logical_id==GW_TRUSTED_PEER_ID &&
           gw_discovery_until!=0 &&
           static_cast<int32_t>(gw_discovery_until-millis())>=0) {
            gw_discovered.observe(frame.mac,announcement,
                       static_cast<uint8_t>(gw_local_side()),millis());
        }
        return;
    }
    if (
        !gw_mac_is_trusted_peer(
            frame.mac
        )
    )
    {
        gw_set_fault(
            GW_FAULT_UNKNOWN_PEER,
            0,
            true
        );


        return;
    }


    // ===================================================
    // Pairing Protocol
    // =======================================================

    if (
        gw::pairing_handle_packet(
            frame.data,
            frame.length
        )
    )
    {
        return;
    }


    // ===================================================
    // Authenticated Handshake
    // =======================================================

    if (
        gw::handshake_handle_peer_packet(
            GW_TRUSTED_PEER_ID,
            frame.data,
            frame.length
        )
    )
    {
        return;
    }


    // ===================================================
    // Authenticated rekey messages: source MAC was checked
    // BEFORE this dispatch, then mapped to the fixed peer ID.
    // ===================================================
    if (gw::rekey_handle_peer_packet(
            GW_TRUSTED_PEER_ID, frame.data, frame.length)) {
        return;
    }

    // ===================================================
    // Secure Data Packet
    // =======================================================

    if (
        frame.length >= 4 &&

        memcmp(
            frame.data,
            GW_SSIP_DATA_MAGIC,
            sizeof(
                GW_SSIP_DATA_MAGIC
            )
        ) == 0
    )
    {
        gw_process_secure_packet(
            frame.data,
            frame.length
        );


        return;
    }


    gw_comm_log.println(
        "[COMM] Unknown protocol packet"
    );


    gw_set_fault(
        GW_FAULT_BAD_TYPE,
        0,
        false
    );
}


// =======================================================
// ESP-NOW Receive Callback
// =======================================================
//
// No heavyweight cryptography is executed here.
// =======================================================

#if defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
static void on_espnow_recv(const esp_now_recv_info_t *info,
                           const uint8_t *incoming_data, int length)
{
    const uint8_t *mac_address = info ? info->src_addr : nullptr;
#else
static void on_espnow_recv(const uint8_t *mac_address,
                           const uint8_t *incoming_data, int length)
{
#endif
    if (
        mac_address == nullptr ||
        incoming_data == nullptr ||
        length <= 0 ||
        length >
            static_cast<int>(
                GW_MAX_PAYLOAD
            )
    )
    {
        return;
    }


    if (!gw_mac_is_trusted_peer(mac_address)) {
        gw::DiscoveryBeacon candidate{};
        if (!gw::discovery_decode(incoming_data,
                                  static_cast<size_t>(length),candidate)) return;
    }
    if (
        !gw_rx_queue_push(
            mac_address,
            incoming_data,

            static_cast<size_t>(
                length
            )
        )
    )
    {
        // Receive callback runs on the Wi-Fi task. Keep this path limited
        // to a counter and event flag; do not execute cryptography or log.
        ++gw_queue_drops;
        rx_fault_code = GW_FAULT_RX_QUEUE;
        rx_fault_counter = gw_queue_drops;
        rx_fault_event = true;
    }
}


// =======================================================
// ESP-NOW Send Callback
// =======================================================

#if defined(ESP_IDF_VERSION) && ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 5, 0)
static void on_espnow_send(
    const esp_now_send_info_t *tx_info,

    esp_now_send_status_t status
)
{
    static_cast<void>(
        tx_info
    );
#else
static void on_espnow_send(
    const uint8_t *mac_address,

    esp_now_send_status_t status
)
{
    static_cast<void>(
        mac_address
    );
#endif


    tx_done_event = true;


    tx_ok_event =
        status ==
        ESP_NOW_SEND_SUCCESS;


    activity_flag =
        tx_ok_event;
}


// =======================================================
// Clear Message-Level Runtime State
// =======================================================
//
// Does NOT delete:
//
// - persistent identity
// - persistent peer trust
// =======================================================

static void gw_clear_message_state()
{
    tx_waiting_ack = false;

    tx_wait_counter64 = 0;

    gw::secure_zero(tx_pending_frame, sizeof(tx_pending_frame));
    tx_pending_frame_length = 0;

    tx_retry_count = 0;

    tx_last_send_ms = 0;

    tx_counter_shadow = 0;

    rx_counter_shadow = 0;


    tx_fragment_len = 0;

    tx_fragment_msg_id = 0;

    tx_fragment_total = 0;

    tx_fragment_next_index = 0;

    tx_fragment_active = false;


    rx_reassembly_len = 0;

    rx_fragment_msg_id = 0;

    rx_fragment_total = 0;

    rx_fragment_next_index = 0;

    rx_fragment_active = false;


    gw::secure_zero(
        tx_fragment_payload,
        sizeof(
            tx_fragment_payload
        )
    );


    gw::secure_zero(
        rx_plain_buffer,
        sizeof(rx_plain_buffer)
    );


    gw::secure_zero(
        rx_reassembly_buffer,
        sizeof(
            rx_reassembly_buffer
        )
    );


    rx_secure_event = false;
    gw::secure_zero(rx_buffer, sizeof(rx_buffer));
    rx_event = false;
    rx_fault_latched = false;


    gw_session_id = 0;

    gw_last_session_activity_ms = 0;
}


// =======================================================
// Map Handshake Failure to Existing UI Faults
// =======================================================

static uint8_t gw_map_handshake_failure(
    gw::HandshakeFailure failure
)
{
    switch (failure)
    {
        case gw::HandshakeFailure::
            UNKNOWN_PEER:

        case gw::HandshakeFailure::
            PEER_NOT_TRUSTED:

            return
                GW_FAULT_UNKNOWN_PEER;


        case gw::HandshakeFailure::
            IDENTITY_MISMATCH:

        case gw::HandshakeFailure::
            INVALID_SIGNATURE:

        case gw::HandshakeFailure::
            INVALID_CONFIRMATION:

            return
                GW_FAULT_AUTH_FAIL;


        case gw::HandshakeFailure::
            TIMEOUT:

            return
                GW_FAULT_HANDSHAKE_TIMEOUT;


        default:

            return
                GW_FAULT_BAD_TYPE;
    }
}


// =======================================================
// Synchronize Pairing State
// =======================================================

static void gw_sync_pairing_state()
{
    const gw::PairingState state =
        gw::pairing_state();


    if (
        state ==
        last_pairing_state
    )
    {
        return;
    }


    last_pairing_state =
        state;


    gw_comm_log.print(
        "[PAIR] State="
    );


    gw_comm_log.println(
        gw::pairing_state_name()
    );


    if (state == gw::PairingState::WAIT_FINAL_ACK) {
        gw_emit_status(GW_STATUS_PAIRING_WAIT_FINAL_ACK, 0);
    }

    if (
        state ==
        gw::PairingState::PAIRED
    )
    {
        gw_comm_log.println(
            "[PAIR] Persistent trust established"
        );


#if GW_DEVICE_ROLE == GW_ROLE_TX

        if (
            gw_peer_is_enrolled() &&
            !comm_session_ready()
        )
        {
            comm_start_session();
        }

#endif
    }


    if (
        state ==
        gw::PairingState::FAILED
    )
    {
        gw_comm_log.print(
            "[PAIR] Failure="
        );


        gw_comm_log.println(
            gw::pairing_failure_name()
        );
    }
}


// =======================================================
// Synchronize Authenticated Handshake State
// =======================================================

static void gw_sync_handshake_state()
{
    const gw::HandshakeState state =
        gw::handshake_state();


    if (
        state ==
        last_handshake_state
    )
    {
        return;
    }


    last_handshake_state =
        state;


    gw_comm_log.print(
        "[SSIP] Handshake state="
    );


    gw_comm_log.println(
        gw::handshake_state_name()
    );


    switch (state)
    {
        case gw::HandshakeState::IDLE:
        {
            // A revoked or invalidated trust relationship can withdraw
            // the session independently of comm.cpp. Never leave UI
            // readiness falsely indicating an active session.
            if (gw_secure_session_active &&
                !gw::handshake_session_ready_for_peer(GW_TRUSTED_PEER_ID)) {
                gw_clear_message_state();
                gw_secure_session_active = false;
                gw_session_state = GW_SESSION_FAILED;
                gw_set_fault(GW_FAULT_SESSION_INVALIDATED, 0, true);
                gw_emit_status(GW_STATUS_SESSION_INVALIDATED, 0);
                last_handshake_failure_ms = millis();
            }
            break;
        }


        case gw::HandshakeState::
            HELLO_SENT:
        {
            gw_secure_session_active =
                false;


            gw_session_state =
                GW_SESSION_HELLO_SENT;


            gw_emit_status(
                GW_STATUS_HELLO_SENT,
                0
            );


            break;
        }


        case gw::HandshakeState::
            WAIT_INITIATOR_CONFIRM:
        {
            gw_secure_session_active =
                false;


            gw_session_state =
                GW_SESSION_KEY_REPLY_SENT;


            gw_emit_status(
                GW_STATUS_KEY_REPLY_SENT,
                0
            );


            break;
        }


        case gw::HandshakeState::
            INITIATOR_CONFIRM_SENT:
        {
            gw_secure_session_active =
                false;


            gw_session_state =
                GW_SESSION_KEY_REPLY_RECEIVED;


            gw_emit_status(
                GW_STATUS_KEY_REPLY_RECEIVED,
                0
            );


            break;
        }


        case gw::HandshakeState::ACTIVE:
        {
            const gw::SessionSecrets *session =
                gw::handshake_active_session();


            if (
                session == nullptr ||
                !session->active
            )
            {
                gw_secure_session_active =
                    false;


                gw_session_state =
                    GW_SESSION_FAILED;


                break;
            }


            gw_session_id =
                static_cast<uint32_t>(
                    session->session_id &
                    0xFFFFFFFFULL
                );


            gw_secure_session_active =
                true;


            gw_session_state =
                GW_SESSION_READY;


            rx_fault_latched =
                false;


            gw_mark_session_activity();


            gw_emit_status(
                GW_STATUS_SESSION_READY,
                gw_session_id
            );


            gw_comm_log.println(
                "[SSIP] AUTHENTICATED SESSION ACTIVE"
            );


            gw_comm_log.print(
                "[SSIP] Epoch="
            );


            gw_comm_log.println(
                session->key_epoch
            );


            break;
        }


        case gw::HandshakeState::FAILED:
        {
            const gw::HandshakeFailure
                failure =
                    gw::handshake_failure();


            gw_secure_session_active =
                false;


            gw_session_state =
                GW_SESSION_FAILED;


            const uint8_t fault =
                gw_map_handshake_failure(
                    failure
                );


            gw_set_fault(
                fault,
                0,
                true
            );


            gw_emit_status(
                GW_STATUS_HANDSHAKE_FAILED,

                static_cast<uint32_t>(
                    failure
                )
            );


            if (
                failure ==
                gw::HandshakeFailure::
                    TIMEOUT
            )
            {
                handshake_timeout_event =
                    true;


                // =========================================
                // CORRECTED NAMESPACE
                // =========================================

                handshake_timeout_retries =
                    gw::HANDSHAKE_MAX_RETRIES;
            }


            gw_comm_log.print(
                "[SSIP] Handshake failure="
            );


            gw_comm_log.println(
                gw::handshake_failure_name()
            );


            last_handshake_failure_ms =
                millis();


            // Destroy session and transient
            // handshake secrets.

            gw::handshake_reset();


            last_handshake_state =
                gw::HandshakeState::IDLE;


            break;
        }


        case gw::HandshakeState::
            UNINITIALIZED:

        default:
        {
            gw_secure_session_active =
                false;


            gw_session_state =
                GW_SESSION_FAILED;


            break;
        }
    }
}


// =======================================================
// Public Session Reset
// =======================================================

void comm_reset_session()
{
    // If rekey is in flight, this invalidates the affected session
    // before transient state is wiped; then reset all handshakes.
    gw::rekey_reset();
    gw::handshake_reset();


    gw_clear_message_state();


    gw_secure_session_active =
        false;


    gw_session_state =
        GW_SESSION_NONE;


    session_reset_event =
        true;


    gw_emit_status(
        GW_STATUS_SESSION_RESET,
        0
    );


    last_handshake_state =
        gw::handshake_state();


    gw_comm_log.println(
        "[COMM] Session reset"
    );
}


// =======================================================
// Session Ready
// =======================================================

bool comm_session_ready()
{
    return comm_session_ready_for_peer(GW_TRUSTED_PEER_ID);
}

bool comm_session_ready_for_peer(uint8_t trusted_peer_id)
{
    return gw_transport_ready &&
           comm_link_operational() &&
           trusted_peer_id == GW_TRUSTED_PEER_ID &&
           gw_peer_is_enrolled() &&
           gw::handshake_active_peer_count() == 1 &&
           gw::handshake_session_ready_for_peer(trusted_peer_id) &&
           !gw::rekey_blocks_application_data_for_peer(trusted_peer_id) &&
           gw_secure_session_active &&
           gw_session_state == GW_SESSION_READY;
}

bool comm_rekey_blocks_data_for_peer(uint8_t trusted_peer_id)
{
    return trusted_peer_id != GW_TRUSTED_PEER_ID ||
           gw::rekey_blocks_application_data_for_peer(trusted_peer_id);
}

// =======================================================
// Session State Name
// =======================================================

const char *
comm_session_state_name()
{
    switch (gw_session_state)
    {
        case GW_SESSION_NONE:

            return "NONE";


        case GW_SESSION_HELLO_SENT:

            return "HELLO_SENT";


        case GW_SESSION_KEY_REPLY_SENT:

            return "AUTH_REPLY_SENT";


        case GW_SESSION_KEY_REPLY_RECEIVED:

            return "KEY_CONFIRM";


        case GW_SESSION_READY:

            return "READY";


        case GW_SESSION_REKEYING:
            return "REKEYING";

        case GW_SESSION_FAILED:

            return "FAILED";


        default:

            return "UNKNOWN";
    }
}


// =======================================================
// Start Authenticated SSIP Session
// =======================================================

bool comm_start_session()
{
    if (!gw_transport_ready || !comm_link_operational() ||
        gw::rekey_busy()) return false;

#if GW_DEVICE_ROLE == GW_ROLE_TX

    if (comm_session_ready())
    {
        gw_comm_log.println(
            "[SSIP] Session already ready"
        );


        return true;
    }


    if (!gw_peer_is_enrolled())
    {
        gw_comm_log.println(
            "[SSIP] Cannot start session: peer not enrolled"
        );


        gw_session_state =
            GW_SESSION_NONE;


        return false;
    }


    comm_reset_session();


    const bool started =
        gw::handshake_start(
            GW_TRUSTED_PEER_ID
        );


    if (!started)
    {
        gw_secure_session_active =
            false;


        gw_session_state =
            GW_SESSION_FAILED;


        gw_comm_log.print(
            "[SSIP] Handshake start failed: "
        );


        gw_comm_log.println(
            gw::handshake_failure_name()
        );


        return false;
    }


    gw_session_state =
        GW_SESSION_HELLO_SENT;


    last_handshake_state =
        gw::handshake_state();


    gw_emit_status(
        GW_STATUS_HELLO_SENT,
        0
    );


    gw_comm_log.println(
        "[SSIP] Authenticated handshake started"
    );


    return true;

#else

    gw_comm_log.println(
        "[SSIP] RX waits for authenticated HELLO"
    );


    return false;

#endif
}


// =======================================================
// Send Secure Application Message
// =======================================================

bool comm_send(
    const uint8_t *payload,
    size_t length
)
{

    if (!comm_session_ready())
    {
        if (gw::rekey_busy_for_peer(GW_TRUSTED_PEER_ID)) {
            gw_emit_status(GW_STATUS_REKEY_DATA_BLOCKED, comm_get_key_epoch());
        }
        gw_comm_log.println("[SSIP] Session not ready / rekey pending");
        return false;
    }


    if (
        payload == nullptr ||
        length == 0
    )
    {
        return false;
    }


    if (
        tx_waiting_ack ||
        tx_fragment_active
    )
    {
        return false;
    }


    // ===================================================
    // Single Secure Packet
    // =======================================================

    if (
        length <=
        GW_SSIP_MAX_SINGLE_PLAINTEXT
    )
    {
        uint64_t counter = 0;


        if (
            !gw_reserve_tx_counter(
                counter
            )
        )
        {
            return false;
        }


        tx_wait_counter64 =
            counter;


        tx_waiting_ack =
            true;


        tx_retry_count =
            0;


        tx_last_send_ms =
            millis();


        const bool sent =
            gw_send_secure_packet_with_counter(
                GwSecureType::DATA,
                counter,
                payload,
                length
            );


        gw_comm_log.print(
            "[SSIP] TX DATA counter="
        );


        gw_comm_log.print(
            static_cast<uint32_t>(
                counter &
                0xFFFFFFFFULL
            )
        );


        gw_comm_log.print(
            " len="
        );


        gw_comm_log.print(
            length
        );


        gw_comm_log.print(
            " send="
        );


        gw_comm_log.println(
            sent
                ? "OK"
                : "FAIL"
        );


        if (!sent)
        {
            tx_waiting_ack =
                false;
            gw::secure_zero(tx_pending_frame, sizeof(tx_pending_frame));
            tx_pending_frame_length = 0;


            return false;
        }


        return true;
    }


    // ===================================================
    // Fragmented Long Message
    // =======================================================

    if (
        length >
        GW_MAX_LONG_MESSAGE
    )
    {
        gw_comm_log.println(
            "[SSIP] Long message too large"
        );


        return false;
    }


    memcpy(
        tx_fragment_payload,
        payload,
        length
    );


    tx_fragment_len =
        length;


    tx_fragment_msg_id =
        esp_random();


    if (
        tx_fragment_msg_id == 0
    )
    {
        tx_fragment_msg_id =
            1;
    }


    tx_fragment_total =
        static_cast<uint16_t>(
            (
                length +
                GW_FRAG_DATA_MAX -
                1
            ) /
            GW_FRAG_DATA_MAX
        );


    tx_fragment_next_index =
        0;


    tx_fragment_active =
        true;


    gw_comm_log.print(
        "[SSIP] Long message len="
    );


    gw_comm_log.print(
        length
    );


    gw_comm_log.print(
        " fragments="
    );


    gw_comm_log.println(
        tx_fragment_total
    );


    return
        tx_send_next_fragment();

}


// =======================================================
// Peer-aware communication: only provisioned physical peer is routable.
// A future multi-peer adapter must add explicit MAC-to-trust bindings,
// per-peer ACK/reassembly queues, and never infer MACs from sender IDs.
// =======================================================
bool comm_send_to_peer(uint8_t trusted_peer_id,
                       const uint8_t *payload, size_t length)
{
    return trusted_peer_id == GW_TRUSTED_PEER_ID && comm_send(payload, length);
}

bool comm_start_session_for_peer(uint8_t trusted_peer_id)
{
    return trusted_peer_id == GW_TRUSTED_PEER_ID && comm_start_session();
}

void comm_reset_peer_session(uint8_t trusted_peer_id)
{
    if (trusted_peer_id == GW_TRUSTED_PEER_ID) comm_reset_session();
}

// =======================================================
// Pairing API
// =======================================================

bool comm_has_trusted_peer()
{
    return
        gw_peer_is_enrolled();
}


bool comm_pairing_begin()
{

#if GW_DEVICE_ROLE == GW_ROLE_TX
    // Pairing still requires the locally selected endpoint and SAS.

    comm_reset_session();


    gw::pairing_reset();


    const bool result =
        gw::pairing_begin(
            GW_TRUSTED_PEER_ID,
            true
        );


    last_pairing_state =
        gw::pairing_state();


    return result;

#else

    return false;

#endif
}


bool comm_pairing_open()
{

#if GW_DEVICE_ROLE == GW_ROLE_RX
    comm_discovery_start();

    comm_reset_session();


    gw::pairing_reset();


    const bool result =
        gw::pairing_open_window(
            GW_TRUSTED_PEER_ID,
            true
        );


    last_pairing_state =
        gw::pairing_state();


    return result;

#else

    return false;

#endif
}


bool comm_pairing_confirm()
{
    return
        gw::pairing_confirm_local(
            true
        );
}


void comm_pairing_reject()
{
    gw::pairing_reject_local(
        true
    );
}


bool comm_pairing_active()
{
    const gw::PairingState state =
        gw::pairing_state();


    return
        state !=
            gw::PairingState::IDLE &&

        state !=
            gw::PairingState::PAIRED &&

        state !=
            gw::PairingState::FAILED &&

        state !=
            gw::PairingState::
                UNINITIALIZED;
}


bool comm_pairing_sas(
    char output[7]
)
{
    return
        gw::pairing_sas_string(
            output
        );
}


const char *
comm_pairing_state_name()
{
    return
        gw::pairing_state_name();
}


const char *
comm_pairing_candidate_name()
{
    return
        gw::pairing_candidate_callsign();
}


bool comm_pairing_candidate_fingerprint(
    char *output,
    size_t output_size,
    size_t bytes_to_show
)
{
    return
        gw::pairing_candidate_fingerprint_hex(
            output,
            output_size,
            bytes_to_show
        );
}


// =======================================================
// Local Trust Reset
// =======================================================

bool comm_forget_trusted_peer()
{
    comm_reset_session();


    gw::pairing_reset();


    gw::PeerRecord existing {};


    if (!gw::trust_ready()) return false;
    if (!gw::trust_copy_peer(GW_TRUSTED_PEER_ID, existing)) {
        // An absent entry is not an authorization to modify any record.
        return true;
    }


    const bool removed =
        gw::trust_remove_peer(
            GW_TRUSTED_PEER_ID,
            true
        );


    if (removed)
    {
        gw_comm_log.println(
            "[TRUST] Peer trust removed"
        );
    }


    return removed;
}


// =======================================================
// Communication Initialization
// =======================================================

void comm_init()
{
    gw_transport_ready = false;
    gw_self_test_ok = false;
    gw_secure_session_active = false;
    gw_session_state = GW_SESSION_NONE;
    if (!gw::identity_ready() || !gw::trust_ready()) {
        gw_set_fault(GW_FAULT_TRUST, 0, true);
        gw_session_state = GW_SESSION_FAILED;
        ui_oled_log("Identity/trust unavailable");
        return;
    }

    // SHA-256 known-answer check ("abc"). Passing this check is NOT a
    // security certification and does not attest secure boot or NVS.
    static const uint8_t abc[3] = {0x61, 0x62, 0x63};
    static const uint8_t sha_abc[gw::SHA256_SIZE] = {
        0xBA,0x78,0x16,0xBF,0x8F,0x01,0xCF,0xEA,
        0x41,0x41,0x40,0xDE,0x5D,0xAE,0x22,0x23,
        0xB0,0x03,0x61,0xA3,0x96,0x17,0x7A,0x9C,
        0xB4,0x10,0xFF,0x61,0xF2,0x00,0x15,0xAD
    };
    uint8_t digest[gw::SHA256_SIZE] = {};
    gw_self_test_ok = gw::crypto_sha256(abc, sizeof(abc), digest) &&
        gw::crypto_constant_time_equal(digest, sha_abc, sizeof(digest));
    gw::secure_zero(digest, sizeof(digest));
    if (!gw_self_test_ok) {
        gw_set_fault(GW_FAULT_SELF_TEST, 0, true);
        gw_session_state = GW_SESSION_FAILED;
        ui_oled_log("SHA-256 self-test failed");
        return;
    }

    if (!gw_load_device_kind()) {
        gw_session_state = GW_SESSION_FAILED;
        gw_set_fault(GW_FAULT_TRANSPORT_BINDING, 4, true);
        ui_oled_log("INVALID DEVICE SETTING");
        return;
    }

    if (!gw_load_transport_choice()) {
        gw_session_state = GW_SESSION_FAILED;
        gw_set_fault(GW_FAULT_TRANSPORT_BINDING, 0, true);
        ui_oled_log("INVALID TRANSPORT SETTING");
        return;
    }

    if(!gw_load_peer_address()) {
        gw_set_fault(GW_FAULT_TRANSPORT_BINDING,1,true);
        gw_session_state=GW_SESSION_FAILED;
        ui_oled_log("BAD PEER ADDRESS NVS");
        return;
    }
    if (gw_selected_transport == GwTransport::BLE_GATT) {
        WiFi.mode(WIFI_OFF);
        if(!gw_ble::begin(GW_DEVICE_ROLE==GW_ROLE_RX,gw_local_callsign())) {
            gw_session_state=GW_SESSION_FAILED;
            gw_set_fault(GW_FAULT_TRANSPORT_BINDING,3,true);
            ui_oled_log("BLE TRANSPORT UNAVAILABLE");
            return;
        }
        ui_oled_log("BLE GATT INITIALIZED");
    } else if (gw_selected_transport == GwTransport::WIFI_SOFTAP_UDP) {
#if GW_DEVICE_ROLE == GW_ROLE_TX
        WiFi.mode(WIFI_AP);
        if(!WiFi.softAP(GW_WIFI_SSID,GW_WIFI_DEMO_PASSWORD,1,false,1)){
            gw_session_state=GW_SESSION_FAILED;
            ui_oled_log("WI-FI AP FAILED");return;
        }
#else
        WiFi.mode(WIFI_STA);
        WiFi.begin(GW_WIFI_SSID,GW_WIFI_DEMO_PASSWORD);
        uint32_t start=millis();
        while(WiFi.status()!=WL_CONNECTED && millis()-start<8000UL)delay(20);
        if(WiFi.status()!=WL_CONNECTED){
            gw_session_state=GW_SESSION_FAILED;
            ui_oled_log("WI-FI PEER NOT FOUND");return;
        }
#endif
        if(!gw_wifi_udp.begin(GW_WIFI_PORT)){
            gw_session_state=GW_SESSION_FAILED;
            ui_oled_log("WI-FI UDP FAILED");return;
        }
        ui_oled_log("WI-FI AP/UDP READY");
    } else if (gw_selected_transport == GwTransport::UART_WIRED) {
        WiFi.mode(WIFI_OFF);
        Serial2.begin(GW_UART_BAUD, SERIAL_8N1,
                      GW_UART_RX_PIN, GW_UART_TX_PIN);
        // The ESP32 UART clock divisor can round the measured baud slightly.
        if (Serial2.baudRate() < (GW_UART_BAUD * 98UL) / 100UL ||
            Serial2.baudRate() > (GW_UART_BAUD * 102UL) / 100UL) {
            gw_session_state = GW_SESSION_FAILED;
            gw_set_fault(GW_FAULT_TRANSPORT_BINDING, 0, true);
            ui_oled_log("UART START FAILED");
            return;
        }
        ui_oled_log("WIRED UART READY");
    } else {
    WiFi.mode(
        WIFI_STA
    );


    if (
        esp_now_init() !=
        ESP_OK
    )
    {
        ui_oled_log(
            "ESP-NOW FAIL"
        );


        gw_session_state =
            GW_SESSION_FAILED;


        return;
    }


    ui_oled_log(
        "ESP-NOW OK"
    );


    // Both peers can transmit pairing, handshake,
    // secure data and ACK frames.

    if (esp_now_register_send_cb(on_espnow_send) != ESP_OK ||
        esp_now_register_recv_cb(on_espnow_recv) != ESP_OK) {
        gw_session_state = GW_SESSION_FAILED;
        gw_set_fault(GW_FAULT_TRANSPORT_BINDING, 0, true);
        ui_oled_log("ESP-NOW callback fail");
        return;
    }


    const bool added = gw_add_espnow_peer(peer_mac) &&
                       gw_add_espnow_peer(GW_BROADCAST_MAC);
    if (!added) {
        gw_comm_log.print("[COMM] Peer add failed");
        gw_session_state = GW_SESSION_FAILED;
        gw_set_fault(GW_FAULT_TRANSPORT_BINDING, 0, true);
        return;
    }


    } // end ESP-NOW-specific initialization

    // ===================================================
    // Pairing Engine
    // =======================================================

    if (
        !gw::pairing_init(
            GW_THIS_DEVICE_ID,
            gw_local_callsign()
        )
    )
    {
        gw_comm_log.println(
            "[PAIR] Initialization failed"
        );


        gw_session_state =
            GW_SESSION_FAILED;


        return;
    }


    gw::pairing_set_send_callback(
        gw_transport_send_raw
    );


    // ===================================================
    // Authenticated Handshake Engine
    // =======================================================

    if (
        !gw::handshake_init(
            GW_THIS_DEVICE_ID,
            gw_local_side()
        )
    )
    {
        gw_comm_log.println(
            "[SSIP] Handshake initialization failed"
        );


        gw_session_state =
            GW_SESSION_FAILED;


        return;
    }


    gw::handshake_set_send_callback(gw_transport_send_raw);
    gw::handshake_set_peer_send_callback(gw_transport_send_peer);

    if (!gw::rekey_init(GW_THIS_DEVICE_ID,
                        GW_TRUSTED_PEER_ID, gw_local_side())) {
        gw_session_state = GW_SESSION_FAILED;
        gw_set_fault(GW_FAULT_REKEY, 0, true);
        return;
    }
    gw::rekey_set_send_callback(gw_transport_send_raw);
    gw::rekey_set_peer_send_callback(gw_transport_send_peer);

    gw_transport_ready = true;
    if(gw_selected_transport==GwTransport::WIFI_SOFTAP_UDP)comm_discovery_start();
    gw_last_rekey_state = gw::rekey_state();
    gw_last_rekey_successes = gw::rekey_success_count();
    gw_last_rekey_failures = gw::rekey_failure_count();

    gw_clear_message_state();


    gw_secure_session_active =
        false;


    gw_session_state =
        GW_SESSION_NONE;


    last_pairing_state =
        gw::pairing_state();


    last_handshake_state =
        gw::handshake_state();


    gw_comm_log.println(
        "[COMM] SSIP transport ready"
    );


    gw_comm_log.print(
        "[COMM] Device ID=0x"
    );


    gw_comm_log.println(
        GW_THIS_DEVICE_ID,
        HEX
    );


    gw_comm_log.print(
        "[COMM] Expected peer ID=0x"
    );


    gw_comm_log.println(
        GW_TRUSTED_PEER_ID,
        HEX
    );


    gw_comm_log.print(
        "[COMM] Persistent trust="
    );


    gw_comm_log.println(
        gw_peer_is_enrolled()
            ? "YES"
            : "NO"
    );


#if GW_DEVICE_ROLE == GW_ROLE_RX

    ui_oled_log(
        "RX ready"
    );


    if (
        gw_peer_is_enrolled()
    )
    {
        ui_oled_log(
            "Trusted peer ready"
        );
    }
    else
    {
        ui_oled_log(
            "Pairing required"
        );
    }

#endif
}


// =======================================================
// Full 64-Bit Diagnostics
// =======================================================

uint64_t comm_get_session_id64()
{
    const gw::SessionSecrets *session =
        gw::handshake_active_session();


    if (session == nullptr)
    {
        return 0;
    }


    return
        session->session_id;
}


uint64_t comm_get_tx_counter64()
{
    const gw::SessionSecrets *session =
        gw::handshake_active_session();


    if (session == nullptr)
    {
        return 0;
    }


    const gw::DirectionalContext *context =
        gw::context_tx(
            *session,
            gw_local_side()
        );


    if (context == nullptr)
    {
        return 0;
    }


    return
        context->tx_counter;
}


uint64_t comm_get_rx_counter64()
{
    const gw::SessionSecrets *session =
        gw::handshake_active_session();


    if (session == nullptr)
    {
        return 0;
    }


    const gw::DirectionalContext *context =
        gw::context_rx(
            *session,
            gw_local_side()
        );


    if (
        context == nullptr ||
        !context->replay.initialized
    )
    {
        return 0;
    }


    return
        context->replay
            .highest_counter;
}


// =======================================================
// Existing TFT Diagnostic API
// =======================================================

uint32_t comm_get_session_id()
{
    return
        static_cast<uint32_t>(
            comm_get_session_id64() &
            0xFFFFFFFFULL
        );
}


uint32_t comm_get_tx_counter()
{
    return
        static_cast<uint32_t>(
            comm_get_tx_counter64() &
            0xFFFFFFFFULL
        );
}


uint32_t comm_get_rx_counter()
{
    return
        static_cast<uint32_t>(
            comm_get_rx_counter64() &
            0xFFFFFFFFULL
        );
}


// =======================================================
// TX Busy State
// =======================================================

bool comm_tx_busy()
{
    const gw::HandshakeState state = gw::handshake_state();
    const bool handshake_busy =
        state != gw::HandshakeState::IDLE &&
        state != gw::HandshakeState::ACTIVE &&
        state != gw::HandshakeState::FAILED &&
        state != gw::HandshakeState::UNINITIALIZED;
    return tx_waiting_ack || tx_fragment_active ||
           handshake_busy || comm_pairing_active();
}

// =======================================================
// TX / RX fragmentation diagnostic
// =======================================================
bool comm_fragment_active()
{
    return tx_fragment_active || rx_fragment_active;
}

// =======================================================
// Retry Count
// =======================================================

uint8_t comm_get_retry_count()
{
    return
        tx_retry_count;
}


// =======================================================
// Maximum Single-Packet Plaintext
// =======================================================

size_t comm_get_max_single_plaintext()
{
    return
        GW_SSIP_MAX_SINGLE_PLAINTEXT;
}


// =======================================================
// Diagnostics
// =======================================================

void comm_print_diagnostics()
{
    gw_comm_log.print(
        "[DIAG] Role="
    );


#if GW_DEVICE_ROLE == GW_ROLE_TX

    gw_comm_log.print(
        "TX"
    );

#else

    gw_comm_log.print(
        "RX"
    );

#endif


    gw_comm_log.print(
        " State="
    );


    gw_comm_log.print(
        comm_session_state_name()
    );


    gw_comm_log.print(
        " Secure="
    );


    gw_comm_log.print(
        comm_session_ready()
            ? "YES"
            : "NO"
    );


    gw_comm_log.print(
        " Trust="
    );


    gw_comm_log.print(
        gw_peer_is_enrolled()
            ? "YES"
            : "NO"
    );


    gw_comm_log.print(
        " Pair="
    );


    gw_comm_log.print(
        gw::pairing_state_name()
    );


    gw_comm_log.print(
        " HS="
    );


    gw_comm_log.print(
        gw::handshake_state_name()
    );


    gw_comm_log.print(
        " SID32=0x"
    );


    gw_comm_log.print(
        comm_get_session_id(),
        HEX
    );


    gw_comm_log.print(
        " TX="
    );


    gw_comm_log.print(
        comm_get_tx_counter()
    );


    gw_comm_log.print(
        " RX="
    );


    gw_comm_log.print(
        comm_get_rx_counter()
    );


    gw_comm_log.print(
        " AckWait="
    );


    gw_comm_log.print(
        tx_waiting_ack
            ? "YES"
            : "NO"
    );


    gw_comm_log.print(
        " Frag="
    );


    gw_comm_log.print(
        comm_fragment_active()
            ? "YES"
            : "NO"
    );


    gw_comm_log.print(" Rekey=");
    gw_comm_log.print(gw::rekey_state_name());
    gw_comm_log.print(" Epoch=");
    gw_comm_log.print(comm_get_key_epoch());
    gw_comm_log.print(
        " Heap="
    );


    gw_comm_log.println(
        ESP.getFreeHeap()
    );
}


// =======================================================
// Rekey transition reconciliation
// =======================================================
static void gw_cancel_pending_traffic_for_rekey()
{
    if (tx_waiting_ack || tx_fragment_active) {
        tx_timeout_counter = static_cast<uint32_t>(tx_wait_counter64);
        tx_timeout_event = true; // Application delivery status is uncertain.
    }
    tx_waiting_ack = false;
    tx_wait_counter64 = 0;
    tx_retry_count = 0;
    gw::secure_zero(tx_pending_frame, sizeof(tx_pending_frame));
    tx_pending_frame_length = 0;
    gw::secure_zero(tx_fragment_payload, sizeof(tx_fragment_payload));
    tx_fragment_len = 0;
    tx_fragment_active = false;
    tx_fragment_total = tx_fragment_next_index = 0;
    gw::secure_zero(rx_reassembly_buffer, sizeof(rx_reassembly_buffer));
    rx_reassembly_len = 0;
    rx_fragment_active = false;
    rx_fragment_total = rx_fragment_next_index = 0;
}

static void gw_sync_rekey_state()
{
    const gw::RekeyState state = gw::rekey_state();
    const bool blocked = gw::rekey_busy_for_peer(GW_TRUSTED_PEER_ID);
    if (state != gw_last_rekey_state) {
        gw_last_rekey_state = state;
        gw_comm_log.print("[REKEY] State=");
        gw_comm_log.println(gw::rekey_state_name());
    }
    if (blocked) {
        if (gw_session_state != GW_SESSION_REKEYING) {
            gw_cancel_pending_traffic_for_rekey();
            gw_session_state = GW_SESSION_REKEYING;
            gw_secure_session_active = false;
            gw_emit_status(GW_STATUS_REKEY_STARTED, comm_get_key_epoch());
        }
    } else if (state == gw::RekeyState::INVALIDATED ||
               state == gw::RekeyState::FAILED) {
        gw_cancel_pending_traffic_for_rekey();
        gw_clear_message_state();
        gw_secure_session_active = false;
        gw_session_state = GW_SESSION_FAILED;
        gw_set_fault(GW_FAULT_REKEY, static_cast<uint32_t>(gw::rekey_failure()), true);
        gw_emit_status(GW_STATUS_REKEY_FAILED, static_cast<uint32_t>(gw::rekey_failure()));
        last_handshake_failure_ms = millis();
        // File 13 already invalidates the affected peer on uncertain rekey.
        gw::handshake_reset_peer(GW_TRUSTED_PEER_ID);
        gw::rekey_reset();
        gw_last_rekey_state = gw::rekey_state();
    } else if (state == gw::RekeyState::IDLE &&
               gw_session_state == GW_SESSION_REKEYING &&
               gw::handshake_session_ready_for_peer(GW_TRUSTED_PEER_ID)) {
        gw_secure_session_active = true;
        gw_session_state = GW_SESSION_READY;
        gw_mark_session_activity();
        gw_emit_status(GW_STATUS_REKEY_COMPLETE, comm_get_key_epoch());
    }
    const uint32_t successes = gw::rekey_success_count();
    const uint32_t failures = gw::rekey_failure_count();
    gw_last_rekey_successes = successes;
    gw_last_rekey_failures = failures;
}

// =======================================================
// Main Communication Loop
// =======================================================

void comm_loop()
{
    // Process frames and all security logic only from the application task.
    // Callbacks are limited to copying frames and setting flags.
    gw_poll_uart();
    gw_poll_wifi();
    gw_poll_ble();
    gw_broadcast_discovery();
    GwRxFrame frame {};
    uint8_t processed = 0;
    while (processed < GW_RX_QUEUE_CAPACITY && gw_rx_queue_pop(frame))
    {
        gw_process_incoming_frame(frame);
        gw::secure_zero(&frame, sizeof(frame));
        ++processed;
    }

    gw::pairing_loop();
    gw::handshake_loop();
    gw_sync_pairing_state();
    gw_sync_handshake_state();
    if (gw_transport_ready) {
        gw::rekey_loop();
        gw_sync_rekey_state();
    }

    const uint32_t now = millis();

#if GW_DEVICE_ROLE == GW_ROLE_TX
    // The A side alone initiates fresh handshakes. Data TX below is duplex.
    if (gw_session_state == GW_SESSION_FAILED && gw_peer_is_enrolled() &&
        gw::handshake_state() == gw::HandshakeState::IDLE &&
        static_cast<uint32_t>(now - last_handshake_failure_ms) >=
            gw::HANDSHAKE_TIMEOUT_MS)
    {
        gw_comm_log.println("[SSIP] Retrying authenticated handshake");
        comm_start_session();
        return;
    }
#endif

    if (comm_session_ready() && gw_last_session_activity_ms != 0 &&
        static_cast<uint32_t>(now - gw_last_session_activity_ms) >=
            GW_SESSION_TIMEOUT_MS)
    {
        session_timeout_event = true;
        gw_set_fault(GW_FAULT_SESSION_TIMEOUT, 0, false);
        gw_emit_status(GW_STATUS_SESSION_TIMEOUT, 0);
        gw_comm_log.println("[SSIP] Inactivity timeout: drop session");
        comm_reset_session();
#if GW_DEVICE_ROLE == GW_ROLE_TX
        comm_start_session();
#endif
        return;
    }

    if (!comm_session_ready()) return;

    if (!tx_waiting_ack)
    {
        if (tx_fragment_active && !tx_send_next_fragment())
        {
            // Fail an interrupted fragmented message, rather than spinning
            // forever on a failed encrypted-frame construction/send.
            const uint32_t failed = static_cast<uint32_t>(tx_wait_counter64);
            gw::secure_zero(tx_fragment_payload, sizeof(tx_fragment_payload));
            tx_fragment_len = 0;
            tx_fragment_active = false;
            tx_timeout_counter = failed;
            tx_timeout_event = true;
            comm_reset_session();
#if GW_DEVICE_ROLE == GW_ROLE_TX
            comm_start_session();
#endif
        }
        return;
    }

    if (static_cast<uint32_t>(now - tx_last_send_ms) < GW_ACK_TIMEOUT_MS)
        return;

    if (tx_retry_count >= GW_MAX_RETRIES || tx_pending_frame_length == 0)
    {
        tx_waiting_ack = false;
        tx_timeout_counter = static_cast<uint32_t>(tx_wait_counter64);
        tx_timeout_event = true;
        gw_emit_status(GW_STATUS_ACK_TIMEOUT, tx_timeout_counter);
        gw_comm_log.print("[SSIP] ACK exhausted C=");
        gw_comm_log.println(tx_timeout_counter);
        comm_reset_session();
#if GW_DEVICE_ROLE == GW_ROLE_TX
        comm_start_session();
#endif
        return;
    }

    ++tx_retry_count;
    ++gw_retry_total;
    tx_last_send_ms = now;
    // EXACT same authenticated bytes: never regenerate GCM with old nonce.
    const bool sent = gw_transport_send_raw(
        tx_pending_frame, tx_pending_frame_length);
    gw_comm_log.print("[SSIP] ACK retry #");
    gw_comm_log.print(tx_retry_count);
    gw_comm_log.print(" C=");
    gw_comm_log.print(static_cast<uint32_t>(tx_wait_counter64));
    gw_comm_log.print(" queued=");
    gw_comm_log.println(sent ? "YES" : "NO");
}

// =======================================================
// Rekey UI / per-peer APIs (File 12-13 integration)
// =======================================================
bool comm_request_rekey_for_peer(uint8_t trusted_peer_id)
{
    if (!gw_transport_ready || trusted_peer_id != GW_TRUSTED_PEER_ID ||
        !comm_session_ready_for_peer(trusted_peer_id) ||
        tx_waiting_ack || tx_fragment_active || rx_fragment_active ||
        gw::rekey_busy_for_peer(trusted_peer_id)) return false;
    if (!gw::rekey_request_for_peer(trusted_peer_id, gw::RekeyReason::MANUAL))
        return false;
    gw_sync_rekey_state();
    return true;
}

bool comm_request_rekey()
{
    return comm_request_rekey_for_peer(GW_TRUSTED_PEER_ID);
}

bool comm_rekey_active()
{
    return gw::rekey_busy_for_peer(GW_TRUSTED_PEER_ID);
}

const char *comm_rekey_state_name()
{
    return gw::rekey_state_name();
}

uint32_t comm_get_key_epoch()
{
    const gw::SessionSecrets *s =
        gw::handshake_active_session_for_peer(GW_TRUSTED_PEER_ID);
    return s ? s->key_epoch : 0;
}

uint32_t comm_get_rekey_success_count()
{
    return gw::rekey_success_count();
}

uint32_t comm_get_rekey_failure_count()
{
    return gw::rekey_failure_count();
}

// =======================================================
// Security and transport diagnostics
// =======================================================
uint32_t comm_get_auth_failure_count() { return gw_auth_failures; }
uint32_t comm_get_replay_drop_count() { return gw_replay_drops; }
uint32_t comm_get_rx_queue_drop_count() { return gw_queue_drops; }
uint32_t comm_get_malformed_packet_count() { return gw_malformed_frames; }
uint32_t comm_get_retry_total() { return gw_retry_total; }
uint8_t comm_get_active_peer_count()
{
    // Only the configured physical peer is routable in this revision.
    return gw_transport_ready &&
        gw::handshake_session_ready_for_peer(GW_TRUSTED_PEER_ID) ? 1 : 0;
}
const char *comm_get_transport_name() {
    if(gw_selected_transport==GwTransport::BLE_GATT)return "BLE GATT";
    if(gw_selected_transport==GwTransport::WIFI_SOFTAP_UDP)return "WI-FI UDP";
    return gw_selected_transport == GwTransport::UART_WIRED ?
        "UART WIRED" : "ESP-NOW";
}

GwTransport comm_selected_transport() { return gw_selected_transport; }
gw::DeviceKind comm_selected_device_kind(){return gw_selected_device;}
const char* comm_selected_device_name() {
    const auto* p=gw::device_profile(gw_selected_device);
    return p ? p->name : "INVALID";
}
bool comm_transport_hardware_capable(GwTransport medium) {
    return gw::device_has_hardware(gw_selected_device,gw_transport_bit(medium));
}
bool comm_transport_compatible(GwTransport medium) {
    return gw::device_ssip_supported(gw_selected_device,gw_transport_bit(medium),
                                    gw_compiled_transport_mask());
}
bool comm_link_operational() {
    return comm_transport_compatible(gw_selected_transport) &&
           (gw_selected_transport != GwTransport::BLE_GATT || gw_ble::connected());
}
bool comm_save_device_kind(gw::DeviceKind kind) {
    if (!gw::device_profile(kind) || kind==gw_selected_device ||
        comm_session_ready() || comm_pairing_active() || comm_tx_busy()) return false;
    Preferences p;
    if (!p.begin("gw_link",false)) return false;
    size_t n=p.putUChar("device",static_cast<uint8_t>(kind));
    p.end();
    if(n!=1) return false;
    comm_reset_session(); // caller MUST reboot after successful write
    gw_transport_ready=false;
    return true;
}


bool comm_save_transport_choice(GwTransport medium) {
    if (!comm_transport_compatible(medium)) return false;
    if (medium == gw_selected_transport) return false;
    // This is a physical-UI-initiated configuration action, never a
    // remote control frame. A fresh reboot MUST follow success.
    Preferences p;
    if (!p.begin("gw_link", false)) return false;
    const size_t stored = p.putUChar("medium", static_cast<uint8_t>(medium));
    p.end();
    if (stored != 1) return false;
    comm_reset_session();
    gw_transport_ready = false;
    return true;
}

void comm_discovery_start() {
    if (!gw_transport_ready || !comm_transport_compatible(gw_selected_transport) ||
        gw_selected_transport==GwTransport::UART_WIRED)return;
    gw_discovered.clear();
    gw_discovery_until=millis()+12000UL;
    gw_last_beacon_at=millis()-1701UL;
}
bool comm_discovery_scanning(){
    return gw_transport_ready && gw_discovery_until &&
           static_cast<int32_t>(gw_discovery_until-millis())>=0;
}
size_t comm_discovery_count(){return gw_discovered.count(millis());}
bool comm_discovery_get(size_t index,GwDiscoveredPeer &out){
    const auto* p=gw_discovered.at(index,millis());
    if(!p)return false;
    memcpy(out.mac,p->mac,6);out.logical_id=p->logical_id;
    memcpy(out.name,p->name,sizeof out.name);return true;
}
bool comm_get_selected_peer_mac(uint8_t output[6]){
    if(!output)return false;
    portENTER_CRITICAL(&gw_peer_address_mux);
    memcpy(output,peer_mac,6);
    portEXIT_CRITICAL(&gw_peer_address_mux);
    return true;
}
static bool gw_select_physical_endpoint(const uint8_t target_mac[6],
                                        uint8_t logical_id) {
    if(!gw_transport_ready || !comm_transport_compatible(gw_selected_transport) ||
       comm_session_ready() || comm_pairing_active() ||
       logical_id!=GW_TRUSTED_PEER_ID ||
       !gw::discovery_valid_mac(target_mac))return false;
    uint8_t old_address[6]{};
    portENTER_CRITICAL(&gw_peer_address_mux);
    memcpy(old_address,peer_mac,6);
    portEXIT_CRITICAL(&gw_peer_address_mux);
    if(memcmp(old_address,target_mac,6)==0)return true;
    // Changing the selected MAC is an explicit local routing action, NOT
    // trust transfer: the stored static public key for this peer_id remains
    // pinned. comm_reset_session() invalidates old keys, and only successful
    // signature/3DH/key-confirmation checks can make this route usable.
    IPAddress ip;
    if(gw_selected_transport==GwTransport::WIFI_SOFTAP_UDP &&
       !gw_lookup_endpoint(target_mac,ip))return false;
    if(gw_selected_transport==GwTransport::ESP_NOW &&
       !gw_add_espnow_peer(target_mac))return false;
    if(gw_selected_transport==GwTransport::BLE_GATT &&
       !gw_ble::connect_selected(target_mac))return false;
    Preferences p;
    if(!p.begin("gw_link",false))return false;
    const size_t n=p.putBytes("peer_mac",target_mac,6);
    p.end();
    if(n!=6)return false;
    comm_reset_session();
    portENTER_CRITICAL(&gw_peer_address_mux);
    memcpy(peer_mac,target_mac,6);
    portEXIT_CRITICAL(&gw_peer_address_mux);
    if(gw_selected_transport==GwTransport::ESP_NOW &&
       esp_now_is_peer_exist(old_address)) (void)esp_now_del_peer(old_address);
    if(gw_selected_transport==GwTransport::WIFI_SOFTAP_UDP){
        gw_selected_ip=ip;gw_selected_ip_valid=true;
    }
    gw_discovery_until=0;
    return true;
}
bool comm_select_discovered_peer(size_t index) {
    GwDiscoveredPeer target{};
    return comm_discovery_get(index,target) &&
           gw_select_physical_endpoint(target.mac,target.logical_id);
}
bool comm_save_discovered_endpoint(size_t discovery_index) {
    GwDiscoveredPeer d{};
    if(!comm_discovery_get(discovery_index,d) ||
       d.logical_id!=GW_TRUSTED_PEER_ID ||
       !gw::discovery_valid_mac(d.mac))return false;
    gw::ContactBook book{};
    if(!gw_load_contact_book(book))return false; // corruption fails closed
    gw::Contact contact{};
    contact.valid=1;
    memcpy(contact.mac,d.mac,6);
    contact.device_kind=static_cast<uint8_t>(gw_selected_device);
    contact.transport=static_cast<uint8_t>(gw_selected_transport);
    memcpy(contact.label,d.name,sizeof(contact.label));
    if(!gw::contact_add(book,contact))return false;
    return gw_save_contact_book(book);
}
size_t comm_saved_endpoint_count() {
    gw::ContactBook book{};
    return gw_load_contact_book(book)?book.count:0;
}
bool comm_saved_endpoint_get(size_t index,GwSavedEndpoint &out) {
    memset(&out,0,sizeof(out));
    gw::ContactBook book{};
    if(!gw_load_contact_book(book) || index>=book.count)return false;
    const auto &c=book.entries[index];
    memcpy(out.mac,c.mac,6);
    memcpy(out.label,c.label,sizeof(out.label));
    out.device_kind=c.device_kind;
    out.transport=static_cast<GwTransport>(c.transport);
    return true;
}
bool comm_select_saved_endpoint(size_t index) {
    GwSavedEndpoint p{};
    return comm_saved_endpoint_get(index,p) &&
           p.device_kind==static_cast<uint8_t>(gw_selected_device) &&
           p.transport==gw_selected_transport &&
           gw_select_physical_endpoint(p.mac,GW_TRUSTED_PEER_ID);
}

bool comm_clear_saved_endpoints(bool locally_authorized) {
    if (!locally_authorized || comm_session_ready() ||
        comm_pairing_active()) return false;
    gw::ContactBook empty{};
    gw::contact_book_init(empty);
    return gw_save_contact_book(empty); // not trust deletion, only addresses
}

bool comm_secure_boot_enabled()
{
#if defined(GW_HAS_SECURE_BOOT_PROBE)
    return esp_secure_boot_enabled();
#else
    // Do not claim secure boot without a runtime verification API.
    return false;
#endif
}

bool comm_flash_encryption_enabled()
{
#if defined(GW_HAS_FLASH_ENCRYPTION_PROBE)
    return esp_flash_encryption_enabled();
#else
    return false;
#endif
}

bool comm_nvs_protection_enabled()
{
    // Whole-flash encryption does not establish that an NVS encryption
    // provider, its keys and read protection are correctly provisioned.
    // File 4 intentionally reports UNKNOWN, never VERIFIED_ENCRYPTED.
    gw::StorageHealth h{};
    return gw::storage_get_health(h) == gw::StorageStatus::OK &&
           h.protection == gw::StorageProtection::VERIFIED_ENCRYPTED;
}

bool comm_self_test_passed() { return gw_self_test_ok; }
