# Notification Module

This module is worker-driven in the current slice. It does not expose user-facing
HTTP endpoints, so there is intentionally no `adapters/http` folder yet.

## Adapter Roles

- `adapters/inbound/queue`: BullMQ processors that receive worker jobs and call
  notification use cases.
- `infrastructure/queue`: BullMQ producers and shared queue payload contracts.
- `infrastructure/email`: email channel implementations selected through
  `NotificationChannelPort`.
- `infrastructure/database`: Prisma persistence behind
  `NotificationRepositoryPort`.

The domain and application layers should continue to depend on ports and use
cases, not on BullMQ, Prisma, SMTP, or provider-specific details.

## Current Purchase Confirmation Flow

```text
order.paid queue job
  -> PurchaseConfirmationProcessor
  -> CreatePurchaseConfirmationNotificationsUseCase
  -> NotificationRepositoryPort
  -> notification.delivery queue job
  -> NotificationDeliveryProcessor
  -> DeliverNotificationUseCase
  -> NotificationChannelPort
```

## Payment/Order Integration Boundary

`PurchaseConfirmationNotificationProducer.enqueueOrderPaid(...)` is the
notification-side integration point for a paid order event.

The payment/order module still owns deciding when an order is successfully paid
and fulfilled. That module must call or emit this integration point after
successful payment/order fulfillment in the Member 3 payment/order work, unless
a later OpenSpec change changes ownership.

Do not add payment fulfillment logic inside the notification module.
