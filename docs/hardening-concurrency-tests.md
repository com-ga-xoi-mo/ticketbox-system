# Member 3 Hardening Test Evidence

This document maps the `harden-concurrency-tests` change to runnable backend evidence.
It focuses only on Member 3 backend mechanisms: ticket purchase concurrency, payment
reliability, and platform rate limiting.

## Run All Hardening Evidence

```bash
node tools/run-hardening-tests.mjs
```

The script runs focused Vitest groups and prints which mechanism each group proves.

## Evidence Map

| Group | Mechanisms Proved |
| --- | --- |
| `ticket-purchase concurrency` | no oversell, per-user limit, inventory transition conflict handling |
| `payment reliability` | payment initiation idempotency, duplicate callback dedupe, circuit breaker transitions |
| `platform rate limiting` | token bucket allowed/blocked requests, `Retry-After`, endpoint isolation, fail-open/fail-closed behavior |

## Scope Boundaries

This evidence does not claim completion of frontend QR rendering, mobile offline sync,
concert reminders, payment reconciliation, or new caching behavior. Those belong to
separate changes.
