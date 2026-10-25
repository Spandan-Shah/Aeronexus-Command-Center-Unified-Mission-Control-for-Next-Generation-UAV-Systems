
#pragma once

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

namespace gw
{

// =======================================================
// GoblinWisp Security / Runtime Event Journal
// =======================================================
// Single diagnostic path for security, pairing, handshake,
// rekey, communication, transport, and application events.
//
// Each accepted event is copied into a bounded RAM ring,
// mirrored to USB Serial, and can be read by the TFT UI.
// The journal is VOLATILE: it is not persistent audit storage.
//
// IMPORTANT: The logger does NOT automatically redact data.
// Callers MUST NOT pass private keys, ephemeral private keys,
// shared secrets, traffic/control/confirmation keys, HKDF
// intermediate material, nonces combined with secret key
// material, passwords, plaintext chat, or other user content.
// Log only non-secret state names, bounded counters, sanitized
// diagnostic labels, and non-sensitive error codes.
//
// Use gw_log()/gw_logf() from normal application-task context.
// Never call them from an ISR or ESP-NOW/Wi-Fi callback: the
// implementation writes to Serial. Queue minimal diagnostics
// and log them later from the application loop instead.
// =======================================================

// Preserve the original numeric codes for existing TFT/UI
// integrations and diagnostic consumers.
enum class LogLevel : uint8_t
{
    DEBUG    = 0,
    INFO     = 1,
    SUCCESS  = 2,
    WARNING  = 3,
    SECURITY = 4,
    ERROR    = 5
};

// =======================================================
// Fixed journal configuration
// =======================================================
// The sizes INCLUDE the terminating NUL for text buffers.
// 12-byte category: at most 11 visible characters.
// 96-byte message: at most 95 visible characters.
// The journal overwrites the oldest entry when full.
// Do not increase these without checking ESP32 static RAM,
// TFT rendering and the COMM Print adapter.

static constexpr size_t EVENT_CATEGORY_SIZE = 12;
static constexpr size_t EVENT_MESSAGE_SIZE  = 96;
static constexpr size_t EVENT_RING_CAPACITY = 64;

// =======================================================
// Public, non-secret diagnostic record
// =======================================================
// Field order and types are retained for compatibility.
// timestamp_ms comes from millis() and wraps; it is NOT a
// wall-clock time, trusted timestamp, or unique event ID.
// sequence advances within the boot and can wrap at 2^32.
// Neither field should be used for security authorization.

struct SecurityEvent
{
    uint32_t sequence;
    uint32_t timestamp_ms;
    LogLevel level;
    char category[EVENT_CATEGORY_SIZE];
    char message[EVENT_MESSAGE_SIZE];
};

// =======================================================
// Atomic journal metadata snapshot (File 19)
// =======================================================
// Reading events_count() and events_latest_sequence()
// separately can observe different moments if another task
// logs between calls. This snapshot exposes a consistent
// count and sequence range under the journal lock.
//
// overwritten_count counts ring overwrites since events_init
// (saturating at UINT32_MAX); it is diagnostic only. Clearing
// the display journal must not reset this running counter.
// Sequence zero means "no retained event" for the corresponding
// oldest/newest fields. A real sequence wraps, so consumers
// must not rely on numeric comparisons over arbitrarily long
// lifetimes.

struct EventJournalSnapshot
{
    size_t count;
    size_t capacity;
    uint32_t oldest_sequence;
    uint32_t newest_sequence;
    uint32_t overwritten_count;
};

// =======================================================
// Initialization
// =======================================================
// Call once during device startup, before the application
// starts producing events. Resets the volatile journal,
// sequence generator, and overwrite statistics.
void events_init();

// =======================================================
// Logging
// =======================================================
// category and message are copied and NUL-terminated in the
// fixed buffers; overlong strings are truncated by the
// implementation. They must already contain safe public
// diagnostic text. Never pass attacker-controlled text as a
// printf format string.
//
// gw_logf() uses printf-style formatting and must NEVER be
// used to log plaintext communication or cryptographic keys.
void gw_log(
    LogLevel level,
    const char *category,
    const char *message
);

void gw_logf(
    LogLevel level,
    const char *category,
    const char *format,
    ...
);

// =======================================================
// Journal reading (safe copies, no mutable ring pointers)
// =======================================================
// events_count(): current retained entry count, 0..64.
// oldest index 0 means the oldest retained event.
// newest offset 0 means the newest retained event.
//
// File 19 must clear 'output' on a failed copy, so callers
// never accidentally display a previous event. Copies take
// a short critical section; TFT rendering is done outside it.

size_t events_count();

bool events_copy_oldest(
    size_t index,
    SecurityEvent &output
);

bool events_copy_newest(
    size_t offset,
    SecurityEvent &output
);

// Returns the last assigned sequence (or 0 before any logs).
// The sequence is NOT reset by events_clear().
uint32_t events_latest_sequence();

// New API implemented in src/diagnostics/security_events.cpp
// during File 19. Returns a consistent journal snapshot.
// Snapshot does not contain secret or message content.
bool events_snapshot(EventJournalSnapshot &output);

// New API implemented in File 19. Look up a retained event
// by its exact sequence (useful for UI redraws when the ring
// changes between frames). Returns false if overwritten,
// cleared, or absent. Must clear output on failure.
bool events_copy_sequence(
    uint32_t sequence,
    SecurityEvent &output
);

// =======================================================
// Clear diagnostic history only
// =======================================================
// Does not reset identity, trust, sessions, cryptographic
// counters, or protocol state. Does not reset next_sequence
// or overwritten_count. Do not confuse journal clearing
// with erasing persistent records or audit evidence.
void events_clear();

// =======================================================
// Human-readable severity string
// =======================================================
// Returns a static string, not a heap allocation.
const char *log_level_name(LogLevel level);

// =======================================================
// Compile-time invariants
// =======================================================
static_assert(sizeof(LogLevel) == sizeof(uint8_t),
              "LogLevel must remain one byte");
static_assert(static_cast<uint8_t>(LogLevel::ERROR) == 5,
              "Existing severity numeric values changed");
static_assert(EVENT_CATEGORY_SIZE >= 2 && EVENT_MESSAGE_SIZE >= 2,
              "Event strings require space for a NUL terminator");
static_assert(EVENT_RING_CAPACITY > 0,
              "Event ring capacity must be positive");
static_assert(sizeof(SecurityEvent) <= 128,
              "SecurityEvent layout grew unexpectedly");
static_assert(sizeof(SecurityEvent) * EVENT_RING_CAPACITY <= 8192,
              "Event journal exceeds reserved static RAM budget");

} // namespace gw
