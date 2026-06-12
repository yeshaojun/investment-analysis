"""
Thesis repository — structured investment thesis with soft versioning.
"""

import json
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

import config

import logging

logger = logging.getLogger(__name__)


class ThesisRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS thesis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    thesis_statement TEXT,
                    pillars TEXT,
                    risks TEXT,
                    conviction TEXT DEFAULT 'medium',
                    stop_loss REAL,
                    version INTEGER DEFAULT 1,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "symbol": row["symbol"],
            "thesis_statement": row["thesis_statement"],
            "pillars": json.loads(row["pillars"]) if row["pillars"] else [],
            "risks": json.loads(row["risks"]) if row["risks"] else [],
            "conviction": row["conviction"],
            "stop_loss": row["stop_loss"],
            "version": row["version"],
            "is_active": bool(row["is_active"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def get_active(self, symbol: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM thesis WHERE symbol = ? AND is_active = 1",
                (symbol,),
            ).fetchone()
        return self._row_to_dict(row) if row else None

    def get_by_id(self, thesis_id: int) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM thesis WHERE id = ?", (thesis_id,)
            ).fetchone()
        return self._row_to_dict(row) if row else None

    def list_active(self) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM thesis WHERE is_active = 1 ORDER BY updated_at DESC"
            ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def deactivate_all(self, symbol: str) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                "UPDATE thesis SET is_active = 0 WHERE symbol = ? AND is_active = 1",
                (symbol,),
            )

    def get_next_version(self, symbol: str) -> int:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute(
                "SELECT MAX(version) FROM thesis WHERE symbol = ?", (symbol,)
            ).fetchone()
        return (row[0] or 0) + 1

    def create(self, data: Dict) -> Dict:
        now = self._now()
        pillars_json = json.dumps(data.get("pillars", []), ensure_ascii=False)
        risks_json = json.dumps(data.get("risks", []), ensure_ascii=False)
        with sqlite3.connect(self._db) as conn:
            cursor = conn.execute(
                """INSERT INTO thesis
                (symbol, thesis_statement, pillars, risks, conviction, stop_loss,
                 version, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                (
                    data["symbol"],
                    data.get("thesis_statement", ""),
                    pillars_json,
                    risks_json,
                    data.get("conviction", "medium"),
                    data.get("stop_loss"),
                    data.get("version", 1),
                    now, now,
                ),
            )
            thesis_id = cursor.lastrowid
        return self.get_by_id(thesis_id)

    def update(self, symbol: str, data: Dict) -> Optional[Dict]:
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            row = conn.execute(
                "SELECT id FROM thesis WHERE symbol = ? AND is_active = 1", (symbol,)
            ).fetchone()
            if not row:
                return None
            thesis_id = row[0]
            sets = ["updated_at = ?"]
            params = [now]
            if "conviction" in data:
                sets.append("conviction = ?")
                params.append(data["conviction"])
            if "stop_loss" in data:
                sets.append("stop_loss = ?")
                params.append(data["stop_loss"])
            if "thesis_statement" in data:
                sets.append("thesis_statement = ?")
                params.append(data["thesis_statement"])
            if "pillars" in data:
                sets.append("pillars = ?")
                params.append(json.dumps(data["pillars"], ensure_ascii=False))
            if "risks" in data:
                sets.append("risks = ?")
                params.append(json.dumps(data["risks"], ensure_ascii=False))
            params.append(thesis_id)
            conn.execute(
                f"UPDATE thesis SET {', '.join(sets)} WHERE id = ?", params
            )
        return self.get_by_id(thesis_id)

    def update_pillar_status(self, symbol: str, pillar_uuid: str, status: str) -> Optional[Dict]:
        thesis = self.get_active(symbol)
        if not thesis:
            return None
        pillars = thesis["pillars"]
        for p in pillars:
            if p.get("id") == pillar_uuid:
                p["status"] = status
                break
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                "UPDATE thesis SET pillars = ?, updated_at = ? WHERE id = ?",
                (json.dumps(pillars, ensure_ascii=False), now, thesis["id"]),
            )
        updated = self.get_by_id(thesis["id"])
        if status == "invalidated" and updated:
            if updated["conviction"] != "low":
                updated = self.update(symbol, {"conviction": "low"})
        return updated


thesis_repo = ThesisRepository()
