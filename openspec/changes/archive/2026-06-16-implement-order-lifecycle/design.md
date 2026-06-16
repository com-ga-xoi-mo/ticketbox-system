## Context

The TicketBox system is a NestJS 11 monorepo with a Clean Architecture pattern established in the `identity` bounded context (`packages/backend/src/identity/`). The pattern follows: **domain** (entities, ports, errors) → **application** (use-cases) → **infrastructure** (Prisma repositories) → **adapters** (HTTP controllers, DTOs, guards).

The Prisma schema already defines `Order`, `OrderItem`, and the `OrderStatus` enum with six states: `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `FAILED`, `CANCELLED`, `REFUNDED`. No application code exists yet for order management. Downstream features (inventory reservation, QR ticket issuance, payment processing) all depend on a working order lifecycle.

The `identity` module's wiring style — Symbol-based DI tokens, `useFactory` providers, clean port/adapter separation — serves as the authoritative pattern for new modules.

The blueprint (`blueprint/design.md`) specifies:
- API paths: `POST /checkout/orders` (with idempotency key), `GET /me/orders`, `GET /me/tickets/{id}` (Decision 4, API Surface section).
- Idempotency: orders table has `unique(user_id, idempotency_key)` to prevent duplicate checkout submissions (Decision 4, L149).
- Reservation TTL: orders expire after a configured TTL; a worker releases `reserved_quantity` (Decision 3, L126).
- Side effects on state change: PAID → issue tickets + enqueue notifications + invalidate cache (Critical Business Flows, L388-L408).

## Goals / Non-Goals

**Goals:**

- Implement a complete order state machine with validated transitions as a domain entity.
- Create use cases for creating orders (with idempotency key) and transitioning between all valid states.
- Support `reservationExpiresAt` calculation from a configurable TTL at creation time.
- Provide domain event hooks on the `Order` entity so downstream changes can attach side effects (ticket issuance, reservation release, notification enqueueing) without modifying the core transition logic.
- Expose REST endpoints following the blueprint's API surface: `POST /checkout/orders`, `GET /me/orders`, `GET /me/orders/:id`, `PATCH /orders/:id/status`.
- Follow the identical Clean Architecture structure and DI patterns established by the `identity` module.
- Provide unit tests for domain state transitions, idempotent creation, and use-case logic.

**Non-Goals:**

- Inventory reservation logic — `SELECT FOR UPDATE`, `reserved_quantity` increment (handled by `implement-inventory-reservation`).
- QR ticket issuance on payment (handled by `implement-qr-ticket-issuance`).
- Payment gateway integration (handled by `implement-payment-simulator`).
- Per-user ticket limit enforcement (handled by `implement-per-user-ticket-limit`).
- Worker job for expiring orders and releasing reservations (handled by `implement-inventory-reservation`).
- Notification enqueueing on paid order (handled by notification change).
- Cache invalidation on state change (handled by concert-management / caching change).
- Admin-facing order management endpoints.

## Decisions

### Decision 1: Module location — `packages/backend/src/ordering/`

Create a new `ordering` bounded context at `packages/backend/src/ordering/` mirroring the `identity` module structure:

```
packages/backend/src/ordering/
├── domain/
│   ├── order.entity.ts          # Order entity with state machine + domain events
│   ├── order-item.entity.ts     # OrderItem value object
│   ├── order-status.enum.ts     # Domain-level OrderStatus enum (decoupled from Prisma)
│   ├── order-events.ts          # Domain event types (OrderPaid, OrderExpired, etc.)
│   ├── errors.ts                # Domain errors (InvalidOrderTransition, OrderNotFound, etc.)
│   └── ports/
│       ├── order-repository.port.ts   # IOrderRepository interface + DI token
│       └── order-event-publisher.port.ts  # IOrderEventPublisher port for side effects
├── application/
│   └── use-cases/
│       ├── create-order.use-case.ts
│       ├── create-order.use-case.spec.ts
│       ├── get-order.use-case.ts
│       ├── get-order.use-case.spec.ts
│       ├── list-user-orders.use-case.ts
│       ├── list-user-orders.use-case.spec.ts
│       ├── transition-order-status.use-case.ts
│       └── transition-order-status.use-case.spec.ts
├── infrastructure/
│   └── database/
│       ├── prisma-order.repository.ts
│       └── prisma-order.repository.spec.ts
├── adapters/
│   └── http/
│       ├── order.controller.ts
│       ├── order.controller.spec.ts
│       └── dto/
│           ├── create-order.dto.ts
│           └── transition-order-status.dto.ts
└── order.module.ts
```

**Rationale**: Keeps bounded contexts isolated. The `ordering` context owns Order aggregate logic; other contexts interact through well-defined ports or NestJS module exports.

### Decision 2: Domain state machine with explicit transition map and domain events

The `Order` entity will contain a static transition map defining all allowed state changes:

```
PENDING_PAYMENT → PAID, EXPIRED, FAILED, CANCELLED
PAID            → REFUNDED
EXPIRED         → (terminal)
FAILED          → (terminal)
CANCELLED       → (terminal)
REFUNDED        → (terminal)
```

A `transition(newStatus)` method:
1. Validates the transition and throws `InvalidOrderTransitionError` for illegal moves.
2. Sets the corresponding timestamp (`paidAt`, `expiredAt`, `cancelledAt`).
3. Records a domain event (`OrderPaid`, `OrderExpired`, `OrderFailed`, `OrderCancelled`, `OrderRefunded`) on the entity.

Domain events are collected on the entity instance and published after successful persistence. This enables downstream changes to react to state transitions (e.g., `implement-inventory-reservation` listens for `OrderExpired` to release `reserved_quantity`, `implement-qr-ticket-issuance` listens for `OrderPaid` to generate tickets).

**Alternative considered**: Using a separate state-machine library (e.g., `xstate`). Rejected because the transitions are simple enough to express as a plain map, and adding a dependency is unjustified complexity.

### Decision 3: Idempotent order creation

Following the blueprint (Decision 4, L149, L413), `CreateOrderUseCase` accepts an `idempotencyKey` from the client. Before creating a new order, the use case checks whether an order already exists for the same `(userId, idempotencyKey)`. If found, it returns the existing order instead of creating a duplicate.

The Prisma schema does not currently have an `idempotencyKey` column on the `orders` table. **This change will add the field** via a Prisma schema update and migration:

```prisma
model Order {
  // ... existing fields
  idempotencyKey  String?  @map("idempotency_key") @db.VarChar(80)

  @@unique([userId, idempotencyKey])
}
```

**Rationale**: The blueprint explicitly specifies `unique(user_id, idempotency_key)` on the orders table. Duplicate submission is a real concern when 80,000 users are submitting simultaneously during sale opening.

### Decision 4: Reservation TTL configuration

`CreateOrderUseCase` sets `reservationExpiresAt = now() + RESERVATION_TTL`. The TTL value comes from `PlatformConfigService` (or a module-level config). Default: **15 minutes**.

This field is already in the Prisma schema (`reservationExpiresAt DateTime?`). The actual expiration worker that marks expired orders is out of scope (handled by `implement-inventory-reservation`), but this change ensures the timestamp is correctly set at creation time.

### Decision 5: Single `TransitionOrderStatusUseCase` with event publishing

Use a single `TransitionOrderStatusUseCase` that:
1. Loads the order and validates ownership.
2. Calls `order.transition(newStatus)` (domain validation + event recording).
3. Persists the updated status via repository (with optimistic locking on current status).
4. Publishes collected domain events via `IOrderEventPublisher`.

**Rationale**: The transition logic is uniform — validate current→target, update timestamps, emit event. Separate use cases (`MarkAsPaidUseCase`, `ExpireOrderUseCase`, etc.) would duplicate this pattern. The domain events provide the extension point for downstream side effects.

For this change, a **no-op `IOrderEventPublisher`** will be provided. Downstream changes will replace it with a real implementation (e.g., BullMQ job enqueueing).

**Alternative considered**: Separate use case per transition. While more explicit, it creates 5+ nearly identical classes. The single use case remains testable because the domain entity owns the transition rules.

### Decision 6: REST API design (aligned with blueprint)

| Endpoint                        | Method | Auth      | Purpose                                  |
|---------------------------------|--------|-----------|------------------------------------------|
| `POST /checkout/orders`         | POST   | AUDIENCE  | Create order with idempotency key        |
| `GET /me/orders`                | GET    | AUDIENCE  | List current user's orders               |
| `GET /me/orders/:id`            | GET    | AUDIENCE  | Get order detail (owner only)            |
| `PATCH /orders/:id/status`      | PATCH  | Internal  | Transition order status (payment callback) |

User-facing order endpoints require JWT authentication and are scoped to the owning user via the JWT `sub` claim. The `PATCH /orders/:id/status` endpoint is intentionally separated from that surface and is reserved for internal payment/worker flows.

**Note on path alignment**: The blueprint defines `POST /checkout/orders` (not `POST /orders`) and `GET /me/orders` (not `GET /orders`) to maintain semantic clarity: checkout is a distinct action from order CRUD, and `/me/` scopes data to the authenticated user.

### Decision 7: DI wiring following identity module pattern

Use Symbol-based injection tokens (`ORDER_REPOSITORY = Symbol('IOrderRepository')`, `ORDER_EVENT_PUBLISHER = Symbol('IOrderEventPublisher')`) and `useFactory` providers in the module, exactly as done in `auth.module.ts`. The `OrderModule` imports `DatabaseModule` and `AuthModule` (for guards).

### Decision 8: Order number generation

Use a format like `ORD-{YYYYMMDD}-{random6}` (e.g., `ORD-20260615-A3F7K2`). Generated at creation time in the use case (not the database) to keep the domain portable.

## Risks / Trade-offs

- **[Risk] State transitions may need to trigger side effects (e.g., release inventory on EXPIRED, issue tickets on PAID)** → Mitigation: Domain events are collected on the `Order` entity and published through `IOrderEventPublisher` after persistence. Downstream changes inject concrete publishers. The initial no-op publisher keeps this change self-contained.

- **[Risk] Race condition on concurrent status transitions** → Mitigation: Prisma's `update` with a `where` clause on the current status provides optimistic locking. If the status has already changed, the update fails and the use case throws a conflict error.

- **[Risk] Idempotency key adds schema change** → Mitigation: The field is nullable and has a partial unique constraint `(userId, idempotencyKey)`. Existing seed data is unaffected. Migration is additive only.

- **[Trade-off] Single transition use case reduces explicitness** → Accepted because the domain entity's transition map is the single source of truth, and test coverage on the entity ensures correctness.

- **[Trade-off] No admin endpoints in this change** → Accepted to limit scope. Admin order views can be added in a follow-up change.
