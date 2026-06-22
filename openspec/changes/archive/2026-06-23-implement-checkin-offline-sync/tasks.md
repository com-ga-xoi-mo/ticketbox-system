## 1. Shared API Contract — Batch Sync Schemas

- [x] 1.1 Create `packages/api-types/src/checkin/batch-sync.contract.ts` with strict `BatchSyncEventSchema`, `BatchSyncRequestSchema`, `BatchSyncEventResultSchema` (accepted/duplicate/invalid/conflict/unassigned), and `BatchSyncResponseSchema`; cap requests at 100 events, require unique trimmed `localId` values (1-160), bound `gate`/`deviceId`, and require lowercase 64-character SHA-256 `qrPayloadHash`
- [x] 1.2 Export batch sync schemas and inferred types from `packages/api-types/src/index.ts`
- [x] 1.3 Add Zod schema tests covering all result variants, strict unknown-field rejection, empty arrays, 100/101-event boundaries, duplicate/blank/oversized `localId`, invalid hash casing/length, oversized gate/device values, and missing fields
- [x] 1.4 Rebuild `@ticketbox/api-types` (`npm run build` in package) and verify consumers resolve

## 2. Backend — Batch Sync Use Case

- [x] 2.1 Extract assignment, QR-hash ticket lookup, concert, and ticket-state checks from `OnlineCheckinUseCase` into an application-layer `ScanValidationService` that does not import HTTP, Zod, Prisma, or mobile types
- [x] 2.2 Add batch sync domain types to `packages/backend/src/checkin/domain/checkin-scan.types.ts`: `BatchSyncEventCommand`, `BatchSyncEventResult` (with conflict status and conflictReason), `BatchSyncCommand`, `BatchSyncResult`
- [x] 2.3 Replace check-then-write acceptance with one repository port operation shared by online and offline use cases that conditionally claims only `ISSUED` tickets with null `checkedInAt` inside a transaction, creates the accepted event only after a successful claim, and rolls back the claim if event persistence fails
- [x] 2.4 Route `OnlineCheckinUseCase` through the shared atomic acceptance operation without changing the existing `POST /checkin/scan` request/response contract
- [x] 2.5 Add offline repository support that maps `localId` exactly to `offlineEventId`, stores `source=OFFLINE_SYNC`, device `occurredAt`, server `syncedAt`, and returns the previously stored outcome for exact `(deviceId, offlineEventId)` replay only when persisted `staffId` matches the JWT actor
- [x] 2.6 Implement `BatchSyncUseCase` with per-event business isolation; classify a different local event after same-device acceptance as `duplicate`, another-device acceptance as `conflict`, and propagate unexpected infrastructure failures instead of converting them to business outcomes
- [x] 2.7 Write use-case tests covering mixed outcomes, revoked/mismatched assignment, same-actor exact replay, cross-actor replay rejection without metadata disclosure, same-device duplicate, cross-device conflict, device timestamp not selecting the winner, and infrastructure error propagation

## 3. Backend — Batch Sync HTTP Adapter

- [x] 3.1 Add a NestJS Zod body-validation pipe for `BatchSyncRequestSchema` and use the inferred `BatchSyncRequest` wire type; do not create or maintain an equivalent class-validator DTO
- [x] 3.2 Add `POST /checkin/sync` method to `CheckinController` (or create a dedicated `BatchSyncController`) protected by `JwtAuthGuard`, `RolesGuard`, `@Roles(Role.CHECKIN_STAFF)`, calling `BatchSyncUseCase`
- [x] 3.3 Create batch sync response mapper in `checkin-contract.mapper.ts` (or new file) mapping `BatchSyncResult` domain type to `BatchSyncResponse` wire type
- [x] 3.4 Add request-adapter tests for invalid/oversized/duplicate-localId bodies and contract tests for every response mapper variant; keep response mapping deterministic and side-effect free without post-commit runtime parsing
- [x] 3.5 Register `BatchSyncUseCase` in `CheckinModule` providers with proper dependency injection

