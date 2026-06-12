"""
AI service — orchestrates LLM analysis using web search context.
Modular: sector / financials / valuation / thesis + synthesis.
"""

import logging
import time
from typing import Dict, List

from infra.providers.ai_provider import ai_provider
from services.prompt_loader import prompt_loader

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "你是一位专业的股票分析师，擅长分析公司财务数据、行业趋势和投资价值。"
    "请基于提供的信息进行客观、专业的分析。"
)


def _fin_summary(stock_info: Dict, financial_data: List[Dict]) -> str:
    if not financial_data:
        return ""
    latest = financial_data[0]
    price = stock_info.get("price", 0)
    rev = latest.get("revenue", 0) or 0
    np_ = latest.get("net_profit", 0) or 0
    return (
        f"\n财务数据：\n当前价格：{price}元\n"
        f"最新财报（{latest.get('year', '')}Q{latest.get('quarter', 0)}）：\n"
        f"- 营收：{rev / 1e8:.2f}亿（同比{latest.get('revenue_yoy', 0) or 0:.2f}%）\n"
        f"- 净利润：{np_ / 1e8:.2f}亿（同比{latest.get('profit_yoy', 0) or 0:.2f}%）\n"
        f"- 毛利率：{latest.get('gross_margin', 0):.2f}%\n"
        f"- ROE：{latest.get('roe', 0):.2f}%\n"
        f"- EPS：{latest.get('eps', 0):.2f}\n"
        f"近5年ROE趋势：{[f.get('roe', 0) for f in financial_data[:5] if f.get('roe')]}\n"
    )


def _truncate(text: str, max_chars: int = 800) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "..."


