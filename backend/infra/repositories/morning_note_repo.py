"""
Morning note repository — daily briefing storage with three-state status.
"""

import json
import os
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import config

import logging

logger = logging.getLogger(__name__)


class MorningNoteRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS morning_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT UNIQUE,
                    status TEXT DEFAULT 'generating',
                    content TEXT,
                    regenerated BOOLEAN DEFAULT 0,
                    error TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def get_today(self) -> Optional[Dict]:
        today = datetime.now().strftime("%Y-%m-%d")
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM morning_notes WHERE date = ?", (today,)
            ).fetchone()
        return self._row_to_dict(row) if row else None

    def get_by_date(self, date_str: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM morning_notes WHERE date = ?", (date_str,)
            ).fetchone()
        return self._row_to_dict(row) if row else None

    def get_latest_success(self) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM morning_notes WHERE status = 'success' ORDER BY date DESC LIMIT 1"
            ).fetchone()
        return self._row_to_dict(row) if row else None

    def upsert_today(self, status: str = "generating", content: Dict = None,
                     regenerated: bool = False, error: str = None) -> Dict:
        today = datetime.now().strftime("%Y-%m-%d")
        now = self._now()
        content_json = json.dumps(content, ensure_ascii=False) if content else None
        with sqlite3.connect(self._db) as conn:
            existing = conn.execute(
                "SELECT id FROM morning_notes WHERE date = ?", (today,)
            ).fetchone()
            if existing:
                sets = ["status = ?", "updated_at = ?", "regenerated = ?"]
                params = [status, now, 1 if regenerated else 0]
                if content_json is not None:
                    sets.append("content = ?")
                    params.append(content_json)
                if error is not None:
                    sets.append("error = ?")
                    params.append(error)
                params.append(existing[0])
                conn.execute(
                    f"UPDATE morning_notes SET {', '.join(sets)} WHERE id = ?", params
                )
            else:
                try:
                    conn.execute(
                        """INSERT INTO morning_notes
                        (date, status, content, regenerated, error, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (today, status, content_json, 1 if regenerated else 0, error, now, now),
                    )
                except sqlite3.IntegrityError:
                    # Race condition: another request inserted first, update instead
                    sets = ["status = ?", "updated_at = ?", "regenerated = ?"]
                    params = [status, now, 1 if regenerated else 0]
                    if content_json is not None:
                        sets.append("content = ?")
                        params.append(content_json)
                    if error is not None:
                        sets.append("error = ?")
                        params.append(error)
                    params.append(today)
                    conn.execute(
                        f"UPDATE morning_notes SET {', '.join(sets)} WHERE date = ?", params
                    )
        return self.get_by_date(today)

    def list_history(self, days: int = 30) -> List[Dict]:
        start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        today = datetime.now().strftime("%Y-%m-%d")
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM morning_notes WHERE date >= ? AND date <= ? ORDER BY date DESC",
                (start, today),
            ).fetchall()
        existing = {r["date"]: self._row_to_dict(r) for r in rows}
        result = []
        d = datetime.now()
        for i in range(days):
            ds = d.strftime("%Y-%m-%d")
            if ds in existing:
                result.append(existing[ds])
            else:
                result.append({"date": ds, "status": "missing", "content": None})
            d -= timedelta(days=1)
        return result

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
        content = row["content"]
        if content and isinstance(content, str):
            try:
                content = json.loads(content)
            except (json.JSONDecodeError, TypeError):
                pass
        return {
            "id": row["id"],
            "date": row["date"],
            "status": row["status"],
            "content": content,
            "regenerated": bool(row["regenerated"]),
            "error": row["error"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }


morning_note_repo = MorningNoteRepository()
