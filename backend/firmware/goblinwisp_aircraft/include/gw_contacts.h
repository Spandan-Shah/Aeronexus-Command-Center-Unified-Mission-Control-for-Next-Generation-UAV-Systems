#pragma once
// Untrusted address-book entries. They are NOT identities and never grant trust.
// Host-testable. The firmware persists this bounded structure in NVS.
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include "gw_device_catalog.h"
namespace gw {
static constexpr size_t CONTACT_CAPACITY=8;
static constexpr uint32_t CONTACT_MAGIC=0x47574332u; // GWC2
struct Contact {
    uint8_t valid=0;
    uint8_t mac[6]{};
    uint8_t device_kind=0;
    uint8_t transport=0;
    char label[24]{};
};
struct ContactBook {
    uint32_t magic=CONTACT_MAGIC;
    uint16_t schema=1;
    uint8_t count=0;
    uint8_t reserved=0;
    Contact entries[CONTACT_CAPACITY]{};
    uint32_t checksum=0;
};
inline bool contact_valid(const Contact &p) {
    if(p.valid!=1 || !device_profile(static_cast<DeviceKind>(p.device_kind)) ||
       p.transport>3 || (p.mac[0]&1))return false;
    uint8_t or_mac=0;for(unsigned i=0;i<6;i++)or_mac|=p.mac[i];
    if(!or_mac)return false;
    bool zero=false;
    for(char c:p.label) {
        if(c==0){zero=true;continue;}
        if(zero || c<32 || c>126)return false;
    }
    return zero && p.label[0]!=0;
}
inline uint32_t contact_crc(const ContactBook &b) {
    // Error detection, NOT MAC, NOT cryptographic authenticity.
    const uint8_t* bytes=reinterpret_cast<const uint8_t*>(&b);
    constexpr size_t end=offsetof(ContactBook,checksum);
    uint32_t v=0xFFFFFFFFu;
    for(size_t i=0;i<end;i++) {
        v^=bytes[i];
        for(unsigned j=0;j<8;j++)v=(v>>1)^((v&1u)?0xEDB88320u:0);
    }
    return ~v;
}
inline bool contact_book_valid(const ContactBook &b) {
    if(b.magic!=CONTACT_MAGIC || b.schema!=1 || b.reserved!=0 ||
       b.count>CONTACT_CAPACITY || contact_crc(b)!=b.checksum)return false;
    for(unsigned i=0;i<CONTACT_CAPACITY;i++) {
        if(i>=b.count){
            // Inactive slots must remain zeroed; avoid uninitialized data in checksum.
            if(b.entries[i].valid!=0)return false;
            continue;
        }
        if(!contact_valid(b.entries[i]))return false;
        for(unsigned j=0;j<i;j++)
            if(b.entries[i].transport==b.entries[j].transport &&
               memcmp(b.entries[i].mac,b.entries[j].mac,6)==0)return false;
    }
    return true;
}
inline void contact_book_init(ContactBook &b) {
    b=ContactBook{};
    b.checksum=contact_crc(b);
}
inline bool contact_add(ContactBook &b, const Contact &contact) {
    if(!contact_book_valid(b) || !contact_valid(contact))return false;
    for(unsigned i=0;i<b.count;i++) {
        if(b.entries[i].transport==contact.transport &&
           memcmp(b.entries[i].mac,contact.mac,6)==0) {
            b.entries[i]=contact;
            b.checksum=contact_crc(b);
            return true;
        }
    }
    if(b.count>=CONTACT_CAPACITY)return false;
    b.entries[b.count++]=contact;
    b.checksum=contact_crc(b);
    return true;
}
} // namespace gw
