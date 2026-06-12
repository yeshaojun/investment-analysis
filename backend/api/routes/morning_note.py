"""
Morning note routes — /api/morning-note
"""

import logging

from flask import Blueprint, request

from services.morning_note_service import morning_note_service
from api.response import error_response, not_found_response, success_response

logger = logging.getLogger(__name__)
morning_note_bp = Blueprint("morning_note", __name__)


@morning_note_bp.route("/api/morning-note", methods=["GET"])
def get_morning_note():
    try:
        date_str = request.args.get("date")
        if date_str:
            note = morning_note_service.get_by_date(date_str)
            if not note:
                return not_found_response(f"{date_str} 的简报不存在或未成功生成")
            return success_response(data={"note": note})
        result = morning_note_service.get_or_trigger_today()
        return success_response(data=result)
    except Exception as exc:
        logger.error("get_morning_note: %s", exc)
        return error_response(str(exc))


@morning_note_bp.route("/api/morning-note/history", methods=["GET"])
def get_morning_note_history():
    try:
        days = request.args.get("days", 30, type=int)
        data = morning_note_service.list_history(days)
        return success_response(data={"history": data})
    except Exception as exc:
        logger.error("get_morning_note_history: %s", exc)
        return error_response(str(exc))


@morning_note_bp.route("/api/morning-note/generate", methods=["POST"])
def trigger_morning_note():
    try:
        result = morning_note_service.trigger_generate()
        return success_response(data=result, message="简报生成已触发")
    except Exception as exc:
        logger.error("trigger_morning_note: %s", exc)
        return error_response(str(exc))
