## ADDED Requirements

### Requirement: Rate limiting hardening evidence
The system SHALL provide automated hardening tests proving Redis token bucket rate limiting behavior across endpoint policies and actors.

#### Scenario: Requests within rate limit are allowed
- **WHEN** an actor sends requests within the configured token bucket capacity and refill behavior
- **THEN** the requests SHALL proceed to the protected handler

#### Scenario: Excess requests are blocked with retry after
- **WHEN** an actor exceeds the configured token bucket capacity for a protected endpoint
- **THEN** the system SHALL reject excess requests with `429 Too Many Requests`
- **AND** the response SHALL include an appropriate `Retry-After` value
- **AND** the protected handler SHALL NOT be called for rejected requests

#### Scenario: Endpoint policies remain isolated
- **WHEN** checkout requests exhaust a checkout rate limit bucket
- **THEN** browsing, payment initiation, admin write, and check-in sync policies SHALL use independent buckets according to their configured actor keys

#### Scenario: Rejected payment initiation does not mutate payment state
- **WHEN** payment initiation is rejected by rate limiting before the payment use case is invoked
- **THEN** payment idempotency records, provider calls, and circuit breaker state SHALL NOT be mutated by that rejected request

#### Scenario: Redis degradation behavior is explicit
- **WHEN** the Redis-backed token bucket store is unavailable
- **THEN** each endpoint policy SHALL follow its configured fail-open or fail-closed behavior
- **AND** tests SHALL verify at least one fail-open policy and one fail-closed policy

