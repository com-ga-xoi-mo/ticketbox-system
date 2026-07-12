# ticket-gifting-ui

## Purpose
TBD: User interfaces for initiating, managing, and accepting ticket gift transfers.

## Requirements

### Requirement: Ticket wallet displays a "Gift this ticket" action for eligible tickets
The system SHALL display a "Gift this ticket" button on the ticket detail page for any ticket with status `ISSUED` whose concert event is more than 24 hours away. The button SHALL be absent for tickets with any other status or for events within the 24-hour window.

#### Scenario: Eligible ticket shows gift action
- **WHEN** an authenticated user views the ticket detail page for an `ISSUED` ticket with event date more than 24 hours away
- **THEN** the page displays a "Gift this ticket" button below the QR code section

#### Scenario: Non-ISSUED ticket does not show gift action
- **WHEN** an authenticated user views the ticket detail page for a ticket with status `CHECKED_IN`, `VOIDED`, `LISTED_FOR_RESALE`, `TRANSFERRED`, or `TRANSFER_PENDING`
- **THEN** the page does NOT display the "Gift this ticket" button

#### Scenario: Ticket within 24 hours of event does not show gift action
- **WHEN** an authenticated user views the ticket detail page for an `ISSUED` ticket whose event starts within 24 hours
- **THEN** the page does NOT display the "Gift this ticket" button

### Requirement: Gift initiation modal collects recipient email and confirms intent
The system SHALL present a modal dialog when the user clicks "Gift this ticket". The modal SHALL include: a recipient email input field, a summary of the ticket being gifted (concert name, ticket type), a 48-hour acceptance window notice, and confirm/cancel actions. The system SHALL validate the email format before allowing submission. On successful API response, the modal SHALL close and the ticket card SHALL update to reflect `TRANSFER_PENDING` state.

#### Scenario: User opens gift modal and submits valid email
- **WHEN** a user clicks "Gift this ticket" and enters a valid email, then clicks "Confirm Gift"
- **THEN** the system calls `POST /me/tickets/:id/transfer`, closes the modal on success, and the ticket detail page updates to show the `TRANSFER_PENDING` status badge and cancel transfer option

#### Scenario: User submits an invalid email format
- **WHEN** a user clicks "Confirm Gift" in the gift modal with a malformed email address
- **THEN** the system displays an inline validation error and does NOT submit the request

#### Scenario: API returns error during gift initiation
- **WHEN** the `POST /me/tickets/:id/transfer` call fails (e.g., `TICKET_NOT_GIFTABLE`, network error)
- **THEN** the modal remains open and displays a user-friendly error message corresponding to the error code

#### Scenario: User cancels the gift modal
- **WHEN** a user clicks "Cancel" or closes the modal without confirming
- **THEN** no API call is made and the ticket detail page remains unchanged

### Requirement: TRANSFER_PENDING ticket state is displayed with cancel action
The system SHALL display tickets in `TRANSFER_PENDING` status with a distinct visual badge ("Pending Gift") and SHALL show the recipient email and expiry time. A "Cancel Transfer" button SHALL be visible to the sender, allowing them to revoke the gift before acceptance.

#### Scenario: Sender views a ticket in TRANSFER_PENDING state
- **WHEN** an authenticated user views the ticket detail page for a ticket with status `TRANSFER_PENDING`
- **THEN** the page displays a "Pending Gift" badge, shows the recipient email and transfer expiry time, hides the QR code (or dims it), and shows a "Cancel Transfer" button

#### Scenario: Sender cancels a pending transfer from the ticket detail page
- **WHEN** a user clicks "Cancel Transfer" and confirms the cancellation dialog
- **THEN** the system calls `DELETE /me/tickets/:id/transfer`, and on success the ticket detail page updates to show the `ISSUED` status and the "Gift this ticket" button reappears

#### Scenario: Cancel transfer action fails
- **WHEN** the `DELETE /me/tickets/:id/transfer` call fails
- **THEN** the system displays an error toast message and the transfer remains in `PENDING` state

### Requirement: Recipient can accept or decline a gift via a web landing page
The system SHALL provide a public web page at `/transfers/:token` that displays the gift details (concert name, ticket type, sender name) and presents "Accept Gift" and "Decline" actions. The page SHALL be accessible without authentication for new users, prompting account creation if needed after acceptance. The page SHALL handle expired and already-resolved tokens gracefully.

#### Scenario: Recipient visits a valid gift link and accepts
- **WHEN** a recipient opens the gift link `/transfers/:token` for a valid pending transfer and clicks "Accept Gift"
- **THEN** the system calls `POST /transfers/:token/accept`, and on success displays a confirmation message with a link to view the ticket in the wallet

#### Scenario: Recipient visits a valid gift link and declines
- **WHEN** a recipient opens the gift link `/transfers/:token` for a valid pending transfer and clicks "Decline"
- **THEN** the system calls `POST /transfers/:token/decline`, and on success displays a confirmation that the gift was declined

#### Scenario: Recipient visits an expired gift link
- **WHEN** a recipient opens `/transfers/:token` and the transfer has expired
- **THEN** the page displays an informative message: "This gift link has expired. The ticket has been returned to the sender."

#### Scenario: Recipient visits an already-accepted or declined gift link
- **WHEN** a recipient opens `/transfers/:token` and the transfer status is `ACCEPTED`, `DECLINED`, or `CANCELLED`
- **THEN** the page displays an informative message indicating the transfer is no longer available

#### Scenario: New user accepts a gift (no existing account)
- **WHEN** a recipient with no existing account clicks "Accept Gift"
- **THEN** the system creates a stub account for the recipient's email, accepts the transfer, and prompts the new user to complete their account setup (set password or link Google account) before redirecting to the ticket wallet

### Requirement: Ticket wallet My Tickets list shows TRANSFER_PENDING status badge
The system SHALL display tickets with status `TRANSFER_PENDING` in the My Tickets list with a distinct "Pending Gift" badge (e.g., amber/yellow color) to differentiate them from active `ISSUED` tickets.

#### Scenario: My Tickets list shows pending gift badge
- **WHEN** an authenticated user has a ticket with status `TRANSFER_PENDING` and views the `/account/tickets` page
- **THEN** the ticket card displays an amber "Pending Gift" badge instead of the green "Valid" badge

### Requirement: Sender receives in-app notification on transfer outcome
The system SHALL display a notification in the audience notification center when a gift transfer is accepted or declined by the recipient, in addition to the email notification.

#### Scenario: Sender receives notification on acceptance
- **WHEN** a recipient accepts a gift transfer
- **THEN** a notification is created in the sender's notification center with message "[Recipient name] accepted your gift ticket for [Concert name]"

#### Scenario: Sender receives notification on decline
- **WHEN** a recipient declines a gift transfer
- **THEN** a notification is created in the sender's notification center with message "[Recipient name] declined your gift ticket for [Concert name]"