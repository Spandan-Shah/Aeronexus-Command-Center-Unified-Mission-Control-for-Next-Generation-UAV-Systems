#include "fc_mavlink.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include "driver/uart.h"

#include <common/mavlink.h>

#include "aircraft_config.h"
#include "comm.h"

namespace fc_mavlink {
namespace {

constexpr uart_port_t FC_UART = UART_NUM_1;
constexpr size_t MAX_SECURE_JSON = 210;
constexpr size_t UART_READ_CHUNK = 256;

bool initialized = false;

mavlink_message_t parser_message{};
mavlink_status_t parser_status{};

uint8_t fc_sysid = 0;
uint8_t fc_compid = 0;

uint32_t received_messages = 0;
uint32_t last_message_ms = 0;
uint32_t last_heartbeat_ms = 0;
uint32_t last_publish_ms = 0;

// -----------------------------------------------------------------------------
// Latest decoded flight-controller state
// -----------------------------------------------------------------------------

struct HeartbeatState {
    uint8_t vehicle_type = 0;
    uint8_t autopilot = 0;
    uint8_t base_mode = 0;
    uint8_t system_status = 0;
    uint32_t custom_mode = 0;
    bool armed = false;
};

struct SystemHealthState {
    uint32_t sensors_present = 0;
    uint32_t sensors_enabled = 0;
    uint32_t sensors_health = 0;

    uint16_t load_permille = 0;
    uint16_t drop_rate_comm = 0;
    uint16_t errors_comm = 0;
    uint16_t errors_count1 = 0;
    uint16_t errors_count2 = 0;
    uint16_t errors_count3 = 0;
    uint16_t errors_count4 = 0;

    uint16_t voltage_battery_mv = UINT16_MAX;
    int16_t current_battery_ca = -1;
    int8_t battery_remaining_pct = -1;
};

struct BatteryState {
    uint8_t id = 0;

    uint32_t voltage_mv = 0;
    int16_t current_ca = -1;
    int8_t remaining_pct = -1;

    int32_t current_consumed_mah = -1;
    int32_t energy_consumed_hj = -1;
};

struct GpsState {
    uint8_t fix_type = 0;
    uint8_t satellites_visible = 0;

    uint16_t eph_cm = UINT16_MAX;
    uint16_t epv_cm = UINT16_MAX;
    uint16_t velocity_cms = UINT16_MAX;
    uint16_t course_cdeg = UINT16_MAX;

    int32_t lat_e7 = 0;
    int32_t lon_e7 = 0;
    int32_t alt_mm = 0;
};

struct PositionState {
    uint32_t time_boot_ms = 0;

    int32_t lat_e7 = 0;
    int32_t lon_e7 = 0;
    int32_t alt_mm = 0;
    int32_t relative_alt_mm = 0;

    int16_t vx_cms = 0;
    int16_t vy_cms = 0;
    int16_t vz_cms = 0;

    uint16_t heading_cdeg = UINT16_MAX;
};

struct AttitudeState {
    uint32_t time_boot_ms = 0;

    float roll_rad = 0.0f;
    float pitch_rad = 0.0f;
    float yaw_rad = 0.0f;

