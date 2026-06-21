## Why

Checkout currently can create pending orders, but inventory is not reserved atomically. Without row-level locking and reservation release, concurrent buyers can oversell the same ticket type and pending orders can leave `reservedQuantity` stale after expiration.

## What Changes

- Add inventory reservation into checkout order creation so ticket type rows are locked before availability is checked.
- Enforce `soldQuantity + reservedQuantity + requestedQuantity <= totalQuantity` inside a PostgreSQL transaction.
- Validate ticket type sale windows before reserving inventory.
- Increment `reservedQuantity` for successfully reserved ticket types as part of the same transaction that creates the order and order items.
- Add release logic that decrements `reservedQuantity` when pending orders expire, fail, or are cancelled.
- Add confirmation logic for paid orders so reserved tickets move from `reservedQuantity` to `soldQuantity`.
- Add a BullMQ-backed worker in `apps/worker` that scans expired `PENDING_PAYMENT` orders, transitions them to `EXPIRED`, and releases the reserved inventory.
- Keep the ordering Clean Architecture boundaries by using ports/use cases/adapters rather than placing reservation rules in controllers.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `ticket-purchase`: Implements atomic inventory reservation, no-oversell behavior, sale-window validation, and expired reservation release.

## Impact

- **Affected backend module**: `packages/backend/src/ordering/`
- **Affected worker app**: `apps/worker/`
- **Affected platform services**: database transaction usage, BullMQ queue/processors, Redis-backed worker scheduling
- **Database behavior**: uses PostgreSQL row-level locks on `ticket_types`; updates `reservedQuantity` and `soldQuantity`
- **API behavior**: `POST /checkout/orders` rejects unavailable or out-of-window ticket types before creating an order
- **Dependency note**: implementation should be based on a branch that includes the archived `implement-order-lifecycle` code, including `OrderModule`, `CreateOrderUseCase`, order status transitions, and order domain events

## Deferred Scope

- `maxPerUser` / per-user ticket limit enforcement is intentionally deferred to a separate follow-up change, tentatively `implement-per-user-ticket-limit`. This inventory reservation change only prevents global oversell and manages reservation counters; it does not enforce the per-user cap.
