## ADDED Requirements

### Requirement: Ticket transfer creates new ticket for buyer
The system SHALL, upon a successful resale purchase, create a new `Ticket` record for the buyer with a fresh `qrTokenHash`, linked to the original `ticketTypeId` and `concertId`. The new ticket SHALL have status `ISSUED` and a new unique `ticketNumber`. The system SHALL transition the seller's original ticket to status `TRANSFERRED`.

#### Scenario: New ticket issued to buyer on resale
- **WHEN** a resale purchase completes successfully
- **THEN** the system SHALL create a new `Ticket` record for the buyer with status `ISSUED`, a unique `ticketNumber`, a fresh `qrTokenHash`, and the same `ticketTypeId` and `concertId` as the original ticket

#### Scenario: Seller's ticket marked as transferred
- **WHEN** a resale purchase completes successfully
- **THEN** the system SHALL transition the seller's original ticket to status `TRANSFERRED` and set a `transferredAt` timestamp

#### Scenario: Transferred ticket QR is permanently invalid
- **WHEN** a seller's ticket has been transferred
- **THEN** the original `qrTokenHash` SHALL remain voided and SHALL NOT be accepted at check-in

#### Scenario: Buyer's new ticket works at check-in
- **WHEN** a buyer presents the QR code from their resale-acquired ticket at the venue gate
- **THEN** the check-in system SHALL validate the new `qrTokenHash` and allow entry

### Requirement: ResaleTransaction records financial breakdown
The system SHALL create a `ResaleTransaction` record for every completed resale that captures: the listing reference, buyer and seller user references, the sale price, the platform fee (5% of sale price), and the seller payout amount (sale price minus platform fee).

#### Scenario: Transaction records correct fee breakdown
- **WHEN** a resale completes at an asking price of 1,100,000 VND
- **THEN** the `ResaleTransaction` SHALL record: sale price = 1,100,000 VND, platform fee = 55,000 VND, seller payout = 1,045,000 VND

#### Scenario: Transaction links buyer and seller
- **WHEN** a resale transaction is created
- **THEN** it SHALL reference both the buyer's `userId` and the seller's `userId`, the `ResaleListing` ID, the seller's original `Ticket` ID, and the buyer's new `Ticket` ID

#### Scenario: Fee calculation rounds down to nearest VND
- **WHEN** the 5% fee results in a fractional VND amount
- **THEN** the system SHALL round down (floor) the platform fee, with the remainder going to the seller payout

### Requirement: Resale transfer is atomic
The system SHALL execute the entire resale transfer (listing status update, seller ticket status change, buyer ticket creation, transaction record creation) within a single PostgreSQL transaction. If any step fails, the entire operation SHALL roll back.

#### Scenario: Partial transfer failure rolls back
- **WHEN** the buyer ticket creation fails after the listing has been marked as `SOLD` within the same transaction
- **THEN** the entire transaction SHALL roll back, the listing SHALL remain `ACTIVE`, and the seller's ticket SHALL remain in `LISTED_FOR_RESALE` status

#### Scenario: Successful atomic transfer
- **WHEN** all steps of the resale transfer complete within the transaction
- **THEN** the listing status, seller ticket status, buyer ticket record, and transaction record SHALL all be committed together

### Requirement: QR token regeneration on delist or expiry
The system SHALL generate a new cryptographically secure QR token and store its hash when restoring a ticket from `LISTED_FOR_RESALE` back to `ISSUED` (due to seller cancellation or listing expiry). The new token SHALL be different from the original voided token.

#### Scenario: New QR token on listing cancellation
- **WHEN** a seller cancels their resale listing
- **THEN** the system SHALL generate a new QR token, store its hash as the ticket's `qrTokenHash`, and the ticket SHALL be usable at check-in with the new QR code

#### Scenario: New QR token on listing expiry
- **WHEN** a listing auto-expires before the event
- **THEN** the system SHALL generate a new QR token for the restored ticket and notify the seller with their updated ticket details

#### Scenario: Old voided QR token remains invalid
- **WHEN** a ticket's QR has been regenerated after delist or expiry
- **THEN** the original voided `qrTokenHash` SHALL NOT be accepted at check-in

### Requirement: Seller payout ledger tracking
The system SHALL track seller payouts as ledger entries in the `ResaleTransaction` record. The payout status SHALL follow: `PENDING` (transaction completed, payout not yet processed) → `PROCESSED` (payout disbursed to seller). V1 does not automate disbursement; payout processing is a manual admin action.

#### Scenario: Payout starts as pending
- **WHEN** a resale transaction completes
- **THEN** the seller payout status SHALL be set to `PENDING`

#### Scenario: Admin marks payout as processed
- **WHEN** an admin marks a payout as processed after manual disbursement
- **THEN** the payout status SHALL transition to `PROCESSED` with a `processedAt` timestamp

#### Scenario: Seller can view payout status
- **WHEN** a seller views their resale transaction history via `GET /me/resale/transactions`
- **THEN** each transaction SHALL include the payout amount and current payout status
