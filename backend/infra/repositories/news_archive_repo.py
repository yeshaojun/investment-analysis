"""
News archive repository — stores scored news for retrospective browsing.
"""

import os
import sqlite3
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import config

import logging

logger = logging.getLogger(__name__)


def compute_score(published_at: str, is_symbol_match: bool, source_weight: float = 1.0) -> float:
    """
    Score a news item: 0.0 ~ 1.0.
    - Recency: exponential decay, half-life 2 days
    - Symbol match: +0.3 if directly about a watched stock
    - Source weight: industry association / official = 1.0, general = 0.7
    """
    try:
        pub = datetime.fromisoformat(published_at.replace("Z", "+00:00").replace("+00:00", ""))
        age_days = max((datetime.now() - pub).total_seconds() / 86400, 0)
    except (ValueError, TypeError):
        age_days = 7

    recency = math.exp(-0.35 * age_days)  # half-life ~2 days
    symbol_bonus = 0.3 if is_symbol_match else 0.0
    score = (recency + symbol_bonus) * source_weight
    return round(min(score, 1.0), 4)


class NewsArchiveRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS news_archive (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    date TEXT,
                    title TEXT,
                    snippet TEXT,
                    source_url TEXT,
                    layer TEXT,
                    score REAL DEFAULT 0,
                    published_at TEXT,
                    created_at TEXT
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_news_date ON news_archive(date)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_news_symbol ON news_archive(symbol)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_news_score ON news_archive(score DESC)
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def save_batch(self, items: List[Dict]) -> int:
        """Save a batch of news items, returns count saved."""
        now = self._now()
        saved = 0
        with sqlite3.connect(self._db) as conn:
            for item in items:
                # Dedup by title+date
                existing = conn.execute(
                    "SELECT id FROM news_archive WHERE title = ? AND date = ?",
                    (item.get("title", ""), item.get("date", "")),
                ).fetchone()
                if existing:
                    continue
                conn.execute(
                    """INSERT INTO news_archive
                    (symbol, date, title, snippet, source_url, layer, score, published_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        item.get("symbol", ""),
                        item.get("date", now[:10]),
                        item.get("title", ""),
                        item.get("snippet", ""),
                        item.get("source_url", ""),
                        item.get("layer", "company"),
                        item.get("score", 0),
                        item.get("published_at", now),
                        now,
                    ),
                )
                saved += 1
        return saved

    def query(
        self,
        start_date: str = None,
        end_date: str = None,
        symbol: str = None,
        layer: str = None,
        min_score: float = 0,
        limit: int = 50,
    ) -> List[Dict]:
        """Query news archive with filters, ordered by date DESC then score DESC."""
        conditions = []
        params: list = []

        if start_date:
            conditions.append("date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("date <= ?")
            params.append(end_date)
        if symbol:
            conditions.append("symbol = ?")
            params.append(symbol)
        if layer:
            conditions.append("layer = ?")
            params.append(layer)
        if min_score > 0:
            conditions.append("score >= ?")
            params.append(min_score)

        where = " AND ".join(conditions) if conditions else "1=1"
        params.append(limit)

        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                f"""SELECT * FROM news_archive
                WHERE {where}
                ORDER BY date DESC, score DESC
                LIMIT ?""",
                params,
            ).fetchall()
        return [dict(r) for r in rows]

    def get_by_date(self, date_str: str) -> List[Dict]:
        """Get all news for a specific date, ordered by score DESC."""
        return self.query(start_date=date_str, end_date=date_str, limit=100)

    def get_latest(self, limit: int = 20) -> List[Dict]:
        """Get most recent news across all dates."""
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM news_archive ORDER BY date DESC, score DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_dates(self, days: int = 30) -> List[Dict]:
        """Get distinct dates with news counts."""
        start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        with sqlite3.connect(self._db) as conn:
            rows = conn.execute(
                """SELECT date, COUNT(*) as count, MAX(score) as max_score
                FROM news_archive WHERE date >= ?
                GROUP BY date ORDER BY date DESC""",
                (start,),
            ).fetchall()
        return [{"date": r[0], "count": r[1], "max_score": r[2]} for r in rows]


news_archive_repo = NewsArchiveRepository()
