# platform-protection Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Redis-backed rate limiting
The system SHALL rate limit public browsing, checkout, payment initiation, admin writes, and check-in sync using Redis-backed token buckets with endpoint-specific policies and actor-specific bucket keys. The system SHALL attach the matching rate-limit policy metadata to the concrete HTTP routes that expose those protected operations, so the shared rate-limit infrastructure is enforced on real traffic instead of only existing as unused policy definitions.

### Requirement: Graceful degradation
The system SHALL isolate failures in external payment, email, AI, and CSV processing so unrelated user workflows remain available.

#### Scenario: Payment provider outage does not break catalog
- **WHEN** the payment provider circuit is open
- **THEN** the system SHALL still allow users to browse concerts and organizers to use non-payment admin features

### Requirement: Observability and technical evidence
The system SHALL expose enough logs, health checks, metrics, or test output to demonstrate required technical mechanisms.

#### Scenario: Concurrency test evidence exists
- **WHEN** the team runs the technical test suite or demo script
- **THEN** the output SHALL demonstrate no oversell, enforced per-user limit, idempotent payment handling, and duplicate check-in rejection

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

### Requirement: Geocoding search rate limit policy
The system SHALL enforce an application-wide geocoding rate limit using a Redis-backed shared token bucket with a capacity of 1 request per second and `failOpen: false`. The bucket key SHALL be global (not per user or per IP) so that all API instances share the same budget. Rate-limit consumption SHALL occur exactly once inside the cache-miss loader immediately before the upstream provider call; the endpoint SHALL NOT also apply the generic controller rate-limit interceptor. Cache hits SHALL bypass the rate limiter. When the bucket is empty and no cache entry exists, the endpoint SHALL respond with HTTP 429 and a `Retry-After` header.

#### Scenario: Geocoding rate limit policy is isolated from other policies
- **WHEN** the geocoding token bucket is exhausted for ADMIN or ORGANIZER users
- **THEN** admin writes, checkout, browsing, and check-in sync bucket states SHALL remain unaffected

#### Scenario: Geocoding rate limit enforced globally
- **WHEN** two API instances simultaneously attempt cache-miss geocoding searches
- **THEN** at most one request per second total SHALL reach the upstream geocoding provider across all instances

#### Scenario: HTTP 429 is returned with Retry-After when geocoding bucket is empty
- **WHEN** the global geocoding bucket is exhausted
- **THEN** the endpoint SHALL return HTTP 429 with a `Retry-After` header
- **AND** no upstream provider call SHALL be made

#### Scenario: Cache hit does not consume geocoding rate limit token
- **WHEN** a geocoding search request is served from cache
- **THEN** the global geocoding token bucket SHALL NOT be decremented

#### Scenario: Geocoding limiter fails closed
- **WHEN** the Redis token-bucket store is unavailable during a geocoding cache miss
- **THEN** the request SHALL fail with HTTP 503
- **AND** no upstream geocoding request SHALL be issued
