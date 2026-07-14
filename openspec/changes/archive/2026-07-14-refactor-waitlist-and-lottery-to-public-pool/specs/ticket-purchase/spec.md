## ADDED Requirements

### Requirement: Checkout during a lottery presale window requires lottery winner status
The system SHALL require, before creating a direct-purchase order for a ticket type whose presale lottery gate window is open (`presaleGateOpensAt <= now < presaleGateClosesAt`), that the requesting user is a recorded lottery winner for that ticket type with remaining won quantity covering the requested amount. The check SHALL run before inventory mutation, SHALL preserve the existing reservation transaction as the only mechanism that changes `reserved_quantity` and `sold_quantity`, and SHALL increment the winner's purchased quantity atomically with order creation. The official waitlist SHALL NOT gate any ticket type. Outside an open presale window, checkout SHALL treat the ticket type as an ordinary public-pool ticket.

#### Scenario: Winner checks out during the presale window
- **WHEN** an authenticated AUDIENCE user submits `POST /checkout/orders` for a ticket type inside its open presale gate window, and the user is a lottery winner with enough remaining won quantity
- **THEN** the system SHALL allow the reservation transaction to run
- **AND** the system SHALL increment the winner's purchased quantity in the same transaction that creates the pending order

#### Scenario: Non-winner is rejected during the presale window
- **WHEN** an authenticated AUDIENCE user submits checkout for a ticket type inside its open presale gate window and is not a winner with remaining won quantity
- **THEN** the system SHALL reject the request before creating an order or reserving inventory

#### Scenario: Winner requesting more than remaining won quantity is rejected
- **WHEN** a winner submits checkout for more than their remaining won quantity, in one order or across multiple orders
- **THEN** the system SHALL reject the excess before creating an order or reserving inventory

#### Scenario: Reservation failure does not record a purchase
- **WHEN** a winner's checkout passes the winner check but the reservation transaction fails before creating the pending order
- **THEN** the system SHALL NOT increment the winner's purchased quantity
- **AND** the system SHALL NOT create an order or mutate inventory

#### Scenario: Waitlist never gates checkout
- **WHEN** a ticket type has active official waitlist subscribers but no open presale lottery window
- **THEN** checkout SHALL be available to anyone through the normal public pool and SHALL NOT require any waitlist entitlement or winner status

#### Scenario: Direct checkout resumes after the presale window ends
- **WHEN** the presale gate window for a ticket type has ended and public sale has started
- **THEN** the ticket type SHALL NOT be lottery-gated and direct checkout SHALL behave according to the existing inventory reservation and per-user limit requirements

#### Scenario: Resale order remains excluded
- **WHEN** a resale purchase creates an order with `orderSourceType` of `RESALE`
- **THEN** the presale-access check SHALL NOT apply to that resale order

## REMOVED Requirements

### Requirement: Checkout requires waitlist entitlement for gated ticket types
**Reason**: The `PurchaseEntitlement` system is removed. The waitlist no longer grants entitlements or gates checkout, and lottery winners are enforced by recorded winner status rather than a consumable entitlement. Replaced by "Checkout during a lottery presale window requires lottery winner status".
**Migration**: Remove the `waitlistEntitlementId` field and entitlement-consumption path from checkout; drop the waitlist branch from the gate predicate; repurpose the ordering reservation-guard port to validate lottery winner status and record purchased quantity. Existing entitlement-based behavior is superseded once `purchase_entitlements` is dropped.
