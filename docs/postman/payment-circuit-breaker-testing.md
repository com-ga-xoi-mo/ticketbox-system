# Payment Circuit Breaker Testing

Use this after `implement-payment-simulator`, `implement-momo-sandbox-integration`, and
`implement-payment-idempotency` are present.

## Scope

The circuit breaker protects new payment provider calls during:

```http
POST /orders/{{orderId}}/payment
```

It does not affect idempotency replay, simulator callbacks, MoMo IPN callbacks, order listing,
ticket listing, check-in, catalog browsing, or admin APIs.

## Expected Behavior

- `CLOSED`: provider calls are allowed.
- `OPEN`: provider calls are blocked and the API returns `503 Service Unavailable`.
- `HALF_OPEN`: only the configured trial count is allowed. Extra trials return `503 Service Unavailable`.
- A successful half-open provider call closes the circuit.
- A failed half-open provider call opens the circuit again.
- Simulator and MoMo use separate Redis circuit keys.

## Local Demo Notes

The local defaults are intentionally short for manual testing:

- failure threshold: `3`
- open cooldown: `30s`
- half-open max trials: `1`

For deterministic testing, prefer the automated payment tests. Full MoMo sandbox testing depends on
the real sandbox returning provider failures or timing out; callback success/failure alone does not
exercise the circuit breaker because callbacks happen after payment initiation.

## Manual Test Shape

1. Start PostgreSQL, Redis, backend, and worker as usual.
2. Create a fresh `PENDING_PAYMENT` order.
3. Initiate payment with a provider configured to fail during redirect/session creation.
4. Repeat with new payment idempotency keys until the threshold is reached.
5. Initiate another payment for the same provider.
6. Expected: response is `503`, and no provider redirect/session call is attempted.
7. Wait for the cooldown.
8. Initiate one trial payment.
9. Expected: one trial is allowed in `HALF_OPEN`; a second simultaneous trial is rejected with `503`.

Non-payment APIs should continue returning their normal responses while payment initiation is degraded.
