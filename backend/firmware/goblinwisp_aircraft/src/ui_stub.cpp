#include "ui.h"
#include <cstdarg>
#include <cstdio>

void ui_begin() {}
void ui_loop() {}
void ui_sync_protocol_state() {}
void ui_init() {}
void ui_update() {}

void ui_oled_log(const char *message) {
    if (message) { Serial.print("[GW] "); Serial.println(message); }
}
void ui_terminal_log(const char *message) { ui_oled_log(message); }
void ui_terminal_logf(const char *format, ...) {
    if (!format) return;
    char buffer[256] = {};
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    ui_oled_log(buffer);
}
void ui_terminal_clear() {}

void ui_led_init() {}
void ui_led_set_secure(bool) {}
void ui_led_pulse_activity() {}
void ui_led_fault(bool) {}
void ui_white_update() {}

bool ui_has_pending_message() { return false; }
bool ui_copy_pending_message(uint8_t *, size_t, size_t &message_length) {
    message_length = 0;
    return false;
}
void ui_on_send_accepted(bool, uint16_t) {}
void ui_on_ack_verified(uint32_t) {}
void ui_on_fragment_complete(uint16_t) {}
void ui_on_send_timeout(uint32_t) {}
void ui_on_send_rejected(const char *) {}
void ui_on_message_received(const uint8_t *, size_t) {}
void ui_on_protocol_fault(uint8_t fault_code, uint32_t fault_counter) {
    Serial.printf("[GW] FAULT code=%u counter=%lu\n", static_cast<unsigned>(fault_code), static_cast<unsigned long>(fault_counter));
}
void ui_on_status(uint8_t status_code, uint32_t status_value) {
    Serial.printf("[GW] STATUS code=%u value=%lu\n", static_cast<unsigned>(status_code), static_cast<unsigned long>(status_value));
}
bool ui_take_start_session_request() { return false; }
bool ui_take_reset_session_request() { return false; }
