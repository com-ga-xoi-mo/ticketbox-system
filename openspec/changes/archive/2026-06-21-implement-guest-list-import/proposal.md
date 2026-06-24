## Why

TicketBox has an accepted sponsor VIP guest-list contract and partial database models, but no executable scheduled CSV import, durable reporting, or authorized VIP lookup workflow. Implementing it now completes the Week 4 guest-list scope while closing schema gaps that could otherwise allow duplicate or incorrectly merged active guests.

## What Changes

- Add mandatory scheduled CSV discovery through a `GuestListFileSourcePort` using the explicit local inbox convention `data/guest-list-inbox/<concertId>/*.csv`, plus an optional Admin-triggered upload/import path for local demonstration and operational fallback.
- Add checksum-based, concurrency-safe import batches with durable source, lifecycle, per-concert claim ordering, processing leases, counters, timestamps, errors, and report metadata.
- Repair the database-to-queue failure window by ensuring every recoverable non-terminal batch has exactly one runnable deterministic BullMQ job, including when an earlier job remains in BullMQ's `failed` or inconsistent `completed` state.
- Validate CSV file constraints and headers before changing active guest data; isolate invalid or conflicting rows while importing valid rows.
- Normalize email and phone identifiers, deduplicate within a file, and upsert active guests using concert-scoped natural identifiers enforced by PostgreSQL constraints.
- Preserve historical import evidence separately from the current active guest list, and support explicit cancellation rows without deleting guests merely omitted from later files.
- Add Admin endpoints to request and inspect imports and download reports.
- Add retry-safe immutable row evidence keyed by batch and row number; a committed evidence row becomes the replay checkpoint and prevents the same batch row from mutating the active projection again. Serialize different batches for the same concert in canonical claim order so retries or concurrent files cannot duplicate reports or let an earlier batch overwrite a later batch.
- Add a runtime-validated `@ticketbox/api-types` contract and backend endpoint for CHECKIN_STAFF VIP lookup that validates the exact selected assignment ID, separate from QR scanning.
- Add the `guest_list.import_requested` BullMQ contract, state-aware queue repair, worker processor, full-expression cron scheduling, configuration, environment documentation, storage/file-source adapters, and modular-monolith wiring.
- Validate cron semantics at application startup with the same maintained parser used by the scheduler, so syntactically shaped but out-of-range expressions cannot disable discovery at runtime.
- Validate VIP lookup requests with the shared Zod schema at runtime and map only known assignment/authorization failures to `403`, leaving validation failures as `400` and unexpected infrastructure failures as `500`.
- Translate concurrent PostgreSQL natural-key conflicts only after the failed row transaction has rolled back, then persist canonical conflict evidence in a fresh transaction.
- Add focused unit, integration, database, worker, and E2E coverage for validation, enqueue repair, per-concert ordering, retry idempotency, reporting, source routing, and exact-assignment authorization.
- Keep the repository-wide `npm test` gate stable under parallel load, including the database-backed guest-list replay and partial-failure tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `guest-list-import`: Clarify the accepted scheduled import and VIP lookup contract with durable batch outcomes, recoverable queue delivery, per-concert batch ordering, retry-safe row evidence, explicit source-to-concert routing, atomic header validation, database-enforced idempotency and concert-scoped identity, explicit cancellation, Admin operations, and exact gate-assignment authorization.

## Impact

- Backend: new `packages/backend/src/guest-list-import/` module; integration with identity authorization, concert ownership, Prisma, BullMQ/Redis, worker composition, storage, scheduling, and configuration.
- Database: a focused Prisma migration for batch checksum and per-concert sequence uniqueness, processing leases, retry-safe row/report evidence, normalized phone, active/cancelled lifecycle, and concert-scoped natural-key constraints.
- Shared contracts: new VIP lookup request/response schemas and exports in `@ticketbox/api-types`; no mobile UI changes.
- Operations: CSV discovery/storage settings, queue registration, retry settings, environment documentation, and report retention/access.
- Unchanged: paid ticket issuance, orders, payments, inventory, QR tickets, `POST /checkin/scan`, full web/mobile UI, sponsor API integration, and offline VIP lookup.
