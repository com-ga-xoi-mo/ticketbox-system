## ADDED Requirements

### Requirement: Payment reliability hardening evidence
The system SHALL provide automated hardening tests proving payment idempotency, duplicate callback dedupe, and circuit breaker behavior.

#### Scenario: Same payment initiation key replays the first result
- **WHEN** the same authenticated user retries payment initiation for the same order, provider, and idempotency key
- **THEN** the system SHALL return the first completed initiation result
- **AND** it SHALL NOT call the provider again

#### Scenario: Same payment initiation key with different payload is rejected
- **WHEN** the same authenticated user reuses a payment initiation idempotency key with a different order or provider payload
- **THEN** the system SHALL reject the request with a controlled conflict
- **AND** it SHALL NOT create a second provider transaction

#### Scenario: Concurrent same-key payment initiation creates one provider attempt
- **WHEN** concurrent payment initiation requests use the same user, order, provider, and idempotency key
- **THEN** at most one request SHALL acquire the idempotency claim and call the provider
- **AND** other matching requests SHALL receive replay or in-progress conflict behavior without creating additional provider attempts

#### Scenario: Duplicate success callback does not issue duplicate tickets
- **WHEN** a provider sends the same successful callback or provider event more than once
- **THEN** the duplicate callback SHALL be identified as already processed
- **AND** the order SHALL NOT transition twice
- **AND** no duplicate tickets SHALL be created for the paid order

#### Scenario: Circuit breaker transition evidence exists
- **WHEN** payment provider initiation fails repeatedly
- **THEN** the circuit breaker SHALL transition from `CLOSED` to `OPEN`
- **AND** later transition to `HALF_OPEN` after cooldown
- **AND** a successful half-open trial SHALL close the circuit
- **AND** a failed half-open trial SHALL open the circuit again

#### Scenario: Open circuit blocks provider calls
- **WHEN** payment initiation is attempted while the provider circuit is `OPEN`
- **THEN** the system SHALL return a controlled provider-unavailable error
- **AND** it SHALL NOT call the payment provider
- **AND** unrelated non-payment features SHALL remain unaffected

