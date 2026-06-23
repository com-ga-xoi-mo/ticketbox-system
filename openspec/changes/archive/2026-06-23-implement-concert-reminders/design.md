## Context

The `notification-delivery` spec declares a **Concert reminder notifications** requirement, but the
only delivery path in code today is purchase confirmation. That path is the template to follow:

- A domain event / job payload type (`notification-job.types.ts`).
- A queue producer in `infrastructure/queue` (`purchase-confirmation-notification.producer.ts`).
- A BullMQ processor in `adapters/inbound/queue` (`purchase-confirmation.processor.ts`,
  `notification-delivery.processor.ts`).
- A use-case in `application/use-cases` that persists notifications via
  `notification-repository.port` using `upsertByDedupeKey`, plus a `deliver-notification` use-case
  that sends through `NotificationChannelPort` with **bounded attempts** (`config.emailMaxAttempts`,
  DECISIONS.md ADR-9).

**Critical pattern detail (enqueue lives in the processor, not the use-case):** the
`CreatePurchaseConfirmationNotificationsUseCase` only injects `NotificationRepositoryPort` and
returns the created `{ inApp, email }` records — it never touches a queue. The
`PurchaseConfirmationProcessor` is the only place that injects `@InjectQueue(NOTIFICATION_DELIVERY_QUEUE)`
and calls `deliveryQueue.add(...)` with `attempts`/`backoff`. The in-app record is created with
status `SENT` (delivered by persistence — no channel adapter, no delivery job); only the **email**
record is created `PENDING` and enqueued for bounded-retry delivery. Reminders MUST follow this
split exactly.

The repeatable-scan pattern already exists in ordering: `ExpiredReservationProcessor` registers a
BullMQ `repeat: { every: 60_000 }` job in `onModuleInit` and calls a use-case (`expire-reservations`)
that does the scan. Reminders mirror this exactly.

Key constraints (from CLAUDE.md / DECISIONS.md):
- Clean/hexagonal layering: `domain → application → adapters → infrastructure`. Inner layers MUST NOT
  import Prisma, Nest, Redis, BullMQ, or provider SDKs.
- Cross-module data is reached only through a `*.port.ts` interface implemented in infrastructure.
  Notification MUST NOT import concert-management or ordering Prisma models.
- `apps/worker` contains no business logic; it only wires module use-cases into processors.
- No new HTTP wire contracts; web/checkin-mobile untouched.

## Goals / Non-Goals

**Goals:**
- Deliver one in-app + one email reminder to every valid ticket holder ~24h before concert start.
- Make the flow idempotent across repeated scheduler runs and concert reschedules.
- Keep the read of concert start time + ticket holders behind a notification-owned read port.
- Reuse the existing processor/use-case/bounded-retry pattern (use-case persists, processor enqueues);
  add no new producer and no logic to the worker.

**Non-Goals:**
- No SMS/Zalo channels (extensibility already covered by `NotificationChannelPort`; out of scope here).
- No HTTP endpoint to trigger/list reminders; no web or mobile changes.
- No new wire contracts in `@ticketbox/api-types`.
- No user-configurable reminder timing/preferences (fixed 24h window).

## Decisions

### 1. Read port for concert start + valid ticket holders (owned by notification)
Define `ConcertReminderReadPort` in `notification/domain/ports/`:

```ts
interface UpcomingConcertReminderTarget {
  concertId: string;
  concertTitle: string;   // Concert.title
  startsAt: Date;         // Concert.startsAt — absolute instant (Timestamptz)
  // Only PUBLISHED concerts are returned; DRAFT/CANCELLED/ENDED are excluded by the adapter.
}
interface ReminderRecipient {
  userId: string;
  userDisplayName: string;
  toEmail: string;
  ticketCount: number;
}
interface ConcertReminderReadPort {
  findConcertsStartingWithin(windowStart: Date, windowEnd: Date): Promise<UpcomingConcertReminderTarget[]>;
  findValidTicketHolders(concertId: string): Promise<ReminderRecipient[]>;
}
```

Implemented in `notification/infrastructure/database/` as a Prisma read adapter that queries concert
and order/ticket tables read-only. **Rationale:** keeps notification decoupled from other modules'
domain logic while honoring the "no cross-module Prisma import in inner layers" rule. *Alternative
considered:* publishing reminder candidates from concert-management via an event — rejected as more
moving parts for a scheduled scan that is naturally pull-based.

**Concrete schema mapping (confirmed against `prisma/schema.prisma`):**
- `findConcertsStartingWithin` queries `Concert` where `status = PUBLISHED` AND
  `startsAt >= windowStart` AND `startsAt < windowEnd`. Uses the existing `@@index([status, startsAt])`.
  `DRAFT`, `CANCELLED`, and `ENDED` concerts are excluded by the adapter (not just `CANCELLED`).
- `findValidTicketHolders` queries the `Ticket` table directly (`Ticket` carries `concertId`,
  `userId`, `status` with `@@index([concertId, status])`): distinct `userId` having ≥1 ticket with
  `status IN (ISSUED, CHECKED_IN)` whose `Order.status = PAID`. `VOIDED`/`REFUNDED` tickets and
  non-`PAID` orders are excluded. Joins `User` for display name + email.

A "valid ticket holder" = distinct `userId` matching the above filter.

