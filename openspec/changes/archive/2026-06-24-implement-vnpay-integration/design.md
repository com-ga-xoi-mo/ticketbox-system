## Context

The payment module already has a `PaymentGatewayPort`, provider registry, payment attempt persistence, Redis initiation idempotency, provider-isolated circuit breaker, callback event deduplication, and order transition integration. `SIMULATOR` and `MOMO` are registered providers. A successful callback transitions the order to `PAID`, which confirms inventory and issues QR tickets through the existing order lifecycle; a failed callback transitions the order to `FAILED` without issuing tickets.

VNPay sandbox uses a redirect URL rather than a JSON create-payment API. TicketBox must build a sorted query string, multiply the VND amount by 100, sign it with HMAC SHA512, and redirect the customer to the VNPay sandbox page. VNPay later sends the result to both a browser `ReturnUrl` and a server IPN URL. Only the authenticated server-to-server IPN is authoritative for changing payment/order state.

The implementation must preserve the existing MoMo and simulator behavior, reuse the current payment tables, and keep credentials in environment variables.

## Goals / Non-Goals

**Goals:**

- Add `VNPAY` as a provider behind the existing payment gateway boundary.
- Generate a valid VNPay 2.1.0 sandbox payment URL using HMAC SHA512.
- Capture the customer IP address required by VNPay without adding it to the idempotency fingerprint.
- Verify VNPay return and IPN signatures before trusting callback fields.
- Validate terminal code, merchant transaction reference, amount, and payment/provider ownership.
- Use IPN callbacks to map successful and failed results to the existing payment and order lifecycle.
- Deduplicate repeated provider events and preserve exactly-once ticket issuance.
- Reuse payment initiation idempotency and the provider-specific Redis circuit breaker.
- Keep simulator and MoMo integrations available.

**Non-Goals:**

- Production VNPay merchant onboarding or production endpoints.
- Refund, transaction query, recurring payment, token payment, or installment APIs.
- A new reconciliation worker.
- New payment initiation idempotency or circuit breaker mechanisms.
- Frontend payment result pages beyond a backend return endpoint that exposes a normalized verified result.
- Database redesign or a new payment table.
- Forcing a particular bank code; omitting `vnp_BankCode` lets the sandbox page present available methods.

## Decisions

### Decision 1: Add VNPay as a parallel gateway adapter

Add `PaymentProvider.VNPAY`, a `VnpayPaymentGateway`, and registry/module wiring beside the current simulator and MoMo adapters. Payment initiation continues through `InitiatePaymentUseCase`, so ownership checks, pending-order validation, Redis idempotency, circuit breaker behavior, and payment persistence remain provider-independent.

Alternative considered: create a separate VNPay payment endpoint and bypass the shared use case. This would duplicate reliability logic and could let VNPay behave differently from MoMo for retries or circuit failures.

### Decision 2: Build the redirect URL locally

`VnpayPaymentGateway.createRedirectSession` will create VNPay 2.1.0 parameters, sort non-empty `vnp_*` fields by key, URL-encode them consistently, sign the canonical query using `VNPAY_HASH_SECRET` and HMAC SHA512, then append `vnp_SecureHash`.

Required configuration:

- `VNPAY_TMN_CODE`
- `VNPAY_HASH_SECRET`
- `VNPAY_PAYMENT_URL`
- `VNPAY_RETURN_URL`
- `VNPAY_IPN_URL`
- `VNPAY_VERSION`
- `VNPAY_COMMAND`
- `VNPAY_LOCALE`
- `VNPAY_ORDER_TYPE`
- `VNPAY_EXPIRE_MINUTES`

The adapter uses `paymentId` as `vnp_TxnRef` because it is unique for each provider attempt. It sends `amountVnd * 100`, `VND`, GMT+7 create/expire timestamps, and a plain ASCII order description. No `vnp_BankCode` is sent initially, allowing VNPay to show the merchant-enabled payment methods.

Alternative considered: call an external create-payment REST endpoint like MoMo. VNPay PAY 2.1.0 expects the merchant to build a signed redirect URL, so that would not match the provider protocol.

### Decision 3: Pass client IP through the existing initiation flow

Extend the payment initiation command and gateway session input with `clientIp`. The controller derives it from the trusted Nest request IP/proxy configuration and passes it to VNPay as `vnp_IpAddr`. Simulator and MoMo may ignore it. The IP is not part of the payment idempotency fingerprint because retrying from another network must still replay the same initiation result for the same user, order, provider, and idempotency key.

Alternative considered: always send `127.0.0.1`. That is acceptable only for a narrow local demo and produces inaccurate provider data behind a real proxy or public tunnel.