    float rollspeed_rads = 0.0f;
    float pitchspeed_rads = 0.0f;
    float yawspeed_rads = 0.0f;
};

struct VfrState {
    float airspeed_mps = 0.0f;
    float groundspeed_mps = 0.0f;
    int16_t heading_deg = 0;
    uint16_t throttle_pct = 0;
    float altitude_m = 0.0f;
    float climb_mps = 0.0f;
};

struct TimeState {
    uint64_t unix_usec = 0;
    uint32_t boot_ms = 0;
};

HeartbeatState heartbeat;
SystemHealthState health;
BatteryState battery;
GpsState gps;
PositionState position;
AttitudeState attitude;
VfrState vfr;
TimeState system_time;

// -----------------------------------------------------------------------------
// Pending normalized telemetry
// -----------------------------------------------------------------------------

enum class PublishKind : uint8_t {
    FLIGHT_MODE = 0,
    ARM_STATE,
    SYSTEM_HEALTH,
    BATTERY_STATUS,
    GPS_STATUS,
    POSITION,
    ATTITUDE,
    VFR_HUD,
    SYSTEM_TIME,
    COUNT
};

constexpr uint8_t PUBLISH_KIND_COUNT =
    static_cast<uint8_t>(PublishKind::COUNT);

bool pending[PUBLISH_KIND_COUNT] = {};
uint8_t next_publish_kind = 0;

void mark_pending(PublishKind kind) {
    pending[static_cast<uint8_t>(kind)] = true;
}

uint32_t battery_voltage_sum_mv(
    const mavlink_battery_status_t& msg
) {
    uint32_t sum = 0;

    for (size_t i = 0;
         i < sizeof(msg.voltages) / sizeof(msg.voltages[0]);
         ++i) {

        const uint16_t mv = msg.voltages[i];

        if (mv == UINT16_MAX || mv == 0) {
            continue;
        }

        sum += mv;
    }

    return sum;
}

bool source_is_selected_fc(const mavlink_message_t& message) {
    if (fc_sysid == 0) {
        return false;
    }

    return message.sysid == fc_sysid;
}

void process_heartbeat(const mavlink_message_t& message) {
    mavlink_heartbeat_t msg{};
    mavlink_msg_heartbeat_decode(&message, &msg);

    // Prefer the actual autopilot component.
    //
    // This prevents a peripheral/gimbal/onboard-computer heartbeat from
    // accidentally becoming the selected flight-controller identity.
    if (message.compid != MAV_COMP_ID_AUTOPILOT1) {
        return;
    }

    if (fc_sysid == 0) {
        fc_sysid = message.sysid;
        fc_compid = message.compid;

        Serial.print("FC_MAVLINK:AUTOPILOT_SELECTED:SYSID=");
        Serial.print(fc_sysid);
        Serial.print(":COMPID=");
        Serial.println(fc_compid);
    }

    if (message.sysid != fc_sysid) {
        return;
    }

    heartbeat.vehicle_type = msg.type;
    heartbeat.autopilot = msg.autopilot;
    heartbeat.base_mode = msg.base_mode;
    heartbeat.system_status = msg.system_status;
    heartbeat.custom_mode = msg.custom_mode;

    heartbeat.armed =
        (msg.base_mode & MAV_MODE_FLAG_SAFETY_ARMED) != 0;

    last_heartbeat_ms = millis();
    last_message_ms = last_heartbeat_ms;
    ++received_messages;

    mark_pending(PublishKind::FLIGHT_MODE);
    mark_pending(PublishKind::ARM_STATE);
}

void process_sys_status(const mavlink_message_t& message) {
    mavlink_sys_status_t msg{};
    mavlink_msg_sys_status_decode(&message, &msg);

    health.sensors_present = msg.onboard_control_sensors_present;
    health.sensors_enabled = msg.onboard_control_sensors_enabled;
    health.sensors_health = msg.onboard_control_sensors_health;

    health.load_permille = msg.load;
    health.drop_rate_comm = msg.drop_rate_comm;
    health.errors_comm = msg.errors_comm;
    health.errors_count1 = msg.errors_count1;
    health.errors_count2 = msg.errors_count2;
    health.errors_count3 = msg.errors_count3;
    health.errors_count4 = msg.errors_count4;

    health.voltage_battery_mv = msg.voltage_battery;
    health.current_battery_ca = msg.current_battery;
    health.battery_remaining_pct = msg.battery_remaining;

    if (battery.voltage_mv == 0 &&
        msg.voltage_battery != UINT16_MAX) {
        battery.voltage_mv = msg.voltage_battery;
    }

    battery.current_ca = msg.current_battery;
    battery.remaining_pct = msg.battery_remaining;

    mark_pending(PublishKind::SYSTEM_HEALTH);
    mark_pending(PublishKind::BATTERY_STATUS);
}

void process_battery_status(const mavlink_message_t& message) {
    mavlink_battery_status_t msg{};
    mavlink_msg_battery_status_decode(&message, &msg);

    battery.id = msg.id;

    const uint32_t summed_voltage = battery_voltage_sum_mv(msg);

    if (summed_voltage > 0) {
        battery.voltage_mv = summed_voltage;
    } else if (health.voltage_battery_mv != UINT16_MAX) {
        battery.voltage_mv = health.voltage_battery_mv;
    }

    battery.current_ca = msg.current_battery;
    battery.remaining_pct = msg.battery_remaining;
    battery.current_consumed_mah = msg.current_consumed;
    battery.energy_consumed_hj = msg.energy_consumed;

    mark_pending(PublishKind::BATTERY_STATUS);
}

void process_gps_raw_int(const mavlink_message_t& message) {
    mavlink_gps_raw_int_t msg{};
    mavlink_msg_gps_raw_int_decode(&message, &msg);

    gps.fix_type = msg.fix_type;
    gps.satellites_visible = msg.satellites_visible;

    gps.eph_cm = msg.eph;
    gps.epv_cm = msg.epv;
    gps.velocity_cms = msg.vel;
    gps.course_cdeg = msg.cog;

    gps.lat_e7 = msg.lat;
    gps.lon_e7 = msg.lon;
    gps.alt_mm = msg.alt;

    mark_pending(PublishKind::GPS_STATUS);
}

void process_global_position_int(
    const mavlink_message_t& message
) {
    mavlink_global_position_int_t msg{};
    mavlink_msg_global_position_int_decode(&message, &msg);

    position.time_boot_ms = msg.time_boot_ms;

    position.lat_e7 = msg.lat;
    position.lon_e7 = msg.lon;
    position.alt_mm = msg.alt;
    position.relative_alt_mm = msg.relative_alt;

    position.vx_cms = msg.vx;
    position.vy_cms = msg.vy;
    position.vz_cms = msg.vz;

    position.heading_cdeg = msg.hdg;

    mark_pending(PublishKind::POSITION);
}

void process_attitude(const mavlink_message_t& message) {
    mavlink_attitude_t msg{};
    mavlink_msg_attitude_decode(&message, &msg);

    attitude.time_boot_ms = msg.time_boot_ms;

    attitude.roll_rad = msg.roll;
    attitude.pitch_rad = msg.pitch;
    attitude.yaw_rad = msg.yaw;

    attitude.rollspeed_rads = msg.rollspeed;
    attitude.pitchspeed_rads = msg.pitchspeed;
    attitude.yawspeed_rads = msg.yawspeed;

    mark_pending(PublishKind::ATTITUDE);
}

void process_vfr_hud(const mavlink_message_t& message) {
    mavlink_vfr_hud_t msg{};
    mavlink_msg_vfr_hud_decode(&message, &msg);

    vfr.airspeed_mps = msg.airspeed;
    vfr.groundspeed_mps = msg.groundspeed;
    vfr.heading_deg = msg.heading;
    vfr.throttle_pct = msg.throttle;
    vfr.altitude_m = msg.alt;
    vfr.climb_mps = msg.climb;

    mark_pending(PublishKind::VFR_HUD);
}

void process_system_time(const mavlink_message_t& message) {
    mavlink_system_time_t msg{};
    mavlink_msg_system_time_decode(&message, &msg);

    system_time.unix_usec = msg.time_unix_usec;
    system_time.boot_ms = msg.time_boot_ms;

    mark_pending(PublishKind::SYSTEM_TIME);
}

void process_message(const mavlink_message_t& message) {
    if (message.msgid == MAVLINK_MSG_ID_HEARTBEAT) {
        process_heartbeat(message);
        return;
    }

    if (!source_is_selected_fc(message)) {
        return;
    }

    last_message_ms = millis();
    ++received_messages;

    switch (message.msgid) {
        case MAVLINK_MSG_ID_SYS_STATUS:
            process_sys_status(message);
            break;

        case MAVLINK_MSG_ID_BATTERY_STATUS:
            process_battery_status(message);
            break;

        case MAVLINK_MSG_ID_GPS_RAW_INT:
            process_gps_raw_int(message);
            break;

        case MAVLINK_MSG_ID_GLOBAL_POSITION_INT:
            process_global_position_int(message);
            break;

        case MAVLINK_MSG_ID_ATTITUDE:
            process_attitude(message);
            break;

        case MAVLINK_MSG_ID_VFR_HUD:
            process_vfr_hud(message);
            break;

        case MAVLINK_MSG_ID_SYSTEM_TIME:
            process_system_time(message);
            break;

        default:
            break;
    }
}

bool send_document(JsonDocument& doc) {
    uint8_t payload[MAX_SECURE_JSON] = {};

    const size_t length =
        serializeJson(doc, payload, sizeof(payload));

    if (length == 0 || length >= sizeof(payload)) {
        Serial.println("FC_MAVLINK:PUBLISH_JSON_TOO_LARGE");
        return false;
    }

    return comm_send(payload, length);
}

bool publish_flight_mode() {
    JsonDocument doc;

    doc["type"] = "FLIGHT_MODE";
    doc["custom_mode"] = heartbeat.custom_mode;
    doc["base_mode"] = heartbeat.base_mode;
    doc["system_status"] = heartbeat.system_status;
    doc["autopilot"] = heartbeat.autopilot;
    doc["vehicle_type"] = heartbeat.vehicle_type;

    return send_document(doc);
}

bool publish_arm_state() {
    JsonDocument doc;

    doc["type"] = "ARM_STATE";
    doc["armed"] = heartbeat.armed;

    return send_document(doc);
}

bool publish_system_health() {
    JsonDocument doc;

    doc["type"] = "SYSTEM_HEALTH";

    doc["present"] = health.sensors_present;
    doc["enabled"] = health.sensors_enabled;
    doc["health"] = health.sensors_health;

    doc["load_permille"] = health.load_permille;
    doc["comm_drop"] = health.drop_rate_comm;
    doc["comm_errors"] = health.errors_comm;

    doc["err1"] = health.errors_count1;
    doc["err2"] = health.errors_count2;
    doc["err3"] = health.errors_count3;
    doc["err4"] = health.errors_count4;

    return send_document(doc);
}

bool publish_battery_status() {
    JsonDocument doc;

    doc["type"] = "BATTERY_STATUS";
    doc["id"] = battery.id;
    doc["voltage_mv"] = battery.voltage_mv;
    doc["current_ca"] = battery.current_ca;
    doc["remaining_pct"] = battery.remaining_pct;
    doc["consumed_mah"] = battery.current_consumed_mah;
    doc["energy_hj"] = battery.energy_consumed_hj;

    return send_document(doc);
}

bool publish_gps_status() {
    JsonDocument doc;

    doc["type"] = "GPS_STATUS";

    doc["fix_type"] = gps.fix_type;
    doc["satellites"] = gps.satellites_visible;

    doc["eph_cm"] = gps.eph_cm;
    doc["epv_cm"] = gps.epv_cm;
    doc["vel_cms"] = gps.velocity_cms;
    doc["cog_cdeg"] = gps.course_cdeg;

    doc["lat_e7"] = gps.lat_e7;
    doc["lon_e7"] = gps.lon_e7;
    doc["alt_mm"] = gps.alt_mm;

    return send_document(doc);
}

bool publish_position() {
    JsonDocument doc;

    doc["type"] = "POSITION";

    doc["time_boot_ms"] = position.time_boot_ms;

    doc["lat_e7"] = position.lat_e7;
    doc["lon_e7"] = position.lon_e7;
    doc["alt_mm"] = position.alt_mm;
    doc["rel_alt_mm"] = position.relative_alt_mm;

    doc["vx_cms"] = position.vx_cms;
    doc["vy_cms"] = position.vy_cms;
    doc["vz_cms"] = position.vz_cms;

    doc["hdg_cdeg"] = position.heading_cdeg;

    return send_document(doc);
}

bool publish_attitude() {
    JsonDocument doc;

    doc["type"] = "ATTITUDE";
    doc["time_boot_ms"] = attitude.time_boot_ms;

    doc["roll_rad"] = attitude.roll_rad;
    doc["pitch_rad"] = attitude.pitch_rad;
    doc["yaw_rad"] = attitude.yaw_rad;

    doc["rollspeed_rads"] = attitude.rollspeed_rads;
    doc["pitchspeed_rads"] = attitude.pitchspeed_rads;
    doc["yawspeed_rads"] = attitude.yawspeed_rads;

    return send_document(doc);
}

bool publish_vfr_hud() {
    JsonDocument doc;

    doc["type"] = "VFR_HUD";

    doc["airspeed_mps"] = vfr.airspeed_mps;
    doc["groundspeed_mps"] = vfr.groundspeed_mps;
    doc["heading_deg"] = vfr.heading_deg;
    doc["throttle_pct"] = vfr.throttle_pct;
    doc["altitude_m"] = vfr.altitude_m;
    doc["climb_mps"] = vfr.climb_mps;

    return send_document(doc);
}

bool publish_system_time() {
    JsonDocument doc;

    doc["type"] = "SYSTEM_TIME";
    doc["unix_usec"] = system_time.unix_usec;
    doc["boot_ms"] = system_time.boot_ms;

    return send_document(doc);
}

bool publish_kind(PublishKind kind) {
    switch (kind) {
        case PublishKind::FLIGHT_MODE:
            return publish_flight_mode();

        case PublishKind::ARM_STATE:
            return publish_arm_state();

        case PublishKind::SYSTEM_HEALTH:
            return publish_system_health();

        case PublishKind::BATTERY_STATUS:
            return publish_battery_status();

        case PublishKind::GPS_STATUS:
            return publish_gps_status();

        case PublishKind::POSITION:
            return publish_position();

        case PublishKind::ATTITUDE:
            return publish_attitude();

        case PublishKind::VFR_HUD:
            return publish_vfr_hud();

        case PublishKind::SYSTEM_TIME:
            return publish_system_time();

        case PublishKind::COUNT:
        default:
            return false;
    }
}

}  // namespace

bool begin() {
    if (initialized) {
        return true;
    }

    uart_config_t uart_config{};
    uart_config.baud_rate = AERONEXUS_FC_MAVLINK_BAUD;
    uart_config.data_bits = UART_DATA_8_BITS;
    uart_config.parity = UART_PARITY_DISABLE;
    uart_config.stop_bits = UART_STOP_BITS_1;
    uart_config.flow_ctrl = UART_HW_FLOWCTRL_DISABLE;
    uart_config.rx_flow_ctrl_thresh = 0;
    uart_config.source_clk = UART_SCLK_DEFAULT;

    esp_err_t err =
        uart_param_config(FC_UART, &uart_config);

    if (err != ESP_OK) {
        Serial.print("FC_MAVLINK:UART_PARAM_FAILED:");
        Serial.println(static_cast<int>(err));
        return false;
    }

    // RX-only UART.
    //
    // TX remains UART_PIN_NO_CHANGE and no ESP32 TX wire will be connected
    // to the flight controller during this integration stage.
    err = uart_set_pin(
        FC_UART,
        UART_PIN_NO_CHANGE,
        AERONEXUS_FC_MAVLINK_RX_PIN,
        UART_PIN_NO_CHANGE,
        UART_PIN_NO_CHANGE
    );

    if (err != ESP_OK) {
        Serial.print("FC_MAVLINK:UART_PIN_FAILED:");
        Serial.println(static_cast<int>(err));
        return false;
    }

    err = uart_driver_install(
        FC_UART,
        AERONEXUS_FC_MAVLINK_RX_BUFFER_SIZE,
        0,
        0,
        nullptr,
        0
    );

    if (err != ESP_OK) {
        Serial.print("FC_MAVLINK:UART_DRIVER_FAILED:");
        Serial.println(static_cast<int>(err));
        return false;
    }

    initialized = true;

    Serial.print("FC_MAVLINK:RX_ONLY_READY:UART1:GPIO");
    Serial.print(AERONEXUS_FC_MAVLINK_RX_PIN);
    Serial.print(":BAUD=");
    Serial.println(AERONEXUS_FC_MAVLINK_BAUD);

    return true;
}

void poll() {
    if (!initialized) {
        return;
    }

    uint8_t bytes[UART_READ_CHUNK] = {};

    const int count = uart_read_bytes(
        FC_UART,
        bytes,
        sizeof(bytes),
        0
    );

    if (count <= 0) {
        return;
    }

    for (int i = 0; i < count; ++i) {
        if (mavlink_parse_char(
                MAVLINK_COMM_0,
                bytes[i],
                &parser_message,
                &parser_status)) {

            process_message(parser_message);
        }
    }
}

void publish_if_possible() {
    if (!initialized) {
        return;
    }

    if (!comm_session_ready() || comm_tx_busy()) {
        return;
    }

    const uint32_t now = millis();

    if ((now - last_publish_ms) <
        AERONEXUS_FC_MAVLINK_PUBLISH_GAP_MS) {
        return;
    }

    for (uint8_t offset = 0;
         offset < PUBLISH_KIND_COUNT;
         ++offset) {

        const uint8_t index =
            (next_publish_kind + offset) %
            PUBLISH_KIND_COUNT;

        if (!pending[index]) {
            continue;
        }

        const PublishKind kind =
            static_cast<PublishKind>(index);

        if (publish_kind(kind)) {
            pending[index] = false;
            last_publish_ms = now;

            next_publish_kind =
                (index + 1) % PUBLISH_KIND_COUNT;
        }

        // Only one secure telemetry payload per call.
        return;
    }
}

bool link_active() {
    if (!initialized || last_heartbeat_ms == 0) {
        return false;
    }

    return
        (millis() - last_heartbeat_ms) <=
        AERONEXUS_FC_MAVLINK_HEARTBEAT_TIMEOUT_MS;
}

uint32_t message_count() {
    return received_messages;
}

uint32_t last_message_age_ms() {
    if (last_message_ms == 0) {
        return UINT32_MAX;
    }

    return millis() - last_message_ms;
}

uint8_t source_system_id() {
    return fc_sysid;
}

uint8_t source_component_id() {
    return fc_compid;
}

}  // namespace fc_mavlink