
#ifndef COMM_H
#define COMM_H

#include <stddef.h>
#include <stdint.h>

#include "gw_security_types.h"
#include "gw_security_policy.h"
#include "gw_device_catalog.h"

// =======================================================
// GoblinWisp transport role and logical device identity
//
// IMPORTANT: Both PlatformIO environments must explicitly
// define GW_DEVICE_ROLE. Never default an unconfigured RX
// build to TX; doing so also selects the wrong peer MAC.
// =======================================================

#define GW_ROLE_TX 1
#define GW_ROLE_RX 2

#ifndef GW_DEVICE_ROLE
#error "GW_DEVICE_ROLE must be specified as 1 (goblin_tx) or 2 (goblin_rx) in platformio.ini"
#endif

#if (GW_DEVICE_ROLE != GW_ROLE_TX) && (GW_DEVICE_ROLE != GW_ROLE_RX)
#error "Unsupported GW_DEVICE_ROLE: select GW_ROLE_TX or GW_ROLE_RX"
#endif

#define GW_DEVICE_ID_TX 0xA1
#define GW_DEVICE_ID_RX 0xB1

#if GW_DEVICE_ROLE == GW_ROLE_TX
#define GW_THIS_DEVICE_ID   GW_DEVICE_ID_TX
#define GW_TRUSTED_PEER_ID  GW_DEVICE_ID_RX
#else
#define GW_THIS_DEVICE_ID   GW_DEVICE_ID_RX
#define GW_TRUSTED_PEER_ID  GW_DEVICE_ID_TX
#endif

// These IDs are logical routing labels, NOT proof of peer
// identity. Only authenticated identity keys and a trusted
// physical transport binding can authorize traffic.

// =======================================================
// Legacy application/diagnostic packet type identifiers
//
// Retained for source compatibility. These constants DO NOT
// authorize sending or accepting plaintext application
// packets. The current secure packet format is defined in
// comm.cpp and cryptographically bound to the session.
// =======================================================

#define GW_TYPE_DATA       0x01
#define GW_TYPE_ACK        0x02
#define GW_TYPE_ENC_DATA   0x03
#define GW_TYPE_ENC_ACK    0x04
#define GW_TYPE_ENC_FRAG   0x05
#define GW_TYPE_HELLO      0x10
#define GW_TYPE_KEY_REPLY  0x11

// =======================================================
// Fault codes (preserve existing numeric values)
// =======================================================

#define GW_FAULT_REPLAY             1
#define GW_FAULT_BAD_TYPE           5
#define GW_FAULT_LEN_MISM           6
#define GW_FAULT_AUTH_FAIL          7
#define GW_FAULT_DECRYPT_FAIL       8
#define GW_FAULT_HANDSHAKE_TIMEOUT  9
#define GW_FAULT_SESSION_TIMEOUT   10
#define GW_FAULT_UNKNOWN_PEER      11
#define GW_FAULT_FRAGMENT          12
#define GW_FAULT_TRUST             19
#define GW_FAULT_COUNTER           20
#define GW_FAULT_RX_QUEUE          21
#define GW_FAULT_REKEY             22
#define GW_FAULT_PLATFORM_SECURITY 23
#define GW_FAULT_SELF_TEST         24

// New diagnostics: must be emitted by comm.cpp (File 15)
// before the UI can receive them.
#define GW_FAULT_SESSION_INVALIDATED 25
#define GW_FAULT_TRANSPORT_BINDING  26

// =======================================================
// Cryptographic and transport size compatibility
//
// Real encrypted sessions use the constants in
// gw_security_types.h. These macros exist for existing
// comm.cpp / UI code and must remain synchronized.
// =======================================================

#define GW_TAG_LEN     16
#define GW_KEY_LEN     32
#define GW_NONCE_LEN   12
#define GW_RANDOM_LEN  16

#define GW_DEVICE_ID_LEN 1

// Old, unauthenticated packet-layout names are retained
// for compatibility; they must NOT be used to construct
// authenticated pairing or handshake frames.
#define GW_HELLO_PAYLOAD_LEN     (GW_DEVICE_ID_LEN + GW_RANDOM_LEN)
#define GW_KEY_REPLY_PAYLOAD_LEN (GW_DEVICE_ID_LEN + GW_RANDOM_LEN)

