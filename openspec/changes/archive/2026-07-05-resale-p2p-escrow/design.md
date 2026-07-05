## Context

Currently, `POST /resale/purchase` executes a ticket transfer immediately within a single DB transaction — with no real payment, no verification, and no dispute mechanism. A buyer can receive a valid ticket for free simply by calling the endpoint. The seller has no opportunity to confirm they received funds before losing their ticket.

The codebase already has: BullMQ workers, SSE notifications, a trust score system, a ResaleTransaction ledger, and ticket mint/revoke logic. All of these are reused in this design.

## Goals / Non-Goals

**Goals:**
- Ticket is only transferred after the seller explicitly confirms receipt of payment
- Buyer must transfer real funds outside the platform and upload evidence
- Listing is locked throughout the transaction window (no other buyer can purchase)
- Auto-escalate to dispute if seller does not respond within 2 hours
- Admin has tooling to resolve disputes
- Trust score is penalized for violations on both sides

**Non-Goals:**
- Payment gateway integration (VNPay/MoMo) to collect funds from buyer — deferred to a later phase
- Automated seller disbursement — manual payout flow remains unchanged
- KYC / identity verification for buyers or sellers
- Multi-currency support or smart contract escrow

## Decisions

### Decision 1: Introduce a separate `ResaleOrder` entity rather than extending `ResaleListing`

**Choice**: Create a standalone `resale_orders` table, linked 1-to-1 with `ResaleListing` when a transaction occurs.

**Rationale**: `ResaleListing` owns the state of the item (the listing). `ResaleOrder` owns the state of a specific transaction attempt. Keeping them separate allows a listing to be re-activated if an order is cancelled, and preserves a full audit trail of all order attempts per listing.

**Alternative considered**: Adding an `orderStatus` column to `ResaleListing` — rejected because it bloats the listing schema and loses the ability to track multiple order attempts on the same listing.

**`ResaleOrder` state machine**:
```
RESERVED → PENDING_CONFIRM → COMPLETED
         ↘ CANCELLED        ↗ IN_DISPUTE → COMPLETED / CANCELLED
```

| State | Trigger | Timeout |
|---|---|---|
| `RESERVED` | Buyer initiates order | 15 minutes — auto CANCELLED |
| `PENDING_CONFIRM` | Buyer confirms payment | 2 hours — auto IN_DISPUTE |
| `COMPLETED` | Seller confirms receipt | — |
| `IN_DISPUTE` | Auto or manual raise | Admin resolves |
| `CANCELLED` | Timeout or cancel action | Listing returns to ACTIVE |

### Decision 2: Seller must set up a bank profile before creating a listing

**Choice**: Store `bankAccountName`, `bankAccountNumber`, and `bankName` in a dedicated `seller_bank_profiles` table (1-to-1 with users). `CreateListingUseCase` enforces this before allowing listing creation.

**Rationale**: Buyer needs bank details immediately upon initiating an order. Prompting the seller to enter details mid-transaction would introduce delay and degrade UX.

**Alternative considered**: Storing bank info directly on the listing — rejected because sellers can have multiple listings, causing data duplication and making updates harder.

**Chosen `seller_bank_profiles` table** (1-to-1 with user) rather than adding columns to `users` to maintain separation of concerns.

### Decision 3: Payment proof upload is mandatory, stored in existing object storage

**Choice**: When a buyer calls `POST /resale/orders/:id/confirm-payment`, the request must include a `paymentProofUrl` (URL of a screenshot/bill already uploaded to cloud storage). The frontend uploads the image first, obtains the URL, then submits.

**Rationale**: The payment proof is the only piece of evidence available during a dispute. Storing a URL rather than the file in the DB keeps the schema lean and leverages the existing cloud object storage infrastructure.

**Alternative considered**: Making proof upload optional — rejected because without evidence, admin cannot adjudicate disputes fairly.

### Decision 4: Auto-escalate to IN_DISPUTE using a BullMQ delayed job

