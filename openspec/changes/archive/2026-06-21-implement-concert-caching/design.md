## Context

The backend is a NestJS monorepo (`apps/api` → `@ticketbox/backend` in `packages/backend`) using a
hexagonal layout. The public catalog is served by three read use-cases in `concert-management`:
`ListPublicConcertsUseCase`, `GetPublicConcertDetailUseCase`, and `GetConcertAvailabilityUseCase`.
Each currently hits PostgreSQL on every request.

The platform already provides a global `REDIS_CLIENT` (ioredis, `@Global`, lazy connect, error-
tolerant) via `platform/redis`, and `platform/rate-limiting` demonstrates the project convention of
hand-rolling a Redis-backed store (Lua/atomic ops) rather than pulling in an abstraction.

Inventory-changing events relevant to availability live in Member 3's `ordering` module:
`OrderPaid` / `OrderExpired` are emitted via `TransitionOrderStatusUseCase → ORDER_EVENT_PUBLISHER`,
but reservation creation (`CreateOrderUseCase`) emits **no** event. The `ORDER_EVENT_PUBLISHER` is
bound to a single `useClass` (no composite). This shapes the central decision below.

## Goals / Non-Goals

**Goals:**
- Serve concert list, detail, and availability from Redis with tiered TTLs.
- Keep browsing available under sale-spike load and when Redis is degraded (fail-open).
- Prevent a thundering herd of DB queries when a short-TTL key expires.
- Invalidate list/detail on admin concert writes, entirely within `concert-management`.
- Produce hit/miss evidence for the `observability` requirement.

