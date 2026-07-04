## Context

TicketBox is an npm workspace containing a NestJS backend (`packages/backend/src`, entry via `apps/api`), an admin/organizer React app (`apps/web`), and an audience React/Vite app (`apps/audience-web`). Shared HTTP contracts live in `packages/api-types`.

The audience app already renders a Leaflet/OpenStreetMap map in `VenueMapModal`, but venue coordinates are resolved by normalizing the concert's `venueName` against a hard-coded lookup table in `venue-coordinates.ts`. Any name not in the table falls back silently to the centre of Ho Chi Minh City. The `Concert` model has no `latitude`/`longitude` columns. Admin and organizer forms have no location-picking UI.

The backend already has:
- **Redis-backed token-bucket rate limiting** (`platform/rate-limiting`) with policies declared in `RateLimitPolicy`.
- **Redis-backed `RedisCacheService`** (`platform/cache`) with thundering-herd protection via distributed lock (`getOrSet`).
- **NestJS DI** and the module system for wiring new capabilities.

Nominatim's public infrastructure is a best-effort service with a strict 1 request/second limit enforced by the usage policy. Rate limiting must be application-wide (across all API instances), not per-instance.

## Goals / Non-Goals

**Goals:**
- Persist `latitude` and `longitude` on the `Concert` table via an additive migration.
- Proxy Nominatim geocoding through the backend so no browser ever touches Nominatim directly.
- Enforce 1 req/s globally using the existing Redis infrastructure.
- Cache geocoding results by normalized query with a 7-day TTL using `RedisCacheService.getOrSet`.
- Expose a JWT-protected `GET /locations/search?q=` endpoint for ADMIN and ORGANIZER only.
- Extend `@ticketbox/api-types` with coordinate fields on concert schemas and a new geocoding search contract.
- Provide a `VenueLocationPicker` component in `apps/web` using `react-leaflet`.
- Replace the hard-coded coordinate lookup in `apps/audience-web` with real API coordinates.
- Reconcile the already-implemented marketplace baseline with the main-spec rule that admins cannot create concerts.

**Non-Goals:**
- Google Maps API, Places API, or any Google API key/billing.
- Client-side Nominatim calls.
- Reverse geocoding, radius search, route planning.
- PostGIS or spatial indexes.
- Venue entity/catalog.
- Bulk geocoding or background backfill of existing concerts.
- Self-hosted Nominatim or map tiles.
- Production tile-provider migration.
- Changes to concert publish/cancel workflow.

## Decisions

### D0 — Marketplace baseline and admin-create reconciliation

**Decision**: Implementation SHALL start from the completed `expand-concert-marketplace-management` code and contracts already present in the working tree. Before adding location fields, remove the accidental `POST /admin/concerts` route, `AdminCreateConcertSchema` export, constructor dependency used only for admin creation, and related tests. Organizer creation and admin editing remain unchanged.

**Rationale**: The main `concert-management` and `web-concert-management` specs reserve creation for organizers, while the current implementation contains an admin create endpoint introduced by the preceding change. Merely avoiding new admin-create UI would leave the authorization contract violated.

---

### D1 — Backend-only Nominatim proxy (not direct browser calls)

**Decision**: All geocoding requests go `browser → TicketBox API → Nominatim`, never `browser → Nominatim`.

**Rationale**: Nominatim's public policy prohibits client-side autocomplete and requires callers to respect the application-wide request limit, identify the application, and cache results. Proxying through the backend gives TicketBox one enforcement point for those obligations, prevents an uncontrolled request-per-user pattern, and keeps authentication in one place.

**Alternative considered**: Direct client-side fetch — rejected because TicketBox could not reliably enforce one shared request budget, consistent identification, or shared caching across browsers.

---

### D2 — Reuse `RedisCacheService.getOrSet` for geocoding cache

**Decision**: Normalize the query by trimming, lowercasing, and collapsing internal whitespace, hash that normalized value with SHA-256, and cache results for 7 days under `geocoding:v1:<provider>:<country>:<language>:<sha256>`. The raw address SHALL NOT appear in a Redis key or cache log. Reuse `CacheServicePort.getOrSet`, extended with an optional fourth argument `{ lockTtlSeconds?: number }` so existing callers remain source-compatible.

**Rationale**: The thundering-herd protection prevents concurrent identical searches from all hitting Nominatim simultaneously. The 7-day TTL is long relative to geocoding change frequency. Reusing the existing service avoids new infrastructure.

**Alternative considered**: A dedicated Redis key set without `getOrSet` — rejected because concurrent identical queries would all reach Nominatim, violating the 1 req/s global limit.

The current generic cache mutex has a 1-second lock TTL. For geocoding, `SearchLocationsUseCase` SHALL call `getOrSet` with `lockTtlSeconds = ceil(NOMINATIM_TIMEOUT_MS / 1000) + 2`. `RedisCacheService` SHALL continue using the existing 1-second default when the option is omitted, and lock release SHALL remain token/ownership-safe. Cache port fakes and regression tests SHALL cover both default and custom lock TTL behavior.

