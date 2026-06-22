## Context

The accepted `guest-list-import` specification requires scheduled sponsor CSV ingestion, partial row failure, checksum idempotency, and authorized VIP lookup. The repository already has `GuestListBatch` and `GuestListEntry`, but they are not safe implementation foundations: batches have no checksum constraint, entries are unique only inside a batch, phone is not normalized, status values mix validation outcomes with active guest state, and invalid rows cannot always be stored because `guestName` is required.

This change spans the API process, worker process, PostgreSQL, Redis/BullMQ, local object storage, identity/check-in authorization, and `@ticketbox/api-types`. It follows the existing modular-monolith and ports/adapters conventions. Scheduled discovery is the primary ingestion path; an Admin request path is an operational fallback and local-demo aid.

## Goals / Non-Goals

**Goals:**

- Import scheduled CSV files without corrupting the active guest list when files, headers, or individual rows are invalid.
- Make same-file requests and concert-scoped guest identity correct under retries and concurrency using database constraints.
- Close the database-to-queue failure window and make partially completed worker attempts safely resumable.
- Apply different batches for the same concert in canonical claim order while allowing different concerts to process concurrently.
- Preserve immutable batch/row evidence while exposing a distinct current active guest list.
- Provide authorized Admin import management and assignment-authorized CHECKIN_STAFF VIP lookup.
- Integrate queue, schedule, storage, configuration, shared contracts, and worker composition using existing repository conventions.

**Non-Goals:**

- Issuing paid or QR tickets to VIP guests, or changing orders, payments, inventory, QR check-in, or `POST /checkin/scan`.
- Full admin-web or check-in-mobile UI, sponsor APIs, or offline VIP lookup.
- Deleting guests because they are absent from a later file.
- Refactoring AI Artist Bio storage internals or unrelated modules.

## Decisions

### 1. Keep immutable import evidence separate from the active guest projection

`GuestListBatch` records one canonical file import. A new `GuestListImportRow` records every parsed data row, including raw nullable values, row number, normalized values when available, disposition, and reason. `GuestListEntry` becomes the current concert-scoped guest projection and references the latest contributing batch.

This separation allows malformed rows with missing required fields to remain reportable and keeps historical reports stable when a later batch updates an active guest. Reusing `GuestListEntry` for both purposes was rejected because batch ownership and concert-wide current identity impose conflicting uniqueness and nullability rules.

### 2. Use a focused additive-and-backfill Prisma migration

The migration will:

1. Add `checksum`, per-concert `importSequence`, processing lease/attempt metadata, report metadata, failure metadata, and updated timestamps to `GuestListBatch`; keep `assetId` as the source asset reference.
2. Create `GuestListImportRow` with nullable source fields and a required row disposition/reason model, with a unique `(batchId, rowNumber)` key so replay updates the canonical evidence row instead of duplicating it.
3. Add `concertId`, `normalizedPhone`, active/cancelled state, `cancelledAt`, `updatedAt`, and `latestBatchId` semantics to `GuestListEntry`.
4. Backfill `GuestListEntry.concertId` from its batch, map existing imported/valid rows to active state, and preserve the original batch as `latestBatchId` before making `concertId` required.
5. Replace batch-scoped uniqueness with PostgreSQL partial unique indexes on `(concert_id, normalized_email)`, `(concert_id, normalized_phone)`, and `(concert_id, external_ref)` when the identifier is non-null. Add a check constraint requiring at least one normalized natural identifier for an active projection.
6. Add a partial unique index on `(concert_id, checksum)` where checksum is non-null, a unique `(concert_id, import_sequence)` constraint, and the import-row replay key. SHA-256 is stored as a fixed 64-character lowercase hexadecimal value.

Checksum scope is per concert: identical bytes may legitimately represent imports for two concerts, while the same bytes for one concert must resolve to one canonical batch. Null is allowed only for a batch shell before an asset has been hashed; processing cannot transition to `PROCESSING` until checksum and source asset are present. The partial unique index is created with explicit SQL because Prisma schema syntax does not express partial unique indexes. Database integration tests inspect and exercise these constraints so schema drift is visible.

A wholesale table replacement was rejected because it increases migration and rollback risk. Application-only duplicate checks were rejected because concurrent requests can pass them simultaneously.

### 3. Claim the canonical batch and repair queue delivery

The request/discovery use case streams the file through the guest-list-owned storage port, computes SHA-256 before processing, and inserts the batch using the `(concertId, checksum)` constraint. While holding a short concert-row claim lock, it assigns the next monotonic `importSequence` for that concert. A uniqueness conflict loads and returns the canonical batch with request outcome `IDEMPOTENT_DUPLICATE`; PostgreSQL remains authoritative.

