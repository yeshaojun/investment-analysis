"""
Watchlist repository — persistent watchlist (symbol + added_at).
"""

import os
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import config

import logging

logger = logging.getLogger(__name__)


class WatchlistRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS watchlist (
                    symbol TEXT PRIMARY KEY,
                    added_at TEXT
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def add(self, symbol: str) -> bool:
        """Add symbol to watchlist. Returns True if newly added, False if already exists."""
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            existing = conn.execute(
                "SELECT symbol FROM watchlist WHERE symbol = ?", (symbol,)
            ).fetchone()
            if existing:
                return False
            conn.execute(
                "INSERT INTO watchlist (symbol, added_at) VALUES (?, ?)",
                (symbol, now),
            )
            return True

    def remove(self, symbol: str) -> bool:
        """Remove symbol from watchlist. Returns True if removed."""
        with sqlite3.connect(self._db) as conn:
            cursor = conn.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol,))
            return cursor.rowcount > 0

    def list_all(self) -> List[Dict]:
        """Return all watchlist entries."""
        with sqlite3.connect(self._db) as conn:
            rows = conn.execute(
                "SELECT symbol, added_at FROM watchlist ORDER BY added_at DESC"
            ).fetchall()
        return [{"symbol": r[0], "added_at": r[1]} for r in rows]

    def get_symbols(self) -> List[str]:
        """Return just the symbol list."""
        with sqlite3.connect(self._db) as conn:
            rows = conn.execute("SELECT symbol FROM watchlist ORDER BY added_at DESC").fetchall()
        return [r[0] for r in rows]

    def is_watching(self, symbol: str) -> bool:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute(
                "SELECT 1 FROM watchlist WHERE symbol = ?", (symbol,)
            ).fetchone()
        return row is not None


watchlist_repo = WatchlistRepository()
