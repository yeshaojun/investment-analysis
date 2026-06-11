"""
Stock routes — /api/stock/*, /api/search, /api/popular, /api/rankings/*
Route functions only: validate params, call service, return response.
"""

import logging
import time

from flask import Blueprint, request

from services.stock_service import stock_service
from services.ai_service import ai_service
from infra.providers.akshare_provider import akshare_provider
from api.response import (
    bad_request_response,
    error_response,
    not_found_response,
    server_error_response,
    success_response,
)

logger = logging.getLogger(__name__)
stock_bp = Blueprint("stock", __name__)


# ---------------------------------------------------------------------------
# Stock info & history
# ---------------------------------------------------------------------------

@stock_bp.route("/api/stock/<symbol>", methods=["GET"])
def get_stock_info(symbol: str):
    try:
        data = stock_service.get_stock_info(symbol)
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_stock_info %s: %s", symbol, exc)
        return error_response(str(exc))


@stock_bp.route("/api/stock/<symbol>/history", methods=["GET"])
def get_stock_history(symbol: str):
    try:
        period = request.args.get("period", "1mo")
        interval = request.args.get("interval", "1d")
        include_indicators = request.args.get("indicators", "true").lower() == "true"
        data = stock_service.get_stock_history(symbol, period, interval, include_indicators)
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_stock_history %s: %s", symbol, exc)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# Financials
# ---------------------------------------------------------------------------

@stock_bp.route("/api/stock/<symbol>/financials", methods=["GET"])
def get_financial_data(symbol: str):
    started = time.perf_counter()
    logger.info("financials request start symbol=%s", symbol)
    try:
        data = stock_service.get_financial_data(symbol)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "financials request done symbol=%s available=%s count=%d elapsed_ms=%d",
            symbol, bool(data), len(data), elapsed_ms,
        )
        return success_response(data={
            "symbol": symbol,
            "financials": data,
            "available": bool(data),
            "reason": None if data else "financial_data_unavailable",
        })
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.exception("financials request failed symbol=%s elapsed_ms=%d", symbol, elapsed_ms)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# Industry
# ---------------------------------------------------------------------------

@stock_bp.route("/api/industry/<industry_name>", methods=["GET"])
def get_industry_info(industry_name: str):
    try:
        data = stock_service.get_industry_info(industry_name)
        if not data:
            return not_found_response("行业信息未找到")
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_industry_info %s: %s", industry_name, exc)
        return error_response(str(exc))


@stock_bp.route("/api/industry", methods=["POST"])
def create_industry_info():
    try:
        data = request.get_json()
        if not data or "industry_name" not in data:
            return bad_request_response("行业名称是必需的")
        stock_service.save_industry_info(data)
        return success_response(message="行业信息保存成功")
    except Exception as exc:
        logger.error("create_industry_info: %s", exc)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# Company analysis
# ---------------------------------------------------------------------------

@stock_bp.route("/api/stock/<symbol>/analysis", methods=["GET"])
def get_company_analysis(symbol: str):
    try:
        data = stock_service.get_company_analysis(symbol)
        if not data:
            return not_found_response("公司分析未找到")
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_company_analysis %s: %s", symbol, exc)
        return error_response(str(exc))


@stock_bp.route("/api/stock/<symbol>/analysis", methods=["POST"])
def create_company_analysis(symbol: str):
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("缺少请求数据")
        data["symbol"] = symbol
        stock_service.save_company_analysis(data)
        return success_response(message="公司分析保存成功")
    except Exception as exc:
        logger.error("create_company_analysis %s: %s", symbol, exc)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# Investment research (DB-stored)
# ---------------------------------------------------------------------------

@stock_bp.route("/api/stock/<symbol>/research", methods=["GET"])
def get_investment_research(symbol: str):
    try:
        data = stock_service.get_investment_research(symbol)
        return success_response(data={"symbol": symbol, "research": data})
    except Exception as exc:
        logger.error("get_investment_research %s: %s", symbol, exc)
        return error_response(str(exc))


@stock_bp.route("/api/stock/<symbol>/research", methods=["POST"])
def create_investment_research(symbol: str):
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("缺少请求数据")
        data["symbol"] = symbol
        stock_service.save_investment_research(data)
        return success_response(message="投资研报保存成功")
    except Exception as exc:
        logger.error("create_investment_research %s: %s", symbol, exc)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# Research reports (AKShare)
