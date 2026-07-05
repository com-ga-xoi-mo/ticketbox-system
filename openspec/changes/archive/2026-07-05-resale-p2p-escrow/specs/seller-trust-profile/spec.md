## ADDED Requirements

### Requirement: Trust score computation includes dispute loss events
The system SHALL incorporate `dispute_loss` events into the seller trust score computation. A `dispute_loss` event is recorded when admin resolves a dispute against the seller (buyer wins). The `compute-seller-trust` BullMQ job SHALL accept a `dispute_loss` event type in addition to existing event types and weight it as a significant negative signal in the score calculation.

#### Scenario: Dispute loss reduces seller trust score
- **WHEN** a `compute-seller-trust` job is enqueued with event type `dispute_loss` for a seller
- **THEN** the seller's trust score SHALL decrease significantly, with the magnitude proportional to their history of disputes

#### Scenario: Multiple dispute losses can result in suspension
- **WHEN** a seller accumulates 3 or more `dispute_loss` events
- **THEN** the system SHALL flag the seller's account for admin review and optionally suspend their ability to create new listings

### Requirement: Buyer violation count tracked for repeated bad-faith behavior
The system SHALL maintain a `buyerViolationCount` field on the user record (or a dedicated violations table). Each time a dispute is resolved against a buyer (seller wins), the count SHALL increment. When the count reaches 3, the buyer SHALL be automatically suspended from the resale marketplace.

#### Scenario: Buyer violation count increments on dispute loss
- **WHEN** admin resolves a dispute with `action: "cancel"` (seller wins)
- **THEN** the system SHALL increment the buyer's `buyerViolationCount` by 1

#### Scenario: Buyer suspended after 3 violations
- **WHEN** a buyer's `buyerViolationCount` reaches 3
- **THEN** the system SHALL set a `resaleMarketSuspendedAt` timestamp on the buyer's account; subsequent calls to `POST /resale/purchase/initiate` by this buyer SHALL return HTTP 403 with error code `BUYER_SUSPENDED`