## 4. Backend — Repository and Integration Tests

- [x] 4.1 Add repository tests for conditional claim success/loss/rollback, offline persistence fields, exact replay, and `(deviceId, offlineEventId)` idempotency
- [x] 4.2 Add a real PostgreSQL concurrency test submitting the same unused ticket from two online/offline operations and assert exactly one accepted result, one duplicate/conflict result, one accepted event, and one checked-in ticket
- [x] 4.3 Add E2E tests for `POST /checkin/sync`: 401, 403, valid/mixed/empty batches, 100 accepted structurally, 101 rejected with 400 and no side effects, duplicate local IDs rejected, exact replay, same-device duplicate, cross-device conflict, and unexpected infrastructure failure returning 5xx

## 5. Mobile — Offline Scan Queue (SQLite)

- [x] 5.1 Add compatible `expo-sqlite` and `@react-native-community/netinfo` dependencies to `apps/checkin-mobile/package.json`; reuse the existing `expo-crypto` dependency for hashing
- [x] 5.2 Define an account-scoped `OfflineScanQueue` port with `enqueue()`, `getPendingScanEvents(staffUserId, limit)`, `markSynced()`, `markFailed()`, `getPendingCount(staffUserId)`, and `clearSynced(staffUserId)`
- [x] 5.3 Define `OfflineScanEvent` with `localId`, `staffUserId`, `deviceId`, `scannedAt`, `qrPayloadHash`, assignment context, sync status, terminal failure details, and no raw QR field
- [x] 5.4 Implement `SqliteOfflineScanQueue` with an explicit schema version/migration, WAL mode, unique local event identity, an index supporting `(staffUserId, syncStatus, scannedAt)` reads, transactional state updates, and all account-scoped port methods
- [x] 5.5 Add an injectable SQLite database/driver boundary compatible with the Node Vitest environment, then test queue migration, enqueue, bounded/account-scoped reads, cross-account isolation, terminal failure storage, counts, account-scoped clearing, logout preservation, and persistence across database re-open
- [x] 5.6 Create `InMemoryOfflineScanQueue` fake for use in workflow and sync service unit tests
- [x] 5.7 Add a mobile QR hasher using SHA-256 over UTF-8 bytes and tests proving output parity with the backend hash convention and proving raw QR is never written to the queue

## 6. Mobile — Network Monitor Port

- [x] 6.1 Define `NetworkMonitor` port interface in `apps/checkin-mobile/src/features/offline-queue/network-monitor.port.ts` with `isOnline(): boolean` and `onStatusChange(callback): unsubscribe`
- [x] 6.2 Implement `NetInfoNetworkMonitor` adapter using `@react-native-community/netinfo`
- [x] 6.3 Create `FakeNetworkMonitor` for deterministic unit tests

## 7. Mobile — Network-Aware Scan Workflow

- [x] 7.1 Extend `ScanWorkflow` with explicit `OfflineScanQueue`, `NetworkMonitor`, and QR-hasher dependencies while preserving injectable fakes for tests
- [x] 7.2 Add `mode` property (`online` | `offline`) to `ScanWorkflow` driven by `NetworkMonitor`
- [x] 7.3 Route offline scans to the account-owned queue and add online fallback enqueue for network/timeout/HTTP 5xx or unparseable-success unknown outcomes; return `queued` only after persistence succeeds and never enqueue HTTP 401/403, HTTP 4xx validation failures, or completed business results
- [x] 7.4 Add `queued` to `OnlineScanResult` union type (mobile-local, not in shared contract)
- [x] 7.5 Test online success unchanged, offline enqueue, connected-but-unreachable fallback, HTTP 5xx fallback, no enqueue on 401/403/business results, queue-write failure, account ownership, hashing, and connectivity transitions

## 8. Mobile — Batch Sync Service

