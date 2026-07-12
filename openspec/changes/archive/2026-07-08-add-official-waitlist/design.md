## Context

TicketBox already protects scarce primary-sale inventory through the `ticket-purchase` transaction: checkout locks `ticket_types`, validates availability and per-user limits, then creates a pending direct-purchase order and increments `reserved_quantity`. Expired pending orders later release that inventory.

The official waitlist sits before checkout. It gives sold-out users a fair place in line and grants short-lived purchase entitlements when primary-sale inventory becomes available again. It must not reuse or change the resale marketplace, because resale is a separate P2P transfer flow for already-sold tickets.

## Goals / Non-Goals

**Goals:**

- Let an authenticated audience user join or leave the official waitlist for a concert ticket type.
- Grant waitlist users short-lived purchase entitlements in FIFO order when primary-sale inventory is released.
- Require a valid entitlement for checkout when a ticket type has active waitlist demand.
- Keep the existing inventory reservation transaction as the only place that mutates `reserved_quantity` and `sold_quantity`.
- Notify a user when they receive a waitlist entitlement through in-app and email channels.
- Keep the design reusable for later presale lottery entitlement work without implementing lottery now.

**Non-Goals:**

- No changes to resale listing, resale P2P order, resale transfer, seller payout, or resale marketplace UI.
- No resale alerts.
- No presale lottery, random draw, or public seed generation.
- No virtual waiting room, admission queue, SSE queue position, or admission token.
- No refund-to-inventory feature for paid tickets.
- No hard inventory hold at entitlement-grant time.

## Decisions

### Decision 1: Model waitlist and entitlement separately

Add two primary records:

- `waitlist_entries`: one active entry per `(userId, concertId, ticketTypeId)`, ordered by `joinedAt`.
- `purchase_entitlements`: a short-lived grant bound to one user, concert, ticket type, and maximum quantity.

Rationale:

- Waitlist membership and purchase permission have different lifecycles.
- The entitlement model can later be reused by presale lottery without redefining checkout authorization.
- A user can leave the waitlist without affecting past consumed or expired entitlements.

Alternatives considered:

- Store only a waitlist entry and mark it as "granted". This is simpler but makes TTL, consumption, and future lottery reuse harder.
- Reserve inventory when granting the waitlist slot. This would duplicate the existing order reservation semantics and complicate expiry/payment recovery.

### Decision 2: Entitlement is a checkout gate, not an inventory reservation

Granting an entitlement SHALL NOT change `ticket_types.reserved_quantity` or `sold_quantity`. Inventory is mutated only when the entitled user calls `POST /checkout/orders` and the existing reservation transaction succeeds.

Rationale:

- This preserves the current no-oversell critical section.
- Entitlement expiry is lightweight: mark the entitlement expired and grant the next user.
- Payment failure and order expiry continue to use the existing ordering behavior.

Trade-off:

- The grant worker must only grant entitlements up to currently available primary-sale inventory and must serialize grants per ticket type. Otherwise multiple entitled users could be invited for less inventory than expected, although the checkout transaction would still prevent oversell.

### Decision 3: FIFO grant with per-ticket-type serialization

When primary-sale inventory is released, the ordering expiration flow emits a release signal containing the affected primary-sale `ticketTypeId` values and released quantities. A waitlist worker processes each affected ticket type under a per-ticket-type lock. It calculates available primary inventory as `totalQuantity - soldQuantity - reservedQuantity`, subtracts active unconsumed entitlement quantities, then grants the next waiting entries in `joinedAt` order.

Rationale:

- FIFO is easy to explain in the demo and fairer than fastest-click retry.
- Using release signals from the completed expiration transition avoids broad inventory scans and avoids treating unrelated remaining stock as newly released waitlist capacity.
- Locking grant work per ticket type prevents duplicate grants from overlapping worker runs.
- Keeping active entitlement quantity in the grant calculation avoids over-inviting users.

Alternatives considered:

