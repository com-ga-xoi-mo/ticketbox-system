## 1. Database — Schema & Migration

- [x] 1.1 Add `ResaleOrderStatus` enum to Prisma schema: `RESERVED`, `PENDING_CONFIRM`, `COMPLETED`, `CANCELLED`, `IN_DISPUTE`
- [x] 1.2 Add `RESERVED` value to the existing `ResaleListingStatus` enum
- [x] 1.3 Create `SellerBankProfile` model in Prisma schema with fields: `id`, `userId` (unique FK → users), `bankAccountName`, `bankAccountNumber`, `bankName`, `createdAt`, `updatedAt`
- [x] 1.4 Create `ResaleOrder` model in Prisma schema with fields: `id`, `listingId` (unique FK → resale_listings), `buyerId` (FK → users), `sellerId` (FK → users), `status` (ResaleOrderStatus), `paymentProofUrl`, `disputeReason`, `disputeRaisedBy`, `resolvedBy` (admin userId, nullable), `resolutionNote`, `reservedAt`, `paymentConfirmedAt`, `completedAt`, `cancelledAt`, `disputedAt`, `resolvedAt`, `createdAt`; indexes on `(buyerId, status)` and `(sellerId, status)`
- [x] 1.5 Add `buyerViolationCount` (Int, default 0) and `resaleMarketSuspendedAt` (DateTime, nullable) fields to the `User` model
- [x] 1.6 Run `prisma migrate dev --name resale-p2p-escrow` to generate the migration file
- [x] 1.7 **Verify**: `npx prisma validate` passes with no errors; migration runs successfully against the local DB

## 2. Backend — Seller Bank Profile

- [x] 2.1 Create `SellerBankProfileRepository` with methods: `findByUserId(userId)`, `upsert(userId, data)`
- [x] 2.2 Create `SaveBankProfileUseCase`: validate `bankName` is in the allowed Vietnamese bank list, then upsert into DB
- [x] 2.3 Add endpoint `PUT /me/bank-profile` to `UserController` (or a new `BankProfileController`), protected by JWT guard
- [x] 2.4 Add endpoint `GET /me/bank-profile` so the user can retrieve their saved bank details
- [x] 2.5 Update `CreateListingUseCase`: check that the seller has a bank profile; if not, throw `BANK_PROFILE_REQUIRED` (HTTP 422)
- [x] 2.6 **Verify**: `PUT /me/bank-profile` saves correctly; `POST /resale/listings` returns 422 when bank profile is missing

## 3. Backend — ResaleOrder Use Cases & Endpoints

- [x] 3.1 Create `ResaleOrderRepository` with methods: `create(data)`, `findById(id)`, `updateStatus(id, status, extraFields)`, `findActiveByListingId(listingId)`
- [x] 3.2 Create `InitiateP2POrderUseCase`: validate listing is `ACTIVE` + buyer is not the seller + buyer is not suspended; create `ResaleOrder` with status `RESERVED`; update listing status to `RESERVED`; enqueue `resale.order.reserved.expiry` delayed job (15 minutes); return seller bank info + orderId
- [x] 3.3 Create `ConfirmPaymentUseCase`: validate order is `RESERVED` + caller is the buyer + `paymentProofUrl` is present; update order to `PENDING_CONFIRM` and store `paymentProofUrl`; enqueue `resale.order.confirm.expiry` delayed job (2 hours); notify seller
- [x] 3.4 Create `ConfirmReceiptUseCase`: validate order is `PENDING_CONFIRM` + caller is the seller; call existing `ExecuteTransfer` logic (revoke seller ticket, mint buyer ticket); create `ResaleTransaction` with 5% platform fee (floored) — **only at this step**; update order to `COMPLETED`; notify buyer and seller
- [x] 3.5 Create `CancelP2POrderUseCase`: validate order is `RESERVED` + caller is buyer or seller; if caller is the seller and order is `PENDING_CONFIRM`, return HTTP 409 `CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED`; update order to `CANCELLED`; return listing to `ACTIVE`; notify the other party
- [x] 3.6 Create `RaiseDisputeUseCase`: validate order is `PENDING_CONFIRM` + caller is buyer or seller; update order to `IN_DISPUTE`, store `reason` and `raisedBy`; notify admin via notification queue job
- [x] 3.7 Create `ResolveDisputeUseCase` (admin only): validate order is `IN_DISPUTE`; if action is `complete` → call `ExecuteTransfer` + create `ResaleTransaction` (5% fee) + enqueue `compute-seller-trust` with `dispute_loss` event; if action is `cancel` → return listing to `ACTIVE` + do NOT create `ResaleTransaction` (no fee charged) + increment buyer `buyerViolationCount` + auto-suspend if count >= 3; update order + notify both parties
- [x] 3.8 Create `GetP2POrderUseCase`: return order detail only to the buyer or seller of that order (HTTP 403 otherwise)
- [x] 3.9 Create `ResaleOrderController` with routes: `POST /resale/purchase/initiate`, `POST /resale/orders/:id/confirm-payment`, `POST /resale/orders/:id/confirm-receipt`, `POST /resale/orders/:id/cancel`, `POST /resale/orders/:id/dispute`, `GET /resale/orders/:id`
- [x] 3.10 Add admin route `POST /admin/resale/orders/:id/resolve` to the admin controller, protected by admin role guard
- [x] 3.11 **BREAKING**: Deprecate `POST /resale/purchase` — return HTTP 410 Gone with a message directing clients to use `POST /resale/purchase/initiate`

