"""
Data sync status repository — track refresh task progress.
"""

import os
import sqlite3
from datetime import datetime
from typing import Dict, Optional

import config

import logging

logger = logging.getLogger(__name__)


class DataSyncStatusRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS data_sync_status (
                    task TEXT PRIMARY KEY,
                    status TEXT DEFAULT 'never',
                    progress INTEGER DEFAULT 0,
                    total INTEGER DEFAULT 0,
                    started_at TEXT,
                    finished_at TEXT,
                    error TEXT
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def get(self, task: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM data_sync_status WHERE task = ?", (task,)
            ).fetchone()
        return dict(row) if row else None

    def upsert(self, task: str, status: str, progress: int = 0,
               total: int = 0, error: str = None) -> None:
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            existing = conn.execute(
                "SELECT task FROM data_sync_status WHERE task = ?", (task,)
            ).fetchone()
            if existing:
                sets = ["status = ?", "progress = ?", "total = ?"]
                params = [status, progress, total]
                if status == "running" and not existing:
                    sets.append("started_at = ?")
                    params.append(now)
                if status in ("done", "failed"):
                    sets.append("finished_at = ?")
                    params.append(now)
                if error is not None:
                    sets.append("error = ?")
                    params.append(error)
                params.append(task)
                conn.execute(
                    f"UPDATE data_sync_status SET {', '.join(sets)} WHERE task = ?", params
                )
            else:
                conn.execute(
                    """INSERT INTO data_sync_status
                    (task, status, progress, total, started_at, finished_at, error)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (task, status, progress, total,
                     now if status == "running" else None,
                     now if status in ("done", "failed") else None,
                     error),
                )

    def update_progress(self, task: str, progress: int, total: int) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                "UPDATE data_sync_status SET progress = ?, total = ? WHERE task = ?",
                (progress, total, task),
            )


data_sync_status_repo = DataSyncStatusRepository()
