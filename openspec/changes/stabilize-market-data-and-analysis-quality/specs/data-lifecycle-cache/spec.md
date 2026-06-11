## ADDED Requirements

### Requirement: Lifecycle-specific cache policy
The system SHALL define cache and refresh policy by data domain instead of using one generic TTL strategy.

#### Scenario: Stock identity cache
- **WHEN** stock code, company name, market, or listing status is requested
- **THEN** the system SHALL use durable storage with a daily or longer refresh policy

#### Scenario: Real-time quote cache
- **WHEN** real-time quote or market ranking data is requested
- **THEN** the system SHALL use a short TTL policy and include freshness metadata in the response

#### Scenario: Financial report cache
- **WHEN** financial report data is requested
- **THEN** the system SHALL use durable storage and refresh according to reporting windows rather than a short fixed TTL

### Requirement: Durable snapshot first read path
The system SHALL read durable snapshots before making external calls for slow-changing or historical data.

#### Scenario: Financial data exists locally
- **WHEN** requested financial data exists locally and is within its lifecycle policy
- **THEN** the system SHALL return local data without calling an external provider

#### Scenario: Historical price data has gaps
- **WHEN** requested historical price data exists locally but has missing date ranges
- **THEN** the system SHALL fetch only the missing range when supported by the provider

### Requirement: Cache invalidation by data version
The system SHALL maintain data version or snapshot identifiers for cached datasets that feed user-facing analysis.

#### Scenario: Financial snapshot changes
- **WHEN** a financial report snapshot for a symbol is updated
- **THEN** the system SHALL invalidate or supersede analysis cache entries based on the previous financial snapshot version

#### Scenario: Research snapshot changes
- **WHEN** new research report evidence is ingested for a symbol
- **THEN** the system SHALL invalidate or supersede analysis cache entries based on the previous research snapshot version

### Requirement: Scheduled ingestion
The system SHALL support scheduled ingestion entry points for stock identity, historical prices, financial reports, and research reports.

#### Scenario: Scheduled financial refresh
- **WHEN** a scheduled financial refresh runs during a reporting window
- **THEN** the system SHALL check eligible symbols for new or revised financial reports and persist any changes

#### Scenario: Ingestion failure
- **WHEN** scheduled ingestion fails for a provider or symbol
- **THEN** the system SHALL record the failure without deleting the last successful snapshot