**Non-Goals:**
- No event-driven invalidation hook into `ordering` (no edit to `order.module.ts`).
- No new external dependency (no `@nestjs/cache-manager`).
- No frontend changes; no API response-shape changes; no DB schema changes.
- Not a rate-limiting change (that is Member 3's `implement-rate-limiting`).

## Decisions

### Decision 1: Hand-rolled `RedisCacheService` on `REDIS_CLIENT`
Build `platform/cache/{cache.tokens.ts, redis-cache.service.ts, cache.module.ts}` exposing
`getOrSet<T>(key, ttlSeconds, loader)`, `del(key)`, and `delByPrefix(prefix)`. Values are JSON-
serialized.

- **Why:** matches the existing rate-limiting convention, adds zero dependencies, and keeps full
  control over fail-open and mutex behavior.
- **Alternative considered:** `@nestjs/cache-manager` + ioredis store. Rejected — adds a dependency,
  diverges from repo convention, and hides the mutex/fail-open logic we need to demonstrate.
- **`delByPrefix` MUST use `SCAN` (cursor loop) + pipelined `DEL`, never `KEYS`.** `KEYS prefix*`
  is O(N) and blocks the Redis event loop in production; `SCAN` iterates non-blocking.
- **Exceptions are never cached.** If `loader()` throws (e.g. `PublicConcertNotFoundError`),
  `getOrSet` propagates the error unchanged and writes nothing — so 404 behavior is preserved and a
  transient failure is not memoized. (Distinct from fail-open, which handles *Redis* errors, not
  loader errors.)

### Decision 1b: Key namespace is owned by a single key-builder helper
A key-builder helper (under `concert-management`) produces the **full** key including the
`ticketbox:cache:` namespace prefix (mirrors `redis-token-bucket.store` building the full
`ticketbox:rate-limit:…` key). `RedisCacheService` stores the key verbatim — it does NOT prepend a
prefix. Reads and the invalidation prefix-flush both call this helper so keys and prefixes always
match. Canonical keys:
- `ticketbox:cache:concert:list`
- `ticketbox:cache:concert:detail:{slug}`
- `ticketbox:cache:concert:availability:{slug}`
- prefix for flush: `ticketbox:cache:concert:`

### Decision 2: Tiered TTL per data type
| Data         | Key                                          | TTL  |
|--------------|----------------------------------------------|------|
| list         | `ticketbox:cache:concert:list`               | 60s  |
| detail       | `ticketbox:cache:concert:detail:{slug}`      | 60s  |
| availability | `ticketbox:cache:concert:availability:{slug}`| 5s   |

- **Why:** list/detail change only on admin writes (rare) → longer TTL + explicit invalidation.
  Availability changes continuously during a sale → a short TTL self-refreshes cheaply.

### Decision 3: Availability uses short-TTL refresh, NOT event invalidation
Availability is a *display snapshot*, not the oversell guard (the guard is the row-level lock inside
Member 3's reservation transaction). The spec permits "invalidate **or refresh**"; a 5s TTL is the
"refresh" path.

- **Why:** under 100k concurrent buyers, deleting the availability key on every reservation would
  cause cache thrashing — every write forces a DB re-read, making the cache worse than useless. A
  fixed short TTL caps DB reads at ~12/min regardless of traffic while keeping staleness ≤5s.
- **Alternative considered:** composite `ORDER_EVENT_PUBLISHER` to invalidate on `OrderPaid`/
  `OrderExpired`. Rejected — it edits Member 3's `order.module.ts` (cross-team coupling + merge
  risk), still cannot cover reservation (no event exists), and yields thrashing under load anyway.

### Decision 4: Mutex (SETNX) around the cache-miss critical section
Inside `getOrSet`, on a miss: `SET lock:{key} 1 NX PX 1000`. The single winner runs `loader()`,
writes the value cache, then `DEL`s the lock (value written *before* lock release). Losers poll the
value key on a bounded schedule and reuse the populated value.

- **Loser wait policy (explicit):** poll the value key every ~25ms for up to ~10 attempts
  (≈250ms, < lock PX). If the value is present, return it; if the loop exhausts (winner slow/dead),
  the loser falls through to run its own `loader()` — correctness preserved, only the herd benefit is
  lost in that rare case. No tight spin-loops.
- **Why:** a short TTL means many requests can miss simultaneously at expiry. The mutex protects the
  critical section so only one request touches the database (thundering-herd prevention).
- **Alternative considered:** stale-while-revalidate. Reasonable but more moving parts; the SETNX
  mutex is simpler and sufficient at this scale.

### Decision 5: Fail-open everywhere
Every Redis call in `getOrSet` / `del` / `delByPrefix` is wrapped so any error logs and falls through
to `loader()` (the DB read) or a no-op for invalidation. This directly satisfies the
graceful-degradation scenario.

### Decision 6: Caching is applied via decorators, NOT inside the domain use-cases
The catalog use-cases (`ListPublicConcertsUseCase`, `GetPublicConcertDetailUseCase`,
`GetConcertAvailabilityUseCase`) are plain classes constructed by `useFactory` with constructor
injection. Caching is added with a **decorator class per read use-case** that implements the same
shape and wraps the real use-case + `CACHE_SERVICE`. The decorator is wired in the factory; the
controller keeps injecting the same provider token, so controllers do not change.

```ts
provide: ListPublicConcertsUseCase,
inject: [PUBLIC_CONCERT_CATALOG, CACHE_SERVICE],
useFactory: (catalog, cache) =>
  new CachingListPublicConcertsUseCase(new ListPublicConcertsUseCase(catalog), cache),
```

- **Why:** keeps domain use-cases pure (no Redis/cache dependency leaking into the application core),
  matches the existing hexagonal style, and is the natural fit for the factory wiring already used.
- **Alternative considered:** inject `CACHE_SERVICE` directly into the existing use-cases. Rejected —
  pollutes the domain layer with an infrastructure concern.

### Decision 7: Invalidate with a prefix-flush from a write decorator, NOT by slug
Read keys use `slug` (`concert:detail:{slug}`, `concert:availability:{slug}`), but the write use-cases
operate on `concertId` — and `UpdateConcertUseCase` can even **change** the slug, orphaning the old
key; ticket-type writes carry no slug at all. So invalidation does a prefix flush after any admin
write — a single prefix flush of the catalog namespace. The `concert:` prefix is the parent of every
catalog key, so one flush clears list, detail, and availability in a single `SCAN` pass:

```
// clears ticketbox:cache:concert:list
//        ticketbox:cache:concert:detail:{slug}
//        ticketbox:cache:concert:availability:{slug}
delByPrefix('ticketbox:cache:concert:')
```

This invalidation lives in a **write decorator** (same pattern as Decision 6) wrapping create / update /
cancel / publish concert and the ticket-type write use-cases — keeping the domain use-cases pure.

- **Why:** admin writes are rare, so flushing the whole catalog namespace is cheap and *correct*,
  while per-slug deletion is fragile (id↔slug mismatch, slug renames, no slug on ticket-type writes).
- **Alternative considered:** per-`{slug}` deletion. Rejected — misses the renamed-slug and
  ticket-type-write cases, producing stale cache.

### Decision 8: Cache stores a JSON-serializable DTO; Date fields round-trip as ISO strings
Catalog payloads contain `Date` fields (`startsAt`, `endsAt`, `saleStartsAt`, `saleEndsAt`,
`generatedAt`). `JSON.stringify`→`JSON.parse` turns these into ISO strings, so a cached read returns
strings where a live read returns `Date` objects. Because the HTTP layer already serializes both to
the same ISO wire format, the cache stores/returns the serialized DTO and treats ISO strings as the
canonical cached shape.

- **Why:** the wire contract is already ISO strings; avoiding a Date/`Date`-instance divergence keeps
  cached and live responses byte-identical at the HTTP boundary.
- **Guard:** a test asserts the cached response shape equals the live response shape (no consumer may
  depend on a `Date` *instance* — only on the ISO value). If a consumer ever needs a real `Date`, add
  a JSON reviver in `RedisCacheService`.

### Decision 9: Two-layer testing strategy (no new test dependency)
The repo has **no `ioredis-mock` and no existing test that mocks `REDIS_CLIENT`** (the rate-limiting
Redis store is itself untested). To avoid introducing a dependency or flaky Redis-backed unit tests,
split testing into two layers:

1. **Decorator layer (pure unit, default `vitest run`):** test the caching/invalidation decorators
   against a hand-written in-memory fake `CacheServicePort` (a `Map` with the same `getOrSet` / `del`
   / `delByPrefix` contract). With no Redis, this covers: served-from-cache, the decorator calls its
   loader only once when the value is cached, fail-open propagation, exceptions-not-cached,
   invalidation including a slug rename + a ticket-type write, and live-vs-cached shape equality.
2. **`RedisCacheService` layer (integration, opt-in):** the real SETNX-mutex/TTL behavior — true
   concurrent-miss single-loader, TTL expiry, and `delByPrefix` via `SCAN` — is verified against the
   Redis already provided by `npm run start:deps` (docker), guarded so it is skipped when `REDIS_URL`
   is absent — it must not break the default unit run.

- **Why:** keeps `npm run test` hermetic and dependency-free (honoring "no dependencies added"),
  while still giving real evidence for the mutex/TTL mechanics. Introduce a small
  `CacheServicePort` interface so decorators depend on the port, not the concrete Redis class — this
  is what makes layer 1 possible.
- **Alternative considered:** add `ioredis-mock`. Rejected — new dependency, and its Lua/SET-NX
  fidelity is not guaranteed for the mutex test.

## Risks / Trade-offs

- **Availability staleness up to 5s** → Acceptable: it is display-only; the reservation transaction
  remains the source of truth for oversell. TTL is a single tunable constant.
- **Mutex loser wait could still return a cold value if the loader is very slow** → Mitigation: lock
  PX (1s) bounds the wait; on a still-empty read the loser falls through to its own `loader()`
  (fail-open), so correctness is preserved, only the herd benefit is partially lost in the worst case.
- **Slug↔id mismatch / slug renames on invalidation** → Resolved by Decision 7: a prefix flush of
  the `concert:*` namespace on any admin write sidesteps key derivation entirely.
- **List/detail show a `now`-boundary item up to TTL late** → The read use-cases default `now` and
  filter "upcoming/published"; a concert crossing that boundary can linger up to 60s in list/detail.
  Acceptable for display; availability (the sale-critical view) uses the 5s TTL.
- **Wrapping the use-cases via decorators** → low risk, same module/owner; controllers unchanged
  because the provider token is preserved; covered by tests.

## Migration Plan

Additive only — no schema or contract change. Deploy the new `CacheModule` (global) and the wrapped
use-cases. Rollback = revert the change; reads fall back to direct DB queries with no data impact.
A feature flag is unnecessary because fail-open already degrades to the pre-change behavior.

## Open Questions

- Final availability TTL value (5s assumed; tune against demo load if needed).
- Whether to expose hit/miss counts via the existing health endpoint or log-only (log-only assumed
  sufficient for the observability evidence requirement).
- `CacheModule` registration: make it `@Global` (mirrors `RedisModule`, which is `@Global` and
  exports `REDIS_CLIENT`) so `CACHE_SERVICE` injects anywhere — assumed. Alternatively import it
  explicitly in `ConcertManagementModule` only.

## Implementation Notes (Caching Section)

### Tiered-TTL Strategy

Three catalog endpoints use different TTLs chosen for their data-change frequency:

| Endpoint         | Key                                           | TTL  | Rationale                                            |
|------------------|-----------------------------------------------|------|------------------------------------------------------|
| List             | `ticketbox:cache:concert:list`                | 60s  | Changes only on admin writes (rare); explicitly invalidated |
| Detail (slug)    | `ticketbox:cache:concert:detail:{slug}`       | 60s  | Same — rare admin writes; slug-safe via prefix flush  |
| Availability     | `ticketbox:cache:concert:availability:{slug}` | 5s   | Changes continuously during sale; self-refreshes cheaply |

### Mutex (SETNX) — Thundering-Herd Prevention

On a cache miss `getOrSet` atomically acquires `SET lock:{key} 1 NX PX 1000`. The single winner
runs the DB loader, writes the cached value, and `DEL`s the lock. Losers poll the value key every
~25ms for up to ~10 attempts; on finding the value they reuse it. If the poll exhausts (winner
slow/dead) losers fall through to their own `loader()` — correctness is preserved, only the herd
benefit is partially lost in that rare case.

### Fail-Open Behavior

Every Redis call in `RedisCacheService` (`getOrSet`, `del`, `delByPrefix`) is wrapped in
`try/catch`. On any Redis error the service logs and falls through to `loader()` (for reads) or a
no-op (for invalidation). This means catalog browsing stays available even when Redis is fully
unavailable — the system gracefully degrades to direct DB reads.

**Fail-open is distinct from loader errors.** If `loader()` itself throws (e.g.
`PublicConcertNotFoundError` for an unknown slug), the error propagates unchanged and nothing is
written to the cache (404 behavior is preserved; transient errors are not memoized).

### Why Availability Uses Short-TTL Refresh, Not Event Invalidation

Availability data changes on every reservation, expiration, and payment. Deleting the availability
key on each such event under 100k concurrent buyers would cause cache thrashing — every write
forces a DB re-read, making the cache counterproductive.

A 5s TTL self-refreshes cheaply (≤12 DB reads/min regardless of traffic) while keeping staleness
≤5s — acceptable for a display snapshot. The oversell guard lives in the row-level lock inside the
reservation transaction, not in the cached availability view.

This avoids any cross-team coupling to Member 3's `ordering` module (no edit to `order.module.ts`,
no event-publisher composition).

### Observability

`RedisCacheService` logs `Cache HIT`/`Cache MISS` at debug level with the key and running
counters. The `getHitCount()` / `getMissCount()` accessors on the service instance provide
demo-visible evidence of caching behavior.
