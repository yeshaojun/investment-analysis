"""
AI service — orchestrates LLM analysis using web search context.
Contains prompt construction; no direct HTTP or DB calls.
"""

import logging
import time
from typing import Dict, List

from infra.providers.ai_provider import ai_provider

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


class AIService:

    async def analyze_comprehensive(
        self, symbol: str, stock_info: Dict, financial_data: List[Dict]
    ) -> Dict:
        name = stock_info.get("name", symbol)
        industry = stock_info.get("industry", "") or stock_info.get("sector", "")
        price = stock_info.get("price", 0)

        started = time.perf_counter()
        logger.info(
            "AI综合分析 start symbol=%s stock_available=%s financial_count=%d price=%s",
            symbol, stock_info.get("available", True), len(financial_data), price,
        )
        web = await ai_provider.search_and_collect(
            f"{name} {symbol} 行业分析 竞争力 投资价值 估值分析 研报 2024 2025", max_pages=5
        )
        logger.info("AI综合分析 web context ready symbol=%s chars=%d", symbol, len(web))
        fin = _fin_summary(stock_info, financial_data)

        prompt = f"""
请对{name}（{symbol}）进行全面的投资价值分析，从以下角度综合分析：

## 一、行业分析
1. 行业概述（定义、产业链结构）
2. 市场规模与增长趋势
3. 竞争格局（主要对手、集中度）
4. 政策环境

## 二、竞争力分析
1. 公司市场地位（行业排名、市场份额）
2. 核心竞争力（技术、品牌、成本优势）
3. SWOT分析

## 三、财务分析
{fin}
- 盈利能力、成长性、财务健康度

## 四、估值分析
- PE/PB估值、与行业均值对比、历史估值水平

## 五、投资建议
1. 核心投资逻辑与增长驱动
2. 主要风险因素
3. 投资评级（强烈推荐/推荐/中性/不推荐）
4. 目标价格区间与建议持仓周期

## 六、综合评分（1-10分）
行业前景 / 竞争力 / 成长性 / 估值 / 安全边际 / 综合投资价值

请用中文回答，结构清晰，数据准确，结论明确。
"""
        try:
            analysis = await ai_provider.call_llm(
                [{"role": "system", "content": _SYSTEM_PROMPT},
                 {"role": "user", "content": f"{prompt}\n\n参考资料：\n{web}"}]
            )
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info("AI综合分析 done symbol=%s chars=%d elapsed_ms=%d", symbol, len(analysis), elapsed_ms)
            return {
                "symbol": symbol, "name": name, "current_price": price,
                "industry": industry, "analysis": analysis,
                "sources": "基于网络搜索、财务数据和研报分析",
            }
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.exception("AI综合分析失败 symbol=%s elapsed_ms=%d", symbol, elapsed_ms)
            return {"symbol": symbol, "name": name, "error": str(exc)}

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
