## Context

TicketBox already delivered `official-waitlist`, which introduced the reusable purchase-authorization primitives this change builds on:

- `purchase_entitlements`: a short-lived grant bound to `(userId, concertId, ticketTypeId, quantity, expiresAt)` with `source: 'WAITLIST' | 'LOTTERY'` — the `LOTTERY` source value was reserved for this change.
- A checkout guard (`WaitlistEntitlementReservationPort.validateAndConsumeForReservation`) that validates ownership/status/expiry/quantity and marks an entitlement consumed **inside** the existing no-oversell reservation transaction (`SELECT … FOR UPDATE` on `ticket_types`).
- An entitlement-expiry worker and near-expiry reminder email, plus in-app + Vietnamese email notification orchestration.
- A module/worker split pattern (`OfficialWaitlistModule` + `OfficialWaitlistWorkerModule`) so `@InjectQueue` resolves in the worker scope and the API app does not start worker jobs.

The presale lottery sits **before public sale**. Instead of re-offering released inventory in FIFO order (waitlist), it allocates a fixed number of ticket units to registrants chosen by a fair random draw, then hands winners the same kind of short-lived entitlement. It must not change the resale marketplace, the (future) virtual waiting room, or the reservation critical section.

## Goals / Non-Goals

**Goals:**

- Let organizers enable a lottery on a primary-sale ticket type: registration window (`registrationOpensAt` → `registrationClosesAt`), a `drawAt` time, and a lottery allocation (ticket units offered by the draw).
- Let an authenticated audience user register or withdraw for a lottery ticket type with a desired quantity capped by `max_per_user`.
- Run a **deterministic, seeded, auditable** draw at `drawAt`: recording the seed lets anyone re-run the selection and get identical winners.
- Grant winners a `LOTTERY`-sourced `PurchaseEntitlement` (default 15-minute TTL) reusing the existing entitlement table, expiry worker, and reminder.
- Gate checkout for lottery ticket types by time: during the presale window only a valid LOTTERY entitlement can check out; after the window the ticket type behaves as normal direct sale.
- Keep the reservation transaction the only mutator of `reserved_quantity` / `sold_quantity`.
- Notify winners and non-winners through existing in-app + email channels.

**Non-Goals:**

- No resale listing, resale P2P order, resale transfer, or resale alert changes.
- No virtual waiting room, admission queue/token, or SSE (that is the separate `add-virtual-waiting-room` change).
- No changes to the no-oversell reservation critical section beyond validating/consuming a LOTTERY entitlement, exactly as waitlist already does.
- No hard inventory hold at draw time (winning grants a purchase window, not a reserved seat).
- No automatic re-draw or waitlist fallback for unclaimed/expired winner slots in this change (called out as an open question).
- No refund-to-inventory for paid tickets.

## Decisions

### Decision 1: Lottery config lives on the ticket type, registrations and draws are separate records

Add three records:

- `lottery_configs`: one per lottery-enabled ticket type — `registrationOpensAt`, `registrationClosesAt`, `drawAt`, `allocation` (ticket units to grant), `status` (`SCHEDULED | DRAWING | COMPLETED | CANCELLED`), and the recorded `seed` after the draw runs.
- `lottery_registrations`: one active entry per `(userId, ticketTypeId)` — `desiredQuantity`, `status` (`REGISTERED | WON | NOT_SELECTED | WITHDRAWN`), timestamps.
- `lottery_draws`: an audit record of a draw execution — the `seed`, registrant snapshot/count, ordered winner list, allocation consumed, and `executedAt`.

Rationale: registration membership, draw execution, and the resulting purchase permission (`purchase_entitlements`) have distinct lifecycles, mirroring how waitlist separated entries from entitlements. Recording the draw separately makes the outcome auditable and re-runnable.

Alternatives considered: reuse `waitlist_entries` for registrations with a source flag. Rejected — waitlist entries are FIFO-ordered and gated by inventory demand, while lottery registrations are unordered and gated by a time window and a random draw; overloading one table would muddy both.

### Decision 2: Reuse `purchase_entitlements` with `source = LOTTERY` and the existing checkout guard

