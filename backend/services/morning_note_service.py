"""
Morning note service — on-demand async generation with three-state machine.
"""

import asyncio
import logging
import re
import threading
from typing import Dict, List, Optional

from infra.repositories.morning_note_repo import morning_note_repo
from infra.repositories.watchlist_repo import watchlist_repo
from services.calendar_service import calendar_service
from services.stock_service import stock_service

logger = logging.getLogger(__name__)


class MorningNoteService:

    def get_or_trigger_today(self) -> Dict:
        today_note = morning_note_repo.get_today()

        if today_note and today_note["status"] == "success":
            return {"note": today_note, "today_status": "success"}

        if today_note and today_note["status"] == "generating":
            latest = morning_note_repo.get_latest_success()
            return {
                "note": latest,
                "today_status": "generating",
            }

        # Check if watchlist is empty
        symbols = watchlist_repo.get_symbols()
        if not symbols:
            morning_note_repo.upsert_today(
                status="failed", error="无关注股票"
            )
            latest = morning_note_repo.get_latest_success()
            return {"note": latest, "today_status": "failed"}

        # Create generating placeholder and start background thread
        morning_note_repo.upsert_today(status="generating")
        thread = threading.Thread(target=self._generate_blocking, daemon=True)
        thread.start()

        latest = morning_note_repo.get_latest_success()
        return {"note": latest, "today_status": "generating"}

    def get_by_date(self, date_str: str) -> Optional[Dict]:
        note = morning_note_repo.get_by_date(date_str)
        if not note or note["status"] != "success":
            return None
        return note

    def list_history(self, days: int = 30):
        return morning_note_repo.list_history(days)

    def trigger_generate(self) -> Dict:
        today_note = morning_note_repo.get_today()

        if today_note and today_note["status"] == "success":
            morning_note_repo.upsert_today(status="generating", regenerated=True)
        elif not today_note:
            morning_note_repo.upsert_today(status="generating")
        else:
            morning_note_repo.upsert_today(status="generating")

        thread = threading.Thread(target=self._generate_blocking, daemon=True)
        thread.start()
        return {"status": "generating"}

    def _generate_blocking(self):
        """Synchronous generation function run in background thread."""
        try:
            asyncio.run(self._generate_async())
        except Exception as exc:
            logger.exception("Morning note generation failed: %s", exc)
            morning_note_repo.upsert_today(status="failed", error=str(exc))

    async def _generate_async(self):
        symbols = watchlist_repo.get_symbols()
        if not symbols:
            morning_note_repo.upsert_today(status="failed", error="无关注股票")
            return

        from infra.providers.ai_provider import ai_provider
        from infra.repositories.news_archive_repo import news_archive_repo, compute_score

        today = datetime.now().strftime("%Y-%m-%d")

        # Batch fetch price changes + collect industry info
        price_parts = []
        industries = set()
        for sym in symbols:
            try:
                info = stock_service.get_stock_info(sym)
                name = info.get("name", sym)
                price = info.get("price", 0)
                change_pct = info.get("changePercent", 0)
                price_parts.append(f"{name}({sym}): {price}元, 涨跌幅{change_pct}%")
                ind = info.get("industry", "")
                if ind:
                    industries.add(ind)
            except Exception:
                price_parts.append(f"{sym}: 数据获取失败")
        price_changes = "\n".join(price_parts)

        # Get upcoming events
        try:
            events = calendar_service.get_upcoming(days=1)
            events_text = "\n".join(
                f"- {e['symbol']}: {e['event']} ({e['date']})"
                for e in events
            ) if events else "无特别事件"
        except Exception:
            events_text = "无特别事件"

        watchlist_summary = "\n".join(f"- {sym}" for sym in symbols)

        # Layer 1: Company-specific news — score and archive
        company_query = " ".join(symbols[:5]) + " 股票 最新消息 公告"
        try:
            overnight_results = await ai_provider.search_web(company_query, max_results=5)
            overnight_text, company_items = self._score_and_format(
                overnight_results, symbols, today, "company"
            )
        except Exception:
            overnight_text, company_items = "无重大动态", []

        # Layer 2: Industry news — score and archive
        industry_list = list(industries)[:3]
        industry_query = " ".join(industry_list) + " 行业动态 产业新闻 协会" if industry_list else "A股 行业动态"
        try:
            industry_results = await ai_provider.search_web(industry_query, max_results=5)
            industry_text, industry_items = self._score_and_format(
                industry_results, symbols, today, "industry"
            )
        except Exception:
            industry_text, industry_items = "无重要产业动态", []

        # Layer 3: Macro policy news — score and archive
        macro_query = "中国 宏观经济政策 央行 财政部 A股 影响"
        try:
            macro_results = await ai_provider.search_web(macro_query, max_results=5)
            macro_text, macro_items = self._score_and_format(
                macro_results, symbols, today, "macro"
            )
        except Exception:
            macro_text, macro_items = "无重要宏观变化", []

        # Save all scored news to archive
        all_items = company_items + industry_items + macro_items
        if all_items:
            saved = news_archive_repo.save_batch(all_items)
            logger.info("News archive: saved %d new items", saved)

        # Single LLM call with 3 layers of context
        from services.ai_service import prompt_loader
        prompt = prompt_loader.render(
            "morning_note",
            watchlist_summary=watchlist_summary,
            price_changes=price_changes,
            upcoming_events=events_text,
            overnight_news=overnight_text,
            industry_news=industry_text,
            macro_news=macro_text,
        )

        try:
            from infra.providers.ai_provider import ai_provider
            from services.ai_service import _SYSTEM_PROMPT
            raw_text = await ai_provider.call_llm(
                [{"role": "system", "content": _SYSTEM_PROMPT},
                 {"role": "user", "content": prompt}]
            )
        except Exception as exc:
            logger.error("Morning note LLM call failed: %s", exc)
            morning_note_repo.upsert_today(status="failed", error=str(exc))
            return

        # Parse sections
        sections = self._parse_sections(raw_text)
        content = {"raw_text": raw_text, "sections": sections}
        morning_note_repo.upsert_today(status="success", content=content)
        logger.info("Morning note generated successfully")

    @staticmethod
    def _score_and_format(
        search_results: List[Dict], symbols: List[str], today: str, layer: str
    ) -> tuple:
        """
        Score search results and format for LLM prompt.
        Returns (formatted_text, archive_items).
        """
        from infra.repositories.news_archive_repo import compute_score

        if not search_results:
            return ("无重大动态" if layer == "company" else
                    "无重要产业动态" if layer == "industry" else
                    "无重要宏观变化"), []

        items = []
        lines = []
        for n in search_results:
            title = n.get("title", "")
            snippet = n.get("snippet", "")
            if not title:
                continue

            # Check if title mentions any watched symbol
            is_symbol_match = any(sym in title or sym in snippet for sym in symbols)

            # Source weight
            source_weight = 1.0
            if any(kw in title for kw in ["协会", "官方", "发布", "公告"]):
                source_weight = 1.0
            elif any(kw in title for kw in ["分析", "研报", "观点"]):
                source_weight = 0.9
            else:
                source_weight = 0.7

            # Compute score
            published_at = n.get("published_at", today)
            score = compute_score(published_at, is_symbol_match, source_weight)

            # Match symbol for archive
            matched_symbol = ""
            for sym in symbols:
                if sym in title or sym in snippet:
                    matched_symbol = sym
                    break

            items.append({
                "symbol": matched_symbol,
                "date": today,
                "title": title,
                "snippet": snippet,
                "source_url": n.get("link", ""),
                "layer": layer,
                "score": score,
                "published_at": published_at,
            })

            # Format for LLM (include score indicator)
            score_tag = "🔴" if score >= 0.7 else "🟡" if score >= 0.4 else "⚪"
            lines.append(f"- {score_tag} {title}: {snippet}")

        # Sort by score descending — highest value first
        items.sort(key=lambda x: x["score"], reverse=True)
        text = "\n".join(lines) if lines else (
            "无重大动态" if layer == "company" else
            "无重要产业动态" if layer == "industry" else
            "无重要宏观变化"
        )
        return text, items

    @staticmethod
    def _parse_sections(raw_text: str) -> Optional[Dict]:
        section_headers = {
            "价格速览": "price_overview",
            "个股动态": "company_news",
            "产业动态": "industry_news",
            "宏观政策": "macro_policy",
            "操作倾向": "action_bias",
        }
        sections = {}
        for header, key in section_headers.items():
            pattern = rf"##\s*{re.escape(header)}\s*\n(.*?)(?=##\s|\Z)"
            match = re.search(pattern, raw_text, re.DOTALL)
            if match:
                sections[key] = match.group(1).strip()
            else:
                return None
        return sections if len(sections) == len(section_headers) else None


morning_note_service = MorningNoteService()
