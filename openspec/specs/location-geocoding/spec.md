# location-geocoding Specification

## Purpose
Provide a backend-proxied location geocoding capability (Nominatim/OpenStreetMap) for admin and organizer venue address search, with strict rate limiting, caching, and safe error mapping.

## Requirements

### Requirement: Location search proxy endpoint
The system SHALL provide a JWT-protected `GET /locations/search?q=<query>` endpoint accessible only to ADMIN and ORGANIZER roles. The endpoint SHALL forward search requests to the configured geocoding provider (Nominatim) via the `GeocodingProviderPort` abstraction, enforcing application-wide rate limiting and query-level caching before calling the provider.

#### Scenario: Admin searches for a location
- **WHEN** an authenticated ADMIN sends `GET /locations/search?q=<query>` with a query of 3–200 characters
- **THEN** the system SHALL return up to 5 location results, each containing `displayName`, `latitude`, and `longitude`

#### Scenario: Organizer searches for a location
- **WHEN** an authenticated ORGANIZER sends `GET /locations/search?q=<query>` with a valid query
- **THEN** the system SHALL return up to 5 location results using the same contract as ADMIN

#### Scenario: AUDIENCE role is rejected
- **WHEN** an authenticated AUDIENCE user sends `GET /locations/search?q=<query>`
- **THEN** the system SHALL reject the request with HTTP 403

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated client sends `GET /locations/search?q=<query>`
- **THEN** the system SHALL reject the request with HTTP 401

#### Scenario: Query shorter than 3 characters is rejected
- **WHEN** an ADMIN or ORGANIZER sends `GET /locations/search?q=ab`
- **THEN** the system SHALL return HTTP 400

#### Scenario: Query longer than 200 characters is rejected
- **WHEN** an ADMIN or ORGANIZER sends `GET /locations/search` with a query exceeding 200 characters
- **THEN** the system SHALL return HTTP 400

#### Scenario: Missing query parameter is rejected
- **WHEN** an ADMIN or ORGANIZER sends `GET /locations/search` with no `q` parameter
- **THEN** the system SHALL return HTTP 400

### Requirement: Nominatim geocoding adapter
The system SHALL proxy geocoding requests to Nominatim (`GET /search`) using native Node `fetch`, `format=jsonv2`, `addressdetails=1`, `limit=5`, and `countrycodes=vn` by default. The adapter SHALL send a configured identifying `User-Agent`, optional configured `email` query parameter, and an `Accept-Language: vi,en` header. The base URL and bounded request timeout SHALL come from server configuration. The adapter SHALL validate untrusted upstream JSON and map only safe fields (`display_name`, `lat`, `lon`) into finite, in-range coordinates; it SHALL NOT expose the raw payload.

#### Scenario: Adapter sends correct headers and parameters
- **WHEN** the adapter is invoked with a valid query
- **THEN** it SHALL send a request to `<NOMINATIM_BASE_URL>/search` with `format=jsonv2`, `addressdetails=1`, `limit=5`, `countrycodes=vn`, `q=<url-encoded-query>`, `User-Agent: <configured>`, and `Accept-Language: vi,en`

#### Scenario: Adapter maps response to safe DTO
- **WHEN** Nominatim returns results
- **THEN** the adapter SHALL return only `displayName`, `latitude`, and `longitude` per result without exposing any other Nominatim fields

#### Scenario: Empty Nominatim result returns empty list
- **WHEN** Nominatim returns an empty array for a query
- **THEN** the adapter SHALL return an empty results array without error

#### Scenario: Nominatim timeout returns provider unavailable error
- **WHEN** the Nominatim HTTP call exceeds its timeout
- **THEN** the adapter SHALL throw a provider-unavailable error that the use case translates to HTTP 503
- **AND** the error SHALL NOT expose the upstream URL or stack trace

#### Scenario: Malformed upstream payload is handled safely
- **WHEN** Nominatim returns invalid JSON, a non-array top-level value, or results with malformed coordinates
- **THEN** the adapter SHALL NOT return malformed results to the client
- **AND** a malformed top-level payload SHALL produce the safe provider-unavailable error

#### Scenario: Adapter does not call Nominatim directly from browser
- **WHEN** a geocoding search is initiated from the admin or organizer web UI
- **THEN** the browser SHALL call only the TicketBox `GET /locations/search` endpoint
- **AND** only the TicketBox backend SHALL call Nominatim

### Requirement: Application-wide geocoding rate limiting
The system SHALL enforce a maximum of 1 upstream Nominatim request per second across all API instances using a Redis-backed shared token bucket. Processing order SHALL be authorization and validation, cache lookup, then rate-limit consumption inside the cache loader immediately before the provider call. The endpoint SHALL NOT also use a controller-level rate-limit interceptor. Cache hits SHALL bypass the rate limiter. When the rate limit is reached and no cache entry exists, the system SHALL reject the request with HTTP 429.

