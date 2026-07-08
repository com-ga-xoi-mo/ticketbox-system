## Why

High-demand concerts can sell out while many legitimate audience users are still retrying checkout. TicketBox needs an official waitlist for primary-sale tickets so released inventory from expired reservations can be re-offered fairly without changing the existing no-oversell reservation transaction.

This change deliberately excludes the existing resale marketplace. Resale remains a separate P2P transfer flow and is not treated as a source of primary-sale inventory.

## What Changes

- Add an official waitlist for audience users by concert and ticket type.
- Add short-lived purchase entitlements that let the next eligible waitlist user attempt checkout within a bounded window.
- Add worker behavior that grants entitlements when primary-sale inventory is released, starting with expired direct-purchase reservations.
- Add checkout enforcement so waitlist-gated ticket types require a valid entitlement before `POST /checkout/orders` mutates inventory.
- Add audience-facing waitlist status and join/leave behavior in the checkout/event-detail flow.
- Send an in-app notification when a waitlist user receives a purchase entitlement.
- Send email when a waitlist user receives a purchase entitlement, and send a near-expiry reminder while the entitlement is still active.
- Fix waitlist grant notification delivery so in-app links resolve by event slug and email delivery jobs use BullMQ-safe IDs with the same retry/backoff behavior as purchase-confirmation emails.
- Localize waitlist entitlement email subject/body in Vietnamese with proper diacritics.
- Keep resale marketplace behavior unchanged and out of scope.
- Do not modify the PostgreSQL inventory reservation critical section beyond validating entitlement before reservation.

## Capabilities

### New Capabilities

- `official-waitlist`: Primary-sale waitlist entries, entitlement grants, entitlement expiry, notification trigger, and audience waitlist status behavior.

### Modified Capabilities

- `ticket-purchase`: Checkout for waitlist-gated ticket types requires a valid purchase entitlement before creating a pending direct-purchase order.
- `audience-checkout`: Audience web shows waitlist join/status states and submits a granted entitlement when attempting checkout from the waitlist.

## Impact

- Backend modules: new official waitlist bounded context or submodule, ordering checkout guard integration, expired-reservation worker integration, notification producer/email integration.
- Database: new waitlist entry and purchase entitlement tables/enums; indexes for queue ordering and entitlement lookup.
- APIs: audience waitlist join/leave/status endpoints; checkout request/guard accepts an entitlement token or ID for gated ticket types.
- Worker: entitlement grant job after primary-sale inventory release, entitlement expiry handling, and near-expiry reminder enqueueing.
- Frontend: event detail/checkout UI states for sold-out waitlist, joined status, granted entitlement countdown, and entitlement-backed checkout.
- Tests: unit and integration coverage for FIFO grant behavior, entitlement TTL, checkout guard, no resale involvement, and no inventory invariant regression.
- Remediation: regression coverage for waitlist in-app action URL slug resolution and waitlist email delivery queue enqueueing.
- Remediation: regression coverage for Vietnamese diacritics in waitlist grant and near-expiry email content.
