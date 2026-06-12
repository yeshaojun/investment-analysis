"""
Calendar service — aggregate catalyst events for calendar view.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List

from infra.repositories.catalyst_events_repo import catalyst_events_repo
from infra.repositories.watchlist_repo import watchlist_repo

logger = logging.getLogger(__name__)


class CalendarService:

    def get_events(self, year: int, month: int) -> Dict:
        symbols = watchlist_repo.get_symbols()
        if not symbols:
            return {"events": [], "data_partial": False}

        start = f"{year}-{month:02d}-01"
        if month == 12:
            end = f"{year + 1}-01-01"
        else:
            end = f"{year}-{month + 1:02d}-01"

        # Manual events from catalyst_events table
        manual_events = catalyst_events_repo.get_by_date_range(start, end, symbols)
        for e in manual_events:
            e["source"] = "manual"

        # Auto events from akshare (earnings dates)
        auto_events = []
        data_partial = False
        try:
            import akshare as ak
            for sym in symbols:
                try:
                    df = ak.stock_report_disclosure(symbol=sym)
                    if df is not None and not df.empty:
                        for _, row in df.iterrows():
                            date_str = str(row.get("预约披露时间", ""))
                            if date_str and start <= date_str[:10] <= end:
                                auto_events.append({
                                    "symbol": sym,
                                    "date": date_str[:10],
                                    "event": "财报披露",
                                    "impact": "high",
                                    "source": "auto",
                                    "notes": "",
                                })
                except Exception:
                    continue
        except Exception as exc:
            logger.warning("akshare earnings dates failed: %s", exc)
            data_partial = True

        all_events = manual_events + auto_events
        all_events.sort(key=lambda x: x.get("date", ""))
        return {"events": all_events, "data_partial": data_partial}

    def get_upcoming(self, days: int = 7) -> List[Dict]:
        symbols = watchlist_repo.get_symbols()
        if not symbols:
            return []

        today = datetime.now().strftime("%Y-%m-%d")
        end = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

        events = catalyst_events_repo.get_by_date_range(today, end, symbols)
        for e in events:
            e["source"] = "manual"

        # Auto events from akshare
        try:
            import akshare as ak
            for sym in symbols:
                try:
                    df = ak.stock_report_disclosure(symbol=sym)
                    if df is not None and not df.empty:
                        for _, row in df.iterrows():
                            date_str = str(row.get("预约披露时间", ""))
                            if date_str and today <= date_str[:10] <= end:
                                events.append({
                                    "symbol": sym,
                                    "date": date_str[:10],
                                    "event": "财报披露",
                                    "impact": "high",
                                    "source": "auto",
                                    "notes": "",
                                })
                except Exception:
                    continue
        except Exception:
            pass

        events.sort(key=lambda x: x.get("date", ""))
        return events


calendar_service = CalendarService()
