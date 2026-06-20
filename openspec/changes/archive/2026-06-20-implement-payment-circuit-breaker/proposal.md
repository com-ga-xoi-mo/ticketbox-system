## Why

Payment provider failures or timeouts must not exhaust backend request handling or make unrelated TicketBox features unavailable. The current payment flow can call simulator/MoMo directly during payment initiation, so it needs a Redis-backed circuit breaker to fail fast during provider degradation and recover in a controlled way.

## What Changes

- Add Redis-backed circuit breaker behavior around payment provider calls during `POST /orders/:id/payment`.
- Track provider circuit state as `CLOSED`, `OPEN`, and `HALF_OPEN`.
- Open the circuit after configured consecutive payment provider failures or timeouts.
- Return a controlled payment degradation error when the circuit is `OPEN` without calling the provider.
- Allow a limited number of trial requests in `HALF_OPEN`.
- Close the circuit after a successful trial and reopen it after a failed trial.
- Preserve existing payment initiation idempotency, simulator, MoMo sandbox, and callback behavior.
- Do not implement reconciliation worker, rate limiting, new provider integration, or new payment idempotency behavior in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `payment-reliability`: Strengthen the circuit breaker requirement with Redis-backed state, controlled open-state failure, half-open trial limits, recovery behavior, and graceful degradation expectations.

## Impact

- Backend payment module: wrap payment provider initiation through a circuit breaker port/service.
- Redis: store ephemeral circuit state, failure counters, opened-until timestamps, and half-open trial counters.
- Payment API: return a controlled error when payment initiation is blocked by an open circuit.
- Tests: add unit coverage for closed/open/half-open transitions, recovery behavior, Redis adapter behavior, and payment initiation integration.
- Postman/manual docs: document how to demonstrate circuit open and recovery using simulator/MoMo failure behavior where practical.
