## Why

TicketBox already issues secure QR e-tickets after successful payment, but the purchase confirmation email only provides a ticket-access link. Because the audience frontend is not yet complete, buyers need a backend-owned delivery path that lets them receive and use each issued QR ticket without coupling this work to the web team's UI.

## What Changes

- Extend purchase confirmation data loading to include every issued ticket for the paid order.
- Recreate each ticket's signed `qrPayload` with the existing `QrTicketTokenService` and render it as an in-memory PNG.
- Send one clearly identified QR image per ticket as an inline image or attachment together with ticket and concert details.
- Keep raw QR payloads and generated image bytes out of the database, durable notification records, object storage, and logs.
- Preserve exactly-once ticket issuance: duplicate `OrderPaid` handling or email retries reuse existing tickets and never issue new ones.
- Keep email delivery best-effort and retryable so delivery failure cannot roll back a paid order or issued tickets.
- Document the existing customer ticket API contract for future frontend integration without modifying `apps/web`.
- Add automated coverage for single-ticket and multi-ticket email delivery, SMTP MIME content, retry behavior, and sensitive-data handling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notification-delivery`: Purchase confirmation email delivery will include secure, per-ticket QR images and ticket details while preserving retry, deduplication, and failure-isolation behavior.

## Impact

- Backend notification application ports, purchase-confirmation read models, and queue job contracts.
- Notification worker email rendering and SMTP adapter attachment/inline-image support.
- Ordering/notification integration for recreating QR payloads from existing issued tickets.
- A QR image generation dependency may be added to the backend workspace.
- Tests and documentation for notification delivery and the frontend ticket-detail handoff.
- No changes to payment behavior, ticket issuance rules, QR token format, database QR storage, object storage, check-in behavior, or `apps/web`.
