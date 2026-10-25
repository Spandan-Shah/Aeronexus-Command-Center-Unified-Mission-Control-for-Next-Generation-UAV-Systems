#pragma once
// Hardware-capability directory; a device type is NOT evidence that compatible
// GoblinWisp software is installed. All entries are data, not authorization.
// Host-testable: no Arduino/ESP32 dependency.
#include <stdint.h>
#include <stddef.h>

namespace gw {
enum class DeviceKind : uint8_t {
    ESP32_DEVKIT = 0, ESP32_S3, ESP32_C3, ESP32_S2, ESP8266,
    RASPBERRY_PI_3, RASPBERRY_PI_4, RASPBERRY_PI_5,
    RASPBERRY_PI_PICO_W, DRONE_CONTROLLER, CUSTOM_GATEWAY, COUNT
};
enum TransportBit : uint8_t {
    TRANSPORT_ESPNOW = 1 << 0, TRANSPORT_WIFI_UDP = 1 << 1,
    TRANSPORT_BLE = 1 << 2, TRANSPORT_UART = 1 << 3
};
struct DeviceProfile {
    DeviceKind id;
    const char *name;
    uint8_t hardware_transports;
    // Actual remote application implementation compatible with this firmware
    // is confirmed only for the existing ESP32 DevKit SSIP firmware pair.
    bool goblinwisp_firmware_supported;
};
static constexpr DeviceProfile DEVICE_PROFILES[] = {
    {DeviceKind::ESP32_DEVKIT, "ESP32 DevKit", TRANSPORT_ESPNOW | TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, true},
    {DeviceKind::ESP32_S3, "ESP32-S3", TRANSPORT_ESPNOW | TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, true},
    {DeviceKind::ESP32_C3, "ESP32-C3", TRANSPORT_ESPNOW | TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, false},
    {DeviceKind::ESP32_S2, "ESP32-S2", TRANSPORT_ESPNOW | TRANSPORT_WIFI_UDP | TRANSPORT_UART, false},
    {DeviceKind::ESP8266, "ESP8266", TRANSPORT_ESPNOW | TRANSPORT_WIFI_UDP | TRANSPORT_UART, false},
    {DeviceKind::RASPBERRY_PI_3, "Raspberry Pi 3", TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, false},
    {DeviceKind::RASPBERRY_PI_4, "Raspberry Pi 4", TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, false},
    {DeviceKind::RASPBERRY_PI_5, "Raspberry Pi 5", TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, false},
    {DeviceKind::RASPBERRY_PI_PICO_W, "Pico W", TRANSPORT_WIFI_UDP | TRANSPORT_BLE | TRANSPORT_UART, false},
    {DeviceKind::DRONE_CONTROLLER, "Drone CTRL", 0, false},
    {DeviceKind::CUSTOM_GATEWAY, "Custom gateway", 0, false}
};
static constexpr size_t DEVICE_PROFILE_COUNT = sizeof(DEVICE_PROFILES)/sizeof(DEVICE_PROFILES[0]);
static_assert(DEVICE_PROFILE_COUNT == static_cast<uint8_t>(DeviceKind::COUNT), "Device catalog mismatch");
inline const DeviceProfile* device_profile(DeviceKind id) {
    const size_t i = static_cast<uint8_t>(id);
    return i < DEVICE_PROFILE_COUNT ? &DEVICE_PROFILES[i] : nullptr;
}
inline bool device_has_hardware(DeviceKind id, uint8_t transport) {
    const DeviceProfile* p = device_profile(id);
    return p && (p->hardware_transports & transport) != 0;
}
inline bool device_ssip_supported(DeviceKind id, uint8_t transport, uint8_t compiled_transports) {
    const DeviceProfile* p = device_profile(id);
    // Peer firmware compatibility is separate from hardware capability.
    return p && p->goblinwisp_firmware_supported &&
           (p->hardware_transports & transport) != 0 &&
           (compiled_transports & transport) != 0;
}
} // namespace gw
