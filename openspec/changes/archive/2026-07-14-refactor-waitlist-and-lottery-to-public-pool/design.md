## Context

Today both the official waitlist and the presale lottery lean on one shared mechanism: a `PurchaseEntitlement` (source `WAITLIST` or `LOTTERY`) with a TTL, consumed inside the reservation transaction, plus a checkout gate that blocks a ticket type while it has active waitlist demand or an open lottery presale window. The waitlist's use of that mechanism makes it a hidden priority queue; the lottery's use pins each winner to a 15-minute personal countdown that is shorter than, and independent of, the presale window they actually own.

This refactor collapses both back toward a single principle — **tickets always stay in the public pool** — and deletes the entitlement machinery. The reservation transaction (no-oversell, ADR-3), rate limiting (ADR-7), resale, and the separate `virtual-waiting-room` change are untouched.

## Goals / Non-Goals

**Goals:**

- Waitlist is a pure watcher/notifier: notify subscribers when a sold-out ticket type returns to public availability; grant nothing, reserve nothing, block no one.
- Lottery winners buy during the entire presale window with no per-winner entitlement or personal TTL; their allotment is enforced by tracking purchased quantity.
- Remove the `PurchaseEntitlement` table and all TTL/consume/expiry/reminder machinery.
- Keep ordering decoupled from lottery via a port; keep the no-oversell transaction unchanged.

**Non-Goals:**

- No change to the reservation critical section, rate limiting, resale, or the virtual-waiting-room change.
- No priority for waitlist subscribers (that is the whole point of the change).
- No hard hold/reservation for lottery winners (guarantee comes from inventory sizing + presale exclusivity, not a hold).
- No new realtime channel for the waitlist (notification only; no live position).

## Decisions

### Decision 1: Waitlist notifies on the availability recovery edge, detected by a watcher + marker

Replace the release-driven grant with a periodic **availability watcher** (worker tick, mirroring the existing expiry scan cadence). For each ticket type that has active waitlist subscribers, it reads public availability = `totalQuantity - reservedQuantity - soldQuantity` and drives a per-ticket-type marker in a new table `waitlist_ticket_availability`:

```
   AVAILABLE ──(avail == 0)──▶ SOLD_OUT ──(avail > 0)──▶ NOTIFIED ──(avail == 0)──▶ SOLD_OUT ...
```

Only the `SOLD_OUT → (avail > 0)` edge fires notifications. `NOTIFIED` suppresses repeats while availability stays > 0; returning to 0 re-arms for the next episode. The marker is updated by the watcher only — never inside the reservation transaction.

Rationale: an edge-detecting watcher catches **every** inventory-increase path (reservation expiry, order cancel, admin adjustment) with one code path, and keeps the concern entirely out of the hot reservation transaction (the current release-publisher only reacts to expiry and would miss cancels). The marker gives idempotent "notify once per episode" semantics.

Alternatives considered: hook each inventory-increase site to publish a release. Rejected — misses paths (cancel does not publish today), couples ordering to waitlist, and reacts to releases that are not true 0→>0 transitions.

### Decision 2: Notify ALL active subscribers on the edge

On the recovery edge, notify **every** active subscriber for that ticket type (in-app + email), once per episode. There is no batching, cap, or ordering — the ticket is simply back in the public pool and everyone is told to go buy it.

Rationale: this is the user's explicit product choice and matches "báo tôi khi có vé". The resulting demand burst is absorbed by the layers that exist for exactly that: rate limiting and, when configured, the virtual waiting room. Nobody is promised a slot.

Trade-off: one recovered ticket can notify many people who then fail to buy. Mitigation is **wording, not mechanism** — notifications and UI must say "vé đã quay lại public sale, vào mua ngay — không giữ chỗ", never imply priority. (Captured as a hard requirement in the specs.)

### Decision 3: Lottery winners buy the whole presale window; no entitlement, no personal TTL

The draw stops issuing `PurchaseEntitlement`. It records each winner's outcome on `lottery_registrations`: `status = WON` and a `wonQuantity`, plus a `purchasedQuantity` (default 0). The presale gate window already lives on `ticket_types` (`presaleGateOpensAt = saleStartsAt`, `presaleGateClosesAt = publicSaleStartsAt`) and is unchanged. During that window only winners may buy; a winner may buy freely at any time in the window up to `wonQuantity − purchasedQuantity`.

Rationale: the guarantee never depended on the personal countdown — it depends on winner demand ≤ allocation ≤ available inventory and non-winners being excluded during the presale window. Dropping the per-winner TTL removes the false "reserved slot" pressure while preserving the guarantee, and lets a winner buy any time before public sale.

