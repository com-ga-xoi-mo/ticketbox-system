## 1. Public Catalog Cache Composition

- [x] 1.1 Identify the current public catalog list, detail, and availability read paths and the cache keys/TTLs used by each path.
- [x] 1.2 Keep public list caching as static list data while preserving the existing `availabilitySummary` field in the response.
- [x] 1.3 Ensure `GET /concerts` does not need short-TTL availability composition for `availabilitySummary`.
- [x] 1.4 Refactor public detail caching so static detail data is cached separately from ticket availability.
- [x] 1.5 Compose short-TTL availability into `GET /concerts/:slug` by matching `ticketTypes[]` with availability rows by ticket type id.
- [x] 1.6 Keep `GET /concerts/:slug/availability` available with the short-TTL availability behavior.
- [x] 1.7 Ensure missing availability rows do not fail detail responses and preserve a safe fallback value.

## 2. Public Visibility and Asset Contract

- [x] 2.1 Verify public list, detail, and availability queries still only expose concerts with `status = PUBLISHED` and `startsAt >= now`.
- [x] 2.2 Verify public detail and availability return not found for draft, cancelled, ended, or past concert slugs.
- [x] 2.3 Ensure public catalog asset metadata includes `id`, `publicUrl`, `kind`, `status`, `originalName`, `contentType`, and `sizeBytes` where poster or seating map assets are present.
- [x] 2.4 Confirm public catalog JSON responses return asset URL strings and do not embed binary image or SVG content.
- [x] 2.5 Keep `GET /assets/:id` streaming active poster and seating map bytes as a fallback/debug/development path.
- [x] 2.6 Confirm poster and seating map upload flows persist `publicUrl` from `ObjectStoragePort.getPublicUrl(storageKey)`.
- [x] 2.7 Confirm S3 public URLs are derived from `S3_PUBLIC_BASE_URL` and no production URL is hardcoded.

## 3. Tests

- [x] 3.1 Add or update public catalog cache tests proving repeated detail reads reuse static cache while refreshing/composing short-TTL availability.
- [x] 3.2 Add or update public catalog cache tests proving list responses keep `availabilitySummary` but do not require short-TTL availability composition.
- [x] 3.3 Add or update tests proving missing availability data does not fail a public detail response.
- [x] 3.4 Add or update public visibility tests for draft, cancelled, ended, and past concert slugs on detail and availability endpoints or repository methods.
- [x] 3.5 Add or update asset contract tests proving public catalog asset metadata includes `id` and `publicUrl` without binary content.
- [x] 3.6 Add or update upload/storage tests proving poster and seating map uploads persist `publicUrl` from storage and S3 uses `S3_PUBLIC_BASE_URL`.

## 4. Verification

- [x] 4.1 Run the focused public concert catalog and cache/decorator test suites.
- [x] 4.2 Run the focused storage/upload tests touched by the asset URL contract.
- [x] 4.3 Run `npm run build`.
- [x] 4.4 Run `openspec validate --changes "compose-public-concert-availability-and-assets"`.
