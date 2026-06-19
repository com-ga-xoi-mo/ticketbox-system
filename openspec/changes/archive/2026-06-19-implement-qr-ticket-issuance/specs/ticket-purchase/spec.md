## MODIFIED Requirements

### Requirement: QR e-ticket
The system SHALL generate QR e-tickets for paid orders using unguessable tokens stored only as hashes. Ticket issuance SHALL create one issued ticket per purchased ticket unit, SHALL be idempotent for repeated paid-order processing, and SHALL expose QR ticket details only to the owning user.

#### Scenario: Paid order issues QR tickets exactly once
- **WHEN** an order transitions to `PAID`
- **THEN** the system SHALL create exactly one issued ticket per purchased order item quantity and SHALL NOT create duplicate tickets if the same paid order is processed again

#### Scenario: QR token is stored as hash only
- **WHEN** the system issues a QR e-ticket
- **THEN** the system SHALL store a hash of the QR token and SHALL NOT persist the raw QR token as plaintext

#### Scenario: Customer lists owned tickets
- **WHEN** an authenticated AUDIENCE user requests their tickets
- **THEN** the system SHALL return only tickets owned by that user

#### Scenario: Customer opens paid ticket
- **WHEN** a customer opens a ticket from their paid order
- **THEN** the system SHALL display the ticket details and QR code for gate check-in

#### Scenario: User cannot view another user's ticket
- **WHEN** a user requests a ticket owned by another user
- **THEN** the system SHALL reject the request