## 4. Backend — BullMQ Jobs

- [x] 4.1 Add queue name constants `resale.order.reserved.expiry` and `resale.order.confirm.expiry`
- [x] 4.2 Create `ResaleOrderReservedExpiryProcessor`: on job execution, check if order is still `RESERVED` → call `CancelP2POrderUseCase`; if state has already changed, skip (idempotent)
- [x] 4.3 Create `ResaleOrderConfirmExpiryProcessor`: on job execution, check if order is still `PENDING_CONFIRM` → call `RaiseDisputeUseCase` with reason `SELLER_NO_RESPONSE`; notify admin; if state has already changed, skip (idempotent)
- [x] 4.4 Enqueue `resale.order.reserved.expiry` delayed job (15 minutes) inside `InitiateP2POrderUseCase`
- [x] 4.5 Enqueue `resale.order.confirm.expiry` delayed job (2 hours) inside `ConfirmPaymentUseCase`
- [x] 4.6 Register both processors in the BullMQ module in the worker app
- [x] 4.7 **Verify**: Create an order and let the 15-minute timeout expire → listing returns to `ACTIVE`; confirm payment and let the 2-hour timeout expire → order transitions to `IN_DISPUTE`

## 5. Backend — Trust Score & Buyer Suspension

- [x] 5.1 Update `ComputeSellerTrustJob` to accept event type `dispute_loss` — apply a penalty weight to the score computation
- [x] 5.2 In `ResolveDisputeUseCase`: when buyer loses → increment `buyerViolationCount`; if count >= 3 → set `resaleMarketSuspendedAt = now()`
- [x] 5.3 In `InitiateP2POrderUseCase`: check buyer's `resaleMarketSuspendedAt`; if suspended → return HTTP 403 `BUYER_SUSPENDED`
- [x] 5.4 **Verify**: Resolve 3 disputes against a buyer → buyer is suspended → `POST /resale/purchase/initiate` returns 403

## 6. Frontend — Seller Bank Profile Setup

- [x] 6.1 Create page `/account/bank-profile` with a form: bank name (select dropdown from Vietnamese bank list), account number (text input), account holder name (text input)
- [x] 6.2 Add a "Set up payout account" link in the seller's profile/settings page
- [x] 6.3 When a seller navigates to the create-listing page without a bank profile, display a warning banner with a link to `/account/bank-profile`
- [x] 6.4 **Verify**: Fill in all fields → save → listing creation succeeds

## 7. Frontend — Buyer P2P Order Flow

