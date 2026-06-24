## Why

TicketBox needs backend load protection for sale-opening spikes and abusive retry patterns so high-risk flows such as checkout, payment initiation, admin writes, and check-in sync do not overload the API. The blueprint requires Redis-backed token buckets with controlled `429` responses and `Retry-After` guidance before the later caching and broader protection work.

## What Changes

- Add Redis-backed token bucket rate limiting for selected backend API groups.
- Apply separate limits for anonymous public browsing, authenticated checkout, payment initiation, admin write APIs, and check-in sync.
- Return `429 Too Many Requests` with a suitable `Retry-After` response when a bucket is exhausted.
- Scope buckets by actor and endpoint class, such as IP for anonymous browsing, user ID for checkout, user/order for payment initiation, role/user for admin writes, and device ID for check-in sync.
- Preserve payment reliability behavior: rate limiting must not change payment provider circuit breaker, payment idempotency, callback handling, or order lifecycle semantics.
- Add focused tests for allowed requests, blocked requests, burst behavior, retry-after behavior, and endpoint-specific isolation.
- Do not implement concert caching, payment reconciliation, new circuit breaker behavior, advanced bot detection, CAPTCHA, waiting room, or production observability hardening in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `platform-protection`: Strengthen Redis-backed rate limiting requirements with token bucket behavior, endpoint scopes, actor keys, `429` response semantics, `Retry-After`, and isolation from unrelated payment reliability flows.

## Impact

- Backend platform layer: add reusable rate limit policy, token bucket service/port, Redis adapter, and HTTP guard/middleware/interceptor integration.
- Backend API routes: apply policies to browsing, checkout, payment initiation, admin writes, and check-in sync surfaces that exist in the repo.
- Redis: store short-lived token bucket state per actor and endpoint class.
- HTTP responses: add controlled `429 Too Many Requests` responses with `Retry-After`.
- Tests: add unit and controller/guard tests proving token bucket behavior, blocked responses, burst handling, retry-after values, and policy isolation.
