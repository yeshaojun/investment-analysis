## 1. Repository Schema And Access

- [x] 1.1 Add additive schema initialization for `tracked_symbols` with symbol, market, name, priority, enabled, reason, created_at, and updated_at.
- [x] 1.2 Add stock information snapshot persistence fields/methods, including source, as_of, data_version, available, and updated_at metadata.
- [x] 1.3 Extend `financial_data` with report_date, announced_at, period_type, currency, source, data_version, is_restated, and key three-statement fields.
- [x] 1.4 Extend `stock_history` with interval, adjust_type, source, amount, and updated_at metadata using an idempotent unique key.
- [x] 1.5 Add repository methods for tracked-symbol CRUD/listing, local financial reads, financial upserts, local history reads, history upserts, and stock snapshot fallback.

## 2. Provider Normalization

- [x] 2.1 Replace hardcoded A-share financial reporting dates with a generated period list based on current date and configured lookback.
- [x] 2.2 Normalize provider financial data so missing values remain null instead of being converted to `0`.
- [x] 2.3 Add source, period_type, currency, report_date, announced_at when provider data can supply or infer them.
- [x] 2.4 Add interval, adjust_type, source, amount, and normalized `YYYY-MM-DD` date values to historical price provider results.

## 3. Service Read Paths

- [x] 3.1 Update `get_financial_data` to read durable local facts first and call providers only when local facts are missing or stale by policy.
- [x] 3.2 Persist successful financial provider results before returning them.
- [x] 3.3 Update `get_stock_history` to read durable local daily data first for available ranges and persist successful provider results with metadata.
- [x] 3.4 Persist successful stock info provider results as snapshots.
- [x] 3.5 Replace fabricated zero-value stock info fallback with stale snapshot return or explicit `available: false` response.

## 4. Ingestion Scripts

- [x] 4.1 Add a script entry point for adding/listing enabled tracked symbols or seed a minimal tracked-symbol list through repository methods.
- [x] 4.2 Add cron/manual compatible financial ingestion for one symbol and for all enabled tracked symbols.
- [x] 4.3 Add cron/manual compatible historical daily price ingestion for one symbol and for all enabled tracked symbols.
- [x] 4.4 Ensure ingestion scripts are idempotent and preserve last successful facts on provider failure.
- [x] 4.5 Document script usage and dry-run behavior in a backend README or script help output.

## 5. API And Frontend Compatibility

- [x] 5.1 Keep existing stock, financial, and history route shapes compatible while allowing optional source/freshness/version fields.
- [x] 5.2 Update backend schemas/tests to tolerate `available`, `source`, `as_of`, `data_version`, and `is_stale` metadata.
- [x] 5.3 Update frontend TypeScript types to accept optional metadata without requiring UI redesign.
- [x] 5.4 Ensure frontend cache behavior does not hide unavailable/stale metadata during manual mutate/refresh.

## 6. Verification

- [x] 6.1 Add repository tests for tracked symbols, financial upsert idempotency, history upsert idempotency, and snapshot fallback reads.
- [x] 6.2 Add provider tests for generated financial periods and null-preserving normalization.
- [x] 6.3 Add service tests for financial local-first reads, provider fetch persistence, and provider failure returning stale/unavailable instead of zero placeholders.
- [x] 6.4 Add integration tests for existing Flask routes with optional metadata fields.
- [x] 6.5 Run backend tests and frontend type-check/tests relevant to changed response types.
