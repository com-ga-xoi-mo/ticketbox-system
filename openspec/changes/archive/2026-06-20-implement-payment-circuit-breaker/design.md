## Context

TicketBox already has payment initiation through `InitiatePaymentUseCase`, provider routing through `PaymentGatewayPort`, simulator/MoMo adapters, Redis infrastructure, and Redis-backed payment initiation idempotency. The blueprint requires payment provider calls to pass through a circuit breaker so repeated provider failures or timeouts do not consume backend resources or affect unrelated features.

This change only protects payment provider calls during payment initiation. Callback processing, payment idempotency replay, order lifecycle, inventory reservation, and ticket issuance remain unchanged.

## Goals / Non-Goals

**Goals:**

- Add Redis-backed circuit state for payment provider initiation calls.
- Support `CLOSED`, `OPEN`, and `HALF_OPEN` states.
- Open the circuit after a configured threshold of consecutive provider failures or timeouts.
- Fail fast with a controlled API error when a provider circuit is open.
- Allow a limited number of half-open trial requests after the open cooldown expires.
- Close the circuit after a successful trial and reopen it after a failed trial.
- Preserve clean architecture boundaries by hiding Redis details behind a payment circuit breaker port.

**Non-Goals:**

- Do not implement payment reconciliation worker.
- Do not add rate limiting or queue/fairness controls.
- Do not change payment initiation idempotency semantics.
- Do not add new payment providers or change MoMo/simulator callback verification.
- Do not make browsing/catalog/check-in behavior depend on the payment circuit breaker.

## Decisions

### Decision 1: Add a payment circuit breaker port in the payment domain/application boundary

Define a payment-facing port such as `PaymentCircuitBreakerPort` with operations to check/claim provider call permission and record success/failure. `InitiatePaymentUseCase` should depend on the port rather than Redis directly.

Rationale:

- Preserves the existing clean architecture pattern.
- Keeps transition behavior testable with in-memory fakes.
- Allows a Redis adapter now and a different backing store later without changing use case logic.

Alternative considered:

- Put circuit logic inside `PaymentGatewayRegistry`. This keeps provider routing local but makes the registry responsible for reliability policy and Redis state, which is broader than routing.

### Decision 2: Scope circuit breaker state by payment provider

Use provider-specific circuit keys, for example `ticketbox:payment:circuit:<provider>`. Simulator and MoMo should have separate circuit state so one degraded provider does not block the other.

Rationale:

- Provider isolation matches the payment gateway registry design.
- It supports local simulator demos and MoMo sandbox independently.

Alternative considered:

- Use one global payment circuit. This is simpler but would unnecessarily block all payment providers when only one provider is degraded.

### Decision 3: Store circuit state in Redis with TTL-backed cooldown windows

Store state data such as:

- `state`: `CLOSED`, `OPEN`, or `HALF_OPEN`
- `failureCount`
- `openedUntil`
- `halfOpenTrialCount`
- `updatedAt`

Use configuration constants for failure threshold, open cooldown seconds, and half-open max trial count. Defaults should be small enough for local/Postman demo, for example threshold `3`, cooldown `30s`, max half-open trials `1`.

Rationale:

- Blueprint assigns payment circuit breaker state to Redis.
- TTL/cooldown data is ephemeral and does not belong in PostgreSQL.
- Short demo-friendly defaults make the behavior easy to test locally.

Alternative considered:

- PostgreSQL circuit state table. This adds durable persistence but is unnecessary for transient provider health state.

### Decision 4: Wrap provider session creation, not idempotency replay

The use case should check idempotency first. If the request is a replay, return the stored response without consulting the circuit breaker. If this is the first payment initiation attempt, the use case checks the circuit before calling `paymentGateway.createRedirectSession`.

Rationale:

- Replaying an already-created payment response does not call a degraded provider.
- The circuit breaker should only guard new provider calls.
- This preserves the semantics of `implement-payment-idempotency`.

Alternative considered:

- Check circuit before idempotency. That would incorrectly block safe replay responses while the provider is down.

### Decision 5: Count provider initiation failures and timeouts as circuit failures

Record a circuit failure when provider initiation throws a provider-facing error such as `PaymentGatewayRequestError` or a timeout-like error from the adapter. On success, record circuit success. In `HALF_OPEN`, success closes the circuit; failure reopens it.

Rationale:

- The assignment specifically targets unstable payment providers.
- Domain/order validation errors should not open the circuit because they are not provider health signals.

Alternative considered:

- Count every payment initiation exception. This would let invalid user/order requests open the provider circuit incorrectly.

### Decision 6: Return a controlled degradation error when open

When a provider circuit is `OPEN`, throw a payment-specific error such as `PaymentProviderCircuitOpenError` and map it to a controlled HTTP error from `PaymentController`, preferably `503 Service Unavailable`.

Rationale:

- The user gets a clear payment-only degradation response.
- Non-payment endpoints remain unaffected because the circuit is only used in payment initiation.

Alternative considered:

- Return `400 Bad Request`. This hides the provider-degradation nature and makes client retry behavior less clear.

## Risks / Trade-offs

- [Risk] Redis unavailable can make circuit state unreadable. -> Mitigation: fail closed for new provider calls with a controlled payment error, matching payment safety expectations.
- [Risk] Circuit opens during a short sandbox outage and blocks demos. -> Mitigation: keep local defaults configurable and demo-friendly.
- [Risk] Provider errors are misclassified. -> Mitigation: count only provider-facing initiation errors and add tests proving validation errors do not affect circuit state.
- [Risk] Concurrent requests in `HALF_OPEN` can exceed trial limits. -> Mitigation: use Redis atomic increment/compare behavior or Lua script for half-open trial claims.

## Migration Plan

1. Add circuit breaker domain types, errors, and port.
2. Add Redis adapter and wire it into `PaymentModule`.
3. Update `InitiatePaymentUseCase` to check idempotency first, then circuit permission before provider calls.
4. Record circuit success/failure around provider initiation only.
5. Map circuit-open/store-unavailable errors in `PaymentController`.
6. Add targeted unit tests and update Postman/manual docs.
7. Rollback by removing the circuit breaker injection/path; Redis keys naturally expire or can be ignored.

## Open Questions

- None. Threshold, cooldown, and half-open trial defaults can be constants for this change and can move to env configuration later if needed.
