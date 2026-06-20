## Context

TicketBox already defines a `payment-reliability` capability and the previous payment simulator change established the intended local payment boundary: customers initiate payment for a pending order, the backend persists a payment attempt, a provider callback updates payment/order state, and duplicate callbacks must not issue duplicate tickets.

This change extends that boundary with a real MoMo sandbox provider. It must stay separate from the simulator so deterministic local tests remain available, while MoMo sandbox can be used for demo flows that look and behave like a third-party payment gateway.

The configured sandbox values are expected to come from environment variables:

- `MOMO_PARTNER_CODE`
- `MOMO_ACCESS_KEY`
- `MOMO_SECRET_KEY`
- `MOMO_ENDPOINT`
- `MOMO_REQUEST_TYPE`
- `MOMO_RETURN_URL`
- `MOMO_IPN_URL`

The current branch must contain the payment module from `implement-payment-simulator` before implementation starts. If it does not, the first implementation step is to merge or restore that payment module because this change intentionally builds on its `PaymentGatewayPort`, persistence, and callback processing patterns.

## Goals / Non-Goals

**Goals:**

- Add a MoMo sandbox adapter behind the payment gateway boundary.
- Create MoMo sandbox payment requests using HMAC SHA256 signing.
- Return MoMo `payUrl` and `deeplink` to the caller.
- Add an IPN endpoint for MoMo callbacks.
- Verify MoMo callback signatures before updating state.
- Map MoMo success/failure callbacks to existing payment and order lifecycle behavior.
- Preserve exactly-once ticket issuance when MoMo sends duplicate callbacks.
- Keep the existing simulator available for deterministic local and Postman tests.

**Non-Goals:**

- Do not implement production MoMo merchant onboarding or production endpoints.
- Do not implement full payment initiation idempotency in this change.
- Do not implement payment circuit breaker behavior in this change.
- Do not implement payment reconciliation worker behavior in this change.
- Do not remove the simulator adapter.
- Do not build frontend payment return pages beyond returning provider URLs and accepting callbacks.

## Decisions

### Decision 1: Add MoMo as a provider adapter, not a replacement

The payment module should support provider selection such as `SIMULATOR` and `MOMO`. `MoMoPaymentGateway` implements the same gateway boundary used by the simulator, while simulator behavior remains available.

Rationale: simulator tests cover deterministic reliability scenarios, while MoMo sandbox covers provider realism. Replacing simulator would make local tests slower and less deterministic.

Alternative considered: switch all payment initiation to MoMo immediately. That would simplify route behavior but would make tests dependent on network and sandbox credentials.

### Decision 2: Use MoMo's signed create-payment request

The adapter builds the MoMo raw signature string from the fields required by `/v2/gateway/api/create`, signs with `MOMO_SECRET_KEY` using HMAC SHA256, and posts JSON to `MOMO_ENDPOINT`.

The returned `payUrl` becomes the primary redirect URL. `deeplink` should be preserved in the response where the existing presenter/DTO can expose provider metadata safely.

Rationale: this matches MoMo sandbox behavior and proves the real provider integration path required by the course.

Alternative considered: call MoMo from the controller directly. That would bypass the clean architecture boundary and make provider behavior harder to test.

### Decision 3: Verify IPN signatures before state changes

The IPN endpoint receives MoMo callback payloads, reconstructs the MoMo signature payload according to the callback documentation, and compares it with the callback `signature` before recording events or changing payment/order state.

Rationale: provider callbacks are public HTTP entry points. Updating order state without signature verification would let anyone mark an order paid.

Alternative considered: accept IPN based only on provider transaction ID. That is not sufficient because transaction IDs are not secrets.

### Decision 4: Use provider transaction and event uniqueness for duplicate callbacks

MoMo callbacks should be recorded as payment events with a stable provider event identifier derived from MoMo fields such as `transId`, `orderId`, `requestId`, and result code. If the same callback is received again, the use case returns a duplicate/no-op result.

Rationale: MoMo and similar gateways can retry callbacks. The order paid path already guards ticket issuance; payment events should also avoid duplicate audit records where possible.

Alternative considered: rely only on order status. That protects tickets but loses clean audit behavior for repeated provider callbacks.

### Decision 5: Keep timeout/reconciliation out of this change

If MoMo payment initiation succeeds but no IPN arrives, the payment remains pending and is handled by the existing reservation expiration behavior or later reconciliation change.

Rationale: reconciliation is already a separate requirement. Adding it here would expand scope beyond MoMo sandbox integration.

## Risks / Trade-offs

- [Risk] `MOMO_IPN_URL` uses an ngrok URL that changes when the tunnel restarts -> Mitigation: document the required env update before each sandbox demo.
- [Risk] Branch lacks the payment simulator module this change depends on -> Mitigation: verify/merge simulator implementation before applying MoMo tasks.
- [Risk] MoMo sandbox network or credentials fail during tests -> Mitigation: keep unit tests around signing/verification and keep simulator as fallback for local reliability tests.
- [Risk] Payment succeeds in MoMo but order transition fails locally -> Mitigation: surface conflict results and leave deeper consistency repair to the later reconciliation/idempotency hardening changes.
- [Risk] Callback payload shape differs from assumed sample fields -> Mitigation: implement parser/verification against captured sandbox payloads and keep raw payload in `payment_events`.

## Migration Plan

1. Ensure payment simulator module/code is present on the branch.
2. Add MoMo env schema and local `.env.example` entries.
3. Add MoMo gateway adapter and provider selection wiring.
4. Add MoMo IPN HTTP endpoint and callback use case support.
5. Add tests for signing, callback verification, status mapping, and duplicate callback no-op.
6. Add Postman/manual docs for ngrok IPN testing.

Rollback is to switch payment initiation back to `SIMULATOR` provider and remove MoMo provider registration/routes. Existing orders, payments, and tickets remain compatible because the change reuses the existing payment tables.

## Open Questions

- Confirm the final MoMo callback payload fields from a real sandbox IPN once ngrok and backend are both running.
- Decide during implementation whether provider metadata such as `deeplink` should be returned as a top-level field or nested under provider metadata in the payment initiation response.
