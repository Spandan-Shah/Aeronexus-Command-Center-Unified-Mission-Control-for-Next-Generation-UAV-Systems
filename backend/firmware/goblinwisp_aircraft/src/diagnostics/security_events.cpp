#include "gw_events.h"

#include <Arduino.h>

#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <stdint.h>

namespace gw {
namespace {

// Volatile diagnostic journal. Do not call these APIs from an ISR or
// Wi-Fi/ESP-NOW callback: Serial output is performed by the caller's task.
// Only the ring and metadata are protected by the short critical sections.
SecurityEvent event_ring[EVENT_RING_CAPACITY] = {};
size_t event_head = 0;   // Next insertion slot.
size_t event_count_value = 0;
uint32_t next_sequence = 1;
uint32_t latest_sequence = 0;
uint32_t overwritten_count = 0;

portMUX_TYPE event_mux = portMUX_INITIALIZER_UNLOCKED;

void copy_text(char *destination, size_t capacity, const char *source) {
    if (destination == nullptr || capacity == 0) {
        return;
    }

    // Always terminate, including for empty and oversized input.
    destination[0] = '\0';
    if (source == nullptr) {
        return;
    }

    size_t index = 0;
    while (index + 1 < capacity && source[index] != '\0') {
        destination[index] = source[index];
        ++index;
    }
    destination[index] = '\0';
}

size_t oldest_index_locked() {
    // Call only with event_mux held.
    return (event_head + EVENT_RING_CAPACITY - event_count_value) %
           EVENT_RING_CAPACITY;
}

size_t index_from_oldest_locked(size_t offset) {
    // offset must be < event_count_value; call only with event_mux held.
    return (oldest_index_locked() + offset) % EVENT_RING_CAPACITY;
}

uint32_t assign_sequence_locked() {
    // Zero is reserved as the "no event" sentinel. Avoid using numeric
    // ordering across uint32_t sequence wraparound.
    const uint32_t assigned = next_sequence;
    ++next_sequence;
    if (next_sequence == 0) {
        next_sequence = 1;
    }
    latest_sequence = assigned;
    return assigned;
}

void mirror_to_serial(const SecurityEvent &event) {
    // Never hold the ring lock while printing or invoking TFT-related code.
    // Serial records may interleave if several tasks log concurrently;
    // journal sequence numbers provide the authoritative ring order.
    Serial.print('[');
    Serial.print(event.timestamp_ms);
    Serial.print("][");
    Serial.print(log_level_name(event.level));
    Serial.print("][");
    Serial.print(event.category);
    Serial.print("] ");
    Serial.println(event.message);
}

} // namespace

const char *log_level_name(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG:    return "DBG";
        case LogLevel::INFO:     return "INFO";
        case LogLevel::SUCCESS:  return "OK";
        case LogLevel::WARNING:  return "WARN";
        case LogLevel::SECURITY: return "SEC";
        case LogLevel::ERROR:    return "ERR";
        default:                 return "UNK";
    }
}

void events_init() {
    portENTER_CRITICAL(&event_mux);
    std::memset(event_ring, 0, sizeof(event_ring));
    event_head = 0;
    event_count_value = 0;
    next_sequence = 1;
    latest_sequence = 0;
    overwritten_count = 0;
    portEXIT_CRITICAL(&event_mux);
}

void gw_log(LogLevel level, const char *category, const char *message) {
    // No secret redaction is possible here: callers must only supply safe
    // diagnostics, never plaintext messages, keys or passwords.
    if (category == nullptr || message == nullptr) {
        return;
    }

    SecurityEvent entry{};
    entry.timestamp_ms = static_cast<uint32_t>(millis());
    entry.level = level;
    copy_text(entry.category, sizeof(entry.category), category);
    copy_text(entry.message, sizeof(entry.message), message);

    portENTER_CRITICAL(&event_mux);
    entry.sequence = assign_sequence_locked();
    event_ring[event_head] = entry;
    event_head = (event_head + 1) % EVENT_RING_CAPACITY;

    if (event_count_value < EVENT_RING_CAPACITY) {
        ++event_count_value;
    } else if (overwritten_count != UINT32_MAX) {
        ++overwritten_count;
    }
    portEXIT_CRITICAL(&event_mux);

    mirror_to_serial(entry);
}

