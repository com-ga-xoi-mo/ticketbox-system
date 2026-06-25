## MODIFIED Requirements

### Requirement: Checkout order creation
The audience-web app SHALL create a pending order by calling `POST /checkout/orders` with the selected ticket type IDs, quantities, concert ID, a client-generated idempotency key, and an optional `promoCode` when the authenticated user confirms their ticket selection.

#### Scenario: Successful order creation
- **WHEN** an authenticated AUDIENCE user submits a checkout with valid ticket selections and an idempotency key
- **THEN** the app SHALL call `POST /checkout/orders` and display the order summary with a `PENDING_PAYMENT` status and the reservation countdown timer

#### Scenario: Successful order creation with promo code
- **WHEN** an authenticated AUDIENCE user submits a checkout with valid ticket selections, an idempotency key, and a valid promo code
- **THEN** the app SHALL call `POST /checkout/orders` with the `promoCode` field and display the order summary including the pricing breakdown (subtotal, discount, service fee, total) with a `PENDING_PAYMENT` status and the reservation countdown timer

#### Scenario: Duplicate submission with same idempotency key
- **WHEN** the user submits the same checkout request with the same idempotency key (e.g., network retry)
- **THEN** the app SHALL receive and display the existing order without creating a duplicate

#### Scenario: Insufficient inventory at checkout time
- **WHEN** the backend rejects the checkout because available inventory is insufficient
- **THEN** the app SHALL display a "Số lượng vé không đủ" (insufficient tickets) error and return the user to ticket selection with refreshed availability data

#### Scenario: Per-user limit exceeded at checkout time
- **WHEN** the backend rejects the checkout because the user has reached the per-user limit for a ticket type
- **THEN** the app SHALL display a "Bạn đã đạt giới hạn mua vé cho loại vé này" error with the current limit and the user's existing count

#### Scenario: Sale window closed at checkout time
- **WHEN** the backend rejects the checkout because a ticket type's sale window has closed
- **THEN** the app SHALL display a "Thời gian mở bán đã kết thúc" error and return the user to ticket selection with updated sale states

#### Scenario: Rate limited at checkout
- **WHEN** the backend returns a rate-limit response (HTTP 429)
- **THEN** the app SHALL display a "Hệ thống đang bận, vui lòng thử lại sau" message and disable the submit button temporarily

#### Scenario: Promo code rejected at checkout time
- **WHEN** the backend rejects the checkout because the submitted promo code is invalid, expired, or has exceeded usage limits
- **THEN** the app SHALL display the promo-specific error message, allow the user to remove the promo code, and retry checkout without it

### Requirement: Order detail page
The audience-web app SHALL display order details at `/orders/:id` showing the order summary, status, ticket items, pricing breakdown, and QR codes for paid orders.

#### Scenario: Viewing a paid order
- **WHEN** an authenticated user navigates to `/orders/:id` for a `PAID` order they own
- **THEN** the app SHALL display the order number, pricing breakdown (subtotal, discount if applicable, service fee, total amount), payment timestamp, and each ticket with its QR code

#### Scenario: Viewing a pending order
- **WHEN** an authenticated user navigates to `/orders/:id` for a `PENDING_PAYMENT` order they own
- **THEN** the app SHALL display the order summary with pricing breakdown, the reservation countdown, and payment options

#### Scenario: Viewing an expired order
- **WHEN** an authenticated user navigates to `/orders/:id` for an `EXPIRED` order they own
- **THEN** the app SHALL display an expired state with a link back to the event detail page

#### Scenario: Accessing another user's order
- **WHEN** a user navigates to `/orders/:id` for an order they do not own
- **THEN** the app SHALL display a not-found state (the backend returns 404)

### Requirement: Checkout error state handling
The audience-web app SHALL map backend error codes to Vietnamese user-facing messages and display them using appropriate UI patterns (full-page result for terminal errors, inline alert/toast for recoverable errors), including promotion-specific error codes.

#### Scenario: Network error during checkout
- **WHEN** the network request to create an order or initiate payment fails due to connectivity
- **THEN** the app SHALL display a "Không thể kết nối, vui lòng kiểm tra mạng và thử lại" message and allow retry

#### Scenario: Unknown backend error
- **WHEN** the backend returns an unrecognized error code
- **THEN** the app SHALL display a generic "Đã có lỗi xảy ra, vui lòng thử lại" message with a retry option

#### Scenario: Promo-specific error during checkout
- **WHEN** the backend returns a promo error code (`PROMO_CODE_NOT_FOUND`, `PROMO_CODE_EXPIRED`, `PROMO_CODE_INACTIVE`, `PROMO_USAGE_LIMIT_EXCEEDED`, `PROMO_USER_LIMIT_EXCEEDED`, `PROMO_NOT_APPLICABLE`, `PROMO_CODE_NOT_YET_VALID`)
- **THEN** the app SHALL display the corresponding Vietnamese error message as an inline Alert and allow the user to remove the promo code and retry
