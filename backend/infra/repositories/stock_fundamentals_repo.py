"""
Stock fundamentals repository — pre-computed financial metrics for screening.
Composite primary key: (symbol, year).
"""

import os
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import config

import logging

logger = logging.getLogger(__name__)


class StockFundamentalsRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS stock_fundamentals (
                    symbol TEXT NOT NULL,
                    name TEXT,
                    industry TEXT,
                    year INTEGER NOT NULL,
                    report_date TEXT,
                    roe REAL,
                    revenue_growth REAL,
                    net_profit_growth REAL,
                    gross_margin REAL,
                    pe REAL,
                    pb REAL,
                    dividend_yield REAL,
                    pe_snapshot_date TEXT,
                    debt_ratio REAL,
                    fcf_ratio REAL,
                    frozen BOOLEAN DEFAULT 0,
                    PRIMARY KEY (symbol, year)
                )
            """)

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    def upsert(self, data: Dict) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO stock_fundamentals
                (symbol, name, industry, year, report_date, roe, revenue_growth,
                 net_profit_growth, gross_margin, pe, pb, dividend_yield,
                 pe_snapshot_date, debt_ratio, fcf_ratio, frozen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    data["symbol"], data.get("name"), data.get("industry"),
                    data["year"], data.get("report_date"),
                    data.get("roe"), data.get("revenue_growth"),
                    data.get("net_profit_growth"), data.get("gross_margin"),
                    data.get("pe"), data.get("pb"), data.get("dividend_yield"),
                    data.get("pe_snapshot_date"), data.get("debt_ratio"),
                    data.get("fcf_ratio"), 1 if data.get("frozen") else 0,
                ),
            )

    def bulk_upsert(self, records: List[Dict]) -> None:
        with sqlite3.connect(self._db) as conn:
            for data in records:
                conn.execute(
                    """INSERT OR REPLACE INTO stock_fundamentals
                    (symbol, name, industry, year, report_date, roe, revenue_growth,
                     net_profit_growth, gross_margin, pe, pb, dividend_yield,
                     pe_snapshot_date, debt_ratio, fcf_ratio, frozen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        data["symbol"], data.get("name"), data.get("industry"),
                        data["year"], data.get("report_date"),
                        data.get("roe"), data.get("revenue_growth"),
                        data.get("net_profit_growth"), data.get("gross_margin"),
                        data.get("pe"), data.get("pb"), data.get("dividend_yield"),
                        data.get("pe_snapshot_date"), data.get("debt_ratio"),
                        data.get("fcf_ratio"), 1 if data.get("frozen") else 0,
                    ),
                )

    def get_latest_by_symbol(self, symbol: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                """SELECT * FROM stock_fundamentals
                WHERE symbol = ?
                ORDER BY year DESC LIMIT 1""",
                (symbol,),
            ).fetchone()
        return dict(row) if row else None

    def get_multi_year(self, symbol: str, years: int = 3) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT * FROM stock_fundamentals
                WHERE symbol = ?
                ORDER BY year DESC LIMIT ?""",
                (symbol, years),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_all_latest(self) -> List[Dict]:
        """Get the latest year record for each symbol."""
        with sqlite3.connect(self._db) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT * FROM stock_fundamentals t1
                WHERE year = (
                    SELECT MAX(year) FROM stock_fundamentals t2
                    WHERE t2.symbol = t1.symbol
                )
                ORDER BY symbol"""
            ).fetchall()
        return [dict(r) for r in rows]

    def count_symbols(self) -> int:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute("SELECT COUNT(DISTINCT symbol) FROM stock_fundamentals").fetchone()
        return row[0] if row else 0

    def is_empty(self) -> bool:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute("SELECT COUNT(*) FROM stock_fundamentals").fetchone()
        return (row[0] or 0) == 0

    def get_max_report_date(self) -> Optional[str]:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute(
                "SELECT MAX(report_date) FROM stock_fundamentals WHERE report_date IS NOT NULL"
            ).fetchone()
        return row[0] if row and row[0] else None


stock_fundamentals_repo = StockFundamentalsRepository()