// Actual authenticated session IDs are 64-bit. The old
// 32-bit UI getter and legacy layout are kept separately.
#define GW_SECURE_SESSION_ID_LEN   8
#define GW_LEGACY_UI_SESSION_ID_LEN 4
#define GW_SESSION_ID_LEN GW_LEGACY_UI_SESSION_ID_LEN

// =======================================================
// Handshake and inactivity timeout compatibility
//
// The authoritative handshake timeout/retry policy is in
// gw_security_policy.h. The inactivity watchdog below is
// not a replacement for the maximum session-age policy.
// File 15 must enforce session age and rekey policy too.
// =======================================================

#define GW_HANDSHAKE_TIMEOUT_MS 10000UL
#define GW_HANDSHAKE_MAX_RETRIES 4

// Inactivity watchdog: five minutes without session
// activity. Previous 300000000UL was ~83 hours and did
// not provide a useful inactivity timeout.
#define GW_SESSION_TIMEOUT_MS 300000UL

// =======================================================
// ESP-NOW payload sizing / application fragmentation
//
// Legacy ESP-NOW transport limit for the current boards.
// The secure packet header, GCM tag and fragment header
// must ALL fit within one GW_MAX_PAYLOAD frame.
// =======================================================

#define GW_MAX_PAYLOAD       250
#define GW_FRAG_DATA_MAX    192
#define GW_MAX_LONG_MESSAGE 1024

// =======================================================
// Diagnostics and UI compatibility status codes
//
// Existing values 0..21 are unchanged. New codes require
// corresponding comm.cpp and UI handling in later files.
// =======================================================

#define GW_DIAG_HEARTBEAT_MS           5000
#define GW_STATUS_NONE                0
#define GW_STATUS_HELLO_SENT          1
#define GW_STATUS_HELLO_RECEIVED      2
#define GW_STATUS_KEY_REPLY_SENT      3
#define GW_STATUS_KEY_REPLY_RECEIVED  4
#define GW_STATUS_SESSION_READY       5
#define GW_STATUS_SESSION_RESET       6
#define GW_STATUS_HELLO_RETRY         7
#define GW_STATUS_HANDSHAKE_FAILED    8
#define GW_STATUS_SESSION_TIMEOUT     9
#define GW_STATUS_ACK_OK             10
#define GW_STATUS_ACK_TIMEOUT        11
#define GW_STATUS_LONG_MESSAGE_SENT  12
#define GW_STATUS_LONG_MESSAGE_RX    13
#define GW_STATUS_UNKNOWN_PEER       14
#define GW_STATUS_DATA_RX            15
#define GW_STATUS_FRAGMENT_ERROR     16
#define GW_STATUS_AUTH_FAIL          17
#define GW_STATUS_REPLAY_DETECTED    18
#define GW_STATUS_REKEY_STARTED      19
#define GW_STATUS_REKEY_COMPLETE     20
#define GW_STATUS_REKEY_FAILED       21

#define GW_STATUS_PAIRING_WAIT_FINAL_ACK 22
#define GW_STATUS_PEER_REVOKED         23
#define GW_STATUS_SESSION_INVALIDATED  24
#define GW_STATUS_REKEY_DATA_BLOCKED   25

// =======================================================
// Legacy header (NOT the authenticated SSIP wire header)
//
// Do not use this to parse encrypted traffic. Its 32-bit
// counter and missing identity/epoch fields are unsafe for
// use as a current secure-session packet format.
// =======================================================

#pragma pack(push, 1)
struct gw_header_t {
    uint8_t type;
    uint32_t counter;
    uint16_t payload_length;
};
#pragma pack(pop)

// =======================================================
// Application-facing session states
//
// Preserve numeric values for existing TFT event logic.
// Only comm.cpp may publish GW_SESSION_READY after an
// authenticated handshake and trusted-peer verification.
// =======================================================

typedef enum {
    GW_SESSION_NONE               = 0,
    GW_SESSION_HELLO_SENT         = 1,
    GW_SESSION_KEY_REPLY_SENT     = 2,
    GW_SESSION_KEY_REPLY_RECEIVED = 3,
    GW_SESSION_READY              = 4,
    GW_SESSION_REKEYING           = 5,
    GW_SESSION_FAILED             = 6
} gw_session_state_t;

// =======================================================
// Existing shared events, owned by src/comm.cpp
//
// 'volatile' preserves the original UI/ESP-NOW interface;
// it is NOT a thread-synchronization primitive. ESP-NOW
// callbacks should only enqueue bounded copies; comm_loop
// must do cryptography and publish state on the main task.
// =======================================================