Winning a draw creates a `PurchaseEntitlement` with `source = LOTTERY`, `quantity = min(desiredQuantity, remaining max_per_user allowance, remaining allocation)`, and TTL from config (default 15 min). Checkout consumption reuses `WaitlistEntitlementReservationPort` — **verified source-agnostic**: `validateAndConsumeForReservation` looks up the entitlement by id and checks user/concert/ticketType/status/expiry/quantity without filtering on `source`, then marks it `CONSUMED` inside the reservation transaction. So LOTTERY entitlements consume through the existing path unchanged.

**Gap found — registration is not closed on consume:** the adapter only marks a `waitlistEntry` FULFILLED when the entitlement has a non-null `waitlistEntryId`. A LOTTERY entitlement has `waitlistEntryId = null`, so nothing closes the lottery registration. Decision: add a nullable `lotteryRegistrationId` column on `purchase_entitlements` (symmetric to `waitlistEntryId`), and extend the consume path to mark the linked `lottery_registrations` row fulfilled when present. This keeps a single consumption path and mirrors the existing waitlist wiring.

Rationale: the entitlement model was explicitly designed source-typed for this. No new consumption path, no second critical section.

Trade-off: the ordering port and the `waitlistEntitlementId` DTO/command field are named `Waitlist*`; they are effectively a generic purchase-entitlement guard reused for LOTTERY. We keep the names to avoid a churny rename across ordering; note as future cleanup in Open Questions.

### Decision 3: Time-based checkout gating via a presale-gate window on `ticket_types`

**Verified against code:** the existing gate predicate (`PrismaWaitlistEntitlementReservationAdapter.findGatedTicketTypeIds` and `hasActiveGate`) marks a ticket type gated by the **presence** of active waitlist entries or active `purchase_entitlements`. It has no notion of a time window. That breaks lottery in two ways:

1. During the presale window **before the draw**, there are zero entitlements and zero waitlist entries → the predicate returns "not gated" → anyone can checkout directly → lottery fairness is defeated.
2. **After** public sale opens, any still-active LOTTERY entitlement would keep the type gated for everyone under the current predicate, blocking direct sale.

Decision: store the presale gate as **timestamps on `ticket_types`** — `presaleGateOpensAt` / `presaleGateClosesAt` (nullable). The lottery module writes these when a lottery is configured: the gate **opens at the ticket type's `saleStartsAt`** (the start of the gated presale) and **closes at `publicSaleStartsAt`**. The checkout guard reads **only `ticket_types`** and treats a ticket type as lottery-gated when `presaleGateOpensAt <= now < presaleGateClosesAt`.

**Correction (gate covers the whole presale, not just from the draw).** An earlier version opened the gate at `drawAt`. That left a hole: if the ticket was buyable before `drawAt` (i.e. `saleStartsAt < drawAt`), then during `[saleStartsAt, drawAt)` the ticket was on sale but ungated, so **non-winners could buy directly** — and a manual "draw now" made it worse (winners already picked, but the gate still closed until `drawAt`). Fix: the gate covers the **entire presale** `[saleStartsAt, publicSaleStartsAt]`. Consequences:
- Before the draw: the gate is active but no entitlements exist yet → **nobody can buy** (correct — the draw has not happened).
- After the draw (scheduled at `drawAt` **or** early via `draw-now`): winners hold entitlements and buy; non-winners are **always** blocked throughout the presale.
- The **draw never touches the gate** — drawing only hands out entitlements. "Draw now" is therefore safe: it grants winner rights earlier without opening any sale to non-winners.

The combined gate predicate becomes: gated if **(active waitlist demand)** OR **(now within the presale gate window)**. To make direct sale resume cleanly after the window, the entitlement-presence branch of the existing predicate is scoped to `source = WAITLIST` (or the window explicitly overrides it) so leftover LOTTERY entitlements do not keep a type gated past `presaleGateClosesAt`. A valid `WAITLIST` or `LOTTERY` entitlement satisfies the gate while it is active.

