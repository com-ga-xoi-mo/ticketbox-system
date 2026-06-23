## Context

The Ticketbox check-in system currently supports online-only QR scanning through `POST /checkin/scan`. The mobile app (`apps/checkin-mobile`) has a `ScanWorkflow` class that submits scans directly to the API. When the network is unavailable, scans fail with a local transport result; the accepted specs and tests intentionally defer offline queue, SQLite persistence, batch sync, and conflict resolution to this change.

The backend (`packages/backend/src/checkin`) uses a clean hexagonal architecture: `OnlineCheckinUseCase` orchestrates assignment verification, QR hash lookup, ticket validation, duplicate detection, and accepted scan persistence via `CheckinTicketRepositoryPort`. The `CheckinEvent` Prisma model already has columns for `source` (ONLINE/OFFLINE_SYNC), `deviceId`, `offlineEventId`, `syncedAt`, and `rejectionReason`, plus a `CONFLICT` enum value in `CheckinEventResult`. The unique index `@@unique([deviceId, offlineEventId])` ensures idempotent offline sync.

The shared contract package `@ticketbox/api-types` provides Zod schemas for `OnlineScanRequest`, `OnlineScanResponse`, and `StaffAssignment`. The same validation strategy (Zod discriminated unions, strict mode) will be applied to the batch sync contract.

## Goals / Non-Goals

**Goals:**

- Staff can scan tickets without network connectivity and have those scans accepted when connectivity returns.
- Offline scans persist locally in SQLite and survive app restart.
- Batch sync sends all pending scans to the server and processes per-event results.
- The server correctly detects duplicate and conflict scenarios across online and offline scans.
- Sync triggers automatically on connectivity restore and can be triggered manually.
- Staff see clear feedback: queue count, sync progress, per-event results, retry actions.
- Shared Zod schemas for batch sync follow the same architecture boundary strategy as online scan schemas.

**Non-Goals:**

- VIP guest lookup at check-in (separate `implement-guest-list-import` scope).
- Modifying the existing `POST /checkin/scan` online endpoint behavior.
- WebSocket/SSE live sync (blueprint stretch goal).
- Using SQLite for anything other than the offline scan queue on mobile.
- Offline authentication or assignment loading (network is required for login and assignment refresh).

## Decisions

### Decision 1: SQLite via `expo-sqlite` for offline scan queue

**Choice**: Use `expo-sqlite` to persist offline scan events, not AsyncStorage. Hash the decoded QR payload immediately with SHA-256 over its UTF-8 bytes and persist only the lowercase 64-character hexadecimal `qrPayloadHash`; never persist or log the raw QR payload.

**Rationale**: AsyncStorage is suitable for lightweight key-value state (session tokens, preferences) per blueprint Decision 8, but the offline scan queue requires structured queries (`SELECT ... WHERE sync_status = 'pending'`), batch updates, and transactional consistency. SQLite provides this natively. Persisting the hash matches the blueprint, matches `Ticket.qrTokenHash`, and avoids retaining a reusable raw QR value on the device.

**Alternatives considered**:

- AsyncStorage with JSON arrays: Poor query performance, no transactional guarantees for batch mark-as-synced, risk of partial writes on crash.
- WatermelonDB / Realm: Overkill dependency for a single table queue.

### Decision 2: Port/adapter pattern for `OfflineScanQueue`

**Choice**: Define an `OfflineScanQueue` interface (port) with account-scoped `enqueue()`, `getPendingScanEvents(staffUserId, limit)`, `markSynced()`, `markFailed()`, `getPendingCount(staffUserId)`, and `clearSynced(staffUserId)`. Every row stores `staffUserId`; the SQLite adapter never returns one staff user's events to another authenticated user. Logout preserves pending rows.

**Rationale**: Consistent with the existing port/adapter patterns in both the backend (`CheckinTicketRepositoryPort`) and mobile (`CheckinApiClient`, `DeviceIdProvider`). Enables unit testing the `SyncService` with an in-memory fake queue. The SQLite adapter is an infrastructure concern isolated from business logic.

### Decision 3: Compose network-aware behavior alongside existing `ScanWorkflow`

