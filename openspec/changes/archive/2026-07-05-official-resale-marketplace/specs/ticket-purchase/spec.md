## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Checkout rejects resale-ineligible promo codes
The system SHALL NOT allow promotional codes to be applied to orders with `orderSourceType` of `RESALE`. The standard checkout flow (`POST /checkout/orders`) SHALL continue to accept promo codes for direct purchases only.

#### Scenario: Promo code on direct purchase works normally
- **WHEN** a user applies a valid promo code during standard checkout
- **THEN** the system SHALL apply the discount as configured

#### Scenario: Promo code on resale purchase is rejected
- **WHEN** the resale purchase flow attempts to set a promo code on a resale order
- **THEN** the system SHALL reject or ignore the promo code
