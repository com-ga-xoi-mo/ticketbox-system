# Fix: enqueue purchase confirmation notifications when an order is paid

## Why

The `notification-delivery` spec requires: **WHEN an order becomes paid THEN the system SHALL
enqueue confirmation notifications for the customer.** This behavior is currently broken
(BUG-001, manual testing 2026-06-23).

`TicketIssuingOrderEventPublisher.publishAll()` — the only `IOrderEventPublisher` wired in
`order.module.ts` — issues tickets for the paid order but **never enqueues the purchase
confirmation job**. `PurchaseConfirmationNotificationProducer.enqueueOrderPaid()` exists and the
worker-side `CreatePurchaseConfirmationNotificationsUseCase` is ready to consume the event, but
nothing in the paid-order flow calls the producer. Result: customers receive no in-app or email
confirmation after a successful payment.

## What Changes

- Add a notification read port + Prisma adapter that assembles the confirmation payload
  (customer email/display name, concert title/start time, ticket count) for a paid order — mirroring
  the existing `ConcertReminderReadPort` cross-module read pattern.
- Add an `EnqueuePurchaseConfirmationUseCase` in the notification module that, given `(orderId, paidAt)`,
  assembles the full `OrderPaidForNotification` event and enqueues it via the existing producer.
- Add an `OrderPaidNotifierPort` in ordering; `TicketIssuingOrderEventPublisher` calls it after
  tickets are issued. Wire the port in `order.module` to delegate to the notification use-case
  (no circular dependency: notification does not import ordering).
- Add a configurable ticket-access base URL for the confirmation's e-ticket link.

## Impact

- Affected specs: `notification-delivery` (no behavioral change to the spec — the implementation is
  brought into conformance; one scenario is clarified to name the paid-order trigger explicitly).
- Affected code: `packages/backend/src/notification/**`, `packages/backend/src/ordering/**`,
  `packages/backend/src/platform/config/**`.
- No HTTP contract change. No DB schema change.
