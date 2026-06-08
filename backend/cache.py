import sqlite3
import json
import time
from config import DB_PATH, CACHE_TTL_SECONDS


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache "
        "(key TEXT PRIMARY KEY, value TEXT, ts REAL, ttl REAL)"
    )
    # Migration: add ttl column to existing databases
    try:
        conn.execute("ALTER TABLE cache ADD COLUMN ttl REAL")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    conn.commit()
    return conn


def get(key: str):
    with _conn() as conn:
        row = conn.execute(
            "SELECT value, ts, ttl FROM cache WHERE key=?", (key,)
        ).fetchone()
    if row:
        ttl = row[2] if row[2] is not None else CACHE_TTL_SECONDS
        if (time.time() - row[1]) < ttl:
            return json.loads(row[0])
    return None


def set(key: str, value, ttl: int = None):
    actual_ttl = ttl if ttl is not None else CACHE_TTL_SECONDS
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, ts, ttl) VALUES (?,?,?,?)",
            (key, json.dumps(value), time.time(), actual_ttl),
        )
        conn.commit()
