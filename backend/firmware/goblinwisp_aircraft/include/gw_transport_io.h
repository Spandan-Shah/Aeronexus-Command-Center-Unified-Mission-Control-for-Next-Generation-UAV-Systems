#pragma once
// Low-level carriage only. These transports MUST NOT decide SSIP trust.
#include <Arduino.h>
#include <WiFiUdp.h>
#include <HardwareSerial.h>
#include <stddef.h>
#include <stdint.h>
namespace gw_transport_io {
bool ensure_espnow_peer(const uint8_t mac[6]);
bool espnow_send(const uint8_t mac[6], const uint8_t* bytes, size_t length);
bool wifi_udp_send(WiFiUDP& udp, IPAddress destination, uint16_t port,
                   const uint8_t* bytes, size_t length);
bool uart_send(HardwareSerial& serial, const uint8_t* bytes, size_t length);
}
