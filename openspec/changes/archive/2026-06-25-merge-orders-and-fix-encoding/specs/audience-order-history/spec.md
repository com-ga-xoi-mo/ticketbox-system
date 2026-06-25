## MODIFIED Requirements

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

## ADDED Requirements

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
