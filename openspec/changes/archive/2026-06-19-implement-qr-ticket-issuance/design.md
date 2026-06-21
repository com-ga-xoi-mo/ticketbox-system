## Context

The ordering module already supports `PENDING_PAYMENT -> PAID` transitions and emits `OrderPaid` domain events. The Prisma schema already contains a `tickets` table with `ticket_number`, order/user/concert/ticket type references, `qr_token_hash`, `status`, `issued_at`, and `checked_in_at`.

The accepted blueprint requires paid orders to issue QR e-tickets exactly once and store only unguessable QR token hashes. Check-in validation is a separate capability and will consume these ticket records later.

## Goals / Non-Goals

**Goals:**

- Issue one ticket per purchased unit after an order reaches `PAID`.
- Store only a hash of each QR token in `tickets.qr_token_hash`.
- Make issuance idempotent so duplicate payment callbacks or repeated `OrderPaid` processing do not create duplicate tickets.
- Expose authenticated customer APIs to list owned tickets and retrieve ticket detail with QR payload.
- Preserve clean architecture: use cases depend on ticket issuance/read ports; Prisma owns persistence details; controllers only handle HTTP/auth mapping.
- Add automated tests and a manual smoke path for paid order to issued QR ticket.

**Non-Goals:**

- Online QR scan/check-in validation. That belongs to `implement-checkin-offline-sync`.
- QR image file persistence in object storage. The API can return a QR payload/string; rendering can be done by frontend or added later.
- Payment gateway simulator/callback reliability. This change consumes the existing paid order transition path.
- Refund ticket voiding beyond the current ticket status model. Refund behavior should be handled in a later payment/refund lifecycle change.

## Decisions

### Decision 1: Treat ticket issuance as an `OrderPaid` side effect

`TransitionOrderStatusUseCase` already emits `OrderPaid` when an order becomes `PAID`. This change should add a ticket issuance handler/publisher path that reacts to that event and calls an `IssueTicketsForPaidOrderUseCase`.

Alternative considered: issue tickets directly inside `TransitionOrderStatusUseCase`. Rejected because inventory adjustment, event publication, notification, and ticket issuance are separate side effects; keeping issuance behind an event handler keeps the transition use case focused.

### Decision 2: Reuse the existing `tickets` table without schema migration

The current schema already has the fields needed for issuance and later check-in: ticket number, order references, owner, concert, ticket type, QR token hash, status, and timestamps. Implementation should create records from paid order items and avoid adding new columns unless the code reveals a missing invariant.

Alternative considered: add a separate QR token table. Rejected for this slice because each ticket has exactly one active token in the current blueprint and `qr_token_hash` is already unique.

### Decision 3: Generate deterministic signed QR tokens and store hashes only

Generate deterministic signed QR payloads using stable ticket fields and a backend secret. Store a SHA-256 hash of the signed payload in `qr_token_hash`; return the raw signed payload only in the ticket detail response for the owning user. The QR payload should include enough information for later check-in to locate/verify the ticket, such as ticket ID plus a signature.

Alternative considered: encode ticket ID alone in the QR. Rejected because ticket IDs are not secrets; a QR must include an unguessable bearer token for gate validation.

### Decision 4: Make issuance idempotent by checking existing tickets for the order

Before issuing, the repository should load the paid order with items and existing tickets in a transaction. If tickets already exist for the order and the count matches the total order item quantity, return the existing issuance result instead of inserting more rows. If a partial issuance is detected, fail with a conflict so the issue is visible instead of silently producing an inconsistent ticket set.

Alternative considered: blindly insert and rely only on unique token hashes. Rejected because duplicate callbacks would create new valid tickets for the same paid order.

### Decision 5: Keep raw QR tokens out of persisted storage

Because only hashes are persisted, the backend cannot recover random raw tokens. This change will use deterministic signed token payloads backed by a server secret, with only the hash stored for future check-in lookup.

## Risks / Trade-offs

- **[Risk] Duplicate payment callback creates duplicate tickets** -> Mitigation: issuance checks existing ticket count for the paid order inside a transaction before inserting.
- **[Risk] Raw QR token cannot be shown again if only a random token hash is stored** -> Mitigation: use deterministic signed token generation from stable ticket data and server secret.
- **[Risk] Ticket issuance handler fails after order becomes `PAID`** -> Mitigation: keep issuance use case idempotent and callable by a retry/job path; tests should cover repeated calls.
- **[Risk] QR token leaks through logs or database** -> Mitigation: never log raw token and never persist it as plaintext.
- **[Risk] Check-in later expects a different QR payload** -> Mitigation: document the QR payload format and keep check-in validation future-compatible with ticket ID plus token verification.

## Migration Plan

No Prisma migration is expected because the `tickets` table already exists.

Implementation order:

1. Add ticket domain model, token service, ports, and issuance/read use cases.
2. Add Prisma ticket repository methods for paid order lookup, idempotent ticket insertion, and owner-scoped reads.
3. Wire issuance to `OrderPaid` event publication and expose customer ticket endpoints.
4. Add tests for exact-once issuance, token hashing, owner access, duplicate event handling, and API responses.
5. Run targeted ordering tests, build, and a manual paid-order smoke test.

Rollback is reverting this change's code. Existing issued tickets are append-only fulfillment records and should not be deleted during rollback unless they were created by local test data.

## Open Questions

- None. The team has selected deterministic signed QR payloads with hash-only persistence.
