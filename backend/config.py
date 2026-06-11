"""
Unified configuration — all settings loaded from environment variables.
Never import this in domain logic; inject values through constructors.
"""

import os
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# ---------------------------------------------------------------------------
# AI providers
# ---------------------------------------------------------------------------
AI_DEFAULT_PROVIDER: str = os.getenv("AI_DEFAULT_PROVIDER", "deepseek").lower()

AI_API_KEY: str = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY", ""))
AI_BASE_URL: str = os.getenv("AI_BASE_URL", os.getenv("OPENAI_BASE_URL", "")).rstrip("/")
AI_MODEL_NAME: str = os.getenv(
    "AI_MODEL_NAME",
    os.getenv("MODEL_NAME", os.getenv("AI_MODEL", "")),
)

DEEPSEEK_API_KEY: str = os.getenv(
    "DEEPSEEK_API_KEY",
    os.getenv("deepseek_api_key", os.getenv("deepseek", AI_API_KEY)),
)
DEEPSEEK_BASE_URL: str = os.getenv(
    "DEEPSEEK_BASE_URL",
    os.getenv("deepseek_base_url", AI_BASE_URL or "https://api.deepseek.com"),
).rstrip("/")
DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", AI_MODEL_NAME or "deepseek-chat")

QWEN_API_KEY: str = os.getenv("QWEN_API_KEY", os.getenv("qwen_api_key", os.getenv("qw", AI_API_KEY)))
QWEN_BASE_URL: str = os.getenv(
    "QWEN_BASE_URL",
    os.getenv("qw_base_url", AI_BASE_URL or "https://dashscope.aliyuncs.com/compatible-mode/v1"),
).rstrip("/")
QWEN_MODEL: str = os.getenv("QWEN_MODEL", AI_MODEL_NAME or "qwen-plus")

AI_TIMEOUT: float = float(os.getenv("AI_TIMEOUT", "60"))
AI_MAX_TOKENS: int = int(os.getenv("AI_MAX_TOKENS", "4000"))
AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.7"))

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DB_PATH: str = os.getenv(
    "DB_PATH",
    os.path.join(BACKEND_DIR, "..", "data", "database", "stocks.db"),
)

# ---------------------------------------------------------------------------
# Cache TTLs (seconds)
# ---------------------------------------------------------------------------
TTL_STOCK_INFO: int = int(os.getenv("TTL_STOCK_INFO", "300"))
TTL_STOCK_HISTORY: int = int(os.getenv("TTL_STOCK_HISTORY", "300"))
TTL_FINANCIAL_DATA: int = int(os.getenv("TTL_FINANCIAL_DATA", "600"))
TTL_MARKET_DATA: int = int(os.getenv("TTL_MARKET_DATA", "60"))
TTL_NEWS_DATA: int = int(os.getenv("TTL_NEWS_DATA", "300"))
TTL_INDUSTRY_DATA: int = int(os.getenv("TTL_INDUSTRY_DATA", "300"))
TTL_STOCK_LIST: int = int(os.getenv("TTL_STOCK_LIST", "86400"))
FINANCIAL_LOOKBACK_YEARS: int = int(os.getenv("FINANCIAL_LOOKBACK_YEARS", "3"))
FINANCIAL_MAX_PERIODS: int = int(os.getenv("FINANCIAL_MAX_PERIODS", "12"))
ENRICH_FINANCIAL_PRICE_YOY: bool = os.getenv("ENRICH_FINANCIAL_PRICE_YOY", "false").lower() == "true"

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
PORT: int = int(os.getenv("PORT", "5000"))
DEBUG: bool = os.getenv("FLASK_DEBUG", "true").lower() == "true"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_DIR: str = os.getenv(
    "LOG_DIR",
    os.path.join(BACKEND_DIR, "..", "data", "logs"),
)
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