### Decision 4: Keep IPN authoritative and ReturnUrl read-only

Add:

- `GET /payments/vnpay/return` to verify the query signature and return a normalized display result without mutating payment or order state.
- `GET /payments/vnpay/ipn` to verify and process the authoritative server callback.

Both endpoints parse the same VNPay query contract. Only the IPN use case records a payment event and changes payment/order state. This prevents a user-controlled browser redirect from becoming a payment confirmation mechanism.

Alternative considered: update the order from the ReturnUrl. Browser redirects may be omitted, replayed, or manipulated and are not a reliable server notification.

### Decision 5: Validate callback identity and amount before mutation

After signature verification, callback processing must:

1. Confirm `vnp_TmnCode` matches configuration.
2. Find the payment using `vnp_TxnRef`, which equals the locally generated `paymentId` stored as the initial provider transaction reference.
3. Confirm the payment provider is `VNPAY`.
4. Confirm `vnp_Amount / 100` equals the persisted payment amount.
5. Derive success only when both `vnp_ResponseCode` and `vnp_TransactionStatus` are `00`.

`vnp_TransactionNo`, bank code, pay date, response code, transaction status, and the verified raw callback are recorded in payment event metadata. No schema migration is needed.

Alternative considered: locate payments by `vnp_TransactionNo`. That value is unavailable when payment initiation is persisted and only arrives later in callbacks.

### Decision 6: Deduplicate provider events before fulfillment

Create a stable provider event identifier from the merchant transaction reference, VNPay transaction number, response code, transaction status, and pay date. Insert it through the existing unique `PaymentEvent.providerEventId` path before updating the payment. A duplicate event or a payment that is no longer pending returns an idempotent acknowledgement and does not transition the order again.

This is combined with the existing order transition conflict handling and idempotent ticket issuance, so repeated success IPNs cannot create duplicate tickets.

Alternative considered: check only the current order status. That protects fulfillment but loses explicit provider-event deduplication and audit evidence.

### Decision 7: Return VNPay-compatible IPN acknowledgements

The IPN endpoint returns provider-compatible response codes for accepted, duplicate/already-confirmed, invalid signature, unknown payment, invalid amount, and unexpected errors. Application exceptions are translated at the HTTP boundary without leaking secrets or raw internal errors.

The browser return endpoint returns a TicketBox normalized result and does not claim the order is paid until the IPN path has processed the event.

## Risks / Trade-offs

- [Risk] Query canonicalization or URL encoding differs from VNPay expectations -> Mitigation: isolate canonical sorting/signing helpers and test them against fixed vectors and official-style samples.
- [Risk] Application proxy settings expose the tunnel/proxy IP instead of the customer IP -> Mitigation: document trusted proxy configuration and test IPv4/IPv6 normalization.
- [Risk] Customer reaches ReturnUrl before IPN processing -> Mitigation: return a verified provider result but tell clients to query the order/payment status; do not mutate state from ReturnUrl.
- [Risk] VNPay retries IPN after a lost acknowledgement -> Mitigation: persist a stable provider event ID and return an idempotent acknowledgement.
- [Risk] VNPay reports success with a mismatched amount or merchant reference -> Mitigation: reject the mutation and return the appropriate callback error response.
- [Risk] Sandbox credentials or public IPN URL are unavailable -> Mitigation: keep deterministic adapter/use-case tests and preserve simulator/MoMo providers.
- [Risk] The existing provider port contains provider-specific verification methods -> Mitigation: extend it minimally for VNPay in this change; a generic callback-verifier refactor is out of scope.

## Migration Plan

1. Add VNPay environment placeholders and validated config accessors.
2. Extend provider/port types and add the VNPay adapter with signing tests.
3. Register VNPay in the gateway registry and payment module.
4. Add VNPay return/IPN DTO parsing, verification, use case, presenter, and routes.
5. Add success, failure, mismatch, invalid-signature, duplicate-event, idempotency, and circuit-isolation tests.
6. Add Postman/manual sandbox instructions using a public HTTPS IPN URL.
7. Deploy with VNPay variables configured; existing simulator and MoMo requests remain unchanged.

Rollback disables `VNPAY` provider selection and removes its registration/routes. Existing payment records remain valid because they use the shared payment schema.

## Open Questions

- Confirm the sandbox `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` before manual testing; they must remain only in local/secret environment configuration.
- Confirm whether the registered VNPay sandbox IPN URL is supplied through the merchant portal or requires an explicit configuration step outside the payment URL.
- Confirm the public frontend route that should consume the verified return result; backend implementation can initially use the configured return URL directly.
