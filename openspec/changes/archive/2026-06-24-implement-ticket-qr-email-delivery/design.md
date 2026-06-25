## Context

The paid-order flow already issues one ticket row per purchased unit and stores only the SHA-256 hash of each signed QR payload. `GetUserTicketUseCase` proves that the raw payload can be deterministically recreated from persisted ticket fields and `QR_TOKEN_SECRET`. The notification flow currently enqueues one order-level purchase-confirmation job, persists plain-text in-app and email notification records, and sends the email through a retryable worker.

The audience web flow is not complete and is owned by another contributor. This change therefore delivers usable QR tickets through the existing backend notification path and documents the API contract for later frontend work without editing `apps/web`.

The main constraints are:

- Raw QR payloads, QR PNG bytes, and `QR_TOKEN_SECRET` must not be stored in PostgreSQL, Redis job payloads, object storage, or logs.
- Email retries must recreate the same payloads from existing tickets and must never call ticket issuance.
- Notification failure must remain isolated from the already-committed paid order and issued tickets.
- Existing local/Maildev and authenticated SMTP transports must continue to work.

## Goals / Non-Goals

**Goals:**

- Include one scannable QR image and human-readable ticket details for every issued ticket in a purchase confirmation email.
- Generate QR payloads and PNG bytes only during a worker delivery attempt.
- Preserve order-level notification deduplication and bounded email retries.
- Support both Nodemailer SMTP and the local plaintext SMTP transport.
- Leave a precise frontend handoff for rendering `qrPayload` returned by the existing ticket detail API.

**Non-Goals:**

- Building or modifying the audience web UI.
- Changing payment, order transition, ticket issuance, QR token format, or check-in validation.
- Persisting generated QR images or raw payloads.
- Adding object-storage delivery or redesigning the notification architecture.

## Decisions

### 1. Generate QR attachments at email delivery time

The delivery job will carry the non-sensitive `orderId` in addition to the notification ID and recipient. Before each purchase-confirmation email attempt, a notification application service will load the already-issued tickets for that order through a dedicated read port, recreate each signed payload with the existing `QrTicketTokenService`, and render PNG buffers in memory.

This keeps raw QR material out of the order-paid event, BullMQ purchase-confirmation job, notification record, and database. It also makes retries deterministic: the same persisted ticket identity and signing secret produce the same payload without issuing another ticket.

Alternative considered: include raw payloads or PNG bytes in the queue job. Rejected because BullMQ persists job data in Redis and would create another durable copy of sensitive ticket credentials.

### 2. Keep issuance and delivery as separate responsibilities

The QR email flow will only query existing tickets. A missing or incomplete issued-ticket set is a delivery error and must not trigger `IssueTicketsForPaidOrderUseCase`.

Duplicate `OrderPaid` processing remains controlled by existing ticket issuance and purchase-confirmation dedupe keys. Delivery retries may resend the email but cannot create rows in `tickets`.

Alternative considered: issue or repair tickets inside the notification worker. Rejected because it couples delivery reliability to fulfillment and could create partial or duplicate issuance behavior.

### 3. Extend delivery contracts with optional attachments

`DeliveryRequest` and SMTP message contracts will support optional attachments containing filename, MIME type, content bytes, and optional content ID. The purchase-confirmation composer will provide PNG attachments named from sanitized ticket numbers. Other notification types continue sending plain text with no attachments.

Nodemailer maps these values directly to its attachment API. The local socket SMTP transport will emit a standards-compliant multipart MIME message so Maildev remains a valid development path.

Alternative considered: email data URLs or base64 text in the body. Rejected because clients handle MIME attachments/inline images more reliably and large encoded bodies are harder to inspect safely.

### 4. Add a QR renderer port

The application layer will depend on a small QR image renderer port returning PNG bytes. Infrastructure will implement it with a maintained QR generation package configured for a readable error-correction level and deterministic image settings.

This keeps the QR library outside domain/application logic and allows unit tests to use a deterministic fake without comparing binary image internals.

### 5. Store only non-sensitive notification text

The notification database record will retain the existing subject, summary, ticket count, concert time, and access URL. It will not store raw QR payloads, attachment bytes, or secrets. Ticket-level sensitive content is assembled only for the active delivery attempt.

The delivery job may store `orderId`, because it is already a normal system identifier and is sufficient for the worker to resolve current issued tickets.

### 6. Frontend integration remains a documented contract

The handoff document will state that:

- `GET /me/tickets` lists only tickets owned by the authenticated audience user.
- `GET /me/tickets/:id` returns ticket details including a freshly recreated `qrPayload`.
- The frontend treats `qrPayload` as opaque data and renders it with a QR library.
- The frontend must not sign tokens, receive `QR_TOKEN_SECRET`, store the payload in persistent browser storage, or log it.

## Risks / Trade-offs

- **Email size grows linearly with ticket count** -> Enforce bounded ticket quantities already present in checkout, generate compact PNGs, and test multi-ticket MIME output.
- **A QR package adds a runtime dependency** -> Select a maintained package with TypeScript support and wrap it behind a port.
- **SMTP clients render inline images differently** -> Attach each PNG with a stable filename and optionally a content ID; ensure the plain-text body still identifies all tickets.
- **Retry sends the customer another copy of the same QR email** -> Accept resend as at-least-once delivery while preserving exactly-once ticket issuance and notification attempt history.
- **Changing the signing secret invalidates recreated payloads** -> Treat `QR_TOKEN_SECRET` as persistent environment configuration and document that rotation requires an explicit migration strategy outside this change.
- **Ticket data changes between attempts** -> Read only issued ticket identity and display metadata from the database at attempt time; do not mutate ticket state during composition.

## Migration Plan

1. Add attachment and delivery-context contracts with backward-compatible optional fields.
2. Add the issued-ticket email read port, Prisma adapter, QR renderer port, and infrastructure implementation.
3. Wire purchase-confirmation delivery to compose attachments at attempt time.
4. Extend both SMTP transports and tests.
5. Deploy API and worker with the same stable `QR_TOKEN_SECRET`; restart workers after configuration changes.
6. Rollback by deploying the previous worker/API version. Existing orders, tickets, notifications, and queue records remain valid because no schema migration is required.

## Open Questions

- Choose attachment-only versus inline-plus-attachment presentation during implementation based on reliable behavior in Gmail and Maildev; both satisfy the capability as long as each ticket has a scannable PNG.
