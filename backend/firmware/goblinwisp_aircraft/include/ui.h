
#ifndef UI_H
#define UI_H

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

// =======================================================
// GoblinWisp TFT UI contract - CACTUS / SAFED SAGAR
// =======================================================
// This is an application/UI boundary, not a cryptographic
// authority. The communication/security modules authenticate,
// decrypt, authorize, and perform replay checks BEFORE calling
// UI message-delivery functions.
//
// Preserve the existing LovyanGFX ST7789 + XPT2046 M layout,
// hardware pin assignments, LED mappings, and role-specific
// display labels in src/ui.cpp. Neither UI status nor LED state
// is proof that a cryptographic session is active.
//
// Do not display or journal cryptographic secrets, SAS material
// beyond the intended local pairing display, or plaintext chat
// in the security-events diagnostic journal.
// =======================================================

// The explicitly requested LovyanGFX rotation index (0..3).
// File 21 must apply this constant at the actual tft.setRotation
// call and verify physical orientation/touch alignment. Merely
// declaring it here DOES NOT modify the existing ui.cpp driver.
static constexpr uint8_t UI_ROTATION = 1;

// UI and comm must agree about message limits. File 21 should
// validate this against GW_MAX_LONG_MESSAGE from comm.h.
static constexpr size_t UI_MAX_MESSAGE_BYTES = 1024;

// A six-character human-verification string plus NUL. The
// cryptographic pairing module owns SAS generation/verification.
static constexpr size_t UI_PAIRING_SAS_BUFFER_SIZE = 7;

// =======================================================
// Lifecycle
// =======================================================
// ui_begin() configures the display, touch controller, and LEDs.
// ui_loop() polls UI input and advances visual animations.
// ui_sync_protocol_state() refreshes session indicators from the
// actual communication layer; it must not activate a session.
// Call from the normal Arduino application task, not an ISR or
// ESP-NOW receive callback.
void ui_begin();
void ui_loop();
void ui_sync_protocol_state();

// Legacy entry points used by older application code.
void ui_init();
void ui_update();

// =======================================================
// Diagnostics / local terminal
// =======================================================
// Log only non-secret system diagnostics. These methods may draw
// and allocate GUI text; never call them from Wi-Fi callbacks.
// ui_oled_log is a retained name, despite the current TFT panel.
void ui_oled_log(const char *message);
void ui_terminal_log(const char *message);
void ui_terminal_logf(const char *format, ...);

// Clears only the TFT terminal history. Does not erase trust,
// reset a session, or clear the separate security-events journal.
void ui_terminal_clear();

// =======================================================
// Five status LEDs
// =======================================================
// The secure LED must reflect comm_session_ready(), not the
// receipt of an unauthenticated packet or a UI-only status flag.
// Hardware GPIO mappings remain in src/ui.cpp.
void ui_led_init();
void ui_led_set_secure(bool state);
void ui_led_pulse_activity();
void ui_led_fault(bool state);
void ui_white_update();

// =======================================================
// Outgoing message handoff (UI -> main -> comm)
// =======================================================
// The pending plaintext is owned by the UI. Reading it must NOT
// consume it; application code calls ui_on_send_accepted() only
// after comm_send() has accepted the payload for secure sending.
// A pending message remains queued while offline or transport-busy
// because main.cpp does not attempt a send in those conditions.
// Explicit ui_on_send_rejected() marks it failed and clears it, as
// required by the existing UI behavior.
//
// ui_copy_pending_message():
//   - returns false for a missing/invalid/oversize message;
//   - always sets message_length = 0 on failure;
//   - writes at most output_capacity bytes;
//   - DOES NOT append a NUL terminator to binary output;
//   - does not advance the UI queue.
// These contracts will be enforced in src/ui.cpp (File 21).
bool ui_has_pending_message();

bool ui_copy_pending_message(
    uint8_t *output,
    size_t output_capacity,
    size_t &message_length
);

// Called only once the encrypted send operation has been queued.
// ACK verification and fragment completion are distinct events;
// successful enqueue is NOT confirmation of remote delivery.
void ui_on_send_accepted(
    bool fragmented,
    uint16_t fragment_total
);

void ui_on_ack_verified(uint32_t counter);
void ui_on_fragment_complete(uint16_t fragment_total);
void ui_on_send_timeout(uint32_t counter);
void ui_on_send_rejected(const char *reason);

// =======================================================
// Incoming authenticated application data (comm -> UI)
// =======================================================
// Call only after successful AEAD authentication, replay checks,
// and complete fragment reassembly. The UI copies the data before
// the caller's receive buffer is released/reused. The input may
// be binary and is NOT guaranteed to be NUL-terminated.
// Limit display/processing to UI_MAX_MESSAGE_BYTES.
void ui_on_message_received(
    const uint8_t *message,
    size_t message_length
);

// =======================================================
// Protocol and security diagnostics (comm/main -> UI)
// =======================================================
// These are display notifications only. The corresponding
// security state must be checked in comm/handshake/rekey.
// 32-bit counters are compatibility/UI display values; do not
// use them for replay decisions or nonce construction.
// Preserve status/fault values declared in comm.h, including
// rekey progress and session invalidation events (File 21).
void ui_on_protocol_fault(
    uint8_t fault_code,
    uint32_t fault_counter
);

void ui_on_status(
    uint8_t status_code,
    uint32_t status_value
);

// =======================================================
// One-shot, locally authorized TFT requests (UI -> main)
// =======================================================
// Each call consumes and clears the pending request flag.
// These are intents only; main/comm must still enforce trust,
// current protocol state, and all authorization requirements.
bool ui_take_start_session_request();
bool ui_take_reset_session_request();

// =======================================================
// Compile-time UI interface invariants
// =======================================================

static_assert(
    UI_ROTATION <= 3,
    "LovyanGFX rotation must be 0..3"
);

static_assert(
    UI_MAX_MESSAGE_BYTES == 1024,
    "Review UI/comm fragmentation bounds before changing"
);

static_assert(
    UI_PAIRING_SAS_BUFFER_SIZE == 7,
    "Expected six-character SAS and NUL terminator"
);

#endif // UI_H
