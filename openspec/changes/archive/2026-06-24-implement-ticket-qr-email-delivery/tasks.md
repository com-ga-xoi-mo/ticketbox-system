## 1. Delivery Contracts And Dependencies

- [x] 1.1 Add a maintained QR PNG generation dependency and its TypeScript types where required.
- [x] 1.2 Extend notification delivery and SMTP message contracts with optional binary attachments and optional purchase-confirmation delivery context while preserving existing callers.
- [x] 1.3 Extend the notification delivery BullMQ job data with the paid order ID, without adding raw QR payloads or image bytes to queue data.

## 2. Issued Ticket Read Boundary

- [x] 2.1 Define a notification-owned read port for loading issued ticket email details by order ID, including ticket identity, ticket number, ticket type, user, concert, and issuance timestamp fields needed by `QrTicketTokenService`.
- [x] 2.2 Implement the Prisma read adapter with paid-order and issued-ticket filtering, deterministic ticket ordering, and no ticket mutations.
- [x] 2.3 Add unit tests for one ticket, multiple tickets, missing orders, unpaid orders, and orders without issued tickets.

## 3. Transient QR Composition

- [x] 3.1 Define a QR image renderer port and implement a PNG renderer adapter with deterministic, scannable settings.
- [x] 3.2 Implement the purchase-confirmation email attachment composer using the issued-ticket read port, existing `QrTicketTokenService`, and QR renderer.
- [x] 3.3 Sanitize attachment filenames, create one distinct PNG per ticket, and ensure raw payloads, PNG bytes, and secrets are never logged or persisted.
- [x] 3.4 Add tests proving deterministic payload recreation, one-versus-many attachment mapping, unique ticket payloads, and safe failure when issued-ticket data is missing.

## 4. Worker Delivery Integration

- [x] 4.1 Pass the order ID from the purchase-confirmation processor into the email delivery job while preserving order-level notification deduplication and bounded retry configuration.
- [x] 4.2 Update `DeliverNotificationUseCase` to compose QR attachments only for purchase-confirmation email attempts and leave reminders and other notifications unchanged.
- [x] 4.3 Wire the new read adapter, QR renderer, composer, and `QrTicketTokenService` into `NotificationModule` without importing `OrderModule` or creating a Nest module cycle.
- [x] 4.4 Add processor and use-case tests proving retries recreate attachments from existing tickets and never call ticket issuance.

## 5. SMTP Attachment Support

- [x] 5.1 Map delivery attachments to Nodemailer attachments for authenticated Gmail/TLS delivery.
- [x] 5.2 Extend the local socket SMTP transport to produce valid multipart MIME messages with base64 PNG attachments while retaining plain-text behavior when no attachments exist.
- [x] 5.3 Add transport tests for Gmail/Nodemailer mapping, Maildev multipart output, sanitized headers and filenames, and multiple ticket attachments.

## 6. End-To-End Verification And Handoff

- [x] 6.1 Add an integration test covering paid order issuance through queued purchase confirmation and email delivery with one QR per existing ticket.
- [x] 6.2 Add regression tests proving duplicate paid-order handling creates no duplicate tickets or notification records and transient email failure does not alter the paid order.
- [x] 6.3 Add security assertions that notification records and BullMQ job data contain no raw QR payload, PNG bytes, or signing secret.
- [x] 6.4 Write a frontend handoff document for `GET /me/tickets` and `GET /me/tickets/:id`, including ownership rules and safe rendering of the opaque `qrPayload`.
- [x] 6.5 Run targeted notification/ordering tests, workspace typecheck/build, lint, and format checks; document any environment-only Gmail verification that still requires a manual test.
