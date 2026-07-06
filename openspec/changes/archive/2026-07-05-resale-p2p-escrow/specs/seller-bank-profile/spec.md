## ADDED Requirements

### Requirement: Seller must have a bank profile before creating a listing
The system SHALL require a seller to have a valid bank profile (account holder name, account number, bank name) saved before they are permitted to create a resale listing. If a seller without a bank profile attempts to create a listing, the system SHALL return an error with a prompt to complete their bank profile.

#### Scenario: Seller without bank profile cannot create listing
- **WHEN** a seller without a saved bank profile calls `POST /resale/listings`
- **THEN** the system SHALL return HTTP 422 with error code `BANK_PROFILE_REQUIRED` and a message directing the seller to complete their bank profile at `/account/bank-profile`

#### Scenario: Seller with valid bank profile can create listing
- **WHEN** a seller with a saved and complete bank profile calls `POST /resale/listings`
- **THEN** the system SHALL proceed with listing creation as normal

### Requirement: Seller can save and update their bank profile
The system SHALL allow an authenticated user to save their bank payout information via `PUT /me/bank-profile`. The profile SHALL include: `bankAccountName` (string, full legal name of the account holder), `bankAccountNumber` (string), and `bankName` (string, from a predefined list of Vietnamese banks). All three fields are required. The profile SHALL be associated with the user's account and persisted in the `seller_bank_profiles` table.

#### Scenario: Seller saves bank profile
- **WHEN** an authenticated user calls `PUT /me/bank-profile` with valid `bankAccountName`, `bankAccountNumber`, and `bankName`
- **THEN** the system SHALL create or update their bank profile and return the saved data

#### Scenario: Missing required fields are rejected
- **WHEN** an authenticated user calls `PUT /me/bank-profile` with any required field missing
- **THEN** the system SHALL return HTTP 400 with a validation error listing the missing fields

#### Scenario: Bank name must be from allowed list
- **WHEN** an authenticated user calls `PUT /me/bank-profile` with a `bankName` not in the predefined Vietnamese bank list
- **THEN** the system SHALL return HTTP 400 with error code `INVALID_BANK_NAME`

### Requirement: Seller bank info is shown to buyer when order is initiated
The system SHALL include the seller's bank profile information in the response of `POST /resale/purchase/initiate` so the buyer knows where to transfer the funds. The response SHALL include `bankAccountName`, `bankAccountNumber`, `bankName`, and the exact `amountVnd` to transfer.

#### Scenario: Order initiation response includes bank info
- **WHEN** a buyer successfully initiates a P2P order
- **THEN** the response SHALL include the seller's `bankAccountName`, `bankAccountNumber`, `bankName`, and the `amountVnd` (equal to the listing's asking price)

#### Scenario: Bank info is not exposed in any other public endpoint
- **WHEN** any unauthenticated or unauthorized user accesses resale listing data
- **THEN** the seller's bank account number and account holder name SHALL NOT be included in the response
