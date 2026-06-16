## Why

The ticket-purchase spec defines an "Order lifecycle" requirement: the system SHALL track order states from creation through payment, fulfillment, expiration, failure, or cancellation. Currently no order management code exists—only the Prisma schema models (`Order`, `OrderItem`, `OrderStatus` enum) are in place. Without this change, none of the downstream features (inventory reservation, QR ticket issuance, payment processing) can function because they all depend on a working Order entity with state transitions.

The blueprint (`blueprint/design.md`) specifies that the purchase flow creates orders in `PENDING_PAYMENT` status with an idempotency key to prevent duplicate submissions, and that order transitions trigger side effects (ticket issuance, reservation release, notification enqueueing). This change establishes the foundational order state machine and idempotent creation, preparing extension points for those downstream side effects.

## What Changes

- Add a new `ordering` module in `packages/backend/src/ordering/` following the project's Clean Architecture conventions (domain → application → infrastructure → adapters).
- Create `Order` and `OrderItem` domain entities with explicit state-machine rules governing allowed transitions between `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `FAILED`, `CANCELLED`, and `REFUNDED` statuses.
- Implement use cases: `CreateOrderUseCase` (with idempotency key support), `GetOrderUseCase`, `ListUserOrdersUseCase`, `TransitionOrderStatusUseCase` (covers pay, expire, fail, cancel, refund — with domain event hooks for downstream side effects).
- Define `IOrderRepository` port and a `PrismaOrderRepository` adapter.
- Expose REST API endpoints via an `OrderController` in the HTTP adapter layer, following the blueprint's API surface:
  - `POST /checkout/orders` — create a new order with idempotency key (sets status to `PENDING_PAYMENT`, sets `reservationExpiresAt` based on configured TTL)
  - `GET /me/orders` — list current user's orders
  - `GET /me/orders/:id` — retrieve order details (owner-only access)
  - `PATCH /orders/:id/status` — transition order status (internal, used by payment callback flow)
- Wire everything through an `OrderModule` registered in the API app module.
- Add unit tests for domain state transitions, idempotent creation, and use cases.

## Capabilities

### New Capabilities

_(none — this change implements existing requirements, not new ones)_

### Modified Capabilities

- `ticket-purchase`: Implementing the "Order lifecycle" requirement (scenarios: "Paid order issues tickets", "Failed payment does not issue tickets"). This change builds the foundational order state machine with idempotent creation and domain event hooks; ticket issuance, reservation release, and notification enqueueing on state change will be handled by subsequent changes (`implement-inventory-reservation`, `implement-qr-ticket-issuance`).

## Impact

- **New code**: `packages/backend/src/ordering/` module (~18-22 files across domain, application, infrastructure, adapters layers).
- **Modified code**: `apps/api/src/app.module.ts` (import `OrderModule`), `packages/backend/src/index.ts` (re-export ordering module).
- **APIs**: Four new REST endpoints: `POST /checkout/orders`, `GET /me/orders`, `GET /me/orders/:id`, `PATCH /orders/:id/status`.
- **Dependencies**: Uses existing `PrismaService` from `packages/backend/src/platform/`. No new npm packages required.
- **Database**: No schema changes — `Order`, `OrderItem`, and `OrderStatus` enum already exist in `prisma/schema.prisma`.
