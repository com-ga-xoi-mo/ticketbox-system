## 1. Preflight & Baseline

- [x] 1.1 Verify the implementation branch contains the archived `implement-order-lifecycle` code (`packages/backend/src/ordering/`, `OrderModule`, order use cases, order domain events); merge/rebase that branch first if missing
- [x] 1.2 Run baseline verification for the current branch: `npm run build` and the existing ordering tests before changing inventory behavior
- [x] 1.3 Inspect `prisma/schema.prisma` and confirm `TicketType` has `totalQuantity`, `reservedQuantity`, `soldQuantity`, `saleStartsAt`, `saleEndsAt`, and `status`

## 2. Domain & Application Contracts

- [x] 2.1 Add ordering domain errors for inventory reservation failures: unavailable quantity, ticket type sale not active, inactive ticket type, and reservation conflict
- [x] 2.2 Add inventory reservation domain/port contracts under `packages/backend/src/ordering/domain/ports/` for atomic order creation with reservation
- [x] 2.3 Add inventory adjustment port contracts for confirming paid orders and releasing expired/failed/cancelled reservations
- [x] 2.4 Update `CreateOrderUseCase` so checkout uses the reservation-aware port and no longer creates orders independently from inventory reservation
- [x] 2.5 Update `TransitionOrderStatusUseCase` or its persistence path so `PAID`, `EXPIRED`, `FAILED`, and `CANCELLED` inventory counter changes happen idempotently with status transition
- [x] 2.6 Add use-case tests covering successful reservation, unavailable quantity rejection, inactive/out-of-window ticket type rejection, idempotent duplicate checkout, paid confirmation, and release on expired/failed/cancelled transitions

## 3. Prisma Reservation Adapter

- [x] 3.1 Implement a Prisma adapter that wraps checkout reservation in `prisma.$transaction`
- [x] 3.2 Inside the transaction, lock requested `ticket_types` rows with `SELECT ... FOR UPDATE` in deterministic ticket type ID order
- [x] 3.3 Validate each locked ticket type belongs to the requested concert, is active, is inside its sale window, and has enough remaining capacity
- [x] 3.4 Create the order and nested order items inside the same transaction after validation succeeds
- [x] 3.5 Increment `reservedQuantity` for each requested ticket type inside the same transaction
- [x] 3.6 Ensure duplicate `(userId, idempotencyKey)` checkout returns the existing order without incrementing `reservedQuantity` again
- [x] 3.7 Add repository tests for no-oversell behavior, transaction rollback on validation failure, row-lock query usage, and idempotency no-double-reserve behavior

## 4. Inventory Transition Persistence

- [x] 4.1 Implement transactional inventory release for `PENDING_PAYMENT -> EXPIRED`, `FAILED`, and `CANCELLED`
- [x] 4.2 Implement transactional inventory confirmation for `PENDING_PAYMENT -> PAID` by decrementing `reservedQuantity` and incrementing `soldQuantity`
- [x] 4.3 Guard transition inventory updates with expected order status so repeated or concurrent transitions cannot double-release or double-sell
- [x] 4.4 Add tests for concurrent transition conflict and repeated worker scan safety

## 5. Worker & Queue Integration

- [x] 5.1 Add an ordering/inventory queue constant and register the queue through the existing BullMQ `QueueModule` conventions
- [x] 5.2 Add an expired-reservation worker processor in the worker runtime that scans stale `PENDING_PAYMENT` orders in batches
- [x] 5.3 Implement batch expiration so each stale order transitions to `EXPIRED` and releases reserved inventory exactly once
- [x] 5.4 Add tests for worker batch behavior: skips paid/cancelled orders, expires only overdue pending orders, and releases quantities once
- [x] 5.5 Wire the worker provider into `BackendWorkerModule` or an ordering worker module imported by it

## 6. Module Wiring & API Error Mapping

- [x] 6.1 Bind the new inventory reservation and adjustment ports in `OrderModule` using Symbol-based DI tokens
- [x] 6.2 Update `OrderController` error mapping so unavailable, inactive, and out-of-window ticket types return appropriate HTTP 400/409 errors
- [x] 6.3 Export relevant inventory port types and errors from `packages/backend/src/index.ts`
- [x] 6.4 Confirm `POST /checkout/orders` response shape remains compatible with the order lifecycle Postman collection

## 7. Verification

- [x] 7.1 Run targeted ordering unit/integration tests
- [x] 7.2 Run worker-related tests
- [x] 7.3 Run `npm run build`
- [x] 7.4 Manually smoke test: create order reserves quantity, duplicate idempotency key does not reserve again, unavailable request is rejected, forced expiration releases quantity
- [x] 7.5 Review `openspec/specs/ticket-purchase/spec.md` delta coverage before archive