**Choice**: Extend `ScanWorkflow` to accept an `OfflineScanQueue`, QR hasher, and `NetworkMonitor` port. It enqueues immediately when offline. When online, it submits normally but falls back to enqueueing the same scan after a network/timeout error, HTTP 5xx response, or unparseable successful response whose commit status is unknown. HTTP 401 requests re-authentication; HTTP 403, HTTP 4xx validation failures, and completed business results are shown directly and are never enqueued. The workflow exposes a reactive `mode` property (`online` | `offline`).

**Rationale**: The existing `ScanWorkflow` is a well-tested state machine. NetInfo only reports connectivity, not API reachability, so transport-aware fallback is required to avoid losing scans on connected but unusable venue networks. If the server committed before the response was lost, the later sync is safely classified by the atomic duplicate/conflict path.

**Alternatives considered**:

- Separate `OfflineScanWorkflow` class: Would duplicate the initialization, debounce, and state machine logic.
- Middleware/interceptor in the API client: Too low-level; the "queued for sync" result is a workflow concern, not a transport concern.

### Decision 4: `SyncService` as a standalone class with exponential backoff

**Choice**: Create a single-flight `SyncService` that reads at most 100 pending events owned by the authenticated `staffUserId`, sends them to `POST /checkin/sync`, processes per-event results, and continues with the next chunk. It uses exponential backoff (base 1s, max 30s, jitter) only for network/timeout and HTTP 5xx failures. HTTP 401 stops retries, preserves pending events, and enters `authentication-required`; HTTP 403 stops retries and exposes a non-retryable authorization error. Auto-trigger on `NetworkMonitor` online transition; allow manual trigger. Concurrent auto/manual triggers join the active run instead of starting another run, and subscriptions/timers are disposed with the app lifecycle.

**Rationale**: Sync is an independent concern from scanning. It runs on its own schedule (connectivity restore, manual trigger). Exponential backoff prevents server overload when connectivity is flaky. The sync service consumes the same `CheckinApiClient` interface as the scan workflow.

### Decision 5: Shared batch sync contract in `@ticketbox/api-types`

**Choice**: Add `BatchSyncRequest` and `BatchSyncResponse` Zod schemas following the same strict discriminated-union pattern. `BatchSyncRequest` is an array with at most 100 events. Each event has a unique bounded `localId`, bounded installation `deviceId`, assignment context, and a SHA-256 `qrPayloadHash`; `offlineEventId` in persistence is exactly the request `localId`. `BatchSyncResponse` is an array of per-event results correlated by unique `localId` with status accepted/duplicate/invalid/conflict/unassigned. The NestJS adapter validates the request directly with `BatchSyncRequestSchema` through a Zod body pipe; no equivalent class-validator DTO is created.

**Rationale**: Follows the established shared contract strategy and keeps one runtime request definition. The bounded and unique `localId` allows deterministic result correlation and database idempotency, while the batch limit bounds request validation and database work.

### Decision 6: One atomic acceptance operation serves online and offline paths

**Choice**: Extract reusable assignment and ticket validation into an application service, then make final acceptance a single repository operation shared by `OnlineCheckinUseCase` and `BatchSyncUseCase`. Inside one database transaction, conditionally update the ticket only where it is still `ISSUED` and `checkedInAt IS NULL`. If exactly one row is claimed, create the accepted event and commit. If zero rows are claimed, read the existing accepted event and return duplicate/conflict without creating another accepted event. A failure to create the event rolls back the ticket claim.

**Rationale**: The existing check-then-write transaction can allow concurrent requests to observe an unused ticket before either updates it. A conditional database write, not an earlier read, is the acceptance decision. This satisfies the blueprint's at-most-one accepted event rule without a Prisma migration. Device `scannedAt` is audit-only; the first successful server-side claim wins.

**Conflict and idempotency order**:

