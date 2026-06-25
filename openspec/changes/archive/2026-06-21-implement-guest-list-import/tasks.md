## 1. Database Model and Constraints

- [x] 1.1 Update Prisma enums/models so `GuestListBatch` stores checksum, monotonic per-concert import sequence, processing lease/attempt, terminal/report/failure metadata and `GuestListImportRow` stores nullable raw values, normalized identifiers, row number, disposition, and reason.
- [x] 1.2 Refactor `GuestListEntry` into the concert-scoped active projection with normalized phone, active/cancelled state, cancellation timestamps, and latest contributing batch.
- [x] 1.3 Create the focused migration to backfill concert/lifecycle data, remove obsolete batch-scoped uniqueness, and add named uniqueness for `(concert_id, checksum)`, `(concert_id, import_sequence)`, `(batch_id, row_number)`, and non-null concert-scoped email, phone, and external reference plus processing-lease and natural-identifier constraints.
- [x] 1.4 Add database integration tests proving constraint metadata, atomic per-concert sequence allocation, same-checksum concurrency safety, row-evidence replay safety, same-concert natural-key uniqueness, cross-concert allowance, and migration preservation of existing valid guests.

## 2. Module Domain, Ports, and Normalization

- [x] 2.1 Scaffold `packages/backend/src/guest-list-import/` with domain/ports, application/use-cases, adapters/http, infrastructure/csv, database, file-source, queue, storage, and `guest-list-import.module.ts` boundaries.
- [x] 2.2 Define batch, row, active-guest, report, file candidate/source, repository, queue, clock, `GuestListFileSourcePort`, and guest-list-owned storage port contracts without importing the AI Artist Bio domain storage port.
- [x] 2.3 Implement and unit-test deterministic SHA-256 hashing, email normalization, Vietnamese/international phone normalization, external-reference normalization, and natural-identifier validation.
- [x] 2.4 Implement and unit-test deterministic identity resolution for no match, one consistent match, duplicate-in-file, and conflicting identifiers that resolve to different guests.

## 3. CSV Validation and Reporting

- [x] 3.1 Implement byte-bounded buffered CSV envelope validation for configured byte limit, supported CSV content types, UTF-8/BOM encoding, NUL rejection, and row limit for the initial local adapter.
- [x] 3.2 Implement canonical header validation and prove invalid headers fail before any active guest-list repository mutation.
- [x] 3.3 Implement row parsing for `UPSERT` and explicit `CANCEL`, preserving raw nullable values and row-numbered validation reasons for rows with missing required fields.
- [x] 3.4 Implement report generation from immutable batch/row evidence with reconciling total, imported, updated, cancelled, invalid, duplicate, and conflict counts.
- [x] 3.5 Add focused CSV/report tests for invalid header atomicity, invalid-row partial failure, normalization, duplicate rows in one CSV, conflicting identifiers, explicit cancellation, row limits, and report accuracy.

## 4. Import Claim and Processing Use Cases

- [x] 4.1 Implement the claim-import use case that stores the source asset, hashes before processing, atomically allocates the next concert-scoped import sequence, inserts or resolves the canonical `(concertId, checksum)` batch, and passes every recoverable non-terminal result through deterministic `ensureImportJob` instead of enqueueing only newly created batches.
- [x] 4.2 Implement atomic `PENDING`/`PROCESSING` lease transitions, expired-lease reclaim, and the worker import use case that validates the complete header before applying rows and finalizes `COMPLETED`, `COMPLETED_WITH_ERRORS`, or `FAILED` with counters recomputed from canonical row evidence.
- [x] 4.3 Implement concert-scoped processing serialization in monotonic `importSequence` order, delaying a batch while a lower sequence is non-terminal while allowing different concerts to process concurrently.
- [x] 4.4 Implement replay-safe `(batchId, rowNumber)` evidence upserts and idempotent transactional guest upsert/reactivation/cancellation, database-conflict translation, and preservation of existing active guests omitted from later files.
- [x] 4.5 Add use-case and repository tests for same-checksum re-import, failed-enqueue repair, concurrent same-file claims, concurrent different-file claim ordering, cross-concert parallelism, duplicate guests across changed files, natural-identifier conflicts, explicit cancellation, and preservation of existing valid guests.
- [x] 4.6 Add crash/retry tests proving partial row commits do not duplicate evidence, projection mutations, or counters; an active lease blocks another worker; an expired lease is reclaimable; terminal failure is recorded; and unrelated batches continue processing.

## 5. Scheduled Discovery, Storage, and Queue

