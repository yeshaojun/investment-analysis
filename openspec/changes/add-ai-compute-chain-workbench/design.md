## Context

The current application is a single-company investment analysis tool. It already has stock search, stock info, financial data, charting, broker research summary, and AI investment-value analysis. These features are useful for understanding one company, but they do not model how a company participates in a broader value chain or how external events propagate through related nodes.

The AI compute chain is a suitable MVP because it has clear structural nodes, public company examples, frequent catalyst events, and financial signals that can be validated with the existing financial-data service. The first release should favor a curated, inspectable chain model over fully automated graph construction.

## Goals / Non-Goals

**Goals:**

- Add a focused AI compute chain workbench that represents L1/L2 chain nodes, representative companies, relationship paths, evidence, relationship status, staleness, and confidence bands.
- Reuse existing stock search, financial data, and AI provider infrastructure.
- Provide company-level chain positioning from stock code/company name to node role, evidence, upstream/downstream exposure, and financial validation.
- Provide event impact analysis from a user-provided event text to affected nodes, propagated paths, related exposed companies, direction, strength band, and fundamental validation signals.
- Keep outputs structured and evidence-aware so frontend views do not depend on parsing free-form AI text.

**Non-Goals:**

- Do not build an all-market industry graph in the first release.
- Do not add buy/sell recommendations or automatic portfolio actions.
- Do not use LLMs to generate financial facts.
- Do not require Neo4j or another graph database for MVP.
- Do not require fully automated relationship extraction before the curated MVP is useful.
- Do not build a review backend in this change.
- Do not output precise impact scores, investment scores, buy/sell language, or "beneficiary stock" rankings.

## Decisions

### Decision 1: Start with curated seed data, not automated graph construction

The first implementation will ship curated AI compute chain seed data under backend-owned data files. The seed will be split into table-shaped files such as `chain_nodes.json`, `company_master.json`, `company_node_exposures.json`, `chain_edges.json`, `event_rules.json`, and `evidence.json`.

All seed records must use stable IDs and include `chain_id` where applicable. The AI compute product can be the first visible chain, but the service and data model must not assume it is the only future chain.

Rationale: The current project does not yet have a document ingestion, chunking, candidate relation, or review pipeline. A curated seed lets the product deliver useful chain navigation and event analysis quickly while leaving room for later AI-assisted extraction.

Alternatives considered:

- Fully automate graph extraction from reports first. Rejected for MVP because it requires document storage, chunking, entity resolution, review workflow, and quality controls before users see value.
- Add a graph database immediately. Rejected because the MVP graph is small and path traversal can be implemented from JSON/SQLite data.
- Store everything in one nested seed file. Rejected because it would become a second database with poor diffing, migration, validation, and auditability.

### Decision 2: Govern relationships before using them

Formal chain traversal will only use `verified` and `curated` relationships. AI-generated relationships must remain `candidate` until reviewed in a future change. Relationship evidence is tiered as `primary_fact`, `secondary_fact`, `broker_opinion`, `news_event`, `manual_seed`, or `llm_candidate`.

Broker research is useful for explanation, but it must not by itself promote a company-node relationship to `verified`. Relationships must also include lifecycle fields such as `evidence_as_of`, `last_seen_date`, `staleness_status`, and `review_required_after`.

Rationale: The biggest risk is a graph full of stale or model-inferred claims that users mistake for facts.

Alternatives considered:

- Allow AI extraction to directly write graph edges. Rejected because it would make relation quality impossible to audit.
- Treat all evidence sources equally. Rejected because a broker opinion is not the same as a company filing.

### Decision 3: Keep chain APIs structured and deterministic

Backend APIs will return typed JSON for nodes, companies, relations, evidence, fundamental validation, and event impact paths. AI can classify event text and generate narrative explanations, but core fields must come from deterministic rules and stored chain data.

Rationale: Existing AI analysis quality has been a pain point. Structured outputs make the frontend predictable and make tests feasible.

Alternatives considered:

- Return an AI-written markdown report only. Rejected because it cannot reliably power graph views, tabs, ranking lists, or evidence panels.

### Decision 4: Use rule-first event propagation with controlled event types

The event impact service will first classify events into controlled event types such as `capex_increase`, `capex_cut`, `gpu_new_generation`, `gpu_supply_constraint`, `liquid_cooling_adoption`, `optical_speed_upgrade`, `raw_material_price_up`, `raw_material_price_down`, `export_restriction`, `domestic_substitution`, and `demand_slowdown`. A deterministic rule map then propagates impacts through chain nodes.

