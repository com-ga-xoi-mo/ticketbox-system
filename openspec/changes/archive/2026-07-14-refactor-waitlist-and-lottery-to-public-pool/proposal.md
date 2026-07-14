## Why

The official waitlist currently grants a 15-minute `PurchaseEntitlement` when primary inventory is released, which quietly turns "báo tôi khi có vé" into a *priority purchase queue* — it holds a private buying slot and blocks outsiders. That is the wrong promise for a waitlist and it drags a whole entitlement/TTL/consume machinery through checkout. The presale lottery similarly hands each winner a per-winner entitlement with a personal 15-minute countdown, which feels like a reserved slot and pressures winners even while the presale window is still open.

We want a simpler, honest model: **tickets always stay in the public pool.** The waitlist should only *notify* when a ticket type comes back on sale; the lottery should let winners *buy first* during the presale window without a personal slot; and the shared entitlement system should go away.

## What Changes

- **Official waitlist → notify-only.** The waitlist no longer grants a `PurchaseEntitlement`, reserves nothing, and gives no priority. A periodic **availability watcher** (worker) detects when a sold-out ticket type's public availability transitions from 0 to > 0 and notifies subscribers.
- **Transition-based, not release-based.** Notifications fire on the sold-out→available edge (using a per-ticket-type marker), not on every reservation release — so cancels/expiries/admin adjustments are all caught without touching the reservation transaction.
- **Notify ALL active subscribers** on the recovery edge, **once per sold-out episode** (no repeat while availability stays > 0; re-arm when it returns to 0).
- **Wording change.** In-app + email + audience UI say the ticket returned to public sale ("vào mua ngay, không giữ chỗ"); never imply a private slot or priority. Remove the near-expiry reminder.
- **Presale lottery → whole-window winner access.** Winners may buy freely from draw completion until `publicSaleStartsAt` (the presale gate window already lives on `ticket_types`), with **no per-winner entitlement and no personal TTL**. The guarantee holds because winner demand ≤ allocation ≤ available and non-winners are blocked during the presale window. Each winner's purchased quantity is tracked on `lottery_registrations` and capped at their won quantity.
- **Checkout guard simplification.** Remove the waitlist branch from the gate entirely; the waitlist gates nothing. Keep the lottery presale gate window on `ticket_types`. The ordering side keeps a decoupling **port** (the existing reservation-guard port, now a presale-access check) implemented by the lottery module to verify "is this user a WON registrant with remaining won quantity" and mark purchased quantity atomically inside the reservation transaction.
- **Remove the `PurchaseEntitlement` system** (table, source/status enums, TTL config, consume, expiry/reminder jobs). Add a small `waitlist_ticket_availability` marker table. Add purchased-quantity/fulfilled tracking to `lottery_registrations`.
- **BREAKING (internal):** the `waitlistEntitlementId` field on the checkout request and the entitlement-based guard semantics are removed/repurposed; audience UI stops showing "giữ slot 15 phút".
- Keep the no-oversell reservation transaction unchanged, resale untouched, and the separate `virtual-waiting-room` change untouched. Notify-all traffic bursts are absorbed by rate limiting and (when present) the virtual waiting room.

## Capabilities

### Modified Capabilities

- `official-waitlist`: Redefined as a pure watcher/notifier — join only when sold-out; notify all subscribers on the availability recovery edge; no entitlement, no reservation, no priority.
- `presale-lottery`: Winners buy across the whole presale window with no per-winner entitlement/TTL; purchased quantity tracked and capped on the registration.
- `ticket-purchase`: Checkout no longer requires or consumes a waitlist entitlement; during a lottery presale window it requires the buyer to be a lottery winner with remaining won quantity; tickets otherwise stay in the public pool.
- `audience-checkout`: Waitlist and lottery UI/wording reflect notify-only and whole-window winner access; no 15-minute slot countdown for either.

## Impact

- Backend `official-waitlist`: remove grant/expiry/reminder use-cases and the release-driven trigger; add an availability-watcher worker + marker repository; keep join/leave/status and notification, with new content.
- Backend `presale-lottery`: draw stops creating entitlements and records winner allotment on the registration; add purchased-quantity tracking; keep the presale gate window write.
- Backend `ordering`: repurpose the reservation-guard port from "consume waitlist/lottery entitlement" to "validate + record lottery winner purchase"; remove the waitlist gating branch; delete `waitlistEntitlementId` plumbing from checkout; stop publishing "every release" for waitlist.
- Database: **drop** `purchase_entitlements` (+ its enums and the lottery TTL column); **add** `waitlist_ticket_availability`; **add** purchased/fulfilled columns on `lottery_registrations`.
- Frontend `audience-web`: waitlist controls become notify-only ("Báo tôi khi có vé" / "Vé đã quay lại — vào mua ngay"); lottery winner state shows "được mua trong đợt presale" without a personal countdown; drop entitlement-id from checkout requests.
- Tests: waitlist edge-detection (0→>0 once per episode, re-arm), notify-all fan-out, lottery whole-window winner purchase + quantity cap, checkout guard (no waitlist gate, lottery winner check, public pool for outsiders after public sale), and no no-oversell regression.
- Data migration: existing `purchase_entitlements` rows are dropped; in-flight waitlist "granted" states and lottery entitlements are superseded by the new model (documented in the migration plan).