- [x] 8.1 Extend `CheckinApiClient` interface with `submitBatchSync(accessToken, request: BatchSyncRequest): Promise<BatchSyncResponse>` method
- [x] 8.2 Implement `submitBatchSync` in `HttpCheckinMobileApiClient` with response validation via `BatchSyncResponseSchema`
- [x] 8.3 Implement a single-flight `SyncService` that reads only the authenticated user's queue in chunks of 100, maps `localId` to the wire event, processes response results by unique `localId`, and continues sequentially until drained
- [x] 8.4 Apply jittered backoff only to network/timeout/HTTP 5xx; preserve pending rows and enter `authentication-required` on 401, preserve rows and stop on 403, never retry terminal business failures, and dispose subscriptions/timers with app lifecycle
- [x] 8.5 Wire auto-sync on connectivity restoration and authenticated-session restoration plus a manual trigger that joins an active run rather than submitting an overlapping batch
- [x] 8.6 Test 100-event chunking, multiple chunks, unique-ID correlation, exact replay response, partial business outcomes, network/5xx retry, 401 pause and post-login resume, 403 stop, single-flight auto/manual triggers, disposal, and empty queue behavior

## 9. Mobile — Sync Status UI

- [x] 9.1 Add pending queue badge/counter component showing unsynced event count
- [x] 9.2 Add sync status panel/screen: pending count, last sync timestamp, in-progress indicator, per-status result counts, failed event list with reasons
- [x] 9.3 Add manual sync and retry actions for pending transport failures only; terminal invalid/conflict/unassigned events remain inspectable and are not presented as retryable
- [x] 9.4 Add account-scoped clear-synced action and an explicit separate clear-terminal-results action that never removes another staff user's rows
- [x] 9.5 Wire sync status UI to `SyncService` state and `OfflineScanQueue.getPendingCount()`

## 10. Integration and Verification

- [x] 10.1 Run `npm run build`, `npm run verify:checkin-mobile`, and `npm run verify:api-boundaries`; verify api-types, backend, and mobile typecheck/build boundaries separately
- [x] 10.2 Run `npm run test:checkin-mobile` — all mobile offline queue, workflow, and sync tests pass
- [x] 10.3 Run backend unit/integration tests with database-independent coverage enabled
- [x] 10.4 With PostgreSQL seed dependencies running, run `npx vitest run test/checkin/checkin.e2e-spec.ts` including the real concurrency and offline sync cases; do not skip the database evidence required by this change
- [x] 10.5 Run `npm run lint` — no lint errors
- [x] 10.6 Run `openspec validate implement-checkin-offline-sync --strict`

## 11. Post-Apply Remediation Before Archive

