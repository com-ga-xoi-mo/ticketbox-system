## Why

Currently, when a buyer clicks "Buy Ticket", the system mints a ticket instantly without any real payment or verification — leaving both buyers and sellers exposed to scams. A proper P2P escrow flow is needed where the buyer transfers real funds outside the platform, the seller confirms receipt, and the ticket is only transferred after the seller explicitly confirms — mirroring the P2P model used by exchanges like Binance P2P.

## What Changes

- **BREAKING** `POST /resale/purchase` is replaced by a 3-step flow: initiate → confirm-payment → confirm-receipt
- Add `ResaleOrder` entity with a 5-state machine: `RESERVED` → `PENDING_CONFIRM` → `COMPLETED` / `CANCELLED` / `IN_DISPUTE`
- Seller profile must include bank account details (account holder name, account number, bank name) before creating a listing
- Buyer must upload a payment screenshot/bill when marking payment as done
- Ticket is only minted after the seller explicitly confirms receipt of funds
- Add dispute system: auto-escalate to `IN_DISPUTE` if seller does not confirm within 2 hours; admin tooling to resolve
- Add trust score penalty for buyer/seller violations
- Add timeout job: order auto-cancels to `CANCELLED` if buyer does not confirm payment within 15 minutes of initiating

## Capabilities

### New Capabilities

- `resale-p2p-order`: Manages the full lifecycle of a P2P purchase order — from buyer initiating (RESERVED), buyer marking payment done (PENDING_CONFIRM), to seller confirming receipt (COMPLETED), including cancel and dispute paths
- `resale-dispute`: Dispute mechanism for problematic P2P transactions — buyer/seller raises dispute, admin reviews evidence and resolves, trust score is affected accordingly
- `seller-bank-profile`: Sellers must register bank account details before creating a listing; this information is shown to buyers when they initiate an order

### Modified Capabilities

- `resale-transfer`: Replaces transfer-on-click logic with a trigger from seller confirmation within the P2P order flow
- `resale-marketplace`: Sellers require a valid bank profile before being allowed to create a listing; listing status gains a `RESERVED` state
- `seller-trust-profile`: Adds penalty scoring when a seller fails to confirm or loses a dispute; adds buyer violation tracking and suspension

## Impact

- **Backend**: Add `ResaleOrder` model to Prisma schema; refactor `ExecutePurchaseUseCase`; add 6 new endpoints; add 2 BullMQ jobs (`resale.order.reserved.expiry`, `resale.order.confirm.expiry`)
- **Frontend**: Replace "Buy Now" button with multi-step order flow and real-time order tracking page (SSE); add seller confirmation UI; add bank info setup in seller profile settings
- **Database**: Migration adds `resale_orders` and `seller_bank_profiles` tables; adds `buyerViolationCount` and `resaleMarketSuspendedAt` fields to `users`
- **Admin**: Add dispute management UI and endpoints for admin to resolve disputes
- **Not affected**: Primary ticket purchase flow, VNPay/MoMo integration, check-in flow
