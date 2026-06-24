## Why

Audience members who purchase tickets through Ticketbox currently have no way to view their order history, check ticket status, or present tickets for gate entry within `apps/audience-web`. The account page is a placeholder ("đang được phát triển"). Without these surfaces, customers must rely on email confirmations or external channels, leading to support overhead and a poor post-purchase experience. All backend endpoints (`/me/profile`, `/me/orders`, `/me/tickets`) already exist — the gap is purely on the frontend.

## What Changes

- **Audience profile surface**: Display authenticated user's profile (name, email, roles) via `GET /me/profile` in the account area.
- **My Orders page**: List all orders with status badges (`PENDING_PAYMENT`, `PAID`, `EXPIRED`, `CANCELLED`, `REFUNDED`), total amount, creation date, and reservation countdown for pending orders.
- **Order detail page**: Show line items, ticket types, quantities, pricing, payment state, and timestamps. Include "Continue Payment" action for `PENDING_PAYMENT` orders (via existing `POST /orders/:id/payment`).
- **Cancel pending order**: Add a new audience-facing `POST /me/orders/:id/cancel` backend endpoint that transitions a `PENDING_PAYMENT` order to `CANCELLED`. The internal `TransitionOrderStatusUseCase` already supports this transition — this adds a thin audience-scoped route with ownership verification.
- **My Tickets page**: List all issued tickets with concert info, ticket type, and status.
- **Ticket detail page**: Show full ticket information (concert, venue, date, ticket type, seat/zone, status, checked-in timestamp) with a prominently rendered QR code from the dynamically-generated `qrPayload` (via `GET /me/tickets/:id`).
- **Mobile-first ticket wallet**: The ticket detail page is designed as a mobile-optimized "wallet card" suitable for presenting at venue gates — large QR, high contrast, minimal chrome.

## Capabilities

### New Capabilities
- `audience-account-profile`: Account landing page displaying user profile information and navigation to orders/tickets.
- `audience-order-history`: My Orders list and Order detail pages with status tracking, continue-payment, and cancel-pending-order flows.
- `audience-ticket-wallet`: My Tickets list and Ticket detail page with QR code rendering optimized for mobile gate entry.
- `cancel-pending-order-api`: Minimal backend endpoint (`POST /me/orders/:id/cancel`) allowing audience users to cancel their own pending orders.

### Modified Capabilities
_(none — no existing spec-level requirements change)_

## Impact

- **`apps/audience-web`**: Major additions — new pages, API client functions, React Query hooks, route registrations. Replaces the placeholder `AccountPage.tsx`.
- **`packages/backend` (ordering module)**: One new controller method + route for audience order cancellation. Reuses existing `TransitionOrderStatusUseCase`.
- **Shared API client (`apps/audience-web/src/shared/api/`)**: New modules for orders, tickets, and profile fetch functions.
- **Routing**: New protected routes under `/account/*` in the audience-web router.
- **No impact** on `apps/web` (organizer/admin portal), check-in app, or existing payment gateway integrations.