- [x] 5.1 Implement the local-inbox `GuestListFileSourcePort` using `<inbox>/<concertId>/*.csv`, UUID/concert validation, regular-file-only and resolved-root checks, symlink/path-escape rejection, deterministic candidate ordering, and archive placement at `<archive>/<concertId>/<checksum>.csv` after canonical claim.
- [x] 5.2 Implement scheduled discovery so invalid directories, missing files, unreadable candidates, and concert lookup failures are observable and isolated while valid candidates continue through the shared claim workflow without filename or CSV-based concert inference.
- [x] 5.3 Define the `guest_list.import_requested` queue/job constants and versioned `{ batchId }` payload; implement idempotent `ensureImportJob`, deterministic producer job IDs, a pending-batch reconciliation path, and the BullMQ processor with configured retry/backoff behavior.
- [x] 5.4 Register the queue in `QueueModule` and wire API providers/controllers in `BackendCoreModule` and scheduler/processor providers in `BackendWorkerModule` through `GuestListImportModule`.
- [x] 5.5 Add queue and scheduler integration tests for explicit source-to-concert routing, invalid-candidate isolation, database-commit/enqueue-failure repair, no duplicate logical job, pending reconciliation, valid processing, retry, terminal failure, and processing of later independent candidates.

## 6. Admin Import APIs

- [x] 6.1 Implement shared application queries/use cases and Admin HTTP endpoints to upload/request an import, manually trigger discovery, list/get batches, and retrieve reports for an authorized concert scope.
- [x] 6.2 Apply existing JWT, role, Admin authorization, concert-existence/management checks, request limits, and safe error mapping without exposing source/report data to unauthorized actors.
- [x] 6.3 Add controller/use-case tests and E2E coverage for authorized Admin request/inspection/report retrieval, unauthorized roles, out-of-scope concerts, validation failures, and idempotent-duplicate responses.

## 7. VIP Lookup Shared Contract and Endpoint

- [x] 7.1 Add strict Zod VIP lookup request and discriminated `found`/`not_found` response schemas under `@ticketbox/api-types`, export them, and add contract tests for identifier types, assignment/concert/gate fields, normalization bounds, and response variants.
- [x] 7.2 Implement the backend DTO and response mapper using the shared runtime schemas, plus an active-guest lookup repository keyed by concert and one normalized identifier.
- [x] 7.3 Implement the separate VIP lookup use case/controller that loads the exact selected assignment ID and verifies CHECKIN_STAFF ownership, `ACTIVE` status, concert, and gate using existing QR-scan semantics without changing `POST /checkin/scan`.
- [x] 7.4 Add unit, database, and E2E tests for active VIP lookup by email/phone/external reference, cancelled/unknown not-found results, wrong role, missing/revoked/other-staff assignment IDs, another valid assignment not authorizing the supplied ID, concert mismatch, and gate mismatch.
- [x] 7.5 Run existing check-in contract and E2E tests to prove QR scan request/response behavior remains unchanged.

## 8. Configuration and Operational Documentation

- [x] 8.1 Extend the validated environment schema/config service with discovery cron, inbox/storage paths, byte/row limits, worker attempts, and backoff values using safe local defaults.
- [x] 8.2 Update `.env.example`, README/environment documentation, and local demo guidance with the `<inbox>/<concertId>/*.csv` and archive conventions, scheduled discovery setup, optional Admin fallback, sample header/action semantics, deterministic queue repair, processing-lease recovery, report retrieval, and failure recovery.
- [x] 8.3 Add configuration validation tests for defaults, invalid limits/cron/provider values, and process-specific module startup.

## 9. End-to-End Verification

- [x] 9.1 Add database-backed import E2E fixtures covering source-to-concert routing, invalid-candidate isolation, invalid header atomicity, invalid-row partial failure, normalization, duplicate rows, changed-file duplicates, identifier conflicts, same-checksum re-import, failed-enqueue repair, partial-progress replay, and concurrent same/different-file claims.
- [x] 9.2 Add E2E assertions for preservation of omitted guests, explicit cancellation only, durable historical reports versus current active guests, and exact report counters/reasons.
- [x] 9.3 Run focused unit, integration, database, queue/worker, API contract, Admin E2E, check-in assignment, and VIP lookup suites and record pass/fail evidence.
- [x] 9.4 Run repository lint/typecheck/API-boundary verification and `openspec.cmd validate implement-guest-list-import --strict`, resolving only failures caused by this change.

## 10. Post-Apply Correctness Fixes

