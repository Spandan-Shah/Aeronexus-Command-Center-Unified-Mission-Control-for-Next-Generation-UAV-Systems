#include "gw_transport_io.h"
#include <esp_now.h>
#include <cstring>
namespace gw_transport_io {
bool ensure_espnow_peer(const uint8_t mac[6]) {
    if(!mac)return false;
    if(esp_now_is_peer_exist(mac))return true;
    esp_now_peer_info_t info{};
    memcpy(info.peer_addr,mac,6);
    info.channel=0;
    info.encrypt=false; // SSIP authenticates and encrypts its own frames.
    return esp_now_add_peer(&info)==ESP_OK;
}
bool espnow_send(const uint8_t mac[6], const uint8_t* bytes, size_t length) {
    return mac && bytes && length>0 && length<=250 &&
           esp_now_send(mac,bytes,length)==ESP_OK;
}
}
