## ADDED Requirements

### Requirement: Either party can raise a dispute on a PENDING_CONFIRM order
The system SHALL allow either the buyer or seller to raise a dispute on an order in `PENDING_CONFIRM` status by calling `POST /resale/orders/:id/dispute` with a `reason` string. Upon dispute creation, the order SHALL transition to `IN_DISPUTE`, the listing SHALL remain locked, and the admin team SHALL be notified. Neither party can unilaterally resolve a dispute — only admin can.

#### Scenario: Buyer raises dispute on PENDING_CONFIRM order
- **WHEN** a buyer calls `POST /resale/orders/:id/dispute` with a reason on a `PENDING_CONFIRM` order
- **THEN** the system SHALL transition the order to `IN_DISPUTE`, store the dispute reason and the raising party, and notify admin

#### Scenario: Seller raises dispute on PENDING_CONFIRM order
- **WHEN** a seller calls `POST /resale/orders/:id/dispute` with a reason on a `PENDING_CONFIRM` order
- **THEN** the system SHALL transition the order to `IN_DISPUTE`, store the dispute reason and the raising party, and notify admin

#### Scenario: Dispute only allowed on PENDING_CONFIRM orders
- **WHEN** either party calls `POST /resale/orders/:id/dispute` on an order not in `PENDING_CONFIRM` status
- **THEN** the system SHALL return HTTP 409 with error code `DISPUTE_NOT_ALLOWED_IN_CURRENT_STATE`

### Requirement: Admin can resolve a dispute
The system SHALL allow admin to resolve an `IN_DISPUTE` order via `POST /admin/resale/orders/:id/resolve` with action `complete` (buyer wins — execute ticket transfer) or `cancel` (seller wins — cancel order, listing returns to `ACTIVE`). The resolution SHALL record which admin resolved it and a resolution note.

#### Scenario: Admin resolves dispute in buyer's favor
- **WHEN** admin calls `POST /admin/resale/orders/:id/resolve` with `action: "complete"`
- **THEN** the system SHALL execute the ticket transfer atomically (same as seller confirm-receipt), transition the order to `COMPLETED`, enqueue a `compute-seller-trust` job with a `dispute_loss` event, and notify both parties

#### Scenario: Admin resolves dispute in seller's favor
- **WHEN** admin calls `POST /admin/resale/orders/:id/resolve` with `action: "cancel"`
- **THEN** the system SHALL transition the order to `CANCELLED`, return the listing to `ACTIVE`, increment the buyer's `buyerViolationCount`, and notify both parties. No `ResaleTransaction` is created and no platform fee is charged.

#### Scenario: Resolution requires admin role
- **WHEN** a non-admin user calls `POST /admin/resale/orders/:id/resolve`
- **THEN** the system SHALL return HTTP 403

### Requirement: Trust score is penalized when a dispute is resolved against a party
The system SHALL apply a trust score penalty to the party found at fault when admin resolves a dispute. The penalty is tracked as a `dispute_loss` event in the trust score computation.

#### Scenario: Seller penalized when dispute resolved in buyer's favor
- **WHEN** admin resolves a dispute with `action: "complete"` (buyer wins)
- **THEN** the system SHALL enqueue a `compute-seller-trust` job for the seller with a `dispute_loss` event that reduces their trust score

#### Scenario: Buyer penalized when dispute resolved in seller's favor
- **WHEN** admin resolves a dispute with `action: "cancel"` (seller wins)
- **THEN** the system SHALL record a `dispute_loss` event against the buyer's account by incrementing their `buyerViolationCount`; if the count reaches 3 or more, the buyer's `resaleMarketSuspendedAt` SHALL be set to the current timestamp, suspending them from the resale market
