## 1. Baseline And Scope

- [x] 1.1 Verify current branch includes completed payment simulator, MoMo sandbox integration, and payment initiation idempotency code.
- [x] 1.2 Confirm Redis module/token injection is available to the payment module.
- [x] 1.3 Confirm no Prisma schema or migration change is needed for circuit breaker state.
- [x] 1.4 Define local-demo-friendly circuit constants for failure threshold, open cooldown, and half-open max trials.

## 2. Domain And Port

- [x] 2.1 Add payment circuit breaker states `CLOSED`, `OPEN`, and `HALF_OPEN`.
- [x] 2.2 Add payment circuit breaker errors for open circuit, half-open trial rejection, and circuit store unavailable.
- [x] 2.3 Define a payment-facing circuit breaker port for acquiring provider call permission and recording success/failure.
- [x] 2.4 Ensure the port is scoped by `PaymentProvider` so simulator and MoMo circuit states remain isolated.

## 3. Redis Adapter

- [x] 3.1 Implement Redis-backed payment circuit breaker adapter.
- [x] 3.2 Store provider-specific circuit state, failure count, opened-until timestamp, half-open trial count, and updated timestamp.
- [x] 3.3 Open the circuit after the configured consecutive provider failure threshold.
- [x] 3.4 Transition from `OPEN` to `HALF_OPEN` after cooldown expires.
- [x] 3.5 Enforce the configured half-open trial limit with atomic Redis behavior.
- [x] 3.6 Close the circuit and reset counters after successful closed or half-open provider calls.
- [x] 3.7 Reopen the circuit after failed half-open provider calls.
- [x] 3.8 Fail closed with a controlled error when Redis is unavailable before a provider call.

## 4. Payment Initiation Integration

- [x] 4.1 Wire the circuit breaker port and Redis adapter into `PaymentModule`.
- [x] 4.2 Update `InitiatePaymentUseCase` to check idempotency replay before consulting the circuit breaker.
- [x] 4.3 Acquire circuit permission only before creating a new provider redirect session.
- [x] 4.4 Record circuit success after provider redirect session creation succeeds.
- [x] 4.5 Record circuit failure only for provider-facing initiation failures or timeouts.
- [x] 4.6 Ensure order validation, access errors, idempotency conflicts, and replay responses do not increment circuit failures.
- [x] 4.7 Preserve existing simulator, MoMo, callback, order lifecycle, and ticket issuance behavior.

## 5. HTTP Error Mapping And Docs

- [x] 5.1 Map open circuit and half-open trial rejection to a controlled payment degradation HTTP response.
- [x] 5.2 Map Redis circuit store unavailable to a controlled payment degradation HTTP response.
- [x] 5.3 Update payment Postman/manual docs with open-circuit and recovery testing notes.
- [x] 5.4 Document that non-payment APIs are unaffected while payment initiation is degraded.

## 6. Tests

- [x] 6.1 Add unit tests for closed-state success/failure counting.
- [x] 6.2 Add Redis adapter tests for opening after threshold, cooldown-to-half-open transition, trial limit enforcement, close on success, reopen on failure, and provider isolation.
- [x] 6.3 Add `InitiatePaymentUseCase` tests proving an open circuit blocks provider calls.
- [x] 6.4 Add `InitiatePaymentUseCase` tests proving idempotency replay bypasses the circuit breaker.
- [x] 6.5 Add tests proving provider errors increment circuit failures but validation/idempotency errors do not.
- [x] 6.6 Add controller tests for controlled degradation error mapping.
- [x] 6.7 Run targeted payment tests and available TypeScript/build checks.
