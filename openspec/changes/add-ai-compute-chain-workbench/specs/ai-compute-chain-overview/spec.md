## ADDED Requirements

### Requirement: AI compute chain overview API
The system SHALL provide an API that returns the AI compute industry-chain overview as structured JSON, including chain metadata, L1/L2 nodes, representative companies, relationship paths, evidence metadata, confidence bands, status, staleness, and last-updated information.

#### Scenario: Retrieve AI compute chain overview
- **WHEN** a client requests the AI compute chain overview
- **THEN** the system returns nodes for the curated AI compute chain and representative companies grouped under their nodes

#### Scenario: Include relationship path metadata
- **WHEN** the overview contains relationships between chain nodes
- **THEN** each relationship includes chain_id, source node, target node, direction, impact level, strength band, confidence band, time lag, status, staleness status, and evidence metadata

#### Scenario: No free-form-only overview response
- **WHEN** the overview API returns successfully
- **THEN** the response includes structured node, company, exposure, edge, and evidence arrays rather than only a markdown or natural-language report

### Requirement: Table-shaped seed data
The system SHALL ship curated AI compute MVP seed data as table-shaped records with stable IDs, chain_id, and no deep business nesting.

#### Scenario: Seed files are loaded
- **WHEN** the backend starts or the chain service is initialized
- **THEN** the AI compute chain seed data is available to the overview API without requiring external network calls

#### Scenario: Seed universe is bounded
- **WHEN** the AI compute seed data is loaded for MVP
- **THEN** it contains only L1/L2 nodes and a curated company universe sized for manual review, targeting 30-50 companies

#### Scenario: Seed entities include governance fields
- **WHEN** a seeded node, company exposure, edge, event rule, or evidence record is returned
- **THEN** it includes stable ID, source or evidence reference, status, confidence band, updated-at, and staleness metadata where applicable

#### Scenario: Seed validation catches invalid references
- **WHEN** the seed validation task runs
- **THEN** it fails on missing company_id, node_id, evidence_id, chain_id, unsupported status, or unsupported evidence tier references

### Requirement: Relationship governance
The system SHALL distinguish formal usable relationships from candidate relationships and SHALL NOT use candidate relationships for default chain traversal.

#### Scenario: Formal traversal excludes candidates
- **WHEN** the overview service builds chain paths
- **THEN** it uses only `verified` and `curated` relationships by default

#### Scenario: Evidence tier is explicit
- **WHEN** a relationship claim is returned
- **THEN** the response includes an evidence tier such as `primary_fact`, `secondary_fact`, `broker_opinion`, `news_event`, `manual_seed`, or `llm_candidate`

#### Scenario: Broker opinion does not verify relation by itself
- **WHEN** a relationship only has broker opinion evidence
- **THEN** the system does not mark it as `verified`

#### Scenario: Stale relationships are visible
- **WHEN** a relationship has aging or stale evidence
- **THEN** the API includes staleness status and evidence-as-of metadata

### Requirement: Chain overview frontend
The frontend SHALL provide an AI compute chain workbench page that visualizes the chain overview and lets users inspect nodes, representative companies, evidence, relationship status, and uncertainty.

#### Scenario: View AI compute chain page
- **WHEN** a user opens the AI compute chain page
- **THEN** the page displays chain nodes and representative companies in a layout suitable for scanning

#### Scenario: Inspect node companies
- **WHEN** a user selects or expands a chain node
- **THEN** the page shows representative companies, roles, exposure bands, confidence bands, and validation status for that node

#### Scenario: Preserve evidence uncertainty
- **WHEN** the page displays a relationship or company exposure
- **THEN** it shows evidence tier, relationship status, and staleness when available

#### Scenario: Handle missing overview data
- **WHEN** the chain overview API returns no data or an error
- **THEN** the frontend shows a clear empty or error state without breaking existing stock analysis pages
