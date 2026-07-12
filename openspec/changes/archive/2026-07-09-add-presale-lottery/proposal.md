## Why

For very high-demand concerts, opening a first-come-first-served public sale rewards fastest-click and bots, not fairness. TicketBox needs an official **presale lottery**: audience users register interest during a registration window before public sale, a fair auditable draw selects winners, and winners receive a short-lived purchase entitlement to buy within a bounded slot. This reuses the entitlement + checkout-guard model already delivered by `official-waitlist` (which reserved `source = LOTTERY` for exactly this) without touching the no-oversell reservation transaction.

## What Changes

- Add a presale lottery for primary-sale ticket types: organizers configure a registration window, a draw time, and a lottery allocation (how many ticket units are drawn).
- Extend lottery configuration with a per-lottery entitlement TTL so each presale batch can choose its own winner purchase window instead of relying only on the global default.
- Let an authenticated AUDIENCE user register (or withdraw) interest for a lottery-enabled ticket type with a desired quantity, capped by `max_per_user`.
- Add a **fair, seeded, auditable draw**: at draw time a worker selects winners deterministically from a recorded seed so a given seed + registrant set always yields the same result (re-runnable, verifiable).
- Add an organizer/admin manual "run draw now" action for local demos and operational override; it runs the same deterministic draw use case, not a second draw path.
- Add an organizer/admin registration list endpoint so operators can inspect who registered, requested quantities, statuses, and granted entitlement state before or after the draw.
- Grant winners a short-lived `PurchaseEntitlement` with `source = LOTTERY` (default 15-minute slot), **reusing** the existing `purchase_entitlements` table, expiry worker, and near-expiry reminder from `official-waitlist`.
- Gate checkout for lottery ticket types **by time**: during the presale window a lottery ticket type requires a valid LOTTERY entitlement; when public sale opens the ticket type reverts to normal direct checkout.
- Guard `POST /checkout/orders` to require and atomically consume a valid LOTTERY entitlement for lottery-gated ticket types, reusing the existing entitlement reservation port and reservation transaction.
- Notify winners (in-app + email, Vietnamese) with an entitlement countdown/action URL, and notify non-winners that they were not selected — reusing notification infrastructure.
- Expose audience registration status (registered / not selected / won-with-active-entitlement), organizer lottery configuration + draw status, organizer registration listing, and manual draw trigger.
- Add temporary audience-web test controls for this change so the current team can configure TTL, inspect registrations, and trigger a draw from the audience event page before the dedicated organizer admin UI is built.
- Keep the resale marketplace, the virtual waiting room, and the PostgreSQL no-oversell reservation critical section unchanged and out of scope.

## Capabilities

### New Capabilities

- `presale-lottery`: Lottery configuration per ticket type (registration window, draw time, allocation), audience registration entries, a seeded fair draw that selects winners, LOTTERY-sourced purchase entitlement grants, and win/lose notifications.

### Modified Capabilities

- `ticket-purchase`: Checkout for a lottery-gated ticket type (a lottery ticket type inside its presale window) requires a valid active LOTTERY purchase entitlement before creating a direct-purchase order, consumed atomically in the existing reservation transaction. Extends the existing entitlement guard to be source-agnostic and to recognize time-based lottery gating in addition to waitlist-demand gating.
- `audience-checkout`: Audience web shows lottery registration, registration/draw status, winner entitlement countdown, and entitlement-backed checkout during the presale window.

## Impact

- Backend modules: new `presale-lottery` bounded context (HTTP use-cases + repository) and a worker submodule for the scheduled draw and entitlement expiry, mirroring the `official-waitlist` module/worker split. Ordering checkout guard extended to accept LOTTERY entitlements and time-based gating.
- Database: new `lottery_configs` (or per-ticket-type lottery settings), `lottery_registrations`, and `lottery_draws` (recording seed + outcome for audit); reuse `purchase_entitlements` with `source = LOTTERY`. Indexes for registration lookup and draw selection.
- APIs: audience lottery register/withdraw/status endpoints; organizer lottery configuration/draw-status/list-registrations/manual-draw endpoints; checkout guard recognizes lottery-gated ticket types.
- Worker: scheduled draw job at `drawAt` that runs the seeded selection and grants winner entitlements; reuse of the existing entitlement expiry + near-expiry reminder jobs.
- Frontend: event-detail/checkout UI states for registration window open, registered, draw pending, won (entitlement countdown → checkout), and not selected.
- Tests: unit/integration coverage for deterministic seeded draw, allocation limits vs `max_per_user`, entitlement grant reuse, time-based checkout gating, no resale/waiting-room involvement, and no no-oversell regression.
