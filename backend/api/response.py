"""
统一 HTTP 响应格式模块

所有 API 接口都通过这里的辅助函数返回响应，保证结构一致：
  成功: { "success": true,  "data": ..., "message": "..." }
  失败: { "success": false, "error": "...", "code": "ERROR_CODE" }
"""

from flask import jsonify
from typing import Any, Optional


def success_response(data: Any = None, message: str = "操作成功"):
    """标准成功响应"""
    return jsonify({
        "success": True,
        "data": data,
        "message": message,
    })


def error_response(message: str, http_status: int = 400, error_code: Optional[str] = None):
    """标准错误响应"""
    payload: dict = {
        "success": False,
        "error": message,
    }
    if error_code:
        payload["code"] = error_code
    return jsonify(payload), http_status


def not_found_response(message: str = "资源不存在"):
    """404 响应"""
    return error_response(message, 404, "NOT_FOUND")


def server_error_response(message: str = "服务器内部错误"):
    """500 响应"""
    return error_response(message, 500, "INTERNAL_ERROR")


def bad_request_response(message: str):
    """400 参数错误响应"""
    return error_response(message, 400, "BAD_REQUEST")