class AIService:

    # ------------------------------------------------------------------
    # Individual analysis methods
    # ------------------------------------------------------------------

    async def analyze_sector(self, symbol: str, stock_info: Dict) -> str:
        name = stock_info.get("name", symbol)
        industry = stock_info.get("industry", "") or stock_info.get("sector", "")
        web = await ai_provider.search_and_collect(
            f"{name} {symbol} {industry} 行业分析 竞争格局 政策 2024 2025", max_pages=3
        )
        prompt = prompt_loader.render(
            "sector", name=name, symbol=symbol, industry=industry or "未知"
        )
        return await ai_provider.call_llm(
            [{"role": "system", "content": _SYSTEM_PROMPT},
             {"role": "user", "content": f"{prompt}\n\n参考资料：\n{web}"}]
        )

    async def analyze_financials(self, symbol: str, stock_info: Dict,
                                 financial_data: List[Dict]) -> str:
        name = stock_info.get("name", symbol)
        fin = _fin_summary(stock_info, financial_data)
        web = await ai_provider.search_and_collect(
            f"{name} {symbol} 财务分析 ROE 营收增长 毛利率 2024 2025", max_pages=3
        )
        prompt = prompt_loader.render(
            "financials", name=name, symbol=symbol, financial_summary=fin
        )
        return await ai_provider.call_llm(
            [{"role": "system", "content": _SYSTEM_PROMPT},
             {"role": "user", "content": f"{prompt}\n\n参考资料：\n{web}"}]
        )

    async def analyze_valuation(self, symbol: str, stock_info: Dict,
                                financial_data: List[Dict]) -> str:
        name = stock_info.get("name", symbol)
        fin = _fin_summary(stock_info, financial_data)
        web = await ai_provider.search_and_collect(
            f"{name} {symbol} 估值分析 PE PB 目标价 研报 2024 2025", max_pages=3
        )
        prompt = prompt_loader.render(
            "valuation", name=name, symbol=symbol, financial_summary=fin
        )
        return await ai_provider.call_llm(
            [{"role": "system", "content": _SYSTEM_PROMPT},
             {"role": "user", "content": f"{prompt}\n\n参考资料：\n{web}"}]
        )

    async def build_thesis_analysis(self, symbol: str, stock_info: Dict,
                                    financial_data: List[Dict]) -> str:
        name = stock_info.get("name", symbol)
        fin = _fin_summary(stock_info, financial_data)
        web = await ai_provider.search_and_collect(
            f"{name} {symbol} 投资逻辑 增长驱动 风险 评级 2024 2025", max_pages=3
        )
        prompt = prompt_loader.render(
            "thesis_analysis", name=name, symbol=symbol, financial_summary=fin
        )
        return await ai_provider.call_llm(
            [{"role": "system", "content": _SYSTEM_PROMPT},
             {"role": "user", "content": f"{prompt}\n\n参考资料：\n{web}"}]
        )

    # ------------------------------------------------------------------
    # Comprehensive analysis (5 LLM calls: 4 parallel + 1 synthesis)
    # ------------------------------------------------------------------

    async def analyze_comprehensive(
        self, symbol: str, stock_info: Dict, financial_data: List[Dict]
    ) -> Dict:
        import asyncio

        name = stock_info.get("name", symbol)
        industry = stock_info.get("industry", "") or stock_info.get("sector", "")
        price = stock_info.get("price", 0)

        started = time.perf_counter()
        logger.info(
            "AI综合分析 start symbol=%s stock_available=%s financial_count=%d price=%s",
            symbol, stock_info.get("available", True), len(financial_data), price,
        )

        # Step 1: 4 parallel analyses
        results = await asyncio.gather(
            self.analyze_sector(symbol, stock_info),
            self.analyze_financials(symbol, stock_info, financial_data),
            self.analyze_valuation(symbol, stock_info, financial_data),
            self.build_thesis_analysis(symbol, stock_info, financial_data),
            return_exceptions=True,
        )

        dimension_names = ["行业分析", "财务分析", "估值分析", "投资逻辑"]
        partial_failure = []
        analyses = {}
        for i, (name_dim, result) in enumerate(zip(dimension_names, results)):
            if isinstance(result, Exception):
                logger.warning("子分析失败 dimension=%s error=%s", name_dim, result)
                partial_failure.append(name_dim)
                analyses[name_dim] = f"[{name_dim}数据暂时不可用]"
            else:
                analyses[name_dim] = _truncate(result)

        # Step 2: All failed → skip synthesis
        if len(partial_failure) == len(dimension_names):
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.error("所有分析维度均失败 symbol=%s elapsed_ms=%d", symbol, elapsed_ms)
            return {"symbol": symbol, "name": name, "error": "所有分析维度均失败"}

        # Step 3: Synthesis (5th LLM call)
        synthesis_prompt = prompt_loader.render(
            "synthesis",
            sector_analysis=analyses["行业分析"],
            financials_analysis=analyses["财务分析"],
            valuation_analysis=analyses["估值分析"],
            thesis_analysis=analyses["投资逻辑"],
        )
        try:
            analysis = await ai_provider.call_llm(
                [{"role": "system", "content": _SYSTEM_PROMPT},
                 {"role": "user", "content": synthesis_prompt}]
            )
        except Exception as exc:
            logger.error("综合叙事调用失败 symbol=%s: %s", symbol, exc)
            analysis = "\n\n".join(v for v in analyses.values()
                                   if v and "暂时不可用" not in v)

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "AI综合分析 done symbol=%s chars=%d elapsed_ms=%d partial_failure=%s",
            symbol, len(analysis), elapsed_ms, partial_failure,
        )
        return {
            "symbol": symbol, "name": name, "current_price": price,
            "industry": industry, "analysis": analysis,
            "sources": "基于网络搜索、财务数据和研报分析",
            "partial_failure": partial_failure,
        }

    # ------------------------------------------------------------------
    # Earnings preview
    # ------------------------------------------------------------------

    async def generate_earnings_preview(self, symbol: str, stock_info: Dict,
                                        quarter: str) -> Dict:
        name = stock_info.get("name", symbol)

        # Try akshare analyst forecast first
        analyst_data = ""
        data_source = "web_search"
        try:
            import akshare as ak
            df = ak.stock_analyst_forecast_em(symbol=symbol)
            if df is not None and not df.empty:
                analyst_data = df.to_string(index=False)
                data_source = "analyst_forecast"
        except Exception as exc:
            logger.info("akshare analyst forecast unavailable for %s: %s", symbol, exc)

        if data_source == "web_search":
            web = await ai_provider.search_and_collect(
                f"{name} {symbol} {quarter} 财报预期 分析师预测", max_pages=3
            )
            analyst_data = web

        prompt = prompt_loader.render(
            "earnings_preview",
            name=name, symbol=symbol, quarter=quarter,
            analyst_data=analyst_data,
        )
        try:
            result = await ai_provider.call_llm(
                [{"role": "system", "content": _SYSTEM_PROMPT},
                 {"role": "user", "content": prompt}]
            )
        except Exception as exc:
            logger.error("earnings preview LLM failed %s: %s", symbol, exc)
            return {"error": str(exc), "data_source": data_source}

        return {
            "analysis": result,
            "data_source": data_source,
            "symbol": symbol,
            "quarter": quarter,
        }

    # ------------------------------------------------------------------
    # Existing: research report summary
    # ------------------------------------------------------------------

    async def summarize_research_reports(
        self, symbol: str, stock_info: Dict, reports: List[Dict]
    ) -> Dict:
        name = stock_info.get("name", symbol)
        price = stock_info.get("price", 0)

        if not reports:
            return {
                "symbol": symbol, "name": name,
                "summary": "暂无研报数据", "recommendation": "无法获取研报信息", "reports": [],
            }

        reports_text = ""
        for i, r in enumerate(reports[:5], 1):
            eps_parts = []
            for yr, d in (r.get("eps_forecast") or {}).items():
                eps_parts.append(f"{yr}年EPS:{d.get('eps', 0):.2f}")
            eps_info = f"（盈利预测: {', '.join(eps_parts)}）" if eps_parts else ""
            reports_text += (
                f"\n{i}. 【{r.get('institution', '')}】{r.get('date', '')}\n"
                f"   标题: {r.get('title', '')}\n"
                f"   评级: {r.get('rating', '')}\n"
                f"   {eps_info}\n"
            )

        prompt = f"""
请分析以下关于{name}（{symbol}）的券商研报（当前股价{price}元）并给出投资建议：

{reports_text}

## 一、研报核心观点汇总
## 二、盈利预测分析（EPS趋势、预测增长率）
## 三、投资评级统计（买入/增持/持有/卖出分布）
## 四、风险提示
## 五、综合投资建议
1. 综合评级（强烈推荐/推荐/中性/不推荐）
2. 目标价格区间
3. 关键催化剂与需关注指标

请用中文回答，简洁专业，结论明确。
"""
        logger.info("AI研报总结 start: %s (%d篇)", symbol, len(reports))
        try:
            analysis = await ai_provider.call_llm(
                [{"role": "system", "content": _SYSTEM_PROMPT},
                 {"role": "user", "content": prompt}]
            )
            logger.info("AI研报总结 done: %s", symbol)
            return {
                "symbol": symbol, "name": name, "current_price": price,
                "report_count": len(reports), "summary": analysis,
                "reports": reports[:5], "sources": f"基于{len(reports)}篇券商研报分析",
            }
        except Exception as exc:
            logger.error("AI研报总结失败 %s: %s", symbol, exc)
            return {"symbol": symbol, "name": name, "error": str(exc), "reports": reports[:5]}


ai_service = AIService()
