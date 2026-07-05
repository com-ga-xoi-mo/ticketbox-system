## MODIFIED Requirements

### Requirement: Ticket transfer creates new ticket for buyer
The system SHALL execute the ticket transfer (revoke seller ticket, mint buyer ticket) only when the seller explicitly confirms receipt of payment via `POST /resale/orders/:id/confirm-receipt`, or when an admin resolves a dispute in the buyer's favor via `POST /admin/resale/orders/:id/resolve` with `action: "complete"`. Direct execution of transfer upon the buyer's purchase action is no longer permitted. The new ticket SHALL have status `ISSUED` and a new unique `ticketNumber`. The system SHALL transition the seller's original ticket to status `TRANSFERRED`.

#### Scenario: New ticket issued to buyer on resale
- **WHEN** a seller confirms receipt or admin resolves dispute in buyer's favor
- **THEN** the system SHALL create a new `Ticket` record for the buyer with status `ISSUED`, a unique `ticketNumber`, a fresh `qrTokenHash`, and the same `ticketTypeId` and `concertId` as the original ticket

#### Scenario: Seller's ticket marked as transferred
- **WHEN** a seller confirms receipt or admin resolves dispute in buyer's favor
- **THEN** the system SHALL transition the seller's original ticket to status `TRANSFERRED` and set a `transferredAt` timestamp

#### Scenario: Transferred ticket QR is permanently invalid
- **WHEN** a seller's ticket has been transferred
- **THEN** the original `qrTokenHash` SHALL remain voided and SHALL NOT be accepted at check-in

#### Scenario: Buyer's new ticket works at check-in
- **WHEN** a buyer presents the QR code from their resale-acquired ticket at the venue gate
- **THEN** the check-in system SHALL validate the new `qrTokenHash` and allow entry

### Requirement: ResaleTransaction records financial breakdown
The system SHALL create a `ResaleTransaction` record for every completed resale that captures: the listing reference, buyer and seller user references, the sale price, the platform fee (5% of sale price), and the seller payout amount (sale price minus platform fee). This record is ONLY created when the order reaches `COMPLETED` status.

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
The system SHALL execute the entire resale transfer (listing status update, seller ticket status change, buyer ticket creation, transaction record creation) within a single PostgreSQL transaction when the seller confirms receipt or admin resolves in buyer's favor. If any step fails, the entire operation SHALL roll back.

#### Scenario: Partial transfer failure rolls back
- **WHEN** the buyer ticket creation fails after the listing has been marked as `COMPLETED` within the same transaction
- **THEN** the entire transaction SHALL roll back, the listing SHALL remain `RESERVED`, and the seller's ticket SHALL remain in `LISTED_FOR_RESALE` status

#### Scenario: Successful atomic transfer
- **WHEN** all steps of the resale transfer complete within the transaction
- **THEN** the listing status, seller ticket status, buyer ticket record, and transaction record SHALL all be committed together

## ADDED Requirements

### Requirement: Platform fee is only collected on COMPLETED orders
The system SHALL only create a `ResaleTransaction` (and thus collect the 5% platform fee) when a `ResaleOrder` reaches `COMPLETED` status. If a `ResaleOrder` ends in `CANCELLED` — whether by timeout, manual cancellation, or admin dispute resolution in the seller's favor — no `ResaleTransaction` record SHALL be created and no platform fee SHALL be charged.

#### Scenario: No fee collected when order is CANCELLED
- **WHEN** a `ResaleOrder` transitions to `CANCELLED` for any reason (timeout, buyer/seller cancel, or admin resolves dispute in seller's favor)
- **THEN** the system SHALL NOT create a `ResaleTransaction` record and no platform fee SHALL be deducted

#### Scenario: Fee collected only on COMPLETED
- **WHEN** a `ResaleOrder` transitions to `COMPLETED` (via seller confirm-receipt or admin resolves dispute in buyer's favor)
- **THEN** the system SHALL create a `ResaleTransaction` record with the 5% platform fee (floored) and `payoutStatus: PENDING`
