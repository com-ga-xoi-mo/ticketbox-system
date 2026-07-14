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

The system SHALL distinguish between direct-purchase orders and resale-purchase orders via an `orderSourceType` field. Resale-purchase orders SHALL be created by the resale module (not via `POST /checkout/orders`) and SHALL reference the associated `ResaleTransaction`. Resale orders SHALL NOT have `reservationExpiresAt` (no reservation window), SHALL NOT reference promotions, and SHALL have `serviceFeeVnd` set to 0.

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

#### Scenario: Resale order has no reservation expiry
- **WHEN** a resale purchase creates an order
- **THEN** the order SHALL have `orderSourceType` set to `RESALE`, `reservationExpiresAt` SHALL be null, and `promotionId` SHALL be null

#### Scenario: Resale order excluded from reservation expiry scans
- **WHEN** the background worker scans for expired reservations
- **THEN** it SHALL skip orders with `orderSourceType` of `RESALE`

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

### Requirement: Paid order recovery protects inventory and fulfillment
The system SHALL serialize expiration and successful-payment finalization for the same order using PostgreSQL transaction controls. A persisted successful payment SHALL prevent reservation expiration, and recovery SHALL complete eligible paid-order inventory and ticket fulfillment idempotently without violating inventory constraints.

#### Scenario: Expiration skips an order with successful payment
- **WHEN** an expired-reservation scan finds a `PENDING_PAYMENT` order that has a linked `SUCCEEDED` payment
- **THEN** the system SHALL NOT transition the order to `EXPIRED`
- **AND** the system SHALL NOT decrement reserved inventory for that order
- **AND** the system SHALL report the inconsistent order for successful-payment recovery

#### Scenario: Payment success wins a concurrent expiration decision
- **WHEN** successful-payment finalization and reservation expiration concurrently process the same pending order after payment success is persisted
- **THEN** PostgreSQL serialization and mutation-time guards SHALL prevent the expiration path from releasing that order's inventory
- **AND** at most one paid inventory transition SHALL be applied

#### Scenario: Recovery completes a pending paid order
- **WHEN** a payment is `SUCCEEDED` and its linked order remains `PENDING_PAYMENT`
- **THEN** recovery SHALL transition the order to `PAID`
- **AND** reserved inventory SHALL be converted to sold inventory exactly once
- **AND** the system SHALL issue the expected tickets exactly once

#### Scenario: Recovery completes missing tickets for an already paid order
- **WHEN** an order is `PAID` but the number of issued tickets is lower than the quantity purchased
- **THEN** recovery SHALL issue only the missing tickets
- **AND** existing tickets and QR token hashes SHALL remain unchanged

#### Scenario: Repeated recovery is idempotent
- **WHEN** callback handling, a repair worker, or a future internal recovery command invokes successful-payment finalization repeatedly for the same fully fulfilled order
- **THEN** the system SHALL NOT adjust inventory again
- **AND** the system SHALL NOT issue duplicate tickets

#### Scenario: Unsafe inventory recovery is stopped
- **WHEN** persisted inventory data cannot be safely reconstructed or the paid order cannot be fulfilled without exceeding total inventory
- **THEN** the system SHALL stop automatic fulfillment with a controlled terminal inconsistency
- **AND** the system SHALL NOT create negative inventory, oversell tickets, or consume another active order's reservation

#### Scenario: Successful payment on a terminal order is not silently revived
- **WHEN** recovery finds a `SUCCEEDED` payment linked to an `EXPIRED`, `FAILED`, or `CANCELLED` order
- **THEN** the system SHALL report a terminal lifecycle inconsistency
- **AND** the system SHALL NOT automatically change the terminal order to `PAID`


### Requirement: Checkout rejects resale-ineligible promo codes
The system SHALL NOT allow promotional codes to be applied to orders with `orderSourceType` of `RESALE`. The standard checkout flow (`POST /checkout/orders`) SHALL continue to accept promo codes for direct purchases only.

#### Scenario: Promo code on direct purchase works normally
- **WHEN** a user applies a valid promo code during standard checkout
- **THEN** the system SHALL apply the discount as configured

#### Scenario: Promo code on resale purchase is rejected
- **WHEN** the resale purchase flow attempts to set a promo code on a resale order
- **THEN** the system SHALL reject or ignore the promo code

### Requirement: Checkout requires waitlist entitlement for gated ticket types
The system SHALL require a valid purchase entitlement before creating a direct-purchase order for any gated ticket type. A ticket type is gated when it has active official waitlist demand OR when the current time is inside its presale gate window recorded on the ticket type (`presaleGateOpensAt <= now < presaleGateClosesAt`). A valid entitlement is an active, unexpired entitlement owned by the requesting user for the gated ticket type whose `source` is `WAITLIST` or `LOTTERY`. The entitlement check SHALL run before inventory mutation and SHALL preserve the existing inventory reservation transaction as the only mechanism that changes `reserved_quantity` and `sold_quantity`. Entitlement consumption SHALL be atomic with direct-purchase order creation and inventory reservation.

#### Scenario: Entitled user creates checkout order
- **WHEN** an authenticated AUDIENCE user submits `POST /checkout/orders` for a gated ticket type with a valid active entitlement owned by that user
- **THEN** the system SHALL allow the existing checkout reservation transaction to run
- **AND** the system SHALL consume the entitlement in the same transaction that creates the pending direct-purchase order

