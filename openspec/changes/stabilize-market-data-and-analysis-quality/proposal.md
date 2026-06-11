## Why

The current investment-analysis data path depends on live AKShare/yfinance calls, short in-process TTL caches, and thin AI prompts, which makes user-facing APIs unstable and produces low-evidence research, industry, company competitiveness, and financial analysis. This change creates a production-oriented data foundation so slow-changing facts are persisted, external provider failures degrade gracefully, and AI output is grounded in structured evidence.

## What Changes

- Introduce provider governance for market data, including primary/backup providers, freshness metadata, fallback behavior, and observable provider failures.
- Introduce lifecycle-aware caching and persistence for stock identity, company profile, historical prices, financial reports, research reports, and AI analysis outputs.
- Replace request-time scraping/generation for non-real-time data with scheduled ingestion and durable snapshots.
- Introduce evidence-driven analysis inputs: structured financial metrics, peer comparisons, research report text/metadata, source attribution, and analysis versioning.
- Keep existing API routes stable where possible while enriching responses with freshness/source metadata.
- No breaking API changes are planned for the first implementation phase.

## Capabilities

### New Capabilities

- `market-data-resilience`: Defines how external market/financial data providers are selected, retried, degraded, and reported to callers.
- `data-lifecycle-cache`: Defines persistence, TTL, refresh, invalidation, and snapshot behavior by data type.
- `evidence-based-analysis`: Defines the evidence requirements for research summaries, industry analysis, company competitiveness analysis, and financial analysis.

### Modified Capabilities

- None.

## Impact

- Backend services: `backend/services/stock_service.py`, `backend/services/market_service.py`, `backend/services/ai_service.py`.
- Backend providers: `backend/infra/providers/akshare_provider.py`, `backend/infra/providers/yfinance_provider.py`, and new provider orchestration/ingestion modules.
- Backend repositories: `backend/infra/repositories/stock_repo.py` schema and access methods for durable snapshots, provider metadata, research documents, and analysis cache.
- Configuration: new provider, TTL, refresh-window, timeout, and fallback settings in `backend/config.py`.
- API responses: optional metadata such as `source`, `as_of`, `freshness`, `is_stale`, and `data_version`.
- Tests: unit tests for cache policy/provider fallback, integration tests for stale snapshot degradation and evidence-backed analysis responses.