---

### D3 — New `GEOCODING_SEARCH` rate limit policy (1 req/s global)

**Decision**: Add a `GEOCODING_SEARCH` entry to `RateLimitPolicy` with `capacity: 1`, `refillTokens: 1`, `refillIntervalMs: 1000`, `ttlMs: 5000`, `failOpen: false`. The bucket key SHALL be the literal string `'global'` — not derived from user ID, IP, or any request field — so all API instances and all authenticated users share exactly one token bucket in Redis.

**Rationale**: Nominatim's usage policy is for the entire application, not per user. Two concurrent ADMIN users could together exceed 1 req/s if keyed per-actor. Using a single `'global'` actorKey guarantees one shared budget regardless of how many instances or users are active. `ttlMs: 5000` (5 × refillIntervalMs) keeps the bucket key alive across a short burst of sequential searches without occupying Redis indefinitely. `failOpen: false` ensures Nominatim is never called when Redis cannot confirm token availability.

**Alternative considered**: Rate-limit per user — rejected because two concurrent ADMIN users could together exceed Nominatim's 1 req/s limit.

**Implementation note**: `RateLimitActorKeyService.derive()` MUST NOT be used for this policy — its `default` case would return a per-IP key. `SearchLocationsUseCase` SHALL call `rateLimitService.consume(RateLimitPolicy.GEOCODING_SEARCH, 'global')` directly inside the `getOrSet` loader, after the cache miss is confirmed and immediately before the provider call.

**Execution order**: `authorize/validate → cache.getOrSet → [cache miss: consume global token → call provider]`. The generic controller `@RateLimit` interceptor SHALL NOT be applied to this endpoint because it runs before the cache and would consume a token on cache hits.

**Lock/poll interaction**: `RedisCacheService` polls for a cached value with `MAX_POLL_ATTEMPTS × POLL_INTERVAL_MS = 250ms` total. The geocoding lock TTL is `ceil(NOMINATIM_TIMEOUT_MS / 1000) + 2` seconds (e.g. 7s for a 5s timeout). A waiting concurrent request will exhaust its poll window and re-enter the acquire-lock loop while the lock holder is still calling the provider. This is correct by design — the retry loop eventually either acquires the lock or reads the populated cache. No second provider call is made. Tests SHOULD cover this scenario explicitly.

---

### D4 — Port/Adapter pattern for geocoding provider

**Decision**: Define `GeocodingProviderPort` (application layer interface) implemented by `NominatimGeocodingAdapter` (infrastructure). `SearchLocationsUseCase` depends only on the port.

**Rationale**: Decouples use-case logic from HTTP details and Nominatim's response schema. Tests use a fake implementation. A different provider can be swapped by registering a different adapter.

**Alternative considered**: Direct `HttpService` call in the use case — rejected because it couples application logic to infrastructure and makes testing hard.

The Nominatim adapter SHALL use the native `fetch` available in the repository's Node 22 runtime with `AbortSignal.timeout`. This avoids adding `@nestjs/axios`/`axios`, which are not currently workspace dependencies. The adapter SHALL validate the untrusted upstream JSON shape before converting `lat`/`lon` strings to finite, in-range numbers; malformed results SHALL be discarded, and a malformed top-level payload SHALL be treated as provider unavailable.

---

### D5 — Nullable `Decimal(9,6)` columns on Concert, validated as a pair

**Decision**: Add `latitude Decimal? @db.Decimal(9,6)` and `longitude Decimal? @db.Decimal(9,6)` to `Concert` in Prisma. Both must be provided together or both must be null. Zod validation: lat ∈ [-90,90], lng ∈ [-180,180]. Backend re-validates any coordinates sent by frontend.

**Rationale**: `Decimal(9,6)` gives roughly 0.11 metre resolution at the equator, sufficient for venue-level mapping. Making both nullable keeps existing concerts valid without any backfill. Pair validation prevents accidental partial updates.

**Alternative considered**: Separate Venue entity/table — deferred; out of scope for this change.

---

### D6 — `VenueLocationPicker` only triggers search on explicit button click

**Decision**: The admin/organizer search input sends a request only when the user presses the "Tìm địa điểm" button or submits. No autocomplete, no debounced-keystroke requests.

**Rationale**: Nominatim explicitly prohibits request-per-keystroke. Explicit search also gives users clearer intent control and avoids accidental quota exhaustion during form editing.

---

### D7 — Delete `venue-coordinates.ts` and HCMC fallback

**Decision**: After this change is implemented, `venue-coordinates.ts` is deleted and the HCMC fallback coordinate is removed. The audience map is shown only when the concert has real `latitude`/`longitude`.

**Rationale**: The hard-coded table is a temporary demo artifact. Keeping it alongside real coordinates would create ambiguity about which source of truth to use. Concerts without coordinates get a graceful "no map" state instead of a misleading fake one.

---

