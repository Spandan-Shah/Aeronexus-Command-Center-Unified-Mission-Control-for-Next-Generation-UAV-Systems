#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

namespace gw {
// Unauthenticated only. Never use discovery to authorize encryption or pairing.
static constexpr uint8_t DISCOVERY_VERSION = 1;
static constexpr size_t DISCOVERY_SLOTS = 8;
static constexpr uint32_t DISCOVERY_LIFETIME_MS = 15000;
static constexpr size_t DISCOVERY_NAME_LENGTH = 24;
#pragma pack(push, 1)
struct DiscoveryBeacon {
    uint8_t magic[4];  // GWPD
    uint8_t version;
    uint8_t side;      // A=1, B=2
    uint8_t logical_id;
    char name[DISCOVERY_NAME_LENGTH];
};
#pragma pack(pop)
static_assert(sizeof(DiscoveryBeacon)==31, "Beacon wire size");
inline bool discovery_valid_mac(const uint8_t mac[6]) {
    if(!mac || (mac[0] & 1)) return false; // no multicast or broadcast MAC
    uint8_t any=0; for(int i=0;i<6;i++) any|=mac[i];
    return any!=0;
}
inline bool discovery_encode(DiscoveryBeacon &b, uint8_t side, uint8_t id, const char *name) {
    if ((side!=1 && side!=2) || id==0 || !name) return false;
    memset(&b,0,sizeof b);
    memcpy(b.magic,"GWPD",4); b.version=DISCOVERY_VERSION; b.side=side; b.logical_id=id;
    size_t n=0; while(n<DISCOVERY_NAME_LENGTH-1 && name[n]) { const char c=name[n]; if(c<32 || c>126)return false; b.name[n++]=c; }
    return n!=0 && name[n]==0;
}
inline bool discovery_decode(const uint8_t* data,size_t len,DiscoveryBeacon &out) {
    if(!data || len!=sizeof out) return false;
    memcpy(&out,data,len);
    if(memcmp(out.magic,"GWPD",4)!=0 || out.version!=DISCOVERY_VERSION ||
       (out.side!=1 && out.side!=2) || out.logical_id==0) return false;
    bool terminated=false;
    for(char c:out.name) {
        if(c==0){terminated=true;continue;}
        if(terminated || c<32 || c>126)return false;
    }
    return terminated && out.name[0]!=0;
}
struct DiscoveredPeer {
    uint8_t mac[6]{};
    uint8_t logical_id=0;
    uint8_t side=0;
    char name[DISCOVERY_NAME_LENGTH]{};
    uint32_t last_seen_ms=0;
    bool valid=false;
};
class DiscoveryRoster {
public:
    void clear(){for(auto &p:peers_)p=DiscoveredPeer{};}
    bool observe(const uint8_t mac[6],const DiscoveryBeacon &b,uint8_t local_side,uint32_t now){
        if(!discovery_valid_mac(mac) || b.side==local_side ||
           (local_side!=1 && local_side!=2))return false;
        int slot=-1;
        for(size_t i=0;i<DISCOVERY_SLOTS;i++){
            if(peers_[i].valid && memcmp(peers_[i].mac,mac,6)==0){slot=int(i);break;}
        }
        if(slot<0){
            for(size_t i=0;i<DISCOVERY_SLOTS;i++){
                if(!peers_[i].valid || uint32_t(now-peers_[i].last_seen_ms)>DISCOVERY_LIFETIME_MS){slot=int(i);break;}
            }
        }
        if(slot<0)return false; // bounded roster: no endless eviction by RF spam
        auto &p=peers_[slot]; memcpy(p.mac,mac,6);p.logical_id=b.logical_id;p.side=b.side;
        memcpy(p.name,b.name,sizeof p.name);p.last_seen_ms=now;p.valid=true;return true;
    }
    const DiscoveredPeer* at(size_t visible_index,uint32_t now) const {
        size_t count=0;
        for(const auto &p:peers_) if(p.valid && uint32_t(now-p.last_seen_ms)<=DISCOVERY_LIFETIME_MS){
            if(count++==visible_index)return &p;
        }
        return nullptr;
    }
    size_t count(uint32_t now) const {size_t n=0;while(at(n,now))++n;return n;}
private:
    DiscoveredPeer peers_[DISCOVERY_SLOTS]{};
};
} // namespace gw
