## ADDED Requirements

### Requirement: My Orders page lists all user orders
The system SHALL display a list of all orders belonging to the authenticated user at `/account/orders`. Each order item SHALL show the order number, concert name, order status, total amount (VND), and creation date.

#### Scenario: User with orders views My Orders page
- **WHEN** an authenticated AUDIENCE user navigates to `/account/orders`
- **THEN** the system fetches orders from `GET /me/orders` and displays them as a list sorted by creation date (newest first)

#### Scenario: User with no orders views My Orders page
- **WHEN** an authenticated AUDIENCE user with no orders navigates to `/account/orders`
- **THEN** the system displays an empty state message indicating no orders exist, with a link to browse events

#### Scenario: Orders loading state
- **WHEN** the orders data is being fetched
- **THEN** the system displays skeleton card placeholders

### Requirement: Order status is displayed with visual indicators
The system SHALL display order status using color-coded badges. The status values are: `PENDING_PAYMENT` (yellow/warning), `PAID` (green/success), `EXPIRED` (gray/muted), `CANCELLED` (red/destructive), `REFUNDED` (blue/info), `FAILED` (red/destructive).

#### Scenario: Pending payment order shows warning badge
- **WHEN** an order has status `PENDING_PAYMENT`
- **THEN** the system displays a yellow/warning badge with text "Chờ thanh toán"

#### Scenario: Paid order shows success badge
- **WHEN** an order has status `PAID`
- **THEN** the system displays a green/success badge with text "Đã thanh toán"

### Requirement: Pending orders show reservation countdown
The system SHALL display a countdown timer for orders with status `PENDING_PAYMENT` showing the time remaining until `reservationExpiresAt`. When the countdown reaches zero, the order status display SHALL update to reflect expiration.

#### Scenario: Pending order with active reservation
- **WHEN** an order has status `PENDING_PAYMENT` and `reservationExpiresAt` is in the future
- **THEN** the system displays a countdown timer showing minutes and seconds remaining

#### Scenario: Pending order reservation expires
- **WHEN** the countdown timer for a pending order reaches zero
- **THEN** the system disables the "Continue Payment" action and displays the order as expired

### Requirement: Order detail page shows complete order information
The system SHALL display a detailed view of a single order at `/account/orders/:id`. The detail page SHALL show: order number, concert name, order status badge, total amount, creation date, line items (ticket type, quantity, unit price), payment timestamps, and reservation expiry for pending orders.

#### Scenario: User views order detail
- **WHEN** an authenticated user navigates to `/account/orders/:id` for an order they own
- **THEN** the system fetches order data from `GET /me/orders/:id` and displays all order details including line items

#### Scenario: User attempts to view another user's order
- **WHEN** a user navigates to `/account/orders/:id` for an order they do not own
- **THEN** the backend returns a 404 error and the system displays a "not found" message

### Requirement: Continue payment for pending orders
The system SHALL display a "Continue Payment" button on the order detail page when the order status is `PENDING_PAYMENT` and the reservation has not expired. Clicking the button SHALL initiate payment via `POST /orders/:id/payment` and redirect the user to the payment gateway.

#### Scenario: User continues payment on pending order
- **WHEN** the user clicks "Continue Payment" on a pending order detail page
- **THEN** the system presents a payment provider selection, calls `POST /orders/:id/payment` with the selected provider and an idempotency key, and redirects to the `redirectUrl` returned in the response

#### Scenario: Continue payment on expired reservation
- **WHEN** the user views an order whose `reservationExpiresAt` has passed
- **THEN** the "Continue Payment" button is disabled or hidden, and a message indicates the reservation has expired

#### Scenario: Payment initiation fails
- **WHEN** the `POST /orders/:id/payment` request fails
- **THEN** the system displays an error message describing the failure reason without navigating away

### Requirement: Cancel pending order from order detail
The system SHALL display a "Cancel Order" button on the order detail page when the order status is `PENDING_PAYMENT`. Clicking the button SHALL show a confirmation dialog, and upon confirmation, call `POST /me/orders/:id/cancel`. On success, the order status SHALL update to `CANCELLED`.

#### Scenario: User cancels a pending order
- **WHEN** the user clicks "Cancel Order" and confirms the cancellation dialog
- **THEN** the system calls `POST /me/orders/:id/cancel`, the order status updates to `CANCELLED`, and action buttons are removed

#### Scenario: User dismisses cancel confirmation
- **WHEN** the user clicks "Cancel Order" but dismisses the confirmation dialog
- **THEN** no API call is made and the order remains unchanged

#### Scenario: Cancel fails because order is no longer pending
- **WHEN** the user attempts to cancel an order that has already transitioned to `PAID` or `EXPIRED`
- **THEN** the system displays an error message and refreshes the order detail to show the current state

### Requirement: Orders API client follows established patterns
The orders API client SHALL be implemented in `shared/api/orders.ts` with fetch functions (`fetchMyOrders`, `fetchOrderDetail`, `cancelOrder`, `initiatePayment`), a query key factory (`orderKeys`), and React Query hooks (`useMyOrders`, `useOrderDetail`). Mutations for cancel and payment SHALL use `useMutation` with appropriate cache invalidation.

#### Scenario: Order list query key includes user scope
- **WHEN** `useMyOrders()` is called
- **THEN** it uses the query key `['orders', 'list']` and fetches from `GET /me/orders`

#### Scenario: Cancel order mutation invalidates order queries
- **WHEN** a cancel order mutation succeeds
- **THEN** the order detail and order list queries are invalidated to refetch fresh data
