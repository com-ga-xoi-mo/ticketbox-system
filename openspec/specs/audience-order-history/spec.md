# audience-order-history

## Purpose
TBD: My Orders list and Order detail pages with status tracking, continue-payment, and cancel-pending-order flows.

## Requirements

### Requirement: My Orders page lists all user orders
The system SHALL display a list of all orders belonging to the authenticated user at the canonical path `/account/orders`. Each order item SHALL show the order number, concert name, order status, total amount (VND), and creation date. The system SHALL redirect requests from the deprecated path `/orders` to `/account/orders` using a client-side redirect.

#### Scenario: User with orders views My Orders page
- **WHEN** an authenticated AUDIENCE user navigates to `/account/orders`
- **THEN** the system fetches orders from `GET /me/orders` and displays them as a list sorted by creation date (newest first)

#### Scenario: User with no orders views My Orders page
- **WHEN** an authenticated AUDIENCE user with no orders navigates to `/account/orders`
- **THEN** the system displays an empty state message indicating no orders exist, with a link to browse events

#### Scenario: Orders loading state
- **WHEN** the orders data is being fetched
- **THEN** the system displays skeleton card placeholders

#### Scenario: User navigates to deprecated /orders path
- **WHEN** a user navigates to `/orders`
- **THEN** the system redirects to `/account/orders` using a replace navigation (no back-button loop)

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
The system SHALL display a detailed view of a single order at the canonical path `/account/orders/:id`. The detail page SHALL show: order number, concert name, order status badge, total amount, creation date, line items (ticket type, quantity, unit price), payment timestamps, and reservation expiry for pending orders. The system SHALL redirect requests from the deprecated path `/orders/:id` to `/account/orders/:id`.

#### Scenario: User views order detail
- **WHEN** an authenticated user navigates to `/account/orders/:id` for an order they own
- **THEN** the system fetches order data from `GET /me/orders/:id` and displays all order details including line items

#### Scenario: User attempts to view another user's order
- **WHEN** a user navigates to `/account/orders/:id` for an order they do not own
- **THEN** the backend returns a 404 error and the system displays a "not found" message

#### Scenario: User navigates to deprecated /orders/:id path
- **WHEN** a user navigates to `/orders/:id`
- **THEN** the system redirects to `/account/orders/:id` using a replace navigation, preserving the order ID parameter

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

### Requirement: Order detail exposes post-purchase support actions
The system SHALL display support, refund, ticket resend, and order confirmation actions on eligible order detail pages for authenticated audience users.

#### Scenario: Paid order shows support actions
- **WHEN** an authenticated audience user views an owned `PAID` order
- **THEN** the order detail page shows actions to contact support, request refund when eligible, resend tickets, and download order confirmation

#### Scenario: Pending order shows limited support actions
- **WHEN** an authenticated audience user views an owned `PENDING_PAYMENT` order
- **THEN** the order detail page offers payment help or contact support but does not offer ticket resend or paid-order confirmation download

#### Scenario: Refunded order shows final status
- **WHEN** an authenticated audience user views an owned `REFUNDED` order
- **THEN** the order detail page displays refunded status and links to related refund request history when available

### Requirement: Order page displays linked support and refund state
The system SHALL surface active support and refund request summaries on order detail pages.

#### Scenario: Order has active refund request
- **WHEN** an owned order has an active refund request
- **THEN** the order detail page displays the refund request status and links to the refund request detail

#### Scenario: Order has support request
- **WHEN** an owned order has one or more support requests
- **THEN** the order detail page displays recent support request status and links to the support center history

### Requirement: Order confirmation download uses owned order data
The system SHALL provide an order confirmation download action for owned paid orders.

#### Scenario: User downloads confirmation from order detail
- **WHEN** the user clicks download confirmation on an owned paid order
- **THEN** the audience app requests the confirmation contract and renders a printable purchase confirmation

#### Scenario: User downloads another user's confirmation
- **WHEN** a user requests a confirmation for an order they do not own
- **THEN** the backend returns `404`

### Requirement: Payment result page is located in account feature
The `PaymentResultPage` component SHALL be located in `features/account/` and imported from `../features/account/PaymentResultPage` in the router. The route path `/orders/:id/result` SHALL remain unchanged as it is a payment gateway callback URL.

#### Scenario: Payment result renders after redirect from payment gateway
- **WHEN** a payment gateway redirects the user to `/orders/:id/result`
- **THEN** the system renders the `PaymentResultPage` component from the `features/account/` directory

### Requirement: Dead order components are removed
The duplicate `MyOrdersPage.tsx` and `OrderDetailPage.tsx` files in `features/orders/` SHALL be deleted. After cleanup, the `features/orders/` directory SHALL NOT exist.

#### Scenario: No orphaned order components remain
- **WHEN** the codebase is inspected after this change
- **THEN** there are no files in `features/orders/` directory and the directory itself does not exist

#### Scenario: All order page imports resolve correctly
- **WHEN** the application is built after the cleanup
- **THEN** all imports for order-related pages resolve to files in `features/account/` with no broken references

