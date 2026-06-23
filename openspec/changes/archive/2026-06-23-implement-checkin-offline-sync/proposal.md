## Why

The check-in mobile app and backend API currently support online-only QR scanning. At Vietnamese concert venues, network connectivity is often unreliable (underground parking, crowded stadium RF saturation). Staff cannot scan tickets when the network drops, causing queue backups at gates. The offline scan queue, batch sync, and conflict resolution capabilities were explicitly deferred by `implement-checkin-mobile-app` and `implement-checkin-api` with TODO boundaries in `scan-workflow.ts` and the scanner tests. This change completes the offline sync story.

## What Changes

- **Mobile offline scan queue**: Add SQLite-based local scan event persistence (`expo-sqlite`) that stores only SHA-256 QR payload hashes, binds every event to the staff account that captured it, and survives app restart and logout.
- **Network-aware scan workflow**: Extend the existing `ScanWorkflow` to enqueue scans when the device is offline or when an online submission fails with a retryable transport/server error. Authentication and authorization failures remain explicit and are not converted into queued scans.
- **Batch sync service**: Implement a single-flight `SyncService` that reads only the current staff user's pending events, sends bounded batches of at most 100 events to the new `POST /checkin/sync` backend endpoint, processes per-event results, and uses exponential backoff only for retryable failures. Auto-trigger on connectivity restore; allow manual trigger from UI.
- **Sync status UI**: Add pending queue badge/counter, sync status panel with last-sync timestamp, in-progress indicator, per-event result summary, and retry/clear actions.
- **Shared batch sync contract**: Add `BatchSyncRequest` and `BatchSyncResponse` Zod schemas to `@ticketbox/api-types`, following the same discriminated-union validation strategy as the existing online scan contract.
- **Backend batch sync endpoint**: Add `POST /checkin/sync` protected by `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.CHECKIN_STAFF)`, processing each offline event independently with per-event results.
- **Backend batch sync use case**: Implement `BatchSyncUseCase` that reuses the existing assignment and ticket validation rules and records offline events with `source=OFFLINE_SYNC`, device-side `scannedAt`, and server-side `syncedAt`.
- **Atomic acceptance and conflict detection**: Replace check-then-write acceptance with one shared transactional conditional ticket claim used by online and offline paths. Exactly one concurrent request can accept a ticket; subsequent same-device attempts return `duplicate`, while attempts after another device accepted the ticket return `conflict`. Device timestamps are audit-only and never select the winner.
- **Canonical request validation**: Validate `POST /checkin/sync` directly with the shared Zod request schema at the HTTP adapter boundary instead of duplicating it with a class-validator DTO.
- **Post-apply mobile hardening**: Preserve HTTP failure categories so request-validation 4xx responses are never queued, use collision-resistant UUID local event identifiers, surface SQLite bootstrap failures as retryable UI state, and stop sync retries for internal queue/correlation defects.
- **Reproducible verification**: Commit the workspace lockfile for new mobile dependencies, resolve the narrowly observed workspace build blockers, and require the real PostgreSQL check-in E2E/concurrency suite to execute without skipped tests before archive.

## Capabilities

### New Capabilities

_(none — all capabilities are covered by existing specs being fulfilled)_

### Modified Capabilities

- `checkin-offline-sync`: Implementing the deferred offline scan queue, batch sync, and conflict handling requirements that were previously specified but not built. Adding batch sync API contract details (request/response schemas, per-event result statuses including `conflict`).
- `shared-api-contracts`: Extending the shared contract package with `BatchSyncRequest` and `BatchSyncResponse` schemas and types for the `POST /checkin/sync` endpoint.
- `checkin-mobile-app`: Fulfilling the "Offline sync is not claimed complete" boundary — the app will now claim offline scan queue, batch sync, and conflict resolution as implemented.

## Impact

- **`apps/checkin-mobile`**: New SQLite and NetInfo dependencies, new `offline-queue/` feature module, QR hashing, account-owned queue records, extended `ScanWorkflow`, new `SyncService`, new sync status UI components, updated `package.json`.
- **`package-lock.json`**: Updated for every declared dependency so a clean `npm ci` reproduces the verified workspace.
- **`packages/api-types`**: New `checkin/batch-sync.contract.ts` with Zod schemas, new exports from `index.ts`, package rebuild required.
- **`packages/backend/src/checkin`**: New `BatchSyncUseCase`, new `POST /checkin/sync` controller method or dedicated controller, shared atomic acceptance repository operation for online/offline paths, a Zod request-validation pipe at the HTTP boundary, and extended checkin module providers.
- **`prisma/schema.prisma`**: No schema changes needed — `CheckinEvent` already has `source`, `deviceId`, `offlineEventId`, `syncedAt`, `rejectionReason` columns and the `CONFLICT` result enum value.
- **`test/checkin`**: New E2E tests for batch sync endpoint alongside existing online scan E2E tests.
- **Dependencies**: `expo-sqlite` and `@react-native-community/netinfo` added to the mobile app; existing `expo-crypto` supplies SHA-256 hashing.
- **Workspace verification**: Existing build-only fixture/dependency blockers discovered by this change's mandatory verification are repaired with minimal scope; no concert-management business behavior is changed.
