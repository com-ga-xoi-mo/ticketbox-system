## 1. Data model & migration

- [x] 1.1 Add `waitlist_ticket_availability` model (per ticket type: `ticketTypeId` unique, `markerState` enum `AVAILABLE|SOLD_OUT|NOTIFIED`, `lastNotifiedAt` nullable, timestamps) in `prisma/schema.prisma`
- [x] 1.2 Add winner-allotment tracking to `lottery_registrations`: `wonQuantity` (int, default 0) and `purchasedQuantity` (int, default 0); `fulfilledAt` already exists
- [x] 1.3 Remove the lottery `entitlement_ttl_minutes` column from `lottery_configs`
- [x] 1.4 Drop the `purchase_entitlements` table and its `purchase_entitlement_source` / `purchase_entitlement_status` enums; remove the `lotteryRegistrationId`/`waitlistEntryId` relations that referenced it
- [x] 1.5 Generate Prisma migration with DB up (`prisma migrate dev`) + `prisma generate`; document that in-flight entitlements are voided and lottery winners now use the whole presale window

## 2. Ordering — presale-access port + remove waitlist gate

- [x] 2.1 Repurpose the reservation-guard port (rename `WaitlistEntitlementReservationPort` → `PresaleAccessReservationPort`): input is `(userId, concertId, items, orderId, now)`; it validates lottery winner status and records purchased quantity — no entitlement id
- [x] 2.2 Rewrite the guard's gate predicate: a ticket type is gated ONLY when `presaleGateOpensAt <= now < presaleGateClosesAt` (drop the waitlist-entry / entitlement branch entirely)
- [x] 2.3 Inside the reservation transaction, delegate to the port: reject non-winners; for winners check `purchasedQuantity + requested ≤ wonQuantity`, increment `purchasedQuantity`, mark `fulfilledAt` when exhausted — all atomic with order creation
- [x] 2.4 Remove `waitlistEntitlementId` from `CreateOrderDto`, `CreateOrderCommand`, the create-order use case, and the reservation options
- [x] 2.5 Remove the waitlist release publisher path from `expire-reservations` / `expired-reservation.processor` (no longer feeds waitlist)
- [x] 2.6 Update ordering unit/integration tests for the new gate + winner-purchase cap; confirm no `reserved_quantity`/`sold_quantity` regression

## 3. Official waitlist — watcher + marker, remove entitlement

- [x] 3.1 Delete `GrantWaitlistEntitlementsUseCase`, `ExpireWaitlistEntitlementsUseCase`, `SendWaitlistEntitlementRemindersUseCase`, and the reservation-adapter entitlement consume for WAITLIST
- [x] 3.2 Add `waitlist-availability.repository` (marker CRUD) + `WatchWaitlistAvailabilityUseCase`: for ticket types with active subscribers, read `total - reserved - sold`, drive the marker state machine, and on the `SOLD_OUT → >0` edge notify all active subscribers once per episode
- [x] 3.3 Add the availability-watcher worker processor (periodic tick) in the waitlist worker module; remove the grant/expiry/reminder processor wiring
- [x] 3.4 Restrict join to sold-out ticket types (availability == 0); simplify entry lifecycle to subscribed/cancelled; remove entitlement/queue-position from status
- [x] 3.5 Update waitlist notification service + email/in-app composer: content = "vé đã quay lại public sale, vào mua ngay — không giữ chỗ", Vietnamese diacritics, BullMQ-safe job id; remove the near-expiry reminder
- [ ] 3.6 Update `official-waitlist` contracts (`@ticketbox/api-types`): status response drops entitlement/queuePosition; keep join/leave/status
- [x] 3.7 Unit tests: edge detection (0→>0 once per episode, re-arm on return to 0), notify-all, join-only-when-sold-out

## 4. Presale lottery — winner allotment, drop entitlement

- [x] 4.1 Change the draw commit to record `wonQuantity` per winner on `lottery_registrations` (status `WON`), no `PurchaseEntitlement` creation; keep seed/audit/idempotency and the presale gate-window write
- [x] 4.2 Implement the ordering `PresaleAccessReservationPort` in the lottery module: look up WON registration + remaining won quantity, increment purchased quantity atomically
- [x] 4.3 Remove `ConfigureLottery`/`UpdateTtl` TTL handling, the lottery entitlement-expiry/reminder use-cases and worker, and TTL fields from contracts (`ConfigureLotteryRequest/Response`, `UpdateLotteryTtl*`)
- [x] 4.4 Update lottery status + registration-list presenters/contracts: expose won/purchased quantity instead of entitlement/expiry
- [x] 4.5 Update winner/non-winner notification composer: winner message = "bạn được mua vé trong đợt presale" (no slot/expiry), Vietnamese diacritics
- [x] 4.6 Unit/integration tests: draw records allotment (no entitlement), winner buys across window, purchased cap enforced atomically, non-winner blocked in window, resumes public after window

## 5. Remove PurchaseEntitlement system

- [x] 5.1 Delete entitlement domain types/records, repository methods, and the notification resource type usage tied to `WAITLIST_ENTITLEMENT`/`LOTTERY_ENTITLEMENT` slot semantics (keep a generic resource type if still needed for the new notifications)
- [x] 5.2 Remove all remaining references so `npm run build` has no dangling imports of the entitlement system

## 6. Frontend (audience-web)

- [x] 6.1 Waitlist controls → notify-only: "Báo tôi khi có vé" (sold-out only) + subscribed state "Bạn sẽ được thông báo khi vé quay lại"; remove entitlement countdown + `waitlistEntitlementId` from checkout; drop waitlist checkout-error mapping
- [x] 6.2 Lottery controls → winner buys whole presale window: show remaining won quantity + checkout action, no countdown, ordinary checkout request; update lottery error mapping (non-winner / won-quantity-exceeded)
- [x] 6.3 Update `shared/api/waitlist.ts` + `lottery.ts` clients and specs to the new contracts (no entitlement/TTL fields)
- [x] 6.4 Component/spec tests for notify-only waitlist and whole-window lottery winner states

## 7. Verification & docs

- [x] 7.1 `npm run build && npm run lint && npm run test` green (report any pre-existing failures separately)
- [x] 7.2 Update `official-waitlist` and `presale-lottery` module `CLAUDE.md` to the notify-only / whole-window model; remove entitlement references
- [ ] 7.3 Update manual test notes for both flows (waitlist: sold-out → subscribe → expire/cancel → recovery notification; lottery: draw → winner buys any time in window, non-winner blocked, cap enforced)
- [x] 7.4 DB verification with Docker up: migrate + boot API + exercise waitlist recovery notification and lottery whole-window winner purchase live; confirm no drift and no oversell
