## Why

The current product analyzes one company at a time through financial data, research reports, and AI-generated company-level commentary, but it cannot explain how a company fits into an industry chain or how external events propagate across related companies. AI compute is a high-value starting chain because capex, GPU/server demand, optical modules, PCB, liquid cooling, power, and IDC capacity have visible event catalysts and measurable financial signals.

## What Changes

- Add an AI compute industry-chain workbench focused on a curated MVP universe of 30-50 A-share companies and L1/L2 chain nodes.
- Add structured chain data for chain-scoped nodes, representative companies, company positions, relationship paths, evidence, relationship status, staleness, and confidence bands.
- Add company-level chain positioning so a searched stock can show its AI compute node, role, upstream/downstream exposure, evidence, and financial validation signals.
- Add event impact analysis that classifies a user-provided event into a controlled event type, maps it to affected AI compute nodes, propagates impact paths, and lists related exposed companies with evidence and fundamental validation status.
- Add API endpoints and frontend views for AI compute chain overview, company chain position, and event impact analysis.
- Keep the system evidence-first: AI may classify/explain and produce candidate relationships, but it must not directly write formal graph facts; financial facts must come from structured financial data; relationship claims must carry evidence or be marked as curated/manual/candidate.
- Persist event analysis snapshots with rules version, chain data version, financial data as-of, and result JSON so results are reproducible and can be revalidated later.

## Capabilities

### New Capabilities
- `ai-compute-chain-overview`: Provides a structured AI compute chain overview with chain-scoped nodes, representative companies, relationship paths, confidence bands, evidence tier, relationship status, and staleness metadata.
- `company-chain-positioning`: Shows how a company participates in the AI compute chain through many-to-many company-node exposure records, including role, exposure band, upstream/downstream exposure, evidence snippets, and fundamental validation.
- `event-impact-analysis`: Analyzes user-provided AI compute events, maps them to affected nodes, propagates impact paths, and returns related exposed companies with direction, impact level, strength band, time lag, evidence, and validation signals.

### Modified Capabilities

## Impact

- Backend:
  - Add chain domain models and seed data for the AI compute chain.
  - Add services for chain lookup, company positioning, and event impact analysis.
  - Add routes for chain overview, company chain position, and event impact analysis.
  - Reuse existing financial data and AI provider services where possible.
- Frontend:
  - Add an AI compute chain overview page.
  - Add a chain positioning tab or section in the stock analysis experience.
  - Add an event impact analysis input and results view.
- Data:
  - Add curated MVP seed data split into table-shaped files for chain nodes, company master, company-node exposures, chain edges, event rules, and evidence.
  - Use existing SQLite-backed persistence for MVP unless implementation reveals a clear need for a dedicated graph database.
- Non-goals:
  - No automatic buy/sell recommendations.
  - No LLM-generated financial numbers.
  - No broad all-market graph in the first release.
  - No automatic relationship extraction or review backend in this change.
  - No precise user-facing impact scores or investment scores.
