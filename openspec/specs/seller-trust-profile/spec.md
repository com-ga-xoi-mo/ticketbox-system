# seller-trust-profile

## Purpose
TBD - Add purpose here.
## Requirements
### Requirement: Seller trust score is computed from platform activity
The system SHALL maintain a `SellerTrustProfile` for each user who has completed at least one resale transaction. The trust score SHALL be a computed value (0–100) derived from: number of completed resale transactions (weighted most heavily), average DM response time, and listing no-show rate (listings that expired `EXPIRED` without sale). The score SHALL be recalculated asynchronously via a BullMQ job triggered after each completed transaction, expired listing, or DM response.

#### Scenario: Trust score computed after first completed sale
- **WHEN** a user's first resale transaction completes
- **THEN** the system SHALL enqueue a `compute-seller-trust` BullMQ job, and upon completion, create or update the `SellerTrustProfile` with the new score

#### Scenario: Trust score reflects multiple completed transactions
- **WHEN** a seller has 5 completed resale transactions with no expired listings
- **THEN** their trust score SHALL be higher than a seller with 1 completed transaction and 3 expired listings

#### Scenario: No profile displayed for users with no sales history
- **WHEN** a user has never completed a resale transaction
- **THEN** the system SHALL NOT display a trust badge on their listings; the listing shows "New Seller" instead

### Requirement: Seller trust badge displayed on listings
The system SHALL display the seller's trust tier as a badge on each listing card and listing detail page. Trust tiers are derived from the trust score:

- **New Seller** (no sales history): gray label
- **Trusted** (score 60–79, at least 1 completed sale): blue badge
- **Highly Trusted** (score 80–94, at least 3 completed sales): green badge
- **Top Seller** (score 95–100, at least 5 completed sales): gold badge

#### Scenario: Listing shows correct trust badge
- **WHEN** a listing is displayed in the feed or detail page
- **THEN** the seller's trust tier badge SHALL be shown next to the seller's display name

#### Scenario: New seller listing shows "New Seller" label
- **WHEN** a seller has no completed resale transaction history
- **THEN** their listing SHALL display a "New Seller" gray label instead of a trust badge

### Requirement: Public seller profile page
The system SHALL expose a public seller profile page at `/sellers/:userId` (web) and `GET /sellers/:userId/profile` (API). The profile SHALL display: display name, trust tier badge, total completed sales, member since date, and all current `ACTIVE` listings by that seller. It SHALL NOT expose the seller's email, phone, or any personal contact information.

#### Scenario: Viewing a seller's public profile
- **WHEN** any user (authenticated or anonymous) navigates to `/sellers/:userId`
- **THEN** the system SHALL display the seller's display name, trust badge, completed sale count, member since date, and their active listings

#### Scenario: Profile hides personal information
- **WHEN** a seller profile is fetched via `GET /sellers/:userId/profile`
- **THEN** the response SHALL NOT include email address, phone number, or any other PII beyond display name and avatar

#### Scenario: Seller with no active listings shows empty listings section
- **WHEN** a seller has no current `ACTIVE` listings
- **THEN** their profile page SHALL show an empty state in the listings section, while still displaying their trust stats

### Requirement: Trust score is rate-limited from gaming
The system SHALL enforce that upvotes contributing to feed ranking cannot come from the same user multiple times per listing (already enforced by upvote toggle). The trust score computation SHALL ignore self-interactions. A seller's own upvotes on their listing SHALL NOT contribute to trust score inputs.

#### Scenario: Self-upvote does not affect trust score
- **WHEN** a seller's listing receives upvotes
- **THEN** any upvote from the seller themselves (if somehow permitted) SHALL be excluded from trust score inputs

#### Scenario: Rapid listing-and-expiry cycle does not permanently tank score
- **WHEN** a seller's listing expires once due to no buyer (e.g., niche event)
- **THEN** a single expired listing SHALL reduce the score moderately but not drop a previously high-trust seller to zero

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

