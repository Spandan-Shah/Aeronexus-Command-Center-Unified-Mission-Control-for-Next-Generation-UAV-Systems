#include "gw_transport_io.h"
namespace gw_transport_io {
bool uart_send(HardwareSerial& serial, const uint8_t* bytes, size_t length) {
    if(!bytes || length==0 || length>250)return false;
    const uint8_t header[4]={0x47,0x57,static_cast<uint8_t>(length),
                             static_cast<uint8_t>(~static_cast<uint8_t>(length))};
    return serial.write(header,sizeof header)==sizeof header &&
           serial.write(bytes,length)==length;
}
}
