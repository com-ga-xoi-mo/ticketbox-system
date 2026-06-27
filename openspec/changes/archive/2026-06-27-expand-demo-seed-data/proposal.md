## Why

The current `prisma/seed.ts` seeds only the catalog and accounts (roles, ~4 users, ~7
artists, ~5 concerts, seating zones, ticket types, check-in staff assignments). It seeds
**no transactional or derived data** — no orders, tickets, payments, check-ins,
notifications, promotions, favorites, support/refund requests, or guest lists. So every
demo/test requires manually buying tickets, paying, etc., before any downstream feature
(check-in, notifications, refunds) can be exercised. Worse, manual setup can't easily
produce valid scannable tickets because the QR token hash must match what the issuing
flow computes.

A richer, deterministic, idempotent seed makes the whole app demo-ready out of the box and
gives every feature realistic data to exercise.

## What Changes

- Expand `prisma/seed.ts` to cover all three tiers of data, **idempotently** (re-runnable
  without duplicates) and with **realistic statuses and dates**:
  - **Tier 1 (core):** more audience users; orders (PAID / PENDING_PAYMENT / CANCELLED);
    issued tickets **with correct QR token hashes**; payments + payment events; a portion
    of tickets already checked in; purchase-confirmation + reminder notifications (mixed
    read/unread).
  - **Tier 2 (new dev features):** promotions (percentage + fixed, active/expired, usage
    limits); favorite concerts / artist follows; support and refund requests with status
    history; a few artist bios.
  - **Tier 3 (catalog breadth):** more events spanning **past / ongoing / upcoming**
    (so the concert-end assignment filter and listings are exercisable), including 5
    additional music events plus 5 events each for workshop, sport, movie, theatre, and
    voucher categories; more artists; additional check-in staff and gate assignments; a
    guest-list batch with entries.
- **QR correctness:** seeded tickets compute `qrTokenHash` exactly as the issuing flow does
  — `hashPayload(createPayload({...}))` via the existing `QrTicketTokenService` and the
  configured `QR_TOKEN_SECRET` — so seeded tickets are genuinely scannable at check-in.
- Keep ticket-type `reserved`/`sold` counts consistent with the seeded orders/tickets so
  availability stays correct.

## Capabilities

### New Capabilities

- `demo-seed-data`: a verifiable contract for what the database seed must produce —
  deterministic/idempotent population across catalog, accounts, and transactional data,
  with scannable-valid ticket QR hashes and realistic state distribution.

### Modified Capabilities

<!-- none -->

## Impact

- **Code:** `prisma/seed.ts` (expanded; may be split into helper modules under
  `prisma/seed/` for readability). Reuses `QrTicketTokenService` and existing Prisma
  models. No schema change, no migration.
- **Determinism:** uses stable IDs (e.g. derived from indexes) and upserts so re-running
  `npm run db:seed` / `prisma migrate reset` is safe.
- **Out of scope:** no change to application/runtime behavior, no new endpoints; this is
  dev/demo data only. Real inventory/payment domain logic is not invoked — the seed writes
  consistent end-state rows directly.
