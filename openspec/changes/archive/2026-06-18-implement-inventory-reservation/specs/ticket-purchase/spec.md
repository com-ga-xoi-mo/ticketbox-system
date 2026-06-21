## MODIFIED Requirements

### Requirement: Inventory reservation
The system SHALL reserve ticket inventory atomically before payment initiation so that sold plus reserved quantity never exceeds total quantity. Reservation SHALL run inside a PostgreSQL transaction that locks the requested `ticket_types` rows, validates sale windows and availability, creates the pending order and order items, increments `reserved_quantity`, and commits all changes together.

#### Scenario: Last tickets are reserved once
- **WHEN** multiple users concurrently request the final available tickets for the same ticket type
- **THEN** the system SHALL accept only requests that fit within remaining inventory and reject the rest before payment

#### Scenario: Successful checkout reserves inventory atomically
- **WHEN** an authenticated AUDIENCE user submits a valid checkout request for an active ticket type within its sale window
- **THEN** the system SHALL create a `PENDING_PAYMENT` order and increment `reserved_quantity` for each requested ticket type in the same database transaction

#### Scenario: Checkout rejects unavailable quantity
- **WHEN** a checkout request would make `sold_quantity + reserved_quantity + requested_quantity` exceed `total_quantity`
- **THEN** the system SHALL reject the request before creating an order or order items

#### Scenario: Checkout rejects ticket type outside sale window
- **WHEN** a checkout request includes a ticket type whose sale has not started or has already ended
- **THEN** the system SHALL reject the request before reserving inventory

#### Scenario: Expired reservation releases inventory
- **WHEN** a pending order reaches its reservation expiration time without successful payment
- **THEN** the system SHALL expire the order and release the reserved inventory

#### Scenario: Worker releases expired reservations
- **WHEN** the background worker scans pending orders whose `reservationExpiresAt` is in the past
- **THEN** it SHALL transition each order to `EXPIRED` and decrement `reserved_quantity` by the order item quantities exactly once

#### Scenario: Failed or cancelled order releases inventory
- **WHEN** a pending order transitions to `FAILED` or `CANCELLED`
- **THEN** the system SHALL decrement `reserved_quantity` by the order item quantities exactly once

#### Scenario: Paid order confirms reserved inventory
- **WHEN** a pending order transitions to `PAID`
- **THEN** the system SHALL decrement `reserved_quantity` and increment `sold_quantity` by the order item quantities exactly once
