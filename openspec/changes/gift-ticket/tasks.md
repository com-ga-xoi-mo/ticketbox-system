## 1. Database Schema

- [x] 1.1 Add `TRANSFER_PENDING` value to the `TicketStatus` enum in `prisma/schema.prisma`
- [x] 1.2 Add `TicketTransfer` model to `prisma/schema.prisma` with fields: `id`, `ticketId`, `senderId`, `recipientEmail`, `tokenHash` (unique), `status` (enum: `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`, `EXPIRED`), `expiresAt`, `createdAt`, `updatedAt`
- [x] 1.3 Add `TicketTransferStatus` enum to `prisma/schema.prisma`
- [x] 1.4 Run `npm run db:migrate` and verify migration applies cleanly
- [x] 1.5 Run `npm run verify:prisma` to confirm schema validity and regenerate client

## 2. API Types (packages/api-types)

- [x] 2.1 Create `packages/api-types/src/gifting/transfer.contract.ts` with Zod schemas: `InitiateTransferRequestSchema` (recipientEmail), `TransferSummaryResponseSchema` (transferId, recipientEmail, expiresAt, status), `TransferDetailResponseSchema` (adds ticket summary, sender info)
- [x] 2.2 Export new schemas from `packages/api-types/src/index.ts`
- [x] 2.3 Run `npm run build:api-types` to confirm compilation succeeds

## 3. Backend: Transfer Domain Service

- [x] 3.1 Create `packages/backend/src/gifting/` module directory with `gifting.module.ts`
- [x] 3.2 Implement `InitiateTransferUseCase`: validate ticket eligibility (status=ISSUED, event >24h away, no existing PENDING transfer), generate UUID v4 token, store SHA-256 hash, set ticket status to `TRANSFER_PENDING`, create `TicketTransfer` record, enqueue `ticket_transfer.expire` delayed job
- [x] 3.3 Implement `AcceptTransferUseCase`: look up transfer by token hash, validate status=PENDING and not expired, find or create recipient user, atomically update `TicketTransfer.status=ACCEPTED` + `Ticket.userId=recipientId` + `Ticket.status=ISSUED` + `Ticket.transferredAt=now` in a Prisma transaction
- [x] 3.4 Implement `DeclineTransferUseCase`: look up transfer by token hash, validate status=PENDING, atomically set `TicketTransfer.status=DECLINED` + `Ticket.status=ISSUED`
- [x] 3.5 Implement `CancelTransferUseCase`: validate caller owns the ticket, validate transfer status=PENDING, atomically set `TicketTransfer.status=CANCELLED` + `Ticket.status=ISSUED`
- [x] 3.6 Implement `ListOutgoingTransfersUseCase`: query `TicketTransfer` by `senderId` with optional status filter, return paginated results with ticket summary
- [x] 3.7 Implement `ListIncomingTransfersUseCase`: query `TicketTransfer` by `recipientEmail` matching authenticated user's email with optional status filter

## 4. Backend: API Controller

- [x] 4.1 Create `GiftingController` in `apps/api/src/` with routes:
  - `POST /me/tickets/:id/transfer` → `InitiateTransferUseCase`
  - `DELETE /me/tickets/:id/transfer` → `CancelTransferUseCase`
  - `GET /me/transfers/outgoing` → `ListOutgoingTransfersUseCase`
  - `GET /me/transfers/incoming` → `ListIncomingTransfersUseCase`
- [x] 4.2 Create `PublicTransferController` with public routes:
  - `POST /transfers/:token/accept` → `AcceptTransferUseCase`
  - `POST /transfers/:token/decline` → `DeclineTransferUseCase`
  - `GET /transfers/:token` → fetch transfer detail for the landing page (no auth required)
- [x] 4.3 Apply `JwtAuthGuard` to all `/me/transfers` and `/me/tickets/:id/transfer` routes; leave `/transfers/:token/*` public
- [x] 4.4 Map domain error codes (`TICKET_NOT_GIFTABLE`, `TRANSFER_WINDOW_CLOSED`, `TRANSFER_ALREADY_PENDING`, `TRANSFER_NOT_PENDING`, `TRANSFER_EXPIRED`) to appropriate HTTP status codes via the existing domain error filter