Rationale: keeping the gate window on `ticket_types` lets the reservation-transaction guard stay time-aware **without** importing lottery tables — avoiding an `ordering → presale-lottery` module coupling. Fairness holds during presale specifically; after public sale the lottery no longer restricts buying.

Alternatives considered:
- Have the guard JOIN `lottery_configs` for the window. Rejected — creates ordering/waitlist → lottery coupling for a hot-path critical section.
- A boolean `isLotteryGated` flag flipped by a worker at window boundaries. Rejected — relies on a timely flip job; timestamps are self-evaluating and robust to worker lag.
- Gate purely by presence of active LOTTERY entitlements (like waitlist). Rejected — cannot block non-winners before any entitlement exists, and cannot lift the gate after the window while entitlements remain.

### Decision 3b: Lottery config lifecycle — reconfigure allowed after cancel, locked after completion

`lottery_configs.ticketTypeId` is UNIQUE (one config row per ticket type), and `ConfigureLottery`/`UpdateTtl` only proceed while the config is `SCHEDULED`. That left a dead end: once a config became `CANCELLED`, the row blocked any new config **and** the guard refused to update it, so an organizer who cancelled (or mis-clicked) could **never** run a lottery on that ticket type again.

Decision: treat `CANCELLED` as "no active lottery" — allow (re)configuring a ticket type whose existing config is `CANCELLED`, resetting the row back to `SCHEDULED` (clearing `seed`/`drawnAt` and re-writing the gate window). Keep `DRAWING`/`COMPLETED` locked, since a drawn lottery must not be reconfigured (it would invalidate granted entitlements and the audit record).

Rationale: cancelling should be recoverable; a completed draw must be immutable. Implementation: the `ConfigureLottery` guard rejects only when the existing status is `DRAWING` or `COMPLETED` (not `CANCELLED`).

### Decision 4: Deterministic seeded fair draw

At `drawAt`, a worker job:

1. Locks the `lottery_config` (per-ticket-type lock) and transitions it `SCHEDULED → DRAWING`.
2. Loads all `REGISTERED` registrations for the ticket type as an ordered snapshot (by `registrationId`).
3. Derives a seed (recorded on the config/draw) and produces a deterministic pseudo-random permutation of registrants (e.g., seeded PRNG / hashing `seed + registrationId` then sorting). The same seed + registrant set always yields the same order.
4. Walks the permutation granting winners until `allocation` ticket units are exhausted, respecting each registrant's `min(desiredQuantity, max_per_user allowance)`; marks the rest `NOT_SELECTED`.
5. Grants a LOTTERY `PurchaseEntitlement` per winner and enqueues notifications; transitions the config `DRAWING → COMPLETED` and writes the `lottery_draws` audit row.

Rationale: recording the seed makes the draw auditable and re-runnable — a third party can verify winners from `(seed, registrant snapshot, allocation)`. Per-ticket-type locking prevents a double-draw from overlapping worker runs; the config status guard makes the draw idempotent.

Alternatives considered: non-deterministic `random()` selection. Rejected — not auditable, can't be reproduced if challenged.

### Decision 5: Draw does not reserve inventory

Granting winner entitlements does **not** touch `reserved_quantity` / `sold_quantity`; `allocation` is an accounting cap on how many entitlements to grant, not an inventory hold. Inventory is mutated only when a winner completes checkout through the existing reservation transaction.

Rationale: preserves the no-oversell critical section and keeps expiry/payment recovery on the existing ordering path — identical to the waitlist decision. Trade-off: `allocation` should be `≤` real available primary inventory at draw time; the checkout transaction remains the final oversell guard.

### Decision 6: Module/worker split mirrors official-waitlist

- `PresaleLotteryModule`: HTTP routes (audience register/withdraw/status, organizer config/draw-status), use cases, repository adapter, notification orchestration.
- `PresaleLotteryWorkerModule`: the scheduled draw processor **and its own LOTTERY entitlement-expiry/reminder processor**, registering its own Bull queue in the same scope as the processor. `BackendWorkerModule` imports it; the API app does not start the draw processor.