- [x] 7.1 Replace the "Buy Now" button in `ResaleListingDetailPage` with a "Place Order" button that calls `POST /resale/purchase/initiate`
- [x] 7.2 Create page `/resale/orders/:id` — order tracking page that displays real-time status via SSE (reuse existing SSE infrastructure)
- [x] 7.3 In the order tracking page, `RESERVED` state: display seller bank info (account holder name, account number, bank name, amount to transfer), 15-minute countdown, "I Have Transferred" button, and "Cancel Order" button
- [x] 7.4 In the order tracking page, `RESERVED` state → when "I Have Transferred" is clicked: open a modal to upload the payment bill; after upload, obtain the URL and call `POST /resale/orders/:id/confirm-payment`
- [x] 7.5 In the order tracking page, `PENDING_CONFIRM` state: display "Waiting for seller to confirm", 2-hour countdown, "Report an Issue" button (raise dispute) — **no cancel button for buyer at this step**
- [x] 7.6 In the order tracking page, `COMPLETED` state: display "Transaction complete! Your ticket is now in your wallet" with a link to the ticket wallet
- [x] 7.7 In the order tracking page, `CANCELLED` state: display the cancellation reason and a link back to the resale listing feed
- [x] 7.8 In the order tracking page, `IN_DISPUTE` state: display "Your order is under dispute review. We will follow up within 24 hours."
- [x] 7.9 **Verify**: Full buyer happy path: initiate → view bank info → upload bill → await seller → receive ticket

## 8. Frontend — Seller Confirmation Flow

- [x] 8.1 Send a notification to the seller when their listing is reserved: "Someone wants to buy your ticket. Please stand by."
- [x] 8.2 Create seller order view at `/resale/orders/:id` (same route, rendered differently based on whether the viewer is the buyer or seller)
- [x] 8.3 In the seller view, `PENDING_CONFIRM` state: display buyer info, the uploaded payment bill image, a "Confirm Receipt" button (with a clear warning: "Only confirm after verifying funds in your bank account"), and a "Report an Issue" button — **no cancel button; seller can only confirm or dispute**
- [x] 8.4 The "Confirm Receipt" button calls `POST /resale/orders/:id/confirm-receipt`; on success, display "Transaction complete! You will receive your payout within 24 hours."
- [x] 8.5 **Verify**: Seller receives notification → opens order page → reviews bill → confirms → buyer receives ticket

## 9. Admin — Dispute Management

- [x] 9.1 Add page `/admin/resale/disputes` listing all orders with status `IN_DISPUTE`, sorted by `disputedAt` ASC (oldest first)
- [x] 9.2 Create a dispute detail view: display full order info, the buyer's uploaded payment bill, dispute reason, and full state transition history
- [x] 9.3 Add "Resolve for Buyer" button (calls resolve with `complete`) and "Resolve for Seller" button (calls resolve with `cancel`), each with a confirmation dialog and a resolution note input field
- [x] 9.4 **Verify**: Admin resolves dispute → order transitions to `COMPLETED` or `CANCELLED` → trust score / violation count updated accordingly

## 10. End-to-End Verification

- [x] 10.1 **Happy path**: Buyer initiates → views bank info → uploads bill → seller confirms → ticket transferred → both parties notified
- [x] 10.2 **RESERVED timeout**: Order auto-cancels after 15 minutes → listing returns to `ACTIVE`
- [x] 10.3 **PENDING_CONFIRM timeout**: Seller does not confirm within 2 hours → auto `IN_DISPUTE` → admin notified
- [x] 10.4 **Dispute resolved in buyer's favor**: Admin resolves with `complete` → ticket transferred → seller penalized
- [x] 10.5 **Dispute resolved in seller's favor**: Admin resolves with `cancel` → listing returns to `ACTIVE` → buyer violation count incremented
- [x] 10.6 **Buyer suspended**: 3 violations → `POST /resale/purchase/initiate` returns 403
- [x] 10.7 **Bank profile gate**: Seller without bank profile → `POST /resale/listings` returns 422
- [x] 10.8 `npm run build` (backend) and `tsc --noEmit` (frontend) complete with no errors
