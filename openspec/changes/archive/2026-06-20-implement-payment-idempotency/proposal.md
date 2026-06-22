## Why

Payment initiation currently can create multiple payment attempts if a customer retries the payment request or double-clicks during unstable network conditions. TicketBox needs idempotent payment initiation so retrying the same operation returns the first payment result instead of starting a second provider transaction.

## What Changes

- Add full payment initiation idempotency for `POST /orders/:id/payment` using a client-provided idempotency key.
- Scope idempotency to `(userId, orderId, provider, idempotencyKey)` so one user retry maps to one payment attempt while different users/orders/providers remain isolated.
- Store the original payment initiation result in Redis long enough to replay the same response on duplicate requests.
- Reject reuse of the same idempotency key with a different request fingerprint to prevent accidental or malicious key collision.
- Keep existing provider callback idempotency behavior unchanged; duplicate MoMo/simulator callbacks remain handled by provider event IDs.
- Do not implement circuit breaker, reconciliation worker, or payment provider hardening in this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `payment-reliability`: Strengthen the existing idempotent checkout and payment requirement with concrete payment initiation retry, request fingerprint mismatch, and provider isolation scenarios.

## Impact

- Backend payment API: `POST /orders/:id/payment` will require an idempotency key for payment initiation.
- Payment application layer: `InitiatePaymentUseCase` will check for existing idempotency records before creating a new payment/provider request.
- Redis persistence: add a Redis-backed payment initiation idempotency adapter, including request fingerprint and replayable result data. No Prisma schema migration is expected in this change.
- Tests: add unit/integration coverage for duplicate payment initiation, mismatched key reuse, and concurrent same-key requests.
- Postman/manual docs: update payment testing notes to include idempotent payment initiation behavior.
