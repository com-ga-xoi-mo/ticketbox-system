## Why

Public concert detail responses currently risk serving ticket availability for the longer static
cache TTL, so audience users can see stale ticket counts even though availability has its own
short-lived cache. The list response should stay lightweight and keep its current shape, including
`availabilitySummary`, but it does not need near-real-time availability. At the same time, the
production asset contract should be explicit: audience clients should render asset `publicUrl`
values directly through CDN/object storage rather than proxying images through the backend.

## What Changes

- Keep public `GET /concerts` cached as static list data with its existing response shape, including
  `availabilitySummary`, without treating that summary as a near-real-time freshness guarantee.
- Compose fresh short-TTL availability snapshots into public `GET /concerts/:slug` responses before
  returning them, so `ticketTypes[].availableQuantity` reflects the availability cache window.
- Preserve the existing public response shapes for concert list, concert detail, and
  `GET /concerts/:slug/availability`.
- Keep public catalog visibility restricted to upcoming published concerts; draft, cancelled, ended,
  or past concerts remain hidden and return not found for slug detail/availability requests.
- Clarify the production-first asset contract: public concert responses include asset metadata with
  `id` and `publicUrl`; audience clients render `publicUrl` directly when present and do not call a
  separate "get image URL" API.
- Keep `GET /assets/:id` as a backend-streaming fallback/debug/development path, not the primary
  production image delivery path.
- No database schema changes and no new public endpoint.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `concert-management`: Public detail responses SHALL compose short-TTL availability while public
  list responses keep their existing shape and static-cache freshness semantics.
- `platform-protection`: Concert catalog caching SHALL distinguish static list/detail data from
  short-lived availability data and compose availability into detail reads at read time.
- `cloud-object-storage`: Production public asset URLs SHALL remain the primary delivery mechanism
  for poster and seating map assets, with backend asset streaming retained as fallback.

## Impact

- Affected APIs:
  - `GET /concerts`
  - `GET /concerts/:slug`
  - `GET /concerts/:slug/availability`
  - `GET /assets/:id` contract clarification only
- Affected code:
  - public concert catalog repository/use-cases/cache decorators
  - public concert HTTP adapter tests or catalog repository tests
  - upload poster and seating map tests if asset `publicUrl` persistence needs explicit coverage
- Affected systems: Redis-backed catalog cache, public audience API contract, and production asset
  delivery through S3/CDN public URLs.
- No new dependency, Prisma schema, or local `/storage` static-serving requirement.
