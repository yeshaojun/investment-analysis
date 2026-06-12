## ADDED Requirements

### Requirement: Company chain position API
The system SHALL provide an API that returns a company's AI compute chain positioning by stock symbol through stable company_id and many-to-many company-node exposure records.

#### Scenario: Retrieve position for mapped company
- **WHEN** a client requests the chain position for a stock symbol that exists in the AI compute seed universe
- **THEN** the system returns company_id, canonical name, symbol, aliases, chain_id, node exposures, roles, evidence snippets, confidence bands, staleness, and source metadata

#### Scenario: Retrieve position for unmapped company
- **WHEN** a client requests the chain position for a stock symbol that is not mapped to the AI compute chain
- **THEN** the system returns an empty position result with an explicit unavailable reason instead of fabricating a relationship

#### Scenario: Company names are not relationship keys
- **WHEN** the API returns relationships or exposures
- **THEN** the relationships reference stable company_id and node_id values rather than company name strings as primary keys

#### Scenario: Evidence is attached to relationship claims
- **WHEN** the API returns a company role or node membership
- **THEN** the claim includes evidence metadata or is explicitly marked as curated/manual with confidence band and status

### Requirement: Multi-node company exposure
The system SHALL support companies participating in multiple AI compute chain nodes with separate exposure records.

#### Scenario: Company has multiple node exposures
- **WHEN** a company participates in more than one AI compute node
- **THEN** the API returns one exposure record per node with role, exposure band, business scope, confidence band, status, and evidence references

#### Scenario: Event results use exposure records
- **WHEN** event analysis maps a node to related companies
- **THEN** company relevance is based on node exposure records rather than a single company node_id

### Requirement: Fundamental validation for chain position
The system SHALL validate a mapped company's chain exposure against structured financial data and return operating signals and a coarse fundamental validation status.

#### Scenario: Financial data is available
- **WHEN** financial data exists for a mapped company
- **THEN** the system returns recent revenue YoY, profit YoY, margin trend, cash-flow signal, and validation status

#### Scenario: Financial data is unavailable
- **WHEN** financial data is missing or unavailable for a mapped company
- **THEN** the system returns `insufficient_data` validation status and does not ask the LLM to invent financial facts

#### Scenario: Validation uses structured metrics
- **WHEN** the system computes fundamental validation
- **THEN** all numeric financial signals come from the structured financial data service or persisted financial metrics

#### Scenario: Validation avoids investment scoring
- **WHEN** the system returns validation for a company
- **THEN** it does not return buy/sell recommendations, target prices, short-term price probability, or investment scores

### Requirement: Stock explorer chain positioning view
The frontend SHALL expose company chain positioning from the existing stock analysis experience without loading every heavy analysis component by default.

#### Scenario: View chain tab for selected stock
- **WHEN** a user selects a stock and opens the chain positioning tab or section
- **THEN** the frontend displays the company's AI compute role, node exposures, evidence tier, relationship status, staleness, and fundamental validation

#### Scenario: Show unmapped stock state
- **WHEN** the selected stock has no AI compute chain mapping
- **THEN** the frontend states that no AI compute chain position is available and keeps the rest of the stock analysis usable

#### Scenario: Navigate from chain company to stock analysis
- **WHEN** a user selects a representative company from the chain overview
- **THEN** the frontend allows navigation to the stock analysis experience for that company

#### Scenario: Avoid recommendation language
- **WHEN** the frontend displays company chain positioning
- **THEN** it uses neutral language such as related company, exposed company, evidence strength, and validation status rather than beneficiary stock, buy opportunity, recommendation, or target price language
