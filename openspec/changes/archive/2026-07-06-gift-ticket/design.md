## Context

The platform already manages ticket ownership via `Ticket.userId` and has precedent for time-bound status transitions through the resale subsystem (`ResaleListing`, `ResaleOrder` with expiry jobs). The `TicketStatus` enum currently includes `TRANSFERRED` (used when resale completes) but has no mechanism for gifting — a lightweight, zero-cost ownership transfer initiated by the ticket holder.

Current ticket statuses: `ISSUED`, `CHECKED_IN`, `VOIDED`, `REFUNDED`, `LISTED_FOR_RESALE`, `TRANSFERRED`.

The gifting feature is additive: a new `TicketTransfer` table, a new status value, two API controller methods, one new worker job, and UI additions to the existing ticket wallet.

## Goals / Non-Goals

**Goals:**

- Allow a ticket holder to gift any `ISSUED` ticket to a recipient identified by email or phone.
- Create a 48-hour time-boxed acceptance window; after expiry the ticket reverts to `ISSUED`.
- Atomically transfer `Ticket.userId` to the recipient on acceptance.
- Notify recipient via email (gift invitation) and sender via email (acceptance or decline outcome).
- Expire pending transfers via a BullMQ worker job, consistent with the existing expiry pattern.
- Surface transfer state in the ticket wallet (`TRANSFER_PENDING` status badge, cancel action for sender, accept/decline action for recipient).

**Non-Goals:**

- Partial transfers (a ticket is an atomic unit).
- Gifting tickets that are `CHECKED_IN`, `VOIDED`, `REFUNDED`, `LISTED_FOR_RESALE`, or already `TRANSFERRED`.
- Monetized or conditional transfers (this is a free gift, not a resale).
- SMS notification in the initial implementation (email only).
- Mobile app (checkin-mobile) changes — gift management is web-only for this iteration.

## Decisions

### D1: New `TicketTransfer` table instead of extending existing resale tables

**Decision:** Introduce a dedicated `TicketTransfer` Prisma model rather than reusing `ResaleListing`/`ResaleOrder`.

**Rationale:** Resale involves escrow, trust scoring, and financial settlement — none of which apply to gifting. Mixing concerns would pollute both domains. A standalone table keeps the gift lifecycle (5 states: `PENDING → ACCEPTED | DECLINED | CANCELLED | EXPIRED`) self-contained and queryable without joining resale logic.

**Alternatives considered:** Extending `ResaleOrder` with a `isFree` flag — rejected because it would require conditional logic throughout the resale service and break the resale trust/fee calculation pipeline.

### D2: Secure, opaque transfer token (UUID v4) stored as hash

**Decision:** Generate a UUID v4 transfer token, store its SHA-256 hash in the database (same pattern as `Ticket.qrTokenHash`), and embed the plaintext token in the recipient email link.

**Rationale:** Prevents token enumeration from the database. Consistent with existing QR token security pattern. The accept/decline endpoints receive the plaintext token, hash it, and look up the transfer.

**Alternatives considered:** Signed JWT — adds complexity with no meaningful security benefit since the token is single-use and short-lived.

### D3: `TRANSFER_PENDING` as a new `TicketStatus` enum value

**Decision:** Add `TRANSFER_PENDING` to the `TicketStatus` enum on the `Ticket` model while a transfer is `PENDING`.

**Rationale:** The wallet UI already branches on ticket status for badges and allowed actions. Adding `TRANSFER_PENDING` lets the existing display logic naturally suppress actions like "resell" or "show QR" while a gift is in flight. On expiry/decline/cancel, the status reverts to `ISSUED`.

**Alternatives considered:** Leaving status as `ISSUED` and computing transfer state from a join — rejected because it requires every status-sensitive query to join `TicketTransfer`, adding N+1 risk and coupling the ticket read path to transfer state.

### D4: Recipient identified by email; account auto-provisioned on acceptance

**Decision:** The sender provides a recipient email. If the email matches an existing user, the transfer binds to their `userId`. If not, the recipient accepts via the email link, and a stub account is created at that point.

**Rationale:** Matches the audience-registration flow (email is the primary identity anchor). Deferring account creation to the acceptance step avoids polluting the user table with ghosts from unaccepted gifts.

