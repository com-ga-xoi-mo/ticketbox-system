## 1. Cache platform module

- [x] 1.1 Create `packages/backend/src/platform/cache/cache.tokens.ts` exporting `CACHE_SERVICE`, and
      a `CacheServicePort` interface (`getOrSet` / `del` / `delByPrefix`) so decorators depend on the
      port, not the concrete Redis class (enables the unit-test layer).
- [x] 1.2 Implement `RedisCacheService` (`redis-cache.service.ts`) injecting `REDIS_CLIENT` with
      `getOrSet<T>(key, ttlSeconds, loader)`, `del(key)`, and `delByPrefix(prefix)`; JSON serialize
      values. `delByPrefix` MUST use `SCAN` (cursor loop) + pipelined `DEL` — never `KEYS`. If
      `loader()` throws, propagate the error and cache nothing (404/transient errors are not memoized).
- [x] 1.3 Add a `get`-then-`SETNX` mutex (`lock:{key}`, `NX PX 1000`) around the cache-miss path so
      only one caller runs `loader()`. Winner writes the value cache, THEN `DEL`s the lock. Losers
      poll the value key ~25ms × up to ~10 attempts; on hit reuse it, on exhaustion fall through to
      their own `loader()` (no tight spin-loops).
- [x] 1.4 Wrap all Redis calls fail-open: on any *Redis* error, log and fall through to `loader()` /
      no-op (distinct from loader errors in 1.2, which propagate).
- [x] 1.5 Create `cache.module.ts` (`@Global`) providing and exporting `CACHE_SERVICE`; register it
      in `BackendCoreModule` (or app composition) alongside `RedisModule`.
- [x] 1.6 Add a shared cache-key helper under `concert-management` that builds the **full** namespaced
      keys (`ticketbox:cache:concert:list` / `:detail:{slug}` / `:availability:{slug}`) and the flush
      prefix `ticketbox:cache:concert:`. The service stores keys verbatim; reads and invalidation both
      go through this helper so keys/prefixes always match.

## 2. Cache the public read paths (decorator pattern)

- [x] 2.1 Create `CachingListPublicConcertsUseCase` decorator wrapping the real use-case + `CACHE_SERVICE`
      (key `concert:list`, TTL 60s); rewire its factory in `concert-management.module.ts` to inject the
      cache and keep the same provider token (controller unchanged).
- [x] 2.2 Create `CachingGetPublicConcertDetailUseCase` decorator (key `concert:detail:{slug}`, TTL 60s);
      rewire its factory the same way.
- [x] 2.3 Create `CachingGetConcertAvailabilityUseCase` decorator (key `concert:availability:{slug}`,
      TTL 5s); rewire its factory the same way.
- [x] 2.4 Ensure decorators store/return the JSON-serialized DTO (Date fields round-trip as ISO
      strings — no domain use-case takes a cache dependency).

## 3. Invalidate the catalog cache on admin writes (prefix-flush via decorator)

- [x] 3.1 Add a small cache-invalidation helper that flushes the catalog namespace via the key-helper
      (task 1.6): a single `delByPrefix('ticketbox:cache:concert:')` — the `concert:` prefix is the
      parent of the list, detail, and availability keys, so one SCAN pass clears all three.
- [x] 3.2 Wrap the concert write use-cases (create / update / cancel / publish) with an invalidation
      decorator that calls the helper after a successful write — keeping the domain use-cases pure.
- [x] 3.3 Wrap the ticket-type write use-cases (create / update / archive) the same way (they carry no
      slug, so the prefix-flush covers them correctly).

## 4. Observability

- [x] 4.1 Log cache hit/miss (and lock-wait) in `RedisCacheService` with the key namespace.
- [x] 4.2 Add a hit/miss counter usable as demo evidence for the catalog-caching requirement.

## 5. Tests

### 5a. Decorator layer — pure unit, in-memory fake `CacheServicePort` (default `vitest run`, no Redis)

- [x] 5.1 Build an in-memory fake `CacheServicePort` (a `Map` honoring `getOrSet`/`del`/`delByPrefix`)
      for use by the decorator tests.
- [x] 5.2 Test: repeated read through a caching decorator hits cache and calls the wrapped use-case
      (loader) only once.
- [x] 5.3 Test: fail-open — when the cache service throws on read, the decorator still returns the
      wrapped use-case's result.
- [x] 5.4 Test: exceptions are not cached — when the wrapped use-case throws (e.g.
      `PublicConcertNotFoundError`), the decorator propagates it and stores nothing.
- [x] 5.5 Test: a concert write and a ticket-type write each trigger the invalidation flush so the
      next read re-loads (cover a slug rename too).
- [x] 5.6 Test: cached response shape equals the live response shape (Date fields as ISO strings).

### 5b. `RedisCacheService` layer — integration against docker Redis, skipped when `REDIS_URL` absent

- [x] 5.7 Test: true thundering herd — many concurrent `getOrSet` misses on the same key invoke
      `loader()` exactly once (SETNX mutex).
- [x] 5.8 Test: a key expires after its TTL and the next `getOrSet` re-runs `loader()`.
- [x] 5.9 Test: `delByPrefix` removes all matching keys via `SCAN` and leaves others intact.

## 6. Docs

- [x] 6.1 Note the tiered-TTL strategy, mutex, fail-open, and the reason availability uses short-TTL
      refresh (not event invalidation) in `design.md` / README caching section.
