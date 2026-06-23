## Why

The `notification-delivery` spec already declares a **Concert reminder notifications**
requirement ("send reminders to ticket holders 24 hours before the concert starts"), but no
code implements it — only purchase-confirmation delivery exists today. Ticket holders therefore
receive no pre-event reminder, hurting attendance and the day-of check-in experience. This change
implements the already-specified behavior and tightens the spec so it covers the real-world edge
cases (duplicate sends, reschedules, cancellations, retries) the original one-line requirement left open.

## What Changes

- Add a **scheduled (BullMQ repeatable) reminder scan** that runs on a fixed interval and finds
  concerts whose start time falls in the `[24h, 24h + interval)` window from now.
- Restrict reminders to **PUBLISHED** concerts only (DRAFT/CANCELLED/ENDED excluded). For each such
  concert, resolve every **valid ticket holder** (users with at least one `ISSUED`/`CHECKED_IN`
  ticket on a `PAID` order), persist an in-app reminder (sent state) and an email reminder (pending)
  via `notification-repository.port`, and enqueue one email delivery job per recipient on the
  existing `notification.delivery` queue (the email is sent through `NotificationChannelPort`).
- Introduce a **cross-module read port** (owned by notification, implemented in infrastructure) so
  notification can read concert start time and the valid ticket-holder list **without importing
  another module's Prisma models** directly.
- Make reminders **idempotent**: each user receives exactly one reminder per concert per channel,
  reusing the existing `upsertByDedupeKey` dedupe mechanism with a `concert-reminder` key, so
  repeated scheduler runs and reschedules within the same target slot never double-send.
- Reuse the established delivery pattern: a new **scan job type** + a new **BullMQ processor** under
  `adapters/inbound/queue`, and a new **reminder use-case** in `application`. Following the existing
  `PurchaseConfirmationProcessor` split, the use-case persists notifications only (no queue
  dependency) and the processor performs the delivery enqueue, reusing the existing
  `NOTIFICATION_DELIVERY_QUEUE`/`NOTIFICATION_DELIVERY_JOB` — no new producer. Delivery retries use
  **bounded attempts in the worker** (DECISIONS.md ADR-9); no business logic is added to
  `apps/worker`, it only registers the processor.
- Handle **cancelled / rescheduled concerts**: cancelled concerts are skipped (no reminder);
  rescheduled concerts are re-evaluated against the new start time, and the dedupe key prevents
  resend for a slot already reminded.
- Define the **24h window and timezone** semantics explicitly (concert start times are absolute
  instants; the system operates in the VN context — `Asia/Ho_Chi_Minh`).

## Capabilities

### New Capabilities
<!-- None. This implements an existing requirement; no new capability is introduced. -->

### Modified Capabilities
- `notification-delivery`: Expand the existing **Concert reminder notifications** requirement from
  a single declared scenario into a full specification — add scenarios for idempotency
  (one reminder per user/concert/channel), cancelled-concert skip, rescheduled-concert
  re-evaluation, the scheduled scan window, and bounded delivery retry. Purchase-confirmation,
  extensible-channels, lint-gate, and adapter-structure requirements are unchanged.

## Impact

- **Code:** `packages/backend/src/notification` (new read port + reminder use-case + scan job type +
  reminder BullMQ processor under `adapters/inbound/queue`; module wiring); one new infrastructure
  adapter implementing the read port over existing concert/ordering data; new scan queue/job
  constants in `platform/queue` and the new queue registered in `QueueModule`.
  `BackendWorkerModule` adds the processor to its `providers` (no logic in `apps/worker`).
- **Tests:** unit tests for the reminder use-case and read-port behavior using in-memory fake
  adapters; optional `*.e2e-spec.ts` (behind `SKIP_DB_TESTS=1`) for the Prisma read adapter.
- **No changes** to `apps/web`, `apps/checkin-mobile`, or HTTP wire contracts
  (`@ticketbox/api-types`). No new public API surface.
- **Dependencies:** none new — reuses BullMQ/Redis, Prisma, and the existing email channel.
