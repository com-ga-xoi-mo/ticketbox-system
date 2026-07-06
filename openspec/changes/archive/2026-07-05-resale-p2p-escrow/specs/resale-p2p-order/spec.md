## ADDED Requirements

### Requirement: Buyer initiates a P2P order to lock a listing
The system SHALL allow an authenticated buyer to initiate a P2P purchase order for an `ACTIVE` resale listing. Upon initiation, the listing SHALL transition to `RESERVED` status and a `ResaleOrder` record SHALL be created with status `RESERVED`. The response SHALL include the seller's bank account name, bank account number, and bank name for the buyer to make payment. The listing SHALL be locked for 15 minutes; if the buyer does not confirm payment within that window, the order SHALL auto-cancel and the listing SHALL return to `ACTIVE`.

#### Scenario: Buyer initiates order on active listing
- **WHEN** an authenticated buyer calls `POST /resale/purchase/initiate` with a valid `listingId` for an `ACTIVE` listing
- **THEN** the system SHALL create a `ResaleOrder` with status `RESERVED`, transition the listing to `RESERVED`, and return the seller's bank account details and the order ID

#### Scenario: Buyer cannot initiate on non-active listing
- **WHEN** a buyer calls `POST /resale/purchase/initiate` with a `listingId` for a listing that is not `ACTIVE`
- **THEN** the system SHALL return HTTP 409 with error code `LISTING_NOT_AVAILABLE`

#### Scenario: Buyer cannot purchase their own listing
- **WHEN** a buyer calls `POST /resale/purchase/initiate` with a listing they themselves created
- **THEN** the system SHALL return HTTP 403 with error code `SELF_PURCHASE_NOT_ALLOWED`

#### Scenario: Seller notified when listing is reserved
- **WHEN** a buyer successfully initiates an order
- **THEN** the system SHALL send a notification to the seller: "Someone wants to buy your ticket. Please stand by."

#### Scenario: Order auto-cancelled after 15-minute timeout
- **WHEN** a `ResaleOrder` has been in `RESERVED` status for 15 minutes without the buyer confirming payment
- **THEN** the system SHALL transition the order to `CANCELLED`, return the listing to `ACTIVE` status, and notify the buyer that the order has expired

### Requirement: Buyer confirms payment with evidence
The system SHALL allow the buyer to mark payment as completed by calling `POST /resale/orders/:id/confirm-payment`. The request SHALL include a `paymentProofUrl` (URL of an uploaded screenshot/bill). Upon confirmation, the order SHALL transition to `PENDING_CONFIRM` and the seller SHALL be notified to verify and confirm receipt. A 2-hour countdown SHALL begin; if the seller does not confirm within 2 hours, the order SHALL auto-escalate to `IN_DISPUTE`.

#### Scenario: Buyer confirms payment with proof
- **WHEN** an authenticated buyer calls `POST /resale/orders/:id/confirm-payment` with a valid `paymentProofUrl` for their `RESERVED` order
- **THEN** the system SHALL transition the order to `PENDING_CONFIRM`, store the `paymentProofUrl`, and notify the seller

#### Scenario: Payment proof URL is required
- **WHEN** a buyer calls `POST /resale/orders/:id/confirm-payment` without a `paymentProofUrl`
- **THEN** the system SHALL return HTTP 400 with error code `PAYMENT_PROOF_REQUIRED`

#### Scenario: Only the order's buyer can confirm payment
- **WHEN** a user who is not the buyer of the order calls `POST /resale/orders/:id/confirm-payment`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Seller notified to verify receipt
- **WHEN** the order transitions to `PENDING_CONFIRM`
- **THEN** the system SHALL send a notification to the seller: "The buyer has marked payment as done. Please check your bank account and confirm receipt."

#### Scenario: Order auto-escalates to dispute after 2-hour seller inactivity
- **WHEN** a `ResaleOrder` has been in `PENDING_CONFIRM` status for 2 hours without the seller confirming receipt
- **THEN** the system SHALL transition the order to `IN_DISPUTE` and notify the buyer, seller, and admin team

