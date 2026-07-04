## 0. Baseline Reconciliation

- [x] 0.1 Confirm `expand-concert-marketplace-management` reports 62/62 tasks complete, run its required backend/web verification, and treat its current contract/form files as the location change baseline; do not overwrite unrelated dirty-worktree changes
- [x] 0.2 Reconcile the baseline with main specs by removing `POST /admin/concerts`, the admin controller's create-only injection/import/handler, `AdminCreateConcertSchema` and export, plus admin-create contract/form tests; retain organizer create and admin update behavior
- [x] 0.3 Add or update authorization/route tests proving admin concert creation is unavailable while organizer creation and admin editing still work

**Verification**: `openspec status --change "expand-concert-marketplace-management" --json`, `npm run build:api-types`, focused admin/organizer controller and contract tests

---

## 1. Shared API Contracts

-[x] 1.1 Extend concert Zod schemas in `packages/api-types/src`: organizer create fields are optional/nullable and omission normalizes to a null pair; organizer/admin update fields are optional/nullable and omission preserves existing values; responses use required nullable fields; add paired-field and range validation and export updated types
-[x] 1.2 Extend protected management concert response schema and public audience concert detail schema to include `latitude: number | null` and `longitude: number | null`
-[x] 1.3 Add strict `LocationSearchQuerySchema`, `LocationSearchResultSchema`, and `LocationSearchResponseSchema` plus inferred types to `@ticketbox/api-types`: trimmed 3–200 character `q`, no unknown query fields, max 5 results, finite/range-checked coordinates, and no `any`
-[x] 1.4 Build and verify shared package: `npm run build:api-types`
-[x] 1.5 Write Zod unit tests covering: valid coordinates, only latitude, only longitude, out-of-range lat, out-of-range lng, both null, create omission normalizes to null, update omission stays omitted, trimmed valid search query, missing/short/long/unknown query input, correct response, missing field, empty results, more than 5 results, non-finite and out-of-range result coordinates

**Verification**: `npm run build:api-types` passes; tests in `packages/api-types` pass

---

## 2. Database Migration

-[x] 2.1 Add `latitude Decimal? @db.Decimal(9,6)` and `longitude Decimal? @db.Decimal(9,6)` columns to the `Concert` model in `prisma/schema.prisma`
-[x] 2.2 Generate and review the Prisma migration: `npm run verify:prisma` (ensure additive, no data change, no backfill)
-[x] 2.3 Confirm migration file is named and placed correctly under `prisma/migrations/`

**Verification**: `npm run verify:prisma` passes; existing concert fixtures continue to work with null coordinates

---

## 3. Concert Repository & Read Projection Updates

-[x] 3.1 Update concert repository write path (`packages/backend/src/concert-management/infrastructure/`) to map `latitude` and `longitude` from Prisma Decimal to `number | null` when reading back created/updated records
-[x] 3.2 Update concert read projections (management and public detail) in `packages/backend/src/concert-management/` to select and expose `latitude` and `longitude`
-[x] 3.3 Update organizer create/update and admin update use-case handlers to accept and persist coordinates; enforce pair validation and range checks; do not grant admin concert creation
-[x] 3.4 Route coordinate create/update/clear through the existing invalidating concert-write decorators and add tests proving the affected public-detail cache key is removed before return and the next read returns fresh coordinates; do not add coordinates to list/featured contracts
-[x] 3.5 Typecheck backend: `npx tsc -p apps/api/tsconfig.app.json --noEmit`

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes

---

## 4. Geocoding Port & Environment Configuration

-[x] 4.1 Create `GeocodingProviderPort` interface (`packages/backend/src/concert-management/domain/ports/geocoding-provider.port.ts` or a new `location-geocoding` module) with `searchLocations(query: string): Promise<LocationResult[]>`
-[x] 4.2 Define `LocationResult` value type: `{ displayName: string; latitude: number; longitude: number }`
-[x] 4.3 Add `NOMINATIM_BASE_URL`, required non-empty `NOMINATIM_USER_AGENT`, optional `NOMINATIM_CONTACT_EMAIL`, and bounded `NOMINATIM_TIMEOUT_MS` (default 5000, range 1000–15000) to `packages/backend/src/platform/config/env.schema.ts`; require the user agent in development/production and use explicit deterministic test fixtures
-[x] 4.4 Add typed getters to `PlatformConfigService`, placeholders to root `.env.example`, and env-schema tests for defaults, invalid timeout, missing production user agent, and test-mode behavior

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes

