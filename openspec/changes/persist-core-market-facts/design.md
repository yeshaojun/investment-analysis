## Context

The backend is a Flask modular monolith with SQLite storage, provider adapters for AKShare/yfinance, and an in-process TTL cache. Some tables already exist for financial data and historical prices, but read paths still depend on provider calls first, financial provider results are not consistently persisted, A-share financial periods are hardcoded, and provider failure can return fabricated zero-value placeholders.

This change intentionally keeps the current stack. It creates the first durable fact-store loop before later work on provider fallback, research report evidence, or structured AI outputs.

## Goals / Non-Goals

**Goals:**

- Persist core market facts for tracked symbols and provider-fetched user requests.
- Read local durable facts before calling external providers for slow-changing and historical data.
- Add source/freshness/version metadata needed for later evidence-based analysis.
- Preserve null for unknown financial fields instead of converting unknown values to `0`.
- Return stale local snapshots or explicit unavailable responses instead of fabricated stock values.
- Add idempotent ingestion scripts that can be run manually or by cron.

**Non-Goals:**

- Migrating SQLite to PostgreSQL.
- Introducing Celery, APScheduler, Redis, or a long-running background worker.
- Building a generic provider plugin/registry framework.
- Downloading research report PDFs or extracting report text.
- Redesigning frontend UI for data quality badges.
- Producing new AI analysis formats.

## Decisions

1. Continue using SQLite for the first fact-store change.

   The immediate risk is missing persistence and metadata, not database capacity. Repository methods will keep SQL contained so a future PostgreSQL migration remains possible. Alternative considered: migrate now to PostgreSQL. That would increase setup and migration work before the data model is proven.

2. Extend existing tables first, rather than replacing financial data with period/metric tables.

   The current API and frontend expect a row-shaped financial object. This change adds metadata and key three-statement fields to `financial_data` while avoiding a full metric/EAV model. A future change can split the table once the needed metrics stabilize.

3. Use local-first reads for financial data and historical daily prices.

   Provider calls should fill gaps or refresh stale data, not be the default every time. For this phase, stock info may still refresh from providers, but successful provider results must be saved as snapshots and failure must not fabricate zeros.

4. Add `tracked_symbols` as the ingestion scope.

   Search history and tracked ingestion scope remain separate. Scripts default to `enabled=true` tracked symbols, with optional symbol-specific execution for manual testing.

5. Use scripts instead of a scheduler.

   Ingestion entry points will be idempotent and cron-compatible. Operational scheduling is intentionally left outside this change.

6. Keep stale/unavailable behavior compatible with current routes.

   When possible, return `200` with `available: false` or `is_stale: true` metadata rather than forcing immediate frontend error-flow changes. Later changes can tighten API status semantics.

## Risks / Trade-offs

- Existing data may lack new columns -> Use additive migrations/defaults and repository methods that tolerate null metadata.
- Returning `available: false` with HTTP 200 may be semantically weaker than 503 -> Chosen for compatibility in the first phase; can be refined later.
- Extending `financial_data` delays a cleaner metric schema -> Acceptable for first closure, but new metadata fields must avoid pretending 0 means unknown.
- SQLite write contention may appear during broad ingestion -> Limit ingestion to `tracked_symbols` and keep scripts idempotent.
- Provider data may contain partial fields -> Persist null for unknown values and record source metadata so later analysis can detect missing inputs.

## Migration Plan

1. Add missing columns/tables with additive schema initialization in the repository.
2. Add repository read/upsert methods for tracked symbols, stock info snapshots, financial rows, and history rows.
3. Update services to prefer local data for financial and history reads.
4. Update provider normalization to preserve nulls for missing financial facts.
5. Add ingestion scripts and run them against a small tracked-symbol set.
6. Add tests for local-first behavior, idempotency, stale/unavailable behavior, and null handling.