**Alternatives considered:** Require recipient to already have an account — rejected as too limiting for the birthday/gift use case where the recipient may be new to the platform.

### D5: Expiry enforced by a new BullMQ delayed job, consistent with existing expiry pattern

**Decision:** On transfer initiation, enqueue a `ticket_transfer.expire` delayed job (48h) into the existing BullMQ infrastructure. The job atomically sets the transfer to `EXPIRED` and reverts `Ticket.status` to `ISSUED`.

**Rationale:** The `order.expiration`, `resale-listing-expiry`, and `resale.order.reserved.expiry` jobs use this same pattern. Reusing BullMQ keeps the infrastructure footprint minimal and the pattern consistent for the team.

## Risks / Trade-offs

- **[Risk] Job loss on Redis flush** → Mitigation: A scheduled sweep job (`ticket_transfer.sweep`) runs every hour to find `PENDING` transfers past their `expiresAt` and expire them, providing a safety net independent of BullMQ job durability.
- **[Risk] Recipient account creation on acceptance introduces a new auth touchpoint** → Mitigation: Auto-provisioned accounts are passwordless initially; the user is prompted to set a password/Google link on first login, consistent with `audience-google-sign-in` flow.
- **[Risk] Token phishing** → Mitigation: Email links are HTTPS only, token is single-use (immediately invalidated on first use), and the accept page shows sender identity and ticket details before confirming.
- **[Risk] Concurrent accept + cancel race condition** → Mitigation: Use a DB-level optimistic lock (check `status = 'PENDING'` in the `WHERE` clause of the status update, wrapped in a transaction with the `Ticket.userId` update).

## Migration Plan

1. Add `TRANSFER_PENDING` to the `TicketStatus` enum in `schema.prisma`.
2. Create the `TicketTransfer` model in `schema.prisma` with a foreign key to `Ticket`.
3. Run `npm run db:migrate` to apply the migration.
4. Deploy API changes (new endpoints, updated wallet responses).
5. Deploy Worker changes (new `ticket_transfer.expire` job processor).
6. Deploy Frontend changes (new wallet UI).
7. No data backfill needed — feature is forward-only.

**Rollback:** Feature flag the new endpoints. Removing `TRANSFER_PENDING` from the enum requires a migration; if rollback is needed before any tickets reach `TRANSFER_PENDING` status, the enum change can be reverted cleanly.

## Resolved Questions

### RQ1: Block gifting within N hours of event — **block if event is within 24 hours**

Gate staff need a stable ownership record before doors open. If `Ticket.userId` changes close to event time, the QR token (which is tied to the ticket record) is invalidated and reissued to a new owner — creating a window where both parties could attempt entry. 24 hours provides a clean cutoff consistent with common industry practice (Ticketmaster and StubHub both block transfers inside 24h) and aligns with the concession that check-in staff begin manifest reconciliation the day before.

**Enforced at:** `InitiateTransferUseCase` — reject with `TRANSFER_WINDOW_CLOSED` if `concert.eventDate - now < 24h`.

### RQ2: Re-gifting a declined/expired ticket — **allowed, unlimited**

Once a transfer is `DECLINED`, `CANCELLED`, or `EXPIRED`, the ticket reverts atomically to `ISSUED` with no trace in the ticket's active state. From the domain's perspective the ticket is clean. Blocking re-gift adds friction with no business justification — the sender may legitimately want to gift to a different person immediately after a decline. No fraud vector exists because each new transfer goes through the full token flow. No additional implementation work required; the existing `InitiateTransferUseCase` eligibility check (`status = ISSUED`, no existing `PENDING` transfer) already handles this correctly.

### RQ3: Phone-based recipient identification — **email only; defer phone to a future iteration**

The platform's identity layer uses email as the sole primary anchor (`auth-registration`, `audience-google-sign-in`). Adding phone-based lookup requires: an SMS gateway integration (cost + ops overhead), a new OTP verification sub-flow, and a `phone → userId` lookup index — none of which exist in the current codebase. This is non-trivial scope. Email covers the primary use case (birthday gifts, friend referrals) with zero new infrastructure. Phone support can be added as a follow-on once the platform has phone auth.
