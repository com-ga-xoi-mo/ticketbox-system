## 1. Repair ticket-type quality gates

- [x] 1.1 Update `ticket-type-write.use-cases.spec.ts` repository mocks to satisfy the current `ConcertWriteRepositoryPort`, including `findConcertsByOwner` and `findAllConcerts`.
- [x] 1.2 Replace use-case test expectations for invalid ticket-type inputs from Nest HTTP exceptions to the matching domain errors: `InvalidTicketPriceError`, `InvalidTicketQuantityError`, `InvalidSalePeriodError`, `TicketTypeCodeAlreadyExistsError`, and `TicketTypeHasSoldTicketsError`.
- [x] 1.3 Add or adjust HTTP mapper/controller coverage only if the existing suite no longer proves that ticket-type domain errors become validation or conflict HTTP responses.

## 2. Harden Redis cache-miss locking

- [x] 2.1 Introduce per-lock ownership tokens for `RedisCacheService.getOrSet` lock acquisition.
- [x] 2.2 Add token-checked Redis scripts or equivalent atomic operations so cache write plus lock release only occur when the current lock value matches the winner token.
- [x] 2.3 Add token-checked lock cleanup for loader errors so stale winners cannot delete another request's newer lock.
- [x] 2.4 Change loser behavior so an exhausted poll window retries lock acquisition instead of immediately calling `loader()`.
- [x] 2.5 Preserve fail-open behavior for Redis errors: Redis coordination failures still fall through to the database loader rather than failing catalog reads.

## 3. Strengthen Redis integration tests

- [x] 3.1 Update the fast concurrent-miss test so its name and assertion prove that a fast loader is invoked exactly once.
- [x] 3.2 Add a slow-winner test proving losers do not all call the loader after the initial wait window expires; loader calls remain bounded by lock ownership.
- [x] 3.3 Add a stale-owner token-safety test proving a late original winner cannot delete a newer lock or overwrite a newer cached value.
- [x] 3.4 Keep TTL expiry and `delByPrefix` SCAN behavior covered by Redis integration tests.

## 4. Verification

- [x] 4.1 Run `npx vitest run packages/backend/src/concert-management/application/use-cases/ticket-type-write.use-cases.spec.ts --passWithNoTests`.
- [x] 4.2 Run `npx vitest run packages/backend/src/concert-management/application/cache/concert-cache-decorators.spec.ts --passWithNoTests`.
- [x] 4.3 Run `REDIS_URL=redis://localhost:6379 npx vitest run packages/backend/src/platform/cache/redis-cache.service.spec.ts --passWithNoTests` with local Redis running.
- [x] 4.4 Run `npm run build`.
