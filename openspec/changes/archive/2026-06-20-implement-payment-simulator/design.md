## Context

The ordering flow can reserve inventory, enforce per-user ticket limits, mark orders paid internally, and issue QR tickets once an order reaches `PAID`. The missing piece is a payment boundary that behaves like a VNPAY/MoMo-style provider: customer initiates payment, receives a redirect URL, and the backend later receives a provider callback that determines the payment result.

The blueprint calls for a simulator first so reliability cases can be tested locally before real gateway integration. The existing Prisma schema already includes `Payment` and `PaymentEvent` models, so this change should reuse them unless implementation proves a small schema adjustment is required.

## Goals / Non-Goals

**Goals:**

- Add a backend payment module that follows the same Clean Architecture style as identity and ordering.
- Allow an audience user to initiate payment for their own `PENDING_PAYMENT` order.
- Persist a payment attempt and return a simulator redirect URL.
- Provide a simulator callback path for success, failure, timeout, delayed callback, and duplicate callback scenarios.
- Transition the order to `PAID` on successful callback and to `FAILED` on failed callback.
- Preserve existing order/ticket guarantees: duplicate successful callbacks must not issue duplicate tickets.
- Add tests and Postman guidance for local payment simulator flows.

**Non-Goals:**

- Real VNPAY/MoMo integration.
- Full client-supplied payment initiation idempotency. That remains a separate `implement-payment-idempotency` change.
- Circuit breaker behavior. That remains a separate `implement-payment-circuit-breaker` change.
- Scheduled reconciliation of stale pending payments. That remains a separate reconciliation change.
- Frontend payment pages beyond returning a usable redirect URL for local testing.

## Decisions

### Decision 1: Introduce a payment module with ports

Create a payment module under `packages/backend/src` using application ports instead of calling Prisma/provider code directly from controllers.

Core ports:

- `PaymentRepositoryPort`: create/update payment attempts and append provider events.
- `PaymentGatewayPort`: create a provider redirect session for a payment attempt.
- `OrderPaymentPort` or an adapter around existing ordering use cases: validate order ownership/status and transition order state after callbacks.

Rationale: this matches the existing module style and keeps the simulator replaceable by a real provider later.

Alternative considered: add payment methods directly to the ordering module. That would be faster, but it would make the payment boundary harder to replace and would mix provider concerns into order lifecycle code.

### Decision 2: Simulator uses redirect URL plus callback endpoint

The simulator adapter creates a redirect URL that points back to the backend, for example a local `/payment-simulator/...` route containing a signed or opaque simulator token. The route can expose deterministic outcomes for local testing:

- success
- failure
- timeout/no callback
- delayed callback
- duplicate callback

The callback handler is the source of truth for changing payment/order state.

Rationale: this keeps the local flow close to a real redirect provider while remaining testable from Postman.

Alternative considered: immediately mark the payment paid in the initiate endpoint. That would not exercise the callback path required by the payment reliability spec.

### Decision 3: Payment outcome mapping

Callback outcomes map to local state as follows:

- Success: record provider event, mark payment `SUCCEEDED`, transition order `PENDING_PAYMENT -> PAID`.
- Failure: record provider event, mark payment `FAILED`, transition order `PENDING_PAYMENT -> FAILED`.
- Timeout: do not send a final callback; leave payment/order pending. Reservation expiration and later reconciliation handle cleanup.
- Delayed success/failure: keep pending until the delayed callback is delivered or manually triggered.
- Duplicate success callback: record or identify the duplicate provider event and return a successful no-op response without re-issuing tickets.

Rationale: state transitions remain explicit and compatible with existing order lifecycle logic.

### Decision 4: Keep duplicate fulfillment protection at the order/ticket boundary

This simulator change should tolerate duplicate successful callbacks. It does not need to implement the full public idempotency contract for repeated payment initiation. Duplicate fulfillment is prevented by:

- checking the current order/payment state before applying a transition;
- using the existing order-paid/ticket issuance idempotency guarantees;
- avoiding a second `OrderPaid` side effect when the order is already paid.

Rationale: duplicate provider callbacks are part of simulator behavior, while complete idempotency records are already planned as a later change.

### Decision 5: Reuse existing payment persistence

Use the existing `Payment` and `PaymentEvent` Prisma models for attempts and provider event audit. Add migrations only if a required field is missing and cannot be represented by existing columns.

Rationale: the data model already anticipated payment lifecycle work, and avoiding unnecessary schema churn keeps this change focused.

## Risks / Trade-offs

- Duplicate callback behavior without full idempotency can become ambiguous -> limit this change to provider duplicate events and rely on order/ticket state checks; implement full initiation idempotency in the next planned change.
- Timeout behavior may look incomplete in manual testing -> document that timeout intentionally remains pending until reservation expiration/reconciliation.
- Simulator endpoints can be mistaken for production payment APIs -> keep provider naming explicit as simulator/local and validate callback tokens/signatures enough for local safety.
- Payment and order transitions can diverge -> update both in one transaction where practical, and test callback success/failure paths.

## Migration Plan

1. Add payment module code and wire it into the backend app module.
2. Reuse existing payment tables; add a migration only if implementation requires it.
3. Add tests for initiation and callback outcomes.
4. Add Postman collection updates for local simulator flows.
5. Rollback by disabling/removing the payment module routes; order reservation and internal status transition remain available.

## Open Questions

- The exact simulator route shape can be finalized during implementation based on current backend routing conventions.
- If the existing `PaymentEvent` model lacks a reliable provider event uniqueness field, implementation may need a small schema update or local duplicate detection around payment state.
