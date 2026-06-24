## Context

`apps/audience-web` is a Vite + React 18 SPA using react-router-dom v6, Tailwind CSS v4, shadcn/ui primitives, and @tanstack/react-query. It currently serves event discovery (homepage, event list, event detail) and has a placeholder account page. The backend (NestJS) already exposes all required `/me/*` endpoints for profile, orders, and tickets behind `JwtAuthGuard` + `RolesGuard(AUDIENCE)`. Payment initiation (`POST /orders/:id/payment`) also exists. The only missing backend piece is an audience-facing order cancellation route — internal status transitions already support `PENDING_PAYMENT → CANCELLED`.

The audience-web API layer (`shared/api/`) follows a consistent pattern: fetch functions using `apiGet`/`apiPost` from `client.ts`, Zod schema validation via `@ticketbox/api-types`, and React Query hooks with structured query key factories (see `catalog.ts` as the reference pattern).

## Goals / Non-Goals

**Goals:**
- Deliver a complete post-purchase experience for AUDIENCE users: profile view, order history with detail, ticket wallet with QR display.
- Mobile-first ticket detail designed for gate entry — large QR, high contrast, minimal chrome.
- Allow audience to continue payment on `PENDING_PAYMENT` orders and cancel them.
- Follow existing codebase patterns exactly (file structure, API client, React Query, shadcn/ui, `AudienceProtectedRoute`).

**Non-Goals:**
- Editing profile (name, email, password change) — out of scope.
- Push notifications or real-time order status updates (WebSocket).
- Offline ticket caching or PWA capabilities.
- Refund initiation by audience (admin-only flow).
- Any changes to `apps/web` (organizer/admin portal).
- Re-implementing QR payload generation — reuse existing `GET /me/tickets/:id` which generates it dynamically.
- Checkout/purchase flow (separate concern, already partially in progress elsewhere).

## Decisions

### 1. Route structure under `/account/*`

**Decision:** Nest all authenticated audience pages under `/account` with sub-routes.

```
/account            → Account landing (profile + nav to orders/tickets)
/account/orders     → My Orders list
/account/orders/:id → Order detail
/account/tickets    → My Tickets list
/account/tickets/:id → Ticket detail (wallet view)
```

**Rationale:** Groups all post-auth pages logically. The existing `/account` route already points to `AccountPage` — we transform it into a layout route with nested children. This avoids polluting the top-level route namespace and aligns with Ticketbox.vn's navigation pattern.

**Alternatives considered:**
- Flat routes (`/orders`, `/tickets`) — rejected because these could conflict with public-facing routes and don't communicate "my" ownership semantically.
- `/me/*` routes — rejected; `/me` is a backend convention, not a frontend URL pattern.

### 2. API client module structure

**Decision:** Create two new API modules following the `catalog.ts` pattern:
- `shared/api/orders.ts` — `fetchMyOrders()`, `fetchOrderDetail(id)`, `cancelOrder(id)`, `initiatePayment(id, dto)` + React Query hooks + query key factory.
- `shared/api/tickets.ts` — `fetchMyTickets()`, `fetchTicketDetail(id)` + React Query hooks + query key factory.
- `shared/api/profile.ts` — `fetchMyProfile()` + React Query hook.

**Rationale:** Matches the established pattern in `catalog.ts` — separate modules per domain, query key factories for cache management, Zod validation of responses.

### 3. QR code rendering

**Decision:** Use a lightweight client-side QR library (`qrcode.react` or `react-qr-code`) to render the `qrPayload` string returned by `GET /me/tickets/:id`.

**Rationale:** The backend dynamically generates and signs the `qrPayload` on each request. The frontend only needs to render the string as a QR code. No need for image-based QR — SVG rendering is sharper, scales well on mobile, and works offline once loaded.

**Alternatives considered:**
- Backend-generated QR image endpoint — rejected; adds unnecessary backend complexity. The payload is already a string suitable for client-side rendering.
- Canvas-based QR — rejected; SVG is resolution-independent and better for mobile screens.

