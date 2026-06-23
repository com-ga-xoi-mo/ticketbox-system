## 1. Branch, Schema, and Config Setup

- [x] 1.1 Create and checkout branch `feature/implement-notification-delivery` from the team's integration branch.
- [x] 1.2 Update `prisma/schema.prisma` to add `Notification.type` and unique `Notification.dedupeKey` mapped to `type` and `dedupe_key`.
- [x] 1.3 Generate a Prisma migration for the notification table changes and inspect the SQL for a safe unique index on `dedupe_key`.
- [x] 1.4 Add notification email config to `packages/backend/src/platform/config/env.schema.ts`: `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_MAX_ATTEMPTS`, and `EMAIL_RETRY_BACKOFF_MS`.
- [x] 1.5 Add typed getters for the new email config values in `PlatformConfigService`.
- [x] 1.6 Update `.env.example` with deterministic local email defaults.
- [x] 1.7 Add a `maildev` service to `docker-compose.yml` exposing SMTP port `1025` and web inbox port `1080`.
- [x] 1.8 Update `npm run start:deps` to start `postgres`, `redis`, and `maildev` together for local development.
- [x] 1.9 Extend backend env validation/config for `EMAIL_PROVIDER=local|smtp`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, and optional `MAILDEV_WEB_URL`.
- [x] 1.10 Add typed getters for SMTP host, SMTP port, and Maildev web URL in `PlatformConfigService`.
- [x] 1.11 Update `.env.example` with local defaults plus documented Maildev/SMTP demo values.

## 2. Notification Domain and Ports

- [x] 2.1 Create `packages/backend/src/notification/notification.module.ts` and the domain/application/infrastructure folder structure.
- [x] 2.2 Add domain types for notification channel, notification status, attempt status, notification type, delivery request, and delivery result.
- [x] 2.3 Add `OrderPaidForNotification` event payload type matching the cross-team `order.paid` contract from `design.md`.
- [x] 2.6 Make `ticketAccessUrl` required in the `OrderPaidForNotification` contract so purchase confirmation email always contains e-ticket access.
- [x] 2.4 Add `NotificationRepositoryPort` for upserting notifications by dedupe key, recording attempts, and updating notification status.
- [x] 2.5 Add `NotificationChannelPort` for sending channel-specific notification delivery requests.

## 3. Application Use Cases

- [x] 3.1 Implement `CreatePurchaseConfirmationNotificationsUseCase` to create or reuse in-app and email notifications for a paid order event.
- [x] 3.2 Ensure in-app confirmation persistence is treated as successful in-app delivery without requiring an external provider.
- [x] 3.3 Implement `DeliverNotificationUseCase` to load a notification, call the configured channel adapter, record a delivery attempt, and update status.
- [x] 3.4 Implement retry decision logic using `EMAIL_MAX_ATTEMPTS` and recorded failed attempt count.
- [x] 3.5 Ensure duplicate `order.paid` events or retried jobs do not create duplicate notification rows for the same order/channel.

## 4. Infrastructure Adapters

- [x] 4.1 Implement `PrismaNotificationRepository` using the existing `Notification` and `NotificationAttempt` tables.
- [x] 4.2 Map Prisma enum values to notification domain values inside the infrastructure adapter only.
- [x] 4.3 Implement `LocalEmailChannelAdapter` that returns deterministic provider message IDs for local/demo runs.
- [x] 4.4 Add a failing test/dummy email adapter for retry-path tests without touching production config.
- [x] 4.5 Wire repository and channel adapter providers in `NotificationModule`.
- [x] 4.6 Add an infrastructure-only `SmtpEmailChannelAdapter` behind `NotificationChannelPort` for Maildev SMTP delivery.
- [x] 4.7 Add any required SMTP client dependency and keep it isolated to notification infrastructure.
- [x] 4.8 Add provider selection wiring so `EMAIL_PROVIDER=local` uses `LocalEmailChannelAdapter` and `EMAIL_PROVIDER=smtp` uses `SmtpEmailChannelAdapter`.
- [x] 4.9 Ensure unsupported `EMAIL_PROVIDER` values fail fast during config validation or provider creation.

## 5. BullMQ Worker Integration

- [x] 5.1 Add notification queue constants for purchase confirmation and delivery jobs.
- [x] 5.2 Register notification queues in the existing platform queue setup.
- [x] 5.3 Add a producer/service method that future order/payment code can call to enqueue an `order.paid` purchase confirmation job.
- [x] 5.4 Implement a purchase confirmation processor that receives `OrderPaidForNotification`, creates/reuses notification records, and enqueues email delivery work.
- [x] 5.5 Implement a delivery processor that executes email delivery jobs with bounded retry/backoff behavior.
- [x] 5.6 Import notification worker providers into `BackendWorkerModule` without changing unrelated platform health processing.

## 6. Tests

- [x] 6.1 Add unit tests for `CreatePurchaseConfirmationNotificationsUseCase` covering in-app/email record creation from a paid order event.
- [x] 6.2 Add unit tests proving duplicate paid-order events reuse existing notification records by dedupe key.
- [x] 6.2a Add or update unit tests proving purchase confirmation email body includes the required e-ticket access URL.
- [x] 6.3 Add unit tests for `DeliverNotificationUseCase` covering successful email delivery, attempt recording, and status update.
- [x] 6.4 Add unit tests for transient email failure and retry exhaustion behavior.
- [x] 6.5 Add tests for `LocalEmailChannelAdapter` deterministic provider response behavior.
- [x] 6.6 Add integration-style tests for the BullMQ processors using fake repositories/adapters or the existing test queue pattern.
- [x] 6.7 Add Prisma repository tests for notification upsert and attempt persistence if the project test database is available.
- [x] 6.8 Add tests for SMTP provider selection without requiring a live Maildev process.
- [x] 6.9 Add tests for `SmtpEmailChannelAdapter` using a mocked SMTP transport or local-safe fake transport.
- [x] 6.10 Add tests proving `EMAIL_PROVIDER=local` remains the default when SMTP env values are absent.

## 7. Verification and Documentation

- [x] 7.1 Run `npm run verify:prisma` and confirm the updated Prisma schema validates and client generation succeeds.
- [x] 7.2 Run `npm run test` and confirm notification unit/integration tests pass.
- [x] 7.3 Run `npm run build` and confirm API and worker compilation succeeds.
- [x] 7.4 Update README or developer notes only if new email environment variables or worker commands are not already documented elsewhere.
- [x] 7.5 Confirm `openspec status --change "implement-notification-delivery"` reports the change artifacts as apply-ready before implementation review.
- [x] 7.6 Document Maildev setup in README or developer notes, including `http://localhost:1080`, SMTP port `1025`, and the `EMAIL_PROVIDER=smtp` env switch.
- [x] 7.7 Smoke-check the local Maildev path: start dependencies, run API/worker with `EMAIL_PROVIDER=smtp`, trigger or test a purchase confirmation job, and confirm the email appears in the Maildev inbox.
- [x] 7.8 Re-run `openspec status --change "implement-notification-delivery"` after task updates and confirm artifacts remain apply-ready.
