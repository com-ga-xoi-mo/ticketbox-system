## 1. API Client Layer

- [x] 1.1 Create `apps/audience-web/src/shared/api/orders.ts` with `createOrder` function calling `POST /checkout/orders` (accepts concert ID, ticket selections array, idempotency key; returns order response)
- [x] 1.2 Add `fetchMyOrders` function to `orders.ts` calling `GET /me/orders` (returns paginated order list)
- [x] 1.3 Add `fetchOrderDetail` function to `orders.ts` calling `GET /me/orders/:id` (returns full order with items, status, timestamps, reservation expiry)
- [x] 1.4 Add `initiatePayment` function to `orders.ts` calling `POST /orders/:id/payment` (accepts provider, idempotency key, returnUrl; returns payment URL)
- [x] 1.5 Add TanStack Query key factory `orderKeys` and custom hooks: `useMyOrders`, `useOrderDetail` with configurable `refetchInterval` for polling
- [x] 1.6 Add error response type definitions and `parseOrderError` utility mapping backend error codes (`INSUFFICIENT_INVENTORY`, `PER_USER_LIMIT_EXCEEDED`, `SALE_WINDOW_CLOSED`, `RESERVATION_EXPIRED`, `PAYMENT_PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `IDEMPOTENCY_CONFLICT`) to Vietnamese user messages

## 2. Shared Utilities

- [x] 2.1 Create `apps/audience-web/src/shared/hooks/useCountdown.ts` — a hook accepting a target `Date` (reservationExpiresAt), returning `{ minutes, seconds, isExpired }` with 1-second interval updates and cleanup
- [x] 2.2 Create `apps/audience-web/src/shared/hooks/useRequireAuth.ts` — a hook that checks token existence via `getToken()` and returns `{ isAuthenticated, redirectToLogin(returnTo) }` helper
- [x] 2.3 Create idempotency key utility `apps/audience-web/src/shared/lib/idempotency.ts` exporting `generateIdempotencyKey()` wrapping `crypto.randomUUID()`

## 3. Auth Gate Integration

- [x] 3.1 Update `LoginPage` to read `returnTo` query parameter from URL and redirect to it after successful login instead of defaulting to `/`
- [x] 3.2 Wire the "Tiếp tục mua vé" button in `EventDetailPage` to check auth state before navigating — if unauthenticated, redirect to `/login?returnTo=/events/:slug`

## 4. EventDetailPage Checkout Navigation

- [x] 4.1 Modify the "Tiếp tục mua vé" button in `EventDetailPage` to navigate to `/checkout` passing `concertId`, `concertSlug`, `concertTitle`, and the selected `quantities` map via router state (`useNavigate` with `state`)
- [x] 4.2 Disable the button and show a loading spinner while the navigation/auth check is in progress

## 5. Checkout Page

- [x] 5.1 Create `apps/audience-web/src/features/checkout/CheckoutPage.tsx` — reads concert and quantities from router state, displays order summary (ticket types, quantities, unit prices, subtotal, total)
- [x] 5.2 Add "Xác nhận đặt vé" (Confirm order) button that generates an idempotency key, calls `createOrder`, and transitions to the reservation/payment step on success
- [x] 5.3 Handle checkout errors inline: show error alerts for `INSUFFICIENT_INVENTORY`, `PER_USER_LIMIT_EXCEEDED`, `SALE_WINDOW_CLOSED`, `RATE_LIMITED` with Vietnamese messages and appropriate recovery actions (return to event detail, retry)
- [x] 5.4 After successful order creation, display the order summary with reservation countdown timer (using `useCountdown` hook) and payment provider selection
- [x] 5.5 Add payment provider selector (Radio group or Select) with available providers (simulator for dev, MoMo, VNPay)
- [x] 5.6 Add "Thanh toán" (Pay) button that generates a payment idempotency key, calls `initiatePayment` with selected provider and `returnUrl` set to `/orders/:id/result`, then redirects browser to the returned payment URL via `window.location.href`
- [x] 5.7 Handle payment initiation errors: `PAYMENT_PROVIDER_UNAVAILABLE` (show provider unavailable message), `RESERVATION_EXPIRED` (show expired result), `IDEMPOTENCY_CONFLICT` (show duplicate submission message)
- [x] 5.8 Show reservation expired state when countdown hits zero — disable payment button, display "Thời gian giữ vé đã hết" with "Quay lại chọn vé" link
- [x] 5.9 Use Ant Design `Steps` component to show checkout progress (Chọn vé → Xác nhận → Thanh toán → Hoàn tất)

## 6. Payment Result Page

- [x] 6.1 Create `apps/audience-web/src/features/orders/PaymentResultPage.tsx` at route `/orders/:id/result` — reads order ID from URL params
- [x] 6.2 Implement status polling: call `useOrderDetail` with `refetchInterval: 3000` while status is `PENDING_PAYMENT`, stop when terminal status is reached or 2 minutes elapsed
- [x] 6.3 Display intermediate "Đang xử lý thanh toán..." state with Ant Design `Skeleton` or spinner during polling
- [x] 6.4 On `PAID` status: display Ant Design `Result` with `status="success"`, order number, paid amount, "Xem vé" link to `/orders/:id`
- [x] 6.5 On `FAILED` status: display Ant Design `Result` with `status="error"`, failure reason, "Thử lại" link back to event detail
- [x] 6.6 On `EXPIRED` status: display Ant Design `Result` with `status="warning"`, "Đơn hàng đã hết hạn", link back to event detail
- [x] 6.7 On polling timeout (2 min): display "Đang xử lý thanh toán, vui lòng kiểm tra lại sau" with link to `/orders`

## 7. Order Detail Page

- [x] 7.1 Create `apps/audience-web/src/features/orders/OrderDetailPage.tsx` at route `/orders/:id` — fetches order via `useOrderDetail`
- [x] 7.2 Display order summary: order number, status badge, concert name, creation date, total amount
- [x] 7.3 Display order items: ticket type name, quantity, unit price, line total
- [x] 7.4 For `PAID` orders: display QR codes for each issued ticket (fetch from `GET /me/tickets` filtered by order, render QR using a QR code library)
- [x] 7.5 For `PENDING_PAYMENT` orders: show reservation countdown and payment CTA (reuse checkout payment step logic)
- [x] 7.6 For `EXPIRED`/`FAILED`/`CANCELLED` orders: show appropriate status message with link to event detail
- [x] 7.7 Handle 404 (not found or not owner) by displaying a not-found state

## 8. My Orders Page

- [x] 8.1 Create `apps/audience-web/src/features/orders/MyOrdersPage.tsx` at route `/orders` — fetches orders via `useMyOrders`
- [x] 8.2 Display order list: each item shows order number, concert name, total, date, and status badge (color-coded: green=PAID, yellow=PENDING, red=FAILED, gray=EXPIRED)
- [x] 8.3 Each order links to `/orders/:id`
- [x] 8.4 Empty state: "Bạn chưa có đơn hàng nào" with "Khám phá sự kiện" link to `/events`
- [x] 8.5 Loading state with Ant Design `Skeleton`
- [x] 8.6 Auth guard: redirect unauthenticated users to `/login?returnTo=/orders`

## 9. Routing

- [x] 9.1 Add routes to `router.tsx`: `/checkout`, `/orders`, `/orders/:id`, `/orders/:id/result`
- [x] 9.2 Ensure checkout and order routes are within the `PublicLayout` wrapper for consistent header/footer
- [x] 9.3 Add navigation link to "Đơn hàng của tôi" in the header/account menu for authenticated users

## 10. Backend: Minimal Payment ReturnUrl Support

- [x] 10.1 Verify that `POST /orders/:id/payment` accepts and passes `returnUrl` to payment providers for redirect-back — if not already supported, add `returnUrl` as an optional field in the payment initiation DTO and pass it to the provider adapter
- [x] 10.2 Verify that `GET /me/orders/:id` response includes `status`, `reservationExpiresAt`, `orderNumber`, `totalAmountVnd`, `items`, and `paidAt` fields sufficient for frontend display — document any gaps

## 11. Shared Types

- [x] 11.1 Verify `@ticketbox/api-types` exports order and payment response types needed by the frontend (Order, OrderItem, OrderStatus, PaymentInitiationResponse) — if missing, add the necessary type exports

## 12. Install Dependencies

- [x] 12.1 Add `antd` to `apps/audience-web/package.json` dependencies (for Steps, Result, Skeleton, Select components)
- [x] 12.2 Add a QR code rendering library (e.g., `qrcode.react`) to `apps/audience-web/package.json` for ticket QR display

## 13. Smoke Testing

- [x] 13.1 Verify full checkout flow end-to-end with payment simulator: select tickets → create order → pay via simulator → confirm payment result → view QR tickets
- [x] 13.2 Verify error states: attempt checkout with sold-out ticket type, attempt checkout exceeding per-user limit, let reservation expire, attempt payment with circuit breaker open
- [x] 13.3 Verify auth gate: unauthenticated checkout redirects to login, post-login returns to event detail

## 14. Fix Backend Errors

- [x] 14.1 Run `npm install` at workspace root to resolve `linkedom` and `qrcode` missing modules.
- [x] 14.2 Fix `ticketTypeName` missing in `OrderItemProps` for `packages/backend/src/ordering/adapters/http/internal-order.controller.spec.ts`.
- [x] 14.3 Fix `ticketTypeName` missing in `OrderItemProps` for `packages/backend/src/ordering/adapters/http/order.controller.spec.ts`.
- [x] 14.4 Fix `ticketTypeName` missing in `TicketTypePricingRecord` for `packages/backend/src/ordering/application/use-cases/create-order.use-case.spec.ts`.
- [x] 14.5 Fix `ticketTypeName` missing in `OrderItemProps` for `packages/backend/src/ordering/infrastructure/database/prisma-inventory-reservation.repository.spec.ts`.
- [x] 14.6 Fix `ticketTypeName` missing in `OrderItemProps` for `packages/backend/src/ordering/infrastructure/database/prisma-order.repository.spec.ts`.
