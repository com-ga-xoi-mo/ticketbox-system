## Context

TicketBox already has order idempotency for `POST /checkout/orders` and provider callback idempotency through `payment_events.provider_event_id`. Payment initiation is still not fully idempotent: repeated calls to `POST /orders/:id/payment` can create multiple local payment rows and can call simulator/MoMo more than once for the same user retry.

The blueprint requires Redis to store idempotency key records for checkout/payment initiation and requires payment provider references keyed by provider transaction ID. The current Prisma schema already contains `IdempotencyRecord`, but this change should not make PostgreSQL the primary payment initiation idempotency store. Redis is the source of truth for payment initiation claim/replay behavior; PostgreSQL idempotency records can remain unused or be considered later for audit/hardening.

## Goals / Non-Goals

**Goals:**

- Make payment initiation idempotent for simulator and MoMo providers.
- Ensure retrying the same payment initiation returns the original payment response without creating a second provider transaction.
- Detect reuse of an idempotency key with a different request fingerprint and return a clear conflict error.
- Handle concurrent same-key payment initiation so only one request creates the payment/provider session.
- Keep callback idempotency based on provider event IDs unchanged.

**Non-Goals:**

- Do not implement payment circuit breaker.
- Do not implement payment reconciliation worker.
- Do not change order checkout idempotency.
- Do not change MoMo IPN signature verification or callback semantics except where needed to replay payment initiation responses.

## Decisions

### Decision 1: Require payment initiation idempotency key in the request body

`InitiatePaymentDto` should include `idempotencyKey` as a required string, similar to checkout order creation. The request fingerprint will include `userId`, `orderId`, and normalized `provider`.

Rationale:

- A request body field is easy to test with Postman and consistent with the current checkout API style.
- The client controls retry grouping explicitly instead of relying on backend guesses.

Alternative considered:

- HTTP `Idempotency-Key` header. This is common for payment APIs, but the current project already uses body keys for checkout and this change should stay consistent with the codebase.

### Decision 2: Store payment initiation idempotency records in Redis

Use a Redis key scoped to payment initiation and user key reuse, for example `idempotency:payment:initiate:<userId>:<idempotencyKey>` or the project-standard prefixed equivalent. Store `orderId` and `provider` inside the request fingerprint so reusing the same key for a different order/provider is rejected instead of treated as a separate operation. Store a JSON value containing:

- `requestHash`: deterministic hash of normalized payment initiation input.
- `status`: `IN_PROGRESS`, `COMPLETED`, or `FAILED`.
- `responseBody`: serialized initiated payment response for replay.
- `resourceType`: `payment`.
- `resourceId`: created payment ID.
- `expiresAt` or Redis TTL appropriate for payment retry windows.

Rationale:

- This matches the blueprint decision that Redis stores idempotency key records for payment initiation.
- Redis TTL naturally bounds retry/replay storage lifetime.
- Storing the response body lets duplicate retries return the same payload shape.

Alternative considered:

- Reuse PostgreSQL `IdempotencyRecord`. The schema shape is useful, but using it as the primary store would contradict the blueprint's Redis idempotency decision and add database migration risk to this change.

### Decision 3: Isolate idempotency through a port in the payment application layer

Add a payment-facing idempotency port, for example `PaymentIdempotencyPort`, implemented by a Redis adapter. The use case should not import Redis client types or raw cache key details.

Rationale:

- Preserves clean architecture in the payment module.
- Keeps hashing, claim/complete/replay behavior testable without binding the use case to Redis primitives.

Alternative considered:

- Put idempotency logic directly in `PrismaPaymentRepository`. This is fast but mixes payment persistence with a broader cross-operation concern.

### Decision 4: Treat in-progress duplicate requests as conflicts

If a duplicate request sees an existing `IN_PROGRESS` record for the same key/hash, the API should return a controlled conflict such as `409 Payment initiation already in progress`. Once the first request completes, retries return the persisted response.

Rationale:

- Waiting or polling inside the request path adds complexity and can tie up API workers under retry storms.
- A 409 tells the client to retry after a short delay using the same key.

Alternative considered:

- Block until the first request finishes. This can work but is harder to bound and test safely.

### Decision 5: Use atomic Redis claim before calling a provider

The Redis adapter should claim a new idempotency record with an atomic operation such as `SET key value NX EX <ttl>` or an equivalent Lua script. Only the request that successfully claims the key can validate the order and call simulator/MoMo. Duplicate requests read the existing record and return replay/conflict behavior.

If Redis is unavailable, payment initiation should fail with a controlled server-side error before calling the provider. Bypassing Redis would reintroduce duplicate provider transaction risk.

Rationale:

- Atomic Redis claim is the concurrency guard required to prevent same-key double initiation.
- Failing closed is safer for payments than creating a provider transaction without an idempotency record.

## Risks / Trade-offs

- [Risk] A provider call succeeds but the backend crashes before marking the Redis idempotency record `COMPLETED`. -> Mitigation: leave the record `IN_PROGRESS` with TTL and add tests/docs for retry behavior; deeper recovery belongs to payment reconciliation/hardening.
- [Risk] Persisted `responseBody` can become stale if response presenter changes later. -> Mitigation: keep response serialization stable for payment initiation and use tests to verify replay shape.
- [Risk] Redis can be unavailable during payment initiation. -> Mitigation: fail closed with a controlled error before calling the provider; availability hardening belongs to later reliability work.
- [Risk] Concurrent requests can race on the same key. -> Mitigation: use atomic Redis claim and translate existing same-key records into lookup/conflict/replay behavior.
- [Risk] Making `idempotencyKey` required can break old Postman requests. -> Mitigation: update Postman collections and docs in the same change.

## Migration Plan

1. Confirm existing Redis connection/module access used by the backend.
2. Add Redis-backed payment idempotency port/adapter and wire it into the payment module.
3. Do not add or modify Prisma schema/migrations for idempotency in this change.
4. Update payment API DTO, use case, ports/adapters, tests, and Postman docs.
5. Rollback by removing the new payment idempotency path and making `idempotencyKey` optional again; Redis idempotency keys expire naturally by TTL.

## Open Questions

- None for this change. Full recovery for `IN_PROGRESS` records after backend crash is intentionally deferred to payment reconciliation/hardening.
