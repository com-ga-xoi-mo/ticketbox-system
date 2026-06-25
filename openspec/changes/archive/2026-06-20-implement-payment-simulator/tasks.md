## 1. Context And Data Model

- [x] 1.1 Inspect existing payment-related Prisma models, generated client types, and current order transition APIs.
- [x] 1.2 Decide whether existing `Payment` and `PaymentEvent` fields are enough for simulator attempts/events; add a minimal migration only if required.
- [x] 1.3 Confirm payment module naming and route conventions against existing backend module patterns.

## 2. Payment Application Core

- [x] 2.1 Add payment domain/application types for initiating payment and handling provider callbacks.
- [x] 2.2 Define `PaymentRepositoryPort`, `PaymentGatewayPort`, and an order transition/lookup adapter boundary.
- [x] 2.3 Implement initiate-payment use case for an authenticated owner of a `PENDING_PAYMENT` order.
- [x] 2.4 Implement callback-processing use case for simulator success, failure, timeout/no-op, delayed outcome, and duplicate callback cases.

## 3. Persistence And Simulator Adapter

- [x] 3.1 Implement Prisma payment repository for creating payment attempts, updating status, and recording provider events.
- [x] 3.2 Implement local simulator gateway adapter that creates deterministic redirect URLs.
- [x] 3.3 Implement simulator callback validation using an opaque token or signature suitable for local backend testing.
- [x] 3.4 Ensure duplicate successful simulator callbacks do not duplicate order-paid side effects or ticket issuance.

## 4. HTTP Integration

- [x] 4.1 Add authenticated payment initiation endpoint for customer payment of their own pending order.
- [x] 4.2 Add simulator redirect/callback endpoints for success, failure, timeout, delayed callback, and duplicate callback testing.
- [x] 4.3 Wire payment module into the backend app module and existing config where needed.
- [x] 4.4 Return clear API errors for invalid order ownership, invalid order state, invalid simulator token, and unsupported simulator outcome.

## 5. Tests And Verification

- [x] 5.1 Add unit tests for initiate-payment use case and simulator gateway adapter.
- [x] 5.2 Add integration tests for successful callback marking order paid and issuing tickets.
- [x] 5.3 Add integration tests for failed callback marking order failed and not issuing tickets.
- [x] 5.4 Add tests for timeout behavior leaving payment/order pending.
- [x] 5.5 Add tests for duplicate successful callback not issuing duplicate tickets.
- [x] 5.6 Run targeted backend test suites and TypeScript checks available in the workspace.

## 6. Local Testing Docs

- [x] 6.1 Add or update Postman collection/environment entries for payment simulator initiation and callback flows.
- [x] 6.2 Document manual test steps for success, failure, timeout, delayed callback, and duplicate callback scenarios.