**Separate expiry worker (not shared with waitlist).** The existing `expireEntitlements` is source-agnostic and would already flip LOTTERY entitlements to `EXPIRED`, but `ExpireWaitlistEntitlementsUseCase` then re-triggers `GrantWaitlistEntitlementsUseCase` for that ticket type — waitlist-specific behavior that shouldn't run off a lottery expiry. Decision: lottery owns a dedicated expiry/reminder processor scoped to `source = LOTTERY`, so the two capabilities don't cross-trigger each other's grant logic.

Rationale: same reason `@InjectQueue` failed for waitlist when the queue lived in a different scope — keep the queue provider co-located with its processor, keep worker-only jobs out of the API app, and keep waitlist vs lottery expiry semantics independent.

### Decision 7: Reuse notification infrastructure for win/lose

Winner notification reuses the waitlist grant notification shape (in-app + Vietnamese email, action URL by event slug, BullMQ-safe job IDs, retry/backoff), plus a distinct "not selected" notification for non-winners. Email is asynchronous and must never roll back a completed draw.

Rationale: consistent audience UX and delivery reliability with the code already shipped; only the copy/template differs.

### Decision 8: Manual draw, registration list, and per-lottery TTL are organizer operations

Add three organizer/admin operations on the existing lottery boundary:

- `run draw now`: a POST action for a scheduled lottery that calls the same `RunLotteryDrawUseCase` used by the worker. It uses the same config lock, status transition, seed derivation/recording, audit write, entitlement grants, and notifications. It is idempotent for already-completed draws.
- `view registrations`: a GET endpoint returning lottery registrations for one ticket type with user display/email, desired quantity, registration status, registered timestamp, winner/non-winner timestamps, fulfillment timestamp, and active/consumed/expired entitlement summary if any.
- `edit TTL`: include `entitlementTtlMinutes` in lottery configuration. Updating TTL is allowed while the config is still `SCHEDULED` and before any draw has started; after `DRAWING` or `COMPLETED`, TTL is read-only for auditability and existing entitlements keep their already-written `expiresAt`.

Rationale: these are operational controls, not audience behavior. They belong to organizer/admin authorization, but the current implementation can expose temporary audience-web test controls that call these endpoints for local/demo testing until the dedicated organizer admin UI is handed to the partner.

Security and scope:

- Keep `JwtAuthGuard + RolesGuard` with `ORGANIZER | ADMIN` on all three endpoints.
- Do not create a separate draw algorithm for manual draw; manual and scheduled draw must share one use case.
- Do not let TTL updates mutate already-granted entitlements; entitlement expiry remains a concrete timestamp.
- Do not involve resale or waiting-room behavior.

### Organizer Admin UI Handoff Notes

Partner-owned organizer/admin UI should add these controls later:

- On the event/ticket-type lottery setup panel: numeric input `Thoi han mua sau khi trung (phut)` mapped to `entitlementTtlMinutes`, default 15, min 1.
- On the lottery status panel: button `Quay so ngay` enabled only for `SCHEDULED` lotteries after registration has closed or for admin override; confirmation copy should say this will notify winners/non-winners and cannot be undone.
- On the lottery status panel: button/link `Xem danh sach dang ky` opening a table with columns `Nguoi dung`, `Email`, `So luong dang ky`, `Trang thai`, `Dang ky luc`, `Ket qua`, `Entitlement`, `Het han`, `Don hang`.
- After manual draw completes: refresh config status, registration list, and audience lottery status; show granted/not-selected counts.
- For completed lotteries: show TTL as read-only and hide/disable manual draw.
- For testing in this change only: audience event detail may render a compact dev/operator panel when the logged-in account has organizer/admin role or when an existing dev flag is enabled.

## Risks / Trade-offs

