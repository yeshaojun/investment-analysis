"""
Thesis routes — /api/thesis
"""

import logging

from flask import Blueprint, request

from services.thesis_service import thesis_service
from api.response import (
    bad_request_response,
    error_response,
    not_found_response,
    success_response,
)

logger = logging.getLogger(__name__)
thesis_bp = Blueprint("thesis", __name__)


@thesis_bp.route("/api/thesis", methods=["GET"])
def list_theses():
    try:
        data = thesis_service.list()
        return success_response(data={"theses": data})
    except Exception as exc:
        logger.error("list_theses: %s", exc)
        return error_response(str(exc))


@thesis_bp.route("/api/thesis", methods=["POST"])
def create_thesis():
    try:
        body = request.get_json()
        if not body:
            return bad_request_response("缺少请求数据")
        symbol = body.get("symbol")
        if not symbol:
            return bad_request_response("symbol 是必需的")
        thesis_statement = body.get("thesis_statement")
        if not thesis_statement:
            return bad_request_response("thesis_statement 是必需的")
        result = thesis_service.create(symbol, body)
        return success_response(data=result, message="Thesis 创建成功")
    except Exception as exc:
        logger.error("create_thesis: %s", exc)
        return error_response(str(exc))


@thesis_bp.route("/api/thesis/<symbol>", methods=["GET"])
def get_thesis(symbol: str):
    try:
        data = thesis_service.get(symbol)
        if not data:
            return not_found_response(f"{symbol} 没有活跃的 Thesis")
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_thesis %s: %s", symbol, exc)
        return error_response(str(exc))


@thesis_bp.route("/api/thesis/<symbol>", methods=["PATCH"])
def update_thesis(symbol: str):
    try:
        body = request.get_json()
        if not body:
            return bad_request_response("缺少请求数据")
        result = thesis_service.update(symbol, body)
        if not result:
            return not_found_response(f"{symbol} 没有活跃的 Thesis")
        return success_response(data=result, message="Thesis 更新成功")
    except Exception as exc:
        logger.error("update_thesis %s: %s", symbol, exc)
        return error_response(str(exc))


@thesis_bp.route("/api/thesis/<symbol>/pillars/<pillar_uuid>", methods=["PATCH"])
def update_pillar(symbol: str, pillar_uuid: str):
    try:
        body = request.get_json()
        if not body or "status" not in body:
            return bad_request_response("status 是必需的")
        result = thesis_service.update_pillar(symbol, pillar_uuid, body["status"])
        if not result:
            return not_found_response(f"{symbol} 没有活跃的 Thesis")
        return success_response(data=result, message="支柱状态更新成功")
    except Exception as exc:
        logger.error("update_pillar %s %s: %s", symbol, pillar_uuid, exc)
        return error_response(str(exc))


@thesis_bp.route("/api/thesis/<symbol>/catalysts", methods=["POST"])
def add_catalyst(symbol: str):
    try:
        body = request.get_json()
        if not body:
            return bad_request_response("缺少请求数据")
        if "date" not in body or "event" not in body:
            return bad_request_response("date 和 event 是必需的")
        result = thesis_service.add_catalyst(symbol, body)
        if not result:
            return not_found_response(f"{symbol} 没有活跃的 Thesis")
        return success_response(data=result, message="催化剂添加成功")
    except Exception as exc:
        logger.error("add_catalyst %s: %s", symbol, exc)
        return error_response(str(exc))


@thesis_bp.route("/api/thesis/<symbol>/catalysts/<int:catalyst_id>", methods=["DELETE"])
def delete_catalyst(symbol: str, catalyst_id: int):
    try:
        deleted = thesis_service.delete_catalyst(symbol, catalyst_id)
        if not deleted:
            return not_found_response("催化剂不存在")
        return success_response(message="催化剂已删除")
    except Exception as exc:
        logger.error("delete_catalyst %s %d: %s", symbol, catalyst_id, exc)
        return error_response(str(exc))
