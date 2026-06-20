## Why

The backend currently supports creating and reserving orders, and internal status transitions can mark an order paid for development/testing. That is not enough for the payment reliability scope in the blueprint: users need a payment initiation flow that returns a provider-style redirect URL, and the backend needs a callback path that can drive order payment outcomes through the same order lifecycle already implemented.

This change introduces the local VNPAY/MoMo-like payment simulator required by the blueprint so the team can test success, failure, timeout, delayed callback, and duplicate callback paths without integrating a real payment provider.

## What Changes

- Add a payment application module following the existing Clean Architecture pattern.
- Add a `PaymentGatewayPort` and a local simulator adapter that creates provider-style redirect URLs.
- Add an authenticated endpoint for an audience user to initiate payment for their own `PENDING_PAYMENT` order.
- Persist payment attempts/events using the existing payment-related database model.
- Add simulator callback handling that records provider events and transitions the related order to `PAID` or `FAILED` where appropriate.
- Keep timeout behavior as pending payment/order state so reservation expiration and later reconciliation changes can process it.
- Support duplicate simulator callbacks without creating duplicate fulfillment side effects.
- Add tests for initiate payment, successful callback, failed callback, timeout behavior, and duplicate callback handling.
- Add Postman/testing guidance for the simulator flow.

Out of scope for this change:

- Full client-supplied payment idempotency storage for repeated payment initiation.
- Circuit breaker around a real provider.
- Scheduled payment reconciliation worker.
- Real VNPAY/MoMo integration.

Those are already separated in the team change plan and payment reliability spec.

## Capabilities

### New Capabilities

None. This change implements part of the existing `payment-reliability` capability.

### Modified Capabilities

- `payment-reliability`: adds concrete simulator-backed gateway behavior and callback scenarios for payment initiation and provider outcome handling.

## Impact

- Adds payment module/application code under `packages/backend/src`.
- Integrates payment callback handling with the existing ordering lifecycle and ticket issuance path through order paid transitions.
- Uses existing Prisma payment models where possible; schema changes are only expected if implementation reveals a missing field that cannot be represented safely.
- Adds backend tests for payment simulator behavior and order transition side effects.
- Adds or updates local Postman documentation for the new payment simulator flow.
