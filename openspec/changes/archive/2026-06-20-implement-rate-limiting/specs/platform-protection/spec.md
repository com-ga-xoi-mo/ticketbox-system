## MODIFIED Requirements

### Requirement: Redis-backed rate limiting
The system SHALL rate limit public browsing, checkout, payment initiation, admin writes, and check-in sync using Redis-backed token buckets with endpoint-specific policies and actor-specific bucket keys.

#### Scenario: Checkout rate limit is exceeded
- **WHEN** an authenticated user sends checkout requests faster than the configured checkout limit
- **THEN** the system SHALL reject excess checkout requests with `429 Too Many Requests`
- **AND** the response SHALL include a `Retry-After` value derived from the token bucket refill time
- **AND** no order or inventory mutation SHALL be attempted for the rejected request

#### Scenario: Browsing remains available under checkout pressure
- **WHEN** checkout traffic is rate limited during a sale spike
- **THEN** public concert browsing SHALL continue to use the browsing rate limit policy
- **AND** checkout bucket exhaustion SHALL NOT block unrelated browsing requests

#### Scenario: Anonymous browsing is limited by IP
- **WHEN** anonymous clients request public browsing endpoints
- **THEN** the system SHALL consume tokens from a browsing bucket keyed by client IP and route policy
- **AND** excess requests SHALL receive `429 Too Many Requests` without invoking the application use case

#### Scenario: Payment initiation is limited by user and order
- **WHEN** an authenticated user initiates payment for an order faster than the configured payment limit
- **THEN** the system SHALL consume tokens from a payment initiation bucket keyed by user, order, and provider-relevant route policy
- **AND** excess requests SHALL receive `429 Too Many Requests`
- **AND** payment idempotency replay, payment provider calls, and payment circuit breaker state SHALL NOT be mutated by rejected requests

#### Scenario: Admin writes are limited by actor
- **WHEN** an organizer or admin performs write operations faster than the configured admin-write limit
- **THEN** the system SHALL consume tokens from an admin-write bucket keyed by role/user and route policy
- **AND** excess write requests SHALL receive `429 Too Many Requests`
- **AND** read-only admin or public browsing policies SHALL remain independent

#### Scenario: Check-in sync is limited by device
- **WHEN** a check-in client syncs events faster than the configured check-in sync limit
- **THEN** the system SHALL consume tokens from a check-in sync bucket keyed by device identifier when available
- **AND** the system SHALL fall back to authenticated staff identity or client IP only when no device identifier is available
- **AND** excess sync requests SHALL receive `429 Too Many Requests` without recording duplicate check-in events

#### Scenario: Token bucket allows configured bursts
- **WHEN** requests arrive within the configured burst capacity for a policy
- **THEN** the system SHALL allow the burst while decrementing available tokens
- **AND** sustained traffic above the refill rate SHALL eventually be rejected with `429 Too Many Requests`

#### Scenario: Endpoint policies are isolated
- **WHEN** one endpoint class exhausts its token bucket for an actor
- **THEN** other endpoint classes for the same actor SHALL use their own bucket state
- **AND** the exhausted bucket SHALL NOT consume or reset tokens for unrelated policies
