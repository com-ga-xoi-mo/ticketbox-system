## Context

TicketBox already has a NestJS modular backend, shared Redis infrastructure, authentication/RBAC guards, checkout/order use cases, payment initiation with idempotency and circuit breaker behavior, and check-in/admin surfaces. The blueprint places Redis token bucket rate limiting in the backend API middleware layer before unsafe use cases and idempotency/provider work.

This change is cross-cutting because it applies to multiple HTTP route groups and must reject excess requests before expensive database transactions, payment provider calls, or check-in writes occur.

## Goals / Non-Goals

**Goals:**

- Add Redis-backed token bucket rate limiting for public browsing, checkout, payment initiation, admin writes, and check-in sync.
- Return controlled `429 Too Many Requests` responses with `Retry-After`.
- Keep endpoint classes isolated so one exhausted policy does not block unrelated APIs.
- Key limits by the most stable actor available for the route: IP, authenticated user, user/order, role/user, or device ID.
- Apply limits before application use cases mutate state or call external providers.
- Preserve existing payment idempotency, payment circuit breaker, callback handling, order lifecycle, and ticket issuance behavior.

**Non-Goals:**

- Do not implement concert caching or availability cache invalidation.
- Do not implement payment reconciliation.
- Do not add or change payment circuit breaker behavior.
- Do not implement CAPTCHA, device fingerprinting, bot scoring, waiting room, or fair queue.
- Do not add production observability hardening beyond tests and simple manual testing notes needed for this change.

## Decisions

### Decision 1: Implement a reusable rate limiter in the platform layer

Create a platform-level rate limiting module with a small policy registry, token bucket service/port, Redis adapter, and HTTP guard or interceptor. Route modules should attach policy metadata instead of embedding Redis calls inside controllers or use cases.

Rationale:

- Rate limiting is cross-cutting platform protection, not domain business logic.
- It keeps checkout/payment/check-in use cases focused on correctness after a request is admitted.
- It matches the blueprint placement before idempotency and source-of-truth writes.

Alternative considered:

- Add checks directly inside each controller. This is fast initially but duplicates token bucket logic and makes policy isolation harder to test consistently.

### Decision 2: Use Redis token buckets with atomic consume behavior

Each bucket stores the token count and last refill timestamp in Redis. Consuming a token should be atomic, preferably through a Lua script, so concurrent requests cannot overspend the same bucket.

Default local-demo policies should be explicit constants first and can move to environment configuration later:

- browsing: higher capacity/refill, keyed by client IP
- checkout: stricter capacity/refill, keyed by authenticated user ID
- payment initiation: strict capacity/refill, keyed by authenticated user ID, order ID, and route policy
- admin writes: moderate capacity/refill, keyed by role and user ID
- check-in sync: device-oriented capacity/refill, keyed by device ID when supplied

Rationale:

- Token bucket allows short bursts while bounding sustained request rate.
- Redis works across backend instances and is already part of the architecture.
- Atomic consume behavior is needed for sale-opening concurrency.

Alternative considered:

- Fixed window counters. They are simpler but produce boundary spikes and weaker burst control.

### Decision 3: Return HTTP-level degradation before use cases

When a bucket is exhausted, the HTTP layer throws or returns `429 Too Many Requests` with `Retry-After` in seconds. Rejected requests must not invoke application use cases, create orders, call payment gateways, mutate payment idempotency records, change circuit breaker state, or record check-in events.

Rationale:

- Rate limiting is meant to shed load before expensive or unsafe work.
- It preserves existing payment reliability semantics by not touching idempotency or circuit breaker state for rejected requests.

Alternative considered:

- Let use cases run and fail later. That still overloads database/payment paths and defeats the purpose of rate limiting.

### Decision 4: Use route policy metadata for endpoint-specific isolation

Define policy names such as `BROWSING`, `CHECKOUT`, `PAYMENT_INITIATION`, `ADMIN_WRITE`, and `CHECKIN_SYNC`. Bucket keys include the policy plus actor key so exhausting one policy does not affect the others.

Rationale:

- Blueprint calls for separate limits for browsing, checkout, payment, admin, and check-in.
- It lets tests prove checkout pressure does not block browsing and payment throttling does not mutate payment reliability state.

Alternative considered:

- Use one global actor bucket. This is simpler but would let checkout pressure block harmless browsing or admin reads.

### Decision 5: Derive actor keys conservatively

Actor keys should use authenticated user ID where required, role/user for admin writes, order ID in the payment initiation bucket, device ID for check-in sync if a header/body field already exists, and client IP for anonymous browsing. If a route lacks a reliable actor source, fall back to IP for protection but keep the policy name in the bucket.

Rationale:

- Stable actor keys reduce accidental cross-user throttling.
- IP fallback is acceptable for public anonymous traffic and missing device identifiers.

Alternative considered:

- Require device fingerprinting. That is out of scope and explicitly excluded by the blueprint for this change.

## Risks / Trade-offs

- [Risk] Redis unavailable could either block legitimate traffic or allow unbounded traffic. -> Mitigation: fail open for low-risk browsing reads and fail closed with controlled `503` for protected unsafe policies if the store is unavailable, documenting the behavior in tests.
- [Risk] Too-strict local defaults can make demos painful. -> Mitigation: use demo-friendly constants and keep policy definitions centralized.
- [Risk] Wrong route classification can throttle the wrong flow. -> Mitigation: use explicit policy metadata and route-level tests for key APIs.
- [Risk] Check-in device identity may not exist yet on every request. -> Mitigation: use device ID when available and fallback to staff identity or IP.
- [Risk] Rate limiting could interfere with payment idempotency/circuit breaker semantics. -> Mitigation: apply payment initiation rate limiting before the use case and test that rejected requests do not touch payment idempotency or provider state.

## Migration Plan

1. Add rate limiting domain/platform types, policies, and errors.
2. Add Redis token bucket adapter with atomic consume/refill behavior.
3. Add NestJS policy decorator and guard/interceptor.
4. Attach policies to public browsing, checkout, payment initiation, admin writes, and check-in sync routes that exist in the repo.
5. Map exhausted buckets to `429` with `Retry-After`.
6. Add focused unit/controller tests and manual testing notes.
7. Roll back by removing route policy metadata/guard wiring; Redis bucket keys naturally expire.

## Open Questions

- Exact numeric limits can start as local constants for this change. They can move to environment configuration after demo behavior is validated.
