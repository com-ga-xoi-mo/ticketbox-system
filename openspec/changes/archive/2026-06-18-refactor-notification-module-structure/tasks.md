## 1. Inventory and Contract Guard

- [x] 1.1 Inspect the current notification file tree and confirm all files that will move from `infrastructure/queue`, `infrastructure/email`, and `infrastructure/database`.
- [x] 1.2 Record the current notification worker flow and confirm the refactor does not change queue names, job names, job payload types, email behavior, database schema, public API surface, or business logic.
- [x] 1.3 Confirm `PurchaseConfirmationNotificationProducer.enqueueOrderPaid(...)` remains the future payment/order integration point and that no payment/order logic is added in this change.
- [x] 1.4 Confirm the final layout matches the repository convention: inbound entry points under `adapters/*`, concrete provider implementations under `infrastructure/*`.

## 2. Move Inbound Queue Adapters

- [x] 2.1 Create `packages/backend/src/notification/adapters/inbound/queue/`.
- [x] 2.2 Move `purchase-confirmation.processor.ts` from `infrastructure/queue` to `adapters/inbound/queue`.
- [x] 2.3 Move `notification-delivery.processor.ts` from `infrastructure/queue` to `adapters/inbound/queue`.
- [x] 2.4 Move or update queue processor specs so they still cover the same behavior from the new inbound adapter path.

## 3. Preserve Infrastructure Providers

- [x] 3.1 Keep or restore `purchase-confirmation-notification.producer.ts` under `packages/backend/src/notification/infrastructure/queue/`.
- [x] 3.2 Keep `notification-job.types.ts` as the single queue payload contract under `packages/backend/src/notification/infrastructure/queue/` and update both processors and producer to import it.
- [x] 3.3 Keep or restore `email-channel.provider.ts`, `local-email-channel.adapter.ts`, and `smtp-email-channel.adapter.ts` under `packages/backend/src/notification/infrastructure/email/` with their focused specs.
- [x] 3.4 Keep or restore `prisma-notification.repository.ts` under `packages/backend/src/notification/infrastructure/database/` with its focused spec.
- [x] 3.5 Remove any `packages/backend/src/notification/adapters/outbound/` or `packages/backend/src/notification/adapters/queue/` folders introduced by an earlier draft of this refactor.

## 4. Update Wiring and Imports

- [x] 4.1 Update imports in `packages/backend/src/notification/notification.module.ts` to use the `infrastructure/*` paths for repository, email provider, and queue producer.
- [x] 4.2 Update imports in `packages/backend/src/platform/backend-worker.module.ts` to use the new inbound queue processor paths.
- [x] 4.3 Update imports in notification tests and any notification exports without changing class names, provider tokens, or dependency injection behavior.
- [x] 4.4 Remove now-empty outbound adapter folders if they are no longer needed, but keep populated `infrastructure/queue`, `infrastructure/email`, and `infrastructure/database`.

## 5. Documentation

- [x] 5.1 Add `packages/backend/src/notification/README.md` or an equivalent short module design note.
- [x] 5.2 Document that notification is worker-driven in this slice and currently has no `adapters/http` because there is no user-facing notification endpoint.
- [x] 5.3 Document that queue processors are inbound adapters, while the queue producer, email channel implementations, and Prisma repository are infrastructure implementations behind ports or integration contracts.
- [x] 5.4 Document the current flow: `order.paid` queue job -> `PurchaseConfirmationProcessor` -> `CreatePurchaseConfirmationNotificationsUseCase` -> `NotificationRepositoryPort` -> `notification.delivery` queue job -> `NotificationDeliveryProcessor` -> `DeliverNotificationUseCase` -> `NotificationChannelPort`.
- [x] 5.5 Document that payment/order integration is out of scope for this change and belongs to Member 3 unless a later OpenSpec change changes ownership.

## 6. Verification

- [x] 6.1 Run focused notification tests with `npm.cmd run test -- packages/backend/src/notification`.
- [x] 6.2 Run `npm.cmd run lint`.
- [x] 6.3 Run `npm.cmd run build`.
- [x] 6.4 Run `openspec.cmd validate refactor-notification-module-structure --strict`.
- [x] 6.5 Review the final diff and confirm the change is folder/import/documentation only with no runtime behavior changes.