# ---------------------------------------------------------------------------

@stock_bp.route("/api/stock/<symbol>/research-reports", methods=["GET"])
def get_research_reports(symbol: str):
    try:
        limit = request.args.get("limit", 5, type=int)
        reports = akshare_provider.get_research_reports(symbol, limit)
        return success_response(data={"symbol": symbol, "reports": reports})
    except Exception as exc:
        logger.error("get_research_reports %s: %s", symbol, exc)
        return server_error_response(str(exc))


# ---------------------------------------------------------------------------
# Search & popular
# ---------------------------------------------------------------------------

@stock_bp.route("/api/search", methods=["GET"])
def search_stocks():
    query = request.args.get("q", "")
    if not query or len(query.strip()) < 2:
        return bad_request_response("搜索关键词至少需要2个字符")
    try:
        results = stock_service.search_stocks(query)
        return success_response(data={"results": results})
    except Exception as exc:
        logger.error("search_stocks q=%s: %s", query, exc)
        return error_response(str(exc))


@stock_bp.route("/api/popular", methods=["GET"])
def get_popular_stocks():
    try:
        limit = request.args.get("limit", 10, type=int)
        data = stock_service.get_popular_stocks(limit)
        return success_response(data={"stocks": data})
    except Exception as exc:
        logger.error("get_popular_stocks: %s", exc)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# Rankings
# ---------------------------------------------------------------------------

@stock_bp.route("/api/rankings/industries", methods=["GET"])
def get_industry_rankings():
    try:
        period = request.args.get("period", "year")
        data = stock_service.get_industry_rankings(period)
        return success_response(data={"rankings": data, "period": period})
    except Exception as exc:
        logger.error("get_industry_rankings: %s", exc)
        return error_response(str(exc))


@stock_bp.route("/api/rankings/stocks", methods=["GET"])
def get_stock_rankings():
    try:
        period = request.args.get("period", "year")
        limit = request.args.get("limit", 50, type=int)
        data = stock_service.get_stock_rankings(period, limit)
        return success_response(data={"rankings": data, "period": period})
    except Exception as exc:
        logger.error("get_stock_rankings: %s", exc)
        return error_response(str(exc))


# ---------------------------------------------------------------------------
# AI analysis
# ---------------------------------------------------------------------------

@stock_bp.route("/api/stock/<symbol>/ai/investment-value", methods=["GET"])
async def ai_analyze_investment_value(symbol: str):
    started = time.perf_counter()
    logger.info("ai investment request start symbol=%s", symbol)
    try:
        stock_info = stock_service.get_stock_info(symbol)
        logger.info(
            "ai investment stock_info loaded symbol=%s available=%s source=%s is_stale=%s",
            symbol,
            stock_info.get("available", True),
            stock_info.get("source"),
            stock_info.get("is_stale", False),
        )
        financial_data = stock_service.get_financial_data(symbol)
        logger.info(
            "ai investment financials loaded symbol=%s count=%d available=%s",
            symbol, len(financial_data), bool(financial_data),
        )
        result = await ai_service.analyze_comprehensive(symbol, stock_info, financial_data)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "ai investment request done symbol=%s has_error=%s elapsed_ms=%d",
            symbol, bool(result.get("error")), elapsed_ms,
        )
        return success_response(data=result)
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.exception("ai investment request failed symbol=%s elapsed_ms=%d", symbol, elapsed_ms)
        return server_error_response(str(exc))


@stock_bp.route("/api/stock/<symbol>/ai/research-summary", methods=["GET"])
async def ai_research_summary(symbol: str):
    logger.info("AI研报总结 start: %s", symbol)
    try:
        limit = request.args.get("limit", 5, type=int)
        stock_info = stock_service.get_stock_info(symbol)
        reports = akshare_provider.get_research_reports(symbol, limit)
        result = await ai_service.summarize_research_reports(symbol, stock_info, reports)
        return success_response(data=result)
    except Exception as exc:
        logger.error("ai_research_summary %s: %s", symbol, exc)
        return server_error_response(str(exc))
