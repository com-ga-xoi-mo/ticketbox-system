## 1. Preflight & Existing Context

- [x] 1.1 Verify the branch includes completed order lifecycle, inventory reservation, and per-user limit changes
- [x] 1.2 Inspect `prisma/schema.prisma` and confirm `Ticket`, `TicketStatus`, `Order`, `OrderItem`, and `OrderPaid` event fields needed for issuance
- [x] 1.3 Run baseline ordering tests and `npm run build` before changing behavior

## 2. Domain & Token Model

- [x] 2.1 Add ticket domain/read models for issued tickets with order, user, concert, ticket type, status, and QR payload fields
- [x] 2.2 Add ticket issuance errors for unpaid order, missing order, partial issuance conflict, and ticket owner access failure
- [x] 2.3 Add a QR token service that creates unguessable/signed QR payloads and hashes tokens for persistence without storing plaintext tokens
- [x] 2.4 Add unit tests proving token hashes are deterministic for verification and raw tokens are not equal to stored hashes

## 3. Application Use Cases & Ports

- [x] 3.1 Define ticket repository ports for issuing tickets for a paid order and reading user-owned tickets
- [x] 3.2 Implement `IssueTicketsForPaidOrderUseCase` that creates one ticket per order item quantity
- [x] 3.3 Make issuance idempotent: repeated calls for a fully issued order return existing tickets and do not create duplicates
- [x] 3.4 Detect partial ticket issuance for an order and fail with a conflict instead of silently adding an inconsistent set
- [x] 3.5 Implement `ListUserTicketsUseCase` and `GetUserTicketUseCase` with owner-scoped access checks

## 4. Prisma Persistence

- [x] 4.1 Implement a Prisma ticket repository that loads paid orders with items and existing tickets in a transaction
- [x] 4.2 Generate stable unique ticket numbers for inserted tickets
- [x] 4.3 Insert tickets with `qrTokenHash`, `ISSUED` status, and correct order/order item/user/concert/ticket type references
- [x] 4.4 Implement owner-scoped ticket list/detail queries with enough concert and ticket type data for API responses
- [x] 4.5 Add repository tests for successful issuance, duplicate issuance, partial issuance conflict, and owner filtering

## 5. OrderPaid Wiring

- [x] 5.1 Replace or extend the current no-op order event publisher so `OrderPaid` triggers ticket issuance
- [x] 5.2 Ensure non-paid order events do not issue tickets
- [x] 5.3 Add tests proving duplicate `OrderPaid` handling does not duplicate tickets
- [x] 5.4 Keep inventory adjustment behavior from payment confirmation intact while adding ticket issuance

## 6. HTTP API

- [x] 6.1 Add authenticated customer endpoint for `GET /me/tickets`
- [x] 6.2 Add authenticated customer endpoint for `GET /me/tickets/:id`
- [x] 6.3 Ensure ticket detail response includes QR payload/code data for the owner
- [x] 6.4 Map ticket not found/owner access failures to not-found style HTTP responses
- [x] 6.5 Add controller tests for list, detail, QR payload presence, and another user's ticket rejection

## 7. Verification & Manual Testing

- [x] 7.1 Run targeted ordering/ticket tests
- [x] 7.2 Run `npm run build`
- [x] 7.3 Manually smoke test a paid order path: create/reserve order, mark it `PAID`, verify tickets are issued exactly once, and fetch the ticket detail QR payload
- [x] 7.4 Add or update Postman guidance for the paid-order-to-ticket-detail manual flow
- [x] 7.5 Review the delta spec against `openspec/specs/ticket-purchase/spec.md` before sync/archive
