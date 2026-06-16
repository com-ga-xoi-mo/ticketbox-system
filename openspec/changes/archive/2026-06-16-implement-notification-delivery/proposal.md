## Why

TicketBox needs notification delivery in Wave 2 so paid orders can produce customer-visible confirmation evidence without coupling ticket/payment logic to email infrastructure. The accepted `notification-delivery` target spec already defines purchase confirmations, retry behavior, and channel extensibility; this change implements the first notification slice for Member 4 without changing the target requirements.

## What Changes

- Add a clean/hexagonal `notification` backend module for in-app notification persistence and delivery orchestration.
- Implement persistence for `notifications` and `notification_attempts` using the existing Prisma/PostgreSQL schema.
- Define notification domain ports for persistence and channel delivery so email, in-app, and future SMS/Zalo adapters stay outside application use cases.
- Add email notification adapters for deterministic local delivery and Maildev/SMTP demo delivery, with `local` remaining the default.
- Clarify that purchase confirmation emails must include an e-ticket access URL supplied by the future `order.paid` event contract.
- Add a Maildev/SMTP demo path so the team can show a visible inbox at `http://localhost:1080`, while keeping deterministic local email as the default test adapter.
- Add a BullMQ-backed purchase confirmation worker that consumes a future `order.paid` event contract and creates/sends in-app plus email confirmation notifications.
- Track notification retry attempts without rolling back paid orders or ticket issuance when email delivery fails.
- Add tests for notification persistence, email adapter behavior, queue/worker behavior, and retry handling.
- Do not implement concert reminders in this change; `implement-concert-reminders` owns the 24-hour scheduled reminder worker.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None.

This change implements behavior already covered by the accepted `notification-delivery` target spec. It does not change target requirements, so no specs delta is needed unless implementation later reveals a contract gap.

## Impact

- Affected code: new notification module under `packages/backend/src/notification/`, worker processor wiring, queue constants/registration, and focused tests.
- Affected database tables: existing `notifications` and `notification_attempts` models from the Prisma baseline.
- Affected systems: PostgreSQL for persisted notification state, BullMQ/Redis for worker execution and retries, deterministic local email delivery, and Maildev/SMTP for local inbox demo evidence.
- Cross-team contract: expects a future `order.paid` worker event containing enough order, user, concert, ticket access URL, and email data to enqueue purchase confirmation notifications.
- Primary references: `openspec/specs/notification-delivery/spec.md`, `blueprint/design.md`, `blueprint/specs/notification.md`, `docs/team-change-plan.md`, and `docs/roadmap.md`.
- Branch: `feature/implement-notification-delivery`.
