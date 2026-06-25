## Why

A verified successful payment can currently be persisted before the linked order, inventory, and ticket issuance finish. If a later step fails or races with reservation expiration, the system can leave `payment = SUCCEEDED` while the order remains `PENDING_PAYMENT`, allowing the expiration worker to release inventory and leaving the customer charged without a completed order or tickets.

## What Changes

- Introduce a shared, idempotent successful-payment finalization path that completes the order, confirms inventory, and issues only missing tickets.
- Add an internal repair worker that finds successful payments whose orders are not fully paid and fulfilled, then retries finalization without querying the provider.
- Prevent reservation expiration from expiring an order or releasing inventory after a successful payment has been recorded.
- Allow duplicate or late verified provider callbacks to retry unfinished fulfillment instead of always returning early once the payment is already successful.
- Tighten lifecycle guards so expiration, payment success, inventory confirmation, and ticket issuance cannot silently diverge.
- Add focused failure, recovery, race-condition, and idempotency tests.
- Keep provider reconciliation, frontend changes, new payment features, and a per-order reservation-ledger redesign outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ticket-purchase`: Protect paid reservations from expiration and define idempotent recovery of order, inventory, and ticket fulfillment after partial failure.
- `payment-reliability`: Define repair-worker recovery and duplicate/late callback recovery when payment is already successful but fulfillment is incomplete.

## Impact

- Affects payment callback/IPN application flows, order status transition and inventory confirmation logic, ticket issuance, expiration scanning, and the BullMQ worker runtime.
- Adds a reusable internal application use case and a repair job/repository query for inconsistent successful-payment records.
- Requires structured inconsistency logging and tests using the existing PostgreSQL/Redis-backed ordering and payment paths.
- Does not change public frontend behavior or require a new provider API contract.
