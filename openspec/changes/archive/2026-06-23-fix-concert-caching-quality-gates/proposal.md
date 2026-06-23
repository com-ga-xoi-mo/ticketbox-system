## Why

The archived concert caching change works in the normal path, but its quality gates no longer give
reliable evidence: the workspace build fails on stale ticket-type test mocks, application tests
expect HTTP exceptions from the wrong layer, and the Redis mutex fallback can still allow many
waiting requests to hit the database together when the original winner is slow.

This change hardens the cache-miss protection and restores the build/test signal so the team can
trust the catalog caching evidence before demo or submission.

## What Changes

- Repair ticket-type application tests so their repository mocks match the current
  `ConcertWriteRepositoryPort`.
- Align ticket-type application test expectations with the architecture: application use-cases throw
  domain errors, while HTTP exceptions are asserted at the adapter/mapper layer.
- Strengthen Redis cache-miss mutex behavior so loser requests do not all call the loader after a
  bounded wait; instead, only a request that reacquires the lock may run the loader.
- Add lock ownership tokens so an expired or superseded winner cannot delete another request's lock
  or overwrite cache populated by a newer winner.
- Tighten Redis integration tests to prove the fast-loader path calls the loader exactly once and
  the slow-winner path remains bounded.
- No API response shape, frontend, dependency, or database schema changes.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `platform-protection`: Clarify and harden the concert catalog cache-miss mutex so bounded fallback
  preserves availability without letting many loser requests stampede the database.
- `concert-management`: Keep ticket-type validation evidence aligned with the application/domain
  error contract and the HTTP mapping boundary.

## Impact

- Affected code:
  - `packages/backend/src/platform/cache/redis-cache.service.ts`
  - `packages/backend/src/platform/cache/redis-cache.service.spec.ts`
  - `packages/backend/src/concert-management/application/use-cases/ticket-type-write.use-cases.spec.ts`
  - potentially existing concert HTTP mapper/controller specs if HTTP exception coverage needs to be
    made explicit
- Affected systems: Redis-backed concert catalog cache and backend test/build gates.
- No external dependency changes.
- No frontend, API contract, or Prisma schema changes.
