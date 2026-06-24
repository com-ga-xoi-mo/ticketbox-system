## Why

TicketBox currently supports the local payment simulator and MoMo, but it needs an additional real sandbox provider so payment demos are not tied to a single external gateway. Adding VNPay behind the existing payment boundary also proves that provider-specific request signing and callbacks can reuse the same idempotent payment, order, inventory, and ticket-issuance lifecycle.

## What Changes

- Add VNPay sandbox as a selectable payment provider alongside `SIMULATOR` and `MOMO`.
- Build signed VNPay 2.1.0 payment URLs and return the URL through the existing payment initiation response.
- Add VNPay configuration for terminal code, hash secret, sandbox payment URL, return URL, IPN URL, locale, order type, and payment expiry.
- Add public VNPay return and IPN endpoints with signature verification.
- Treat the server-to-server IPN as the authoritative input for payment and order state changes; keep the browser return endpoint read-only.
- Validate callback terminal code, merchant transaction reference, amount, and provider transaction data before changing state.
- Map successful and failed VNPay IPNs into the existing payment status and order lifecycle.
- Deduplicate repeated VNPay callbacks so an order transitions and issues tickets at most once.
- Reuse existing payment initiation idempotency, provider-isolated circuit breaker, payment persistence, and ticket issuance behavior.
- Keep the simulator and MoMo integrations available.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payment-reliability`: add VNPay sandbox payment URL creation, signed return/IPN verification, authoritative IPN processing, validation, and duplicate callback behavior.

## Impact

- Extends the backend payment provider enum, DTO validation, gateway registry, module wiring, and provider metadata.
- Adds a VNPay adapter, callback DTOs, callback use case, presenters, and HTTP endpoints under `packages/backend/src/payment/`.
- Extends platform environment validation and `.env.example` with VNPay sandbox settings without committing merchant secrets.
- Reuses the existing `Payment`, `PaymentEvent`, order transition, inventory confirmation/release, and QR ticket issuance paths; no new payment table is expected.
- Adds unit and integration tests for URL signing, callback verification, success/failure mapping, invalid callback rejection, callback deduplication, idempotent initiation, and provider circuit isolation.
- Adds Postman/manual sandbox guidance, including the requirement for a publicly reachable HTTPS IPN URL.
