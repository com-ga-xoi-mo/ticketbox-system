## ADDED Requirements

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
