## Context

`implement-inventory-reservation` added the checkout transaction that locks requested `ticket_types` rows, validates availability, creates the pending order, and increments `reservedQuantity`. The accepted `ticket-purchase` spec also requires `maxPerUser`, but that rule was intentionally deferred so it could be added on top of the reservation path.

The Prisma schema already has `ticket_types.max_per_user`, `orders.status`, `orders.reservation_expires_at`, and `order_items.quantity`. This change should not add a new table unless implementation proves one is necessary.

## Goals / Non-Goals

**Goals:**

- Enforce `ticket_types.max_per_user` during checkout.
- Count both `PAID` order items and active, unexpired `PENDING_PAYMENT` reservations for the same user and ticket type.
- Reject checkout before order creation and before `reservedQuantity` increment when the request would exceed the cap.
- Keep the check inside the existing PostgreSQL transaction and row-lock critical section.
- Protect concurrent same-user checkout requests from bypassing the limit.
- Preserve the existing idempotency behavior: duplicate `(userId, idempotencyKey)` checkout returns the existing order and does not re-evaluate as a new purchase.
- Keep Clean Architecture boundaries: domain error, use-case/port contract if needed, Prisma adapter owns SQL details, controller only maps errors.

**Non-Goals:**

- Admin UI for configuring `maxPerUser`; ticket type configuration is owned by concert/admin changes.
- Changing the meaning of `maxPerUser` for refunded orders beyond the current `PAID` order status semantics.
- Payment gateway integration, QR issuance, or ticket fulfillment.
- Per-concert aggregate limits across multiple ticket types; this change is per user per ticket type.

## Decisions

### Decision 1: Enforce the limit inside the reservation transaction

The existing `PrismaInventoryReservationRepository.reserve()` transaction is the correct place to enforce `maxPerUser`. The adapter already has the full `Order` aggregate, requested quantities grouped by ticket type, locked ticket type rows, and access to order/order item tables.

Alternative considered: enforce the limit in `CreateOrderUseCase` before reservation. Rejected because concurrent requests could both pass the pre-check before either order is inserted.

### Decision 2: Reuse `ticket_types` row locks as the concurrency guard

The reservation adapter locks all requested ticket type rows with `SELECT ... FOR UPDATE` in deterministic ID order. After that lock is acquired, the adapter should query the user's existing quantity for those ticket types and validate `existingQuantity + requestedQuantity <= maxPerUser`.

This is sufficient for same-user concurrency on the same ticket type because competing checkouts must serialize on the same `ticket_types` row. For multi-ticket checkout, deterministic row-lock ordering continues to avoid deadlock-prone acquisition.

Alternative considered: introduce a separate user-ticket-limit lock table keyed by `(userId, ticketTypeId)`. Rejected for now because it adds schema and cleanup complexity while the existing ticket type row lock already serializes the critical section for the same ticket type.

### Decision 3: Count only paid orders and active reservations

The quantity query should include order items where the owning order belongs to the same user and:

- `status = PAID`; or
- `status = PENDING_PAYMENT` and `reservationExpiresAt > now`.

It should exclude `EXPIRED`, `FAILED`, `CANCELLED`, `REFUNDED`, and stale pending orders whose expiration time has passed but the worker has not processed yet.

Alternative considered: count all `PENDING_PAYMENT` orders regardless of expiration. Rejected because stale holds would incorrectly block users after their reservation TTL has elapsed.

### Decision 4: Add a dedicated domain error for limit violations

Add an ordering error such as `PerUserTicketLimitExceededError` with ticket type ID, limit, existing quantity, and requested quantity. The HTTP controller should map it to `409 Conflict`, matching inventory capacity conflicts.

Alternative considered: reuse `InsufficientTicketInventoryError`. Rejected because global inventory shortage and per-user policy violation are different business failures and should be distinguishable in tests/logs.

## Risks / Trade-offs

- **[Risk] Query misses stale pending orders that should still count** -> Mitigation: define active reservation as `PENDING_PAYMENT` with `reservationExpiresAt > now`, matching reservation TTL behavior.
- **[Risk] Concurrent same-user requests bypass the limit** -> Mitigation: perform the user quantity query after acquiring deterministic `ticket_types FOR UPDATE` locks and before order creation.
- **[Risk] Counting refunded orders incorrectly** -> Mitigation: count only current `PAID` status for this change; revisit when refund behavior and ticket invalidation are implemented.
- **[Risk] Extra query work inside a hot transaction** -> Mitigation: query only requested ticket type IDs for the current user; rely on existing indexes and keep the transaction narrow.

## Migration Plan

No schema migration is expected because `ticket_types.max_per_user` already exists. Deployment is a backend behavior change only:

1. Add domain error and tests.
2. Extend the Prisma reservation adapter.
3. Update HTTP mapping.
4. Run ordering tests, build, and a manual smoke test using seeded ticket types with low `maxPerUser`.

Rollback is reverting this change's code; existing orders and inventory counters do not need data migration.

## Open Questions

- None for this change. If future refund semantics should still count against purchase limits, that should be handled in the QR/refund lifecycle changes.
