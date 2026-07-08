# audience-checkout Specification

## Purpose

TBD - created by syncing change implement-audience-checkout-and-payment. Update Purpose after archive.

## Requirements

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

### Requirement: Audience can join waitlist from sold-out ticket selection
The audience web app SHALL show an official waitlist action for primary-sale ticket types that are sold out or waitlist-gated and SHALL let an authenticated audience user join the waitlist.

#### Scenario: Sold-out primary ticket shows waitlist action
- **WHEN** a user views a published event with a sold-out primary-sale ticket type that supports official waitlist
- **THEN** the app SHALL show a waitlist action instead of presenting normal checkout as available

#### Scenario: Authenticated user joins waitlist
- **WHEN** an authenticated user joins the waitlist for a ticket type
- **THEN** the app SHALL call the waitlist join endpoint and display the user's waitlist status

#### Scenario: Unauthenticated user is asked to log in
- **WHEN** an unauthenticated user clicks the waitlist action
- **THEN** the app SHALL redirect to login with a return URL back to the event detail page

### Requirement: Audience can view and leave waitlist status
The audience web app SHALL display the user's current official waitlist status for a ticket type and allow the user to leave while the entry or entitlement is still active.

#### Scenario: Waiting status shown
- **WHEN** the user has an active waiting entry for a ticket type
- **THEN** the app SHALL display the waiting status and approximate queue position returned by the backend

#### Scenario: User leaves waitlist
- **WHEN** the user leaves the waitlist from the event detail or checkout-related surface
- **THEN** the app SHALL call the leave endpoint and update the ticket type state without creating a checkout order

### Requirement: Entitled user can enter checkout
The audience web app SHALL let a user with an active official waitlist entitlement proceed to checkout for the granted ticket type before the entitlement expires.

#### Scenario: Entitlement countdown shown
- **WHEN** the user has an active waitlist entitlement
- **THEN** the app SHALL display the entitlement expiry countdown and a checkout action for the granted ticket type

#### Scenario: Entitlement submitted with checkout
- **WHEN** the user starts checkout from an active waitlist entitlement
- **THEN** the app SHALL include the entitlement identifier in the `POST /checkout/orders` request

#### Scenario: Entitlement expires before checkout
- **WHEN** the entitlement countdown reaches zero before order creation
- **THEN** the app SHALL disable entitlement checkout and refresh waitlist status from the backend

### Requirement: Waitlist checkout errors are user-facing
The audience web app SHALL map official waitlist checkout errors to Vietnamese user-facing messages and SHALL not treat them as generic unknown failures.

#### Scenario: Missing entitlement error
- **WHEN** checkout is rejected because the ticket type requires an official waitlist entitlement
- **THEN** the app SHALL show a message explaining that the user must wait for their purchase turn

#### Scenario: Expired entitlement error
- **WHEN** checkout is rejected because the entitlement expired
- **THEN** the app SHALL show a message explaining that the purchase window has expired and refresh waitlist status

### Requirement: Audience can register for a presale lottery from event detail
The audience web app SHALL show a lottery registration action for a lottery-enabled ticket type while its registration window is open and SHALL let an authenticated audience user register with a desired quantity.

#### Scenario: Open registration window shows register action
- **WHEN** a user views a published event with a lottery-enabled ticket type whose registration window is open
- **THEN** the app SHALL show a lottery registration action instead of presenting normal checkout as available

#### Scenario: Authenticated user registers
- **WHEN** an authenticated user submits a lottery registration for a ticket type
- **THEN** the app SHALL call the lottery register endpoint and display the user's lottery registration status

#### Scenario: Unauthenticated user is asked to log in
- **WHEN** an unauthenticated user clicks the lottery registration action
- **THEN** the app SHALL redirect to login with a return URL back to the event detail page

#### Scenario: Registration closed state
- **WHEN** a user views a lottery ticket type whose registration window has closed but whose draw has not completed
- **THEN** the app SHALL show a registration-closed state without offering registration or direct checkout

### Requirement: Audience can view lottery status and withdraw
The audience web app SHALL display the user's current lottery status for a ticket type and allow the user to withdraw an active registration before the draw runs.

#### Scenario: Registered status shown
- **WHEN** the user has an active registration for a ticket type and the draw has not run
- **THEN** the app SHALL display the registered status and the scheduled draw time returned by the backend

#### Scenario: Not-selected status shown
- **WHEN** the draw did not select the user
- **THEN** the app SHALL display a not-selected status and SHALL NOT offer entitlement checkout

#### Scenario: User withdraws registration
- **WHEN** the user withdraws before the draw
- **THEN** the app SHALL call the withdraw endpoint and update the ticket type state without creating a checkout order

### Requirement: Lottery winner can enter checkout
The audience web app SHALL let a user with an active `LOTTERY` purchase entitlement proceed to checkout for the won ticket type before the entitlement expires.

#### Scenario: Winner entitlement countdown shown
- **WHEN** the user has an active `LOTTERY` entitlement
- **THEN** the app SHALL display the entitlement expiry countdown and a checkout action for the won ticket type

#### Scenario: Entitlement submitted with checkout
- **WHEN** the user starts checkout from an active `LOTTERY` entitlement
- **THEN** the app SHALL include the entitlement identifier in the `POST /checkout/orders` request

#### Scenario: Entitlement expires before checkout
- **WHEN** the entitlement countdown reaches zero before order creation
- **THEN** the app SHALL disable entitlement checkout and refresh lottery status from the backend

### Requirement: Lottery checkout errors are user-facing
The audience web app SHALL map presale lottery checkout errors to Vietnamese user-facing messages and SHALL NOT treat them as generic unknown failures.

#### Scenario: Missing lottery entitlement error
- **WHEN** checkout is rejected because the ticket type requires a lottery entitlement during the presale window
- **THEN** the app SHALL show a message explaining that only draw winners can buy during the presale window

#### Scenario: Expired lottery entitlement error
- **WHEN** checkout is rejected because the `LOTTERY` entitlement expired
- **THEN** the app SHALL show a message explaining that the purchase window has expired and refresh lottery status

### Requirement: Audience web can expose temporary lottery operator controls for testing
The audience web app MAY expose a temporary operator/testing panel for organizer/admin users during this change so the team can test presale lottery end-to-end before the dedicated organizer admin UI exists. The panel SHALL call organizer/admin endpoints and SHALL NOT bypass backend authorization.

#### Scenario: Organizer tests manual draw from event detail
- **WHEN** an authenticated organizer/admin views a lottery-enabled event in the audience web test flow
- **THEN** the app MAY show controls to view registrations, update the lottery TTL before draw, and run the draw immediately
- **AND** after a manual draw completes, the app SHALL refresh lottery status and registration list data

#### Scenario: Audience user does not get operator controls
- **WHEN** a normal audience user views the same event
- **THEN** the app SHALL hide operator/testing controls and show only the audience lottery registration/status/checkout states
