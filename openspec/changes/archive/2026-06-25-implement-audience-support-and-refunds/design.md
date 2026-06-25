## Context

The current system has an audience app in `apps/audience-web` that is separate from organizer/admin `apps/web`. Audience users can authenticate, browse concerts, create orders, initiate payment, view order history, and open QR ticket details. Backend order, ticket, payment, and notification modules already exist, and `@ticketbox/api-types` is the shared contract package used at HTTP boundaries.

Post-purchase support is currently missing as a product surface. The database already has order, payment, ticket, and notification state, including `REFUNDED` status values, but there is no audience support request model, refund request model, notification inbox API, read state, resend endpoint, or ticket/confirmation download contract.

## Goals / Non-Goals

**Goals:**
- Provide a polished Ticketbox.vn-like support/account experience for authenticated `AUDIENCE` users in `apps/audience-web`.
- Add support requests linked to an owned order, owned ticket, or general account context.
- Add refund request submission and tracking for eligible owned paid orders/tickets.
- Reuse existing order, ticket, payment, and notification behavior wherever possible.
- Add an audience notification center with in-app inbox, read/unread state, categories, and resource deep links.
- Add safe ticket resend by email and downloadable ticket/order confirmation views without persisting raw QR payloads.
- Define framework-independent shared API contracts before implementation.

**Non-Goals:**
- Full payment-provider refund settlement, provider reversal calls, accounting reconciliation, or fiscal invoice issuance.
- Organizer/admin support consoles beyond the minimal backend status hooks needed to keep request status transitions testable.
- Replacing the existing order, ticket, payment, or notification architecture.
- Moving audience features into `apps/web`.

## Decisions

### Decision 1: Add an audience support module around owned resources

Create a backend support slice with application use cases, Prisma repositories, and audience HTTP adapters for listing, creating, and reading support and refund requests. Requests SHALL always be scoped by authenticated audience user ID and optional owned `orderId` or `ticketId`.

Alternative considered: store support/refund data as generic notifications only. That would make inbox display easy but would not provide durable request state, auditability, or eligibility rules. Dedicated request records keep support workflow state separate from notification delivery.

### Decision 2: Model refunds as request/status workflow first

Refund requests SHALL have their own statuses such as `REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, and `CANCELLED`. Creating or approving a request SHALL NOT call payment providers or mark `Payment.status`/`Order.status` as `REFUNDED` unless a later settlement change explicitly adds that behavior.

Alternative considered: immediately mutate orders and payments to refunded. That is too risky because the current payment providers are built around initiation/callback reliability, not provider refund settlement.

### Decision 3: Extend notifications for inbox metadata and read state

Add notification fields needed for audience inbox behavior, such as `readAt`, `actionUrl`, `resourceType`, `resourceId`, and optional metadata. The notification center SHALL expose only notifications belonging to the authenticated user, with pagination/filtering and mark-read operations. Email delivery remains worker-driven; in-app notifications are persisted and visible through the inbox API.

Alternative considered: keep read state in frontend local storage. That would break across devices and would not allow unread counts to remain consistent after login.

### Decision 4: Resend tickets through notification delivery without reissuing tickets

Ticket resend SHALL create a new explicit resend notification or delivery job that loads existing issued tickets and recreates QR images transiently using the same QR token service used by purchase confirmations. It SHALL NOT issue tickets again, store QR payloads, or bypass ownership checks. The endpoint SHALL rate-limit or dedupe repeated resend attempts.

Alternative considered: replay the original purchase confirmation notification by dedupe key. Existing purchase confirmation idempotency is per paid order and is designed to prevent duplicates, so resend needs an explicit user-requested delivery path.

### Decision 5: Use printable/downloadable views from canonical order/ticket data

Download endpoints SHALL return either a stable JSON/HTML contract for the audience app to render/print or a lightweight generated document only if already supported by existing infrastructure. Ticket downloads SHALL derive QR payloads transiently. Order confirmation downloads SHALL be invoice-like purchase confirmations, not legal tax invoices.

Alternative considered: store generated PDFs or QR images in object storage. That adds storage lifecycle and sensitive QR material handling without being required for this workflow.

### Decision 6: Keep shared API contracts as the boundary

New support, refund, notification inbox, resend, and download response schemas SHALL live in `packages/api-types` and be consumed by backend HTTP adapters and audience web API clients. Backend domain/application layers SHALL not depend on `@ticketbox/api-types`.

Alternative considered: define local frontend types first. That would repeat earlier contract drift problems and weaken backend/frontend compatibility tests.

## Risks / Trade-offs

- Refund approval without provider settlement could confuse users if copy is vague -> Use explicit UI/status labels such as "refund request approved" and avoid saying money was returned until settlement exists.
- Notification inbox schema changes could disturb existing delivery workers -> Add nullable columns and preserve current queue names, job payloads, and email behavior.
- Resend can be abused for email spam -> Add dedupe/rate limiting and show clear cooldown feedback in the audience UI.
- Downloaded QR tickets can be shared outside the account -> Keep existing QR/check-in validation as the source of truth and do not persist raw QR payloads.
- Support/refund tables add ownership-sensitive endpoints -> Cover every endpoint with authenticated audience guards and ownership tests for cross-user order/ticket IDs.

## Migration Plan

1. Add Prisma enums/tables for support requests and refund requests, plus nullable notification inbox metadata/read-state fields.
2. Generate Prisma client and implement repositories/use cases behind backend module boundaries.
3. Add shared API contracts and contract tests before wiring HTTP adapters and audience clients.
4. Add audience web API clients and pages behind authenticated routes.
5. Add backend e2e tests for ownership, eligibility, status tracking, resend, download, and notification read-state behavior.
6. Rollback by disabling new audience routes and reverting the additive migration; no existing payment/order/ticket state mutation is required by the initial workflow.

## Open Questions

- Which refund reasons and support categories should be shown in Vietnamese copy for the first release?
- Should support request attachments be included in this change or deferred until object-storage upload behavior is needed for audience support?
- Who is allowed to transition refund/support statuses in the first backend implementation if organizer/admin consoles remain out of scope?