Database commit and BullMQ enqueue cannot be one atomic transaction. Therefore both newly created and already existing canonical batches pass through `ensureImportJob(batch)`. For a `PENDING` batch, or an explicitly recoverable stale `PROCESSING` batch, it creates or confirms one runnable deterministic BullMQ job keyed by `batchId`. Terminal batches are never re-enqueued. If enqueue fails after the database commit, the batch remains recoverable: later discovery, the Admin request path, and a scheduled pending-batch reconciler call the same ensure operation. A uniqueness conflict must not create a second batch or a second logical job, but it must not leave a non-terminal canonical batch stranded.

`ensureImportJob` is state-aware rather than existence-only. Existing `waiting`, `delayed`, or `active` jobs are retained. When a recoverable database batch is paired with a BullMQ job in `failed`, or with an inconsistent `completed` job, the stale job is removed or retried using BullMQ-supported operations and the same deterministic job ID is restored. Races during repair resolve to the one canonical deterministic job. Processing-order and active-lease errors are transient coordination outcomes: they do not mark the batch terminal. If their BullMQ attempts are exhausted, scheduled reconciliation can still restore a runnable job after the prerequisite batch completes or the lease becomes stale.

Batch processing uses an atomic transition from `PENDING` to `PROCESSING` with a bounded processing lease and attempt metadata. A worker may reclaim `PROCESSING` only after the lease expires; an active lease blocks another worker. Retries resume only the same batch. Terminal states are `COMPLETED`, `COMPLETED_WITH_ERRORS`, or `FAILED`; idempotent duplicate is a request outcome referencing the canonical batch rather than a second batch row. Counters are recomputed from canonical import-row evidence and report metadata is written in the finalization transaction.

### 4. Scheduled discovery is mandatory and isolated per candidate

`GuestListFileSourcePort.discover()` returns file candidates with explicit concert context and a readable source. The initial local adapter scans only regular `.csv` files directly under `data/guest-list-inbox/<concertId>/`. It validates each directory name as a UUID, verifies the concert exists before claim, resolves every candidate path beneath the configured inbox root, rejects symlinks/path escapes, and sorts candidates deterministically before claiming them. No filename guessing or CSV payload field is used to infer the concert. Successfully claimed files are moved to `data/guest-list-archive/<concertId>/<checksum>.csv` only after the canonical source asset and batch exist.

A scheduled service runs from the worker using the complete configured five-field cron expression, processes candidates independently, and records structured logs/metrics when a configured concert directory has no file or one candidate cannot be read. The implementation uses a maintained cron parser declared as a direct dependency; it does not infer due time from only the minute field. Environment validation invokes that parser during startup and rejects semantically invalid expressions such as out-of-range minutes/hours or a zero step. Runtime due-time evaluation remains inside the scheduler's guarded error path so an unexpected parser failure is logged rather than becoming an unhandled promise rejection. Reconciliation remains an independent fixed-interval recovery loop, while discovery follows the cron schedule. Overlapping discovery ticks in one worker process are suppressed. One invalid directory, missing file, or corrupt source does not prevent other candidates from being claimed.

The initial adapter is a configured local inbox suitable for the course demo. Admin may upload a CSV or trigger discovery through protected endpoints, but disabling those endpoints must not disable the scheduled worker. The schedule, inbox, file limits, row limit, retry count, and backoff are validated environment settings and documented in `.env.example`/README.

### 5. Own storage and file-source ports inside the guest-list module

The module defines `GuestListObjectStoragePort` and `GuestListFileSourcePort`. The local storage adapter follows the existing AI Artist Bio filesystem pattern but the guest-list domain does not import that domain's `ObjectStoragePort`. Extracting a platform-wide abstraction is deferred unless implementation proves both modules can adopt it without widening this change.

### 6. Validate the envelope and header before any active-data transaction

The infrastructure adapter accepts only configured byte limits, `text/csv` (plus the documented local-demo CSV MIME fallback), UTF-8 with an optional BOM, and a configured maximum row count. The initial local implementation intentionally parses one already-bounded buffer rather than claiming streaming behavior: `maxBytes` bounds the source buffer, decoded text, individual field upper bound, and total record set for the course-scale local adapter. It rejects undecodable input, NUL bytes, oversized files, unsupported content types, and malformed record width before active-data mutation.

The canonical case-insensitive trimmed headers are `guest_name`, `email`, `phone`, `external_ref`, and optional `action`. At least one of email, phone, or external reference must be present per UPSERT row. `action` defaults to `UPSERT`; the only other value is `CANCEL`. Missing/unknown/duplicate required headers fail the batch before any active guest mutation. Parsing and header validation finish before the transactional row-application phase.

### 7. Normalize, match, and apply rows deterministically

