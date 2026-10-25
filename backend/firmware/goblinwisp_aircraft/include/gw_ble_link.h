#pragma once
#include <stddef.h>
#include <stdint.h>

// Optional ESP32 built-in BLE GATT bearer for the existing SSIP packet bytes.
// This is only transport; SSIP pairing/signatures/AEAD are still required.
namespace gw_ble {
using FrameHandler = void (*)(const uint8_t* frame, size_t length);
using CandidateHandler = void (*)(const uint8_t address[6], const char* name);
bool compiled();
bool begin(bool peripheral, const char* local_name);
bool connected();
bool connect_selected(const uint8_t address[6]); // central only
bool send(const uint8_t* frame, size_t length);
void poll(FrameHandler on_frame);
void scan_candidates(CandidateHandler on_candidate); // central, bounded scan
}
