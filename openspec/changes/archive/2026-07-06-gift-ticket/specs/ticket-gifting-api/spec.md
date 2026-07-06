## ADDED Requirements

### Requirement: Sender can initiate a ticket gift transfer

The system SHALL allow an authenticated user who owns an `ISSUED` ticket to initiate a gift transfer by providing a recipient email address. The system SHALL create a `TicketTransfer` record with status `PENDING`, set the ticket status to `TRANSFER_PENDING`, generate a secure opaque transfer token (UUID v4, stored as SHA-256 hash), and enqueue a `ticket_transfer.expire` delayed job for 48 hours. A gift invitation email SHALL be sent to the recipient. The system SHALL reject initiation if the ticket status is not `ISSUED`, if the concert event starts within 24 hours, or if a `PENDING` transfer already exists for that ticket.

#### Scenario: Sender initiates a gift transfer to a valid email

- **WHEN** an authenticated user sends `POST /me/tickets/:id/transfer` with `{ "recipientEmail": "friend@example.com" }`
- **THEN** the system creates a `TicketTransfer` record with status `PENDING` and `expiresAt` = now + 48h, sets `Ticket.status` to `TRANSFER_PENDING`, enqueues the expiry job, sends a gift invitation email to `friend@example.com`, and responds `201` with the transfer summary including `transferId`, `recipientEmail`, `expiresAt`, and `status: "PENDING"`

#### Scenario: Sender attempts to gift a non-ISSUED ticket

- **WHEN** an authenticated user sends `POST /me/tickets/:id/transfer` and the ticket status is not `ISSUED` (e.g., `CHECKED_IN`, `LISTED_FOR_RESALE`, `TRANSFER_PENDING`)
- **THEN** the system responds `409 Conflict` with error code `TICKET_NOT_GIFTABLE`

#### Scenario: Sender attempts to gift a ticket for an event within 24 hours

- **WHEN** an authenticated user sends `POST /me/tickets/:id/transfer` and the concert `eventDate` is less than 24 hours from now
- **THEN** the system responds `409 Conflict` with error code `TRANSFER_WINDOW_CLOSED`

#### Scenario: Sender attempts to gift a ticket that already has a pending transfer

- **WHEN** an authenticated user sends `POST /me/tickets/:id/transfer` and a `TicketTransfer` with status `PENDING` already exists for that ticket
- **THEN** the system responds `409 Conflict` with error code `TRANSFER_ALREADY_PENDING`

#### Scenario: Sender attempts to gift a ticket they do not own

- **WHEN** an authenticated user sends `POST /me/tickets/:id/transfer` for a ticket whose `userId` does not match the requester
- **THEN** the system responds `403 Forbidden`

### Requirement: Recipient can accept a gift transfer

The system SHALL allow a recipient to accept a pending gift transfer via a secure token link. On acceptance, the system SHALL atomically: update `TicketTransfer.status` to `ACCEPTED`, reassign `Ticket.userId` to the recipient's user ID (creating a stub account if the email has no existing user), set `Ticket.status` to `ISSUED`, set `Ticket.transferredAt` to now, and invalidate the token. The system SHALL send an acceptance notification email to the original sender.

#### Scenario: Recipient accepts a valid transfer token

- **WHEN** a user (authenticated or new) sends `POST /transfers/:token/accept`
- **THEN** the system validates the token hash, atomically reassigns ticket ownership to the recipient, sets transfer status to `ACCEPTED`, sets ticket status to `ISSUED`, and responds `200` with the updated ticket summary

#### Scenario: Recipient accepts with a new email (no existing account)

- **WHEN** `POST /transfers/:token/accept` is called and the recipient email has no existing user account
- **THEN** the system creates a stub user account for that email, reassigns ticket ownership to the new account, and returns `200` with the ticket summary

#### Scenario: Recipient attempts to accept an expired token

- **WHEN** `POST /transfers/:token/accept` is called after the transfer `expiresAt` has passed (or status is `EXPIRED`)
- **THEN** the system responds `410 Gone` with error code `TRANSFER_EXPIRED`

#### Scenario: Recipient attempts to accept an already-used token

- **WHEN** `POST /transfers/:token/accept` is called for a transfer with status `ACCEPTED`, `DECLINED`, or `CANCELLED`
- **THEN** the system responds `409 Conflict` with error code `TRANSFER_NOT_PENDING`

#### Scenario: Token does not exist

- **WHEN** `POST /transfers/:token/accept` is called with an unknown token
- **THEN** the system responds `404 Not Found`

### Requirement: Recipient can decline a gift transfer

The system SHALL allow a recipient to decline a pending gift transfer via the transfer token. On decline, the system SHALL set `TicketTransfer.status` to `DECLINED`, revert `Ticket.status` to `ISSUED`, and send a decline notification email to the original sender. The token SHALL be invalidated.

