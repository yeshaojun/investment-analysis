"""
Stock service — business orchestration layer.
Calls providers and repo; contains no SQL and no direct HTTP.
"""

import logging
import math
import time
from datetime import datetime
from typing import Dict, List, Optional

import config
from domain.stock import detect_market, Market, MARKET_CURRENCY, period_to_start_date
from infra.cache import cache
from infra.providers.akshare_provider import akshare_provider
from infra.providers.yfinance_provider import yfinance_provider
from infra.repositories.stock_repo import stock_repo
from infra.technical_indicators import TechnicalIndicators

logger = logging.getLogger(__name__)

# Module-level stock-list memory cache (24 h TTL)
_stock_list_cache: Optional[Dict] = None
_stock_list_ts: float = 0

_FALLBACK_STOCKS = [
    {"symbol": "600031", "name": "三一重工", "market": "A股"},
    {"symbol": "688349", "name": "三一重能", "market": "A股"},
]


def _clean_nan(obj):
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, list):
        return [_clean_nan(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _clean_nan(v) for k, v in obj.items()}
    return obj


def _source_as_of(source: str) -> str:
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")


class StockService:

    # ------------------------------------------------------------------
    # Stock info
    # ------------------------------------------------------------------

    def get_stock_info(self, symbol: str) -> Dict:
        key = f"stock_info:{symbol}"
        cached = cache.get(key)
        if cached:
            logger.info("stock_info cache hit symbol=%s", symbol)
            return cached

        market = detect_market(symbol)
        logger.info("stock_info load start symbol=%s market=%s", symbol, market.value)

        # 1. akshare (A / HK)
        if market in (Market.A, Market.HK):
            data = akshare_provider.get_stock_info(symbol)
            if data:
                logger.info("stock_info provider success symbol=%s provider=akshare", symbol)
                data["market"] = market.value
                data["currency"] = MARKET_CURRENCY[market].value
                data["source"] = data.get("source", "akshare")
                data["as_of"] = data.get("lastUpdated") or _source_as_of("akshare")
                data["available"] = True
                stock_repo.save_stock_info_snapshot(data)
                cache.set(key, data, config.TTL_STOCK_INFO)
                return data

        # 2. yfinance
        data = yfinance_provider.get_stock_info(symbol)
        if data:
            logger.info("stock_info provider success symbol=%s provider=yfinance", symbol)
            data["source"] = data.get("source", "yfinance")
            data["as_of"] = data.get("lastUpdated") or _source_as_of("yfinance")
            data["available"] = True
            stock_repo.save_stock_info_snapshot(data)
            cache.set(key, data, config.TTL_STOCK_INFO)
            return data

        snapshot = stock_repo.get_stock_info_snapshot(symbol)
        if snapshot:
            logger.warning("stock_info stale snapshot used symbol=%s source=%s", symbol, snapshot.get("source"))
            snapshot["is_stale"] = True
            snapshot["available"] = True
            cache.set(key, snapshot, config.TTL_STOCK_INFO)
            return snapshot

        logger.warning("all providers failed for %s, returning unavailable", symbol)
        return {
            "symbol": symbol, "name": symbol, "available": False,
            "reason": "provider_unavailable", "market": market.value,
            "currency": MARKET_CURRENCY[market].value, "source": None,
            "as_of": None, "data_version": None, "is_stale": False,
            "price": None, "change": None, "changePercent": None,
            "volume": None, "marketCap": None, "sector": "", "industry": "",
            "lastUpdated": "",
        }

    # ------------------------------------------------------------------
    # History
    # ------------------------------------------------------------------

    def get_stock_history(
        self, symbol: str, period: str = "1mo", interval: str = "1d",
        include_indicators: bool = True,
    ) -> Dict:
        key = f"stock_history:{symbol}:{period}:{interval}:{include_indicators}"
        cached = cache.get(key)
        if cached:
            return cached

        local_data = self._local_history(symbol, period, interval)
        if local_data:
            result = {"symbol": symbol, "period": period, "interval": interval, "data": local_data}
            if include_indicators and result.get("data"):
                result = self._attach_indicators(result)
            cache.set(key, result, config.TTL_STOCK_HISTORY)
            return result

        market = detect_market(symbol)
        result: Optional[Dict] = None

        if market in (Market.A, Market.HK):
            result = akshare_provider.get_stock_history(symbol, period, interval)

        if not result:
            result = yfinance_provider.get_stock_history(symbol, period, interval)

        if not result:
            logger.warning("no history data for %s, returning empty", symbol)
            result = {"symbol": symbol, "period": period, "interval": interval, "data": []}

        if include_indicators and result.get("data"):
            result = self._attach_indicators(result)

        if result.get("data"):
            stock_repo.save_stock_history(symbol, result["data"])

        cache.set(key, result, config.TTL_STOCK_HISTORY)
        return result

    def _local_history(self, symbol: str, period: str, interval: str) -> List[Dict]:
        rows = stock_repo.get_stock_history(symbol, interval=interval, adjust_type="qfq")
        if not rows:
            rows = stock_repo.get_stock_history(symbol, interval=interval, adjust_type="none")
        if not rows:
            return []
        start_date = period_to_start_date(period)
        start = f"{start_date[:4]}-{start_date[4:6]}-{start_date[6:]}"
        result = []
        for row in rows:
            if row.get("date", "") < start:
                continue
            result.append({
                "date": row["date"], "open": row["open"], "high": row["high"],
                "low": row["low"], "close": row["close"],
                "volume": row["volume"] or 0, "amount": row.get("amount"),
                "interval": row.get("interval", interval),
                "adjust_type": row.get("adjust_type"),
                "source": row.get("source"),
            })
        return result

    def _attach_indicators(self, result: Dict) -> Dict:
        data = result["data"]
        if len(data) < 20:
            return result
        closes = [d["close"] for d in data]
        highs = [d["high"] for d in data]
        lows = [d["low"] for d in data]
        volumes = [d["volume"] for d in data]
        try:
            indicators = {
                "ma5": TechnicalIndicators.sma(closes, 5),
                "ma10": TechnicalIndicators.sma(closes, 10),
                "ma20": TechnicalIndicators.sma(closes, 20),
                "ma60": TechnicalIndicators.sma(closes, 60),
                "ema12": TechnicalIndicators.ema(closes, 12),
                "ema26": TechnicalIndicators.ema(closes, 26),
                "macd": TechnicalIndicators.macd(closes),
                "rsi": TechnicalIndicators.rsi(closes),
                "bollinger_bands": TechnicalIndicators.bollinger_bands(closes),
                "kdj": TechnicalIndicators.kdj(highs, lows, closes),
                "volume_analysis": TechnicalIndicators.volume_analysis(volumes, closes),
            }
            result["indicators"] = _clean_nan(indicators)
        except Exception as exc:
            logger.warning("technical indicator calculation failed: %s", exc)
        return result

    # ------------------------------------------------------------------
    # Financial data
    # ------------------------------------------------------------------

    def get_financial_data(self, symbol: str) -> List[Dict]:
        started = time.perf_counter()
        key = f"financial_data:{symbol}"
        cached = cache.get(key)
        if cached:
            market = detect_market(symbol)
            if not self._should_refresh_financial_cache(cached, market):
                logger.info("financial_data cache hit symbol=%s count=%d", symbol, len(cached))
                return cached
            logger.info(
                "financial_data cache refresh required symbol=%s count=%d",
                symbol, len(cached),
            )

        local_data = stock_repo.get_financial_data(symbol)
        if local_data:
            market = detect_market(symbol)
            if not self._should_refresh_financial_cache(local_data, market):
                logger.info("financial_data local hit symbol=%s count=%d", symbol, len(local_data))
                cache.set(key, local_data, config.TTL_FINANCIAL_DATA)
                return local_data
            logger.info(
                "financial_data local cache refresh required symbol=%s count=%d",
                symbol, len(local_data),
            )

        market = detect_market(symbol)
        data: Optional[List[Dict]] = None
        logger.info("financial_data provider load start symbol=%s market=%s", symbol, market.value)

        if market in (Market.A, Market.HK):
            data = akshare_provider.get_financial_data(symbol)
            logger.info(
                "financial_data provider result symbol=%s provider=akshare count=%d",
                symbol, len(data or []),
            )

        if not data:
            data = yfinance_provider.get_financial_data(symbol)
            logger.info(
                "financial_data provider result symbol=%s provider=yfinance count=%d",
                symbol, len(data or []),
            )
            if data:
                data = self._add_yoy(data)

        if not data:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.warning("financial_data unavailable symbol=%s elapsed_ms=%d", symbol, elapsed_ms)
            data = []

        # Optional enrichment: slow because it makes extra provider calls.
        if data and config.ENRICH_FINANCIAL_PRICE_YOY and market in (Market.A, Market.HK):
            try:
                returns = akshare_provider.get_yearly_returns(symbol)
                for item in data:
                    year = item.get("year")
                    if year and year in returns and item.get("quarter", 0) == 0:
                        item["price_yoy"] = returns[year]
            except Exception as exc:
                logger.warning("yearly returns failed %s: %s", symbol, exc)

        if data:
            stock_repo.save_financial_data(data)
            logger.info("financial_data persisted symbol=%s count=%d", symbol, len(data))

        cache.set(key, data, config.TTL_FINANCIAL_DATA)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info("financial_data load done symbol=%s count=%d elapsed_ms=%d", symbol, len(data), elapsed_ms)
        return data

    @staticmethod
    def _should_refresh_financial_cache(data: List[Dict], market: Market) -> bool:
        if market != Market.A:
            return False
        return any(item.get("source") == "akshare" for item in data)

    def _add_yoy(self, data: List[Dict]) -> List[Dict]:
        sorted_data = sorted(data, key=lambda x: (x["year"], x["quarter"]))
        for i, item in enumerate(sorted_data):
            if item.get("revenue_yoy") is not None:
                continue
            prev = next(
                (d for d in sorted_data[:i]
                 if d["year"] == item["year"] - 1 and d["quarter"] == item["quarter"]),
                None,
            )
            if prev:
                if (prev.get("revenue") or 0) > 0 and (item.get("revenue") or 0) > 0:
                    item["revenue_yoy"] = round(
                        (item["revenue"] - prev["revenue"]) / prev["revenue"] * 100, 2
                    )
                if (prev.get("net_profit") or 0) > 0 and (item.get("net_profit") or 0) > 0:
                    item["profit_yoy"] = round(
                        (item["net_profit"] - prev["net_profit"]) / prev["net_profit"] * 100, 2
                    )
        return sorted_data

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search_stocks(self, query: str) -> List[Dict]:
        q = query.lower().strip()
        is_hk = q.isdigit() and len(q) == 5
        is_a = q.isdigit() and len(q) == 6
        has_cn = any("一" <= c <= "鿿" for c in q)

        def match(stocks):
            return [
                s for s in stocks
                if q in s["symbol"].lower() or q in s["name"].lower() or query in s["name"]
            ]

        local_results = stock_repo.search_local_stocks(query)
        if local_results:
            results = local_results[:20]
            stock_repo.record_search(results)
            return results

        stock_list = self._get_stock_list()
        if is_hk:
            results = match(stock_list.get("港股", [])) or match(stock_list.get("A股", []))
        elif is_a or has_cn:
            results = match(stock_list.get("A股", []))
            if not results and not is_a:
                results = match(stock_list.get("港股", []))
        else:
            results = match(stock_list.get("A股", [])) or match(stock_list.get("港股", []))

        if not results:
            results = match(_FALLBACK_STOCKS)

        results = results[:20]
        if results:
            stock_repo.record_search(results)
        return results

    def _get_stock_list(self) -> Dict:
        global _stock_list_cache, _stock_list_ts
        if _stock_list_cache and time.monotonic() - _stock_list_ts < config.TTL_STOCK_LIST:
            return _stock_list_cache
        _stock_list_cache = akshare_provider.get_stock_list()
        _stock_list_ts = time.monotonic()
        return _stock_list_cache

    # ------------------------------------------------------------------
    # Popular / rankings
    # ------------------------------------------------------------------

    def get_popular_stocks(self, limit: int = 10) -> List[Dict]:
        return stock_repo.get_popular_stocks(limit)

    def get_stock_rankings(self, period: str = "year", limit: int = 50) -> List[Dict]:
        key = f"rankings-stocks:{period}:{limit}"
        cached = cache.get(key)
        if cached:
            return cached
        # Real-time top movers from akshare
        hot = akshare_provider.get_hot_stocks(limit)
        result = sorted(hot, key=lambda x: x.get("changePercent", 0), reverse=True)[:limit]
        cache.set(key, result, config.TTL_MARKET_DATA)
        return result

    def get_industry_rankings(self, period: str = "year") -> List[Dict]:
        key = f"rankings-industries:{period}"
        cached = cache.get(key)
        if cached:
            return cached
        hot = akshare_provider.get_hot_industries(20)
        result = sorted(hot, key=lambda x: x.get("changePercent", 0), reverse=True)
        cache.set(key, result, config.TTL_MARKET_DATA)
        return result

    # ------------------------------------------------------------------
    # CRUD (industry / company / research)
    # ------------------------------------------------------------------

    def get_industry_info(self, name: str) -> Optional[Dict]:
        return stock_repo.get_industry_info(name)

    def save_industry_info(self, data: Dict) -> None:
        stock_repo.save_industry_info(data)

    def get_company_analysis(self, symbol: str) -> Optional[Dict]:
        return stock_repo.get_company_analysis(symbol)

    def save_company_analysis(self, data: Dict) -> None:
        stock_repo.save_company_analysis(data)

    def get_investment_research(self, symbol: str) -> List[Dict]:
        return stock_repo.get_investment_research(symbol)

    def save_investment_research(self, data: Dict) -> None:
        stock_repo.save_investment_research(data)


stock_service = StockService()