- Random waitlist selection. That belongs to the later lottery change, not this official waitlist.
- Rate-limit-only retry. Existing platform protection already handles rate limiting, but it does not create a fair post-sold-out flow.

### Decision 4: Checkout guard consumes entitlement in the order transaction

For waitlist-gated ticket types, `POST /checkout/orders` must validate that the authenticated user owns an active, unexpired entitlement for each gated ticket type and that requested quantity does not exceed the entitlement quantity. The entitlement is marked consumed in the same database transaction that creates the pending direct-purchase order and reserves inventory.

Rationale:

- The entitlement cannot be reused after order creation.
- If checkout fails before inventory reservation, the entitlement can remain active.
- If the order later expires, inventory release will trigger the next waitlist grant instead of reviving the consumed entitlement.

Implementation constraint:

- Entitlement consumption MUST NOT happen in the HTTP controller or in a pre-transaction application-service check. The reservation transaction must lock the entitlement row, validate ownership/status/expiry/quantity, create the order, increment `reserved_quantity`, and mark the entitlement consumed atomically.

### Decision 5: Waitlist is primary-sale only

The waitlist worker listens only to primary-sale release events, initially expired direct-purchase reservations. It does not listen to `ResaleListing` state changes and does not create or modify resale orders.

Rationale:

- Current resale is an internal P2P marketplace where sold tickets move between users; it does not return capacity to `ticket_types`.
- Mixing resale listings into official waitlist would make the user promise ambiguous and would enlarge the change.

### Decision 6: Notification uses existing notification infrastructure

When an entitlement is granted, the waitlist module creates an in-app notification with an action URL to the event or checkout page. It also enqueues an email notification through the existing notification delivery infrastructure. The email includes the concert name, ticket type, entitlement quantity, expiry time, and action URL.

Rationale:

- The notification spec already supports in-app metadata and action URLs.
- The backend already has notification delivery processors and email channel adapters, so waitlist should reuse those channels instead of sending SMTP directly.
- A waitlist grant has a short TTL; email reduces the chance that an audience user misses a 15-minute purchase window when they are not actively watching the event page.

Implementation constraint:

- Email sending MUST be asynchronous. A failed email delivery MUST NOT roll back an already-granted entitlement or block the next waitlist grant job.
- The in-app notification remains the canonical persisted notification. Email is an additional delivery channel and should be retryable through the existing notification delivery path.
- In-app and email action URLs MUST use the audience event slug, not the internal concert UUID, because the audience route resolves `/events/:slug`.
- Waitlist email delivery jobs MUST use BullMQ-safe custom job IDs without colon characters and SHOULD mirror the purchase-confirmation email job options for retry attempts and fixed backoff.
- Waitlist email subject and body SHOULD be written in Vietnamese with proper diacritics, because this is audience-facing product copy and the SMTP/Gmail path supports UTF-8 content.

### Decision 7: Integration uses ports to avoid module cycles

Ordering and waitlist must not import each other as full Nest modules. The integration points are small ports/adapters:

- Ordering expiration publishes primary-sale release signals for waitlist grant work.
- The inventory reservation path calls a waitlist entitlement adapter/repository inside the existing Prisma transaction.
- Waitlist owns waitlist entry, entitlement lifecycle, grant worker, and notification orchestration.

Rationale:

- The order reservation path remains the boundary for no-oversell behavior.
- Waitlist can evolve without making resale or ordering depend on its HTTP/API layer.
- The application should compile without `forwardRef`-style circular module wiring for this feature.

### Decision 8: Worker-only processors live in worker module scope

The official waitlist HTTP/use-case module and the official waitlist worker module are separate Nest module scopes:

- `OfficialWaitlistModule` owns HTTP routes, use cases, repository adapters, notification orchestration, and the release publisher used by ordering expiration.
- `OfficialWaitlistWorkerModule` owns `OfficialWaitlistProcessor` and registers `OFFICIAL_WAITLIST_QUEUE` in the same module scope as that processor.
- `BackendWorkerModule` imports `OfficialWaitlistWorkerModule` instead of declaring `OfficialWaitlistProcessor` directly.

