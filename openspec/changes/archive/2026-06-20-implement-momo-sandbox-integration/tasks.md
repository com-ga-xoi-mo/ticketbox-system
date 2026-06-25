## 1. Baseline And Configuration

- [x] 1.1 Verify the payment module from `implement-payment-simulator` is present on this branch; merge or restore it before MoMo-specific work if missing.
- [x] 1.2 Confirm existing Prisma `Payment` and `PaymentEvent` fields can store MoMo provider transaction IDs, redirect URL, failure details, and raw callback payloads without a migration.
- [x] 1.3 Extend platform environment validation/config accessors for `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT`, `MOMO_REQUEST_TYPE`, `MOMO_RETURN_URL`, and `MOMO_IPN_URL`.
- [x] 1.4 Keep `.env.example` aligned with MoMo sandbox variables while avoiding accidental production credential assumptions.

## 2. Payment Provider Contract

- [x] 2.1 Extend payment provider selection to accept `MOMO` alongside `SIMULATOR` without removing simulator behavior.
- [x] 2.2 Decide the response shape for MoMo provider metadata, including `payUrl` as redirect URL and `deeplink` when present.
- [x] 2.3 Ensure unsupported provider values return clear validation errors.

## 3. MoMo Gateway Adapter

- [x] 3.1 Implement `MoMoPaymentGateway` behind the existing payment gateway boundary.
- [x] 3.2 Implement MoMo create-payment payload construction for `/v2/gateway/api/create`.
- [x] 3.3 Implement HMAC SHA256 signing using MoMo's required raw signature field order.
- [x] 3.4 Call the configured MoMo sandbox endpoint and map successful responses to provider transaction ID, redirect URL, and deeplink metadata.
- [x] 3.5 Map MoMo initiation failures to clear application errors without changing order/payment state incorrectly.

## 4. MoMo IPN Callback Handling

- [x] 4.1 Add a public MoMo IPN callback endpoint, for example `POST /payments/momo/ipn`.
- [x] 4.2 Implement MoMo IPN DTO parsing for sandbox callback payloads and preserve raw payload for audit.
- [x] 4.3 Verify MoMo IPN signatures before recording provider events or mutating payment/order state.
- [x] 4.4 Map successful MoMo result codes to payment `SUCCEEDED` and order `PAID`.
- [x] 4.5 Map failed MoMo result codes to payment `FAILED` and order `FAILED`.
- [x] 4.6 Treat duplicate MoMo IPN callbacks as idempotent no-ops and ensure they do not issue duplicate tickets.
- [x] 4.7 Return a MoMo-compatible callback response body/status for accepted, duplicate, and rejected callbacks.

## 5. Tests

- [x] 5.1 Add unit tests for MoMo request signing and create-payment payload construction.
- [x] 5.2 Add unit tests for MoMo IPN signature verification and invalid-signature rejection.
- [x] 5.3 Add use-case tests for successful MoMo IPN marking payment/order paid and issuing tickets through the existing order paid flow.
- [x] 5.4 Add use-case tests for failed MoMo IPN marking payment/order failed without issuing tickets.
- [x] 5.5 Add duplicate MoMo IPN tests proving no duplicate ticket issuance.
- [x] 5.6 Run targeted backend tests and TypeScript/build checks available in the workspace.

## 6. Manual Testing Docs

- [x] 6.1 Add Postman or manual test notes for initiating MoMo sandbox payment from an existing pending order.
- [x] 6.2 Document ngrok setup and the requirement to refresh `MOMO_IPN_URL` when the tunnel changes.
- [x] 6.3 Document expected MoMo sandbox success, failure, invalid signature, and duplicate IPN test results.
