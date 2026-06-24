## ADDED Requirements

### Requirement: Audience cancel order endpoint
The system SHALL expose a `POST /me/orders/:id/cancel` endpoint that allows an authenticated AUDIENCE user to cancel their own order. The endpoint SHALL be protected by `JwtAuthGuard` and `RolesGuard(AUDIENCE)`.

#### Scenario: Audience user cancels their pending order
- **WHEN** an authenticated AUDIENCE user sends `POST /me/orders/:id/cancel` for an order they own with status `PENDING_PAYMENT`
- **THEN** the system transitions the order to `CANCELLED` status and returns the updated order

#### Scenario: Audience user attempts to cancel a non-pending order
- **WHEN** an authenticated AUDIENCE user sends `POST /me/orders/:id/cancel` for an order with status `PAID`
- **THEN** the system returns a 409 Conflict error indicating the order cannot be cancelled in its current state

#### Scenario: Audience user attempts to cancel another user's order
- **WHEN** an authenticated AUDIENCE user sends `POST /me/orders/:id/cancel` for an order that belongs to a different user
- **THEN** the system returns a 404 Not Found error (to avoid leaking order existence)

#### Scenario: Unauthenticated request to cancel order
- **WHEN** an unauthenticated request is sent to `POST /me/orders/:id/cancel`
- **THEN** the system returns a 401 Unauthorized error

### Requirement: Cancel delegates to existing transition logic
The cancel endpoint handler SHALL delegate to the existing `TransitionOrderStatusUseCase` with the target status `CANCELLED`. It SHALL NOT implement custom cancellation logic.

#### Scenario: Cancel uses TransitionOrderStatusUseCase
- **WHEN** the cancel endpoint receives a valid cancellation request
- **THEN** it calls `TransitionOrderStatusUseCase.execute()` with `orderId`, `userId`, and target status `CANCELLED`

### Requirement: Cancel endpoint validates ownership
The cancel endpoint SHALL verify that the authenticated user's ID matches the order's `userId` before attempting the status transition. Ownership verification SHALL occur before the transition attempt.

#### Scenario: Ownership check precedes status transition
- **WHEN** a cancel request is received for order ID that exists but belongs to another user
- **THEN** the system returns 404 Not Found without attempting the status transition