extern volatile bool rx_event;
extern volatile bool rx_secure_event;
extern uint8_t rx_buffer[GW_MAX_LONG_MESSAGE + 1];

extern volatile bool rx_fault_event;
extern volatile uint8_t rx_fault_code;
extern volatile uint32_t rx_fault_counter;
extern volatile bool rx_fault_latched;

extern volatile bool gw_secure_session_active;
extern volatile gw_session_state_t gw_session_state;

extern volatile bool rx_ack_event;
extern volatile uint32_t rx_ack_counter;
extern volatile bool tx_ack_event;
extern volatile uint32_t tx_ack_counter;
extern volatile bool tx_timeout_event;
extern volatile uint32_t tx_timeout_counter;

extern volatile bool tx_fragment_done_event;
extern volatile uint16_t tx_fragment_total_event;

extern volatile bool handshake_retry_event;
extern volatile uint8_t handshake_retry_count_event;
extern volatile bool handshake_timeout_event;
extern volatile uint8_t handshake_timeout_retries;
extern volatile bool session_timeout_event;
extern volatile bool session_reset_event;

extern volatile bool gw_status_event;
extern volatile uint8_t gw_status_code;
extern volatile uint32_t gw_status_value;

// ESP-NOW TX completion diagnostics already defined in
// the existing comm.cpp; exposing them is source-compatible.
extern volatile bool tx_done_event;
extern volatile bool tx_ok_event;

// =======================================================
// Current one-peer communication API (unchanged)
// =======================================================

void comm_init();
void comm_loop();

// Copies/encrypts application payload only when a verified
// active session permits data; false otherwise.
bool comm_send(const uint8_t *payload, size_t length);

bool comm_session_ready();
bool comm_start_session();
void comm_reset_session();
const char *comm_session_state_name();
void comm_print_diagnostics();

// =======================================================
// Authenticated rekey: legacy/default peer API (unchanged)
// =======================================================

bool comm_request_rekey();
bool comm_rekey_active();
const char *comm_rekey_state_name();
uint32_t comm_get_key_epoch();
uint32_t comm_get_rekey_success_count();
uint32_t comm_get_rekey_failure_count();

// =======================================================
// Locally authorized pairing UI API (unchanged)
//
// All authorization must originate from actual UI/physical
// confirmation. Never translate an incoming radio flag
// directly into a locally authorized pairing action.
// =======================================================

bool comm_has_trusted_peer();
bool comm_pairing_begin();
bool comm_pairing_open();
bool comm_pairing_confirm();
void comm_pairing_reject();
bool comm_pairing_active();
bool comm_pairing_sas(char output[7]);
const char *comm_pairing_state_name();
const char *comm_pairing_candidate_name();
bool comm_pairing_candidate_fingerprint(
    char *output, size_t output_size, size_t bytes_to_show = 8);
bool comm_forget_trusted_peer();

// =======================================================
// Peer-addressed transport API: declarations for File 15
//
// DO NOT call these before src/comm.cpp implements them.
// One peer_id must map to exactly one authorized ESP-NOW
// MAC and a verified active session. The packet's claimed
// sender_id must not be used as the sole routing proof.
// Traffic must be blocked during ambiguous rekey states.
// =======================================================

bool comm_session_ready_for_peer(uint8_t trusted_peer_id);
bool comm_start_session_for_peer(uint8_t trusted_peer_id);
void comm_reset_peer_session(uint8_t trusted_peer_id);

bool comm_send_to_peer(
    uint8_t trusted_peer_id,
    const uint8_t *payload,
    size_t length);

bool comm_request_rekey_for_peer(uint8_t trusted_peer_id);
bool comm_rekey_blocks_data_for_peer(uint8_t trusted_peer_id);

// Transport selection changes only the physical carrier, never peer trust.
// Each board must be configured identically. A new boot/handshake is required.
// UART uses hardware Serial2: RX GPIO16, TX GPIO17, 3.3 V TTL, crossed TX/RX.
enum class GwTransport : uint8_t { ESP_NOW = 0, UART_WIRED = 1, WIFI_SOFTAP_UDP = 2, BLE_GATT = 3 };
GwTransport comm_selected_transport();
// Stores selection in NVS and invalidates the current session on success.
// Caller MUST immediately restart the device following successful change.
bool comm_save_transport_choice(GwTransport transport);

