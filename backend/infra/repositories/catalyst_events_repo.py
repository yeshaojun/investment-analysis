"""
Catalyst events repository — independent table for catalyst events.
"""

import os
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import config

import logging

logger = logging.getLogger(__name__)


class CatalystEventsRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS catalyst_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    thesis_id INTEGER,
                    symbol TEXT NOT NULL,
                    date TEXT NOT NULL,
                    event TEXT,
                    impact TEXT DEFAULT 'medium',
                    notes TEXT,
                    created_at TEXT,
                    FOREIGN KEY (thesis_id) REFERENCES thesis(id)
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def add(self, data: Dict) -> Dict:
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            cursor = conn.execute(
                """INSERT INTO catalyst_events
                (thesis_id, symbol, date, event, impact, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    data.get("thesis_id"),
                    data["symbol"],
                    data["date"],
                    data.get("event", ""),
                    data.get("impact", "medium"),
                    data.get("notes", ""),
                    now,
                ),
            )
            event_id = cursor.lastrowid
        return {"id": event_id, **data, "created_at": now}

    def delete(self, event_id: int) -> bool:
        with sqlite3.connect(self._db) as conn:
            cursor = conn.execute("DELETE FROM catalyst_events WHERE id = ?", (event_id,))
            return cursor.rowcount > 0

    def get_by_thesis(self, thesis_id: int) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM catalyst_events WHERE thesis_id = ? ORDER BY date ASC",
                (thesis_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_by_symbol(self, symbol: str) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT * FROM catalyst_events
                WHERE symbol = ? AND date >= date('now', '-30 days')
                ORDER BY date ASC""",
                (symbol,),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_by_date_range(self, start_date: str, end_date: str, symbols: List[str] = None) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            if symbols:
                placeholders = ",".join("?" * len(symbols))
                rows = conn.execute(
                    f"""SELECT * FROM catalyst_events
                    WHERE date >= ? AND date <= ? AND symbol IN ({placeholders})
                    ORDER BY date ASC""",
                    [start_date, end_date] + list(symbols),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM catalyst_events WHERE date >= ? AND date <= ? ORDER BY date ASC",
                    (start_date, end_date),
                ).fetchall()
        return [dict(r) for r in rows]

    def copy_future_catalysts(self, old_thesis_id: int, new_thesis_id: int, new_symbol: str) -> int:
        """Copy unexpired catalysts from old thesis to new version. Returns count copied."""
        today = datetime.now().strftime("%Y-%m-%d")
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM catalyst_events WHERE thesis_id = ? AND date >= ?",
                (old_thesis_id, today),
            ).fetchall()
            count = 0
            for row in rows:
                conn.execute(
                    """INSERT INTO catalyst_events
                    (thesis_id, symbol, date, event, impact, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        new_thesis_id, new_symbol,
                        row["date"], row["event"], row["impact"],
                        row["notes"], self._now(),
                    ),
                )
                count += 1
            return count


catalyst_events_repo = CatalystEventsRepository()
