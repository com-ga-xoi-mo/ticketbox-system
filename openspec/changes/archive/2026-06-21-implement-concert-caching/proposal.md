## Why

The public concert catalog (list, detail, availability) is read on every browse and on every
checkout attempt. During a sale spike — tens of thousands of users hitting the same concert — each
read currently goes to PostgreSQL, putting the database on the critical path of both browsing and
checkout. The `platform-protection` target spec requires caching the catalog with differentiated
TTL/invalidation, and requires that browsing keeps working even under checkout pressure or when
Redis/payment is degraded. This change implements that caching layer.

## What Changes

- Add a reusable, fail-open Redis cache layer (`RedisCacheService` / `CacheModule`) built on the
  existing `REDIS_CLIENT`, following the same hand-rolled Redis-store convention as rate limiting.
- Cache the three public read paths with tiered TTLs:
  - concert **list** — TTL 60s, invalidated on admin concert writes.
  - concert **detail** — TTL 60s per slug, invalidated on admin writes to that concert.
  - concert **availability** — short TTL 5s, self-refreshing (no event coupling to ordering).
- Add a **mutex (SETNX lock)** inside `getOrSet` to protect the cache-miss critical section,
  preventing a thundering herd of DB queries when a short-TTL key expires under load.
- **Fail-open**: any Redis error falls through to the underlying database read, so catalog
  browsing stays available when Redis is degraded.
- Invalidate list/detail caches from the concert-management admin write use-cases
  (create/update/cancel/publish concert, ticket-type writes) — entirely within this module.
- Add cache hit/miss logging/metrics as technical evidence.
- Scope is **backend only** (`packages/backend`); `apps/web` is unchanged and benefits transparently.
- **Not in scope**: no event-based invalidation hook into the ordering module; the 5s availability
  TTL satisfies the "refresh" half of the spec's invalidation requirement without touching
  Member 3's code.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `platform-protection`: Refine the existing **Concert catalog caching** requirement with concrete,
  testable behavior — tiered TTL caching, mutex-protected cache-miss (thundering-herd prevention),
  and fail-open degradation when Redis is unavailable.

## Impact

- **New code**: `packages/backend/src/platform/cache/` (`RedisCacheService`, `CacheModule`,
  `cache.tokens.ts`).
- **Modified code**: `concert-management` read use-cases (list / detail / availability) wrapped with
  `getOrSet`; concert-management admin write use-cases call cache invalidation.
- **Dependencies**: none added — reuses `REDIS_CLIENT` (ioredis) already provided by `platform/redis`.
- **No change** to: ordering/payment modules, API response shapes, frontend, or the database schema.
- **Cross-team**: none required — change is independent and mergeable on its own.
