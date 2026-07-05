## ADDED Requirements

### Requirement: Resale listing creation requires valid seller bank profile
The system SHALL validate that the authenticated seller has a complete bank profile (saved via `PUT /me/bank-profile`) before permitting creation of a resale listing via `POST /resale/listings`. Listings from sellers without a bank profile SHALL be rejected.

#### Scenario: Listing creation blocked without bank profile
- **WHEN** an authenticated user without a saved bank profile calls `POST /resale/listings`
- **THEN** the system SHALL return HTTP 422 with error code `BANK_PROFILE_REQUIRED`

#### Scenario: Listing creation proceeds with valid bank profile
- **WHEN** an authenticated user with a complete bank profile calls `POST /resale/listings`
- **THEN** the system SHALL proceed with listing validation and creation as defined in existing requirements

### Requirement: Listing status includes RESERVED for active P2P orders
The `ResaleListing` status enum SHALL include `RESERVED` as a valid status indicating the listing is locked due to an active `ResaleOrder` in `RESERVED` or `PENDING_CONFIRM` state. `RESERVED` listings SHALL NOT appear in the public feed (`GET /resale/listings`) and SHALL NOT be purchasable by other buyers.

#### Scenario: Reserved listing is hidden from public feed
- **WHEN** a listing's status is `RESERVED`
- **THEN** it SHALL NOT appear in `GET /resale/listings` results for any user

#### Scenario: Reserved listing cannot be initiated by another buyer
- **WHEN** a second buyer attempts to initiate a purchase on a `RESERVED` listing
- **THEN** the system SHALL return HTTP 409 with error code `LISTING_NOT_AVAILABLE`