**Choice**: When an order transitions to `PENDING_CONFIRM`, enqueue a BullMQ delayed job with a 2-hour delay. The job checks if the order is still `PENDING_CONFIRM` and, if so, transitions it to `IN_DISPUTE` and notifies admin.

**Rationale**: Reuses existing BullMQ infrastructure (the `order.expiration` job follows the same pattern). No DB polling required.

**Alternative considered**: Cron job polling — rejected because it is less precise and incurs unnecessary DB query load.

### Decision 5: Ticket transfer is triggered by seller confirmation, not automatically

**Choice**: `executeTransfer()` — which revokes the seller's ticket, mints the buyer's ticket, and creates the `ResaleTransaction` — is only called when the seller calls `POST /resale/orders/:id/confirm-receipt`, or when an admin resolves a dispute in the buyer's favor.

**Rationale**: This is the final protection layer. The seller must independently verify their bank account before confirming. The platform cannot verify receipt, so the responsibility falls on the seller.

**Accepted consequence**: If the seller confirms without checking their account and is wrong, that is the seller's error — the UI will display a clear warning. If the seller does not confirm, the order auto-escalates to dispute after 2 hours.

### Decision 6: Dispute resolution is manual, handled by admin; platform fee only collected on COMPLETED orders

**Choice**: Admin uses `POST /admin/resale/orders/:id/resolve` with action `complete` (buyer wins — execute transfer) or `cancel` (seller wins — cancel order). A `ResaleTransaction` record — and therefore the 5% platform fee — is **only created** when an order reaches `COMPLETED`. Orders ending in `CANCELLED` for any reason generate no fee and no transaction record.

**Rationale**: Manual resolution is appropriate for the current scale. Auto-resolution is too complex and high-risk. Not charging a fee on cancelled orders is fair — the platform only delivers value when a transaction actually succeeds.

### Decision 7: Seller cannot cancel an order once it is in PENDING_CONFIRM

**Choice**: Once the buyer confirms payment (order moves to `PENDING_CONFIRM`), the seller loses the right to cancel unilaterally. Their only options are to confirm receipt or raise a dispute.

**Rationale**: The buyer has already taken an irreversible action (transferred real funds). Allowing seller cancellation at this point is the clearest scam pattern in P2P — receive the money, then cancel. Raising a dispute is the only valid path if the seller has a legitimate reason.

**Consequence**: The seller UI must hide the "Cancel" button when the order is in `PENDING_CONFIRM` or later. `POST /resale/orders/:id/cancel` returns HTTP 409 with `CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED` if the caller is the seller and the order is no longer `RESERVED`.

## Risks / Trade-offs

- **[Risk] Seller receives funds but does not confirm** → Mitigated: Auto-escalate to `IN_DISPUTE` after 2h; admin can force-complete; seller's trust score is penalized significantly
- **[Risk] Buyer uploads a fake bill** → Mitigated: Seller verifies their actual bank account before confirming; if seller confirms erroneously that is their error; a fake bill will be exposed during admin dispute review
- **[Risk] Listing locked indefinitely due to a bug** → Mitigated: `RESERVED` timeout at 15 min; `PENDING_CONFIRM` timeout at 2h; admin can force-cancel any order
- **[Risk] Seller unfamiliar with bank info requirements** → Mitigated: Clear UI guidance during setup; `bankName` is validated against a fixed list of Vietnamese banks
- **[Trade-off] Slower UX compared to the old flow** → Accepted: This is an intentional trade-off between speed and safety; buyers are informed upfront that this is a manual P2P transaction

## Migration Plan

1. Deploy migration adding `resale_orders` and `seller_bank_profiles` tables
2. Deploy backend with new endpoints; keep the old `POST /resale/purchase` but return `410 Gone` with a message directing clients to use `POST /resale/purchase/initiate`
3. Deploy frontend with the multi-step order flow
4. Existing `ResaleTransaction` records are unaffected — no data migration required
5. Rollback: if issues arise, restore the old endpoint from git; no data migration needs to be undone

## Open Questions

*(All open questions have been resolved and captured in Decisions 6 & 7)*
