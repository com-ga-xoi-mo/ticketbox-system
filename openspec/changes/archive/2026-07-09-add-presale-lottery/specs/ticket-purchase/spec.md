## MODIFIED Requirements

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