- [x] 11.1 Introduce explicit mobile HTTP failure categories for unauthorized (401/403), non-retryable request error (other 4xx), retryable service error (5xx), transport error, and unknown-commit response validation error; preserve them through `HttpCheckinMobileApiClient` instead of collapsing every non-auth HTTP error to `unavailable`
- [x] 11.2 Update `ScanWorkflow` so only network/timeout, HTTP 5xx, and unknown-commit response failures enqueue; add API-client and workflow regression tests proving HTTP 400/other 4xx never enqueue while 5xx and malformed successful responses do
- [x] 11.3 Replace timestamp/counter `localId` generation with an injected UUID provider backed by `expo-crypto.randomUUID()` and test uniqueness across simulated restart, identical timestamps, and deterministic fake providers
- [x] 11.4 Handle offline database open/migration rejection during `App` bootstrap, expose a recoverable error and retry action, prevent unhandled promise rejection/indefinite `initializing`, and add a testable bootstrap boundary with failure/retry coverage
- [x] 11.5 Add an explicit `SyncService` retry classifier so only transport/timeout, HTTP 5xx, and unknown-commit response failures use backoff; queue/database/correlation/programming errors SHALL enter `error`, stop the run, and preserve unconfirmed pending rows
- [x] 11.6 Add sync regression tests for SQLite/queue failure, incomplete or duplicate response correlation, internal exception stop behavior, and retryable response-validation failure without infinite internal-error retry
- [x] 11.7 Regenerate and commit `package-lock.json` from the declared workspace dependencies, confirm entries for `expo-sqlite`, `@react-native-community/netinfo`, and `@aws-sdk/client-s3`, and verify lockfile/package manifests are consistent
- [x] 11.8 Repair the minimal existing `ConcertWriteRepositoryPort` test fixture methods required by the current interface so workspace TypeScript build can run; do not change concert-management production behavior
- [x] 11.9 Verify dependency reproducibility from lockfile state using an appropriate clean-install check, then run `npm run build`, `npm run verify:checkin-mobile`, `npm run verify:api-boundaries`, and `npm run lint` with no errors
- [x] 11.10 Start/verify the seeded PostgreSQL dependency and run `npx vitest run test/checkin/checkin.e2e-spec.ts`; require all 15 check-in E2E tests, including real concurrent online/offline acceptance, to execute and pass with zero skipped tests
- [x] 11.11 Re-run `openspec validate implement-checkin-offline-sync --strict`, confirm all tasks are checked, assess/sync all three delta specs into main specs, and only then archive the change

## 12. Post-Review Code Remediation (from archive-readiness review)

- [x] 12.1 Make `recordOfflineOutcome` idempotent against the `(deviceId, offlineEventId)` unique constraint in `prisma-checkin-ticket.repository.ts`: catch Prisma `P2002` and resolve by re-reading the persisted event through `findOfflineEvent`, returning its stored deterministic outcome instead of letting a known duplicate/replay race surface as HTTP 5xx; genuine infrastructure errors SHALL still propagate. The upfront `findOfflineEvent` lookup and the outcome write are not in one transaction (TOCTOU), so the write path itself must tolerate a concurrent/replayed identical event. Add a repository test for concurrent same-`(deviceId, localId)` offline outcome and a use-case test for replay-race that assert a deterministic business result, exactly one `checkin_events` row, and no 5xx
- [x] 12.2 When `OnlineCheckinUseCase` loses the atomic claim (`recordAcceptedScan` returns `duplicate`), persist a `DUPLICATE` audit event via the existing rejected-scan path so an online race-loss has the same audit trail as the early read-check duplicate, without changing the `POST /checkin/scan` request/response contract. Add a test asserting a `DUPLICATE` `checkin_events` row is written when the claim is lost
- [x] 12.3 Cap the `SyncService` backoff after jitter so the effective delay never exceeds the documented 30s maximum (clamp the jittered value, not just the pre-jitter base), keeping Decision 4 and the spec "base 1s, max 30s, with jitter" consistent. Add a test asserting the computed delay is ≤ 30000ms for all retry counts
- [x] 12.4 Include `localIdProvider` in the offline-branch guard of `ScanWorkflow.submitDecodedPayload` and make `enqueue` surface a `recoverable-error` instead of silently returning the `submitting` state when a required dependency is missing, so the workflow can never get stuck in `submitting`. Add a workflow test for the offline path with the full dependency set and a guard test for the missing-provider case
- [x] 12.5 Resolve the use-before-declaration of `ApiResponseValidationError` in `http-checkin-mobile-api-client.ts` by moving the error class declarations above their first use, and confirm `npm run lint` reports no `no-use-before-define` (or equivalent) warnings
- [x] 12.6 After 12.1–12.5, re-run `npm run build`, `npm run verify:checkin-mobile`, `npm run verify:api-boundaries`, `npm run lint`, the mobile and backend unit/integration suites, and the real PostgreSQL `test/checkin/checkin.e2e-spec.ts` with zero skipped tests, then `openspec validate implement-checkin-offline-sync --strict` before proceeding to archive (§11.11)
