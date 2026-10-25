#include "gw_transport_io.h"
namespace gw_transport_io {
bool wifi_udp_send(WiFiUDP& udp, IPAddress destination, uint16_t port,
                   const uint8_t* bytes, size_t length) {
    if(!bytes || !length || length>250 || destination==IPAddress(0,0,0,0))
        return false;
    if(!udp.beginPacket(destination,port))return false;
    const size_t written=udp.write(bytes,length);
    const bool finished=udp.endPacket()==1;
    return written==length && finished;
}
}
