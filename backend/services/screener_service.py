"""
Screener service — stock screening based on pre-computed fundamentals.
"""

import logging
from typing import Dict, Optional

from infra.repositories.stock_fundamentals_repo import stock_fundamentals_repo
from infra.repositories.data_sync_status_repo import data_sync_status_repo

logger = logging.getLogger(__name__)

PRESETS = {
    "value": {
        "name": "价值股",
        "description": "低估值 + 高分红",
        "defaults": {
            "pe_max": 25,
            "pb_max": 1.5,
            "dividend_yield_min": 3.0,
        },
    },
    "growth": {
        "name": "成长股",
        "description": "高增长 + 高 ROE",
        "defaults": {
            "revenue_growth_min": 15,
            "net_profit_growth_min": 20,
            "roe_min": 15,
        },
    },
    "quality": {
        "name": "质量股",
        "description": "高毛利 + 低负债 + ROE 连续",
        "defaults": {
            "gross_margin_min": 30,
            "fcf_ratio_min": 0.8,
            "debt_ratio_max": 40,
            "roe_consecutive_years": 3,
            "roe_min": 15,
        },
    },
}


class ScreenerService:

    def get_sync_status(self) -> Optional[Dict]:
        return data_sync_status_repo.get("stock_fundamentals")

    def screen(self, preset: str, overrides: Dict = None) -> Dict:
        sync = self.get_sync_status()
        if stock_fundamentals_repo.is_empty():
            return {
                "error": True,
                "message": "基本面数据尚未初始化，请先运行 refresh_fundamentals.py",
                "sync_status": sync.get("status", "never") if sync else "never",
                "http_status": 503,
            }

        if preset not in PRESETS:
            return {"error": True, "message": f"未知预设: {preset}", "http_status": 400}

        config = PRESETS[preset]
        thresholds = {**config["defaults"]}
        if overrides:
            thresholds.update(overrides)

        # Get all latest fundamentals
        all_latest = stock_fundamentals_repo.get_all_latest()
        if not all_latest:
            return {"error": True, "message": "无筛选数据", "results": [], "count": 0}

        results = []
        for stock in all_latest:
            if self._passes_filter(preset, stock, thresholds, stock.get("symbol")):
                results.append(stock)

        # Sort by core metric
        sort_key = {
            "value": "dividend_yield",
            "growth": "revenue_growth",
            "quality": "roe",
        }.get(preset, "roe")
        results.sort(key=lambda x: x.get(sort_key) or 0, reverse=True)
        results = results[:50]

        data_as_of = stock_fundamentals_repo.get_max_report_date()
        return {
            "results": results,
            "count": len(results),
            "preset": preset,
            "thresholds": thresholds,
            "data_as_of": data_as_of,
        }

    def _passes_filter(self, preset: str, stock: Dict, thresholds: Dict,
                       symbol: str) -> bool:
        if preset == "value":
            pe = stock.get("pe")
            pb = stock.get("pb")
            dy = stock.get("dividend_yield")
            if pe is None or pb is None or dy is None:
                return False
            return (pe < thresholds["pe_max"]
                    and pb < thresholds["pb_max"]
                    and dy > thresholds["dividend_yield_min"])

        elif preset == "growth":
            rg = stock.get("revenue_growth")
            npg = stock.get("net_profit_growth")
            roe = stock.get("roe")
            if rg is None or npg is None or roe is None:
                return False
            return (rg > thresholds["revenue_growth_min"]
                    and npg > thresholds["net_profit_growth_min"]
                    and roe > thresholds["roe_min"])

        elif preset == "quality":
            gm = stock.get("gross_margin")
            fcf = stock.get("fcf_ratio")
            dr = stock.get("debt_ratio")
            if gm is None or fcf is None or dr is None:
                return False
            if (gm < thresholds["gross_margin_min"]
                    or fcf < thresholds["fcf_ratio_min"]
                    or dr > thresholds["debt_ratio_max"]):
                return False
            # Multi-year ROE check
            years_needed = thresholds.get("roe_consecutive_years", 3)
            roe_min = thresholds.get("roe_min", 15)
            multi_year = stock_fundamentals_repo.get_multi_year(symbol, years_needed)
            if len(multi_year) < years_needed:
                return False
            return all(
                (s.get("roe") or 0) > roe_min for s in multi_year[:years_needed]
            )

        return False


screener_service = ScreenerService()
