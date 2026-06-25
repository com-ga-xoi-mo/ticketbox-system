## 1. Schema Update

- [x] 1.1 Add `idempotencyKey` field to `Order` model in `prisma/schema.prisma` — nullable `VarChar(80)`, mapped to `idempotency_key`, with `@@unique([userId, idempotencyKey])`
- [x] 1.2 Run `npx prisma migrate dev --name add_order_idempotency_key` to generate and apply the migration

## 2. Domain Layer

- [x] 2.1 Create `packages/backend/src/ordering/domain/order-status.enum.ts` — domain-level `OrderStatus` enum (decoupled from Prisma) with values: PENDING_PAYMENT, PAID, EXPIRED, FAILED, CANCELLED, REFUNDED
- [x] 2.2 Create `packages/backend/src/ordering/domain/order-events.ts` — domain event types: `OrderPaid`, `OrderExpired`, `OrderFailed`, `OrderCancelled`, `OrderRefunded`, each carrying `orderId` and relevant metadata
- [x] 2.3 Create `packages/backend/src/ordering/domain/errors.ts` — domain errors: `InvalidOrderTransitionError`, `OrderNotFoundError`, `OrderAccessDeniedError`, `OrderConflictError`
- [x] 2.4 Create `packages/backend/src/ordering/domain/order-item.entity.ts` — `OrderItem` value object with fields: id, ticketTypeId, quantity, unitPriceVnd, totalPriceVnd
- [x] 2.5 Create `packages/backend/src/ordering/domain/order.entity.ts` — `Order` entity with: state machine transition map, `transition(newStatus)` method that validates allowed moves, sets corresponding timestamps (paidAt, expiredAt, cancelledAt), and records domain events on the entity instance. Include `domainEvents` array and `clearEvents()` method.
- [x] 2.6 Create `packages/backend/src/ordering/domain/ports/order-repository.port.ts` — `IOrderRepository` interface with `ORDER_REPOSITORY` Symbol DI token. Methods: `create()`, `findById()`, `findByUserId()`, `findByUserIdAndIdempotencyKey()`, `updateStatus()`
- [x] 2.7 Create `packages/backend/src/ordering/domain/ports/order-event-publisher.port.ts` — `IOrderEventPublisher` interface with `ORDER_EVENT_PUBLISHER` Symbol DI token. Method: `publishAll(events: OrderDomainEvent[])`. This is the extension point for downstream side effects.

## 3. Application Layer (Use Cases)

- [x] 3.1 Create `packages/backend/src/ordering/application/use-cases/create-order.use-case.ts` — accepts userId, concertId, idempotencyKey, items[{ticketTypeId, quantity, unitPriceVnd}]; checks for existing order by (userId, idempotencyKey) and returns it if found (idempotent); generates order number (ORD-YYYYMMDD-RANDOM6); calculates totals; sets reservationExpiresAt = now + configured TTL; persists via repository; returns created order
- [x] 3.2 Create `packages/backend/src/ordering/application/use-cases/create-order.use-case.spec.ts` — unit tests: successful creation, order number format, total calculation, idempotent duplicate returns existing order, reservationExpiresAt is set correctly
- [x] 3.3 Create `packages/backend/src/ordering/application/use-cases/get-order.use-case.ts` — fetches order by ID; validates that requesting user is the order owner; throws OrderNotFoundError if not found or not owned
- [x] 3.4 Create `packages/backend/src/ordering/application/use-cases/get-order.use-case.spec.ts` — unit tests: owner can view, non-owner gets OrderNotFoundError, not-found case
- [x] 3.5 Create `packages/backend/src/ordering/application/use-cases/list-user-orders.use-case.ts` — lists all orders for the authenticated user via repository
- [x] 3.6 Create `packages/backend/src/ordering/application/use-cases/list-user-orders.use-case.spec.ts` — unit tests: returns user's orders, empty list case
- [x] 3.7 Create `packages/backend/src/ordering/application/use-cases/transition-order-status.use-case.ts` — loads order, validates owner, calls `order.transition(newStatus)`, persists updated status via repository (optimistic locking on current status), publishes domain events via IOrderEventPublisher, clears events from entity
- [x] 3.8 Create `packages/backend/src/ordering/application/use-cases/transition-order-status.use-case.spec.ts` — unit tests: valid transitions (PENDING→PAID, PENDING→EXPIRED, PENDING→FAILED, PENDING→CANCELLED, PAID→REFUNDED), invalid transition rejection, non-owner rejection, domain events are published on successful transition, optimistic lock conflict throws OrderConflictError

## 4. Infrastructure Layer (Prisma Repository)

- [x] 4.1 Create `packages/backend/src/ordering/infrastructure/database/prisma-order.repository.ts` — implements `IOrderRepository` using PrismaService; maps Prisma models to domain entities; `findByUserIdAndIdempotencyKey()` for idempotent creation; uses optimistic locking (where clause on current status) for `updateStatus()`
- [x] 4.2 Create `packages/backend/src/ordering/infrastructure/database/prisma-order.repository.spec.ts` — integration tests for CRUD operations, idempotency lookup, and optimistic locking behavior
- [x] 4.3 Create `packages/backend/src/ordering/infrastructure/events/noop-order-event-publisher.ts` — no-op implementation of `IOrderEventPublisher` (logs events but takes no action). Downstream changes will replace this with a real implementation.

## 5. Adapter Layer (HTTP / REST)

- [x] 5.1 Create `packages/backend/src/ordering/adapters/http/dto/create-order.dto.ts` — request DTO with class-validator decorations: concertId (UUID), idempotencyKey (string, required), items[{ticketTypeId (UUID), quantity (int, min 1)}]
- [x] 5.2 Create `packages/backend/src/ordering/adapters/http/dto/transition-order-status.dto.ts` — request DTO: status (enum validation against allowed target statuses)
- [x] 5.3 Create HTTP adapters aligned to the blueprint API surface: public endpoints `POST /checkout/orders`, `GET /me/orders`, `GET /me/orders/:id` protected by JWT/roles, plus internal `PATCH /orders/:id/status` reserved for payment callback or worker flows.
- [x] 5.4 Create `packages/backend/src/ordering/adapters/http/order.controller.spec.ts` — controller unit tests covering all endpoints

## 6. Module Wiring & Integration

- [x] 6.1 Create `packages/backend/src/ordering/order.module.ts` — NestJS module importing DatabaseModule, AuthModule; providing use cases via useFactory with Symbol-based injection; binding ORDER_REPOSITORY to PrismaOrderRepository; binding ORDER_EVENT_PUBLISHER to NoopOrderEventPublisher
- [x] 6.2 Update `packages/backend/src/index.ts` — re-export OrderModule, domain events, and relevant types from the ordering module
- [x] 6.3 Update `apps/api/src/app.module.ts` — import OrderModule

## 7. Verification

- [x] 7.1 Run `npx prisma generate` and verify TypeScript compilation (`npm run build`)
- [x] 7.2 Run unit tests (`npm test`) and ensure all pass
- [x] 7.3 Manual smoke test: start API server, create an order via `POST /checkout/orders` with idempotency key, verify duplicate returns same order, retrieve via `GET /me/orders/:id`, list via `GET /me/orders`, transition status via `PATCH /orders/:id/status`
