#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>

#include "aircraft_config.h"
#include "comm.h"
#include "gw_identity.h"
#include "gw_security_runtime.h"
#include "gw_trust.h"
#include "gw_security_types.h"

namespace {

constexpr uint32_t SERIAL_BAUD = 115200;
constexpr uint32_t TELEMETRY_INTERVAL_MS = 1000;
constexpr char NODE_ID[] = "GW-MN001";
constexpr char FIRMWARE_VERSION[] = "1.0.0-wifi-gwssip";

uint32_t last_telemetry_ms = 0;
String serial_line;

const uint8_t HOST_LINK_TAG[6] = {
    AERONEXUS_HOST_LINK_TAG_0,
    AERONEXUS_HOST_LINK_TAG_1,
    AERONEXUS_HOST_LINK_TAG_2,
    AERONEXUS_HOST_LINK_TAG_3,
    AERONEXUS_HOST_LINK_TAG_4,
    AERONEXUS_HOST_LINK_TAG_5,
};

bool local_authorized() {
    return digitalRead(AERONEXUS_LOCAL_AUTHORIZE_PIN) == LOW;
}

char hex_digit(uint8_t nibble) {
    nibble &= 0x0F;
    return nibble < 10 ? char('0' + nibble) : char('A' + (nibble - 10));
}

String hex_encode(const uint8_t* data, size_t length) {
    String out;
    out.reserve(length * 2);
    for (size_t i = 0; i < length; ++i) {
        out += hex_digit(data[i] >> 4);
        out += hex_digit(data[i]);
    }
    return out;
}

int hex_value(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return 10 + c - 'a';
    if (c >= 'A' && c <= 'F') return 10 + c - 'A';
    return -1;
}

bool hex_decode_exact(const String& text, uint8_t* output, size_t output_length) {
    if (!output || text.length() != output_length * 2) return false;
    for (size_t i = 0; i < output_length; ++i) {
        int hi = hex_value(text[i * 2]);
        int lo = hex_value(text[i * 2 + 1]);
        if (hi < 0 || lo < 0) return false;
        output[i] = static_cast<uint8_t>((hi << 4) | lo);
    }
    return true;
}

void configure_first_boot_link_defaults() {
    Preferences p;
    if (!p.begin("gw_link", false)) {
        Serial.println("GW_BOOT_ERROR:NVS_OPEN");
        return;
    }

    // DeviceKind::ESP32_S3 == 1 in the existing device catalog.
    if (!p.isKey("device")) {
        p.putUChar("device", static_cast<uint8_t>(gw::DeviceKind::ESP32_S3));
    }

    // GwTransport::WIFI_SOFTAP_UDP == 2 in the existing comm API.
    if (!p.isKey("medium")) {
        p.putUChar("medium", static_cast<uint8_t>(GwTransport::WIFI_SOFTAP_UDP));
    }

    // Wi-Fi's peer tag is routing metadata only. Cryptographic trust is stored
    // independently by gw_trust and verified during the signed handshake.
    if (!p.isKey("peer_mac")) {
        p.putBytes("peer_mac", HOST_LINK_TAG, sizeof(HOST_LINK_TAG));
    }
    p.end();
}

void print_public_identity() {
    uint8_t public_key[gw::P256_PUBLIC_SIZE] = {};
    uint8_t fingerprint[gw::SHA256_SIZE] = {};
    if (!gw::identity_copy_public_key(public_key) ||
        !gw::identity_copy_fingerprint(fingerprint)) {
        Serial.println("GW_PROVISION_ERROR:IDENTITY_UNAVAILABLE");
        gw::secure_zero(public_key, sizeof(public_key));
        gw::secure_zero(fingerprint, sizeof(fingerprint));
        return;
    }

    Serial.print("GW_PROVISION_IDENTITY:");
    Serial.print(hex_encode(public_key, sizeof(public_key)));
    Serial.print(":");
    Serial.println(hex_encode(fingerprint, sizeof(fingerprint)));

    gw::secure_zero(public_key, sizeof(public_key));
    gw::secure_zero(fingerprint, sizeof(fingerprint));
}

void provision_host_identity(const String& public_key_hex) {
    if (!local_authorized()) {
        Serial.println("GW_PROVISION_ERROR:HOLD_BOOT_BUTTON");
        return;
    }

    uint8_t public_key[gw::P256_PUBLIC_SIZE] = {};
    if (!hex_decode_exact(public_key_hex, public_key, sizeof(public_key))) {
        Serial.println("GW_PROVISION_ERROR:BAD_PUBLIC_KEY_HEX");
        return;
    }

    comm_reset_session();
    const bool ok = gw::trust_enroll_peer(
        GW_TRUSTED_PEER_ID,
        "MISSIONNEXUS",
        public_key,
        true
    );
    gw::secure_zero(public_key, sizeof(public_key));

    Serial.println(ok ? "GW_PROVISION_OK:HOST_TRUSTED" : "GW_PROVISION_ERROR:TRUST_ENROLL_FAILED");
}

void reset_host_trust() {
    if (!local_authorized()) {
        Serial.println("GW_PROVISION_ERROR:HOLD_BOOT_BUTTON");
        return;
    }
    comm_reset_session();
    const bool ok = gw::trust_remove_peer(GW_TRUSTED_PEER_ID, true);
    Serial.println(ok ? "GW_PROVISION_OK:TRUST_RESET" : "GW_PROVISION_ERROR:TRUST_RESET_FAILED");
}

void print_status() {
    StaticJsonDocument<512> doc;
    doc["protocol"] = "GW-AIRCRAFT-STATUS";
    doc["version"] = 1;
    doc["node_id"] = NODE_ID;
    doc["firmware"] = FIRMWARE_VERSION;
    doc["wifi_connected"] = WiFi.status() == WL_CONNECTED;
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi_dbm"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
    doc["transport"] = comm_get_transport_name();
    doc["trusted_peer"] = comm_has_trusted_peer();
    doc["secure_session_active"] = comm_session_ready();
    doc["session_state"] = comm_session_state_name();
    doc["session_id"] = String(static_cast<unsigned long long>(comm_get_session_id64()), HEX);
    doc["key_epoch"] = comm_get_key_epoch();
    doc["tx_counter"] = static_cast<unsigned long long>(comm_get_tx_counter64());
    doc["rx_counter"] = static_cast<unsigned long long>(comm_get_rx_counter64());
    doc["auth_failures"] = comm_get_auth_failure_count();
    doc["replay_drops"] = comm_get_replay_drop_count();
    serializeJson(doc, Serial);
    Serial.println();
}

void handle_serial_command(const String& line) {
    if (line == "GW:EXPORT_IDENTITY") {
        print_public_identity();
        return;
    }
    if (line.startsWith("GW:TRUST_HOST:")) {
        provision_host_identity(line.substring(strlen("GW:TRUST_HOST:")));
        return;
    }
    if (line == "GW:TRUST_RESET") {
        reset_host_trust();
        return;
    }
    if (line == "GW:STATUS") {
        print_status();
        return;
    }
    if (line == "GW:REKEY") {
        Serial.println(comm_request_rekey() ? "GW_REKEY:STARTED" : "GW_REKEY:REJECTED");
        return;
    }
    if (line.length()) {
        Serial.println("GW_PROVISION_ERROR:UNKNOWN_COMMAND");
    }
}

void poll_serial_commands() {
    while (Serial.available() > 0) {
        char c = static_cast<char>(Serial.read());
        if (c == '\r') continue;
        if (c == '\n') {
            serial_line.trim();
            handle_serial_command(serial_line);
            serial_line = "";
            continue;
        }
        if (serial_line.length() < 512) serial_line += c;
        else serial_line = "";
    }
}

void send_device_health_if_due() {
    const uint32_t now = millis();
    if (!comm_session_ready() || comm_tx_busy() || now - last_telemetry_ms < TELEMETRY_INTERVAL_MS) {
        return;
    }
    last_telemetry_ms = now;

    // Keep the first live payload comfortably under GoblinWisp's 216-byte
    // single-packet plaintext limit. Flight/sensor/camera metadata can later
    // use the same comm_send() path; >216-byte messages use existing fragments.
    StaticJsonDocument<256> doc;
    doc["type"] = "DEVICE_HEALTH";
    doc["node"] = NODE_ID;
    doc["up_ms"] = now;
    doc["rssi"] = WiFi.RSSI();
    doc["heap"] = ESP.getFreeHeap();
    doc["psram"] = ESP.getFreePsram();

    uint8_t payload[200] = {};
    const size_t length = serializeJson(doc, payload, sizeof(payload));
    if (length > 0 && length <= sizeof(payload)) {
        (void)comm_send(payload, length);
    }
}

void deliver_received_application_data() {
    if (!rx_event || !rx_secure_event) return;

    // Existing comm.cpp publishes complete authenticated application data into
    // rx_buffer only after AEAD and replay checks. For now log the command; a
    // future flight-controller command adapter must add its own authorization.
    Serial.print("GW_SECURE_RX:");
    Serial.println(reinterpret_cast<const char*>(rx_buffer));
    rx_event = false;
    rx_secure_event = false;
}

} // namespace

void setup() {
    Serial.begin(SERIAL_BAUD);
    delay(250);

    pinMode(AERONEXUS_LOCAL_AUTHORIZE_PIN, INPUT_PULLUP);
    configure_first_boot_link_defaults();

    Serial.println("GW_AIRCRAFT_BOOT:START");
    if (!gw::security_runtime_init()) {
        Serial.print("GW_AIRCRAFT_BOOT:SECURITY_FOUNDATION_FAILED:");
        Serial.println(gw::security_runtime_state_name());
        return;
    }

    comm_init();
    if (!comm_link_operational()) {
        Serial.println("GW_AIRCRAFT_BOOT:TRANSPORT_NOT_OPERATIONAL");
    } else {
        Serial.println("GW_AIRCRAFT_BOOT:READY");
    }
    print_status();
}

void loop() {
    poll_serial_commands();
    comm_loop();
    deliver_received_application_data();
    send_device_health_if_due();
    delay(1);
}