## 5. Backend: Worker Jobs

- [x] 5.1 Create `ticket_transfer.expire` BullMQ job processor in `apps/worker/src/`: on execution, find transfer by ID, skip if status ≠ `PENDING` (idempotent), atomically set `TicketTransfer.status=EXPIRED` + `Ticket.status=ISSUED`
- [x] 5.2 Create `ticket_transfer.sweep` recurring BullMQ job (hourly): query all `PENDING` transfers where `expiresAt < now`, expire each one using the same atomic logic
- [x] 5.3 Register both jobs in the worker module and verify they appear in BullMQ queue list on startup

## 6. Email Notifications

- [ ] 6.1 Create email template `gift-invitation` (to recipient): includes sender name, concert name, ticket type, accept/decline links with embedded token, 48-hour expiry notice
- [ ] 6.2 Create email template `gift-accepted` (to sender): includes recipient name, concert name, confirmation message
- [ ] 6.3 Create email template `gift-declined` (to sender): includes recipient name, concert name, reassurance that ticket has been returned
- [ ] 6.4 Wire notification sends: call gift-invitation from `InitiateTransferUseCase`; call gift-accepted/gift-declined from `AcceptTransferUseCase`/`DeclineTransferUseCase`
- [ ] 6.5 Verify emails render correctly in Maildev (`http://localhost:1080`) using a manual test

## 7. In-App Notifications

- [ ] 7.1 Add notification creation to `AcceptTransferUseCase`: create a notification for the sender with message "[Recipient name] accepted your gift ticket for [Concert name]"
- [ ] 7.2 Add notification creation to `DeclineTransferUseCase`: create a notification for the sender with message "[Recipient name] declined your gift ticket for [Concert name]"

## 8. Frontend: Gift Initiation Flow

- [ ] 8.1 Update `TicketDetailResponseSchema` in `api-types` to include `isGiftable: boolean` field (computed by API based on status + event date)
- [ ] 8.2 Add "Gift this ticket" button to the ticket detail page, rendered only when `isGiftable === true`
- [ ] 8.3 Implement gift initiation modal component: recipient email input with validation, ticket summary display, 48h notice, confirm/cancel actions
- [ ] 8.4 Wire modal to `POST /me/tickets/:id/transfer`; handle success (close modal, refetch ticket), handle errors (`TICKET_NOT_GIFTABLE`, `TRANSFER_WINDOW_CLOSED`, `TRANSFER_ALREADY_PENDING`) with user-friendly messages

## 9. Frontend: TRANSFER_PENDING Ticket State

- [ ] 9.1 Add `TRANSFER_PENDING` to the ticket status badge mapping in the ticket wallet: amber badge with text "Đang tặng"
- [ ] 9.2 Update ticket detail page to display transfer details (recipient email, expiry time) and hide QR code when status is `TRANSFER_PENDING`
- [ ] 9.3 Add "Cancel Transfer" button to ticket detail page for `TRANSFER_PENDING` tickets; wire to `DELETE /me/tickets/:id/transfer` with confirmation dialog

## 10. Frontend: Gift Landing Page

- [ ] 10.1 Create public route `/transfers/:token` in the web app
- [ ] 10.2 Implement landing page: fetch transfer detail from `GET /transfers/:token`, display sender name, concert name, ticket type, and Accept/Decline actions
- [ ] 10.3 Handle expired token state: display "This gift link has expired" message
- [ ] 10.4 Handle already-resolved token states (`ACCEPTED`, `DECLINED`, `CANCELLED`): display appropriate informative message
- [ ] 10.5 On acceptance success: show confirmation and link to `/account/tickets`; if user is new (stub account created), prompt account setup flow
- [ ] 10.6 On decline success: show confirmation message

## 11. Backend API Smoke Tests (curl)

Run after sections 3–7 are complete and `npm run dev:api` is running. Use a seed user JWT from `npm run db:seed`.

