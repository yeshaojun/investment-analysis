"""
Stock repository — all SQLite access is contained here.
Services never write SQL directly.
"""

import logging
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

import config

logger = logging.getLogger(__name__)


class StockRepository:

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db = db_path or config.DB_PATH
        os.makedirs(os.path.dirname(self._db), exist_ok=True)
        self._init_schema()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------

    def _init_schema(self) -> None:
        with sqlite3.connect(self._db) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS stock_info (
                    symbol TEXT PRIMARY KEY,
                    name TEXT,
                    price REAL,
                    change REAL,
                    change_percent REAL,
                    volume INTEGER,
                    market_cap INTEGER,
                    sector TEXT,
                    industry TEXT,
                    last_updated TEXT,
                    market TEXT,
                    currency TEXT,
                    source TEXT,
                    as_of TEXT,
                    data_version TEXT,
                    available INTEGER DEFAULT 1,
                    updated_at TEXT
                );

                CREATE TABLE IF NOT EXISTS stock_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    date TEXT,
                    interval TEXT DEFAULT '1d',
                    adjust_type TEXT DEFAULT 'qfq',
                    open REAL, high REAL, low REAL, close REAL, volume INTEGER,
                    amount REAL,
                    source TEXT,
                    updated_at TEXT,
                    UNIQUE(symbol, date, interval, adjust_type)
                );

                CREATE TABLE IF NOT EXISTS financial_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    year INTEGER,
                    quarter INTEGER,
                    revenue REAL, net_profit REAL,
                    gross_margin REAL, net_margin REAL,
                    operating_cash_flow REAL,
                    eps REAL, roe REAL,
                    revenue_yoy REAL, profit_yoy REAL, price_yoy REAL,
                    report_date TEXT,
                    announced_at TEXT,
                    period_type TEXT,
                    currency TEXT,
                    source TEXT,
                    data_version TEXT,
                    is_restated INTEGER DEFAULT 0,
                    total_assets REAL,
                    total_liabilities REAL,
                    shareholder_equity REAL,
                    cash_and_equivalents REAL,
                    interest_bearing_debt REAL,
                    accounts_receivable REAL,
                    inventory REAL,
                    gross_profit REAL,
                    operating_profit REAL,
                    investing_cash_flow REAL,
                    financing_cash_flow REAL,
                    free_cash_flow REAL,
                    capex REAL,
                    created_at TEXT,
                    UNIQUE(symbol, year, quarter)
                );

                CREATE TABLE IF NOT EXISTS tracked_symbols (
                    symbol TEXT PRIMARY KEY,
                    market TEXT,
                    name TEXT,
                    priority INTEGER DEFAULT 2,
                    enabled INTEGER DEFAULT 1,
                    reason TEXT DEFAULT 'manual',
                    created_at TEXT,
                    updated_at TEXT
                );

                CREATE TABLE IF NOT EXISTS search_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT, name TEXT, searched_at TEXT
                );

                CREATE TABLE IF NOT EXISTS industry_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    industry_name TEXT UNIQUE,
                    industry_code TEXT,
                    market_size REAL, growth_rate REAL,
                    policy_support TEXT, future_prospect TEXT, description TEXT,
                    created_at TEXT
                );

                CREATE TABLE IF NOT EXISTS company_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT UNIQUE,
                    company_profile TEXT, business_model TEXT,
                    competitive_advantage TEXT, management_team TEXT,
                    development_history TEXT, created_at TEXT
                );

                CREATE TABLE IF NOT EXISTS investment_research (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT,
                    broker TEXT, rating TEXT, target_price REAL,
                    report_summary TEXT, key_points TEXT,
                    report_date TEXT, created_at TEXT
                );

                CREATE TABLE IF NOT EXISTS stock_rankings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT, period TEXT, rank_type TEXT,
                    change_percent REAL, volume REAL, market_cap REAL, price REAL,
                    created_at TEXT
                );

                CREATE TABLE IF NOT EXISTS sector_rankings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    industry_name TEXT, period TEXT, rank_type TEXT,
                    change_percent REAL, volume REAL, market_cap REAL,
                    created_at TEXT
                );
            """)
            self._ensure_columns(conn, "stock_info", {
                "market": "TEXT",
                "currency": "TEXT",
                "source": "TEXT",
                "as_of": "TEXT",
                "data_version": "TEXT",
                "available": "INTEGER DEFAULT 1",
                "updated_at": "TEXT",
            })
            self._ensure_columns(conn, "stock_history", {
                "interval": "TEXT DEFAULT '1d'",
                "adjust_type": "TEXT DEFAULT 'qfq'",
                "amount": "REAL",
                "source": "TEXT",
                "updated_at": "TEXT",
            })
            self._ensure_columns(conn, "financial_data", {
                "report_date": "TEXT",
                "announced_at": "TEXT",
                "period_type": "TEXT",
                "currency": "TEXT",
                "source": "TEXT",
                "data_version": "TEXT",
                "is_restated": "INTEGER DEFAULT 0",
                "total_assets": "REAL",
                "total_liabilities": "REAL",
                "shareholder_equity": "REAL",
                "cash_and_equivalents": "REAL",
                "interest_bearing_debt": "REAL",
                "accounts_receivable": "REAL",
                "inventory": "REAL",
                "gross_profit": "REAL",
                "operating_profit": "REAL",
                "investing_cash_flow": "REAL",
                "financing_cash_flow": "REAL",
                "free_cash_flow": "REAL",
                "capex": "REAL",
            })

    @staticmethod
    def _ensure_columns(conn: sqlite3.Connection, table: str, columns: Dict[str, str]) -> None:
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
        for name, definition in columns.items():
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")

    @staticmethod
    def _dict_rows(cursor: sqlite3.Cursor) -> List[Dict[str, Any]]:
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    @staticmethod
    def _data_version(*parts: Any) -> str:
        return ":".join(str(p) for p in parts if p is not None and str(p) != "")

    # ------------------------------------------------------------------
    # Tracked symbols
    # ------------------------------------------------------------------

    def upsert_tracked_symbol(self, data: Dict) -> None:
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            existing = conn.execute(
                "SELECT created_at FROM tracked_symbols WHERE symbol = ?", (data["symbol"],)
            ).fetchone()
            conn.execute(
                """INSERT OR REPLACE INTO tracked_symbols
                (symbol,market,name,priority,enabled,reason,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?)""",
                (
                    data["symbol"], data.get("market", ""), data.get("name", ""),
                    data.get("priority", 2), 1 if data.get("enabled", True) else 0,
                    data.get("reason", "manual"), existing[0] if existing else now, now,
                ),
            )

    def get_tracked_symbols(self, enabled_only: bool = True) -> List[Dict]:
        query = "SELECT * FROM tracked_symbols"
        params: tuple = ()
        if enabled_only:
            query += " WHERE enabled = 1"
        query += " ORDER BY priority ASC, symbol ASC"
        with sqlite3.connect(self._db) as conn:
            rows = self._dict_rows(conn.execute(query, params))
        for row in rows:
            row["enabled"] = bool(row.get("enabled"))
        return rows

    def get_tracked_symbol(self, symbol: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            rows = self._dict_rows(
                conn.execute("SELECT * FROM tracked_symbols WHERE symbol = ?", (symbol,))
            )
        if not rows:
            return None
        rows[0]["enabled"] = bool(rows[0].get("enabled"))
        return rows[0]

    # ------------------------------------------------------------------
    # Stock info snapshots
    # ------------------------------------------------------------------

    def save_stock_info_snapshot(self, data: Dict) -> None:
        now = self._now()
        as_of = data.get("as_of") or data.get("lastUpdated") or now
        data_version = data.get("data_version") or self._data_version(data.get("symbol"), as_of)
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO stock_info
                (symbol,name,price,change,change_percent,volume,market_cap,sector,industry,
                 last_updated,market,currency,source,as_of,data_version,available,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    data["symbol"], data.get("name", ""),
                    data.get("price"), data.get("change"), data.get("changePercent"),
                    data.get("volume"), data.get("marketCap"), data.get("sector", ""),
                    data.get("industry", ""), data.get("lastUpdated", as_of),
                    data.get("market", ""), data.get("currency", ""),
                    data.get("source", ""), as_of, data_version,
                    1 if data.get("available", True) else 0, now,
                ),
            )

    def get_stock_info_snapshot(self, symbol: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            rows = self._dict_rows(
                conn.execute("SELECT * FROM stock_info WHERE symbol = ?", (symbol,))
            )
        if not rows:
            return None
        row = rows[0]
        return {
            "symbol": row["symbol"],
            "name": row.get("name") or row["symbol"],
            "price": row.get("price"),
            "change": row.get("change"),
            "changePercent": row.get("change_percent"),
            "volume": row.get("volume"),
            "marketCap": row.get("market_cap"),
            "sector": row.get("sector") or "",
            "industry": row.get("industry") or "",
            "market": row.get("market") or "",
            "currency": row.get("currency") or "",
            "lastUpdated": row.get("last_updated") or "",
            "source": row.get("source"),
            "as_of": row.get("as_of") or row.get("last_updated"),
            "data_version": row.get("data_version"),
            "available": bool(row.get("available", 1)),
        }

    # ------------------------------------------------------------------
    # Financial data
    # ------------------------------------------------------------------

    def save_financial_data(self, items: List[Dict]) -> None:
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            for item in items:
                data_version = item.get("data_version") or self._data_version(
                    item.get("symbol"), item.get("year"), item.get("quarter"),
                    item.get("source"), item.get("report_date"), item.get("announced_at"),
                )
                conn.execute(
                    """INSERT OR REPLACE INTO financial_data
                    (symbol,year,quarter,revenue,net_profit,gross_margin,net_margin,
                     operating_cash_flow,eps,roe,revenue_yoy,profit_yoy,price_yoy,
                     report_date,announced_at,period_type,currency,source,data_version,is_restated,
                     total_assets,total_liabilities,shareholder_equity,cash_and_equivalents,
                     interest_bearing_debt,accounts_receivable,inventory,gross_profit,
                     operating_profit,investing_cash_flow,financing_cash_flow,free_cash_flow,
                     capex,created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        item["symbol"], item["year"], item["quarter"],
                        item.get("revenue"), item.get("net_profit"),
                        item.get("gross_margin"), item.get("net_margin"),
                        item.get("operating_cash_flow"), item.get("eps"), item.get("roe"),
                        item.get("revenue_yoy"), item.get("profit_yoy"), item.get("price_yoy"),
                        item.get("report_date"), item.get("announced_at"),
                        item.get("period_type", "annual" if item.get("quarter", 0) == 0 else "quarterly"),
                        item.get("currency"), item.get("source"), data_version,
                        1 if item.get("is_restated", False) else 0,
                        item.get("total_assets"), item.get("total_liabilities"),
                        item.get("shareholder_equity"), item.get("cash_and_equivalents"),
                        item.get("interest_bearing_debt"), item.get("accounts_receivable"),
                        item.get("inventory"), item.get("gross_profit"),
                        item.get("operating_profit"), item.get("investing_cash_flow"),
                        item.get("financing_cash_flow"), item.get("free_cash_flow"),
                        item.get("capex"),
                        now,
                    ),
                )

    def get_financial_data(self, symbol: str) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            rows = self._dict_rows(
                conn.execute(
                    """SELECT * FROM financial_data
                       WHERE symbol = ?
                       ORDER BY year DESC, quarter DESC""",
                    (symbol,),
                )
            )
        return rows

    # ------------------------------------------------------------------
    # Industry info
    # ------------------------------------------------------------------

    def get_industry_info(self, name: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute(
                "SELECT * FROM industry_info WHERE industry_name = ?", (name,)
            ).fetchone()
        if not row:
            return None
        return {
            "id": row[0], "industry_name": row[1], "industry_code": row[2],
            "market_size": row[3], "growth_rate": row[4],
            "policy_support": row[5], "future_prospect": row[6],
            "description": row[7], "created_at": row[8],
        }

    def save_industry_info(self, data: Dict) -> None:
        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO industry_info
                (industry_name,industry_code,market_size,growth_rate,
                 policy_support,future_prospect,description,created_at)
                VALUES (?,?,?,?,?,?,?,?)""",
                (
                    data["industry_name"], data.get("industry_code", ""),
                    data.get("market_size", 0), data.get("growth_rate", 0),
                    data.get("policy_support", ""), data.get("future_prospect", ""),
                    data.get("description", ""), now,
                ),
            )

    # ------------------------------------------------------------------
    # Company analysis
    # ------------------------------------------------------------------

    def get_company_analysis(self, symbol: str) -> Optional[Dict]:
        with sqlite3.connect(self._db) as conn:
            row = conn.execute(
                "SELECT * FROM company_analysis WHERE symbol = ?", (symbol,)
            ).fetchone()
        if not row:
            return None
        return {
            "id": row[0], "symbol": row[1], "company_profile": row[2],
            "business_model": row[3], "competitive_advantage": row[4],
            "management_team": row[5], "development_history": row[6], "created_at": row[7],
        }

    def save_company_analysis(self, data: Dict) -> None:
        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO company_analysis
                (symbol,company_profile,business_model,competitive_advantage,
                 management_team,development_history,created_at)
                VALUES (?,?,?,?,?,?,?)""",
                (
                    data["symbol"], data.get("company_profile", ""),
                    data.get("business_model", ""), data.get("competitive_advantage", ""),
                    data.get("management_team", ""), data.get("development_history", ""), now,
                ),
            )

    # ------------------------------------------------------------------
    # Investment research
    # ------------------------------------------------------------------

    def get_investment_research(self, symbol: str) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            rows = conn.execute(
                "SELECT * FROM investment_research WHERE symbol = ? ORDER BY report_date DESC", (symbol,)
            ).fetchall()
        return [
            {
                "id": r[0], "symbol": r[1], "broker": r[2], "rating": r[3],
                "target_price": r[4], "report_summary": r[5], "key_points": r[6],
                "report_date": r[7], "created_at": r[8],
            }
            for r in rows
        ]

    def save_investment_research(self, data: Dict) -> None:
        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")
        with sqlite3.connect(self._db) as conn:
            conn.execute(
                """INSERT INTO investment_research
                (symbol,broker,rating,target_price,report_summary,key_points,report_date,created_at)
                VALUES (?,?,?,?,?,?,?,?)""",
                (
                    data["symbol"], data.get("broker", ""), data.get("rating", ""),
                    data.get("target_price", 0), data.get("report_summary", ""),
                    data.get("key_points", ""), data.get("report_date", ""), now,
                ),
            )

    # ------------------------------------------------------------------
    # Popular stocks (search history)
    # ------------------------------------------------------------------

    def record_search(self, stocks: List[Dict]) -> None:
        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")
        with sqlite3.connect(self._db) as conn:
            for s in stocks:
                conn.execute(
                    "INSERT INTO search_history (symbol,name,searched_at) VALUES (?,?,?)",
                    (s["symbol"], s.get("name", ""), now),
                )

    def get_popular_stocks(self, limit: int = 10) -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            rows = conn.execute(
                """SELECT symbol, name, COUNT(*) as cnt
                   FROM search_history
                   WHERE searched_at > datetime('now', '-7 days')
                   GROUP BY symbol, name
                   ORDER BY cnt DESC
                   LIMIT ?""",
                (limit,),
            ).fetchall()
        return [{"symbol": r[0], "name": r[1], "searchCount": r[2]} for r in rows]

    def search_local_stocks(self, query: str, limit: int = 20) -> List[Dict]:
        q = f"%{query.strip().lower()}%"
        with sqlite3.connect(self._db) as conn:
            rows = conn.execute(
                """SELECT symbol, name, market FROM (
                       SELECT symbol, name, market FROM tracked_symbols
                       UNION ALL
                       SELECT symbol, name, market FROM stock_info
                       UNION ALL
                       SELECT symbol, name, '' AS market FROM search_history
                   )
                   WHERE lower(symbol) LIKE ? OR lower(COALESCE(name, '')) LIKE ?
                   GROUP BY symbol, name, market
                   ORDER BY
                       CASE WHEN lower(symbol) = ? OR lower(COALESCE(name, '')) = ? THEN 0 ELSE 1 END,
                       symbol ASC
                   LIMIT ?""",
                (q, q, query.strip().lower(), query.strip().lower(), limit),
            ).fetchall()
        return [
            {"symbol": r[0], "name": r[1] or r[0], "market": r[2] or ""}
            for r in rows
            if r[0]
        ]

    # ------------------------------------------------------------------
    # History cache
    # ------------------------------------------------------------------

    def save_stock_history(self, symbol: str, data: List[Dict]) -> None:
        now = self._now()
        with sqlite3.connect(self._db) as conn:
            for item in data:
                conn.execute(
                    """INSERT OR REPLACE INTO stock_history
                    (symbol,date,interval,adjust_type,open,high,low,close,volume,amount,source,updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        symbol, item["date"], item.get("interval", "1d"),
                        item.get("adjust_type", "qfq"), item["open"], item["high"],
                        item["low"], item["close"], item["volume"], item.get("amount"),
                        item.get("source"), now,
                    ),
                )

    def get_stock_history(self, symbol: str, interval: str = "1d", adjust_type: str = "qfq") -> List[Dict]:
        with sqlite3.connect(self._db) as conn:
            rows = self._dict_rows(
                conn.execute(
                    """SELECT * FROM stock_history
                       WHERE symbol = ? AND interval = ? AND adjust_type = ?
                       ORDER BY date ASC""",
                    (symbol, interval, adjust_type),
                )
            )
        return rows


stock_repo = StockRepository()
