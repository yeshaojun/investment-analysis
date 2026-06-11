"""
Market service — hot stocks, hot industries, financial news.
"""

import logging
from typing import Dict, List

import config
from infra.cache import cache
from infra.providers.akshare_provider import akshare_provider

logger = logging.getLogger(__name__)


class MarketService:

    def get_hot_stocks(self, limit: int = 20) -> List[Dict]:
        key = f"market-hot-stocks:{limit}"
        cached = cache.get(key)
        if cached:
            return cached
        result = akshare_provider.get_hot_stocks(limit)
        cache.set(key, result, config.TTL_MARKET_DATA)
        return result

    def get_hot_industries(self, limit: int = 20) -> List[Dict]:
        key = f"market-hot-industries:{limit}"
        cached = cache.get(key)
        if cached:
            return cached
        result = akshare_provider.get_hot_industries(limit)
        cache.set(key, result, config.TTL_MARKET_DATA)
        return result

    def get_financial_news(self, limit: int = 20) -> List[Dict]:
        key = f"market-news:{limit}"
        cached = cache.get(key)
        if cached:
            return cached
        result = akshare_provider.get_financial_news(limit)
        cache.set(key, result, config.TTL_NEWS_DATA)
        return result


market_service = MarketService()