Event rules must support `positive`, `negative`, `mixed`, and `unknown` direction, plus impact level, condition, exclusion, risk factors, time lag, and rationale. The main result is affected nodes and paths. Company results are related exposure records under those paths, not a standalone "beneficiary stock" ranking.

Rationale: Event propagation must be explainable and testable. AI can help translate natural language into an event type, but the propagation path should be inspectable.

Alternatives considered:

- Let the LLM infer all impacted companies directly. Rejected because this would likely produce unverifiable lists and unstable rankings.
- Allow unsupported events to proceed with free-form AI paths. Rejected because unsupported events should return `manual_required` or `unknown`.

### Decision 5: Reuse the existing financial service for fundamental validation

Fundamental validation will call existing financial data access and compute recent-quarter signals such as revenue YoY trend, profit YoY trend, margin direction, cash-flow quality, and availability. It will validate whether operating results are consistent with the chain thesis; it will not validate stock price performance or produce an investment score.

For static company positioning, validation uses the latest available financial history. For event-specific validation, the service must account for `event_date` and rule `time_lag`. If no financial report has been disclosed after the event's observable window starts, the status is `not_yet_observable`, not negative.

Statuses are `not_yet_observable`, `validated`, `partially_validated`, `contradicted`, and `insufficient_data`.

Rationale: The project already has financial data ingestion and display. Reusing it avoids duplicate provider logic and enforces the rule that LLMs do not invent financial facts.

Alternatives considered:

- Add a separate financial validation data source. Deferred until there is evidence that current data quality is insufficient for the MVP.

### Decision 6: Use bands, not precise scores, in user-facing outputs

The MVP will expose `strength_band`, `confidence_band`, `exposure_band`, and `impact_level` rather than precise impact scores. Numeric values can exist internally for sorting, but the UI must not present pseudo-precise impact scores.

Rationale: The MVP has curated rules and limited validation history. Precise decimals would imply calibration that the system does not yet have.

Alternatives considered:

- Show continuous impact scores such as `0.73`. Rejected as false precision for early-stage event propagation.

### Decision 7: Frontend adds one workbench route and one company tab

The frontend will add an AI compute chain page and integrate chain positioning into the existing stock explorer as an additional tab or section. The event impact input can live on the chain page for MVP.

Rationale: Users need a chain-first entry point and a company-first entry point. Adding a new route avoids overloading the stock page, while a company tab connects the new model to existing workflows.

The frontend must preserve uncertainty. It must use terms like related companies, exposed companies, impact paths, evidence strength, validation status, and risk factors. It must not use default language such as beneficiary stocks, buy opportunities, recommended companies, or target price.

### Decision 8: Persist event analysis snapshots

Each event analysis should create a snapshot containing event text, normalized event type, event date, classification confidence band, rules version, chain data version, financial data as-of, result JSON, and created-at time.

Rationale: Event results need to be reproducible, auditable, cacheable, and revalidated later when new financial reports arrive.

## Risks / Trade-offs

- Curated seed data can become stale → Add `evidence_as_of`, `last_seen_date`, `staleness_status`, and `review_required_after`; keep seed to 30-50 companies.
- Relationship evidence may be incomplete in MVP → Mark evidence tier and confidence band explicitly; allow `manual_seed` as a source type instead of pretending all relationships came from documents.
- Event propagation can overstate second-order beneficiaries → Return impact level, strength, and time lag; separate direct from indirect impact.
- Financial validation may be noisy for quarterly data → Use coarse validation labels and show underlying signals instead of a single opaque score.
- AI classification can fail or misclassify events → Provide deterministic fallback keyword rules and return classification confidence.
- Frontend can become crowded again → Use tabs/sections on the chain page and avoid rendering all heavy company analyses by default.
- Company names can drift across seed, finance, events, and evidence → Introduce company master records with stable `company_id`, `symbol`, `exchange`, `canonical_name`, and `aliases`.
- Multi-node companies can pollute every event result → Model company-node exposure as many-to-many with `exposure_band`, `business_scope`, and evidence rather than a single `node_id`.

## Migration Plan

1. Add seed chain data and backend services behind new endpoints without changing existing stock endpoints.
2. Add frontend route and company chain tab consuming the new endpoints.
3. Keep existing financial, research, and AI analysis behavior unchanged.
4. If new APIs fail or data is missing, frontend shows empty states and existing company analysis remains usable.

Rollback is straightforward: remove or disable the new chain route and API blueprint without impacting current stock, financial, research, or AI endpoints.

## Open Questions

- Which exact 30-50 first-batch AI compute companies should be included?
- Which evidence snippets can be added immediately from public primary sources versus marked as `manual_seed` pending source review?