1. Look up `(deviceId, offlineEventId)` before processing. An exact replay returns the deterministic previously stored outcome only when its persisted `staffId` matches the authenticated JWT actor; a different actor receives no prior event metadata and cannot take ownership of the row.
2. Validate the authenticated actor, assignment, concert, and ticket using the JWT actor; client `staffUserId` is never trusted by the backend.
3. Attempt the conditional ticket claim.
4. Claim success returns `accepted`; claim loss to an accepted event from the same `deviceId` returns `duplicate`; claim loss to another device returns `conflict`.
5. Persist offline outcomes with `offlineEventId=localId`, `source=OFFLINE_SYNC`, device `occurredAt`, and server `syncedAt` so retries remain deterministic.

### Decision 7: Independent per-event processing in batch sync

**Choice**: Each business outcome in a batch is processed independently. Invalid, unassigned, duplicate, or conflict for one event does not block other events. An unexpected database/infrastructure failure is not converted into a business result: the endpoint fails with 5xx, and mobile leaves all events without a confirmed response pending. Earlier committed events are safe to replay because of `(deviceId, offlineEventId)`. Response correlation uses unique `localId`; response ordering is preserved but clients do not rely on position alone.

**Rationale**: At a busy concert gate, a batch may contain 50+ scans from the last 30 minutes offline. Failing the entire batch because one QR was invalid would be unacceptable. Per-event independence also simplifies mobile result processing.

### Decision 8: `NetworkMonitor` port with Expo NetInfo adapter

**Choice**: Define a `NetworkMonitor` interface with `isOnline(): boolean` and `onStatusChange(callback): unsubscribe`. Implement with `@react-native-community/netinfo`. The scan workflow and sync service consume this port.

**Rationale**: Testability. Fake network monitors in tests allow deterministic online/offline transitions without platform APIs.

### Decision 9: Terminal business failures remain inspectable, not retryable

**Choice**: `accepted` and `duplicate` rows become `synced`. `invalid`, `conflict`, and `unassigned` rows become terminal `failed` rows with reason details and remain visible until explicitly cleared. Transport failures, HTTP 5xx, and HTTP 401 never mark rows failed; they remain `pending`. The retry action retries pending transport failures, not terminal business failures.

**Rationale**: Retrying a deterministic rejection creates load without changing the outcome. Preserving terminal results gives staff an auditable explanation while keeping retry semantics unambiguous.

### Decision 10: Preserve typed transport categories through the mobile client

**Choice**: The HTTP client distinguishes authorization failures (401/403), non-retryable request failures (other HTTP 4xx), retryable service failures (HTTP 5xx), transport failures, and unparseable successful responses with unknown commit status. `ScanWorkflow` enqueues only transport failures, HTTP 5xx, and unknown-commit response failures. `SyncService` retries only those same retryable categories; queue persistence, response-correlation, and other internal defects transition to local `error` and stop the active run.

**Rationale**: A generic `unavailable` value loses the information required by the workflow. Queuing a malformed 4xx request creates a permanently failing event, while retrying SQLite/programming failures indefinitely hides defects and consumes battery.

### Decision 11: Generate local idempotency keys with UUIDs

**Choice**: Inject a local ID provider into `ScanWorkflow` and use `expo-crypto.randomUUID()` in production. Generate one UUID per queued scan and persist it unchanged as `localId`; do not derive it from device time, an in-memory counter, or process lifetime.

**Rationale**: `localId` becomes the server `offlineEventId` and therefore must remain collision-resistant across app restart, clock changes, and multiple scans in the same millisecond. Injection keeps workflow tests deterministic.

### Decision 12: Bootstrap failure is an explicit recoverable application state

**Choice**: Catch database open/migration failures during app composition, avoid unhandled promise rejection, and expose a recoverable error with a retry action. The app never reports the queue as available until initialization succeeds and never reports a scan as queued after a persistence failure.

**Rationale**: Leaving the scanner in `initializing` with no explanation makes the gate workflow unusable and contradicts the requirement for visible recoverable failures.

### Decision 13: Archive evidence must be reproducible from a clean install

**Choice**: Update `package-lock.json` with all declared workspace dependencies, verify a clean lockfile-based install can resolve them, and fix only the minimal unrelated type-test fixture exposed by the mandatory workspace build. Archive requires a green workspace build plus a real PostgreSQL E2E run in which the check-in tests execute rather than skip.

**Rationale**: Passing tests against an ad hoc `node_modules` tree is not reproducible evidence. The concurrency guarantee is database-dependent and cannot be established by mocks or skipped E2E tests.