### 4. Cancel pending order — minimal backend addition

**Decision:** Add `POST /me/orders/:id/cancel` to `OrderController` (audience-facing, not internal). The handler verifies ownership (`userId` match), checks order status is `PENDING_PAYMENT`, and delegates to existing `TransitionOrderStatusUseCase` to transition to `CANCELLED`.

**Rationale:** The transition logic already exists in `TransitionOrderStatusUseCase`. The internal endpoint (`PATCH /orders/:id/status`) requires an API key and is not audience-accessible. We need a thin audience-scoped route with ownership verification. Using POST (not DELETE or PATCH) because this is an action, not a resource deletion.

**Alternatives considered:**
- Expose the internal PATCH endpoint to audience — rejected; it allows arbitrary status transitions which is a security concern.
- Client-side only (hide cancel button, let orders expire) — rejected; poor UX, users expect to be able to cancel.

### 5. Account page as layout with tab navigation

**Decision:** Transform `AccountPage` into an account layout with tab-style navigation (Profile, Orders, Tickets). The landing view shows profile info and summary cards linking to orders and tickets.

**Rationale:** Provides a dashboard feel consistent with Ticketbox.vn. Uses shadcn `Tabs` component for navigation within the account area. On mobile, tabs stack or scroll horizontally.

### 6. Ticket wallet — mobile-first design

**Decision:** The ticket detail page renders as a "wallet card" optimized for gate presentation:
- Full-width QR code (minimum 280px) centered prominently.
- Concert name, date, venue, ticket type, and seat/zone info below the QR.
- Status badge (ISSUED, CHECKED_IN, VOIDED) with color coding.
- High contrast (dark background, light text) option or system-default.
- Minimal navigation chrome — back button only.
- Auto-brightness hint (inform user to increase screen brightness).

**Rationale:** The primary use case for ticket detail is presenting at venue gates. The QR must be scannable quickly. Mobile screens vary in size but a 280px+ QR is reliably scannable by most barcode readers.

### 7. Continue payment flow

**Decision:** On the order detail page, if order status is `PENDING_PAYMENT` and `reservationExpiresAt` has not passed, show a "Continue Payment" button. This calls `POST /orders/:id/payment` with a payment provider selection. On success, redirect the user to the payment gateway URL returned in the response.

**Rationale:** Reuses the existing `InitiatePaymentUseCase` which already handles idempotency. The `reservationExpiresAt` check prevents initiating payment on soon-to-expire orders.

## Risks / Trade-offs

- **[Risk] QR library bundle size** → Mitigation: `qrcode.react` is ~12KB gzipped. Acceptable for a ticket app. Lazy-load the ticket detail page to keep initial bundle small.
- **[Risk] Expired reservation race condition** — user clicks "Continue Payment" right as reservation expires → Mitigation: Backend `InitiatePaymentUseCase` already validates order status. Frontend shows a countdown timer and disables the button when expired. Surface the backend error gracefully.
- **[Risk] Cancel + payment race condition** — user cancels while a payment callback arrives → Mitigation: Backend `TransitionOrderStatusUseCase` enforces valid state transitions. `PAID` cannot transition to `CANCELLED`. The cancel attempt would fail with a clear error.
- **[Trade-off] No offline ticket support** — QR is fetched on-demand from the backend, requiring network at gate → Acceptable for MVP. Future enhancement could cache the last-fetched QR in localStorage.
- **[Trade-off] Adding a new backend endpoint** — Minimal surface area (one route, one guard check, delegates to existing use case). Low risk.

## Open Questions

- Should the cancel confirmation use a modal dialog or navigate to a confirmation page? (Recommendation: modal dialog using shadcn `Dialog` — fewer route changes, faster UX.)
- Should we add `@ticketbox/api-types` Zod schemas for order/ticket responses, or define them locally? (Recommendation: add to `api-types` package for consistency with `catalog.ts` pattern, but can defer to local types if api-types changes are complex.)
