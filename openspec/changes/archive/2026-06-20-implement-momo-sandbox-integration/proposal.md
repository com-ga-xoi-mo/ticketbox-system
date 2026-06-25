## Why

The existing payment simulator proves the local payment lifecycle, but the course requirement expects customers to pay through a VNPAY/MoMo-like gateway and demo a provider-style sandbox flow. This change adds a real MoMo sandbox adapter so TicketBox can create MoMo payment URLs and receive signed provider callbacks without replacing the internal simulator.

## What Changes

- Add MoMo sandbox support behind the existing payment gateway boundary.
- Initiate MoMo payments through `https://test-payment.momo.vn/v2/gateway/api/create` and return MoMo `payUrl`/`deeplink` data.
- Add configuration for `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT`, `MOMO_REQUEST_TYPE`, `MOMO_RETURN_URL`, and `MOMO_IPN_URL`.
- Add an IPN callback endpoint for MoMo sandbox to notify backend payment results.
- Verify MoMo callback signatures before mutating payment or order state.
- Map successful and failed MoMo callbacks to the existing payment status and order lifecycle.
- Preserve the existing simulator and allow provider selection without removing local deterministic tests.
- Keep duplicate callback handling aligned with the existing exactly-once ticket issuance behavior.
- Exclude full payment initiation idempotency, circuit breaker behavior, and reconciliation worker changes from this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `payment-reliability`: adds real MoMo sandbox provider initiation and signed IPN callback behavior alongside the existing payment gateway abstraction.

## Impact

- Adds MoMo sandbox adapter code under the backend payment module.
- Updates payment HTTP DTOs/controllers for provider selection and MoMo IPN handling.
- Extends platform configuration validation for MoMo sandbox environment variables.
- Adds tests for MoMo request signing, callback signature verification, successful callback, failed callback, and duplicate callback behavior.
- Adds Postman/manual test guidance for MoMo sandbox payment initiation and IPN testing through a public tunnel such as ngrok.