## Risks / Trade-offs

- **[Time skew]** Offline `scannedAt` timestamps come from the device clock, which may be inaccurate → Mitigation: Server records `syncedAt` independently; for audit purposes, `scannedAt` is "device-reported" and `syncedAt` is authoritative. No business logic depends on device clock accuracy.

- **[Large queues]** A device offline for hours could accumulate hundreds of scans → Mitigation: Limit each request to 100 events, process chunks sequentially, and keep each event in its own acceptance transaction.

- **[Stale assignment]** Staff assignment may be revoked while device is offline → Mitigation: Server re-validates assignment at sync time. Events for revoked assignments get `unassigned` result per-event. Staff sees clear feedback.

- **[Account switching]** Another staff member may log in on the same installation → Mitigation: Bind rows to `staffUserId`, query and clear them only for the current authenticated user, and continue to derive backend authority exclusively from JWT.
- **[Sensitive QR data]** A raw ticket QR retained on device could be reused → Mitigation: Hash immediately, persist/send only the SHA-256 hash for offline sync, never log the raw payload, and clear synced/terminal rows through explicit retention controls.
- **[SQLite corruption]** Expo SQLite database corruption on crash → Mitigation: WAL mode enabled and queue operations use transactions. If persistence fails while a scan needs queueing, show a blocking recoverable error; never claim the scan was queued.

- **[Partial sync delivery]** Network drops mid-batch-POST → Mitigation: The `@@unique([deviceId, offlineEventId])` index on `checkin_events` makes re-sync idempotent. Mobile treats network failure during sync as "still pending" and retries.
- **[Failure-category drift]** A transport adapter may collapse 4xx, 5xx, and parse failures into one local status → Mitigation: Use explicit typed failure categories and test every category through both the API client and scan/sync workflows.
- **[Non-reproducible dependencies]** Local modules may exist without lockfile entries → Mitigation: Treat `package.json` and `package-lock.json` as one atomic change and verify from lockfile state before archive.

## Migration Plan

1. Add shared batch schemas and their adapter validation before exposing the endpoint.
2. Introduce and verify the shared conditional ticket-claim repository operation, then route the existing online use case through it without changing its wire contract.
3. Add the offline endpoint and database-backed concurrency/idempotency tests.
4. Add the mobile queue migration, account ownership, hashing, bounded sync, and UI wiring.
5. Roll back by disabling mobile offline enqueue/sync and removing the endpoint registration; the online endpoint remains compatible because its request/response contract is unchanged.

## Post-Review Remediations

An archive-readiness review surfaced a small set of robustness and consistency gaps that do not change the architecture but must be corrected before archive (tracked in tasks §12):

- **Deterministic offline-outcome write under race (Decision 6 refinement).** The `(deviceId, offlineEventId)` idempotency lookup and the non-accepted outcome write are not in a single transaction. A concurrent or replayed identical event can therefore reach `recordOfflineOutcome` and hit the unique constraint. A known duplicate/replay must resolve to its deterministic stored business outcome, not an HTTP 5xx; only genuine infrastructure failures propagate as 5xx. The write path catches `P2002` and re-reads the persisted outcome, mirroring the existing `recordAcceptedScan` behavior.
- **Online claim-loss audit parity.** When the shared atomic claim is lost online, a `DUPLICATE` audit event is recorded just like the early read-check duplicate path, so every duplicate has an audit row. The `POST /checkin/scan` wire contract is unchanged.
- **Backoff cap (Decision 4 clarification).** The jittered backoff is clamped so the effective delay never exceeds 30s, matching the stated "base 1s, max 30s, with jitter".
- **Scan workflow guard completeness (Decision 3 clarification).** The offline branch guard includes every dependency it uses, and `enqueue` exposes a recoverable error rather than silently leaving the workflow in `submitting` when a required dependency is absent.
- **Declaration ordering.** Mobile API-client error classes are declared before first use to remove a use-before-declaration that depends on call-time evaluation.

## Open Questions

None. Batch size, hashing format, retry classification, account ownership, winner selection, and validation ownership are fixed by this design.
