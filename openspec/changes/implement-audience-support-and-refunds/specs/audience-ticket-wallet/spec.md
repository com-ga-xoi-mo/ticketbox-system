## ADDED Requirements

### Requirement: Ticket detail exposes post-purchase support actions
The system SHALL display support, refund, resend, and download actions on ticket detail pages when the authenticated audience user owns the ticket.

#### Scenario: Issued ticket shows support actions
- **WHEN** the user views an owned `ISSUED` ticket
- **THEN** the ticket detail page shows actions to contact support, request refund when eligible, resend ticket email, and download or print the ticket

#### Scenario: Checked-in ticket limits refund action
- **WHEN** the user views an owned `CHECKED_IN` ticket
- **THEN** the ticket detail page keeps support and download actions available but disables refund request unless eligibility rules allow it

#### Scenario: Refunded ticket shows refund state
- **WHEN** the user views an owned `REFUNDED` ticket
- **THEN** the ticket detail page displays refunded status and links to related refund request history when available

### Requirement: Ticket resend and download preserve QR security
The system SHALL use backend-owned QR generation for ticket resend and downloadable ticket views.

#### Scenario: User resends ticket from wallet
- **WHEN** the user requests resend from an owned ticket detail page
- **THEN** the backend verifies ownership and uses notification delivery to send the ticket without returning email-only delivery internals to the client

#### Scenario: User downloads ticket from wallet
- **WHEN** the user requests ticket download for an owned issued ticket
- **THEN** the downloadable view contains a QR payload generated for that response and does not require the frontend to create or sign QR tokens

#### Scenario: Ticket QR unavailable
- **WHEN** the backend cannot generate a QR payload for the ticket
- **THEN** the ticket page displays a controlled unavailable state and offers support contact
