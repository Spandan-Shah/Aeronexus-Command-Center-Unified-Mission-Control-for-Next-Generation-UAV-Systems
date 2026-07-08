import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "aeronexus.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_database():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            time TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS commands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            time TEXT NOT NULL,
            command TEXT NOT NULL,
            result TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def insert_event(time: str, event_type: str, message: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO events (time, type, message) VALUES (?, ?, ?)",
        (time, event_type, message),
    )

    conn.commit()
    conn.close()


def insert_command(time: str, command: str, result: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO commands (time, command, result) VALUES (?, ?, ?)",
        (time, command, result),
    )

    conn.commit()
    conn.close()


def get_events():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, time, type, message FROM events ORDER BY id DESC LIMIT 50"
    )

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "time": row[1],
            "type": row[2],
            "message": row[3],
        }
        for row in rows
    ]