## 1. Contracts and Data Model

- [x] 1.1 Add `@ticketbox/api-types` contracts for support request create/list/detail responses, status enums, and validation tests.
- [x] 1.2 Add `@ticketbox/api-types` contracts for refund eligibility, refund request create/list/detail responses, status enums, and validation tests.
- [x] 1.3 Add `@ticketbox/api-types` contracts for notification inbox list, unread count, mark-read, mark-all-read, and notification resource metadata.
- [x] 1.4 Add `@ticketbox/api-types` contracts for ticket resend, ticket download, and order confirmation download responses.
- [x] 1.5 Add Prisma enums/models for support requests, refund requests, and status history records with ownership links to users, orders, and tickets.
- [x] 1.6 Add additive Prisma fields for notification inbox read state and resource/action metadata while preserving existing notification delivery fields.
- [x] 1.7 Generate Prisma client and update seed/test helpers only where required by the new schema.

## 2. Backend Support and Refund Workflow

- [x] 2.1 Create backend support module structure with domain types, repository ports, Prisma repository, application use cases, and NestJS providers.
- [x] 2.2 Implement support request create/list/detail use cases with audience ownership validation for linked orders and tickets.
- [x] 2.3 Implement refund eligibility and refund request create/list/detail use cases without payment-provider settlement.
- [x] 2.4 Implement duplicate active refund request detection for the same order or ticket.
- [x] 2.5 Implement status history persistence for support and refund request status changes.
- [x] 2.6 Add audience HTTP controllers for support and refund endpoints guarded by authenticated `AUDIENCE` access.
- [x] 2.7 Add backend unit tests for ownership, eligibility, duplicate refund requests, and status history behavior.
- [x] 2.8 Add backend e2e tests proving cross-user order/ticket/support/refund access returns `404`.

## 3. Backend Notifications, Resend, and Downloads

- [x] 3.1 Extend notification persistence mapping for `readAt`, action URL, resource type, resource ID, and optional metadata.
- [x] 3.2 Add audience notification inbox use cases for list/filter, unread count, mark one read, and mark all read.
- [x] 3.3 Add audience notification HTTP endpoints using the shared notification inbox contracts.
- [x] 3.4 Add support/refund notification creation hooks that do not roll back support/refund state changes if notification creation fails.
- [x] 3.5 Implement user-requested ticket resend for paid orders and issued tickets using existing ticket reads, QR generation, and email delivery behavior.
- [x] 3.6 Add resend cooldown or dedupe handling and tests for repeated resend requests.
- [x] 3.7 Implement ticket download and order confirmation data endpoints with transient QR payload generation and no persisted raw QR material.
- [x] 3.8 Add backend tests for notification read state, resend ownership, resend non-duplication, and download ownership.

## 4. Audience Web API Clients

- [ ] 4.1 Add audience web API clients and React Query hooks for support request and refund request flows using shared schemas.
- [ ] 4.2 Add audience web API clients and hooks for notification inbox, unread count, mark-read, and mark-all-read flows.
- [ ] 4.3 Add audience web API clients and mutations for ticket resend, ticket download, and order confirmation download flows.
- [ ] 4.4 Add localized error parsing for support, refund eligibility, resend cooldown, and download unavailable responses.
- [ ] 4.5 Add API-client tests covering successful parsing and controlled error handling.

## 5. Audience Web UI

- [ ] 5.1 Add authenticated support center routes/pages in `apps/audience-web`, linked from account navigation.
- [ ] 5.2 Build support request list/detail/create UI with responsive shadcn-style primitives and Ant Design components where they improve forms, tabs, timeline, result states, modal confirmations, or uploads.
- [ ] 5.3 Build refund eligibility and refund request UI for order and ticket contexts with clear non-settlement copy.
- [ ] 5.4 Add notification center route/page with tabs or filters, unread count, mark-read actions, and resource deep links.
- [ ] 5.5 Extend order detail pages with support, refund, resend, and order confirmation actions based on order status and eligibility.
- [ ] 5.6 Extend ticket detail pages with support, refund, resend, and ticket download actions based on ticket status and eligibility.
- [ ] 5.7 Add printable/downloadable ticket and order confirmation views that label confirmations accurately and keep QR display scannable.
- [ ] 5.8 Add loading, empty, success, error, cooldown, and unauthorized states for all new audience flows.
- [ ] 5.9 Add audience web component/page tests for support center, refund flow, notification center, order actions, and ticket actions.

## 6. Integration and Verification

- [ ] 6.1 Run shared contract tests for `@ticketbox/api-types`.
- [ ] 6.2 Run backend unit and e2e tests covering support, refund, notification inbox, resend, and download behavior.
- [ ] 6.3 Run audience web tests and verify responsive layouts for mobile and desktop account/support flows.
- [ ] 6.4 Run repository lint/typecheck/build commands required by the affected workspaces.
- [ ] 6.5 Manually verify an end-to-end audience path: paid order -> ticket detail -> support request -> refund request -> notification update -> resend -> download confirmation.
