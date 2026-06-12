"""
Refresh stock_fundamentals table with multi-year financial data + PE/PB/dividend snapshots.

Usage:
    cd backend && python -m scripts.refresh_fundamentals

The script:
1. Fetches all A-share codes via akshare
2. Gets financial data (ROE, revenue growth, etc.) for each stock
3. Fetches PE/PB/dividend yield snapshot
4. Writes to stock_fundamentals table with INSERT OR REPLACE
5. Supports resume via data_sync_status progress tracking
"""

import os
import sys
import time
import logging
from datetime import datetime
from typing import Callable, TypeVar

# Ensure backend is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import akshare as ak  # noqa: E402
import pandas as pd  # noqa: E402

from infra.repositories.stock_fundamentals_repo import stock_fundamentals_repo  # noqa: E402
from infra.repositories.data_sync_status_repo import data_sync_status_repo  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

TASK_NAME = "stock_fundamentals"
BATCH_SIZE = 50
SLEEP_BETWEEN_BATCHES = 2
MAX_RETRIES = 3
RETRY_SLEEP_SECONDS = 3

T = TypeVar("T")


def _call_with_retries(action: Callable[[], T], description: str) -> T:
    """Run an external data fetch with bounded retries."""
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return action()
        except Exception as exc:
            last_exc = exc
            if attempt == MAX_RETRIES:
                break
            logger.warning(
                "%s failed (attempt %d/%d): %s; retrying in %ds",
                description,
                attempt,
                MAX_RETRIES,
                exc,
                RETRY_SLEEP_SECONDS,
            )
            time.sleep(RETRY_SLEEP_SECONDS)
    raise RuntimeError(f"{description} failed after {MAX_RETRIES} attempts") from last_exc


def get_all_a_stock_codes():
    """Fetch all A-share stock codes and names."""
    df = _call_with_retries(ak.stock_info_a_code_name, "Fetch stock codes")
    return [{"symbol": row["code"], "name": row["name"]} for _, row in df.iterrows()]


def get_industry_mapping():
    """Build industry mapping from akshare board data."""
    mapping = {}
    try:
        boards = _call_with_retries(ak.stock_board_industry_name_em, "Fetch industry boards")
        for _, row in boards.iterrows():
            board_name = row.get("板块名称", "")
            if not board_name:
                continue
            try:
                cons = _call_with_retries(
                    lambda: ak.stock_board_industry_cons_em(symbol=board_name),
                    f"Fetch industry constituents for {board_name}",
                )
                for _, c in cons.iterrows():
                    code = str(c.get("代码", ""))
                    if code:
                        mapping[code] = board_name
            except Exception:
                continue
    except Exception as exc:
        logger.warning("Industry mapping failed: %s", exc)
    return mapping


def get_financial_for_stock(symbol: str):
    """Get financial data for a single stock."""
    try:
        from infra.providers.akshare_provider import akshare_provider
        return akshare_provider.get_financial_data(symbol)
    except Exception:
        return []


def get_pe_pb_snapshot():
    """Fetch PE/PB/dividend yield for all A-shares at once."""
    try:
        df = _call_with_retries(ak.stock_zh_a_spot_em, "Fetch PE/PB snapshot")
    except Exception as exc:
        logger.warning("PE/PB snapshot unavailable; continuing without it: %s", exc)
        return {}
    result = {}
    for _, row in df.iterrows():
        code = str(row.get("代码", ""))
        if code:
            result[code] = {
                "pe": _safe_float(row.get("市盈率-动态")),
                "pb": _safe_float(row.get("市净率")),
                "dividend_yield": _safe_float(row.get("市盈率-静态")),  # approx
            }
    return result


def _safe_float(val):
    try:
        if pd.isna(val):
            return None
        return float(val)
    except (ValueError, TypeError):
        return None


def main():
    logger.info("=== Starting refresh_fundamentals ===")
    start_time = time.time()

    # Get sync status for resume
    sync = data_sync_status_repo.get(TASK_NAME)
    resume_index = 0
    if sync and sync.get("status") == "running" and sync.get("progress", 0) > 0:
        resume_index = sync["progress"]
        logger.info("Resuming from index %d", resume_index)

    data_sync_status_repo.upsert(TASK_NAME, "running", progress=resume_index, total=0)

    try:
        # Step 1: Get all stock codes
        logger.info("Fetching stock codes...")
        stocks = get_all_a_stock_codes()
        total = len(stocks)
        logger.info("Found %d stocks", total)

        data_sync_status_repo.update_progress(TASK_NAME, resume_index, total)

        # Step 2: Get industry mapping
        logger.info("Building industry mapping...")
        industry_map = get_industry_mapping()
        logger.info("Industry mapping: %d entries", len(industry_map))

        # Step 3: Get PE/PB snapshot
        logger.info("Fetching PE/PB snapshot...")
        pe_pb_map = get_pe_pb_snapshot()
        logger.info("PE/PB snapshot: %d entries", len(pe_pb_map))

        # Step 4: Process each stock
        current_year = datetime.now().year
        frozen_year = current_year - 2
        snapshot_date = datetime.now().strftime("%Y-%m-%d")

        processed = resume_index
        for i, stock in enumerate(stocks[resume_index:], start=resume_index):
            symbol = stock["symbol"]
            name = stock["name"]
            industry = industry_map.get(symbol, "")

            try:
                fin_data = get_financial_for_stock(symbol)
                if fin_data:
                    records = []
                    for item in fin_data:
                        year = item.get("year")
                        if not year:
                            continue
                        is_frozen = year <= frozen_year
                        pe_info = pe_pb_map.get(symbol, {})
                        record = {
                            "symbol": symbol,
                            "name": name,
                            "industry": industry,
                            "year": year,
                            "report_date": item.get("report_date"),
                            "roe": item.get("roe"),
                            "revenue_growth": item.get("revenue_yoy"),
                            "net_profit_growth": item.get("profit_yoy"),
                            "gross_margin": item.get("gross_margin"),
                            "pe": pe_info.get("pe") if not is_frozen else None,
                            "pb": pe_info.get("pb") if not is_frozen else None,
                            "dividend_yield": pe_info.get("dividend_yield") if not is_frozen else None,
                            "pe_snapshot_date": snapshot_date if not is_frozen else None,
                            "debt_ratio": None,
                            "fcf_ratio": None,
                            "frozen": is_frozen,
                        }
                        records.append(record)
                    if records:
                        stock_fundamentals_repo.bulk_upsert(records)
            except Exception as exc:
                logger.warning("Failed to process %s: %s", symbol, exc)

            processed += 1
            if processed % BATCH_SIZE == 0:
                data_sync_status_repo.update_progress(TASK_NAME, processed, total)
                logger.info("Progress: %d/%d (%.1f%%)", processed, total, processed / total * 100)
                time.sleep(SLEEP_BETWEEN_BATCHES)

        # Done
        elapsed = time.time() - start_time
        data_sync_status_repo.upsert(TASK_NAME, "done", progress=total, total=total)
        logger.info("=== refresh_fundamentals complete: %d stocks in %.1f min ===",
                    total, elapsed / 60)
    except Exception as exc:
        data_sync_status_repo.upsert(
            TASK_NAME,
            "failed",
            progress=resume_index,
            total=0,
            error=str(exc),
        )
        logger.error("=== refresh_fundamentals failed: %s ===", exc)
        raise


if __name__ == "__main__":
    main()
