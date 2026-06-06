import sqlite3
import json
import time
from config import DB_PATH, CACHE_TTL_SECONDS


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache "
        "(key TEXT PRIMARY KEY, value TEXT, ts REAL)"
    )
    conn.commit()
    return conn


def get(key: str):
    with _conn() as conn:
        row = conn.execute(
            "SELECT value, ts FROM cache WHERE key=?", (key,)
        ).fetchone()
    if row and (time.time() - row[1]) < CACHE_TTL_SECONDS:
        return json.loads(row[0])
    return None


def set(key: str, value):
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, ts) VALUES (?,?,?)",
            (key, json.dumps(value), time.time()),
        )
        conn.commit()
