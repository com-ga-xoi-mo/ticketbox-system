## 1. Baseline And Configuration

- [x] 1.1 Verify the current payment module contains simulator, MoMo, Redis payment idempotency, provider-isolated circuit breaker, payment events, and existing order/ticket lifecycle integration.
- [x] 1.2 Confirm the existing `Payment` and `PaymentEvent` schema can store VNPay merchant references, VNPay transaction metadata, redirect URLs, failure details, and raw callback payloads without a migration.
- [x] 1.3 Add VNPay sandbox variables to `.env.example` using placeholders only and extend environment validation/config accessors for terminal code, hash secret, payment URL, return URL, IPN URL, version, command, locale, order type, and expiry minutes.
- [x] 1.4 Document that real VNPay credentials remain in local secret environment configuration and are never committed.

## 2. Provider Contract And Initiation Input

- [x] 2.1 Add `VNPAY` to payment provider selection and request DTO validation without changing `SIMULATOR` or `MOMO`.
- [x] 2.2 Extend the payment gateway session input with the customer IP address and pass a normalized request IP from the payment controller through `InitiatePaymentUseCase`.
- [x] 2.3 Keep the existing payment idempotency fingerprint based on user, order, and provider so client IP changes do not create a different idempotent operation.
- [x] 2.4 Extend gateway callback types and provider metadata for verified VNPay return/IPN data without exposing hash secrets.

## 3. VNPay Gateway Adapter

- [x] 3.1 Implement `VnpayPaymentGateway` behind the existing payment gateway boundary.
- [x] 3.2 Implement deterministic VNPay query canonicalization with sorted non-empty parameters and consistent URL encoding.
- [x] 3.3 Implement HMAC SHA512 signing and timing-safe signature verification while excluding `vnp_SecureHash` and `vnp_SecureHashType` from callback hash input.
- [x] 3.4 Build VNPay 2.1.0 sandbox payment URLs using `paymentId` as `vnp_TxnRef`, `amountVnd * 100`, the customer IP, GMT+7 create/expire timestamps, and configured return settings.
- [x] 3.5 Return the signed VNPay URL as the redirect URL and preserve safe provider metadata needed for diagnostics.
- [x] 3.6 Register the VNPay adapter in `PaymentGatewayRegistry` and `PaymentModule` so initiation reuses existing persistence, idempotency, and circuit breaker behavior.

## 4. VNPay Return And IPN Verification

- [x] 4.1 Add DTO/query parsing for VNPay return and IPN parameters while preserving the verified raw provider payload for audit.
- [x] 4.2 Add `GET /payments/vnpay/return` that verifies the secure hash and returns a normalized read-only result without updating payment or order state.
- [x] 4.3 Add `GET /payments/vnpay/ipn` as the authoritative server callback endpoint.
- [x] 4.4 Verify callback terminal code, merchant transaction reference, payment provider, and scaled amount before recording an event or changing state.
- [x] 4.5 Return provider-compatible VNPay acknowledgement codes for accepted, already-confirmed, invalid-signature, unknown-payment, invalid-amount, and unexpected-error outcomes.

## 5. Payment And Order Lifecycle

- [x] 5.1 Implement a VNPay IPN processing use case that finds the payment by the `vnp_TxnRef` merchant reference and records the verified callback as a payment event.
- [x] 5.2 Treat a callback as successful only when both `vnp_ResponseCode` and `vnp_TransactionStatus` equal `00`, then mark payment `SUCCEEDED` and transition the order to `PAID`.
- [x] 5.3 Map valid final non-success callbacks to payment `FAILED` with provider details and transition the order to `FAILED`.
- [x] 5.4 Derive a stable VNPay provider event ID and treat repeated events or non-pending payments as idempotent no-ops.
- [x] 5.5 Verify that successful VNPay processing confirms reserved inventory and issues tickets exactly once through the existing order paid flow, while failed processing releases inventory and issues no tickets.

## 6. Automated Tests

- [x] 6.1 Add fixed-vector unit tests for VNPay parameter ordering, URL encoding, amount scaling, GMT+7 timestamps, HMAC SHA512 signing, and invalid-signature rejection.
- [x] 6.2 Add adapter tests for signed payment URL generation and safe provider metadata.
- [x] 6.3 Add controller/use-case tests proving ReturnUrl is read-only and IPN is authoritative.
- [x] 6.4 Add IPN tests for successful payment, failed payment, terminal mismatch, unknown payment, provider mismatch, amount mismatch, and provider-compatible acknowledgements.
- [x] 6.5 Add duplicate-success IPN tests proving the order, inventory, and ticket issuance paths execute at most once.
- [x] 6.6 Add tests proving same-key VNPay initiation replays the stored result, provider key reuse mismatch is rejected, and VNPay circuit state is isolated from MoMo/simulator.
- [x] 6.7 Run targeted payment tests, relevant order/ticket integration tests, TypeScript compilation, and available backend test suites.

## 7. Sandbox And Postman Verification

- [x] 7.1 Add or update a Postman collection/environment for register/login, create order, initiate `VNPAY` payment, open the redirect URL, inspect return data, and verify final order/ticket state after IPN.
- [x] 7.2 Document VNPay sandbox credential setup and the public HTTPS IPN URL requirement, including tunnel URL refresh steps.
- [x] 7.3 Record expected results for successful payment, failed/cancelled payment, invalid signature, amount mismatch, duplicate IPN, idempotent initiation replay, and provider circuit isolation.
