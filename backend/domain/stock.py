"""
Stock domain — market detection, constants.
Pure logic, no I/O, no framework imports.
"""

from enum import Enum
from datetime import datetime, timedelta


class Market(str, Enum):
    A = "A股"
    HK = "港股"
    US = "美股"


class Currency(str, Enum):
    CNY = "CNY"
    HKD = "HKD"
    USD = "USD"


MARKET_CURRENCY: dict[Market, Currency] = {
    Market.A: Currency.CNY,
    Market.HK: Currency.HKD,
    Market.US: Currency.USD,
}

PERIOD_DAYS: dict[str, int] = {
    "1d": 1,
    "5d": 5,
    "1mo": 30,
    "3mo": 90,
    "6mo": 180,
    "1y": 365,
    "2y": 730,
}


def detect_market(symbol: str) -> Market:
    if is_a_stock(symbol):
        return Market.A
    if is_hk_stock(symbol):
        return Market.HK
    return Market.US


def is_a_stock(symbol: str) -> bool:
    return len(symbol) == 6 and symbol.isdigit()


def is_hk_stock(symbol: str) -> bool:
    if symbol.isdigit() and len(symbol) == 5:
        return True
    if "." in symbol and "HK" in symbol.upper():
        return True
    return False


def period_to_start_date(period: str) -> str:
    days = PERIOD_DAYS.get(period, 30)
    start = datetime.now() - timedelta(days=days)
    return start.strftime("%Y%m%d")
