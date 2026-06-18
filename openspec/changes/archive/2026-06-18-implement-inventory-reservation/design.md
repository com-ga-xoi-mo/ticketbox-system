## Context

The existing ticket-purchase spec requires atomic inventory reservation, but the current checkout foundation only models orders and order state transitions. The Prisma schema already has `ticket_types.reserved_quantity`, `sold_quantity`, `total_quantity`, sale window fields, and order item records. The platform also has PostgreSQL, Redis, and BullMQ modules available for API and worker processes.

This change depends on the order lifecycle implementation being present in the implementation branch: `OrderModule`, `CreateOrderUseCase`, `TransitionOrderStatusUseCase`, order items, `reservationExpiresAt`, and `OrderPaid`/`OrderExpired`-style domain events. If the working branch does not contain that module, merge/rebase the order lifecycle branch before applying this change.

## Goals / Non-Goals

**Goals:**

- Reserve inventory during `POST /checkout/orders` inside a single PostgreSQL transaction.
- Use row-level locks on requested `ticket_types` rows before checking availability.
- Enforce `soldQuantity + reservedQuantity + requestedQuantity <= totalQuantity`.
- Validate ticket type status and sale window before reservation.
- Release reserved inventory when pending orders expire, fail, or are cancelled.
- Confirm reserved inventory when orders are paid by moving quantity from reserved to sold.
- Add a BullMQ worker path that expires stale `PENDING_PAYMENT` orders and releases inventory.
- Preserve Clean Architecture boundaries by adding domain ports/use cases and Prisma adapters under `packages/backend/src/ordering/`.

**Non-Goals:**

- Per-user ticket limit enforcement (`ticket_types.max_per_user`); that remains a separate `ticket-purchase` requirement/change, tentatively `implement-per-user-ticket-limit`.
- Payment gateway integration and callback verification.
- QR ticket issuance after payment.
- Public availability caching and cache invalidation.
- Admin-facing inventory adjustment endpoints.

## Follow-up Change

After this change is complete, implement `maxPerUser` enforcement in a separate change. That follow-up should count the user's existing paid orders plus active, unexpired reservations for each requested ticket type, then reject checkout when `existingQuantity + requestedQuantity > ticketType.maxPerUser`. It should also handle concurrent requests from the same user so they cannot bypass the limit.

## Decisions

### Decision 1: Make reservation part of order creation

Checkout correctness requires order creation and inventory reservation to commit or roll back together. `CreateOrderUseCase` should delegate to a reservation-aware repository/port that starts a Prisma transaction, locks all requested ticket type rows, validates price/window/availability, creates the order and order items, increments `reservedQuantity`, then commits.

Alternative considered: reserve inventory in a separate use case before order creation. Rejected because it introduces a failure window where inventory can be reserved without a corresponding order.

### Decision 2: Use PostgreSQL row-level locks through raw SQL in Prisma transaction

Prisma does not expose `SELECT ... FOR UPDATE` as a typed query builder operation. The Prisma adapter should use `$queryRaw` inside `prisma.$transaction` to lock requested `ticket_types` rows ordered by ID, then perform typed Prisma updates after validation.

Ordering locks by ticket type ID avoids deadlock-prone lock acquisition when a request contains multiple ticket types.

### Decision 3: Introduce inventory ports in the ordering boundary

Add ordering-domain ports such as `IInventoryReservationRepository` and `IExpiredOrderReservationRepository` rather than leaking Prisma transaction details into controllers or application services. The API use case depends on ports; Prisma adapters own SQL locking and counter updates.

This keeps the module consistent with the identity and ordering Clean Architecture pattern already used in the repo.

### Decision 4: Treat inventory counter side effects as idempotent transition handlers

Order status transitions can be retried or raced. Inventory updates triggered by `PAID`, `EXPIRED`, `FAILED`, or `CANCELLED` must be guarded by the order's previous status and run in the same transaction as the status transition where possible. A transition from `PENDING_PAYMENT` to `PAID` moves quantities from reserved to sold; expiration/failure/cancellation subtracts from reserved.

If the existing `TransitionOrderStatusUseCase` remains the single transition entrypoint, it should coordinate inventory update and status update through a transaction-aware adapter rather than publishing no-op events first and updating inventory later.

### Decision 5: Add BullMQ worker for expired reservations

The worker process should register an inventory/order-expiration queue using existing `QueueModule` conventions. A scheduled producer or processor should periodically find expired `PENDING_PAYMENT` orders in batches, transition them to `EXPIRED`, and release inventory.

The worker must be safe to run more than once: optimistic status checks prevent already-paid or already-expired orders from releasing inventory again.

### Decision 6: Keep reservation TTL sourced from platform config

`ORDER_RESERVATION_TTL_MINUTES` remains the source for `reservationExpiresAt`. This change uses that timestamp for worker expiration and does not introduce a second TTL setting.

## Risks / Trade-offs

- **[Risk] Deadlocks under high contention** -> Mitigation: lock ticket type rows in deterministic ID order and keep the transaction narrow.
- **[Risk] Counter drift if side effects run outside status transition** -> Mitigation: make inventory updates transactionally coupled to transition persistence and guard by expected status.
- **[Risk] Worker double-release** -> Mitigation: use optimistic status transition from `PENDING_PAYMENT` only and update counters in the same transaction.
- **[Risk] Branch missing order lifecycle code** -> Mitigation: apply this change only after merging/rebasing the archived `implement-order-lifecycle` implementation.
- **[Trade-off] Raw SQL for row locks** -> Accepted because PostgreSQL row-level locking is the correctness mechanism required by the blueprint.