Emails are trimmed and case-folded. Phones are converted to a documented canonical E.164-like representation for Vietnamese numbers (`0...` to `+84...`) and otherwise require an explicit country code. External references are trimmed and case-sensitive. Normalized values are used for lookup and constraints while original display values remain available in batch-row evidence.

Rows are processed in ascending row number. Duplicate natural identifiers within the file are reported as duplicate rows after the first valid occurrence. For each UPSERT row, all supplied identifiers are resolved for the concert:

- no match: create one active entry;
- all matches resolve to the same entry: update/reactivate that entry and its latest batch reference;
- identifiers resolve to different entries: record `CONFLICT` and do not merge or mutate those entries.

Valid CANCEL rows require at least one natural identifier. They cancel only when every matched identifier resolves to one existing guest; no match or split matches are row-level errors. Omission from a file never cancels a guest. Active lookup filters `ACTIVE` only.

After header validation, import-row evidence and active projection changes are committed in deterministic bounded transactions. Before mutating the active projection, row application reads the canonical `(batchId, rowNumber)` evidence. Existing evidence is returned unchanged and no projection mutation is repeated. For a new row, the projection mutation and immutable evidence insert occur in one transaction; an evidence uniqueness race rolls back the competing mutation and reloads the canonical evidence outside the failed transaction. Final counters are recomputed from evidence rather than incremented blindly. A retry after partial progress can therefore replay from the beginning without changing `IMPORTED` into `UPDATED`, duplicating cancellation/reactivation, or altering report counts.

PostgreSQL uniqueness violations are never swallowed inside an interactive transaction followed by more queries, because the transaction may already be aborted. The row transaction is allowed to roll back first. Outside that transaction, the repository distinguishes an evidence-key race from a concert-scoped natural-identifier race: an existing canonical evidence row is returned unchanged; otherwise the repository re-resolves current identities and writes a `CONFLICT` evidence row in a fresh transaction without mutating the active projection. If the failure cannot be classified safely, it is rethrown rather than reported as a successful import outcome.

Before applying rows, the worker acquires a concert-scoped processing lock and verifies that no lower `importSequence` batch for that concert remains non-terminal. A later sequence is delayed/retried until earlier sequences are terminal, so different files cannot overtake one another. The claim sequence is the authoritative order: a file submitted later is treated as a later operational instruction even if its filesystem timestamp is older. The lock is released after the batch reaches a terminal state; batches for different concerts remain parallel. PostgreSQL uniqueness violations are translated into duplicate/conflict row outcomes and never into accidental merges.

### 8. Define one queue contract and wire both runtime compositions

Queue name/job constant: `guest_list.import_requested`. Its versioned payload contains only `batchId`; the worker reloads authoritative source, concert, and checksum data from PostgreSQL. `QueueModule` registers it, the API/core composition provides Admin controllers and producers, and `BackendWorkerModule` provides the scheduler and processor. `GuestListImportModule` owns its use cases and adapters and is imported by both compositions with process-appropriate providers.

BullMQ retry/backoff follows existing worker conventions. On final failure the processor records `FAILED`, failure metadata, and a report if possible; throwing after recording allows BullMQ observability without leaving the batch in `PROCESSING`.

### 9. Separate Admin management from staff lookup and QR scan

Admin endpoints request upload/import or discovery, list/get batches, and retrieve a report asset/stream. They use existing JWT, role, and Admin authorization conventions and validate that the target concert exists and is in the actor's allowed management scope.

VIP lookup is a separate check-in-facing endpoint, for example `POST /guest-list/lookup`. The shared Zod contract contains `assignmentId`, `concertId`, optional gate, lookup type (`email`, `phone`, or `external_ref`), and value. The response is a strict discriminated union for `found`/`not_found` and returns only required guest display fields. A dedicated HTTP request adapter/pipe parses the unknown request body with the shared strict Zod request schema, so trimming, bounds, UUID validation, and unknown-field rejection cannot drift from `@ticketbox/api-types`; the mapper validates the shared response schema.

The controller maps only known staff-role, selected-assignment, concert, and gate authorization errors to the established forbidden response. Shared-schema failures are bad requests. Unexpected repository, mapper, storage, or programming failures are rethrown for the global exception layer to report as server failures and must not be disguised as assignment failures.

Before lookup, the use case loads the exact `assignmentId` through the existing check-in assignment repository and verifies that it belongs to the authenticated CHECKIN_STAFF user, is `ACTIVE`, targets the requested concert, and matches the optional requested gate using the same semantics as online QR scan. A different valid assignment must not authorize the client-supplied assignment ID. The lookup never calls or changes the QR scan use case.

### 10. Reports are derived from immutable batch rows