---

## 5. Nominatim Geocoding Adapter

-[x] 5.1 Implement `NominatimGeocodingAdapter` in `packages/backend/src/location-geocoding/infrastructure/` using native Node 22 `fetch` and `AbortSignal.timeout`; do not add `@nestjs/axios`/`axios`
-[x] 5.2 Adapter sends `GET <NOMINATIM_BASE_URL>/search` with params `format=jsonv2`, `addressdetails=1`, `limit=5`, `countrycodes=vn`, `q=<query>`, optional `email=<NOMINATIM_CONTACT_EMAIL>`, required identifying `User-Agent`, and `Accept-Language: vi,en`; build URL via `URL`/`URLSearchParams`
-[x] 5.3 Validate the untrusted top-level JSON and each result before mapping only `display_name`, `lat`, and `lon`; convert strings to finite in-range numbers, discard malformed result items, cap output at 5, and expose no raw fields
-[x] 5.4 Handle abort, non-2xx response, invalid JSON, malformed top-level payload, and network errors as `GeocodingProviderUnavailableError`; do not expose upstream URL/body/stack trace
-[x] 5.5 Write unit tests with a mocked global `fetch` (no network): URL/params, optional email, headers, valid mapping, malformed item filtering, malformed top-level payload, non-2xx, invalid JSON, empty results, abort timeout, and safe errors

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes; unit tests pass without network

---

## 6. Geocoding Rate Limiting & Cache Wiring

-[x] 6.1 Add `GEOCODING_SEARCH` to `RateLimitPolicy` enum (`packages/backend/src/platform/rate-limiting/rate-limit-policy.ts`) with `capacity: 1`, `refillTokens: 1`, `refillIntervalMs: 1000`, `ttlMs: 5000`, and `failOpen: false`; do NOT add a case to `RateLimitActorKeyService.derive()` — the geocoding policy uses the literal `'global'` actorKey, never a per-user or per-IP value
-[x] 6.2 Inside `SearchLocationsUseCase`, call `rateLimitService.consume(RateLimitPolicy.GEOCODING_SEARCH, 'global')` directly within the `getOrSet` loader (after cache miss is confirmed, immediately before the provider call); do NOT attach the generic `@RateLimit` interceptor to `LocationsController`; Redis/store failure propagates as `RateLimitStoreUnavailableError` → HTTP 503 and never calls the provider
-[x] 6.3 Normalize query with trim + lowercase + collapsed whitespace, hash it using Node `crypto.createHash('sha256')`, and cache under `geocoding:v1:<provider>:<country>:<language>:<sha256>` for 604800 seconds; raw/normalized addresses SHALL NOT appear in Redis keys or cache logs
-[x] 6.4 Extend `CacheServicePort.getOrSet` and `RedisCacheService.getOrSet` with optional `{ lockTtlSeconds?: number }`; retain one-second default for existing callers and use `ceil(NOMINATIM_TIMEOUT_MS / 1000) + 2` from geocoding; update cache fakes while preserving ownership-safe release
-[x] 6.5 Write unit tests: rate-limit not exceeded → one token/provider call; exhausted/store unavailable → no provider call; cache hit consumes no token; `actorKey = 'global'` (not per-user/IP) verified; whitespace/case variants share a hashed key; provider/country/language variants do not; keys/logs omit addresses; custom lock survives a slow provider (poll loop re-enters acquire loop without making a second provider call); existing consumers retain one-second default

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes; unit tests pass

---

## 7. SearchLocationsUseCase & HTTP Endpoint

-[x] 7.1 Implement `SearchLocationsUseCase` in `packages/backend/src/location-geocoding/application/` — build the namespaced SHA-256 cache key, then execute `cache.getOrSet(key, ttl, loader, { lockTtlSeconds })` where the loader consumes one global token and calls the provider
-[x] 7.2 Create `LocationsController` with `GET /locations/search` decorated with JWT guard and ADMIN/ORGANIZER role guard; parse the full query object with shared `LocationSearchQuerySchema`; explicitly do not attach the generic `@RateLimited` interceptor because rate limiting occurs after cache lookup in the use case
-[x] 7.3 Create `LocationGeocodingModule` and register it in the main `BackendCoreModule` or `apps/api`
-[x] 7.4 Implement a location HTTP error mapper: `RateLimitExceededError` → 429 plus `Retry-After`; `RateLimitStoreUnavailableError` and `GeocodingProviderUnavailableError` → generic 503; unknown errors propagate
-[x] 7.5 Write controller/auth integration tests (no real network): ADMIN → 200, ORGANIZER → 200, AUDIENCE → 403, unauthenticated → 401, missing/short/long/unknown query → 400, exhaustion → 429 with `Retry-After`, provider unavailable → 503, limiter-store unavailable → 503, raw internals hidden, and cache hit consumes no limiter token

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes; integration tests pass

