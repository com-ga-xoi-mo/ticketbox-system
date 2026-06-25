# Paid Order Recovery

## Purpose

The recovery flow repairs orders after payment success is already persisted but
the order, inventory confirmation, or ticket issuance did not finish.

It does not query VNPay, MoMo, or another provider. Provider reconciliation is a
separate future flow for payments whose final status is still unknown.

## Eligible States

- `Payment.SUCCEEDED + Order.PENDING_PAYMENT`: transition the order to `PAID`,
  convert its reservation to sold inventory, and issue tickets.
- `Payment.SUCCEEDED + Order.PAID + missing tickets`: issue only the missing
  deterministic ticket slots.
- `Payment.SUCCEEDED + Order.PAID + complete tickets`: idempotent no-op.
- `Payment.SUCCEEDED + Order.EXPIRED/FAILED/CANCELLED/REFUNDED`: terminal
  inconsistency; report it for operator review and do not revive automatically.

## Worker Configuration

```dotenv
PAYMENT_REPAIR_ENABLED=true
PAYMENT_REPAIR_INTERVAL_MS=60000
PAYMENT_REPAIR_BATCH_SIZE=50
PAYMENT_REPAIR_MAX_ATTEMPTS=3
PAYMENT_REPAIR_BACKOFF_MS=5000
```

The BullMQ job scans a bounded deterministic batch. Retryable failures use
bounded exponential backoff. Terminal conflicts are logged and are not fixed by
repeated retries.

## Expiration Protection

The expiration candidate query excludes orders with successful payments. The
inventory transition also rechecks payment status while holding the order row
lock. This second guard protects against a payment succeeding after the worker
selected an order but before it attempted expiration.

## Rollout

1. Deploy with `PAYMENT_REPAIR_ENABLED=false`.
2. Inspect existing records matching successful payment plus incomplete
   fulfillment.
3. Enable the worker with a small batch size.
4. Monitor `Terminal paid-order recovery inconsistency` and `Retryable
   paid-order recovery failure` logs.
5. Increase batch size only after the inconsistent backlog is understood.

No raw provider callback payload, provider secret, QR payload, or QR secret is
written to recovery logs.

## Verification

Verified on 2026-06-25:

- `npm run build`: passed for API types, API, and worker.
- Focused paid-order recovery suite: 13 files, 61 tests passed, including four
  PostgreSQL integration tests for repair, partial ticket issuance, concurrent
  expiration, and reservation-conflict safety.
- Hardening evidence suite: 66 tests passed across inventory concurrency,
  payment reliability, circuit breaker, and rate limiting.
- Full workspace suite: 794 tests passed, 5 skipped, and 2 unrelated tests
  failed because the shared development database was not clean and a
  guest-list integration fixture raced with another database test.

The development database was not reset because doing so would delete local
orders, payments, tickets, and other developer data.