#### Scenario: Recipient declines a valid transfer token

- **WHEN** a user sends `POST /transfers/:token/decline`
- **THEN** the system sets transfer status to `DECLINED`, reverts the ticket status to `ISSUED`, invalidates the token, sends a decline email to the sender, and responds `200` with `{ "status": "DECLINED" }`

#### Scenario: Recipient attempts to decline an already-resolved transfer

- **WHEN** `POST /transfers/:token/decline` is called for a transfer that is not `PENDING`
- **THEN** the system responds `409 Conflict` with error code `TRANSFER_NOT_PENDING`

### Requirement: Sender can cancel a pending transfer

The system SHALL allow the original sender to cancel a pending gift transfer at any time before it is accepted or declined. On cancellation, the system SHALL set `TicketTransfer.status` to `CANCELLED`, revert `Ticket.status` to `ISSUED`, and cancel the pending BullMQ expiry job if possible.

#### Scenario: Sender cancels a pending transfer

- **WHEN** an authenticated user sends `DELETE /me/tickets/:id/transfer` and a `PENDING` transfer exists for that ticket owned by them
- **THEN** the system sets transfer status to `CANCELLED`, reverts ticket status to `ISSUED`, and responds `200` with `{ "status": "CANCELLED" }`

#### Scenario: Sender attempts to cancel a non-pending transfer

- **WHEN** an authenticated user sends `DELETE /me/tickets/:id/transfer` but the transfer is already `ACCEPTED`, `DECLINED`, or `EXPIRED`
- **THEN** the system responds `409 Conflict` with error code `TRANSFER_NOT_PENDING`

#### Scenario: Sender attempts to cancel a transfer for a ticket they do not own

- **WHEN** an authenticated user sends `DELETE /me/tickets/:id/transfer` for a ticket they do not own
- **THEN** the system responds `403 Forbidden`

### Requirement: System automatically expires pending transfers after 48 hours

The system SHALL expire any `TicketTransfer` record whose `expiresAt` has passed and whose status is still `PENDING`. On expiry, the system SHALL set `TicketTransfer.status` to `EXPIRED` and revert `Ticket.status` to `ISSUED`. This SHALL be enforced by both a BullMQ delayed job (`ticket_transfer.expire`) enqueued at creation and an hourly sweep job (`ticket_transfer.sweep`) as a safety net.

#### Scenario: Delayed expiry job fires after 48 hours

- **WHEN** the `ticket_transfer.expire` job runs for a transfer that is still `PENDING`
- **THEN** the system sets transfer status to `EXPIRED` and reverts ticket status to `ISSUED`

#### Scenario: Sweep job recovers missed expirations

- **WHEN** the `ticket_transfer.sweep` job runs and finds `PENDING` transfers with `expiresAt` in the past
- **THEN** the system sets each such transfer to `EXPIRED` and reverts the corresponding ticket status to `ISSUED`

#### Scenario: Expiry job fires on an already-resolved transfer

- **WHEN** the `ticket_transfer.expire` job runs for a transfer with status `ACCEPTED`, `DECLINED`, or `CANCELLED`
- **THEN** the system takes no action (idempotent no-op)

### Requirement: Sender can view their outgoing pending transfers

The system SHALL provide an endpoint for the authenticated user to list all their outgoing `PENDING` gift transfers, including the associated ticket summary and recipient email.

#### Scenario: Sender lists pending outgoing transfers

- **WHEN** an authenticated user sends `GET /me/transfers/outgoing?status=PENDING`
- **THEN** the system returns a paginated list of pending outgoing `TicketTransfer` records with ticket summary, `recipientEmail`, `expiresAt`, and `transferId`

#### Scenario: Sender has no pending outgoing transfers

- **WHEN** an authenticated user sends `GET /me/transfers/outgoing?status=PENDING` and no pending transfers exist
- **THEN** the system returns an empty array with `200 OK`

### Requirement: Recipient can view their incoming pending transfers

The system SHALL provide an endpoint for the authenticated user to list all incoming `PENDING` gift transfers addressed to their email, including the ticket summary and sender identity.

#### Scenario: Recipient lists pending incoming transfers

- **WHEN** an authenticated user sends `GET /me/transfers/incoming?status=PENDING`
- **THEN** the system returns a paginated list of pending incoming `TicketTransfer` records with ticket summary, sender display name, `expiresAt`, and the accept/decline token embedded in the response URL

#### Scenario: Recipient has no pending incoming transfers

- **WHEN** an authenticated user sends `GET /me/transfers/incoming?status=PENDING` and no pending transfers exist
- **THEN** the system returns an empty array with `200 OK`
