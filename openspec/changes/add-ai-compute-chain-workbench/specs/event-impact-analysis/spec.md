## ADDED Requirements

### Requirement: Event impact analysis API
The system SHALL provide an API that accepts user-provided event text and returns a structured AI compute event impact analysis including controlled event classification, affected nodes, propagated paths, related exposed companies, direction, impact level, strength band, time lag, confidence band, evidence, and validation signals.

#### Scenario: Analyze capex increase event
- **WHEN** a user submits an AI capex increase event
- **THEN** the system classifies the event as `capex_increase`, maps it to affected AI compute nodes, and returns impact paths for relevant direct and indirect nodes

#### Scenario: Return structured impact paths
- **WHEN** event impact analysis succeeds
- **THEN** each impact path includes path nodes, related exposed company records where applicable, impact direction, impact level, strength band, time lag, confidence band, conditions, risk factors, and evidence references

#### Scenario: Handle unclassified event
- **WHEN** the system cannot classify the event with sufficient confidence into a supported event type
- **THEN** the response returns `unknown` or `manual_required` classification and does not fabricate impacted companies

### Requirement: Controlled event taxonomy
The system SHALL normalize user-provided event text into a supported event_type before propagation.

#### Scenario: Supported event type is returned
- **WHEN** an event matches the AI compute event taxonomy
- **THEN** the response includes event_type, classification confidence band, matched keywords or rationale, and original event text

#### Scenario: Unsupported event type is rejected safely
- **WHEN** an event cannot be normalized to the controlled taxonomy
- **THEN** the system returns `manual_required` or `unknown` without generating free-form AI propagation paths

#### Scenario: Taxonomy includes MVP event types
- **WHEN** the event classifier is configured
- **THEN** it supports at least `capex_increase`, `capex_cut`, `gpu_new_generation`, `gpu_supply_constraint`, `liquid_cooling_adoption`, `optical_speed_upgrade`, `raw_material_price_up`, `raw_material_price_down`, `export_restriction`, `domestic_substitution`, and `demand_slowdown`

### Requirement: Rule-first propagation with optional AI classification
The system SHALL use deterministic propagation rules for AI compute chain impact paths and MAY use AI only to classify or summarize the user-provided event.

#### Scenario: Deterministic propagation rules applied
- **WHEN** an event is classified into a supported event type
- **THEN** the system applies stored propagation rules to determine affected nodes and paths

#### Scenario: Rules support negative and conditional impacts
- **WHEN** an event rule is applied
- **THEN** the rule can express positive, negative, mixed, or unknown direction plus condition, exclusion, risk factors, rationale, and time lag

#### Scenario: AI output does not override financial facts
- **WHEN** AI is used during event analysis
- **THEN** AI output does not create or modify financial metrics and does not directly write verified relationships

#### Scenario: Candidate relationships are excluded from propagation
- **WHEN** event propagation traverses chain relationships
- **THEN** candidate relationships are excluded from default propagation

### Requirement: Event fundamental validation
The system SHALL validate event-company exposure using structured financial data, event date, and rule time lag.

#### Scenario: Event not yet financially observable
- **WHEN** no relevant financial report has been disclosed after the event's observable window starts
- **THEN** the company validation status is `not_yet_observable`

#### Scenario: Event financial data is available
- **WHEN** relevant financial reports exist after the event's observable window
- **THEN** the system returns validation status and key operating signals without generating financial numbers by LLM

#### Scenario: Validation status is bounded
- **WHEN** event-company validation is returned
- **THEN** the status is one of `not_yet_observable`, `validated`, `partially_validated`, `contradicted`, or `insufficient_data`

### Requirement: Event analysis snapshot persistence
The system SHALL persist each event impact analysis result as a snapshot for reproducibility and later revalidation.

#### Scenario: Snapshot created
- **WHEN** event impact analysis succeeds or returns a classified result
- **THEN** the system stores snapshot_id, event text, normalized event type, event date, classification confidence band, rules version, chain data version, financial data as-of, result JSON, and created-at time

#### Scenario: Snapshot can be retrieved
- **WHEN** a client requests a persisted event impact snapshot by snapshot_id
- **THEN** the system returns the original structured result and metadata needed to understand the version used

### Requirement: Event impact frontend
The frontend SHALL provide an event impact input and result view for AI compute chain events.

#### Scenario: Submit event text
- **WHEN** a user enters an event description and submits it
- **THEN** the frontend calls the event impact API and displays classification, affected nodes, impact paths, and related exposed companies

#### Scenario: Inspect exposed company validation
- **WHEN** event results include related exposed companies
- **THEN** the frontend shows exposure band, validation status, evidence state, and key financial signals for each company when available

#### Scenario: Preserve uncertainty
- **WHEN** impact confidence is low, relation status is curated/manual, evidence is stale, or classification is unknown
- **THEN** the frontend displays uncertainty clearly rather than presenting the result as confirmed fact

#### Scenario: Avoid beneficiary ranking language
- **WHEN** the frontend displays event impact results
- **THEN** it does not label the output as beneficiary stocks, buy opportunities, recommended companies, or certain winners
