"""
yfinance provider — all yfinance calls are contained here.
Services never import yfinance directly.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

import yfinance as yf
import pandas as pd

from domain.stock import detect_market, Market

logger = logging.getLogger(__name__)


def _float_or_none(value) -> Optional[float]:
    return float(value) if pd.notna(value) else None


class YFinanceProvider:

    @staticmethod
    def _to_yfinance_symbol(symbol: str) -> str:
        market = detect_market(symbol)
        if market == Market.A:
            if symbol.startswith(("600", "601", "603", "605", "688", "689")):
                return f"{symbol}.SS"
            return f"{symbol}.SZ"
        if market == Market.HK and symbol.isdigit():
            return f"{int(symbol):04d}.HK"
        return symbol

    def get_stock_info(self, symbol: str) -> Optional[Dict]:
        try:
            query_symbol = self._to_yfinance_symbol(symbol)
            logger.info("yfinance stock_info start symbol=%s query_symbol=%s", symbol, query_symbol)
            ticker = yf.Ticker(query_symbol)
            info = ticker.info
            market = detect_market(symbol)
            currency_map = {Market.A: "CNY", Market.HK: "HKD", Market.US: "USD"}
            return {
                "symbol": symbol,
                "name": info.get("longName", ""),
                "price": info.get("currentPrice"),
                "change": info.get("regularMarketChange"),
                "changePercent": info.get("regularMarketChangePercent"),
                "volume": info.get("volume"),
                "marketCap": info.get("marketCap"),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "market": market.value,
                "currency": currency_map[market],
                "lastUpdated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f"),
                "source": "yfinance",
                "provider_symbol": query_symbol,
            }
        except Exception as exc:
            logger.warning("yfinance get_stock_info %s: %s", symbol, exc)
            return None

    def get_stock_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        try:
            query_symbol = self._to_yfinance_symbol(symbol)
            logger.info(
                "yfinance history start symbol=%s query_symbol=%s period=%s interval=%s",
                symbol, query_symbol, period, interval,
            )
            ticker = yf.Ticker(query_symbol)
            hist = ticker.history(period=period, interval=interval)
            if hist.empty:
                return None
            data = [
                {
                    "date": index.strftime("%Y-%m-%d") if hasattr(index, "strftime") else str(index)[:10],
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"]),
                    "amount": None,
                    "interval": interval,
                    "adjust_type": "none",
                    "source": "yfinance",
                }
                for index, row in hist.iterrows()
            ]
            return {"symbol": symbol, "period": period, "interval": interval, "data": data}
        except Exception as exc:
            logger.warning("yfinance get_stock_history %s: %s", symbol, exc)
            return None

    def get_financial_data(self, symbol: str) -> Optional[List[Dict]]:
        try:
            query_symbol = self._to_yfinance_symbol(symbol)
            logger.info("yfinance financials start symbol=%s query_symbol=%s", symbol, query_symbol)
            ticker = yf.Ticker(query_symbol)
            financials = ticker.financials
            quarterly = ticker.quarterly_financials
            info = ticker.info

            if financials.empty:
                return None

            result: List[Dict] = []
            eps = _float_or_none(info.get("trailingEps"))
            roe_raw = info.get("returnOnEquity")
            roe = float(roe_raw) * 100 if isinstance(roe_raw, (int, float)) else None

            for i, col in enumerate(financials.columns):
                year = col.year if hasattr(col, "year") else 2024 - i
                revenue = self._yf_field(financials, col, ["Total Revenue", "Revenue", "TotalRevenue"])
                net_income = self._yf_field(financials, col, ["Net Income", "NetIncome", "Net Profit"])
                gross_profit = self._yf_field(financials, col, ["Gross Profit", "GrossProfit"])
                ocf = self._yf_field(financials, col, ["Operating Cash Flow", "OperatingCashFlow"])
                gross_margin = (gross_profit / revenue * 100) if revenue else None
                net_margin = (net_income / revenue * 100) if revenue else None
                result.append({
                    "symbol": symbol, "year": year, "quarter": 0,
                    "revenue": revenue, "net_profit": net_income,
                    "gross_margin": gross_margin, "net_margin": net_margin,
                    "operating_cash_flow": ocf, "eps": eps, "roe": roe,
                    "gross_profit": gross_profit,
                    "report_date": col.strftime("%Y-%m-%d") if hasattr(col, "strftime") else None,
                    "period_type": "annual", "currency": info.get("currency"),
                    "source": "yfinance",
                })

            # quarterly (latest 4)
            if not quarterly.empty:
                for i, col in enumerate(quarterly.columns[:4]):
                    year = col.year if hasattr(col, "year") else 2024
                    quarter = (col.month if hasattr(col, "month") else 1) // 3 + 1
                    revenue = self._yf_field(quarterly, col, ["Total Revenue", "Revenue", "TotalRevenue"])
                    net_income = self._yf_field(quarterly, col, ["Net Income", "NetIncome", "Net Profit"])
                    gross_profit = self._yf_field(quarterly, col, ["Gross Profit", "GrossProfit"])
                    ocf = self._yf_field(quarterly, col, ["Operating Cash Flow", "OperatingCashFlow"])
                    gross_margin = (gross_profit / revenue * 100) if revenue else None
                    net_margin = (net_income / revenue * 100) if revenue else None
                    result.append({
                        "symbol": symbol, "year": year, "quarter": quarter,
                        "revenue": revenue, "net_profit": net_income,
                        "gross_margin": gross_margin, "net_margin": net_margin,
                        "operating_cash_flow": ocf, "eps": eps, "roe": roe,
                        "gross_profit": gross_profit,
                        "report_date": col.strftime("%Y-%m-%d") if hasattr(col, "strftime") else None,
                        "period_type": "quarterly", "currency": info.get("currency"),
                        "source": "yfinance",
                    })

            return result if result else None
        except Exception as exc:
            logger.warning("yfinance get_financial_data %s: %s", symbol, exc)
            return None

    @staticmethod
    def _yf_field(df: "pd.DataFrame", col, names: List[str]) -> Optional[float]:
        for name in names:
            if name in df.index:
                val = df.loc[name, col]
                if pd.notna(val):
                    return float(val)
        return None


yfinance_provider = YFinanceProvider()
