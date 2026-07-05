## Context

`prisma/seed.ts` currently upserts catalog + accounts only. The schema has ~37 models;
transactional ones (Order, OrderItem, Payment, PaymentEvent, Ticket, CheckinEvent,
Notification, SupportRequest/RefundRequest + status history, Promotion/PromotionUsage,
FavoriteConcert, ArtistFollow/ArtistFavorite, GuestList\*, ArtistBio) are unseeded.

Tickets store only `qrTokenHash` (unique); the raw `qrPayload` is regenerated on read via
`QrTicketTokenService.createPayload(ticketFields)`. The issuing flow stores
`qrTokenHash = hashPayload(createPayload(...))` (SHA-256 hex) using `QR_TOKEN_SECRET`
(default `ticketbox-qr-token-dev-secret`). `QrTicketTokenService` is a pure crypto class
the seed can import directly.

## Goals / Non-Goals

**Goals:**

- Idempotent, deterministic seed covering all 3 tiers.
- Seeded tickets are genuinely scannable (correct `qrTokenHash`).
- Consistent ticket-type reserved/sold counts.
- Readable, maintainable seed code.

**Non-Goals:**

- Not invoking the real domain use-cases (reservation, payment gateways) — the seed writes
  consistent end-state rows directly.
- No schema/migration change; no runtime behavior change.
- Not exhaustive (hundreds of rows) — enough for a full demo, fast to run.

## Decisions

**1. Reuse `QrTicketTokenService` for QR.** The seed imports the same service, constructs it
with `process.env.QR_TOKEN_SECRET ?? 'ticketbox-qr-token-dev-secret'`, and for each ticket
computes `payload = createPayload({ ticketId, ticketNumber, orderId, userId, concertId,
issuedAt })` then `qrTokenHash = hashPayload(payload)`. This guarantees scannability without
duplicating crypto. _Alternative:_ hand-roll the hash in the seed — rejected (drift risk).
_Import mechanism:_ the service is a self-contained pure-crypto class (only imports node
`crypto`), so the seed imports it by **relative path** (`tsx` compiles the single TS file)
rather than relying on the `@ticketbox/backend/*` tsconfig alias (`tsx` does not reliably
resolve path aliases). If the relative import proves brittle under `tsx`, the fallback is to
inline the identical `createPayload`/`hashPayload` logic — but reuse is preferred.

**2. Deterministic IDs for idempotency.** All seeded rows use stable UUIDs derived from a
namespace + index (e.g. `uuidv5(`order-${i}`, NS)` — `uuid@7` is available), and writes use
`upsert`. Re-running or `migrate reset` converges to the same dataset. Counts (orders,
tickets) are fixed constants. _Alternative:_ random ids + createMany — rejected
(non-idempotent, duplicates on re-run).
_Unique columns need deterministic-unique values_ so re-runs neither duplicate nor violate
constraints: `Ticket.qrTokenHash` (naturally unique per payload) and `ticketNumber`,
`Payment.providerTransactionId`, `PaymentEvent.providerEventId`, `Notification.dedupeKey`,
and `CheckinEvent (deviceId, offlineEventId)` — each derived deterministically from its
owning entity's stable id/index.

**3. Direct end-state writes with manual consistency.** For a PAID order the seed writes:
Order(PAID) → OrderItem(s) → Payment(SUCCEEDED) + PaymentEvent → Ticket(ISSUED|CHECKED_IN)
with correct `qrTokenHash`, and increments the ticket type's sold count. PENDING orders get
reserved counts; CANCELLED release them. A single pass computes per-ticket-type
reserved/sold totals so availability stays correct. A `CHECKED_IN` ticket also sets
`checkedInAt` and gets a matching `CheckinEvent` with `source = ONLINE`,
`result = ACCEPTED`, a `staffId` (a seeded staff user assigned to that concert), an
`occurredAt`, and a deterministic `deviceId`/`offlineEventId` pair (to satisfy the unique
constraint).

**4. Realistic distribution via fixed ratios.** e.g. of seeded orders ~80% PAID, ~10%
PENDING, ~10% CANCELLED; of issued tickets ~20% CHECKED_IN (with CheckinEvent). Event
dates: a few `endsAt` in the past, some near-term, most upcoming — chosen as offsets from a
fixed "seed epoch" (not `Date.now()`, to stay deterministic across runs within a window;
use offsets from a base date so past/future relationships hold). Seed events also set
`eventType` so marketplace filters cover music plus workshop, sport, movie, theatre, and
voucher listings.

**5. Split into helper modules.** Move large blocks into `prisma/seed/` helpers
(`accounts.ts`, `catalog.ts`, `orders-tickets.ts`, `notifications.ts`, `engagement.ts`,
`support-refunds.ts`, `guest-list.ts`) imported by `seed.ts`, for readability. Keep one
transaction-friendly orchestration in `seed.ts`.

## Quantities (targets)

| Entity                     | Count                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audience users             | ~20 (+ existing system accounts)                                                                                                                      |
| Check-in staff             | +3 (multi-assignment)                                                                                                                                 |
| Artists                    | ~15                                                                                                                                                   |
| Events                     | ~37 total: existing music breadth plus 5 more music events and 5 each for workshop, sport, movie, theatre, voucher (≥1 ended, ~2 near, rest upcoming) |
| Ticket types               | 3/event (existing pattern)                                                                                                                            |
| Orders                     | ~50 (≈40 PAID, 5 PENDING, 5 CANCELLED)                                                                                                                |
| Tickets                    | ~80–100 issued (~20% checked in)                                                                                                                      |
| Payments                   | 1/order                                                                                                                                               |
| Notifications              | ~60 (mixed read/unread)                                                                                                                               |
| Promotions                 | ~5 (active + expired)                                                                                                                                 |
| Favorites / follows        | 3–5 / audience user                                                                                                                                   |
| Support / refund requests  | ~5 / ~3 (with status history)                                                                                                                         |
| Artist bios                | ~3                                                                                                                                                    |
| Guest-list batch / entries | 1–2 / ~20                                                                                                                                             |

## Risks / Trade-offs

- **[QR secret mismatch]** If the running API uses a different `QR_TOKEN_SECRET` than the
  seed, seeded QRs won't validate. → Mitigation: both read the same env/default; document it.
- **[Deterministic dates drift]** Using offsets from `Date.now()` makes "past/future" shift
  over time but stays correct relative to run time; acceptable for demo. Pure-constant dates
  would eventually all become "past". → Use offsets from now for relative correctness;
  accept that exact timestamps differ per run (ids stay stable).
- **[Manual consistency bugs]** Writing end-state rows by hand risks inventory mismatch. →
  Mitigation: a single counting pass + assertions in the seed; verify availability after.
- **[Seed runtime]** ~100 tickets + hashing is fast (<a few seconds).

## Migration Plan

No DB migration. Additive to `prisma/seed.ts` (+ `prisma/seed/` helpers). Rollback = revert
the seed files. Re-run `npm run db:seed` (or `prisma migrate reset`) to apply.