- [x] 10.1 Make `GuestListImportProducer.ensureImportJob` inspect BullMQ job state: retain runnable `waiting`/`delayed`/`active` jobs, repair retained `failed` or inconsistent `completed` jobs for recoverable database batches using the same deterministic job ID, tolerate repair races, and never re-enqueue terminal database batches.
- [x] 10.2 Keep out-of-order and active-lease outcomes non-terminal and recoverable even when a BullMQ job exhausts attempts; add reconciliation coverage proving a retained failed job cannot strand a pending or stale-processing batch.
- [x] 10.3 Make `(batchId, rowNumber)` immutable evidence the replay checkpoint: return existing evidence before projection mutation, atomically commit each new projection mutation with an evidence insert, and resolve an evidence uniqueness race without repeating or committing the competing mutation.
- [x] 10.4 Add database-backed crash/retry tests that process at least one row, fail later in the batch, replay from the beginning, and prove the original `IMPORTED`/`UPDATED`/`CANCELLED` disposition, active projection, and report counters remain unchanged.
- [x] 10.5 Replace minute-field cron inference with full five-field cron evaluation through a maintained direct dependency, keep reconciliation on its independent recovery interval, prevent overlapping discovery ticks, and test `*/5 * * * *`, `15 * * * *`, and `0 2 * * *` deterministically.
- [x] 10.6 Parse VIP lookup request bodies through `VipLookupRequestSchema` at the HTTP boundary; map schema failures to `400`, map only known role/assignment/concert/gate domain errors to `403`, and allow unexpected repository/mapper/infrastructure failures to remain `500`.
- [x] 10.7 Add VIP controller tests for shared-schema trimming/strictness, known authorization failures, and unexpected failures; prove an unexpected repository failure is not converted to the assignment-specific forbidden response.
- [x] 10.8 Stabilize the guest-list E2E hook with an explicit local timeout or faster setup, then run the focused unit/integration suites, database guest-list suites, Admin/VIP E2E without command-line timeout overrides, existing check-in regression suites, lint, build, Prisma/API-boundary verification, `git diff --check`, and strict OpenSpec validation; record pass/fail evidence before marking this change complete.

### Verification Evidence (2026-06-21)

- PASS: standard `npm.cmd test` — 70 files, 327 tests.
- PASS: focused guest-list, database, Admin/VIP, and check-in regression suites — 19 files, 121 tests.
- PASS: `npm.cmd run lint` and `npm.cmd run build`.
- PASS: Prisma and API-boundary verification; all 6 migrations are applied and the database/schema diff is empty.
- PASS: `git diff --check` and `openspec.cmd validate implement-guest-list-import --strict`.

## 11. Final Verification Corrections

- [x] 11.1 Replace regex-only `GUEST_LIST_DISCOVERY_CRON` validation with a Zod refinement that invokes the declared cron parser and rejects out-of-range fields, zero steps, and other parser-invalid expressions during startup; add configuration tests for `99 99 * * *`, `*/0 * * * *`, and valid interval/fixed-time expressions.
- [x] 11.2 Move cron due-time evaluation inside `GuestListSchedulerService` error handling and add a scheduler test proving an unexpected parser/evaluation failure is logged or contained without producing an unhandled rejected interval promise or disabling reconciliation.
- [x] 11.3 Refactor `PrismaGuestListRepository.applyRow` so no query follows a caught PostgreSQL uniqueness violation inside the same interactive transaction: roll back, return canonical evidence for an evidence-key race, or re-resolve and persist `CONFLICT` evidence in a fresh transaction for a natural-key race; rethrow unclassifiable failures.
- [x] 11.4 Add a real PostgreSQL concurrency test that applies competing rows with the same concert-scoped normalized identifier and proves one active guest wins, the losing row records `CONFLICT`, neither transaction accidentally merges data, and report counters remain accurate.
- [x] 11.5 Align CSV artifacts and implementation around explicitly byte-bounded buffered parsing for the initial local adapter, reject malformed record width before mutation, and update focused tests so the change no longer claims unimplemented streaming or field-bound behavior.
- [x] 11.6 Stabilize the database-backed partial-failure and replay tests under the normal parallel repository run using explicit integration-test timeouts and/or a serial database test configuration; run `npm.cmd test` without CLI timeout overrides and require all files/tests to pass.
- [x] 11.7 Re-run focused guest-list, database, Admin/VIP E2E, check-in regression, lint, build, Prisma/API-boundary verification, migration status, `git diff --check`, and strict OpenSpec validation; replace the verification evidence above with current exact counts and do not mark this change complete while the standard repository test command fails.
