## Context

The audience-web app (`apps/audience-web`) is a React 18 + Vite SPA using react-router-dom, TanStack Query, Tailwind CSS, and shadcn/ui primitives. It currently displays concert listings and event detail pages with ticket type quantity selectors, but the checkout button is non-functional.

The backend (`packages/backend`) already implements the full order-and-payment lifecycle:
- `POST /checkout/orders` — atomic inventory reservation with idempotency key
- `GET /me/orders/:id` — order detail with status, items, timestamps
- `POST /orders/:id/payment` — payment initiation with idempotency key, returns provider redirect URL
- Payment providers: simulator, MoMo sandbox, VNPay sandbox — all with IPN/callback handling
- Circuit breaker, payment idempotency, reservation expiry worker, QR e-ticket issuance

The frontend API client (`shared/api/client.ts`) provides `apiGet` and `apiPost` wrappers with JWT auth headers and 401 handling.

Current routes: `/`, `/events`, `/events/:slug`, `/account`, `/login`.

## Goals / Non-Goals

**Goals:**
- Connect EventDetailPage ticket selection to a checkout flow that creates a pending order
- Display reservation countdown and handle expiry gracefully
- Initiate payment and redirect user to the payment provider
- Handle payment return with status polling and display success/failure/pending results
- Provide "My Orders" and order detail views with QR ticket display for paid orders
- Surface all known error states (sold out, per-user limit, sale window, rate limit, provider unavailable, duplicate submission) with clear Vietnamese-language user feedback
- Require authentication before checkout, redirecting to login with return URL

**Non-Goals:**
- Rebuilding or modifying backend inventory reservation, payment idempotency, circuit breaker, or QR issuance logic
- Adding new user roles — AUDIENCE role already exists
- Implementing refund or cancellation flows (future work)
- Building an order management admin UI
- Supporting seat-specific selection (zone-level only for now)
- Implementing real-time WebSocket updates (polling is sufficient)

## Decisions

### 1. Page-based checkout flow vs. modal/drawer

**Decision**: Page-based flow with dedicated `/checkout` route.

**Rationale**: A multi-step checkout (review → payment → result) benefits from URL-addressable states. The user can bookmark or share a "waiting for payment" link. Browser back/forward works naturally. Modals/drawers would require managing complex state within EventDetailPage and break on refresh.

**Alternatives considered**:
- Full-page modal overlay: Harder to deep-link, loses scroll position on event detail
- Drawer/sheet: Too small for order summary + countdown + payment options on mobile

### 2. Idempotency key generation

**Decision**: Generate idempotency keys client-side using `crypto.randomUUID()` at the moment of user action (clicking "Tiếp tục mua vé" for checkout, clicking "Thanh toán" for payment). Store the key in component state to enable safe retries within the same session.

**Rationale**: Client-generated UUIDs are collision-resistant. The backend already validates idempotency keys and returns existing results for duplicates. Generating at click time (not render time) prevents accidental key reuse from re-renders.

**Alternatives considered**:
- Server-generated keys: Adds an extra round trip before every order creation
- Hash of cart contents: Would prevent legitimate re-orders of the same items

### 3. Reservation countdown implementation

**Decision**: Use `reservationExpiresAt` from the order response. Display a client-side countdown timer using `setInterval` with 1-second ticks. When the timer hits zero, show an "expired" state and disable the payment button. The next poll to `GET /me/orders/:id` confirms the backend has expired the order.

**Rationale**: The backend worker handles actual expiry. The frontend countdown is a UX hint — it does not need to be authoritative. Slight clock skew between client and server is acceptable because the backend is the source of truth.

### 4. Payment status polling strategy

**Decision**: After the user returns from the payment provider, poll `GET /me/orders/:id` every 3 seconds for up to 2 minutes. Stop polling when status transitions from `PENDING_PAYMENT` to a terminal state (`PAID`, `FAILED`, `EXPIRED`, `CANCELLED`). Show a "Processing payment..." intermediate state during polling.

**Rationale**: Payment provider callbacks (IPN) may arrive seconds after the user redirect. Polling is simple, reliable, and avoids WebSocket infrastructure. The 3-second interval balances responsiveness with server load. The 2-minute ceiling prevents indefinite polling — after that, show "Payment is being processed, check back later."

