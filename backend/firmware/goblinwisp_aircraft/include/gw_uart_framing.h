#pragma once

// Pure C++ and host-testable. Framing is NOT authentication: the SSIP
// pairing signature and AES-GCM checks remain mandatory after decoding.
#include <cstddef>
#include <cstdint>
#include <cstring>

namespace gw {
static constexpr uint8_t UART_FRAME_MARK1 = 0x47;
static constexpr uint8_t UART_FRAME_MARK2 = 0x57;
static constexpr size_t UART_FRAME_MAX_PAYLOAD = 250;

enum class UartFrameResult : uint8_t { WAITING, READY, MALFORMED };

class UartFrameDecoder {
public:
    UartFrameDecoder() = default;
    UartFrameDecoder(const UartFrameDecoder &) = delete;
    UartFrameDecoder &operator=(const UartFrameDecoder &) = delete;
    ~UartFrameDecoder() { reset(); }

    void reset() {
        std::memset(buffer_, 0, sizeof(buffer_));
        state_ = 0; length_ = 0; used_ = 0;
    }
    bool in_progress() const { return state_ != 0; }

    UartFrameResult consume(uint8_t byte, uint8_t *output,
                            size_t capacity, size_t &output_length) {
        output_length = 0;
        switch (state_) {
            case 0:
                if (byte == UART_FRAME_MARK1) state_ = 1;
                return UartFrameResult::WAITING;
            case 1:
                state_ = byte == UART_FRAME_MARK2 ? 2 :
                         (byte == UART_FRAME_MARK1 ? 1 : 0);
                return UartFrameResult::WAITING;
            case 2:
                if (byte == 0 || byte > UART_FRAME_MAX_PAYLOAD) {
                    reset(); return UartFrameResult::MALFORMED;
                }
                length_ = byte;
                state_ = 3;
                return UartFrameResult::WAITING;
            case 3:
                if (byte != static_cast<uint8_t>(~length_)) {
                    reset(); return UartFrameResult::MALFORMED;
                }
                used_ = 0;
                state_ = 4;
                return UartFrameResult::WAITING;
            case 4:
                buffer_[used_++] = byte;
                if (used_ == length_) {
                    if (!output || capacity < used_) {
                        reset(); return UartFrameResult::MALFORMED;
                    }
                    output_length = used_;
                    std::memcpy(output, buffer_, output_length);
                    reset();
                    return UartFrameResult::READY;
                }
                return UartFrameResult::WAITING;
            default:
                reset(); return UartFrameResult::MALFORMED;
        }
    }

private:
    uint8_t buffer_[UART_FRAME_MAX_PAYLOAD] = {};
    uint8_t state_ = 0;
    uint8_t length_ = 0;
    uint8_t used_ = 0;
};
} // namespace gw
