"""
Calendar routes — /api/calendar
"""

import logging

from flask import Blueprint, request

from services.calendar_service import calendar_service
from api.response import error_response, success_response

logger = logging.getLogger(__name__)
calendar_bp = Blueprint("calendar", __name__)


@calendar_bp.route("/api/calendar/events", methods=["GET"])
def get_events():
    try:
        year = request.args.get("year", type=int)
        month = request.args.get("month", type=int)
        if not year or not month:
            from datetime import datetime
            now = datetime.now()
            year = year or now.year
            month = month or now.month
        data = calendar_service.get_events(year, month)
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_events: %s", exc)
        return error_response(str(exc))


@calendar_bp.route("/api/calendar/upcoming", methods=["GET"])
def get_upcoming():
    try:
        days = request.args.get("days", 7, type=int)
        data = calendar_service.get_upcoming(days)
        return success_response(data={"events": data})
    except Exception as exc:
        logger.error("get_upcoming: %s", exc)
        return error_response(str(exc))