#### Scenario: Lottery winner creates checkout order during presale
- **WHEN** an authenticated AUDIENCE user submits checkout for a ticket type inside its open presale lottery window with a valid active `LOTTERY` entitlement owned by that user
- **THEN** the system SHALL allow the reservation transaction to run and SHALL consume the `LOTTERY` entitlement in the same transaction

#### Scenario: Reservation failure does not consume entitlement
- **WHEN** an authenticated AUDIENCE user submits checkout with a valid active entitlement but the inventory reservation transaction fails before creating the pending order
- **THEN** the system SHALL NOT mark the entitlement consumed
- **AND** the system SHALL NOT create an order or mutate inventory for that failed checkout

#### Scenario: Missing entitlement is rejected
- **WHEN** an authenticated AUDIENCE user submits checkout for a gated ticket type without an entitlement
- **THEN** the system SHALL reject the request before creating an order, order items, or inventory reservation

#### Scenario: Non-winner rejected during presale lottery window
- **WHEN** an authenticated AUDIENCE user submits checkout for a ticket type inside its open presale lottery window without a valid `LOTTERY` entitlement
- **THEN** the system SHALL reject the request before creating an order or mutating inventory

#### Scenario: Entitlement for another user is rejected
- **WHEN** a checkout request references an entitlement owned by another user
- **THEN** the system SHALL reject the request before creating an order or mutating inventory

#### Scenario: Requested quantity exceeds entitlement
- **WHEN** a checkout request uses an entitlement but requests more tickets than the entitlement permits
- **THEN** the system SHALL reject the request before creating an order or mutating inventory

#### Scenario: Direct checkout remains available when not gated
- **WHEN** a ticket type has no active waitlist entries, no active waitlist or lottery entitlements, and is not inside an open presale lottery window
- **THEN** direct checkout SHALL continue to behave according to the existing inventory reservation and per-user limit requirements

#### Scenario: Direct checkout resumes after the presale window ends
- **WHEN** the presale lottery window for a ticket type has ended and public sale has started
- **THEN** the ticket type SHALL NOT be lottery-gated and direct checkout SHALL behave according to the existing inventory reservation and per-user limit requirements

#### Scenario: Leftover lottery entitlement does not keep the type gated after the window
- **WHEN** the presale gate window has closed but one or more `LOTTERY` entitlements are still active
- **THEN** the ticket type SHALL NOT be lottery-gated on account of those leftover entitlements
- **AND** a remaining `LOTTERY` entitlement holder MAY still consume it via checkout while it is active

#### Scenario: Resale order remains excluded
- **WHEN** a resale purchase creates an order with `orderSourceType` of `RESALE`
- **THEN** the purchase entitlement guard SHALL NOT apply to that resale order

### Requirement: Checkout requires an admission token when the waiting room is active
The system SHALL require a valid admission token, bound to the requesting user and the concert, before creating a direct-purchase order when that concert's virtual waiting room is active. The client SHALL pass the token in the create-order request body as `waitingRoomAdmissionToken`. The admission check SHALL run before the inventory reservation transaction and SHALL NOT change the reservation transaction itself. When the concert's waiting room is inactive, checkout SHALL NOT require an admission token and SHALL behave as it does today. On successful order creation the admission slot SHALL be released so the next waiting user can be admitted.

#### Scenario: Admitted user checks out while the room is active
- **WHEN** an authenticated AUDIENCE user submits `POST /checkout/orders` for a concert whose waiting room is active, carrying a valid admission token bound to that user and concert
- **THEN** the system SHALL allow the existing reservation transaction to run
- **AND** the system SHALL release the user's admission slot after the order is created

#### Scenario: Duplicate checkout retry returns existing order without requiring a new admission
- **WHEN** an authenticated AUDIENCE user retries `POST /checkout/orders` with the same idempotency key after an order was already created for that user
- **THEN** the system SHALL return the existing order
- **AND** it SHALL NOT require a fresh waiting-room admission token for that duplicate retry

#### Scenario: Missing admission token is rejected while the room is active
- **WHEN** an authenticated AUDIENCE user submits checkout for a concert whose waiting room is active without a valid admission token
- **THEN** the system SHALL reject the request before creating an order or reserving inventory and SHALL direct the client to the waiting queue

#### Scenario: Admission token for another user or concert is rejected
- **WHEN** a checkout request presents an admission token bound to a different user or a different concert
- **THEN** the system SHALL reject the request before creating an order or reserving inventory

#### Scenario: Checkout is unaffected when the room is inactive
- **WHEN** a user submits checkout for a concert whose waiting room is inactive
- **THEN** the system SHALL NOT require an admission token and checkout SHALL behave according to the existing reservation and per-user limit requirements

#### Scenario: Redis waiting-room failure fails open by default
- **WHEN** the waiting-room active state cannot be read from Redis during checkout and fail-open is enabled
- **THEN** the system SHALL allow checkout to continue without a waiting-room admission token
- **AND** it SHALL record the fail-open event for operations visibility

#### Scenario: Checkout attempts feed waiting-room load
- **WHEN** a user attempts direct checkout for a concert
- **THEN** the system SHALL increment that concert's waiting-room load counter before evaluating auto-activation

#### Scenario: Admission control does not change the no-oversell transaction
- **WHEN** the admission token is validated
- **THEN** the validation SHALL occur outside the inventory reservation transaction and SHALL NOT alter `reserved_quantity` or `sold_quantity`

#### Scenario: Admission composes with entitlement gating
- **WHEN** a concert's waiting room is active and a requested ticket type is also gated by a waitlist or lottery entitlement
- **THEN** the system SHALL require both a valid admission token to enter checkout and a valid purchase entitlement to buy the gated ticket type
