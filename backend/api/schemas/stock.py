"""
Pydantic request/response schemas for stock-related endpoints.
All API contracts are defined here — no loose dicts as public contracts.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Envelope
# ---------------------------------------------------------------------------

class SuccessResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str = "操作成功"


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    code: Optional[str] = None


# ---------------------------------------------------------------------------
# Stock info
# ---------------------------------------------------------------------------

class StockInfo(BaseModel):
    symbol: str
    name: str
    price: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    volume: Optional[int] = None
    marketCap: Optional[int] = None
    sector: str = ""
    industry: str = ""
    market: str = ""
    currency: str = ""
    lastUpdated: str = ""
    available: bool = True
    source: Optional[str] = None
    as_of: Optional[str] = None
    data_version: Optional[str] = None
    is_stale: bool = False
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------

class OHLCVItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    amount: Optional[float] = None
    interval: Optional[str] = None
    adjust_type: Optional[str] = None
    source: Optional[str] = None


class StockHistoryResponse(BaseModel):
    symbol: str
    period: str
    interval: str
    data: List[OHLCVItem]
    indicators: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Financials
# ---------------------------------------------------------------------------

class FinancialItem(BaseModel):
    symbol: str
    year: int
    quarter: int
    revenue: Optional[float] = None
    net_profit: Optional[float] = None
    gross_margin: Optional[float] = None
    net_margin: Optional[float] = None
    operating_cash_flow: Optional[float] = None
    eps: Optional[float] = None
    roe: Optional[float] = None
    revenue_yoy: Optional[float] = None
    profit_yoy: Optional[float] = None
    price_yoy: Optional[float] = None
    report_date: Optional[str] = None
    announced_at: Optional[str] = None
    period_type: Optional[str] = None
    currency: Optional[str] = None
    source: Optional[str] = None
    data_version: Optional[str] = None
    is_restated: bool = False
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    shareholder_equity: Optional[float] = None
    cash_and_equivalents: Optional[float] = None
    interest_bearing_debt: Optional[float] = None
    accounts_receivable: Optional[float] = None
    inventory: Optional[float] = None
    gross_profit: Optional[float] = None
    operating_profit: Optional[float] = None
    investing_cash_flow: Optional[float] = None
    financing_cash_flow: Optional[float] = None
    free_cash_flow: Optional[float] = None
    capex: Optional[float] = None


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class StockSearchResult(BaseModel):
    symbol: str
    name: str
    market: str = ""


# ---------------------------------------------------------------------------
# Research report
# ---------------------------------------------------------------------------

class EPSForecast(BaseModel):
    eps: float
    pe: Optional[float] = None


class ResearchReport(BaseModel):
    title: str = ""
    rating: str = ""
    institution: str = ""
    date: str = ""
    industry: str = ""
    pdf_url: str = ""
    eps_forecast: Dict[str, EPSForecast] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# AI analysis
# ---------------------------------------------------------------------------

class AIAnalysisResponse(BaseModel):
    symbol: str
    name: str
    current_price: Optional[float] = None
    industry: Optional[str] = None
    analysis: str = ""
    sources: str = ""
    error: Optional[str] = None
