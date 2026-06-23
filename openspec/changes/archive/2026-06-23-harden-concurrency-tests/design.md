## Context

Member 3 has implemented the ticket purchase and payment reliability mechanisms required by the blueprint: transactional inventory reservation, per-user ticket limits, idempotent payment initiation, provider callback dedupe, circuit breaker behavior, and Redis token bucket rate limiting. The remaining work is not a new product feature; it is final hardening evidence that these mechanisms continue to work together after multiple branches have been merged into `dev`.

The current codebase already has focused unit tests for many lower-level components, including inventory reservation repositories, payment idempotency stores, payment circuit breaker stores, and rate limiting. This change should fill evidence gaps, tighten tests that are too narrow, and add a reviewer-facing command or document only where it improves submission readiness.

## Goals / Non-Goals

**Goals:**

- Prove no-oversell behavior using the same transaction path that creates checkout orders.
- Prove same-user concurrent checkout cannot bypass `max_per_user`.
- Prove payment initiation idempotency under replay, mismatched payload, and concurrent same-key requests.
- Prove duplicate payment callbacks/provider events do not issue duplicate tickets.
- Prove payment circuit breaker `CLOSED`, `OPEN`, and `HALF_OPEN` transitions and recovery behavior.
- Prove Redis token bucket rate limiting for allowed requests, blocked requests, bursts, `Retry-After`, and endpoint/policy isolation.
- Provide concise test or script evidence that maps to the submission-readiness requirements.

**Non-Goals:**

- Do not add new payment reconciliation, offline sync, reminder, caching, or frontend/mobile features.
- Do not rewrite module architecture or replace the current Clean Architecture boundaries.
- Do not silently change production behavior to satisfy a test. If a hardening test exposes a behavior defect, pause and review before implementing a fix.
- Do not use long sleeps or timing-dependent tests that become flaky on local machines or CI.

## Decisions

### Decision 1: Prefer focused integration tests over broad end-to-end flows

Use integration tests around the relevant adapters/repositories/use cases instead of a single full HTTP scenario for every case. Checkout concurrency is best tested around the ordering transaction boundary because the important behavior is the PostgreSQL row lock and inventory counter update. Payment idempotency, callback dedupe, and circuit breaker behavior can be tested at the payment use-case/store boundary with controlled fakes.

Alternative considered: full API-only load tests for every case. This gives realistic coverage but is slower, harder to keep deterministic, and more likely to fail because of auth/setup noise rather than the mechanism being tested.

### Decision 2: Use real PostgreSQL/Redis only where the mechanism depends on them

No-oversell and max-per-user concurrency should use Docker-backed PostgreSQL when proving row-level locking and transaction behavior. Redis-backed rate limiting, idempotency, and circuit breaker stores should either use existing Redis fakes that model the Lua operations exactly or a Redis-backed integration path if the fake cannot prove the needed behavior.

Alternative considered: pure unit tests only. They are faster, but they cannot prove row-level locking or distributed token bucket semantics.

### Decision 3: Keep tests deterministic with barriers, fake timers, and bounded concurrency

Concurrent tests should use a small fixed number of parallel requests, `Promise.allSettled`, explicit setup data, and deterministic assertions on accepted vs rejected results. Circuit breaker cooldown and rate limit refill tests should use fake timers or injected timestamps instead of sleeping.

Alternative considered: stress tests with many requests and real timeouts. Those are useful for manual performance checks but too flaky for routine verification.

### Decision 4: Preserve production behavior unless a defect is confirmed

This change should mostly add tests and evidence. If a test fails because current code behavior contradicts the accepted spec or blueprint, stop and document the discrepancy before changing implementation.

Alternative considered: fix every discovered bug while adding tests. That can hide scope creep and make it hard to review whether this change is hardening or feature work.

## Risks / Trade-offs

- Risk: database-backed concurrency tests can be slow or environment-dependent. Mitigation: keep datasets tiny, use bounded parallelism, and skip with a clear message when Docker services are unavailable.
- Risk: tests may duplicate existing unit coverage. Mitigation: focus new tests on gaps: real concurrency, cross-layer side effects, and reviewer-facing evidence.
- Risk: rate-limit tests can mutate Redis state across cases. Mitigation: use isolated keys with unique prefixes and clear relevant keys where the test harness supports it.
- Risk: payment callback dedupe can be tested at the wrong layer. Mitigation: assert both provider event dedupe and downstream ticket issuance idempotency so duplicate callbacks do not create duplicate tickets.
- Risk: hardening evidence can become too broad. Mitigation: keep this change scoped to Member 3 mechanisms and do not cover Member 4 offline sync or reminder worker behavior beyond existing submission references.