Rationale:

- `@InjectQueue(OFFICIAL_WAITLIST_QUEUE)` resolves only when the Bull queue provider is visible in the module that creates the processor.
- Keeping processors out of `BackendCoreModule` prevents the API app from starting worker-only repeatable jobs.
- This mirrors the existing split between runtime API modules and worker modules such as ordering expiration.

### Decision 9: Waitlist reminder email is time-based and idempotent

The waitlist worker sends one near-expiry reminder email for active waitlist entitlements that are approaching expiry, for example when less than five minutes remain. The reminder is only sent while the entitlement is still `ACTIVE`; consumed, revoked, or expired entitlements are ignored.

Rationale:

- A grant email at creation time can still be missed. A single near-expiry reminder improves UX without turning the waitlist worker into a high-volume campaign system.
- The entitlement table is the source of truth for whether a user still has a valid purchase window.
- Reminder delivery must be idempotent so worker retries do not spam the user.

Implementation constraint:

- Add minimal tracking for reminder delivery, either in notification metadata keyed by entitlement id and reminder type or a dedicated field if the existing notification model cannot query that safely.
- Reminder enqueueing MUST NOT extend the entitlement TTL and MUST NOT reserve inventory.

## Risks / Trade-offs

- [Risk] Entitlement grant and checkout can race under concurrent workers. -> Mitigation: serialize grant jobs by ticket type and consume entitlement in the same transaction as order creation.
- [Risk] Users may expect a granted entitlement to be a guaranteed ticket. -> Mitigation: UI copy must say the entitlement grants a short purchase window, while final reservation still depends on checkout completion before TTL.
- [Risk] Expired entitlements can leave inventory unavailable to general buyers while waitlist exists. -> Mitigation: entitlement expiry worker promptly grants the next user or clears the gate when the waitlist is empty.
- [Risk] Adding waitlist mode may block normal checkout unexpectedly. -> Mitigation: only ticket types with active waitlist entries or active entitlements are waitlist-gated; direct checkout remains unchanged otherwise.
- [Risk] Future lottery could duplicate entitlement concepts. -> Mitigation: keep entitlement source typed, for example `WAITLIST` now and `LOTTERY` later.
- [Risk] Waitlist worker can fail at boot if its Bull queue provider is registered in a different Nest module scope. -> Mitigation: register `OFFICIAL_WAITLIST_QUEUE` in the same worker module that provides `OfficialWaitlistProcessor`.
- [Risk] Email delivery failure could make a user miss a short purchase window. -> Mitigation: persist the in-app notification/status as source of truth, enqueue email asynchronously, retry through existing delivery workers, and add a near-expiry reminder.
- [Risk] Notification records can be created while delivery jobs are rejected by BullMQ because of invalid custom job IDs. -> Mitigation: use delivery job IDs based on the notification ID or another colon-free stable key, and cover queue enqueueing with a regression test.
- [Risk] ASCII-only email copy looks unfinished in the Vietnamese audience flow. -> Mitigation: keep waitlist email templates UTF-8 and cover grant/reminder subject and body copy with regression tests.

## Migration Plan

1. Add waitlist and entitlement tables with status enums and indexes for `(ticketTypeId, status, joinedAt)` and active entitlement lookup.
2. Backfill nothing; existing orders and ticket types remain unchanged.
3. Enable waitlist endpoints and checkout guard after migration.
4. Wire expired reservation release to enqueue waitlist grant work.
5. Rollback by disabling waitlist routes/worker and ignoring entitlement checks; existing waitlist records can remain inert.

## Open Questions

- Entitlement TTL is configurable per environment with 15 minutes as the default.
- A user joins with a desired quantity, capped by the ticket type's remaining per-user allowance. Grant quantity is the minimum of desired quantity, released/available primary inventory, and remaining per-user allowance at grant time.