// Hardware profiles are hints only. A profile doesn't install firmware or
// detect an attached device; only a successful signed SSIP handshake proves
// the selected peer is live and trustworthy.
gw::DeviceKind comm_selected_device_kind();
const char* comm_selected_device_name();
bool comm_save_device_kind(gw::DeviceKind kind); // reboot after success
bool comm_transport_hardware_capable(GwTransport transport);
bool comm_transport_compatible(GwTransport transport);
bool comm_link_operational();


// =======================================================
// Existing compatibility and 64-bit diagnostics
//
// 32-bit getters may truncate values. They must never be
// used for nonce, replay, or security epoch calculations.
// =======================================================

uint32_t comm_get_session_id();
uint32_t comm_get_tx_counter();
uint32_t comm_get_rx_counter();

uint64_t comm_get_session_id64();
uint64_t comm_get_tx_counter64();
uint64_t comm_get_rx_counter64();

bool comm_tx_busy();
bool comm_fragment_active();
uint8_t comm_get_retry_count();
size_t comm_get_max_single_plaintext();

// =======================================================
// Security and transport diagnostics
// =======================================================

uint32_t comm_get_auth_failure_count();
uint32_t comm_get_replay_drop_count();
uint32_t comm_get_rx_queue_drop_count();
uint32_t comm_get_malformed_packet_count();
uint32_t comm_get_retry_total();
uint8_t comm_get_active_peer_count();
const char *comm_get_transport_name();

// Platform-security results must reflect actual hardware
// configuration; never infer them from a build flag alone.
bool comm_secure_boot_enabled();
bool comm_flash_encryption_enabled();
bool comm_nvs_protection_enabled();
bool comm_self_test_passed();

// =======================================================
// Compile-time layout, policy and compatibility checks
// =======================================================

static_assert(sizeof(gw_header_t) == 7,
              "Legacy diagnostic header layout changed");
static_assert(GW_TAG_LEN == gw::GCM_TAG_SIZE &&
              GW_KEY_LEN == gw::AES256_KEY_SIZE &&
              GW_NONCE_LEN == gw::GCM_NONCE_SIZE,
              "Transport crypto sizes differ from security types");
static_assert(GW_HANDSHAKE_TIMEOUT_MS == gw::HANDSHAKE_TIMEOUT_MS &&
              GW_HANDSHAKE_MAX_RETRIES == gw::HANDSHAKE_MAX_RETRIES,
              "Comm and security handshake policies disagree");
static_assert(GW_SECURE_SESSION_ID_LEN == sizeof(uint64_t) &&
              GW_LEGACY_UI_SESSION_ID_LEN == sizeof(uint32_t),
              "Secure session IDs must be 64-bit");
static_assert(GW_FRAG_DATA_MAX > 0 &&
              GW_FRAG_DATA_MAX + 10 + 18 + GW_TAG_LEN <= GW_MAX_PAYLOAD,
              "Fragment payload exceeds authenticated ESP-NOW frame limit");
static_assert(GW_MAX_LONG_MESSAGE >= GW_FRAG_DATA_MAX,
              "Maximum message length must support fragmentation");
static_assert(GW_STATUS_REKEY_FAILED == 21 &&
              GW_SESSION_READY == 4 &&
              GW_SESSION_FAILED == 6,
              "Existing TFT status or session values changed");

// Discovery candidates are UNAUTHENTICATED until locally SAS-paired.
// The selected peer is only one active peer at a time.
struct GwDiscoveredPeer {
    uint8_t mac[6];
    uint8_t logical_id;
    char name[24];
};
void comm_discovery_start();
bool comm_discovery_scanning();
size_t comm_discovery_count();
bool comm_discovery_get(size_t index, GwDiscoveredPeer &out);
bool comm_select_discovered_peer(size_t index);
bool comm_get_selected_peer_mac(uint8_t output[6]);
// Durable untrusted endpoint directory (max 8). This never changes trust.
struct GwSavedEndpoint {
    uint8_t mac[6];
    uint8_t device_kind;
    GwTransport transport;
    char label[24];
};
bool comm_save_discovered_endpoint(size_t discovery_index);
size_t comm_saved_endpoint_count();
bool comm_saved_endpoint_get(size_t index, GwSavedEndpoint &out);
bool comm_select_saved_endpoint(size_t index);
bool comm_clear_saved_endpoints(bool locally_authorized);


#endif // COMM_H
