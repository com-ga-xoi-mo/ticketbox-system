## Why

The audience-web app (`apps/audience-web`) has a functional event detail page with ticket type display, sale-window indicators, and quantity selection — but the "Tiếp tục mua vé" button is a dead end. The backend already implements inventory reservation, order lifecycle, payment gateway abstraction (simulator, MoMo, VNPay), idempotency, circuit breakers, and QR e-ticket issuance. The missing piece is the frontend checkout-and-payment flow that connects ticket selection to order creation, payment, and result confirmation.

## What Changes

- **Connect the "Tiếp tục mua vé" button** on `EventDetailPage` to initiate checkout with the selected ticket quantities.
- **Order creation flow**: POST to `/checkout/orders` with idempotency key, display reservation countdown timer, handle reservation expiry.
- **Payment initiation**: POST to `/orders/:id/payment` with idempotency key, redirect user to provider payment URL (simulator/MoMo/VNPay).
- **Payment return/result page**: Handle provider redirect-back, poll `GET /me/orders/:id` for authoritative payment status, display success/failure/pending states.
- **Order detail page**: Show order summary, ticket details, and QR codes for paid orders.
- **My orders page**: List the authenticated user's orders with status indicators.
- **Error handling UI**: Sold-out, per-user limit exceeded, sale-window closed, reservation expired, payment provider unavailable, rate-limited, and duplicate submission — all surfaced with clear user feedback.
- **Minimal backend addition**: A `GET /me/orders/:id/status` lightweight polling endpoint or reuse `GET /me/orders/:id` with status field, plus ensure the frontend payment return URL is configured in provider redirects.

## Capabilities

### New Capabilities
- `audience-checkout`: The end-to-end checkout flow in audience-web — order creation with idempotency, reservation countdown, payment provider selection, payment redirect handling, status polling, result display, and structured error states for all known failure modes.

### Modified Capabilities
- `audience-event-detail`: The "Tiếp tục mua vé" button must navigate to the checkout flow (or open a checkout modal/sheet) passing the selected ticket type quantities. Requires auth gate — unauthenticated users are redirected to login with return URL.

## Impact

- **Frontend (`apps/audience-web`)**: New routes (`/checkout`, `/orders`, `/orders/:id`), new API client functions for ordering and payment, new pages and components.
- **Routing**: `router.tsx` gains checkout and order routes; some routes require authentication guards.
- **API client**: New functions in `shared/api/` for checkout, payment, and order queries wrapping existing backend endpoints.
- **Backend**: Minimal — verify `GET /me/orders/:id` returns sufficient fields for frontend polling (status, reservation expiry, payment URL). May need a `returnUrl` query parameter on payment initiation so providers redirect back to the audience-web result page.
- **Shared types (`@ticketbox/api-types`)**: May need frontend-facing order/payment response types if not already exported.
- **Auth**: Checkout and order pages require authenticated AUDIENCE user; login redirect with return URL support needed.
