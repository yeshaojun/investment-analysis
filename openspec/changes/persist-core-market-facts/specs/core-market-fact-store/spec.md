## ADDED Requirements

### Requirement: Tracked symbol ingestion scope
The system SHALL maintain a durable tracked-symbol list that controls default ingestion scope independently from search history.

#### Scenario: Default ingestion scope
- **WHEN** an ingestion script runs without an explicit symbol
- **THEN** the system SHALL process only enabled tracked symbols

#### Scenario: Search does not track
- **WHEN** a user searches for a stock
- **THEN** the system SHALL NOT automatically add that stock to tracked symbols

### Requirement: Durable financial facts
The system SHALL persist financial facts with source, currency, report period, report date, announcement date, data version, and restatement metadata where available.

#### Scenario: Provider returns financial data
- **WHEN** a provider returns financial facts for a symbol
- **THEN** the system SHALL upsert those facts into durable storage with source and data version metadata

#### Scenario: Financial field is missing
- **WHEN** a provider response lacks a financial field
- **THEN** the system SHALL persist that field as null rather than converting it to `0`

### Requirement: Dynamic financial periods
The system SHALL generate financial reporting periods from the current date and configured lookback instead of relying on hardcoded reporting periods.

#### Scenario: Financial periods requested
- **WHEN** A-share financial data is refreshed
- **THEN** the system SHALL evaluate generated annual and quarterly reporting dates appropriate for the configured lookback window

### Requirement: Durable historical daily prices
The system SHALL persist daily historical prices with interval, adjustment type, source, and update timestamp metadata.

#### Scenario: Historical prices saved
- **WHEN** daily historical prices are fetched from a provider
- **THEN** the system SHALL upsert rows by symbol, date, interval, and adjustment type

#### Scenario: Historical prices requested again
- **WHEN** requested daily historical data already exists locally for the requested range
- **THEN** the system SHALL return local rows before calling an external provider

### Requirement: Local-first reads
The system SHALL prefer durable local facts for slow-changing and historical datasets before making external provider calls.

#### Scenario: Financial data exists locally
- **WHEN** financial facts exist locally for a symbol and satisfy the refresh policy
- **THEN** the service SHALL return local facts without calling external providers

#### Scenario: Local data missing
- **WHEN** durable local facts are missing for a requested symbol
- **THEN** the service SHALL attempt an external provider fetch and persist successful results

### Requirement: Stock info snapshot fallback
The system SHALL persist successful stock information snapshots and use them when live stock information providers fail.

#### Scenario: Provider fails with snapshot
- **WHEN** all live stock information providers fail and a local snapshot exists
- **THEN** the system SHALL return the snapshot with `is_stale` set to true and `as_of` metadata

#### Scenario: Provider fails without snapshot
- **WHEN** all live stock information providers fail and no local snapshot exists
- **THEN** the system SHALL return an explicit unavailable result without fabricated numeric market values

### Requirement: Idempotent ingestion scripts
The system SHALL provide ingestion script entry points for tracked symbols, financial facts, and historical daily prices that can be safely re-run.

#### Scenario: Script rerun
- **WHEN** the same ingestion script is run twice for the same symbol and period
- **THEN** durable storage SHALL contain one current row per unique fact key rather than duplicates

#### Scenario: Ingestion provider failure
- **WHEN** a provider fails during ingestion
- **THEN** the script SHALL record the failure and preserve the last successful durable facts