- [Risk] Manual draw races with the scheduled worker and double-grants winners. Mitigation: manual draw and scheduled draw call the same use case, same lock, and same config status guard.
- [Risk] TTL edited after winners are granted creates inconsistent expiry expectations. Mitigation: TTL is editable only before draw starts; already-granted entitlements keep their persisted `expiresAt`.
- [Risk] Draw runs twice from overlapping worker runs → double grants. → Mitigation: per-ticket-type lock + config status guard (`SCHEDULED → DRAWING → COMPLETED`); grants are idempotent per registration.
- [Risk] Allocation exceeds real available inventory → more winners than sellable tickets. → Mitigation: validate `allocation ≤ available primary inventory` at config/draw time; the checkout reservation transaction is still the final oversell guard.
- [Risk] Winners expect a guaranteed ticket. → Mitigation: UI copy says winning grants a time-boxed purchase window; final seat depends on completing checkout before TTL.
- [Risk] Unclaimed/expired winner slots leave inventory idle during presale. → Mitigation: entitlement expiry frees the accounting cap; a re-draw / waitlist fallback is deferred (Open Questions).
- [Risk] Time-based gating misconfigured (window never closes) blocks direct sale. → Mitigation: gating derives from explicit config timestamps and public-sale start; add validation that `drawAt < publicSaleStart` and window bounds are coherent.
- [Risk] Non-deterministic draw would be unauditable. → Mitigation: seeded deterministic permutation with the seed recorded in `lottery_draws`.
- [Risk] Worker draw job fails at boot if its Bull queue is registered in a different Nest scope. → Mitigation: register the lottery queue in the same worker module that provides the processor (per Decision 6).

## Migration Plan

1. Add `lottery_configs`, `lottery_registrations`, `lottery_draws` tables with status enums and indexes for `(ticketTypeId, status)` registration lookup and draw selection; reuse `purchase_entitlements` (already migrated) for `source = LOTTERY`.
   - **Hand-augmented index (do not "regenerate away"):** the migration adds a partial unique index `lottery_registrations_one_active_per_user_ticket_type_idx ON (user_id, ticket_type_id) WHERE status = 'REGISTERED'`. Prisma's schema cannot express partial unique indexes, so `prisma migrate dev` will NOT emit it — it must be re-appended by hand after any canonical regeneration (exactly as the existing `waitlist_entries_one_active_per_user_...` index does). It enforces the "one active registration per user" rule the domain relies on. The rest of the migration is byte-equivalent to Prisma's canonical output (verified via `prisma migrate diff`).
2. Backfill nothing; existing concerts/ticket types are unaffected until a lottery config is created.
3. Enable organizer lottery config endpoints, audience registration endpoints, and time-based checkout gating behind the presence of a lottery config.
4. Schedule the draw worker job at `drawAt`; wire entitlement expiry/reminder reuse.
5. Rollback by disabling lottery routes and the draw worker and treating no ticket type as lottery-gated; existing lottery records remain inert and entitlements expire naturally.

## Resolved Decisions (from explore review)

- **Time-gate location:** presale gate window (`presaleGateOpensAt`/`presaleGateClosesAt`) stored on `ticket_types`; guard reads only `ticket_types` to avoid ordering → lottery coupling. (Decision 3)
- **Registration fulfillment:** add nullable `lotteryRegistrationId` on `purchase_entitlements`; consume path closes the registration. (Decision 2)
- **Expiry worker:** lottery owns a dedicated `source = LOTTERY` expiry/reminder processor rather than reusing the waitlist one. (Decision 6)
- **Entitlement TTL:** default 15 min, overridable per lottery config.
- **Manual draw:** supported as an organizer/admin action, implemented through the same draw use case as the scheduled worker.
- **Registration inspection:** organizer/admin can list registrations for a ticket type and see entitlement outcome state for operational review.

## Open Questions

- Should expired/unclaimed winner slots trigger a re-draw or fall back to the official waitlist? Deferred out of this change; the audit record makes a later re-draw feasible.
- Should the ordering entitlement port and the `waitlistEntitlementId` DTO field be renamed to a source-neutral name? Prefer reuse-as-is now to keep the change small; note the rename as future cleanup.
- Whether the temporary audience-web operator panel should be guarded by organizer/admin role only or additionally by a dev flag. Prefer role-only if the existing auth state exposes roles; otherwise add a local dev flag and keep backend authorization as the real guard.
