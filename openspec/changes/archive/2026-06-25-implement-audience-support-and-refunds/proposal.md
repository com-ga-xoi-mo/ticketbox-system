## Why

Audience users can already buy tickets, view orders, and open QR tickets, but the post-purchase experience is incomplete once they need help, need tickets resent, want proof of purchase, or need to request a refund. Adding a dedicated support, refund, and notification inbox flow reduces manual support friction while keeping refund settlement separate from the current payment-provider maturity.

## What Changes

- Add an audience support center in `apps/audience-web` linked from account, order detail, and ticket detail pages.
- Allow an authenticated `AUDIENCE` user to create support requests for an owned order or ticket, view request details, and track status updates.
- Add a refund request workflow for eligible paid orders or issued tickets, with request submission, eligibility messaging, and status tracking.
- Add ticket resend-by-email actions that reuse the existing notification delivery path where purchase confirmation delivery is supported.
- Add downloadable ticket and invoice-like confirmation views when the current ticket/order data is sufficient; do not add fiscal invoice or tax-settlement behavior.
- Add an audience notification center for purchase confirmations, event reminders, payment failures, refund/support updates, and ticket-related messages, including read/unread state.
- Add backend persistence, authenticated endpoints, and shared API contracts only where needed for support requests, refund requests, notification inbox/read state, ticket resend, and downloadable ticket/confirmation responses.
- Do not implement full payment-provider refund settlement in this change; refund processing starts as an internal request/status workflow.

## Capabilities

### New Capabilities
- `audience-support-center`: Audience post-purchase support, support request creation, refund request submission, ticket resend, and ticket/order confirmation downloads.
- `audience-notification-center`: Audience notification inbox, notification categories, read/unread state, and deep links to related order/ticket/support/refund records.

### Modified Capabilities
- `audience-order-history`: Order pages expose support, refund, resend, download, and refund/support status entry points for owned orders.
- `audience-ticket-wallet`: Ticket pages expose support, refund, resend, download, and status entry points for owned tickets.
- `notification-delivery`: Existing persisted in-app and email notification behavior expands to include support/refund/ticket update messages and safe resend of ticket purchase confirmations.
- `shared-api-contracts`: Shared contract package gains framework-independent schemas and types for support, refund, notification inbox, resend, and download-related audience HTTP responses.

## Impact

- `apps/audience-web`: account navigation, support center pages, notification center pages, order/ticket detail actions, responsive Ticketbox.vn-like support UI using existing shadcn-style primitives and Ant Design components where useful.
- `packages/backend`: new or extended audience-facing HTTP adapters, application use cases, repositories, and Prisma-backed persistence for support/refund requests and notification read state.
- `packages/api-types`: new shared Zod contracts for audience support/refund/notification/ticket-download flows, exported through the public package boundary.
- `prisma`: migrations for support/refund request records and any notification inbox fields required for read state or deep links.
- `test`: backend unit/e2e coverage, shared contract tests, and audience web component/API-client tests for the post-purchase flows.
