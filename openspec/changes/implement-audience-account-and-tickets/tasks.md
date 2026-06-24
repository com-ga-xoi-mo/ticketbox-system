## 1. Backend — Cancel Pending Order Endpoint

- [x] 1.1 Add `POST /me/orders/:id/cancel` route to `OrderController` in `packages/backend/src/ordering/adapters/http/order.controller.ts`. Protect with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.AUDIENCE)`. Handler fetches the order via `GetOrderUseCase` to verify ownership (userId match), then delegates to `TransitionOrderStatusUseCase` with target status `CANCELLED`. Return serialized updated order. Map `OrderNotFoundError` to 404 and invalid-transition errors to 409.
- [x] 1.2 Add unit/integration test for the cancel endpoint: verify ownership check (404 for wrong user), verify only `PENDING_PAYMENT` orders can be cancelled (409 for `PAID`), verify successful cancellation returns updated order with `CANCELLED` status.

## 2. API Types — Order, Ticket, and Profile Response Schemas

- [x] 2.1 Add Zod schemas and TypeScript types in `packages/api-types` for order responses: `OrderSummaryResponseSchema` (id, orderNumber, concertId, status, totalAmountVnd, reservationExpiresAt, createdAt, items), `OrderDetailResponseSchema` (extends summary with paidAt, cancelledAt, expiredAt), and list wrapper `OrderListResponseSchema`. Export from `packages/api-types/src/index.ts`.
- [x] 2.2 Add Zod schemas and TypeScript types for ticket responses: `TicketSummaryResponseSchema` (id, ticketNumber, orderId, concertId, ticketTypeId, status, issuedAt, checkedInAt), `TicketDetailResponseSchema` (extends summary with qrPayload, voidedAt), and list wrapper `TicketListResponseSchema`. Export from index.
- [x] 2.3 Add Zod schema for profile response: `MyProfileResponseSchema` (id, email, displayName, roles). Export from index.
- [x] 2.4 Verify schemas align with actual backend serializer output by checking `serializeOrder`, `serializeTicketSummary`, `serializeTicketDetail`, and `toStaffProfileResponse` functions.

## 3. Frontend API Client Layer

- [x] 3.1 Create `apps/audience-web/src/shared/api/profile.ts` with `fetchMyProfile()` using `apiGet('/me/profile')` + Zod validation, `profileKeys` query key factory, and `useMyProfile()` React Query hook. Follow `catalog.ts` pattern exactly.
- [x] 3.2 Create `apps/audience-web/src/shared/api/orders.ts` with: `fetchMyOrders()` (GET /me/orders), `fetchOrderDetail(id)` (GET /me/orders/:id), `cancelOrder(id)` (POST /me/orders/:id/cancel), `initiatePayment(id, dto)` (POST /orders/:id/payment). Add `orderKeys` factory, `useMyOrders()` hook, `useOrderDetail(id)` hook, `useCancelOrder()` mutation with order query invalidation, `useInitiatePayment()` mutation.
- [x] 3.3 Create `apps/audience-web/src/shared/api/tickets.ts` with: `fetchMyTickets()` (GET /me/tickets), `fetchTicketDetail(id)` (GET /me/tickets/:id). Add `ticketKeys` factory, `useMyTickets()` hook, `useTicketDetail(id)` hook with short staleTime (30s) since qrPayload is dynamic.

## 4. Frontend — Account Profile Page

- [x] 4.1 Rewrite `apps/audience-web/src/features/account/AccountPage.tsx` as the account landing page. Fetch profile via `useMyProfile()`. Display user displayName, email. Add navigation cards/links to "My Orders" (`/account/orders`) and "My Tickets" (`/account/tickets`). Keep `AudienceProtectedRoute` wrapper. Show skeleton during loading, error state with retry on failure.
- [x] 4.2 Create `apps/audience-web/src/features/account/AccountLayout.tsx` as a layout component for `/account/*` routes if needed for shared navigation (back button, breadcrumb). This is optional — can be a simple wrapper or merged into individual pages.

## 5. Frontend — My Orders Page

- [x] 5.1 Create `apps/audience-web/src/features/account/MyOrdersPage.tsx`. Fetch orders via `useMyOrders()`. Render order cards showing: orderNumber, concert name (from concertId — may need lookup or included in serialized response), status badge, totalAmountVnd formatted as VND, createdAt date. Sort by createdAt desc. Show empty state with link to `/events` when no orders. Show skeletons during loading.
- [x] 5.2 Create a reusable `OrderStatusBadge` component in `apps/audience-web/src/features/account/components/OrderStatusBadge.tsx`. Map statuses to Vietnamese labels and badge variants: PENDING_PAYMENT → "Chờ thanh toán" (warning), PAID → "Đã thanh toán" (success), EXPIRED → "Hết hạn" (muted), CANCELLED → "Đã hủy" (destructive), REFUNDED → "Đã hoàn tiền" (info), FAILED → "Thất bại" (destructive).
- [x] 5.3 Create a `ReservationCountdown` component in `apps/audience-web/src/features/account/components/ReservationCountdown.tsx`. Accept `reservationExpiresAt` (ISO string), display mm:ss countdown, fire an `onExpired` callback when reaching zero.

## 6. Frontend — Order Detail Page

- [ ] 6.1 Create `apps/audience-web/src/features/account/OrderDetailPage.tsx`. Fetch order via `useOrderDetail(id)` using `useParams()`. Display: order number, status badge, total amount, creation date, line items table (ticket type, qty, unit price), payment timestamps (paidAt, cancelledAt, expiredAt when applicable), reservation countdown for PENDING_PAYMENT orders.
- [ ] 6.2 Add "Continue Payment" button visible only when status is `PENDING_PAYMENT` and reservation has not expired. On click, show payment provider selection (can be a simple dropdown or buttons for VNPay/Momo). Call `useInitiatePayment()` with orderId, selected provider, and a generated idempotency key. On success, redirect to `redirectUrl` via `window.location.href`.
- [ ] 6.3 Add "Cancel Order" button visible only when status is `PENDING_PAYMENT`. On click, open a confirmation dialog (shadcn `Dialog`). On confirm, call `useCancelOrder()`. On success, the query invalidation refreshes the page showing CANCELLED status. On error, show toast/alert with the error message.
- [ ] 6.4 Create `apps/audience-web/src/shared/lib/idempotency.ts` with a `generateIdempotencyKey()` utility (UUID v4 or crypto.randomUUID) if it doesn't already exist.

## 7. Frontend — My Tickets Page

- [ ] 7.1 Create `apps/audience-web/src/features/account/MyTicketsPage.tsx`. Fetch tickets via `useMyTickets()`. Render ticket cards showing: concert name, ticket type, ticketNumber, status badge, event date. Show empty state with link to `/events` when no tickets. Show skeletons during loading.
- [ ] 7.2 Create a reusable `TicketStatusBadge` component in `apps/audience-web/src/features/account/components/TicketStatusBadge.tsx`. Map statuses: ISSUED → "Hợp lệ" (green), CHECKED_IN → "Đã check-in" (blue), VOIDED → "Đã hủy" (gray), REFUNDED → "Đã hoàn tiền" (gray).

## 8. Frontend — Ticket Detail / Wallet Page

- [ ] 8.1 Install `qrcode.react` (or `react-qr-code`) as a dependency in `apps/audience-web/package.json`.
- [ ] 8.2 Create `apps/audience-web/src/features/account/TicketDetailPage.tsx`. Fetch ticket via `useTicketDetail(id)`. Render mobile-first wallet card layout: large QR code (min 280px, SVG) from `qrPayload` centered at top, brightness hint text below QR, concert name, venue, date/time, ticket type, seat/zone, ticket number, status badge, checked-in timestamp if applicable. Minimal chrome — back button only.
- [ ] 8.3 Handle edge cases: QR payload absent (show "QR unavailable, please refresh" message), VOIDED ticket (dim/overlay QR with voided indicator), CHECKED_IN ticket (show QR with checked-in overlay and timestamp). Loading state with skeleton matching wallet layout.

## 9. Frontend — Routing

- [ ] 9.1 Update `apps/audience-web/src/app/router.tsx` to add nested routes under `/account`: `/account` (AccountPage), `/account/orders` (MyOrdersPage), `/account/orders/:id` (OrderDetailPage), `/account/tickets` (MyTicketsPage), `/account/tickets/:id` (TicketDetailPage). Use lazy loading (`React.lazy` + `Suspense`) for all new pages to keep initial bundle small.
- [ ] 9.2 Wrap all `/account/*` routes with `AudienceProtectedRoute` — either as a layout element or within each page component (match existing pattern).

## 10. Integration Verification

- [ ] 10.1 Verify the full flow end-to-end: login as AUDIENCE user → navigate to /account → see profile → click My Orders → see order list → click an order → see detail → test Continue Payment on a PENDING_PAYMENT order → test Cancel Order → navigate to My Tickets → see ticket list → click a ticket → see wallet card with QR code.
- [ ] 10.2 Verify mobile responsiveness: test ticket wallet card on 375px viewport, ensure QR is scannable size, text is readable, touch targets are adequate.
- [ ] 10.3 Verify error states: unauthenticated redirect to login, 404 for non-owned order/ticket, network error displays with retry, expired reservation disables Continue Payment.
