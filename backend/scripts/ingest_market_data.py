"""
Manual/cron-compatible ingestion for core market facts.

Examples:
    python scripts/ingest_market_data.py track 600519 --name 贵州茅台 --market A股
    python scripts/ingest_market_data.py list
    python scripts/ingest_market_data.py financials --symbol 600519 --dry-run
    python scripts/ingest_market_data.py history --all
"""

import argparse
import logging
import os
import sys
from typing import Iterable, List

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from infra.repositories.stock_repo import stock_repo  # noqa: E402
from services.stock_service import stock_service  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _symbols(args: argparse.Namespace) -> List[str]:
    if args.symbol:
        return [args.symbol]
    tracked = stock_repo.get_tracked_symbols(enabled_only=True)
    return [row["symbol"] for row in tracked]


def _run_for_symbols(symbols: Iterable[str], action, dry_run: bool) -> None:
    for symbol in symbols:
        if dry_run:
            logger.info("dry-run would ingest %s", symbol)
            continue
        try:
            action(symbol)
            logger.info("ingested %s", symbol)
        except Exception as exc:
            logger.error("ingestion failed for %s: %s", symbol, exc)


def cmd_track(args: argparse.Namespace) -> None:
    stock_repo.upsert_tracked_symbol({
        "symbol": args.symbol,
        "market": args.market or "",
        "name": args.name or args.symbol,
        "priority": args.priority,
        "enabled": not args.disabled,
        "reason": args.reason,
    })
    logger.info("tracked symbol saved: %s", args.symbol)


def cmd_list(_: argparse.Namespace) -> None:
    for row in stock_repo.get_tracked_symbols(enabled_only=False):
        enabled = "enabled" if row["enabled"] else "disabled"
        print(f"{row['symbol']}\t{row.get('market') or ''}\t{row.get('name') or ''}\t{enabled}")


def cmd_financials(args: argparse.Namespace) -> None:
    symbols = _symbols(args)
    _run_for_symbols(symbols, stock_service.get_financial_data, args.dry_run)


def cmd_history(args: argparse.Namespace) -> None:
    symbols = _symbols(args)

    def ingest(symbol: str) -> None:
        stock_service.get_stock_history(
            symbol, period=args.period, interval=args.interval, include_indicators=False
        )

    _run_for_symbols(symbols, ingest, args.dry_run)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Ingest durable core market facts.")
    sub = parser.add_subparsers(dest="command", required=True)

    track = sub.add_parser("track", help="Add or update a tracked symbol.")
    track.add_argument("symbol")
    track.add_argument("--market", default="")
    track.add_argument("--name", default="")
    track.add_argument("--priority", type=int, default=2)
    track.add_argument("--reason", default="manual")
    track.add_argument("--disabled", action="store_true")
    track.set_defaults(func=cmd_track)

    list_cmd = sub.add_parser("list", help="List tracked symbols.")
    list_cmd.set_defaults(func=cmd_list)

    for name, help_text, func in [
        ("financials", "Ingest financial facts.", cmd_financials),
        ("history", "Ingest historical daily prices.", cmd_history),
    ]:
        cmd = sub.add_parser(name, help=help_text)
        cmd.add_argument("--symbol", help="Run for one symbol instead of tracked symbols.")
        cmd.add_argument("--all", action="store_true", help="Run for all enabled tracked symbols.")
        cmd.add_argument("--dry-run", action="store_true")
        if name == "history":
            cmd.add_argument("--period", default="1y")
            cmd.add_argument("--interval", default="1d")
        cmd.set_defaults(func=func)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if getattr(args, "command", "") in {"financials", "history"} and not args.symbol and not args.all:
        parser.error("pass --symbol <symbol> or --all")
    args.func(args)


if __name__ == "__main__":
    main()
