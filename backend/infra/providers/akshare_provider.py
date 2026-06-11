"""
AKShare provider — all akshare calls are contained here.
Services never import akshare directly.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional
import re

import akshare as ak
import pandas as pd

import config
from domain.stock import is_a_stock, is_hk_stock, period_to_start_date

logger = logging.getLogger(__name__)


def _float_or_none(value) -> Optional[float]:
    if value is None or not pd.notna(value):
        return None
    if isinstance(value, str):
        value = value.strip().replace(",", "").replace("%", "")
        if value in {"", "-", "--", "None", "nan"}:
            return None
    return float(value)


def _int_or_none(value) -> Optional[int]:
    return int(value) if pd.notna(value) else None


class AKShareProvider:
    # ------------------------------------------------------------------
    # Stock info
    # ------------------------------------------------------------------

    def get_stock_info(self, symbol: str) -> Optional[Dict]:
        try:
            if is_hk_stock(symbol):
                return self._hk_info(symbol)
            if is_a_stock(symbol):
                return self._a_info(symbol)
            return self._us_info(symbol)
        except Exception as exc:
            logger.error("akshare get_stock_info %s: %s", symbol, exc)
            return None

    def _a_info(self, symbol: str) -> Optional[Dict]:
        try:
            df = ak.stock_zh_a_spot_em()
            row_df = df[df["代码"] == symbol]
            if row_df.empty:
                return None
            row = row_df.iloc[0]
            return {
                "symbol": symbol,
                "name": row["名称"],
                "price": float(row["最新价"]),
                "change": float(row["涨跌额"]),
                "changePercent": float(row["涨跌幅"]),
                "volume": int(row["成交量"]) if pd.notna(row["成交量"]) else 0,
                "marketCap": float(row["总市值"]) if pd.notna(row["总市值"]) else 0,
                "sector": "",
                "industry": "",
                "lastUpdated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f"),
            }
        except Exception as exc:
            logger.warning("akshare A股 info %s: %s", symbol, exc)
            return None

    def _hk_info(self, symbol: str) -> Optional[Dict]:
        try:
            df = ak.stock_hk_spot_em()
            row_df = df[df["代码"] == symbol]
            if row_df.empty:
                return None
            row = row_df.iloc[0]
            return {
                "symbol": symbol,
                "name": row["名称"],
                "price": float(row["最新价"]) if pd.notna(row["最新价"]) else 0,
                "change": float(row["涨跌额"]) if pd.notna(row["涨跌额"]) else 0,
                "changePercent": float(row["涨跌幅"]) if pd.notna(row["涨跌幅"]) else 0,
                "volume": int(row["成交量"]) if pd.notna(row["成交量"]) else 0,
                "marketCap": 0,
                "sector": "港股",
                "industry": "",
                "lastUpdated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f"),
            }
        except Exception as exc:
            logger.warning("akshare 港股 info %s: %s", symbol, exc)
            return None

    def _us_info(self, symbol: str) -> Optional[Dict]:
        try:
            df = ak.stock_us_spot_em()
            row_df = df[df["代码"] == symbol]
            if row_df.empty:
                return None
            row = row_df.iloc[0]
            return {
                "symbol": symbol,
                "name": row["名称"],
                "price": float(row["最新价"]),
                "change": float(row["涨跌额"]),
                "changePercent": float(row["涨跌幅"]),
                "volume": int(row["成交量"]) if pd.notna(row["成交量"]) else 0,
                "marketCap": float(row["总市值"]) if pd.notna(row["总市值"]) else 0,
                "sector": "",
                "industry": "",
                "lastUpdated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f"),
            }
        except Exception as exc:
            logger.warning("akshare 美股 info %s: %s", symbol, exc)
            return None

    # ------------------------------------------------------------------
    # Stock history
    # ------------------------------------------------------------------

    def get_stock_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        try:
            if is_hk_stock(symbol):
                return self._hk_history(symbol, period, interval)
            if is_a_stock(symbol):
                return self._a_history(symbol, period, interval)
            return self._us_history(symbol, period, interval)
        except Exception as exc:
            logger.error("akshare get_stock_history %s: %s", symbol, exc)
            return None

    def _a_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        try:
            df = ak.stock_zh_a_hist(
                symbol=symbol,
                period="daily",
                start_date=period_to_start_date(period),
                adjust="qfq",
            )
            if df.empty:
                return None
            data = [
                {
                    "date": str(row["日期"]),
                    "open": float(row["开盘"]),
                    "high": float(row["最高"]),
                    "low": float(row["最低"]),
                    "close": float(row["收盘"]),
                    "volume": int(row["成交量"]) if pd.notna(row["成交量"]) else 0,
                    "amount": _float_or_none(row.get("成交额")),
                    "interval": interval,
                    "adjust_type": "qfq",
                    "source": "akshare",
                }
                for _, row in df.iterrows()
            ]
            return {"symbol": symbol, "period": period, "interval": interval, "data": data}
        except Exception as exc:
            logger.warning("akshare A股 history %s: %s", symbol, exc)
            return None

    def _hk_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        try:
            df = ak.stock_hk_hist(
                symbol=symbol,
                period="daily",
                start_date=period_to_start_date(period),
                adjust="qfq",
            )
            if df.empty:
                return None
            data = [
                {
                    "date": str(row["日期"]),
                    "open": float(row["开盘"]) if pd.notna(row["开盘"]) else 0,
                    "high": float(row["最高"]) if pd.notna(row["最高"]) else 0,
                    "low": float(row["最低"]) if pd.notna(row["最低"]) else 0,
                    "close": float(row["收盘"]) if pd.notna(row["收盘"]) else 0,
                    "volume": int(row["成交量"]) if pd.notna(row["成交量"]) else 0,
                    "amount": _float_or_none(row.get("成交额")),
                    "interval": interval,
                    "adjust_type": "qfq",
                    "source": "akshare",
                }
                for _, row in df.iterrows()
            ]
            return {"symbol": symbol, "period": period, "interval": interval, "data": data}
        except Exception as exc:
            logger.warning("akshare 港股 history %s: %s", symbol, exc)
            return None

    def _us_history(self, symbol: str, period: str, interval: str) -> Optional[Dict]:
        try:
            df = ak.stock_us_hist(
                symbol=symbol, period="daily", start_date=period_to_start_date(period), adjust=""
            )
            if df.empty:
                return None
            data = [
                {
                    "date": str(row["日期"]),
                    "open": float(row["开盘"]),
                    "high": float(row["最高"]),
                    "low": float(row["最低"]),
                    "close": float(row["收盘"]),
                    "volume": int(row["成交量"]) if pd.notna(row["成交量"]) else 0,
                    "amount": _float_or_none(row.get("成交额")),
                    "interval": interval,
                    "adjust_type": "none",
                    "source": "akshare",
                }
                for _, row in df.iterrows()
            ]
            return {"symbol": symbol, "period": period, "interval": interval, "data": data}
        except Exception as exc:
            logger.warning("akshare 美股 history %s: %s", symbol, exc)
            return None

    # ------------------------------------------------------------------
    # Financial data
    # ------------------------------------------------------------------

    def get_financial_data(self, symbol: str) -> Optional[List[Dict]]:
        try:
            if is_hk_stock(symbol):
                return self._hk_financials(symbol)
            if is_a_stock(symbol):
                return self._a_financials(symbol)
            return None
        except Exception as exc:
            logger.error("akshare get_financial_data %s: %s", symbol, exc)
            return None

    def _a_financials(self, symbol: str) -> Optional[List[Dict]]:
        fast_result = self._a_financials_abstract(symbol)
        if fast_result:
            logger.info("akshare A股 financials abstract %s count=%d", symbol, len(fast_result))
            return fast_result

        logger.info("akshare A股 financials abstract unavailable %s, fallback to yjbb", symbol)
        return self._a_financials_yjbb(symbol)

    def _a_financials_abstract(self, symbol: str) -> Optional[List[Dict]]:
        try:
            df = ak.stock_financial_abstract(symbol=symbol)
            if df.empty:
                return None

            period_columns = [
                str(col) for col in df.columns
                if re.fullmatch(r"\d{8}", str(col))
            ][:config.FINANCIAL_MAX_PERIODS]
            if not period_columns:
                return None

            result = []
            for date_str in period_columns:
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                quarter = 0 if month == 12 else month // 3
                revenue = self._abstract_value(df, "常用指标", "营业总收入", date_str)
                net_profit = self._abstract_value(df, "常用指标", "归母净利润", date_str)
                operating_cost = self._abstract_value(df, "常用指标", "营业成本", date_str)
                gross_margin = self._abstract_value(df, "常用指标", "毛利率", date_str)
                net_margin = self._abstract_value(df, "常用指标", "销售净利率", date_str)
                item = {
                    "symbol": symbol,
                    "year": year,
                    "quarter": quarter,
                    "revenue": revenue,
                    "net_profit": net_profit,
                    "revenue_yoy": self._abstract_value(df, "成长能力", "营业总收入增长率", date_str),
                    "profit_yoy": self._abstract_value(df, "成长能力", "归属母公司净利润增长率", date_str),
                    "gross_margin": gross_margin,
                    "roe": self._abstract_value(df, "常用指标", "净资产收益率(ROE)", date_str),
                    "eps": self._abstract_value(df, "常用指标", "基本每股收益", date_str),
                    "net_margin": (
                        net_margin if net_margin is not None else (
                            net_profit / revenue * 100
                            if revenue not in (None, 0) and net_profit is not None else None
                        )
                    ),
                    "operating_cash_flow": self._abstract_value(df, "常用指标", "经营现金流量净额", date_str),
                    "gross_profit": (
                        revenue - operating_cost
                        if revenue is not None and operating_cost is not None else None
                    ),
                    "shareholder_equity": self._abstract_value(df, "常用指标", "股东权益合计(净资产)", date_str),
                    "report_date": f"{year}-{month:02d}-{day:02d}",
                    "period_type": "annual" if quarter == 0 else "quarterly",
                    "currency": "CNY",
                    "source": "akshare:stock_financial_abstract",
                }
                result.append(item)

            self._fill_yoy(result)
            return result if result else None
        except Exception as exc:
            logger.warning("akshare A股 financials abstract %s: %s", symbol, exc)
            return None

    @staticmethod
    def _abstract_value(
        df: "pd.DataFrame", option: str, indicator: str, period: str
    ) -> Optional[float]:
        rows = df[(df["选项"] == option) & (df["指标"] == indicator)]
        if rows.empty:
            rows = df[df["指标"] == indicator]
        if rows.empty or period not in rows.columns:
            return None
        return _float_or_none(rows.iloc[0][period])

    @staticmethod
    def _fill_yoy(items: List[Dict]) -> None:
        by_period = {(item["year"], item["quarter"]): item for item in items}
        for item in items:
            prev = by_period.get((item["year"] - 1, item["quarter"]))
            if not prev:
                continue
            if item.get("revenue_yoy") is None:
                prev_revenue = prev.get("revenue")
                revenue = item.get("revenue")
                if prev_revenue not in (None, 0) and revenue is not None:
                    item["revenue_yoy"] = round((revenue - prev_revenue) / prev_revenue * 100, 2)
            if item.get("profit_yoy") is None:
                prev_profit = prev.get("net_profit")
                net_profit = item.get("net_profit")
                if prev_profit not in (None, 0) and net_profit is not None:
                    item["profit_yoy"] = round((net_profit - prev_profit) / prev_profit * 100, 2)

    def _a_financials_yjbb(self, symbol: str) -> Optional[List[Dict]]:
        result = []
        for date_str, year, quarter in self._a_financial_periods():
            try:
                df = ak.stock_yjbb_em(date=date_str)
                row_df = df[df["股票代码"] == symbol]
                if row_df.empty:
                    continue
                row = row_df.iloc[0]
                revenue = _float_or_none(row["营业总收入-营业总收入"])
                net_profit = _float_or_none(row["净利润-净利润"])
                gross_profit = _float_or_none(row.get("营业总收入-营业总收入"))
                item = {
                    "symbol": symbol,
                    "year": year,
                    "quarter": quarter,
                    "revenue": revenue,
                    "net_profit": net_profit,
                    "revenue_yoy": _float_or_none(row["营业总收入-同比增长"]),
                    "profit_yoy": _float_or_none(row["净利润-同比增长"]),
                    "gross_margin": _float_or_none(row["销售毛利率"]),
                    "roe": _float_or_none(row["净资产收益率"]),
                    "eps": _float_or_none(row["每股收益"]),
                    "net_margin": (
                        net_profit / revenue * 100
                        if revenue not in (None, 0) and net_profit is not None else None
                    ),
                    "operating_cash_flow": (
                        _float_or_none(row["每股经营现金流量"]) * 1e9
                        if _float_or_none(row["每股经营现金流量"]) is not None else None
                    ),
                    "gross_profit": gross_profit,
                    "report_date": f"{year}-12-31" if quarter == 0 else (
                        f"{year}-{quarter * 3:02d}-{self._quarter_end_day(quarter):02d}"
                    ),
                    "period_type": "annual" if quarter == 0 else "quarterly",
                    "currency": "CNY",
                    "source": "akshare",
                }
                result.append(item)
            except Exception as exc:
                logger.warning("akshare A股 financials %s %s: %s", symbol, date_str, exc)
        return result if result else None

    @staticmethod
    def _quarter_end_day(quarter: int) -> int:
        return {1: 31, 2: 30, 3: 30, 4: 31}.get(quarter, 31)

    def _a_financial_periods(self, current: Optional[datetime] = None) -> List[tuple[str, int, int]]:
        current = current or datetime.now()
        start_year = current.year - config.FINANCIAL_LOOKBACK_YEARS
        periods: List[tuple[str, int, int]] = []
        for year in range(start_year, current.year + 1):
            annual = datetime(year, 12, 31)
            if annual <= current:
                periods.append((annual.strftime("%Y%m%d"), year, 0))
            for quarter, month in [(1, 3), (2, 6), (3, 9)]:
                report_date = datetime(year, month, self._quarter_end_day(quarter))
                if report_date <= current:
                    periods.append((report_date.strftime("%Y%m%d"), year, quarter))
        return sorted(periods, reverse=True)[:config.FINANCIAL_MAX_PERIODS]

    def _hk_financials(self, symbol: str) -> Optional[List[Dict]]:
        try:
            df = ak.stock_financial_hk_report_em(stock=symbol, symbol="利润表")
            if df.empty:
                return None
            years_data: Dict[int, Dict] = {}
            for date in df["REPORT_DATE"].unique():
                year = pd.to_datetime(date).year
                if year < 2020 or year in years_data:
                    continue
                date_data = df[df["REPORT_DATE"] == date]
                revenue = self._hk_field(date_data, "营业额")
                net_profit = self._hk_field(date_data, "股东应占溢利")
                eps = self._hk_field(date_data, "每股基本盈利")
                years_data[year] = {
                    "symbol": symbol,
                    "year": year,
                    "quarter": 0,
                    "revenue": revenue,
                    "net_profit": net_profit,
                    "eps": eps,
                    "net_margin": (net_profit / revenue * 100) if revenue else None,
                    "gross_margin": None,
                    "roe": None,
                    "operating_cash_flow": None,
                    "revenue_yoy": None,
                    "profit_yoy": None,
                    "report_date": str(pd.to_datetime(date).date()),
                    "period_type": "annual",
                    "currency": "HKD",
                    "source": "akshare",
                }
            result = []
            for year in sorted(years_data.keys(), reverse=True):
                item = years_data[year]
                prev = years_data.get(year - 1)
                if prev:
                    if prev["revenue"] > 0:
                        item["revenue_yoy"] = (item["revenue"] - prev["revenue"]) / prev["revenue"] * 100
                    if prev["net_profit"] > 0:
                        item["profit_yoy"] = (item["net_profit"] - prev["net_profit"]) / prev["net_profit"] * 100
                result.append(item)
            return result if result else None
        except Exception as exc:
            logger.error("akshare 港股 financials %s: %s", symbol, exc)
            return None

    @staticmethod
    def _hk_field(df: "pd.DataFrame", name: str) -> Optional[float]:
        rows = df[df["STD_ITEM_NAME"] == name]["AMOUNT"].values
        return float(rows[0]) if len(rows) > 0 and pd.notna(rows[0]) else None

    # ------------------------------------------------------------------
    # Yearly returns
    # ------------------------------------------------------------------

    def get_yearly_returns(self, symbol: str) -> Dict[int, float]:
        try:
            if is_hk_stock(symbol):
                df = ak.stock_hk_hist(symbol=symbol, period="daily", start_date="20200101",
                                      end_date=datetime.now().strftime("%Y%m%d"), adjust="qfq")
            elif is_a_stock(symbol):
                df = ak.stock_zh_a_hist(symbol=symbol, period="daily", start_date="20200101",
                                        end_date=datetime.now().strftime("%Y%m%d"), adjust="qfq")
            else:
                return {}
            if df.empty:
                return {}
            df["日期"] = pd.to_datetime(df["日期"])
            returns: Dict[int, float] = {}
            for year in range(2020, datetime.now().year + 1):
                year_df = df[(df["日期"] >= f"{year}-01-01") & (df["日期"] <= f"{year}-12-31")]
                if len(year_df) > 0:
                    first = year_df.iloc[0]["收盘"]
                    last = year_df.iloc[-1]["收盘"]
                    if first > 0:
                        returns[year] = round((last - first) / first * 100, 2)
            return returns
        except Exception as exc:
            logger.error("akshare yearly_returns %s: %s", symbol, exc)
            return {}

    # ------------------------------------------------------------------
    # Stock list (for search)
    # ------------------------------------------------------------------

    def get_stock_list(self) -> Dict[str, List[Dict]]:
        result: Dict[str, List[Dict]] = {"A股": [], "港股": [], "美股": []}
        try:
            df = ak.stock_info_a_code_name()
            result["A股"] = [
                {"symbol": str(r["code"]), "name": str(r["name"]), "market": "A股"}
                for r in df.to_dict("records")
            ]
        except Exception as exc:
            logger.warning("akshare A股 list: %s", exc)
        try:
            df = ak.stock_hk_spot_em()
            result["港股"] = [
                {"symbol": str(r["代码"]), "name": str(r["名称"]), "market": "港股"}
                for _, r in df.iterrows()
            ]
        except Exception as exc:
            logger.warning("akshare 港股 list: %s", exc)
        return result

    # ------------------------------------------------------------------
    # Market data
    # ------------------------------------------------------------------

    def get_hot_stocks(self, limit: int = 20) -> List[Dict]:
        try:
            df = ak.stock_zh_a_spot_em()
            if df.empty:
                return []
            df = df.sort_values("涨跌幅", ascending=False).head(limit)
            return [
                {
                    "symbol": r["代码"],
                    "name": r["名称"],
                    "price": float(r["最新价"]) if pd.notna(r["最新价"]) else 0,
                    "change": float(r["涨跌额"]) if pd.notna(r["涨跌额"]) else 0,
                    "changePercent": float(r["涨跌幅"]) if pd.notna(r["涨跌幅"]) else 0,
                    "volume": int(r["成交量"]) if pd.notna(r["成交量"]) else 0,
                }
                for _, r in df.iterrows()
            ]
        except Exception as exc:
            logger.error("akshare hot_stocks: %s", exc)
            return []

    def get_hot_industries(self, limit: int = 20) -> List[Dict]:
        try:
            df = ak.stock_board_industry_name_em()
            if df.empty:
                return []
            df = df.sort_values("涨跌幅", ascending=False).head(limit)
            return [
                {
                    "name": r["板块名称"],
                    "changePercent": float(r["涨跌幅"]) if pd.notna(r["涨跌幅"]) else 0,
                    "change": float(r["涨跌额"]) if pd.notna(r["涨跌额"]) else 0,
                    "leadingStock": r["领涨股票"] if pd.notna(r["领涨股票"]) else "",
                    "leadingPercent": float(r["领涨股票-涨跌幅"]) if pd.notna(r["领涨股票-涨跌幅"]) else 0,
                    "totalMarket": float(r["总市值"]) if pd.notna(r["总市值"]) else 0,
                    "upCount": int(r["上涨家数"]) if pd.notna(r["上涨家数"]) else 0,
                    "downCount": int(r["下跌家数"]) if pd.notna(r["下跌家数"]) else 0,
                }
                for _, r in df.iterrows()
            ]
        except Exception as exc:
            logger.error("akshare hot_industries: %s", exc)
            return []

    def get_financial_news(self, limit: int = 20) -> List[Dict]:
        try:
            df = ak.news_cctv()
            if df.empty:
                return []
            return [
                {
                    "title": r["title"] if pd.notna(r["title"]) else "",
                    "content": (r["content"][:200] if pd.notna(r["content"]) else ""),
                    "source": "央视新闻",
                    "time": str(r["date"]) if pd.notna(r["date"]) else "",
                    "url": "",
                }
                for _, r in df.head(limit).iterrows()
            ]
        except Exception as exc:
            logger.error("akshare financial_news: %s", exc)
            return []

    def get_research_reports(self, symbol: str, limit: int = 5) -> List[Dict]:
        try:
            df = ak.stock_research_report_em(symbol=symbol)
            if df.empty:
                return []
            result = []
            for _, row in df.head(limit).iterrows():
                report: Dict = {
                    "title": row["报告名称"] if pd.notna(row["报告名称"]) else "",
                    "rating": row["东财评级"] if pd.notna(row["东财评级"]) else "",
                    "institution": row["机构"] if pd.notna(row["机构"]) else "",
                    "date": str(row["日期"]) if pd.notna(row["日期"]) else "",
                    "industry": row["行业"] if pd.notna(row["行业"]) else "",
                    "pdf_url": row["报告PDF链接"] if pd.notna(row["报告PDF链接"]) else "",
                    "eps_forecast": {},
                }
                for year in ["2025", "2026", "2027"]:
                    eps_col = f"{year}-盈利预测-收益"
                    pe_col = f"{year}-盈利预测-市盈率"
                    if eps_col in row and pd.notna(row[eps_col]):
                        report["eps_forecast"][year] = {
                            "eps": float(row[eps_col]),
                            "pe": float(row[pe_col]) if pe_col in row and pd.notna(row[pe_col]) else None,
                        }
                result.append(report)
            return result
        except Exception as exc:
            logger.error("akshare research_reports %s: %s", symbol, exc)
            return []


akshare_provider = AKShareProvider()
