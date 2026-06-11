## Why

The current backend calls external providers directly for core market facts and only uses short-lived in-process cache, so provider instability can produce empty responses or fabricated zero-value placeholders. Persisting core facts first creates a reproducible data foundation for later provider fallback, research evidence ingestion, and AI analysis improvements.

## What Changes

- Persist core stock facts in SQLite: tracked symbols, stock identity snapshots, financial data, and daily historical prices.
- Prefer durable local data before external provider calls for slow-changing or historical datasets.
- Add source, timestamp, version, and freshness metadata to persisted facts.
- Replace fabricated zero-value stock placeholders with stale snapshots when available or explicit unavailable responses when not.
- Generate A-share financial reporting periods dynamically instead of using hardcoded dates.
- Add cron/manual compatible ingestion scripts scoped by `tracked_symbols`.
- Keep frontend/API compatibility by adding optional metadata fields rather than removing current route shapes.

## Capabilities

### New Capabilities

- `core-market-fact-store`: Defines durable storage, local-first reads, metadata, tracked-symbol ingestion scope, and unavailable/stale behavior for core market facts.

### Modified Capabilities

- None.

## Impact

- Backend repository schema and methods in `backend/infra/repositories/stock_repo.py`.
- Backend stock service read/write paths in `backend/services/stock_service.py`.
- AKShare financial period generation in `backend/infra/providers/akshare_provider.py`.
- New ingestion script entry points under `backend/scripts/`.
- Response schemas/types may receive optional metadata: `source`, `as_of`, `data_version`, `is_stale`, and `available`.
- Tests for repository upsert, local-first reads, provider failure behavior, financial period generation, ingestion idempotency, and null-versus-zero handling.
