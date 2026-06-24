# ticket-purchase Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
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

### Requirement: Per-user ticket limit
The system SHALL enforce the configured maximum tickets per user per ticket type across paid orders and active, unexpired reservations. The limit check SHALL run during checkout before payment and SHALL reject a request when the user's existing paid quantity plus active reserved quantity plus requested quantity would exceed `ticket_types.max_per_user`.

#### Scenario: User reaches SVIP limit
- **WHEN** a user who already has 2 paid SVIP tickets requests 1 more SVIP ticket for a ticket type with max 2 per user
- **THEN** the system SHALL reject the checkout request before payment

#### Scenario: Active reservation counts toward user limit
- **WHEN** a user has 1 paid ticket and 1 active `PENDING_PAYMENT` reservation for a ticket type with max 2 per user
- **THEN** the system SHALL reject a checkout request for 1 additional ticket of that ticket type before creating a new order

#### Scenario: Expired reservation does not count toward user limit
- **WHEN** a user has a `PENDING_PAYMENT` reservation whose `reservationExpiresAt` is in the past for a ticket type with max 2 per user
- **THEN** the system SHALL not count that expired reservation against a new checkout request for that ticket type

#### Scenario: Duplicate checkout does not consume the limit twice
- **WHEN** a user resubmits the same checkout request with the same idempotency key
- **THEN** the system SHALL return the existing order and SHALL NOT count the same order items as a second requested purchase

#### Scenario: Concurrent user requests cannot bypass limit
- **WHEN** the same user sends concurrent checkout requests for the same limited ticket type
- **THEN** the system SHALL accept only the quantity that keeps the user within the configured limit

### Requirement: Ticket purchase concurrency hardening evidence
The system SHALL provide automated hardening tests or scripts proving that checkout concurrency preserves inventory correctness and per-user ticket limits.

#### Scenario: Last tickets cannot be oversold under concurrent checkout
- **WHEN** multiple authenticated audience checkout attempts concurrently reserve the last available tickets for the same ticket type
- **THEN** only requests within the remaining available inventory SHALL create `PENDING_PAYMENT` orders
- **AND** `sold_quantity + reserved_quantity` SHALL NOT exceed `total_quantity`
- **AND** rejected requests SHALL report a controlled availability error

#### Scenario: Same user cannot bypass max per user under concurrent checkout
- **WHEN** the same authenticated audience user concurrently submits checkout requests whose combined quantity exceeds `max_per_user` for a ticket type
- **THEN** only requests within the allowed per-user quantity SHALL create active reservations or paid orders
- **AND** the user's paid plus active pending quantity for that ticket type SHALL NOT exceed `max_per_user`
- **AND** rejected requests SHALL report a controlled per-user limit error

#### Scenario: Checkout concurrency test uses the transactional reservation path
- **WHEN** the hardening test exercises checkout concurrency
- **THEN** it SHALL use the same inventory reservation transaction path as production checkout rather than a mocked counter-only shortcut

### Requirement: Order lifecycle
The system SHALL track order states from creation through payment, fulfillment, expiration, failure, or cancellation. The order state machine SHALL enforce the following valid transitions:

- `PENDING_PAYMENT` → `PAID` (payment confirmed)
- `PENDING_PAYMENT` → `EXPIRED` (reservation timeout)
- `PENDING_PAYMENT` → `FAILED` (payment failed)
- `PENDING_PAYMENT` → `CANCELLED` (user cancelled)
- `PAID` → `REFUNDED` (refund processed)

All other transitions SHALL be rejected. Each transition SHALL record a domain event for downstream side effects (ticket issuance, reservation release, notification enqueueing).

#### Scenario: Paid order issues tickets
- **WHEN** payment for a pending order is confirmed successfully
- **THEN** the system SHALL mark the order as paid, set the `paidAt` timestamp, and emit an `OrderPaid` domain event so that downstream handlers can issue QR e-tickets exactly once

#### Scenario: Failed payment does not issue tickets
- **WHEN** payment for an order fails
- **THEN** the system SHALL mark the order as failed and emit an `OrderFailed` domain event so that downstream handlers can release or schedule release of the reservation

#### Scenario: Create order with pending payment status and idempotency key
- **WHEN** an authenticated AUDIENCE user submits a checkout request via `POST /checkout/orders` with a valid concert ID, ticket type selections, quantities, and an idempotency key
- **THEN** the system SHALL create an order with status `PENDING_PAYMENT`, generate a unique order number, record order items with unit prices and totals, set `reservationExpiresAt` based on configured TTL, and store the idempotency key

#### Scenario: Duplicate checkout submission returns existing order
- **WHEN** a user submits a checkout request with an idempotency key that matches an existing order for the same user
- **THEN** the system SHALL return the existing order instead of creating a duplicate

#### Scenario: Invalid state transition is rejected
- **WHEN** a transition is attempted from `EXPIRED` to `PAID` (or any other invalid transition)
- **THEN** the system SHALL reject the request with an error indicating the transition is not allowed

#### Scenario: Order owner access only
- **WHEN** a user requests an order via `GET /me/orders/:id` that belongs to another user
- **THEN** the system SHALL reject the request as not found

#### Scenario: Cancelled order releases hold
- **WHEN** a user cancels a pending order before payment
- **THEN** the system SHALL mark the order as `CANCELLED`, set the `cancelledAt` timestamp, and emit an `OrderCancelled` domain event

#### Scenario: Concurrent status transition conflict
- **WHEN** two concurrent requests attempt to transition the same order from `PENDING_PAYMENT` to different statuses
- **THEN** the system SHALL accept only the first successful transition and reject the second with a conflict error

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

