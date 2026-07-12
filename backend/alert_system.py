import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DATABASE_PATH = Path(__file__).with_name("aeronexus.db")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_alert_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS alert_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                mobile TEXT NOT NULL UNIQUE,
                district TEXT NOT NULL,
                role TEXT NOT NULL,
                alert_types TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS emergency_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                location TEXT NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS alert_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER NOT NULL,
                contact_id INTEGER NOT NULL,
                mobile TEXT NOT NULL,
                status TEXT NOT NULL,
                channel TEXT NOT NULL,
                provider_message_id TEXT,
                error TEXT,
                sent_at TEXT NOT NULL,
                FOREIGN KEY(alert_id) REFERENCES emergency_alerts(id),
                FOREIGN KEY(contact_id) REFERENCES alert_contacts(id)
            )
            """
        )

        connection.commit()


def seed_demo_alert_contacts() -> None:
    demo_contacts = [
        {
            "name": "Ahmedabad Flood Control",
            "mobile": "9000000001",
            "district": "Ahmedabad",
            "role": "admin",
            "alert_types": "flood,evacuation,critical",
        },
        {
            "name": "Rescue Team Alpha",
            "mobile": "9000000002",
            "district": "Ahmedabad",
            "role": "rescue",
            "alert_types": "flood,fire,evacuation,drone-detection",
        },
        {
            "name": "Police Control Room",
            "mobile": "9000000003",
            "district": "Ahmedabad",
            "role": "police",
            "alert_types": "flood,fire,evacuation,critical",
        },
    ]

    with get_connection() as connection:
        for contact in demo_contacts:
            connection.execute(
                """
                INSERT OR IGNORE INTO alert_contacts
                (name, mobile, district, role, alert_types, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                """,
                (
                    contact["name"],
                    contact["mobile"],
                    contact["district"],
                    contact["role"],
                    contact["alert_types"],
                    now_iso(),
                ),
            )

        connection.commit()


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def get_alert_contacts() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, mobile, district, role, alert_types, is_active, created_at
            FROM alert_contacts
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [row_to_dict(row) for row in rows]


def create_alert_contact(payload: dict[str, Any]) -> dict[str, Any]:
    name = str(payload.get("name", "")).strip()
    mobile = str(payload.get("mobile", "")).strip()
    district = str(payload.get("district", "")).strip()
    role = str(payload.get("role", "citizen")).strip()
    alert_types = payload.get("alert_types", ["flood"])

    if isinstance(alert_types, list):
        alert_types_text = ",".join(str(item).strip() for item in alert_types)
    else:
        alert_types_text = str(alert_types)

    if not name:
        raise ValueError("Contact name is required")

    if not mobile:
        raise ValueError("Mobile number is required")

    if not district:
        raise ValueError("District is required")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO alert_contacts
            (name, mobile, district, role, alert_types, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            """,
            (name, mobile, district, role, alert_types_text, now_iso()),
        )

        connection.commit()

        contact_id = cursor.lastrowid

        row = connection.execute(
            """
            SELECT id, name, mobile, district, role, alert_types, is_active, created_at
            FROM alert_contacts
            WHERE id = ?
            """,
            (contact_id,),
        ).fetchone()

    return row_to_dict(row)


def get_alerts() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, alert_type, severity, title, message, location, created_at, status
            FROM emergency_alerts
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [row_to_dict(row) for row in rows]


def get_alert_deliveries(alert_id: int) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                d.id,
                d.alert_id,
                d.contact_id,
                c.name,
                c.role,
                c.district,
                d.mobile,
                d.status,
                d.channel,
                d.provider_message_id,
                d.error,
                d.sent_at
            FROM alert_deliveries d
            JOIN alert_contacts c ON c.id = d.contact_id
            WHERE d.alert_id = ?
            ORDER BY d.sent_at DESC
            """,
            (alert_id,),
        ).fetchall()

    return [row_to_dict(row) for row in rows]


def contact_matches_alert(contact: dict[str, Any], alert_type: str, district: str) -> bool:
    if not contact["is_active"]:
        return False

    contact_district = str(contact["district"]).lower()
    target_district = district.lower()

    if contact_district != target_district and contact_district != "all":
        return False

    alert_types = str(contact["alert_types"]).lower().split(",")

    return alert_type.lower() in alert_types or "critical" in alert_types


def build_sms_message({
    "severity": severity,
    "title": title,
    "message": message,
    "location": location,
}: dict[str, Any]) -> str:
    return (
        f"AeroNexus Alert [{str(severity).upper()}]\\n"
        f"{title}\\n"
        f"Location: {location}\\n"
        f"{message}\\n"
        f"Follow official instructions."
    )


def simulate_mobile_send(mobile: str, message: str) -> dict[str, Any]:
    print("[SIMULATED_SMS]", mobile, message.replace("\\n", " | "))

    return {
        "status": "sent",
        "channel": "sms_simulator",
        "provider_message_id": f"SIM-{datetime.now().timestamp()}",
        "error": None,
    }


def create_and_send_alert(payload: dict[str, Any]) -> dict[str, Any]:
    alert_type = str(payload.get("alert_type", "flood")).strip()
    severity = str(payload.get("severity", "warning")).strip()
    title = str(payload.get("title", "Emergency Alert")).strip()
    message = str(payload.get("message", "")).strip()
    location = str(payload.get("location", "Ahmedabad")).strip()
    district = str(payload.get("district", "Ahmedabad")).strip()

    if not message:
        raise ValueError("Alert message is required")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO emergency_alerts
            (alert_type, severity, title, message, location, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                alert_type,
                severity,
                title,
                message,
                location,
                now_iso(),
                "processing",
            ),
        )

        alert_id = cursor.lastrowid
        connection.commit()

    contacts = get_alert_contacts()
    matched_contacts = [
        contact
        for contact in contacts
        if contact_matches_alert(contact, alert_type, district)
    ]

    alert_payload = {
        "severity": severity,
        "title": title,
        "message": message,
        "location": location,
    }

    sms_message = build_sms_message(alert_payload)

    delivery_results = []

    with get_connection() as connection:
        for contact in matched_contacts:
            result = simulate_mobile_send(contact["mobile"], sms_message)

            connection.execute(
                """
                INSERT INTO alert_deliveries
                (
                    alert_id,
                    contact_id,
                    mobile,
                    status,
                    channel,
                    provider_message_id,
                    error,
                    sent_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    alert_id,
                    contact["id"],
                    contact["mobile"],
                    result["status"],
                    result["channel"],
                    result["provider_message_id"],
                    result["error"],
                    now_iso(),
                ),
            )

            delivery_results.append(
                {
                    "contact_id": contact["id"],
                    "name": contact["name"],
                    "mobile": contact["mobile"],
                    "status": result["status"],
                    "channel": result["channel"],
                }
            )

        connection.execute(
            """
            UPDATE emergency_alerts
            SET status = ?
            WHERE id = ?
            """,
            ("sent_simulated", alert_id),
        )

        connection.commit()

    return {
        "alert_id": alert_id,
        "matched_contacts": len(matched_contacts),
        "deliveries": delivery_results,
        "status": "sent_simulated",
    }