**Alternatives considered**:
- WebSocket/SSE: More responsive but adds infrastructure complexity for a feature that resolves in <30 seconds typically
- Single check on return: Would miss the common case where IPN hasn't arrived yet

### 5. Auth guard approach

**Decision**: Check auth state (JWT token exists) when the user clicks "Tiếp tục mua vé". If unauthenticated, redirect to `/login?returnTo=/events/:slug` with the current URL as return target. The login page reads `returnTo` and redirects back after successful auth.

**Rationale**: Allows browsing without login. Only gates the action that requires auth. The `returnTo` param preserves user intent. The existing `getToken()` function in `shared/auth/token-storage.ts` makes the check trivial.

**Alternatives considered**:
- Route-level auth guard on `/checkout`: Would block the page load instead of the action — worse UX for users who navigated directly
- Auth modal/popup: Adds complexity; separate login page is already built

### 6. Error mapping and display

**Decision**: Map backend error codes to Vietnamese user messages via a static lookup object. Display errors using Ant Design's `Result` component for full-page errors (expired, failed) and toast/alert for inline errors (sold out on increment, rate limited). Error codes: `INSUFFICIENT_INVENTORY`, `PER_USER_LIMIT_EXCEEDED`, `SALE_WINDOW_CLOSED`, `RESERVATION_EXPIRED`, `PAYMENT_PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `IDEMPOTENCY_CONFLICT`.

**Rationale**: Centralized error mapping is maintainable and testable. Using Ant Design's `Result` for terminal states provides a polished, Ticketbox.vn-style UX. Toast for recoverable errors keeps the user in flow.

### 7. State management

**Decision**: Use TanStack Query for server state (order details, payment status). Use React component state for local UI state (selected quantities, idempotency keys, countdown ticks). No global state store needed.

**Rationale**: TanStack Query already handles caching, refetching, and loading/error states. The checkout flow is linear — no complex cross-component state sharing needed. Adding Zustand/Redux would be over-engineering.

### 8. Component library usage

**Decision**: Use shadcn/ui primitives (Button, Card, Badge, Dialog, Input, Separator) for structural components. Use Ant Design's `Steps`, `Result`, `Skeleton`, and `Select` for flow-specific patterns where shadcn lacks opinionated equivalents.

**Rationale**: The existing codebase uses shadcn/ui. Ant Design fills gaps for multi-step progress indicators and result states that would require building from scratch with shadcn. Mixing is acceptable since Ant Design components are used selectively for specific patterns.

### 9. Backend additions

**Decision**: Minimal. The payment initiation endpoint `POST /orders/:id/payment` needs to accept and pass a `returnUrl` field so payment providers redirect the user back to `audience-web/orders/:id/result`. The existing `GET /me/orders/:id` response already contains `status`, `reservationExpiresAt`, order items, and totals — sufficient for frontend polling.

**Rationale**: Avoid backend scope creep. The `returnUrl` is the only field the frontend cannot control on the provider side. All other data is already exposed.

## Risks / Trade-offs

**[Clock skew on reservation countdown]** → The countdown timer may show a few seconds difference from the actual backend expiry. Mitigation: The countdown is advisory; the backend is authoritative. If the user clicks "pay" at T-1 second and the backend has already expired, the backend rejects the request and the frontend shows "reservation expired."

**[Payment provider redirect may not return]** → The user may close the provider page or lose connectivity. Mitigation: The order remains in `PENDING_PAYMENT`; the backend worker expires it after TTL. If the user returns to `/orders/:id`, they see the current status. The "My Orders" page always reflects the latest state.

**[Polling overhead under load]** → Many concurrent users polling every 3 seconds after a flash sale. Mitigation: Polling stops on terminal status. The `GET /me/orders/:id` endpoint is a simple DB read scoped to the user's own order. Rate limiting at the API gateway level can throttle excessive polling.

**[Ant Design + shadcn bundle size]** → Importing Ant Design components increases the JS bundle. Mitigation: Use tree-shakeable Ant Design v5 imports (`import { Steps } from 'antd'`). Only 4 components are needed. Lazy-load the checkout route so the cost is only paid when users enter checkout.

**[Stale availability data on EventDetailPage]** → Ticket availability shown on the detail page may be stale by the time the user checks out. Mitigation: The backend is authoritative — if availability changed, the `POST /checkout/orders` call will return an error. The frontend refetches availability on focus/visibility change via TanStack Query's `refetchOnWindowFocus`.
