## ADDED Requirements

### Requirement: Checkout order creation
The audience-web app SHALL create a pending order by calling `POST /checkout/orders` with the selected ticket type IDs, quantities, concert ID, and a client-generated idempotency key when the authenticated user confirms their ticket selection.

#### Scenario: Successful order creation
- **WHEN** an authenticated AUDIENCE user submits a checkout with valid ticket selections and an idempotency key
- **THEN** the app SHALL call `POST /checkout/orders` and display the order summary with a `PENDING_PAYMENT` status and the reservation countdown timer

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

### Requirement: Reservation countdown display
The audience-web app SHALL display a countdown timer showing the remaining reservation time based on the order's `reservationExpiresAt` field, updating every second.

#### Scenario: Countdown ticks down
- **WHEN** the checkout page displays a pending order with a future `reservationExpiresAt`
- **THEN** the app SHALL show a countdown in `MM:SS` format that decrements every second

#### Scenario: Reservation expires on client
- **WHEN** the countdown reaches zero
- **THEN** the app SHALL disable the payment button, display a "Thời gian giữ vé đã hết" (reservation expired) message, and offer a "Quay lại chọn vé" (return to selection) link

#### Scenario: Backend confirms expiry on next poll
- **WHEN** the user interacts with an order whose countdown has reached zero
- **THEN** the app SHALL query `GET /me/orders/:id` and display the confirmed `EXPIRED` status from the backend

### Requirement: Payment initiation
The audience-web app SHALL initiate payment by calling `POST /orders/:id/payment` with the selected payment provider, idempotency key, and a `returnUrl` pointing to the order result page, then redirect the user to the provider payment URL.

#### Scenario: Successful payment initiation
- **WHEN** the user selects a payment provider and clicks "Thanh toán" on a `PENDING_PAYMENT` order
- **THEN** the app SHALL call `POST /orders/:id/payment` with the provider, idempotency key, and `returnUrl`
- **AND** the app SHALL redirect the user's browser to the payment URL returned by the backend

#### Scenario: Payment provider unavailable (circuit open)
- **WHEN** the backend returns a payment-provider-unavailable error
- **THEN** the app SHALL display a "Cổng thanh toán tạm thời không khả dụng, vui lòng thử lại sau" message without consuming the reservation

#### Scenario: Payment initiation on expired reservation
- **WHEN** the user attempts to pay for an order that has expired
- **THEN** the app SHALL display a "Đơn hàng đã hết hạn" (order expired) result page and offer to return to the event detail

#### Scenario: Duplicate payment initiation with same idempotency key
- **WHEN** the user retries payment initiation with the same idempotency key
- **THEN** the app SHALL receive the original payment URL and redirect to it without creating a duplicate payment attempt

### Requirement: Payment result and status polling
The audience-web app SHALL display a payment result page at `/orders/:id/result` that polls `GET /me/orders/:id` until the order reaches a terminal status, then displays the appropriate result state.

#### Scenario: Payment succeeds
- **WHEN** polling detects the order status has changed to `PAID`
- **THEN** the app SHALL display a success result with order number, paid amount, and a "Xem vé" (view tickets) link

#### Scenario: Payment fails
- **WHEN** polling detects the order status has changed to `FAILED`
- **THEN** the app SHALL display a failure result with reason and a "Thử lại" (try again) option that returns the user to the event detail page

#### Scenario: Payment still processing after timeout
- **WHEN** polling has continued for 2 minutes without a terminal status
- **THEN** the app SHALL stop polling and display "Đang xử lý thanh toán, vui lòng kiểm tra lại sau" (payment processing, check back later) with a link to "Đơn hàng của tôi"

#### Scenario: Intermediate polling state
- **WHEN** the order status is still `PENDING_PAYMENT` during polling
- **THEN** the app SHALL display a "Đang xử lý thanh toán..." (processing payment) state with a loading indicator

### Requirement: Order detail page
The audience-web app SHALL display order details at `/orders/:id` showing the order summary, status, ticket items, and QR codes for paid orders.

#### Scenario: Viewing a paid order
- **WHEN** an authenticated user navigates to `/orders/:id` for a `PAID` order they own
- **THEN** the app SHALL display the order number, total amount, payment timestamp, and each ticket with its QR code

#### Scenario: Viewing a pending order
- **WHEN** an authenticated user navigates to `/orders/:id` for a `PENDING_PAYMENT` order they own
- **THEN** the app SHALL display the order summary with the reservation countdown and payment options

#### Scenario: Viewing an expired order
- **WHEN** an authenticated user navigates to `/orders/:id` for an `EXPIRED` order they own
- **THEN** the app SHALL display an expired state with a link back to the event detail page

#### Scenario: Accessing another user's order
- **WHEN** a user navigates to `/orders/:id` for an order they do not own
- **THEN** the app SHALL display a not-found state (the backend returns 404)

### Requirement: My orders page
The audience-web app SHALL display a list of the authenticated user's orders at `/orders`, showing order status, concert name, total, and creation date.

#### Scenario: User has orders
- **WHEN** an authenticated user navigates to `/orders`
- **THEN** the app SHALL display their orders sorted by creation date (newest first) with status badges, concert names, totals, and dates

#### Scenario: User has no orders
- **WHEN** an authenticated user navigates to `/orders` and has no orders
- **THEN** the app SHALL display an empty state with a "Khám phá sự kiện" (explore events) link

#### Scenario: Unauthenticated access to my orders
- **WHEN** an unauthenticated user navigates to `/orders`
- **THEN** the app SHALL redirect to `/login?returnTo=/orders`

### Requirement: Authentication gate for checkout
The audience-web app SHALL require authentication before entering the checkout flow, redirecting unauthenticated users to login with a return URL.

#### Scenario: Unauthenticated user clicks checkout
- **WHEN** an unauthenticated user clicks "Tiếp tục mua vé" on the event detail page
- **THEN** the app SHALL redirect to `/login?returnTo=/events/:slug` preserving the current event URL

#### Scenario: Authenticated user clicks checkout
- **WHEN** an authenticated user clicks "Tiếp tục mua vé" with valid ticket selections
- **THEN** the app SHALL proceed to the checkout flow without interruption

#### Scenario: User returns from login
- **WHEN** a user successfully logs in and the URL contains a `returnTo` parameter
- **THEN** the app SHALL redirect to the `returnTo` URL so the user can resume their checkout intent

### Requirement: Checkout error state handling
The audience-web app SHALL map backend error codes to Vietnamese user-facing messages and display them using appropriate UI patterns (full-page result for terminal errors, inline alert/toast for recoverable errors).

#### Scenario: Network error during checkout
- **WHEN** the network request to create an order or initiate payment fails due to connectivity
- **THEN** the app SHALL display a "Không thể kết nối, vui lòng kiểm tra mạng và thử lại" message and allow retry

#### Scenario: Unknown backend error
- **WHEN** the backend returns an unrecognized error code
- **THEN** the app SHALL display a generic "Đã có lỗi xảy ra, vui lòng thử lại" message with a retry option
