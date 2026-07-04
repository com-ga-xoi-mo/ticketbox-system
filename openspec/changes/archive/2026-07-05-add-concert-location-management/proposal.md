## Why

Concerts currently store only `venueName`, `venueAddress`, and `city` — no geographic coordinates. The audience app hard-codes venue coordinates by matching venue names, falling back to the centre of Ho Chi Minh City for unknown venues. This produces incorrect or misleading maps. Admins and organizers have no way to set the actual venue location, and the hack grows more brittle with every new venue. Replacing it with real, persisted coordinates — sourced through an OpenStreetMap-backed geocoding flow — removes the guesswork and gives audiences an accurate map on every concert that has coordinates set.

## What Changes

- **Baseline reconciliation**: This change builds on the implemented `expand-concert-marketplace-management` contracts and forms. Before location work begins, verify that change's completed implementation as the working baseline and resolve its accidental admin-create drift by removing `POST /admin/concerts`, `AdminCreateConcertSchema`, and related tests. Concert creation remains organizer-only as required by the main specs.
- **Database**: Add nullable `latitude Decimal?(9,6)` and `longitude Decimal?(9,6)` columns to the `Concert` table via an additive, backward-compatible migration. No backfill. Concert records without coordinates remain valid.
- **Shared contracts (`@ticketbox/api-types`)**: Extend concert create/update/read schemas and the public audience detail schema to include `latitude: number | null` and `longitude: number | null`. Add a new geocoding search contract for `GET /locations/search?q=<query>`.
- **Backend geocoding**: Introduce a `GeocodingProviderPort` abstraction, a native Node `fetch`-based `NominatimGeocodingAdapter` (calling `https://nominatim.openstreetmap.org`), application-wide 1 req/s rate limiting (Redis-backed), query-level caching (7-day TTL), explicit timeout/error mapping, and a `SearchLocationsUseCase` exposed via a JWT-protected `GET /locations/search` endpoint (ADMIN and ORGANIZER only).
- **Admin/organizer web app (`apps/web`)**: Add a `VenueLocationPicker` component (Leaflet map, address search, result list, marker drag) to organizer create/edit and admin edit forms. Concert creation remains organizer-only. Add `leaflet` and `react-leaflet` dependencies.
- **Audience web app (`apps/audience-web`)**: Remove hard-coded `venue-coordinates.ts` and the HCMC fallback. `VenueMapModal` and related components use the `latitude`/`longitude` returned by the public detail API. If coordinates are absent, hide the map; still display `venueName`, `venueAddress`, and `city`. Both web apps use the current canonical OSM tile URL and visible attribution.
- **BREAKING (soft)**: After this change, venue coordinates are expected to come from the database. The hard-coded lookup table is deleted. Concerts without persisted coordinates will not show a map — this is the correct behaviour.

## Capabilities

### New Capabilities

- `location-geocoding`: Backend geocoding proxy — Nominatim adapter, rate limiting, caching, `SearchLocationsUseCase`, and the protected `GET /locations/search` endpoint.

### Modified Capabilities

- `concert-management`: Concert create/update/read now support `latitude`/`longitude`; coordinate validation rules added; public detail response now includes coordinates.
- `web-concert-management`: Organizer create/edit and admin edit forms gain a `VenueLocationPicker` (address search, interactive map, marker drag, clear-location action); no admin create UI is introduced.
- `audience-event-detail`: Map section uses persisted coordinates from the API; fake coordinate lookup and HCMC fallback removed; map hidden when coordinates are absent.
- `shared-api-contracts`: Concert and geocoding search schemas extended in `@ticketbox/api-types`.
- `platform-protection`: Application-wide 1 req/s geocoding rate limit added to the Redis-backed rate-limiting policy set.

## Impact

- **`prisma/schema.prisma`** — new nullable columns on `Concert`; new migration file.
- **`packages/api-types`** — new and updated Zod schemas and inferred TypeScript types.
- **`packages/backend/src`** — new `GeocodingProviderPort`, `NominatimGeocodingAdapter`, `SearchLocationsUseCase`, `LocationsController`, Redis cache and rate-limit wiring.
- **`apps/api`** — module registration for geocoding.
- **`apps/web`** — new `VenueLocationPicker` component; `leaflet` and `react-leaflet` added as dependencies; concert create/edit forms updated.
- **`apps/audience-web`** — `venue-coordinates.ts` deleted; `VenueMapModal` and `EventDetailPage` updated to consume API coordinates.
- **Environment variables**: `NOMINATIM_BASE_URL`, `NOMINATIM_USER_AGENT`, `NOMINATIM_CONTACT_EMAIL`, `NOMINATIM_TIMEOUT_MS`.
- **No Google Maps API, no API key, no billing.**
- **Nominatim rate-limit** must be respected globally across all API instances (Redis-backed).
- **OSM tile and Nominatim public infrastructure** have no SLA — document this clearly.
