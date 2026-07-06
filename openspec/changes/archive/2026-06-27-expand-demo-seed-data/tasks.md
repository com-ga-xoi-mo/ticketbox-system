## 1. Seed scaffolding & determinism

- [x] 1.1 Add a deterministic id helper (namespace + index → stable UUID) and a fixed seed-epoch/date-offset helper for past/near/upcoming concerts
- [x] 1.2 (Optional) Split seed into `prisma/seed/` helper modules orchestrated by `seed.ts`, preserving existing catalog/account seeding
- [x] 1.3 Wire `QrTicketTokenService` into the seed using `QR_TOKEN_SECRET` (env or default) for QR hashing

## 2. Tier 3 — catalog breadth (do first; orders depend on it)

- [x] 2.1 Expand artists to ~15 and events to ~37 spanning past / near-term / upcoming, including 5 additional music events and 5 each for workshop, sport, movie, theatre, and voucher categories (set `startsAt`/`endsAt` and `eventType` accordingly)
- [x] 2.2 Keep 3 ticket types per concert with seating zones + ticket-type-zone mappings
- [x] 2.3 Add ~3 more check-in staff and assignments across multiple concerts/gates (≥1 staff with multiple active assignments)

## 3. Tier 1 — orders, tickets, payments, check-ins, notifications

- [x] 3.1 Add ~20 audience users (deterministic ids, Vietnamese display names)
- [x] 3.2 Seed ~50 orders (≈40 PAID / 5 PENDING_PAYMENT / 5 CANCELLED) with order items across users/concerts
- [x] 3.3 For PAID orders, issue tickets with correct `qrTokenHash` (`hashPayload(createPayload(...))`); mark ~20% `CHECKED_IN` with `CheckinEvent`
- [x] 3.4 Seed `Payment` (+ `PaymentEvent`) per order matching its status (SUCCEEDED/PENDING)
- [x] 3.5 Keep each ticket type's reserved/sold counts consistent with seeded orders/tickets
- [x] 3.6 Seed purchase-confirmation + reminder notifications (IN_APP + EMAIL) for seeded users, mixed read/unread

## 4. Tier 2 — new dev features

- [x] 4.1 Seed ~5 promotions (percentage + fixed, active + expired, usage limits) and a few PromotionUsage rows
- [x] 4.2 Seed favorite concerts / artist follows (3–5 per audience user)
- [x] 4.3 Seed ~5 support requests and ~3 refund requests with status history (varied statuses)
- [x] 4.4 Seed ~3 artist bios; seed 1–2 guest-list batches with ~20 entries

## 5. Verification

- [x] 5.1 Run `npm run db:seed` twice (and a `prisma migrate reset`) → no duplicates, no errors (idempotent)
- [x] 5.2 Pick a seeded not-checked-in ticket; verify its QR validates at online check-in (accepted), and a second scan → duplicate
- [x] 5.3 Verify availability (ticket-type reserved/sold) is consistent and the audience/web + check-in flows show seeded data without manual setup