### D8 — Leaflet in `apps/web` via `react-leaflet`, marker icons patched for Vite

**Decision**: Add `leaflet`, `react-leaflet`, and `@types/leaflet` to `apps/web`. Apply the standard Vite Leaflet icon fix (import default icon images from `leaflet/dist/images` and set `Icon.Default.mergeOptions`).

**Rationale**: `apps/audience-web` already uses `react-leaflet` so the pattern and tile URL are established. Reusing the same library avoids a second mapping library.

---

### D9 — Environment variables for Nominatim configuration

**Decision**: Read `NOMINATIM_BASE_URL` (default: `https://nominatim.openstreetmap.org`), required non-empty `NOMINATIM_USER_AGENT`, optional `NOMINATIM_CONTACT_EMAIL`, and `NOMINATIM_TIMEOUT_MS` (default 5000, bounded to 1000–15000 ms) from environment. Backend sends the configured user agent, sends the optional contact email through Nominatim's documented `email` query parameter, and aborts requests at the configured timeout. Development and production startup SHALL fail clearly when the user agent is missing; tests MAY use a deterministic safe default fixture. Frontend never knows the upstream URL.

**Rationale**: Allows operators to point to a self-hosted Nominatim or an alternative provider without code changes. Prevents SSRF (the URL is always server-controlled, never client-supplied).

---

### D10 — Explicit geocoding HTTP error mapping

**Decision**: Because the geocoding endpoint deliberately does not use the generic rate-limit interceptor, a location-specific HTTP error mapper SHALL translate `RateLimitExceededError` to HTTP 429 with `Retry-After`, and both `RateLimitStoreUnavailableError` and `GeocodingProviderUnavailableError` to a safe HTTP 503 response. Unknown errors SHALL propagate to the global exception handler.

**Rationale**: Without explicit mapping, application errors thrown inside the cache loader would become HTTP 500 and the required retry metadata would be lost.

---

### D11 — Public cache invalidation and OSM compliance

**Decision**: Coordinate create/update/clear operations SHALL use the existing invalidating concert-write path so public detail cache entries are removed before the mutation returns. Tests SHALL prove that the next public detail read returns the new coordinate pair. List/featured caches need no new coordinate fields and SHALL only be invalidated according to their existing mutation policy.

The picker SHALL show OpenStreetMap attribution beside geocoding results even before a map is rendered and SHALL warn users not to submit personal or confidential material. Both apps SHALL use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, preserve the browser `Referer`, honor normal browser caching, and never prefetch/offline-download tiles. An empty picker may show a configurable Vietnam overview as viewport only, but SHALL render no marker and SHALL not persist coordinates until explicit user selection or map click.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Nominatim public service is best-effort, no SLA | Document clearly; cache aggressively (7 days); return HTTP 503 with graceful form state on failure; architecture supports swapping to a paid provider later |
| Global 1 req/s limit may feel slow if multiple admins search simultaneously | Cache hits are near-instant; the rate limit only applies to upstream calls; a short user-visible loading state is acceptable for a management tool |
| Existing concerts have no coordinates after migration | Expected; audiences see "no map" for those concerts; migration is additive; no backfill |
| Deleting `venue-coordinates.ts` breaks audience map for any concert relying on it | Intentional and correct; those concerts will show "no map" until an organizer sets coordinates; communicate the change |
| Leaflet marker icon broken under Vite without patch | Patch is well-known and applied at component initialization |
| Nominatim `countrycodes=vn` limits results to Vietnam | Acceptable for current scope; can be made configurable without changing the port interface |

## Migration Plan

1. **Deploy database migration first** — additive, no data change; existing API continues to work because new columns are nullable.
2. **Deploy backend** — new `LocationsModule`, extended concert read/write projections, coordinate validation. Old concert create/update requests without coordinates still succeed.
3. **Deploy `@ticketbox/api-types`** — extended schemas; old consumers ignoring new fields continue to work.
4. **Deploy `apps/web`** — `VenueLocationPicker` available; organizers and admins can now set coordinates.
5. **Deploy `apps/audience-web`** — `venue-coordinates.ts` deleted; map shown only for concerts with real coordinates.

**Rollback**: Steps 1–4 are individually rollback-safe. Step 5 (deleting the lookup table) is the only user-visible breaking change; if rolled back, the old fallback behaviour is restored. The database columns can remain in place (nullable, ignored by old code) without issue.

## Open Questions

- **Tile provider for production**: Public OSM tiles have no SLA. This change documents the risk but does not include a tile-provider migration. A production decision on a commercial tile provider (e.g., MapTiler, Stadia) should be tracked as a separate change.
- **`countrycodes=vn` configurability**: Currently designed as a default; making it fully configurable per-request is deferred. If TicketBox expands internationally this becomes a follow-up.
- **Geocoding cache invalidation**: 7-day TTL is passive eviction only. There is no active invalidation trigger. If a venue permanently closes or moves, results may be stale for up to 7 days — acceptable for current use.
