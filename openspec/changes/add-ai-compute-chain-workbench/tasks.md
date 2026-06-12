## 1. Seed Data and Domain Model

- [x] 1.1 Define chain domain types with `chain_id`, stable `company_id`, node_id, edge_id, evidence_id, event_rule_id, status, evidence tier, confidence band, strength band, exposure band, and staleness status enums.
- [x] 1.2 Add table-shaped AI compute seed files for chain nodes, company master, company-node exposures, chain edges, event rules, and evidence.
- [x] 1.3 Limit the MVP seed universe to L1/L2 AI compute nodes and a manually reviewable 30-50 company list.
- [x] 1.4 Add lifecycle fields to company-node exposures and chain edges: evidence_as_of, last_seen_date, staleness_status, review_required_after, effective_from, and effective_to.
- [x] 1.5 Add a seed validation utility that fails on invalid IDs, missing chain_id, unsupported statuses, unsupported evidence tiers, orphan evidence references, or candidate edges used in propagation.
- [x] 1.6 Add unit tests that load the seed data and verify required nodes, companies, exposures, edges, event rules, evidence tiers, and lifecycle fields are present.

## 2. Backend Chain Services and APIs

- [x] 2.1 Implement a chain service that loads table-shaped seed data and returns the AI compute chain overview as structured JSON.
- [x] 2.2 Implement company master lookup by symbol, canonical name, and aliases while using company_id as the relationship key.
- [x] 2.3 Implement company chain positioning lookup with many-to-many node exposures, mapped/unmapped result handling, evidence tier, relationship status, staleness, and exposure band.
- [x] 2.4 Implement fundamental validation for mapped companies using existing financial data service output, without investment scores, target prices, or price-performance validation.
- [x] 2.5 Implement controlled event classification for the MVP event taxonomy with deterministic keyword fallback and `manual_required` for unsupported events.
- [x] 2.6 Implement rule-first event propagation that supports positive, negative, mixed, and conditional impacts, and excludes candidate relationships from default traversal.
- [x] 2.7 Implement event-specific fundamental validation using event_date and time_lag, including `not_yet_observable` when no relevant financial report is available yet.
- [x] 2.8 Persist event analysis snapshots with snapshot_id, event text, normalized event type, event date, classification confidence band, rules version, chain data version, financial data as-of, result JSON, and created-at time.
- [x] 2.9 Add API routes for `GET /api/chains/ai-compute`, `GET /api/stock/<symbol>/chain-position`, `POST /api/events/analyze-impact`, and snapshot retrieval.
- [x] 2.10 Add backend unit and integration tests for overview, seed validation, company positioning, unmapped company behavior, multi-node exposure, event taxonomy, negative/mixed propagation, snapshot persistence, and insufficient/not-yet-observable financial validation.

## 3. Frontend Workbench

- [x] 3.1 Add frontend API route constants, types, and client helpers for chain overview, company chain position, event impact analysis, and snapshot retrieval.
- [x] 3.2 Add an AI compute chain workbench page that displays L1/L2 nodes, representative companies, relationship paths, evidence tier, relationship status, staleness, and empty/error states.
- [x] 3.3 Add event impact input and result sections showing event type, classification confidence band, affected nodes, impact paths, related exposed companies, conditions, risk factors, evidence state, validation status, and uncertainty.
- [x] 3.4 Add company chain positioning view to the existing stock analysis experience without loading all heavy analysis components by default.
- [x] 3.5 Add navigation from representative companies in the chain page to the stock analysis experience.
- [x] 3.6 Enforce neutral UI language: related companies, exposed companies, impact paths, evidence strength, and validation status; avoid beneficiary stock, buy opportunity, recommended company, target price, and certain winner language.
- [x] 3.7 Add frontend tests for the chain page, event submission flow, mapped company view, unmapped company state, uncertainty rendering, and absence of prohibited recommendation language.

## 4. Quality, Observability, and Documentation

- [x] 4.1 Add logging around seed loading, seed validation, chain overview loading, company positioning lookup, event classification, impact propagation, snapshot creation, and validation status calculation.
- [x] 4.2 Document seed data maintenance rules, evidence tiers, relationship statuses, staleness rules, and the rule that financial facts must come from structured financial data, not LLM output.
- [x] 4.3 Document that automatic relationship extraction and a review backend are deferred to a future change.
- [x] 4.4 Run OpenSpec validation, backend tests, frontend tests, lint, and type-check.
- [x] 4.5 Manually verify the AI compute chain page, event impact view, and company chain tab in the local frontend.
