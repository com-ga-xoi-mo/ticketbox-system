## Context

TicketBox already has the Wave 1 platform foundation: NestJS API and worker entrypoints, Prisma/PostgreSQL, Redis, BullMQ, and identity/RBAC modules. The database baseline includes `Notification` and `NotificationAttempt` models, but there is not yet a notification domain module, channel adapter, or worker that reacts to paid orders.

This change is owned by Member 4 and belongs to Wave 2. It implements the first slice of the accepted `notification-delivery` target spec: purchase confirmation notifications, in-app persistence, email adapter behavior, retry attempts, and a worker integration point for a future `order.paid` event. It must preserve the clean/hexagonal module boundary used by existing identity code: domain and application code define ports/use cases, while Prisma, BullMQ, and email delivery live in adapters/infrastructure.

Relevant existing constraints:

- PostgreSQL is the source of truth for persisted notifications and delivery attempts.
- Redis/BullMQ is the async worker mechanism.
- Paid order fulfillment must not be rolled back if email delivery fails.
- Future notification channels such as SMS or Zalo OA must be addable without changing purchase logic.
- `implement-concert-reminders` owns 24-hour reminder scheduling and is out of scope here.

## Goals / Non-Goals

**Goals:**

- Add `NotificationModule` under `packages/backend/src/notification/` with domain, application, adapter, and infrastructure layers.
- Persist in-app and email notification records in PostgreSQL.
- Record each delivery attempt in `notification_attempts`, including provider name, provider message ID when available, status, and error message.
- Add a `NotificationRepositoryPort` and `NotificationChannelPort` so application use cases do not import Prisma, BullMQ, or email provider code.
- Add a purchase confirmation use case that creates or reuses notification records for a paid order event and enqueues/sends the email channel through worker processing.
- Add a BullMQ queue and worker processor for purchase confirmation notification jobs.
- Define the future `order.paid` worker event payload contract used by Member 3's ticket/payment flow, including a required e-ticket access URL for confirmation email content.
- Add a Maildev-backed SMTP adapter path for visible local inbox demo evidence, while keeping deterministic local email as the default.
- Add tests for persistence, email adapter behavior, queue/worker behavior, retry attempts, and duplicate job handling.

**Non-Goals:**

- No implementation of the order lifecycle, payment callback, QR issuance, or `order.paid` publishing in this change.
- No public/customer notification inbox API or frontend UI.
- No 24-hour concert reminder worker; that belongs to `implement-concert-reminders`.
- No SMS, Zalo OA, or production email provider integration beyond a replaceable adapter boundary.
- No real production SMTP credentials or cloud email setup. Maildev/SMTP may be used only as a local demo adapter path.
- No changes to the accepted `notification-delivery` target requirements unless implementation proves the target spec is wrong.

## Decisions

### Decision 1: Add a dedicated Notification bounded context

The module layout should follow the existing backend convention:

```text
packages/backend/src/notification/
  notification.module.ts
  domain/
  application/
  adapters/
  infrastructure/
```

Domain types model notification channel, status, attempt status, purchase confirmation payloads, and delivery result values without importing Prisma enums directly. Application use cases depend on ports. Prisma repositories and email providers adapt those ports in infrastructure.

Rationale:

- Keeps notification behavior testable with in-memory repositories and fake channel adapters.
- Matches the accepted modular monolith and clean/hexagonal boundary.
- Keeps future channels from leaking into ticketing/payment modules.

Alternatives considered:

- Put notification logic inside the payment/order module. This is faster but couples paid-order fulfillment to email delivery and violates the target channel-extensibility requirement.
- Build only a worker processor with Prisma calls inline. This would work for a demo but makes retry rules and channel adapter behavior harder to unit test.

### Decision 2: Use PostgreSQL for notification records and BullMQ for asynchronous execution

The purchase confirmation flow creates notification records in PostgreSQL and uses BullMQ to process delivery work. Redis/BullMQ controls async execution, retries, and backoff, but PostgreSQL remains the durable audit trail for notification status and attempts.

Recommended queue names:

```text
notification.purchase-confirmation
notification.delivery
```

`notification.purchase-confirmation` accepts a paid-order event and creates or finds the corresponding in-app and email notification records. `notification.delivery` processes channel delivery for a single notification. If implementation time is tight, these can be one queue with named jobs, but the job names must remain explicit.

Rationale:

- A paid order should complete even when email is slow or transiently failing.
- BullMQ retry/backoff behavior fits the accepted worker architecture.
- Persisted attempts give demo/test evidence for retry behavior.

Alternatives considered:

- Send email synchronously in the payment callback. Rejected because provider failure must not affect paid order fulfillment.
- Store all queue state only in Redis. Rejected because notification delivery needs a durable audit trail and user-visible in-app state.

### Decision 3: Add a small dedupe key to notification persistence

The existing Prisma model has enough fields for basic notifications but no stable idempotency key. This change should add a minimal migration field such as:

```text
notifications.type
notifications.dedupe_key unique
```

For purchase confirmation, use:

```text
purchase-confirmation:<orderId>:in-app
purchase-confirmation:<orderId>:email
```

The create use case should upsert by `dedupeKey` so BullMQ retries, duplicate future `order.paid` events, or worker restarts do not create duplicate notifications.

Rationale:

- Worker retry after partial failure is a normal condition and must not duplicate customer confirmations.
- The field is small, generic, and useful for future reminder dedupe as well.

Alternatives considered:

- Rely on BullMQ job IDs only. This prevents some duplicate jobs but does not protect against future event publisher changes or manual retries.
- Infer duplicates from user/concert/channel/subject. This is fragile and can collapse legitimate future notifications.

### Decision 4: Define the `order.paid` event contract now, consume it later