The terminal report includes batch identity, source/checksum, timestamps, totals, imported/updated/cancelled/invalid/duplicate/conflict counts, and row-numbered reasons. It is generated from the batch and import-row evidence, stored through the guest-list-owned storage port, and referenced by the batch. Authorized Admin retrieval can regenerate it if the report asset is unavailable, without consulting the mutable active projection.

## Risks / Trade-offs

- [Risk] Partial unique indexes are not fully represented by Prisma schema metadata. → Mitigation: create named SQL indexes in the migration and add database tests that assert same-concert conflicts and cross-concert allowance.
- [Risk] Multiple natural identifiers can point to different historical guests. → Mitigation: resolve all supplied identifiers first and report a conflict instead of choosing or merging.
- [Risk] A worker crash can leave `PROCESSING` batches. → Mitigation: use atomic claims, retry the same deterministic job, and allow recovery of stale processing batches under explicit retry rules.
- [Risk] PostgreSQL commit can succeed before BullMQ enqueue fails. → Mitigation: keep non-terminal batches repairable and use deterministic `ensureImportJob` from claim, rediscovery, Admin retry, and scheduled reconciliation paths.
- [Risk] A retained BullMQ `failed` job can block deterministic job recreation even while the database batch remains recoverable. → Mitigation: inspect job state, retain runnable states, and replace/retry stale terminal queue states for non-terminal database batches.
- [Risk] Different files for one concert can finish out of order. → Mitigation: assign a monotonic per-concert import sequence and serialize row application by that sequence while preserving cross-concert parallelism.
- [Risk] A retry after partial row commits can duplicate evidence or counters. → Mitigation: enforce `(batch_id, row_number)` uniqueness, use replay-safe upserts, and recompute terminal counters from evidence.
- [Risk] A retry can reinterpret a previously imported row as an update. → Mitigation: treat existing immutable evidence as the committed row checkpoint and skip all projection mutation for that batch and row.
- [Risk] Partial or syntax-only cron validation can run discovery at unintended times or fail every scheduler tick. → Mitigation: parse the complete expression during environment validation, keep runtime evaluation inside guarded error handling, and test interval, fixed-minute, fixed-hour, out-of-range, and zero-step schedules.
- [Risk] Catch-all VIP error mapping can hide infrastructure failures as authorization failures. → Mitigation: map only explicit domain authorization errors and allow unknown failures to reach the global server-error handler.
- [Risk] Catching a PostgreSQL unique violation inside an interactive transaction and continuing can leave the transaction aborted. → Mitigation: roll back first, classify the conflict outside the failed transaction, and persist conflict evidence in a fresh transaction.
- [Risk] Database integration tests can exceed Vitest's default timeout when the full suite runs in parallel. → Mitigation: assign explicit database-test timeouts and/or a serial database test pool, and require the normal repository `npm test` command to pass without ad hoc CLI overrides.
- [Risk] CSV parsing can consume excessive memory or CPU. → Mitigation: enforce byte/row limits, stream hashing/parsing where supported, bound fields, and reject invalid encoding early.
- [Risk] Scheduled local-inbox discovery can repeatedly observe processed files. → Mitigation: checksum uniqueness makes rediscovery safe; the adapter archives or marks successfully claimed files after the canonical batch exists.
- [Risk] Cancellation can remove legitimate access. → Mitigation: accept only explicit `CANCEL` rows, require an unambiguous existing identity, audit the row, and never infer cancellation from absence.
- [Trade-off] Per-row conflict evidence adds storage. → Keep retention configurable later; correctness and reportability take precedence for the initial implementation.

## Migration Plan

1. Add enums/columns, per-concert sequence and processing lease metadata, and `GuestListImportRow`; backfill concert and lifecycle fields from existing batch relationships.
2. Validate no existing rows violate proposed concert-scoped identifiers; abort migration with a diagnostic query if conflicts exist.
3. Drop obsolete batch-scoped unique constraints and create named checksum/natural-key indexes, `(concert_id, import_sequence)` and `(batch_id, row_number)` uniqueness, and check constraints.
4. Deploy API/core and worker code with queue registration and configuration together; keep the scheduler disabled until migration and environment values are present, then enable it as part of the same release runbook.
5. Verify with Prisma migration tests, concurrent import tests, queue integration tests, and Admin/staff E2E tests before enabling production discovery.

Rollback first disables scheduled discovery and queue producers, drains or pauses the guest-list queue, then rolls back application code. The additive evidence table/columns may remain during rollback to avoid data loss; destructive schema rollback requires exporting reports and active guest data first.

## Open Questions

None. The initial implementation uses the `<inbox>/<concertId>/*.csv` adapter, per-concert checksum scope and claim sequence, SHA-256, deterministic queue repair, replay-safe row evidence, explicit `UPSERT`/`CANCEL` actions, and exact selected-assignment validation with the existing gate-name model.
