## 1. Data Model And Configuration

- [ ] 1.1 Add configuration for provider priority, provider timeouts, retry counts, stale snapshot allowance, and per-domain cache policies.
- [ ] 1.2 Extend repository schema for provider snapshots, data versions, source metadata, research documents, and analysis cache.
- [ ] 1.3 Add repository methods to read/write durable snapshots for stock identity, quote snapshots, historical prices, financial reports, research reports, and analysis results.
- [ ] 1.4 Add migration/backfill safeguards so existing SQLite data remains readable.

## 2. Provider Resilience

- [ ] 2.1 Create a provider registry/orchestrator module under `backend/infra/providers` that selects eligible providers by market and data domain.
- [ ] 2.2 Wrap AKShare and yfinance calls with bounded timeout, retry, normalized result validation, and structured provider attempt logging.
- [ ] 2.3 Update stock and market services to call the provider orchestrator instead of directly selecting providers inline.
- [ ] 2.4 Return stale durable snapshots with `is_stale`, `as_of`, and `source` metadata when live providers fail.
- [ ] 2.5 Add unit tests for primary provider success, fallback provider success, empty response fallback, and stale snapshot degradation.

## 3. Lifecycle Cache And Ingestion

- [ ] 3.1 Implement data-domain cache policy helpers for stock identity, quotes, rankings, historical prices, financial reports, research reports, and AI analysis.
- [ ] 3.2 Update financial data reads to prefer durable storage and persist provider results on successful refresh.
- [ ] 3.3 Replace hardcoded A-share financial reporting periods with generated reporting periods based on current date and configured lookback.
- [ ] 3.4 Update historical price reads to use durable storage first and fetch missing ranges where supported.
- [ ] 3.5 Add scheduled ingestion entry points for stock list, historical prices, financial reports, and research reports.
- [ ] 3.6 Add tests for lifecycle TTL decisions, financial snapshot invalidation, and ingestion failure preserving last successful data.

## 4. Evidence-Based Analysis

- [ ] 4.1 Persist research report metadata with deduplication by symbol, title, institution, publication date, and/or content hash.
- [ ] 4.2 Add optional research PDF/text extraction pipeline fields for source URL, extraction status, extracted text, and content hash.
- [ ] 4.3 Build evidence assembly methods that collect financial metrics, market freshness, company identity, research evidence, and peer/industry context for AI service calls.
- [ ] 4.4 Add analysis cache keyed by symbol, analysis type, financial snapshot version, research snapshot version, prompt version, and model.
- [ ] 4.5 Update AI prompts to consume structured evidence and return insufficient-data output when minimum evidence thresholds are not met.
- [ ] 4.6 Include source attribution and evidence freshness metadata in AI analysis responses.
- [ ] 4.7 Add tests for cached analysis reuse, prompt-version invalidation, missing evidence behavior, and source attribution.

## 5. API And Frontend Compatibility

- [ ] 5.1 Keep existing API routes stable while adding optional metadata fields to relevant stock, market, financial, research, and AI responses.
- [ ] 5.2 Update frontend types and components to tolerate and optionally display `source`, `as_of`, `is_stale`, `freshness`, and `data_version`.
- [ ] 5.3 Ensure frontend cache keys do not mask backend evidence-version changes for AI analysis.

## 6. Verification

- [ ] 6.1 Run backend unit and integration tests for stock, market, provider, cache, and AI routes.
- [ ] 6.2 Run frontend type-check and tests after response type updates.
- [ ] 6.3 Manually verify a provider-failure scenario returns stale labeled data instead of fabricated zero-value placeholders.
- [ ] 6.4 Manually verify an AI analysis response includes evidence/source metadata and avoids unsupported claims when evidence is missing.
