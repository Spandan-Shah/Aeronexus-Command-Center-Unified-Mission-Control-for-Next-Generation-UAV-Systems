#pragma once

// Local physical authorization button. ESP32-S3 DevKitC-1 BOOT is GPIO0.
// Trust enrollment/reset is accepted only while this pin is held LOW.
#define AERONEXUS_LOCAL_AUTHORIZE_PIN 0

// Stable transport routing tag for the MissionNexus host. This is NOT a
// cryptographic identity and must never be used as an authentication secret.
#define AERONEXUS_HOST_LINK_TAG_0 0x02
#define AERONEXUS_HOST_LINK_TAG_1 0x47
#define AERONEXUS_HOST_LINK_TAG_2 0x57
#define AERONEXUS_HOST_LINK_TAG_3 0xA1
#define AERONEXUS_HOST_LINK_TAG_4 0x00
#define AERONEXUS_HOST_LINK_TAG_5 0x01
