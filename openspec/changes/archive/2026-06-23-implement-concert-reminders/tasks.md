## 1. Domain & read port

- [x] 1.1 Add `NotificationType.CONCERT_REMINDER` to `notification/domain/notification.types.ts` and export it from `notification.module.ts`.
- [x] 1.2 Create `notification/domain/ports/concert-reminder-read.port.ts` with `CONCERT_REMINDER_READ_PORT` symbol and `ConcertReminderReadPort` interface (`findConcertsStartingWithin(windowStart, windowEnd)`, `findValidTicketHolders(concertId)`) plus `UpcomingConcertReminderTarget` and `ReminderRecipient` types. No Prisma/Nest imports.

## 2. Application use-case

- [x] 2.1 Create `notification/application/use-cases/send-concert-reminders.use-case.ts`: inject **only** the read port + notification repository (NO queue/producer — mirror `CreatePurchaseConfirmationNotificationsUseCase`); compute the `[now+24h, now+24h+interval)` window and fetch in-window concerts (the read port already returns only `PUBLISHED`, so no status branching needed here).
- [x] 2.2 For each valid ticket holder, build the reminder subject/body (format `startsAt` in `Asia/Ho_Chi_Minh`) and `upsertByDedupeKey` an in-app reminder (`SENT`) and an email reminder (`PENDING`) using key `concert-reminder:${concertId}:${userId}:${channel}`.
- [x] 2.3 Return a summary that includes the **list of created email reminder records** (each with `notificationId` + `toEmail`) plus counts `{ scannedConcerts, recipients, emailReminders }`. The use-case does NOT enqueue anything — the processor performs delivery enqueue (see 4.x).
- [x] 2.4 Write `send-concert-reminders.use-case.spec.ts` with in-memory fake read port + fake repository: assert window selection, only-`PUBLISHED` concerts processed, idempotent re-run (no duplicate upserts), per-recipient in-app+email creation, and that the returned email list matches the created `PENDING` email records.

## 3. Queue constants & job types

- [x] 3.1 Add `NOTIFICATION_CONCERT_REMINDER_QUEUE = 'notification.concert-reminder'` and `NOTIFICATION_CONCERT_REMINDER_SCAN_JOB = 'concert-reminder.scan'` to `platform/queue/platform-queue.constants.ts`.
- [x] 3.2 Add `ConcertReminderScanJobData` (empty payload, mirrors expire-reservations) to `notification/infrastructure/queue/notification-job.types.ts`. Reuse the existing `NotificationDeliveryJobData` + `NOTIFICATION_DELIVERY_JOB` for fan-out — do NOT add a new delivery job type or producer (the processor enqueues directly, like `PurchaseConfirmationProcessor`).

## 4. Inbound BullMQ processor (scheduled scan)

- [x] 4.1 Create `notification/adapters/inbound/queue/concert-reminder.processor.ts`: `@Processor(NOTIFICATION_CONCERT_REMINDER_QUEUE)` extending `WorkerHost`, with `@InjectQueue(NOTIFICATION_DELIVERY_QUEUE)` (like `PurchaseConfirmationProcessor`). In `onModuleInit`, register the repeatable scan job (`repeat: { every: 300_000 }`, fixed `jobId`, `removeOnComplete`/`removeOnFail`). In `process`, call `SendConcertRemindersUseCase`, then **loop** the returned email reminder records and `deliveryQueue.add(NOTIFICATION_DELIVERY_JOB, { notificationId, toEmail }, { jobId: 'deliver-<id>', attempts: config.emailMaxAttempts, backoff })` per record.
- [x] 4.2 Add `concert-reminder.processor.spec.ts` (or extend `notification-processors.spec.ts`) asserting: the processor delegates to the use-case, enqueues one delivery job per returned email record (and none for in-app), and logs the scan summary.

## 5. Infrastructure read adapter

- [x] 5.1 Create `notification/infrastructure/database/prisma-concert-reminder-read.adapter.ts` implementing `ConcertReminderReadPort`: read-only Prisma queries. `findConcertsStartingWithin` → `Concert` where `status = PUBLISHED` AND `startsAt >= windowStart` AND `startsAt < windowEnd` (uses `@@index([status, startsAt])`). `findValidTicketHolders` → distinct `userId` from `Ticket` where `concertId = ?` AND `status IN (ISSUED, CHECKED_IN)` AND related `Order.status = PAID`, joined to `User` for display name + email.
- [x] 5.2 Add `prisma-concert-reminder-read.adapter.e2e-spec.ts` guarded by `SKIP_DB_TESTS=1` covering window selection, exclusion of non-`PUBLISHED` concerts (DRAFT/CANCELLED/ENDED), and ticket-holder filtering (exclude `VOIDED`/`REFUNDED` tickets and non-`PAID` orders) against seeded data.

## 6. Module & worker wiring

- [x] 6.1 Wire providers in `notification.module.ts`: bind `CONCERT_REMINDER_READ_PORT` to the Prisma read adapter and provide `SendConcertRemindersUseCase` (inject read port + repository only — no producer). Register the `notification.concert-reminder` queue in `QueueModule` (BullMQ `registerQueue`) alongside the existing notification queues so the new processor's `@Processor`/`@InjectQueue` bindings resolve.
- [x] 6.2 Add `ConcertReminderProcessor` to the `providers` array of `BackendWorkerModule` (next to `PurchaseConfirmationProcessor`/`NotificationDeliveryProcessor` — it is registered directly in `providers`, not re-exported), so it runs in `apps/worker` with no logic added to `apps/worker`.

## 7. Verification

- [x] 7.1 Run `npm run build && npm run lint && npm run test && npm run format:check` and fix any failures (no unused-param/type-only-import lint errors, per the notification lint-gate requirement).
- [x] 7.2 Manually verify end-to-end against Maildev/local email with a seeded concert ~24h out (or document the manual test under `docs/manual-tests/`), confirming a single in-app + email reminder per holder and no duplicates on a second scan.
