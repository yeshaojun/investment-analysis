"""
Watchlist routes — POST/DELETE/GET /api/watchlist
"""

import logging

from flask import Blueprint

from services.watchlist_service import watchlist_service
from api.response import (
    error_response,
    not_found_response,
    success_response,
)

logger = logging.getLogger(__name__)
watchlist_bp = Blueprint("watchlist", __name__)


@watchlist_bp.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    try:
        data = watchlist_service.list()
        return success_response(data={"symbols": data})
    except Exception as exc:
        logger.error("get_watchlist: %s", exc)
        return error_response(str(exc))


@watchlist_bp.route("/api/watchlist/<symbol>", methods=["POST"])
def add_to_watchlist(symbol: str):
    try:
        watchlist_service.add(symbol)
        return success_response(message=f"{symbol} 已关注")
    except Exception as exc:
        logger.error("add_to_watchlist %s: %s", symbol, exc)
        return error_response(str(exc))


@watchlist_bp.route("/api/watchlist/<symbol>", methods=["DELETE"])
def remove_from_watchlist(symbol: str):
    try:
        removed = watchlist_service.remove(symbol)
        if not removed:
            return not_found_response(f"{symbol} 不在关注列表中")
        return success_response(message=f"{symbol} 已取消关注")
    except Exception as exc:
        logger.error("remove_from_watchlist %s: %s", symbol, exc)
        return error_response(str(exc))
