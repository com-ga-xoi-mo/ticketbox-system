## 1. Notification — read port + assembly

- [x] 1.1 Add `PurchaseConfirmationReadPort` + `OrderPaidNotificationData` type in `packages/backend/src/notification/domain/ports/purchase-confirmation-read.port.ts` (`findOrderPaidNotificationData(orderId): Promise<OrderPaidNotificationData | null>`)
- [x] 1.2 Implement `PrismaPurchaseConfirmationReadAdapter` in `packages/backend/src/notification/infrastructure/database/prisma-purchase-confirmation-read.adapter.ts` — one query joining order → user → concert + issued ticket count
- [x] 1.3 Add `ticketAccessBaseUrl` getter to `PlatformConfigService` (env `TICKET_ACCESS_BASE_URL`, local default)
- [x] 1.4 Add `EnqueuePurchaseConfirmationUseCase` in `packages/backend/src/notification/application/use-cases/enqueue-purchase-confirmation.use-case.ts` — assemble event via read port + base URL, call producer; no-op if order not found; `eventId = orderId`
- [x] 1.5 Register read port (Symbol provider), Prisma adapter, and use-case in `notification.module.ts`; export `EnqueuePurchaseConfirmationUseCase`
- [x] 1.6 Unit test `EnqueuePurchaseConfirmationUseCase` (assembles + enqueues; no-op on missing order)

## 2. Ordering — trigger after ticket issuance

- [x] 2.1 Add `OrderPaidNotifierPort` (Symbol + interface `notifyOrderPaid(orderId, paidAt)`) in `packages/backend/src/ordering/domain/ports/order-paid-notifier.port.ts`
- [x] 2.2 Inject the port into `TicketIssuingOrderEventPublisher`; after `IssueTicketsForPaidOrderUseCase` succeeds, call `notifyOrderPaid(event.orderId, event.paidAt)`; swallow + log enqueue errors so the paid order is never rolled back
- [x] 2.3 Provide `ORDER_PAID_NOTIFIER` in `order.module.ts` via a factory delegating to `EnqueuePurchaseConfirmationUseCase`; import `NotificationModule`
- [x] 2.4 Update `TicketIssuingOrderEventPublisher` unit test to assert the notifier is called once on paid, not on other transitions, and that a notifier failure does not throw

## 3. Verification

- [x] 3.1 `npm run build && npm run lint && npm run test` — all pass
- [x] 3.2 Manual: pay an order → confirm in-app + email (Maildev `:1080`) confirmation appears; replay the paid transition → no duplicate
