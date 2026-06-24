## Context

The paid-order flow runs in the API process: a payment callback transitions the order to `PAID`
through `TransitionOrderStatusUseCase`, which calls the wired `IOrderEventPublisher`
(`TicketIssuingOrderEventPublisher`). That publisher issues e-tickets but stops there.

The notification side is already complete and idempotent:
- `PurchaseConfirmationNotificationProducer.enqueueOrderPaid(event)` adds a BullMQ job with a
  stable `jobId` (`order-paid-${event.eventId}`).
- The worker's `CreatePurchaseConfirmationNotificationsUseCase` upserts in-app + email notifications
  keyed by `purchase-confirmation:${orderId}:${channel}`, so duplicate jobs are harmless.

The only missing link is the **enqueue trigger** and the **data assembly** for the event, which
needs customer email/display name and concert title/start time — data owned by identity and
concert-management.

## Goals / Non-Goals

**Goals**
- Make the paid-order flow enqueue exactly one purchase confirmation per order, conforming to spec.
- Assemble the event without ordering importing identity/concert-management Prisma models directly.
- Keep the change idempotent and side-effect-isolated (a notification failure must not roll back the
  paid order or ticket issuance).

**Non-Goals**
- Changing the worker-side consumer or the notification persistence/delivery logic (already works).
- Changing any HTTP contract or DB schema.
- Email template/content redesign.

## Decisions

### D1: Assemble the event via a notification read port (mirror the reminder pattern)

Add `PurchaseConfirmationReadPort` in `notification/domain/ports` with a single
`findOrderPaidNotificationData(orderId)` returning `{ userId, userEmail, userDisplayName,
concertId, concertTitle, startsAt, ticketCount }` or `null`. Implement
`PrismaPurchaseConfirmationReadAdapter` in `notification/infrastructure/database` with one query
joining `order → user → concert` and counting issued tickets. This mirrors
`ConcertReminderReadPort`/`PrismaConcertReminderReadAdapter`, the established convention for
notification reading other modules' tables through a port at the infra boundary.

### D2: Ordering depends only on its own port; notification owns assembly + producer

- `EnqueuePurchaseConfirmationUseCase(orderId, paidAt)` in notification assembles the event (read
  port + config base URL) and calls the producer. Returns silently if the order is not found.
- Ordering defines `OrderPaidNotifierPort { notifyOrderPaid(orderId, paidAt) }`.
  `TicketIssuingOrderEventPublisher` injects it and calls it **after** `IssueTicketsForPaidOrderUseCase`
  succeeds. `order.module` provides the port via a factory that delegates to the notification
  use-case (imported from `NotificationModule`). No cycle: notification never imports ordering.

**Rationale:** keeps assembly + queueing cohesive inside notification, and keeps the ordering
publisher decoupled behind a one-method port. Matches the existing `IOrderEventPublisher` style.

### D3: Stable event id for dedup

`eventId = orderId` so the producer's `jobId` (`order-paid-${orderId}`) is stable; a retried
transition cannot create a second job. Persistence is independently idempotent via the dedupe key.

### D4: Confirmation is best-effort relative to ticket issuance

Tickets are issued first; the notify call runs after. Enqueue failure is logged and swallowed in the
publisher so it never rolls back the (already committed) paid order / issued tickets — consistent
with "retry delivery without rolling back the paid order" in the spec.

### D5: Ticket-access URL is configurable

Add `ticketAccessBaseUrl` to platform config (env `TICKET_ACCESS_BASE_URL`, sensible local default).
`ticketAccessUrl = ${ticketAccessBaseUrl}/orders/${orderId}/tickets`.

## Risks / Trade-offs

- **[Cross-module read coupling]** The notification adapter reads ordering/identity/concert tables.
  Accepted: identical to the existing reminder adapter; isolated behind a port.
- **[Two emitters in future]** If payment ever transitions orders to paid through a different
  publisher, that path must also call the notifier. Today there is a single `ORDER_EVENT_PUBLISHER`,
  so this is covered; noted for future maintainers.