---

## 8. Backend Concert API — Coordinate Integration

-[x] 8.1 Update organizer concert create/update HTTP controllers to accept coordinate fields from the request body; delegate pair validation to the Zod schema in `@ticketbox/api-types`
-[x] 8.2 Update admin concert edit HTTP controller similarly
-[x] 8.3 Write persistence/unit integration tests: organizer create with coords, update coords, clear coords with null, update omission preserves existing coords, admin update works but admin create route is absent, public detail returns coords, legacy null coords remain valid, and coordinate mutations invalidate stale public detail cache

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes; tests pass

---

## 9. Admin/Organizer Web — VenueLocationPicker Component

-[x] 9.1 Add `leaflet`, `react-leaflet`, and `@types/leaflet` to `apps/web` package.json and install
-[x] 9.2 Apply Leaflet marker icon Vite fix in a shared setup file imported by the picker component (import default icons from `leaflet/dist/images`, call `L.Icon.Default.mergeOptions`)
-[x] 9.3 Create `apps/web/src/features/concerts/components/VenueLocationPicker.tsx` (or equivalent path) with props: `latitude`, `longitude`, `venueAddress`, `onChange({ latitude, longitude, venueAddress })`
-[x] 9.4 Implement search input + "Tìm địa điểm" button: on click call `GET /locations/search?q=<input>`; show loading, empty, and error states; prevent concurrent requests
-[x] 9.5 Implement results list: clicking a result sets `venueAddress = displayName`, `latitude`, `longitude`, centers map, places marker — does NOT touch `venueName`
-[x] 9.6 Implement Leaflet map: show marker at current `latitude`/`longitude`; marker draggable — drag/click updates `latitude`/`longitude` only
-[x] 9.7 Implement "Xóa vị trí" button: sets both coordinates to null, removes marker
-[x] 9.8 For an unset location, render no marker and persist no coordinates; any initial Vietnam overview is viewport-only until a search result or explicit map click
-[x] 9.9 Use the canonical `https://tile.openstreetmap.org/{z}/{x}/{y}.png` endpoint, preserve normal browser Referer/cache behavior, and render visible OpenStreetMap attribution beside the search/results surface even before a map marker exists
-[x] 9.10 Show concise guidance not to submit personal or confidential material to the public geocoder; do not add prefetch or offline tile behavior

**Verification**: `npm --workspace @ticketbox/web run typecheck` and `npm --workspace @ticketbox/web run build` pass

---

## 10. Admin/Organizer Web — Form Integration

-[x] 10.1 Integrate `VenueLocationPicker` into the organizer concert create form (`apps/web`)
-[x] 10.2 Integrate `VenueLocationPicker` into the organizer concert edit form (edit form loads and displays existing coordinates on mount)
-[x] 10.3 Integrate `VenueLocationPicker` into the admin concert edit form
-[x] 10.4 Ensure coordinate values are included in the create/update API request payloads sent to the backend
-[x] 10.5 Write frontend unit tests for `VenueLocationPicker`: no request on typing only; explicit search sends once; results and attribution displayed; privacy guidance present; selecting result updates address/coordinates but not venueName; unset viewport creates no marker/coordinates; map click/drag updates coordinates; clear sets null pair; 429/503 error retains form state; edit form shows saved location; organizer create/edit and admin edit work without an admin create surface

**Verification**: `npm --workspace @ticketbox/web run typecheck`, `npm --workspace @ticketbox/web run test`, and `npm --workspace @ticketbox/web run build` pass

---

## 11. Audience Web — Map Migration