void gw_logf(LogLevel level, const char *category, const char *format, ...) {
    if (category == nullptr || format == nullptr) {
        return;
    }

    char message[EVENT_MESSAGE_SIZE] = {};
    va_list args;
    va_start(args, format);
    const int written = std::vsnprintf(message, sizeof(message), format, args);
    va_end(args);

    if (written >= 0) {
        message[sizeof(message) - 1] = '\0';
        gw_log(level, category, message);
    }
    // A bounded temporary may contain diagnostic arguments; erase it after use.
    std::memset(message, 0, sizeof(message));
}

size_t events_count() {
    portENTER_CRITICAL(&event_mux);
    const size_t count = event_count_value;
    portEXIT_CRITICAL(&event_mux);
    return count;
}

bool events_copy_oldest(size_t index, SecurityEvent &output) {
    // Failed lookup must never expose a previously populated output object.
    std::memset(&output, 0, sizeof(output));
    portENTER_CRITICAL(&event_mux);
    const bool found = index < event_count_value;
    if (found) {
        output = event_ring[index_from_oldest_locked(index)];
    }
    portEXIT_CRITICAL(&event_mux);
    return found;
}

bool events_copy_newest(size_t offset, SecurityEvent &output) {
    std::memset(&output, 0, sizeof(output));
    portENTER_CRITICAL(&event_mux);
    const bool found = offset < event_count_value;
    if (found) {
        output = event_ring[index_from_oldest_locked(
            event_count_value - 1 - offset)];
    }
    portEXIT_CRITICAL(&event_mux);
    return found;
}

uint32_t events_latest_sequence() {
    portENTER_CRITICAL(&event_mux);
    const uint32_t sequence = latest_sequence;
    portEXIT_CRITICAL(&event_mux);
    return sequence;
}

bool events_snapshot(EventJournalSnapshot &output) {
    // This API always succeeds with a statically allocated journal.
    // All fields are read under the same lock for a consistent snapshot.
    std::memset(&output, 0, sizeof(output));
    portENTER_CRITICAL(&event_mux);
    output.count = event_count_value;
    output.capacity = EVENT_RING_CAPACITY;
    output.overwritten_count = overwritten_count;
    if (event_count_value != 0) {
        output.oldest_sequence = event_ring[oldest_index_locked()].sequence;
        const size_t newest =
            (event_head + EVENT_RING_CAPACITY - 1) % EVENT_RING_CAPACITY;
        output.newest_sequence = event_ring[newest].sequence;
    }
    portEXIT_CRITICAL(&event_mux);
    return true;
}

bool events_copy_sequence(uint32_t sequence, SecurityEvent &output) {
    std::memset(&output, 0, sizeof(output));
    if (sequence == 0) {
        return false;
    }

    bool found = false;
    portENTER_CRITICAL(&event_mux);
    for (size_t index = 0; index < event_count_value; ++index) {
        const SecurityEvent &candidate =
            event_ring[index_from_oldest_locked(index)];
        if (candidate.sequence == sequence) {
            output = candidate;
            found = true;
            break;
        }
    }
    portEXIT_CRITICAL(&event_mux);
    return found;
}

void events_clear() {
    portENTER_CRITICAL(&event_mux);
    std::memset(event_ring, 0, sizeof(event_ring));
    event_head = 0;
    event_count_value = 0;
    // Keep latest_sequence, next_sequence, and overwritten_count so that
    // clearing the TFT journal does not reset lifetime boot diagnostics.
    portEXIT_CRITICAL(&event_mux);
}

} // namespace gw
