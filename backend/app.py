"""
Flask application entry point.

Responsibilities:
  - Configure logging
  - Register blueprints
  - Expose health-check and cache-management endpoints
"""

import logging
import os

from flask import Flask
from flask_cors import CORS

import config
from api.routes.stock import stock_bp
from api.routes.market import market_bp
from infra.cache import cache
from api.response import server_error_response, success_response

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

os.makedirs(config.LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.DEBUG),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(config.LOG_DIR, "api_debug.log")),
    ],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)

app.register_blueprint(stock_bp)
app.register_blueprint(market_bp)


# ---------------------------------------------------------------------------
# Health & cache
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    return success_response(data={"status": "ok"}, message="Stock Query API is running")


@app.route("/api/cache/clear", methods=["POST"])
def clear_cache():
    try:
        cache.clear()
        logger.info("cache cleared")
        return success_response(message="缓存已清除")
    except Exception as exc:
        logger.error("clear_cache: %s", exc)
        return server_error_response(str(exc))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=config.DEBUG, host="0.0.0.0", port=config.PORT)