### Decision 4: Ordering stays decoupled via a repurposed presale-access port

The existing ordering reservation-guard port (today "validate & consume a waitlist/lottery entitlement") is repurposed to a **presale-access** check. Ordering depends only on the port interface; the lottery module implements it. Inside the reservation transaction, for a ticket type whose presale gate window is open, the port validates that the requesting user is a `WON` registrant with `purchasedQuantity + requested ≤ wonQuantity`, and atomically increments `purchasedQuantity` (marking `fulfilled` when the allotment is used up).

Rationale: keeping the port preserves the hexagonal boundary (ordering never imports lottery tables) while removing the generic entitlement table. Doing the increment inside the reservation transaction keeps the per-winner cap correct under concurrent orders — the same atomicity the old consume relied on.

Trade-off: the port now returns/loads lottery-specific facts; we accept a lottery-implemented adapter rather than a generic entitlement table. The waitlist no longer implements or needs this port at all.

### Decision 5: Remove the waitlist branch from the checkout gate

`findGatedTicketTypeIds` currently gates a ticket type when it has active waitlist entries/entitlements **or** an open presale window. Drop the waitlist branch entirely — the waitlist gates nothing, outsiders are never blocked by it. Keep only the presale-window branch for lottery. Remove the `waitlistEntitlementId` field from the checkout request and its plumbing.

Rationale: with the waitlist as notify-only, gating on waitlist demand directly contradicts "tickets stay in the public pool". Only the lottery legitimately restricts a ticket type, and only during its presale window.

### Decision 6: Delete the PurchaseEntitlement system

Drop the `purchase_entitlements` table, its `source`/`status` enums, the lottery `entitlement_ttl_minutes` config, the grant/expiry/reminder use-cases and worker jobs, and the notification "you have a 15-minute slot" content. Nothing references it after Decisions 1–5.

Rationale: once waitlist grants nothing and lottery tracks allotment on the registration, the entitlement table has no remaining owner; keeping it would be dead complexity.

## Risks / Trade-offs

- [Risk] Notify-all creates a demand spike that fails most recipients. → Mitigation: wording sets expectations ("không giữ chỗ"); rate limiting + virtual waiting room absorb the burst. Product-accepted.
- [Risk] Watcher lag means a ticket may be gone by the time a user clicks the notification. → Mitigation: acceptable for notify-only; keep the watcher tick reasonably short; wording says "vào nhanh".
- [Risk] Dropping `purchase_entitlements` breaks in-flight waitlist "granted" and lottery entitlement state. → Mitigation: migration drops the table and supersedes in-flight state; document that any active countdowns are void and lottery winners now use the whole presale window. Run in a maintenance window if needed.
- [Risk] Removing the waitlist gate could let a user who "expected" a slot lose the ticket. → Mitigation: this is the intended new behavior; UI/wording updated.
- [Risk] Lottery purchased-quantity cap must be atomic to avoid a winner exceeding `wonQuantity` via concurrent orders. → Mitigation: increment inside the reservation transaction under the same row lock, mirroring the old consume.
- [Risk] Marker table drift if the watcher misses a tick. → Mitigation: the watcher recomputes from live availability every tick; the marker is a hint, not a source of truth for inventory.

## Migration Plan

1. Add `waitlist_ticket_availability` (per ticket type: marker state, last-notified episode/timestamp). Add `wonQuantity` + `purchasedQuantity` + `fulfilledAt` (or reuse existing) on `lottery_registrations`; backfill `wonQuantity` from existing WON rows where possible, `purchasedQuantity = 0`.
2. Stop creating `PurchaseEntitlement` (waitlist grant + lottery draw). Switch the checkout guard to the presale-access port and drop the waitlist gate branch.
3. Drop the `purchase_entitlements` table, its enums, and the lottery TTL column/config after code no longer references them.
4. Remove the grant/expiry/reminder jobs; add the availability-watcher job.
5. Rollback: re-enable the entitlement path from source control; the new marker table is additive and inert if unused.

## Open Questions

- Watcher tick interval for the waitlist availability scan (reuse the 60s expiry cadence vs a dedicated shorter interval).
- Whether a waitlist subscriber is auto-removed after being notified for an episode, or stays subscribed for future episodes (default: stays subscribed; dedupe is per-episode at the ticket-type level).
- Exact home of purchased-quantity tracking on `lottery_registrations` (new columns vs a small purchases sub-record) — pick the simplest that supports the atomic cap.
- Whether to keep the ordering port name or rename it now (it is currently `Waitlist*`); prefer a neutral `PresaleAccess*` name since waitlist no longer uses it.
