"""
Screener routes — /api/screener
"""

import logging

from flask import Blueprint, request

from services.screener_service import screener_service
from api.response import error_response, success_response

logger = logging.getLogger(__name__)
screener_bp = Blueprint("screener", __name__)


@screener_bp.route("/api/screener/screen", methods=["POST"])
def screen_stocks():
    try:
        body = request.get_json() or {}
        preset = body.get("preset", "value")
        overrides = body.get("overrides", {})
        result = screener_service.screen(preset, overrides)
        http_status = result.pop("http_status", 200)
        if result.get("error"):
            return error_response(result.get("message", "筛选失败"), http_status)
        return success_response(data=result)
    except Exception as exc:
        logger.error("screen_stocks: %s", exc)
        return error_response(str(exc))


@screener_bp.route("/api/screener/sync-status", methods=["GET"])
def get_sync_status():
    try:
        data = screener_service.get_sync_status()
        return success_response(data=data or {"status": "never"})
    except Exception as exc:
        logger.error("get_sync_status: %s", exc)
        return error_response(str(exc))