This change should not implement Member 3's payment/order publisher, but it should define the payload the notification worker expects:

```ts
type OrderPaidForNotification = {
  eventId: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  concertId: string;
  concertTitle: string;
  startsAt: string;
  ticketCount: number;
  ticketAccessUrl: string;
  paidAt: string;
};
```

The worker should expose a producer or handler function that future order/payment code can call when it publishes `order.paid`. Tests can call this producer directly with fixture payloads.

`ticketAccessUrl` is required because the accepted notification spec says successful payment confirmation includes e-ticket access. The notification module should not generate QR tokens or infer ticket URLs itself; the ticket/order owner should publish the URL after tickets are issued.

Rationale:

- Enables Member 4 to build and test notification delivery before order/payment work is complete.
- Makes the cross-team worker contract explicit in the change artifacts.

Alternatives considered:

- Query all order/ticket data inside the notification worker by `orderId`. That reduces payload size but creates tighter runtime coupling to order schema and is harder to test before ticketing is complete.

### Decision 5: Use replaceable local and Maildev/SMTP email adapters

Implement email delivery behind `NotificationChannelPort`. The baseline adapter should support deterministic local delivery for tests. This change should also add a Maildev-backed SMTP adapter path for demo readiness without changing notification use cases. The application use case should not care which adapter is configured.

Recommended config shape:

```text
EMAIL_PROVIDER=local
EMAIL_FROM=no-reply@ticketbox.test
EMAIL_MAX_ATTEMPTS=3
EMAIL_RETRY_BACKOFF_MS=5000
```

Demo SMTP shape:

```text
EMAIL_PROVIDER=smtp
EMAIL_SMTP_HOST=localhost
EMAIL_SMTP_PORT=1025
MAILDEV_WEB_URL=http://localhost:1080
```

`docker-compose.yml` should include a `maildev` service exposing SMTP on `1025` and the web inbox on `1080`. `npm run start:deps` should start PostgreSQL, Redis, and Maildev so local demo setup is one command. Keep `local` as the default so tests and grading do not require SMTP to be running. Maildev should be treated as local demo evidence, not a production email provider.

Adapter selection should be centralized in `NotificationModule` or a small email adapter provider factory:

```text
EMAIL_PROVIDER=local -> LocalEmailChannelAdapter
EMAIL_PROVIDER=smtp  -> SmtpEmailChannelAdapter
```

The SMTP adapter may use a small SMTP client dependency, but it must remain infrastructure-only and must not leak into domain or application code.

Rationale:

- Preserves deterministic tests and local setup.
- Gives the team visible email demo evidence through Maildev.
- Keeps the adapter replaceable for Maildev, SMTP, or a real provider.
- Satisfies the target extensible-channel requirement without overbuilding production email.

Alternatives considered:

- Add real provider SDK now. Rejected because credentials and network access are outside the course scope.
- Only create in-app notifications. Rejected because purchase confirmation email is part of the target spec.

### Decision 6: Treat in-app delivery as persistence, email delivery as retryable

For `IN_APP`, delivery succeeds when the notification row is persisted with `SENT` or visible status according to the implementation's chosen naming. For `EMAIL`, delivery creates an attempt row for every try:

- successful adapter response marks the attempt `SUCCEEDED`, stores provider data, and marks the notification `SENT`
- transient adapter failure marks the attempt `FAILED`, increments effective attempt count, and leaves the notification retryable until the configured max
- exhausting retries marks the notification `FAILED` but does not affect the paid order

Rationale:

- In-app notifications do not have an external provider and should not need BullMQ retries.
- Email failures need visible evidence and bounded retry behavior.

Alternatives considered:

- Mark email notification failed immediately on first failure. Rejected because the accepted spec requires retry on transient email failure.

## Risks / Trade-offs

- [Risk] Member 3's future `order.paid` event shape differs from this design. -> Mitigation: keep the notification producer typed and document the event contract in this change; adjust through a later OpenSpec update if the cross-team contract changes.
- [Risk] Adding `dedupe_key` and `type` changes the database schema during an implementation change. -> Mitigation: keep the migration minimal, backwards compatible, and limited to notification tables.
- [Risk] A local or Maildev email adapter could be mistaken for production email readiness. -> Mitigation: document `EMAIL_PROVIDER=local` and `EMAIL_PROVIDER=smtp` clearly as local/demo modes, and keep production provider integration as a future adapter.
- [Risk] BullMQ retry and database attempt status can drift if a worker crashes mid-attempt. -> Mitigation: write attempts before/after adapter calls in a clear state transition and make the next retry update the same notification through `dedupeKey`.
- [Risk] Notification delivery tests can become slow if they require Redis. -> Mitigation: keep most tests at use-case level with in-memory adapters; add only focused integration tests around BullMQ processor behavior.

## Migration Plan

1. Add the minimal Prisma schema fields needed for notification type and dedupe key.
2. Generate and inspect the Prisma migration for notification table changes.
3. Add notification domain/application ports and use cases.
4. Add Prisma persistence adapter, local email channel adapter, SMTP email channel adapter, and provider selection wiring.
5. Add Maildev to local Docker Compose and document the local inbox at `http://localhost:1080`.
6. Register notification queues and worker processors in the existing API/worker modules.
7. Add unit and integration tests for persistence, adapter behavior, worker behavior, duplicate events, retry attempts, e-ticket URL content, and SMTP provider selection.
8. Run `npm run test`, `npm run build`, and Prisma validation.

Rollback is straightforward for local development: revert the change branch and reset the local database if the notification migration was applied. No production data migration is required for this course project.

## Open Questions

- No open Maildev decision remains. This change should implement the Maildev/SMTP local demo path now, keep `local` as the default deterministic adapter, and document when to switch to `EMAIL_PROVIDER=smtp` for visible inbox evidence.