- [x] 11.1 Smoke test — initiate transfer (happy path):
- [x] 11.2 Smoke test — initiate transfer on non-ISSUED ticket (expect 409 TICKET_NOT_GIFTABLE):
- [x] 11.3 Smoke test — initiate duplicate transfer on same ticket (expect 409 TRANSFER_ALREADY_PENDING):
- [x] 11.4 Smoke test — get transfer detail by token (public, no auth):
- [x] 11.5 Smoke test — accept transfer:
- [x] 11.6 Smoke test — decline transfer (initiate a fresh transfer first):
- [x] 11.7 Smoke test — cancel transfer (sender cancels):
- [x] 11.8 Smoke test — list outgoing transfers:
- [x] 11.9 Smoke test — accept an expired token (expect 410 TRANSFER_EXPIRED):

## 12. Frontend UI Tests (Chrome DevTools MCP)

Run after sections 8–10 are complete and both `npm run dev:api` and the web app dev server are running. Use the DevTools MCP to drive the browser directly.

- [ ] 12.1 Navigate to `/account/tickets`, pick an `ISSUED` ticket detail page — verify "Gift this ticket" button is visible and a `CHECKED_IN` or `LISTED_FOR_RESALE` ticket does NOT show it
- [ ] 12.2 Click "Gift this ticket" — verify the gift modal opens with an email input field, ticket summary, and 48h notice text
- [ ] 12.3 Submit the modal with a malformed email (e.g., `notanemail`) — verify inline validation error appears and no API call is made (check Network panel)
- [ ] 12.4 Submit the modal with a valid email — verify the API call `POST /me/tickets/:id/transfer` returns 201 in the Network panel, modal closes, and the ticket card updates to show the amber "Đang tặng" badge
- [ ] 12.5 On the ticket detail page in `TRANSFER_PENDING` state — verify: QR code is hidden/dimmed, recipient email and expiry time are displayed, "Cancel Transfer" button is present, "Gift this ticket" button is absent
- [ ] 12.6 Click "Cancel Transfer" — verify confirmation dialog appears; confirm it — verify API call `DELETE /me/tickets/:id/transfer` returns 200 in the Network panel and the ticket detail page reverts to `ISSUED` state with the green "Hợp lệ" badge and "Gift this ticket" button reappears
- [ ] 12.7 Navigate to `/transfers/<PLAINTEXT_TOKEN>` — verify landing page shows sender name, concert name, ticket type, and both "Accept Gift" and "Decline" buttons
- [ ] 12.8 Click "Accept Gift" on the landing page — verify `POST /transfers/:token/accept` returns 200 in the Network panel, confirmation message is shown, and the "View in wallet" link navigates to `/account/tickets`
- [ ] 12.9 Navigate back to `/transfers/<SAME_TOKEN>` after acceptance — verify the page shows an "already resolved" informative message (not an error crash)
- [ ] 12.10 Open a new gift token URL for a declined scenario — click "Decline" — verify `POST /transfers/:token/decline` returns 200, decline confirmation message is shown; navigate to `/account/tickets` as sender to confirm ticket status is back to `ISSUED`
- [ ] 12.11 Open `/transfers/<EXPIRED_TOKEN>` — verify the page displays "This gift link has expired" message with no Accept/Decline actions
- [ ] 12.12 On the `/account/tickets` list page — verify a `TRANSFER_PENDING` ticket shows the amber "Đang tặng" badge in the list (not the green "Hợp lệ" badge)

## 13. Unit Tests & Final Verification

- [ ] 13.1 Write unit tests for `InitiateTransferUseCase`, `AcceptTransferUseCase`, `DeclineTransferUseCase`, `CancelTransferUseCase` covering happy path and all error conditions
- [ ] 13.2 Write unit tests for `ticket_transfer.expire` job processor (idempotency, status transition)
- [ ] 13.3 Run `npm test` and confirm all tests pass
- [ ] 13.4 Run `npm run lint` and `npm run format:check` with no violations
