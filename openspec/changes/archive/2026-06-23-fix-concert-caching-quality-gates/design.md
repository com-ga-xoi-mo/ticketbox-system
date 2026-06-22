## Context

The archived `2026-06-21-implement-concert-caching` change introduced a Redis cache-aside layer for
public concert list, detail, and availability reads. The normal cache-hit and fast cache-miss path
works, and Redis integration tests pass when Redis is available.

Two problems remain. First, the ticket-type application tests are stale: their repository mock no
longer satisfies `ConcertWriteRepositoryPort`, and they assert Nest HTTP exceptions even though the
application layer throws domain errors. Second, the cache-miss mutex has a bounded loser wait that
falls through directly to `loader()` after polling. If the original winner is slower than the wait
window, many losers can call the database together.

## Goals / Non-Goals

**Goals:**

- Restore `npm run build` by keeping test mocks in sync with the current port contract.
- Align ticket-type application tests with the domain-error contract.
- Keep HTTP exception coverage at the HTTP mapper/controller boundary if coverage is needed.
- Harden the Redis mutex so only a lock owner may run the loader while Redis locking is healthy.
- Ensure expired or superseded winners cannot delete another request's lock or overwrite newer cache
  data.
- Strengthen Redis integration tests so their names, comments, and assertions match the behavior
  they prove.

**Non-Goals:**

- No changes to public API response shapes.
- No frontend changes.
- No Prisma schema or migration changes.
- No new Redis dependency or cache library.
- No event-driven availability invalidation from the ordering module.

## Decisions

### Decision 1: Ticket-type use-case tests assert domain errors

`CreateTicketTypeUseCase`, `UpdateTicketTypeUseCase`, and `ArchiveTicketTypeUseCase` live in the
application layer. They should not throw `BadRequestException` or `ConflictException`; those belong
to the HTTP adapter boundary.

Update `ticket-type-write.use-cases.spec.ts` so invalid inputs assert the domain errors actually
raised by the use-cases:

- `InvalidTicketPriceError`
- `InvalidTicketQuantityError`
- `InvalidSalePeriodError`
- `TicketTypeCodeAlreadyExistsError`
- `TicketTypeHasSoldTicketsError`

The stale mock should also include `findConcertsByOwner` and `findAllConcerts` so the mock satisfies
`ConcertWriteRepositoryPort`.

**Alternative considered:** Change use-cases to throw Nest exceptions. Rejected because it would
mix HTTP concerns into the application layer and conflict with the existing mapper/controller style.

### Decision 2: Use token-owned Redis locks

Each lock acquisition writes a unique token as the lock value:

```text
SET lock:{key} {token} NX PX {lockTtlMs}
```

The token is owned by the request that acquired the lock. A winner may only write the cache or
release the lock if Redis still shows the same token for `lock:{key}`.

This prevents two stale-winner bugs:

```text
A gets lock token-a and starts a slow loader
token-a expires
B gets lock token-b and populates cache
A finishes late
```

Without token checks, A could delete B's lock or overwrite B's cache. With token checks, A can still
return its loaded value to its own caller, but it must not mutate Redis after it no longer owns the
lock.

### Decision 3: Cache write and lock release are atomic

Use Lua scripts for token-checked Redis mutations:

- `set cache value with TTL and delete lock only if lock token matches`
- `delete lock only if lock token matches` for loader-error cleanup

The cache write must happen before lock release in the same token-checked operation. This avoids a
race where a lock expires or changes owner between a separate `GET lock`, `SET cache`, and `DEL
lock` sequence.

**Alternative considered:** Do `GET lock`, then `SET cache`, then `DEL lock` with separate Redis
commands. Rejected because lock ownership can change between commands.

### Decision 4: Losers reacquire instead of falling through directly

Losers still poll the value key on a short bounded cadence, but when a loser exhausts a wait window
without seeing the cache value, it must try to acquire `lock:{key}` again. Only the loser that
successfully reacquires the lock may run `loader()`.

Redis-healthy behavior:

```text
miss -> try lock
  acquired -> run loader as owner
  not acquired -> poll cache for a bounded window
    value appears -> return cached value
    no value -> loop back and try lock again
```

The service should not let all losers call `loader()` merely because the first wait window expired.
This changes the fallback from "any exhausted loser may load" to "only a lock owner may load".

Redis-error behavior remains fail-open: if Redis read, lock acquisition, polling, token script, or
write operations fail due to Redis errors, the service may call `loader()` directly so catalog
browsing remains available during Redis degradation.

### Decision 5: Tests cover fast path, slow winner, and token safety separately

Redis integration tests should prove distinct behaviors:

- Fast-loader concurrent misses call `loader()` exactly once.
- Slow original winner does not cause every loser to call `loader()` after the first wait window;
  later loaders are bounded by lock ownership.
- A stale winner that completes after another request has acquired the lock must not delete the new
  lock or overwrite the cache value.
- TTL expiry and `delByPrefix` behavior remain covered.

Test names and comments must avoid saying "exactly once" for scenarios where the design permits a
second lock owner after the first lock expires.

### Decision 6: Lock TTL stays at 1 second; polling constants become named module-level constants

The lock TTL of 1 second is sufficient because the slowest loader in scope is the availability
query — a lightweight aggregation, not a heavy join. Named constants (`LOCK_TTL_SECONDS`,
`POLL_INTERVAL_MS`, `MAX_POLL_ATTEMPTS`) are extracted to module level so they are visible,
testable, and tunable without hunting for magic numbers inside `getOrSet`.

Total loser wait budget = `POLL_INTERVAL_MS × MAX_POLL_ATTEMPTS` = 25ms × 10 = 250ms, which fits
within the 1-second lock window for the expected loader duration.

## Risks / Trade-offs

- **Requests can wait longer when the winner is slow** -> Losers no longer stampede the database,
  but they may wait across more than one lock window. This is acceptable for Redis-healthy behavior;
  Redis failures still fail open to direct database reads.
- **Lua scripts add Redis-specific logic** -> The project already uses hand-rolled Redis primitives,
  and Lua is the simplest way to make token-checked cache write plus lock release atomic.
- **A stale winner may do wasted database work** -> The old winner is not cancelled; it simply avoids
  mutating Redis if it lost ownership. This preserves correctness without needing query cancellation.
- **Integration tests require real Redis** -> Keep them opt-in via `REDIS_URL`, but document and run
  them during verification for this change.

## Migration Plan

The change is additive and local to backend tests plus the cache service implementation. No data
migration is needed. Rollback is reverting the cache service and test edits; catalog reads remain
cache-aside and Redis fail-open.

## Open Questions

<!-- none -->