-[x] 11.1 Update the public concert detail API client in `apps/audience-web` to include `latitude` and `longitude` from the response (via updated `@ticketbox/api-types` types)
-[x] 11.2 Update `EventDetailPage.tsx` and `VenueMapModal.tsx` in `apps/audience-web/src/features/concerts/` to use `concert.latitude` and `concert.longitude` from the API response
-[x] 11.3 Hide the map / "Xem bản đồ" button when either coordinate is null; still display `venueName`, `venueAddress`, `city`
-[x] 11.4 Remove `venue-coordinates.ts` file entirely; remove all imports of it
-[x] 11.5 Remove the HCMC fallback coordinate constant and any `getVenueCoordinates` calls
-[x] 11.6 Replace the current `{s}.tile.openstreetmap.org` URL with `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; preserve visible attribution, normal browser Referer/cache behavior, and no prefetch/offline behavior
-[x] 11.7 Write audience unit tests: concert with coords → marker shown using canonical tile URL; concert without coords → no map and no HCMC fallback; attribution visible; no venue-coordinates import exists

**Verification**: `npm --workspace @ticketbox/audience-web run typecheck`, `npm --workspace @ticketbox/audience-web run test`, and `npm --workspace @ticketbox/audience-web run build` pass

---

## 12. Backend Unit & Contract Tests

-[x] 12.1 Ensure all `NominatimGeocodingAdapter` unit tests (from task 5.5) are complete and passing with no real network calls
-[x] 12.2 Ensure all rate-limit and cache unit tests (from tasks 6.4–6.5) are complete and passing
-[x] 12.3 Ensure all `LocationsController` auth/error-mapping tests (from tasks 7.4–7.5) are complete and passing
-[x] 12.4 Ensure all concert persistence tests (from task 8.3) are complete and passing
-[x] 12.5 Ensure all `@ticketbox/api-types` Zod schema tests (from task 1.5) are complete and passing
-[x] 12.6 Confirm all backend tests use fake `GeocodingProviderPort` or HTTP mocks — no real Nominatim calls

**Verification**: `npx tsc -p apps/api/tsconfig.app.json --noEmit` passes; all backend test suites pass

---

## 13. Frontend Tests

-[x] 13.1 Ensure all `VenueLocationPicker` unit tests (from task 10.5) are complete and cover all specified scenarios
-[x] 13.2 Ensure all audience map unit tests (from task 11.7) are complete
-[x] 13.3 Run full frontend test suites: `npm --workspace @ticketbox/web run test` and `npm --workspace @ticketbox/audience-web run test`

**Verification**: Both frontend test suites pass

---

## 14. Integration & E2E Tests

-[x] 14.1 Create backend API E2E test with a fake `GeocodingProviderPort`: authenticated organizer search → save selected coordinates → public detail returns the saved pair; do not attempt to render React in backend E2E
-[x] 14.2 Create integration test covering admin access: admin searches → saves coordinates → public detail correct
-[x] 14.3 Create integration test for organizer ownership: organizer A cannot update coordinates on organizer B's concert
-[x] 14.4 Create integration test for legacy concert: concert with null coordinates returns `latitude: null`, `longitude: null`; audience page does not render map
-[x] 14.5 Verify no integration or E2E test calls real Nominatim network
-[x] 14.6 Cover the final public-detail-response → audience-map-render step in the audience Vitest component suite using a mocked API fixture; browser automation/Playwright is not introduced by this change

**Verification**: `npm run test:e2e` passes when test database is available; no real Nominatim calls in any test

---

## 15. Documentation & Policy Verification

-[x] 15.1 Add documented placeholders for `NOMINATIM_BASE_URL`, `NOMINATIM_USER_AGENT`, `NOMINATIM_CONTACT_EMAIL`, and `NOMINATIM_TIMEOUT_MS` to root `.env.example`
-[x] 15.2 Document in a developer note or ADR: browser → TicketBox API → Nominatim; explicit-search-only behavior; shared 1 req/s limit; 7-day cache; provider timeout; location-specific error mapping; Nominatim and tile attribution; canonical tile URL; no personal/confidential queries; no prefetch/offline tiles; public OSM infrastructure has no SLA
-[x] 15.3 Document how to swap Nominatim or tile provider in future (change `NOMINATIM_BASE_URL` / update adapter registration)
-[x] 15.4 Document how legacy concerts without coordinates are handled (null coordinates, no map shown, no backfill)
-[x] 15.5 Run `openspec validate --changes "add-concert-location-management"` and resolve any validation errors

**Verification**: `openspec validate --changes "add-concert-location-management"` passes; `.env.example` updated
