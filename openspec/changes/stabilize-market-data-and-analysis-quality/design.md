## Context

The backend currently serves investment data through request-time provider calls and short-lived in-process cache. AKShare is used for A/HK market data, yfinance is used as fallback and for US data, and AI analysis is generated from thin financial summaries plus limited web search or research-report metadata. SQLite already stores some historical and financial tables, but read paths do not consistently prefer durable snapshots, financial data is not persisted on fetch, and provider/cache freshness is not exposed to callers.

This design keeps the current modular monolith and Flask API shape, while introducing provider orchestration, durable snapshots, lifecycle-aware cache policy, and evidence-oriented analysis inputs. It avoids a large framework migration in this change.

## Goals / Non-Goals

**Goals:**

- Make external provider instability visible and non-fatal by using fallback providers and stale-but-labeled local snapshots.
- Persist slow-changing data and use refresh policies aligned to each data type's real update cadence.
- Remove hardcoded financial reporting periods from online request paths.
- Improve AI analysis quality by requiring structured evidence, source attribution, data versions, and prompt/model versioning.
- Preserve current frontend API contracts while allowing additional metadata fields.

**Non-Goals:**

- Migrating Flask to FastAPI or SQLite to PostgreSQL in this change.
- Purchasing or integrating a paid vendor as the only supported data source.
- Building a full crawler platform with distributed scheduling, proxy pools, or anti-bot bypass.
- Providing trading advice guarantees or regulatory-grade analyst reports.

## Decisions

1. Add a provider orchestration layer instead of replacing AKShare/yfinance directly.

   Rationale: AKShare and yfinance remain useful free sources, but callers should not depend on their live availability or field stability. A provider registry can define supported data domains, priority, timeout, retry, fallback, and normalization. Alternative considered: replace AKShare with one vendor immediately. That would improve some stability but increase coupling and cost before the data contracts are clear.

2. Treat local database snapshots as the source of truth for slow-changing facts.

   Rationale: stock identity, financial reports, historical daily bars, research metadata, and generated analyses should be durable and versioned. Online requests should read from snapshots first, then trigger or perform bounded refresh only when data is missing or stale. Alternative considered: increase in-memory TTLs only. That does not survive restarts, multi-worker deployments, or upstream outages.

3. Use explicit data lifecycle policies per data domain.

   Rationale: real-time quotes, daily bars, stock identity, financial reports, research reports, and AI analysis have different freshness requirements. A single TTL model creates either stale market data or unnecessary pressure on stable data. Policies belong in configuration and service-level code, not scattered constants.

4. Make crawler-like work asynchronous and evidence-preserving.

   Rationale: downloading research PDFs, extracting text, and indexing content are slow and failure-prone. They should run through scheduled ingestion jobs and persist source URL, institution, publication date, extraction status, and content hash. Online analysis can then consume stable evidence. Alternative considered: scrape PDFs during `/ai/research-summary`. That would create high latency and brittle user-facing failures.

5. Version AI analysis results by evidence snapshot and prompt/model versions.

   Rationale: AI output should be cacheable but invalidated when financials, research evidence, prompt template, or model changes. The cache key must include these versions instead of only `symbol`.

## Risks / Trade-offs

- Provider normalized fields may be incomplete across markets -> Add source-specific raw payload storage or source metadata for debugging, and expose missing fields as null rather than fabricated values.
- Stale snapshot fallback can hide upstream failure -> Always include `is_stale`, `as_of`, `source`, and log provider failures with metrics.
- More persistence increases schema complexity -> Add repository methods behind existing service boundaries and keep SQL contained in `infra/repositories`.
- AI quality still depends on evidence quality -> Gate analysis generation on minimum evidence thresholds and return explicit insufficient-data responses when evidence is missing.
- Scheduled ingestion may need operational tooling later -> Start with CLI/script entry points and simple cron-compatible jobs before adding a full task queue.

## Migration Plan

1. Add schema fields/tables for provider snapshots, data versioning, research documents, and analysis cache without removing existing tables.
2. Implement provider registry and cache policy helpers behind existing services.
3. Update read paths to prefer durable snapshots, fallback to providers, then stale snapshots.
4. Add ingestion scripts for stock list, financial reports, daily history, and research reports.
5. Update AI service to consume structured evidence and analysis cache.
6. Backfill existing popular symbols opportunistically.
7. Rollback by disabling the new provider orchestration flags and returning to direct provider calls; retained tables are additive.
