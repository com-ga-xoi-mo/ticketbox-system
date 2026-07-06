## MODIFIED Requirements

### Requirement: Redis-backed rate limiting
The system SHALL rate limit public browsing, checkout, payment initiation, admin writes, and check-in sync using Redis-backed token buckets with endpoint-specific policies and actor-specific bucket keys. The system SHALL attach the matching rate-limit policy metadata to the concrete HTTP routes that expose those protected operations, so the shared rate-limit infrastructure is enforced on real traffic instead of only existing as unused policy definitions.

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

#### Scenario: Public catalog routes are covered by browsing policy
- **WHEN** the system exposes public catalog routes for concert list, featured concerts, cities, concert detail, and concert availability
- **THEN** each of those route handlers SHALL be annotated with the browsing rate-limit policy
- **AND** automated route metadata tests SHALL fail if any listed public catalog route loses the browsing policy annotation

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

#### Scenario: Admin and organizer write routes are covered by admin write policy
- **WHEN** the system exposes admin or organizer routes that create, update, publish, cancel, archive, upload, import, discover, or generate heavy resources
- **THEN** those write or heavy route handlers SHALL be annotated with the admin-write rate-limit policy
- **AND** read-only admin or organizer list/detail/report handlers SHALL NOT be required to use the admin-write policy unless they trigger write-like processing

#### Scenario: Check-in sync is limited by device
- **WHEN** a check-in client syncs events faster than the configured check-in sync limit
- **THEN** the system SHALL consume tokens from a check-in sync bucket keyed by device identifier when available
- **AND** the system SHALL fall back to authenticated staff identity or client IP only when no device identifier is available
- **AND** excess sync requests SHALL receive `429 Too Many Requests` without recording duplicate check-in events

#### Scenario: Check-in sync route is covered by check-in sync policy
- **WHEN** the system exposes the offline batch sync route for check-in clients
- **THEN** that route handler SHALL be annotated with the check-in sync rate-limit policy
- **AND** automated route metadata tests SHALL fail if the sync route loses that annotation

#### Scenario: Token bucket allows configured bursts
- **WHEN** requests arrive within the configured burst capacity for a policy
- **THEN** the system SHALL allow the burst while decrementing available tokens
- **AND** sustained traffic above the refill rate SHALL eventually be rejected with `429 Too Many Requests`

#### Scenario: Endpoint policies are isolated
- **WHEN** one endpoint class exhausts its token bucket for an actor
- **THEN** other endpoint classes for the same actor SHALL use their own bucket state
- **AND** the exhausted bucket SHALL NOT consume or reset tokens for unrelated policies

### Requirement: Concert catalog caching
The system SHALL cache concert list, concert detail, and availability snapshots in Redis with differentiated TTLs and invalidation rules. The cache layer SHALL be fail-open (a Redis failure falls back to the database read) and SHALL protect the cache-miss path against a thundering herd so that browsing remains available under load and during Redis degradation. Cache-miss protection SHALL use lock ownership so that only the current lock owner loads and publishes a missing value while Redis locking is healthy. Public detail reads SHALL compose 300-second static detail data with 5-second availability data before returning the response. Public list reads SHALL remain a 60-second static list cache and SHALL NOT require `availabilitySummary` to use the short-TTL availability cache.

#### Scenario: Concert detail static data is served from cache
- **WHEN** a concert detail page is requested repeatedly within its 300-second static cache TTL
- **THEN** the system SHALL serve the static detail data from cache without querying all underlying static catalog tables each time

#### Scenario: Concert detail availability is composed from short TTL cache
- **WHEN** a concert detail page is requested repeatedly and the static detail cache remains valid
- **THEN** the system SHALL still read or refresh the 5-second availability snapshot and compose `ticketTypes[].availableQuantity` before returning the response

#### Scenario: Concert list static data is served from cache
- **WHEN** the public concert list is requested repeatedly within its 60-second static cache TTL
- **THEN** the system SHALL serve the static list data from cache without re-querying the catalog each time

#### Scenario: Concert list availability summary uses static list freshness
- **WHEN** the public concert list is requested repeatedly and the static list cache remains valid
- **THEN** the system SHALL allow cached `availabilitySummary` values from the static list payload
- **AND** it SHALL NOT be required to refresh availability summaries through the short-TTL availability cache for the list response

#### Scenario: Availability cache refreshes on a short TTL
- **WHEN** a concert availability snapshot is requested repeatedly
- **THEN** the system SHALL serve a cached snapshot whose TTL is short enough that a reservation, expiration release, or payment completion is reflected within the configured 5-second refresh window without querying the database on every request

#### Scenario: List and detail caches are invalidated on admin writes
- **WHEN** an organizer or admin creates, updates, cancels, or publishes a concert (or changes its ticket types)
- **THEN** the system SHALL invalidate the affected concert list and concert detail cache entries so the next read reflects the change

#### Scenario: Cache-miss is protected against a thundering herd
- **WHEN** a cached key expires and many concurrent requests miss the cache at the same time
- **THEN** the system SHALL use a mutex so that the fast path has only one request load the value from the database and the others reuse the freshly cached result

#### Scenario: Slow cache-miss winner does not release all losers to the database
- **WHEN** the initial cache-miss lock owner does not populate the cache within the loser wait window
- **THEN** waiting requests SHALL attempt to reacquire the mutex and only a request that obtains the lock SHALL load the value from the database while Redis locking is healthy

#### Scenario: Stale cache-miss winner cannot overwrite a newer cache value
- **WHEN** a cache-miss lock owner completes after its lock has expired or another request has acquired the lock
- **THEN** the stale owner SHALL NOT delete the newer lock and SHALL NOT overwrite the cache value written by the current lock owner

#### Scenario: Cache failure falls back to the database
- **WHEN** Redis is unavailable or returns an error during a cached read or cache-miss coordination
- **THEN** the system SHALL serve the response from the database instead of failing the request

#### Scenario: Cache TTL evidence is tested
- **WHEN** the cache decorator tests inspect concert catalog cache behavior
- **THEN** they SHALL verify that public detail static data uses a 300-second TTL
- **AND** availability snapshots remain on the configured 5-second TTL
