## MODIFIED Requirements

### Requirement: Concert catalog caching

The system SHALL cache concert list, concert detail, and availability snapshots in Redis with
differentiated TTLs and invalidation rules. The cache layer SHALL be fail-open (a Redis failure
falls back to the database read) and SHALL protect the cache-miss path against a thundering herd so
that browsing remains available under load and during Redis degradation. Cache-miss protection SHALL
use lock ownership so that only the current lock owner loads and publishes a missing value while
Redis locking is healthy.

#### Scenario: Concert detail is served from cache

- **WHEN** a concert detail page is requested repeatedly within its cache TTL
- **THEN** the system SHALL serve the cached response without querying all underlying tables each time

#### Scenario: Concert list is served from cache

- **WHEN** the public concert list is requested repeatedly within its cache TTL
- **THEN** the system SHALL serve the cached list without re-querying the catalog each time

#### Scenario: Availability cache refreshes on a short TTL

- **WHEN** a concert availability snapshot is requested repeatedly
- **THEN** the system SHALL serve a cached snapshot whose TTL is short enough that a reservation,
  expiration release, or payment completion is reflected within the configured refresh window
  without querying the database on every request

#### Scenario: List and detail caches are invalidated on admin writes

- **WHEN** an organizer or admin creates, updates, cancels, or publishes a concert (or changes its
  ticket types)
- **THEN** the system SHALL invalidate the affected concert list and concert detail cache entries so
  the next read reflects the change

#### Scenario: Cache-miss is protected against a thundering herd

- **WHEN** a cached key expires and many concurrent requests miss the cache at the same time
- **THEN** the system SHALL use a mutex so that the fast path has only one request load the value
  from the database and the others reuse the freshly cached result

#### Scenario: Slow cache-miss winner does not release all losers to the database

- **WHEN** the initial cache-miss lock owner does not populate the cache within the loser wait window
- **THEN** waiting requests SHALL attempt to reacquire the mutex and only a request that obtains the
  lock SHALL load the value from the database while Redis locking is healthy

#### Scenario: Stale cache-miss winner cannot overwrite a newer cache value

- **WHEN** a cache-miss lock owner completes after its lock has expired or another request has
  acquired the lock
- **THEN** the stale owner SHALL NOT delete the newer lock and SHALL NOT overwrite the cache value
  written by the current lock owner

#### Scenario: Cache failure falls back to the database

- **WHEN** Redis is unavailable or returns an error during a cached read or cache-miss coordination
- **THEN** the system SHALL serve the response from the database instead of failing the request
