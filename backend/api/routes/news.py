"""
News archive routes — /api/news
"""

import logging

from flask import Blueprint, request

from infra.repositories.news_archive_repo import news_archive_repo
from api.response import error_response, success_response

logger = logging.getLogger(__name__)
news_bp = Blueprint("news", __name__)


@news_bp.route("/api/news", methods=["GET"])
def list_news():
    """Query news archive with filters."""
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        symbol = request.args.get("symbol")
        layer = request.args.get("layer")
        min_score = request.args.get("min_score", 0, type=float)
        limit = request.args.get("limit", 50, type=int)

        data = news_archive_repo.query(
            start_date=start_date,
            end_date=end_date,
            symbol=symbol,
            layer=layer,
            min_score=min_score,
            limit=limit,
        )
        return success_response(data={"news": data, "count": len(data)})
    except Exception as exc:
        logger.error("list_news: %s", exc)
        return error_response(str(exc))


@news_bp.route("/api/news/<date_str>", methods=["GET"])
def get_news_by_date(date_str: str):
    """Get all news for a specific date."""
    try:
        data = news_archive_repo.get_by_date(date_str)
        return success_response(data={"news": data, "date": date_str, "count": len(data)})
    except Exception as exc:
        logger.error("get_news_by_date %s: %s", date_str, exc)
        return error_response(str(exc))


@news_bp.route("/api/news/dates", methods=["GET"])
def list_dates():
    """Get available dates with news counts."""
    try:
        days = request.args.get("days", 30, type=int)
        data = news_archive_repo.get_dates(days)
        return success_response(data={"dates": data})
    except Exception as exc:
        logger.error("list_dates: %s", exc)
        return error_response(str(exc))


@news_bp.route("/api/news/latest", methods=["GET"])
def get_latest_news():
    """Get most recent news across all dates."""
    try:
        limit = request.args.get("limit", 20, type=int)
        data = news_archive_repo.get_latest(limit)
        return success_response(data={"news": data})
    except Exception as exc:
        logger.error("get_latest_news: %s", exc)
        return error_response(str(exc))
