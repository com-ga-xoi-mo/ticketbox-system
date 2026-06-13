## ADDED Requirements

### Requirement: Inventory reservation
The system SHALL reserve ticket inventory atomically before payment initiation so that sold plus reserved quantity never exceeds total quantity.

#### Scenario: Last tickets are reserved once
- **WHEN** multiple users concurrently request the final available tickets for the same ticket type
- **THEN** the system SHALL accept only requests that fit within remaining inventory and reject the rest before payment

#### Scenario: Expired reservation releases inventory
- **WHEN** a pending order reaches its reservation expiration time without successful payment
- **THEN** the system SHALL expire the order and release the reserved inventory

### Requirement: Per-user ticket limit
The system SHALL enforce the configured maximum tickets per user per ticket type across paid orders and active reservations.

#### Scenario: User reaches SVIP limit
- **WHEN** a user who already has 2 paid SVIP tickets requests 1 more SVIP ticket for a ticket type with max 2 per user
- **THEN** the system SHALL reject the checkout request before payment

#### Scenario: Concurrent user requests cannot bypass limit
- **WHEN** the same user sends concurrent checkout requests for the same limited ticket type
- **THEN** the system SHALL accept only the quantity that keeps the user within the configured limit

### Requirement: Order lifecycle
The system SHALL track order states from creation through payment, fulfillment, expiration, failure, or cancellation.

#### Scenario: Paid order issues tickets
- **WHEN** payment for a pending order is confirmed successfully
- **THEN** the system SHALL mark the order as paid and issue QR e-tickets exactly once

#### Scenario: Failed payment does not issue tickets
- **WHEN** payment for an order fails
- **THEN** the system SHALL not issue tickets and SHALL release or schedule release of the reservation

### Requirement: QR e-ticket
The system SHALL generate QR e-tickets for paid orders using unguessable tokens stored as hashes.

#### Scenario: Customer opens paid ticket
- **WHEN** a customer opens a ticket from their paid order
- **THEN** the system SHALL display the ticket details and QR code for gate check-in

#### Scenario: User cannot view another user's ticket
- **WHEN** a user requests a ticket owned by another user
- **THEN** the system SHALL reject the request

