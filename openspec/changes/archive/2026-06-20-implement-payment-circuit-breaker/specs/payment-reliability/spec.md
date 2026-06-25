## MODIFIED Requirements

### Requirement: Circuit breaker for payment provider
The system SHALL open a Redis-backed circuit breaker after repeated payment provider failures or timeouts and SHALL allow limited half-open recovery attempts without affecting non-payment features.

#### Scenario: Circuit opens after repeated failures
- **WHEN** payment provider initiation calls fail beyond the configured threshold
- **THEN** the system SHALL mark that provider circuit as `OPEN`
- **AND** the system SHALL record an open cooldown window in Redis

#### Scenario: Open circuit blocks provider calls
- **WHEN** an authenticated customer initiates payment while the selected provider circuit is `OPEN`
- **THEN** the system SHALL reject the payment initiation with a controlled payment degradation error
- **AND** the system SHALL NOT call the payment provider
- **AND** non-payment features SHALL remain available

#### Scenario: Circuit enters half-open after cooldown
- **WHEN** the provider circuit open cooldown has elapsed
- **THEN** the system SHALL allow only the configured number of `HALF_OPEN` trial payment initiation calls
- **AND** additional trial requests SHALL receive a controlled payment degradation error without calling the provider

#### Scenario: Circuit recovers
- **WHEN** the circuit breaker is `HALF_OPEN` and a trial payment provider call succeeds
- **THEN** the system SHALL close the circuit
- **AND** normal payment initiation SHALL resume for that provider

#### Scenario: Half-open failure reopens circuit
- **WHEN** the circuit breaker is `HALF_OPEN` and a trial payment provider call fails or times out
- **THEN** the system SHALL reopen the circuit
- **AND** the system SHALL start a new open cooldown window

#### Scenario: Provider circuits are isolated
- **WHEN** one payment provider circuit is `OPEN`
- **THEN** payment initiation for a different provider SHALL use that provider's own circuit state
- **AND** the open provider SHALL NOT block other providers
