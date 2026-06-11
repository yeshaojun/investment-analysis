## ADDED Requirements

### Requirement: Provider registry
The system SHALL route external market and financial data requests through a provider registry that defines provider priority, supported data domains, timeout, retry, and normalization behavior.

#### Scenario: Select primary provider
- **WHEN** a service requests A-share quote data
- **THEN** the system SHALL select the highest-priority enabled provider that supports A-share quote data

#### Scenario: Skip unsupported provider
- **WHEN** a provider does not support the requested market or data domain
- **THEN** the system SHALL skip that provider and evaluate the next eligible provider

### Requirement: Provider fallback
The system SHALL attempt configured backup providers when the primary provider fails, times out, or returns empty/invalid data.

#### Scenario: Primary provider fails
- **WHEN** the primary provider raises an exception for a stock quote request
- **THEN** the system SHALL try the next eligible provider before returning an error or stale snapshot

#### Scenario: Empty provider response
- **WHEN** a provider returns an empty response for a supported request
- **THEN** the system SHALL treat the response as unavailable and continue fallback

### Requirement: Stale snapshot degradation
The system SHALL return the most recent durable snapshot when all live providers are unavailable and a snapshot exists.

#### Scenario: Serve stale snapshot
- **WHEN** all providers fail for a stock information request and a local snapshot exists
- **THEN** the system SHALL return the snapshot with `is_stale` set to true and an `as_of` timestamp

#### Scenario: No snapshot available
- **WHEN** all providers fail and no local snapshot exists
- **THEN** the system SHALL return an explicit unavailable result rather than fabricated market values

### Requirement: Provider observability
The system SHALL record provider attempts, failures, timeouts, selected source, and degradation outcomes in logs or metrics.

#### Scenario: Fallback is used
- **WHEN** a request succeeds through a backup provider
- **THEN** the system SHALL record the failed primary provider and the selected backup provider

#### Scenario: Stale data is returned
- **WHEN** a stale snapshot is returned
- **THEN** the system SHALL record the data domain, symbol, snapshot timestamp, and failed providers
