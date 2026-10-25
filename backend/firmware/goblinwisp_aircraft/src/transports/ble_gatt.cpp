// BLE GATT transport: accepts only GoblinWisp SSIP frames (max 250 bytes).
// The outer chunk framing is untrusted and deliberately does not grant trust.
// Intended for original ESP32-WROOM Arduino core BLE library; requires two-board
// build/flash and radio interoperability tests before production deployment.
#include "gw_ble_link.h"
#include "gw_uart_framing.h"
#include <Arduino.h>
#include <cstring>

#if defined(ARDUINO_ARCH_ESP32) && defined(__has_include)
# if __has_include(<BLEDevice.h>) && __has_include(<BLEServer.h>)
#  define GW_HAVE_ESP32_BLE 1
# endif
#endif

#ifdef GW_HAVE_ESP32_BLE
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEClient.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <BLEScan.h>

namespace gw_ble {
namespace {
// Unique identifiers must match on both devices; this is not a Bluetooth
// encryption key, nor a cryptographic authorization mechanism.
static const char* SERVICE_UUID = "5cb29182-2ff2-45d6-8818-e83c0239b7a1";
static const char* PIPE_UUID = "5cb29183-2ff2-45d6-8818-e83c0239b7a1";
static BLEServer* server = nullptr;
static BLECharacteristic* local_characteristic = nullptr;
static BLEClient* client = nullptr;
static BLERemoteCharacteristic* remote_characteristic = nullptr;
static bool peripheral_mode = false;
static bool started = false;
static uint32_t last_scan_ms = 0;
static gw::UartFrameDecoder decoder;
static uint32_t last_data_ms = 0;
// Callbacks run on BT task. Never decrypt or update UI inside callbacks.
static portMUX_TYPE rx_mux = portMUX_INITIALIZER_UNLOCKED;
static constexpr size_t QUEUE_CAPACITY = 2048;
static uint8_t byte_queue[QUEUE_CAPACITY]{};
static size_t q_head = 0, q_tail = 0, q_count = 0;
static volatile uint32_t bytes_dropped = 0;
void collect_bytes(const uint8_t* bytes, size_t length) {
    if (!bytes || !length || length > 128) return;
    portENTER_CRITICAL(&rx_mux);
    if (length > QUEUE_CAPACITY - q_count) {
        ++bytes_dropped;
        // Incomplete frames are ignored by the SSIP authentication layer.
        q_head = q_tail = q_count = 0;
    } else {
        for (size_t i = 0; i < length; ++i) {
            byte_queue[q_tail] = bytes[i];
            q_tail = (q_tail + 1) % QUEUE_CAPACITY;
        }
        q_count += length;
    }
    portEXIT_CRITICAL(&rx_mux);
}
class WriteEvents : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* ch) override {
        const auto value = ch->getValue(); // String on core 3.x, std::string on 2.x
        collect_bytes(reinterpret_cast<const uint8_t*>(value.c_str()), value.length());
    }
};
void notify_events(BLERemoteCharacteristic*, uint8_t* value, size_t length, bool) {
    collect_bytes(value, length);
}
class ServerEvents : public BLEServerCallbacks {
    void onDisconnect(BLEServer*) override {
        // Connection loss invalidates the bearer. The SSIP session must be
        // reset by the application loop before further traffic.
        BLEDevice::startAdvertising();
    }
};
static bool mac_to_ble_address(const uint8_t bytes[6], char buffer[18]) {
    if (!bytes || !buffer || (bytes[0] & 1)) return false;
    snprintf(buffer, 18, "%02x:%02x:%02x:%02x:%02x:%02x",
             bytes[0],bytes[1],bytes[2],bytes[3],bytes[4],bytes[5]);
    return true;
}
static bool text_to_mac(const char* text, uint8_t out[6]) {
    if (!text || !out) return false;
    unsigned fields[6] = {};
    if (sscanf(text, "%2x:%2x:%2x:%2x:%2x:%2x", &fields[0], &fields[1],
               &fields[2], &fields[3], &fields[4], &fields[5]) != 6) return false;
    for (unsigned i = 0; i < 6; ++i) out[i] = static_cast<uint8_t>(fields[i]);
    return (out[0] & 1) == 0;
}
static BLEScanResults* gw_scan_results_pointer(BLEScanResults &r) { return &r; }
static BLEScanResults* gw_scan_results_pointer(BLEScanResults *r) { return r; }
} // namespace
bool compiled() { return true; }
bool begin(bool peripheral, const char* local_name) {
    if (started || !local_name) return false;
    peripheral_mode = peripheral;
    BLEDevice::init(local_name);
    BLEDevice::setMTU(23); // 20-byte ATT payload, do not assume larger MTU
    if (peripheral_mode) {
        server = BLEDevice::createServer();
        if (!server) return false;
        server->setCallbacks(new ServerEvents());
        BLEService* svc = server->createService(SERVICE_UUID);
        if (!svc) return false;
        local_characteristic = svc->createCharacteristic(
            PIPE_UUID, BLECharacteristic::PROPERTY_WRITE |
                       BLECharacteristic::PROPERTY_NOTIFY);
        if (!local_characteristic) return false;
        local_characteristic->setCallbacks(new WriteEvents());
        local_characteristic->addDescriptor(new BLE2902());
        svc->start();
        BLEAdvertising* advertising = BLEDevice::getAdvertising();
        advertising->addServiceUUID(SERVICE_UUID);
        advertising->setScanResponse(true);
        BLEDevice::startAdvertising();
    } else {
        client = BLEDevice::createClient();
        if (!client) return false;
    }
    started = true;
    return true;
}
bool connected() {
    return started && (peripheral_mode ?
        (server && server->getConnectedCount() > 0) :
        (client && client->isConnected() && remote_characteristic != nullptr));
}
bool connect_selected(const uint8_t address[6]) {
    if (!started || peripheral_mode || !client || connected()) return false;
    char addr[18];
    if (!mac_to_ble_address(address, addr)) return false;
    BLEAddress target(addr);
    if (!client->connect(target)) return false;
    BLERemoteService* svc = client->getService(BLEUUID(SERVICE_UUID));
    if (!svc) { client->disconnect(); return false; }
    BLERemoteCharacteristic* ch = svc->getCharacteristic(BLEUUID(PIPE_UUID));
    if (!ch || !ch->canWrite() || !ch->canNotify()) {
        client->disconnect(); return false;
    }
    ch->registerForNotify(notify_events);
    remote_characteristic = ch;
    decoder.reset();
    return true;
}
bool send(const uint8_t* frame, size_t length) {
    if (!connected() || !frame || length == 0 || length > 250) return false;
    const uint8_t header[4] = {0x47,0x57,static_cast<uint8_t>(length),
                               static_cast<uint8_t>(~static_cast<uint8_t>(length))};
    // BLE characteristic writes/notifications are packetized independently of
    // the SSIP message. Use the same host-tested serial framing as UART.
    uint8_t full[254]{};
    memcpy(full, header, sizeof header);
    memcpy(full + sizeof header, frame, length);
    const size_t total = length + sizeof header;
    for (size_t off = 0; off < total; off += 20) {
        if (!connected()) return false;
        const size_t take = ((total - off) < 20) ? (total - off) : 20;
        if (peripheral_mode) {
            local_characteristic->setValue(full + off, take);
            local_characteristic->notify();
            delay(8); // throttle notifications; SSIP still handles retries
        } else {
            // Request an ATT response to avoid silent congestion on writes.
            remote_characteristic->writeValue(full + off, take, true);
        }
    }
    return connected();
}
void poll(FrameHandler on_frame) {
    if (!started || !on_frame) return;
    static uint32_t last_dropped = 0;
    if (last_dropped != bytes_dropped) {
        decoder.reset();
        last_dropped=bytes_dropped;
    }
    if (!connected()) decoder.reset();
    if (decoder.in_progress() && uint32_t(millis() - last_data_ms) > 1500U)
        decoder.reset();
    for (unsigned budget=0;budget<600;++budget) {
        uint8_t v=0;bool have=false;
        portENTER_CRITICAL(&rx_mux);
        if(q_count){v=byte_queue[q_head];q_head=(q_head+1)%QUEUE_CAPACITY;--q_count;have=true;}
        portEXIT_CRITICAL(&rx_mux);
        if (!have) break;
        last_data_ms=millis();
        size_t out_len=0;
        uint8_t frame[250]{};
        if (decoder.consume(v,frame,sizeof frame,out_len)==gw::UartFrameResult::READY)
            on_frame(frame,out_len);
    }
}
void scan_candidates(CandidateHandler on_candidate) {
    if (!started || peripheral_mode || !on_candidate || connected() ||
        (last_scan_ms && uint32_t(millis()-last_scan_ms)<1800U)) return;
    last_scan_ms = millis();
    BLEScan* scan = BLEDevice::getScan();
    scan->setActiveScan(true);
    auto result=scan->start(1, false);
    // Arduino-ESP32 BLE releases differ in their return type.
    BLEScanResults* found = gw_scan_results_pointer(result);
    if (!found) return;
    for(int i=0;i<found->getCount();++i) {
        BLEAdvertisedDevice d = found->getDevice(i);
        if (!d.haveServiceUUID() || !d.isAdvertisingService(BLEUUID(SERVICE_UUID))) continue;
        uint8_t mac[6]{};
        if(!text_to_mac(d.getAddress().toString().c_str(),mac))continue;
        const auto found_name = d.getName();
        on_candidate(mac,d.haveName()?found_name.c_str():"GW-BLE-PEER");
    }
    scan->clearResults();
}
} // namespace gw_ble
#else
namespace gw_ble {
bool compiled(){return false;}
bool begin(bool,const char*){return false;}
bool connected(){return false;}
bool connect_selected(const uint8_t[6]){return false;}
bool send(const uint8_t*,size_t){return false;}
void poll(FrameHandler){}
void scan_candidates(CandidateHandler){}
}
#endif
