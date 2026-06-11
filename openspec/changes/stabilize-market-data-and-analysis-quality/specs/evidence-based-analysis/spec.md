## ADDED Requirements

### Requirement: Evidence-backed AI analysis
The system SHALL generate investment, industry, company competitiveness, research, and financial analysis from structured evidence rather than only prompt instructions.

#### Scenario: Investment analysis generated
- **WHEN** investment value analysis is requested for a symbol
- **THEN** the system SHALL provide the model with financial metrics, company identity, market data freshness, and available research evidence

#### Scenario: Evidence is insufficient
- **WHEN** required evidence is missing below the configured threshold
- **THEN** the system SHALL return an insufficient-data response or clearly label missing sections instead of fabricating details

### Requirement: Research report evidence ingestion
The system SHALL persist research report metadata and, when available, extracted report text with source URL, institution, publication date, and content hash.

#### Scenario: New research report discovered
- **WHEN** ingestion discovers a research report not already stored for a symbol
- **THEN** the system SHALL persist its metadata and extraction status

#### Scenario: Duplicate research report discovered
- **WHEN** ingestion discovers a report with the same symbol, title, institution, date, or content hash
- **THEN** the system SHALL avoid creating a duplicate evidence record

### Requirement: Source attribution
The system SHALL expose source attribution for generated analysis, including data snapshot versions and research/report sources used.

#### Scenario: Analysis response returned
- **WHEN** an AI analysis response is returned
- **THEN** the response SHALL include source metadata or a source summary identifying the evidence basis

#### Scenario: Stale evidence used
- **WHEN** analysis uses stale but allowed evidence
- **THEN** the response SHALL indicate the evidence timestamp and stale status

### Requirement: Analysis cache versioning
The system SHALL cache generated analysis by symbol, analysis type, data snapshot versions, prompt version, and model identifier.

#### Scenario: Same evidence and model
- **WHEN** the same analysis is requested with unchanged evidence snapshot, prompt version, and model
- **THEN** the system SHALL return the cached analysis when it is still valid

#### Scenario: Prompt version changes
- **WHEN** the prompt version changes for an analysis type
- **THEN** the system SHALL generate a new analysis instead of returning the previous cached result

### Requirement: Peer and metric context
The system SHALL include comparable company or industry metric context when producing company competitiveness and valuation analysis.

#### Scenario: Peer data available
- **WHEN** peer group metrics are available for a company
- **THEN** competitiveness and valuation analysis SHALL compare the company against the peer group

#### Scenario: Peer data unavailable
- **WHEN** peer group metrics are unavailable
- **THEN** analysis SHALL state that peer comparison is unavailable and avoid unsupported ranking claims
