"""
Watchlist service — add / remove / list watchlist symbols.
"""

import logging
from typing import Dict, List

from infra.repositories.watchlist_repo import watchlist_repo
from infra.repositories.thesis_repo import thesis_repo
from services.stock_service import stock_service

logger = logging.getLogger(__name__)


class WatchlistService:

    def add(self, symbol: str) -> bool:
        """Add symbol to watchlist (idempotent). Returns True if newly added."""
        return watchlist_repo.add(symbol)

    def remove(self, symbol: str) -> bool:
        """Remove symbol from watchlist. Does NOT affect thesis."""
        return watchlist_repo.remove(symbol)

    def list(self) -> List[Dict]:
        """List all watched symbols with has_thesis flag."""
        entries = watchlist_repo.list_all()
        result = []
        for entry in entries:
            symbol = entry["symbol"]
            stock_info = stock_service.get_stock_info(symbol)
            has_thesis = thesis_repo.get_active(symbol) is not None
            result.append({
                "symbol": symbol,
                "name": stock_info.get("name", symbol),
                "added_at": entry["added_at"],
                "has_thesis": has_thesis,
            })
        return result

    def is_watching(self, symbol: str) -> bool:
        return watchlist_repo.is_watching(symbol)


watchlist_service = WatchlistService()
