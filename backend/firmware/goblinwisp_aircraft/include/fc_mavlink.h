#pragma once

#include <Arduino.h>

namespace fc_mavlink {

// Starts UART1 as a receive-only MAVLink input.
// No transmit GPIO is assigned to the flight-controller interface.
bool begin();

// Consume available UART bytes and update the latest decoded FC state.
// This function never transmits anything to the flight controller.
void poll();

// Sends at most one pending normalized telemetry message over GoblinWisp
// when a secure session exists and the transport is free.
void publish_if_possible();

// True when a recent autopilot HEARTBEAT has been received.
bool link_active();

// Diagnostics.
uint32_t message_count();
uint32_t last_message_age_ms();
uint8_t source_system_id();
uint8_t source_component_id();

}  // namespace fc_mavlink