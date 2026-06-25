## 1. Baseline And Route Inventory

- [x] 1.1 Verify current branch includes Redis infrastructure, checkout, payment initiation, admin write, and check-in-related controllers.
- [x] 1.2 Inventory existing public browsing endpoints and identify which routes should receive the browsing policy.
- [x] 1.3 Inventory existing checkout/payment/admin/check-in sync endpoints and map each to a rate limit policy.
- [x] 1.4 Confirm no Prisma schema or migration change is needed for token bucket state.
- [x] 1.5 Define local-demo-friendly policy constants for capacity, refill interval, and retry-after calculation.

## 2. Rate Limiting Domain And Policy Model

- [x] 2.1 Add rate limit policy names for browsing, checkout, payment initiation, admin writes, and check-in sync.
- [x] 2.2 Add token bucket request/result types including allowed, retry-after, remaining tokens, and reset timing.
- [x] 2.3 Add rate limit errors for exhausted buckets and store-unavailable protected policies.
- [x] 2.4 Define actor key derivation rules for IP, authenticated user, user/order, role/user, and device ID.
- [x] 2.5 Define policy metadata/decorator shape for attaching policies to NestJS route handlers or controllers.

## 3. Redis Token Bucket Adapter

- [x] 3.1 Implement a Redis-backed token bucket adapter/service.
- [x] 3.2 Use atomic Redis behavior, preferably Lua, to refill and consume tokens in one operation.
- [x] 3.3 Store bucket state by policy and actor key with short TTL.
- [x] 3.4 Return retry-after seconds when a bucket is exhausted.
- [x] 3.5 Keep endpoint policy buckets isolated even for the same actor.
- [x] 3.6 Implement Redis-unavailable behavior: fail open for low-risk browsing and fail closed with controlled error for protected unsafe policies.

## 4. NestJS HTTP Integration

- [x] 4.1 Add a platform rate limiting module and wire it to the existing Redis module.
- [x] 4.2 Add a guard or interceptor that reads policy metadata, derives the actor key, and calls the token bucket service.
- [x] 4.3 Map exhausted buckets to `429 Too Many Requests` with `Retry-After`.
- [x] 4.4 Ensure rejected requests do not call controller/use-case methods.
- [x] 4.5 Ensure rate limit responses are consistent with existing NestJS exception formatting.

## 5. Route Policy Application

- [x] 5.1 Apply the browsing policy to existing public browsing endpoints.
- [x] 5.2 Apply the checkout policy to `POST /checkout/orders`.
- [x] 5.3 Apply the payment initiation policy to `POST /orders/:id/payment` without changing payment idempotency or circuit breaker behavior.
- [x] 5.4 Apply the admin-write policy to existing admin write endpoints, including check-in staff assignment writes where applicable.
- [x] 5.5 Apply the check-in sync policy to existing check-in sync endpoints if present; otherwise document the intended policy attachment point for the future check-in sync change.
- [x] 5.6 Verify read-only admin/public routes are not accidentally classified as write-limited unless explicitly intended.

## 6. Documentation And Manual Testing

- [x] 6.1 Add manual testing notes or Postman guidance for allowed requests, blocked requests, and retry-after behavior.
- [x] 6.2 Document policy scopes and actor keys so future endpoint owners know which policy to apply.
- [x] 6.3 Document that rate-limited payment initiation does not mutate payment idempotency, provider calls, or circuit breaker state.

## 7. Tests And Verification

- [x] 7.1 Add unit tests for token bucket allowed requests and token consumption.
- [x] 7.2 Add unit tests for burst capacity and sustained traffic rejection.
- [x] 7.3 Add unit tests for retry-after calculation.
- [x] 7.4 Add tests for policy isolation across endpoint classes.
- [x] 7.5 Add HTTP guard/interceptor tests proving `429` responses and `Retry-After` headers.
- [x] 7.6 Add route-level tests proving checkout/payment/admin/check-in protected requests are blocked before use cases run.
- [x] 7.7 Add payment initiation tests proving rate-limited requests do not mutate payment idempotency or circuit breaker state.
- [x] 7.8 Run targeted platform/payment/ordering tests and available TypeScript/build checks.
