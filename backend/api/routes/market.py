"""
Market routes — /api/market/*
"""

import logging

from flask import Blueprint, request

from services.market_service import market_service
from api.response import server_error_response, success_response

logger = logging.getLogger(__name__)
market_bp = Blueprint("market", __name__)


@market_bp.route("/api/market/news", methods=["GET"])
def get_market_news():
    try:
        limit = request.args.get("limit", 20, type=int)
        data = market_service.get_financial_news(limit)
        return success_response(data={"news": data})
    except Exception as exc:
        logger.error("get_market_news: %s", exc)
        return server_error_response(str(exc))


@market_bp.route("/api/market/hot-stocks", methods=["GET"])
def get_hot_stocks():
    try:
        limit = request.args.get("limit", 20, type=int)
        data = market_service.get_hot_stocks(limit)
        return success_response(data={"stocks": data})
    except Exception as exc:
        logger.error("get_hot_stocks: %s", exc)
        return server_error_response(str(exc))


@market_bp.route("/api/market/hot-industries", methods=["GET"])
def get_hot_industries():
    try:
        limit = request.args.get("limit", 20, type=int)
        data = market_service.get_hot_industries(limit)
        return success_response(data={"industries": data})
    except Exception as exc:
        logger.error("get_hot_industries: %s", exc)
        return server_error_response(str(exc))
