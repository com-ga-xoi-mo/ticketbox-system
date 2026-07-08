## ADDED Requirements

### Requirement: Checkout requires waitlist entitlement for gated ticket types
The system SHALL require a valid official waitlist purchase entitlement before creating a direct-purchase order for any waitlist-gated ticket type. The entitlement check SHALL run before inventory mutation and SHALL preserve the existing inventory reservation transaction as the only mechanism that changes `reserved_quantity` and `sold_quantity`. Entitlement consumption SHALL be atomic with direct-purchase order creation and inventory reservation.

#### Scenario: Entitled user creates checkout order
- **WHEN** an authenticated AUDIENCE user submits `POST /checkout/orders` for a waitlist-gated ticket type with a valid active entitlement owned by that user
- **THEN** the system SHALL allow the existing checkout reservation transaction to run
- **AND** the system SHALL consume the entitlement in the same transaction that creates the pending direct-purchase order

#### Scenario: Reservation failure does not consume entitlement
- **WHEN** an authenticated AUDIENCE user submits checkout with a valid active entitlement but the inventory reservation transaction fails before creating the pending order
- **THEN** the system SHALL NOT mark the entitlement consumed
- **AND** the system SHALL NOT create an order or mutate inventory for that failed checkout

#### Scenario: Missing entitlement is rejected
- **WHEN** an authenticated AUDIENCE user submits checkout for a waitlist-gated ticket type without an entitlement
- **THEN** the system SHALL reject the request before creating an order, order items, or inventory reservation

#### Scenario: Entitlement for another user is rejected
- **WHEN** a checkout request references an entitlement owned by another user
- **THEN** the system SHALL reject the request before creating an order or mutating inventory

#### Scenario: Requested quantity exceeds entitlement
- **WHEN** a checkout request uses an entitlement but requests more tickets than the entitlement permits
- **THEN** the system SHALL reject the request before creating an order or mutating inventory

#### Scenario: Direct checkout remains available when not waitlist-gated
- **WHEN** a ticket type has no active waitlist entries and no active waitlist entitlements
- **THEN** direct checkout SHALL continue to behave according to the existing inventory reservation and per-user limit requirements

#### Scenario: Resale order remains excluded
- **WHEN** a resale purchase creates an order with `orderSourceType` of `RESALE`
- **THEN** the official waitlist entitlement guard SHALL NOT apply to that resale order