### 2. Idempotency via dedupe key (reuse `upsertByDedupeKey`)
Add `NotificationType.CONCERT_REMINDER`. Dedupe key: `concert-reminder:${concertId}:${userId}:${channel}`
(in-app / email). The repository already enforces uniqueness on `dedupeKey` and `upsertByDedupeKey`
is idempotent, so overlapping scans and reschedules never double-create. **Rationale:** matches the
existing purchase-confirmation idempotency mechanism — no new schema concept. Key is keyed on
concert+user (not on the scheduled slot), so a reschedule does not produce a second reminder for an
already-reminded user. *Alternative considered:* a separate "reminders sent" table — rejected as
redundant with the existing dedupe column.

### 3. Two-stage queueing (scan → per-user fan-out), mirroring expire-reservations + delivery
- **Scan stage (use-case, no queue):** repeatable job on a new queue `notification.concert-reminder`.
  The processor calls `SendConcertRemindersUseCase`, which for each in-window **PUBLISHED** concert
  resolves recipients and, per recipient, `upsertByDedupeKey` an in-app reminder (status `SENT`) and
  an email reminder (status `PENDING`). The use-case injects **only** the read port + repository and
  **returns the list of created email reminder records** (with `toEmail`). It does **not** import or
  touch any queue — exactly like `CreatePurchaseConfirmationNotificationsUseCase`.
- **Fan-out enqueue (processor):** the `ConcertReminderProcessor` injects
  `@InjectQueue(NOTIFICATION_DELIVERY_QUEUE)` and **loops** the returned email records, calling
  `deliveryQueue.add(NOTIFICATION_DELIVERY_JOB, { notificationId, toEmail }, { attempts, backoff })`
  per record — the same enqueue call `PurchaseConfirmationProcessor` makes, just iterated over many
  recipients. This is the only layer that touches the queue.
- **Delivery stage:** unchanged `notification-delivery.processor` handles bounded-attempt email send.
- **In-app:** the in-app reminder is "delivered" by being persisted with status `SENT`; it does
  **not** go through a channel adapter or the delivery queue.

**Rationale:** keeps the queue dependency out of the application layer (clean-layering rule) and
reuses the proven delivery + bounded-retry path verbatim; the new code is just the scan/fan-out.
*Alternative considered:* enqueue inside the use-case via a producer port — rejected because it pushes
BullMQ concerns into `application`, which the layering rule forbids and the existing notification
use-cases avoid. *Alternative considered:* deliver synchronously inside the scan job — rejected
because a single slow/failing email would block the whole scan and bypass bounded-retry semantics.

### 4. Scan interval & 24h window
Repeatable scan every **5 minutes** (`repeat: { every: 300_000 }`, `jobId` fixed like
`EXPIRE_RESERVATIONS_JOB` to avoid duplicate registrations). Window = `[now+24h, now+24h+interval)`
i.e. `[now+24h, now+24h+5m)`. A concert is reminded exactly once when its start crosses into this
sliding window; the dedupe key guards against the rare window overlap. **Rationale:** 5 min bounds
"how early/late vs. exactly 24h" to ≤5 min while keeping scan load trivial. Interval and window are
defined together so they cannot drift.

### 5. Timezone
Concert `startsAt` is stored/compared as an absolute instant (UTC `Date`); the 24h offset is pure
instant arithmetic, so timezone does not affect *whether* a reminder fires. `Asia/Ho_Chi_Minh` is
used only for **formatting** the human-readable start time in the reminder body. **Rationale:** avoids
DST/offset bugs in the trigger logic while still showing VN-local time to users.

### 6. Worker wiring
`BackendWorkerModule` registers notification processors **directly in `providers`** (it already
lists `PurchaseConfirmationProcessor` and `NotificationDeliveryProcessor`), not via a re-export. Add
`ConcertReminderProcessor` to that `providers` array, and register the new
`notification.concert-reminder` queue in `QueueModule` (BullMQ `registerQueue`) so the
`@Processor(...)` and `@InjectQueue(...)` bindings resolve. `apps/worker` bootstraps
`BackendWorkerModule` and adds no logic of its own.

## Risks / Trade-offs

- **Large concerts → many per-user deliveries in one scan** → fan-out onto the existing delivery
  queue (already async + bounded-retry); scan use-case only creates rows + enqueues, it does not send.
- **Window overlap / scheduler restart re-runs the job** → idempotent `upsertByDedupeKey` + fixed
  `jobId` repeatable registration prevent duplicate sends and duplicate job registration.
- **Concert rescheduled earlier than now+24h after some users already reminded** → already-reminded
  users are protected by dedupe; users newly entering the window still get exactly one reminder.
- **Concert cancelled after reminders sent** → out of scope to "unsend"; future change could send a
  cancellation notice. Documented as a non-goal here.
- **Read adapter coupling to other modules' tables** → confined to one infrastructure adapter behind
  the port; if those schemas change, only that adapter changes.

## Open Questions

_Both prior open questions were resolved against `prisma/schema.prisma` and folded into Decision 1:_
- Concert status: `ConcertStatus = { DRAFT, PUBLISHED, CANCELLED, ENDED }` — remind **only `PUBLISHED`**.
- Ticket/order filtering: `TicketStatus = { ISSUED, CHECKED_IN, VOIDED, REFUNDED }`,
  `OrderStatus` includes `PAID`/`REFUNDED`/… — valid holder requires ticket `status IN (ISSUED, CHECKED_IN)`
  AND `Order.status = PAID` (explicit ticket-status filtering is needed; order status alone is not enough).

No remaining open questions.
