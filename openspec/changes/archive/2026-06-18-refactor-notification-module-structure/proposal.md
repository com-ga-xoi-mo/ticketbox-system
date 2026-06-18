## Why

The notification implementation is worker-driven and functional, but the current folder layout does not make its inbound adapter boundary visible. Unlike HTTP-facing modules such as check-in or AI artist bio, notification has no `adapters/http` folder because it is triggered by BullMQ jobs. When its queue processors sit only under `infrastructure/queue`, the module can look like it has no adapter layer at all.

The fix should clarify the adapter boundary without abandoning the repository's existing convention that concrete provider implementations live under `infrastructure/*`.

## What Changes

- Refactor the notification module folder structure to make the worker-driven inbound boundary explicit:
  - BullMQ processors become inbound queue adapters under `adapters/inbound/queue`
  - Prisma persistence remains under `infrastructure/database`
  - email channel implementations remain under `infrastructure/email`
  - BullMQ producer and shared queue payload contracts remain under `infrastructure/queue`
- Preserve the current worker-driven design: notification is triggered by queue jobs/events, not by HTTP controllers.
- Document that the missing `adapters/http` folder is intentional for this slice because notification currently has no user-facing HTTP endpoint.
- Keep runtime behavior unchanged:
  - no queue name changes
  - no job name changes
  - no payload contract changes
  - no email behavior changes
  - no database schema changes
  - no public API changes
  - no business logic changes
- Keep `NotificationChannelPort` and `NotificationRepositoryPort` as the module boundaries used by application use cases.
- Keep `PurchaseConfirmationNotificationProducer.enqueueOrderPaid(...)` available as the integration point for future Member 3 payment/order work.
- Add a short module README or design note so later changes do not accidentally add payment logic inside notification, assume payment/order already emits notification jobs, or add an unused HTTP adapter only for symmetry.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `notification-delivery`: Clarify the notification module's worker-driven inbound adapter and infrastructure boundaries without changing delivery behavior.

## Impact

- Affected code areas:
  - `packages/backend/src/notification/`
  - `packages/backend/src/platform/backend-worker.module.ts`
  - notification tests and imports
- Affected documentation:
  - a short notification module README or equivalent design note
- No API, queue contract, database schema, provider behavior, or payment/order business behavior changes are intended.
