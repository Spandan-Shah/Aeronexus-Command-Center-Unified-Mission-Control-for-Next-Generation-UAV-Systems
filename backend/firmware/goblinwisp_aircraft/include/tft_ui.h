#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

// =======================================================
// TFT lifecycle
// =======================================================

void tft_ui_begin();
void tft_ui_loop();

// =======================================================
// Outgoing custom-message interface
// =======================================================

// Returns true when the user has pressed TRANSMIT and a
// message is waiting to be passed to GoblinWisp.
bool tft_ui_has_pending_message();

// Copies the pending message without deleting it.
// The message remains queued until tft_ui_on_send_started()
// or tft_ui_on_send_rejected() is called.
bool tft_ui_copy_pending_message(
  uint8_t *output,
  size_t outputCapacity,
  size_t &messageLength
);

// GoblinWisp accepted the message for secure transmission.
void tft_ui_on_send_started();

// Authenticated ACK was verified.
void tft_ui_on_ack_verified(uint32_t counter);

// Retry limit was reached.
void tft_ui_on_send_timeout(uint32_t counter);

// Message could not enter the secure communication layer.
void tft_ui_on_send_rejected(const char *reason);

// =======================================================
// Incoming message interface
// =======================================================

void tft_ui_on_message_received(
  const uint8_t *message,
  size_t messageLength
);

// =======================================================
// Security and session interface
// =======================================================

void tft_ui_on_protocol_fault(
  uint8_t faultCode,
  uint32_t faultCounter
);

void tft_ui_set_session_active(bool active);