### Requirement: Seller confirms receipt and triggers ticket transfer
The system SHALL allow the seller to confirm they have received the buyer's payment by calling `POST /resale/orders/:id/confirm-receipt`. Upon confirmation, the system SHALL execute the ticket transfer atomically: revoke the seller's ticket, mint a new ticket for the buyer, create a `ResaleTransaction`, and transition the order to `COMPLETED`. The seller SHALL only call this after independently verifying their bank account shows the funds.

#### Scenario: Seller confirms receipt and transfer executes
- **WHEN** an authenticated seller calls `POST /resale/orders/:id/confirm-receipt` for a `PENDING_CONFIRM` order they own
- **THEN** the system SHALL atomically: mark the order `COMPLETED`, revoke the seller's ticket (status `TRANSFERRED`), mint a new ticket for the buyer (status `ISSUED`, fresh `qrTokenHash`), and create a `ResaleTransaction` with `payoutStatus: PENDING`

#### Scenario: Only the listing's seller can confirm receipt
- **WHEN** a user who is not the seller calls `POST /resale/orders/:id/confirm-receipt`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Confirm receipt only allowed on PENDING_CONFIRM orders
- **WHEN** a seller calls `POST /resale/orders/:id/confirm-receipt` on an order not in `PENDING_CONFIRM` status
- **THEN** the system SHALL return HTTP 409 with error code `INVALID_ORDER_STATE`

#### Scenario: Buyer notified of ticket receipt after transfer
- **WHEN** an order transitions to `COMPLETED`
- **THEN** the system SHALL notify the buyer: "Transaction complete! Your ticket is now in your wallet." and the seller: "Transaction complete. You will receive your payout within 24 hours."

### Requirement: Either party can cancel a RESERVED order, but NOT after buyer confirms payment
The system SHALL allow either the buyer or the seller to cancel an order while it is in `RESERVED` status (before buyer confirms payment). Upon cancellation, the order SHALL transition to `CANCELLED` and the listing SHALL return to `ACTIVE`. Once the order transitions to `PENDING_CONFIRM` (buyer has confirmed payment), **neither party** — including the seller — can cancel. The only path forward from `PENDING_CONFIRM` is seller confirm-receipt or raising a dispute. Allowing seller cancellation after buyer payment confirmation is treated as a fraud signal.

#### Scenario: Buyer cancels RESERVED order
- **WHEN** the buyer calls `POST /resale/orders/:id/cancel` on a `RESERVED` order
- **THEN** the system SHALL transition the order to `CANCELLED` and return the listing to `ACTIVE`

#### Scenario: Seller cancels RESERVED order
- **WHEN** the seller calls `POST /resale/orders/:id/cancel` on a `RESERVED` order
- **THEN** the system SHALL transition the order to `CANCELLED`, return the listing to `ACTIVE`, and notify the buyer

#### Scenario: Seller cannot cancel once order is PENDING_CONFIRM
- **WHEN** the seller calls `POST /resale/orders/:id/cancel` on an order in `PENDING_CONFIRM` status
- **THEN** the system SHALL return HTTP 409 with error code `CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED` and a message directing the seller to use the dispute flow instead

#### Scenario: Cancellation not allowed on COMPLETED, IN_DISPUTE, or already CANCELLED orders
- **WHEN** either party calls `POST /resale/orders/:id/cancel` on an order in `COMPLETED`, `IN_DISPUTE`, or `CANCELLED` status
- **THEN** the system SHALL return HTTP 409 with error code `CANNOT_CANCEL_IN_CURRENT_STATE`

### Requirement: Buyer and seller can view their P2P order status
The system SHALL expose `GET /resale/orders/:id` for authenticated parties (buyer or seller of the order) to check real-time order status, including: order state, timestamps, seller bank info (if `RESERVED`), payment proof URL (if `PENDING_CONFIRM` or later), and dispute reason (if `IN_DISPUTE`).

#### Scenario: Buyer views their order
- **WHEN** a buyer calls `GET /resale/orders/:id` for an order they initiated
- **THEN** the system SHALL return the full order details including current state and relevant context for that state

#### Scenario: Unauthorized user cannot view order
- **WHEN** a user who is neither buyer nor seller calls `GET /resale/orders/:id`
- **THEN** the system SHALL return HTTP 403