#### Scenario: Rate limit not exceeded on cache miss
- **WHEN** a geocoding search misses the cache and the global token bucket has an available token
- **THEN** the system SHALL call the geocoding provider and consume one token

#### Scenario: Rate limit exceeded on cache miss
- **WHEN** a geocoding search misses the cache and the global token bucket is empty
- **THEN** the system SHALL return HTTP 429 without calling the provider
- **AND** the response SHALL include a `Retry-After` value

#### Scenario: Cache hit bypasses rate limiter
- **WHEN** a geocoding search matches a cached result
- **THEN** the system SHALL return the cached result without consuming a rate-limit token and without calling the provider

#### Scenario: Rate limit is global across all API instances
- **WHEN** two API instances both attempt a cache-miss geocoding search simultaneously
- **THEN** at most one Nominatim request per second total SHALL be issued across both instances combined

#### Scenario: Redis rate-limit store is unavailable
- **WHEN** a cache miss requires an upstream call but Redis cannot determine whether the global token is available
- **THEN** the rate-limit policy SHALL fail closed
- **AND** the endpoint SHALL return HTTP 503
- **AND** the geocoding provider SHALL NOT be called

#### Scenario: Endpoint does not double-consume the rate limit
- **WHEN** a cache-miss search reaches the provider loader
- **THEN** exactly one global geocoding token SHALL be consumed
- **AND** no controller interceptor SHALL consume an additional token

### Requirement: Geocoding result caching
The system SHALL normalize each query by trimming, lowercasing, and collapsing internal whitespace, hash the normalized value with SHA-256, and cache results for 7 days under a key containing the versioned provider, country, and language namespace plus the hash. Raw address text SHALL NOT appear in Redis keys or cache logs. Concurrent identical queries SHALL be deduplicated through the existing ownership-safe distributed lock. `CacheServicePort.getOrSet` SHALL accept an optional `{ lockTtlSeconds }` argument; geocoding SHALL pass `ceil(NOMINATIM_TIMEOUT_MS / 1000) + 2`, while omitted options SHALL preserve the existing one-second default for all other consumers.

#### Scenario: Cache hit returns result without provider call
- **WHEN** a geocoding search is made for a query that was previously cached
- **THEN** the system SHALL return the cached result without calling the geocoding provider

#### Scenario: Normalized query shares cache with variant query
- **WHEN** the same location is searched with different whitespace or casing
- **THEN** the normalized form SHALL resolve to the same cache key and return the same cached result

#### Scenario: Provider configuration does not reuse incompatible cache entries
- **WHEN** provider namespace, country restriction, or result language configuration changes
- **THEN** searches SHALL use a distinct cache-key namespace instead of returning incompatible old results

#### Scenario: Raw search address is not exposed in cache metadata
- **WHEN** a normalized location query is converted to a cache key
- **THEN** only its SHA-256 digest SHALL appear after the provider/country/language namespace
- **AND** neither Redis keys nor cache logs SHALL contain the raw or normalized address

#### Scenario: Concurrent identical searches deduplicated
- **WHEN** two identical geocoding searches arrive simultaneously and neither has a cache entry
- **THEN** the system SHALL call the geocoding provider only once and serve both responses from the result

#### Scenario: Slow provider call remains deduplicated
- **WHEN** an identical concurrent search waits while the winning provider call lasts longer than the default one-second cache lock
- **THEN** geocoding SHALL use `ceil(NOMINATIM_TIMEOUT_MS / 1000) + 2` as its lock TTL
- **AND** no second provider request SHALL be issued

#### Scenario: Default cache lock behavior remains compatible
- **WHEN** an existing non-geocoding cache consumer calls `getOrSet` without lock options
- **THEN** the cache service SHALL retain its existing one-second lock TTL

#### Scenario: Cache miss with valid provider response populates cache
- **WHEN** a geocoding search misses the cache and the provider returns results
- **THEN** the results SHALL be written to cache with a 7-day TTL

#### Scenario: Provider unavailable with valid cache returns cached result
- **WHEN** a valid cache entry exists for the query
- **THEN** the system SHALL return the cached result without calling the provider

### Requirement: Geocoding HTTP error mapping
The location HTTP adapter SHALL map geocoding application errors without using the generic pre-cache rate-limit interceptor. Rate-limit exhaustion SHALL return HTTP 429 with a `Retry-After` header. Rate-limit store failure and provider unavailability SHALL return a safe HTTP 503 response without internal details.

#### Scenario: Exhausted geocoding budget maps to 429
- **WHEN** the global geocoding token bucket rejects a cache-miss request
- **THEN** the response SHALL be HTTP 429 with `Retry-After`

#### Scenario: Infrastructure failure maps to 503
- **WHEN** the rate-limit store or geocoding provider is unavailable
- **THEN** the response SHALL be HTTP 503 with a generic safe message
