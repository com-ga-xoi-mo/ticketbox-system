## 1. Shared API Types

- [x] 1.1 Add `TicketCacheFullResponseSchema` and `TicketCacheDeltaResponseSchema` Zod schemas to `packages/api-types/src/checkin/ticket-cache.contract.ts`
- [x] 1.2 Extend `BatchSyncRequestSchema` with optional `since` (ISO datetime) field in `packages/api-types/src/checkin/batch-sync.contract.ts`
- [x] 1.3 Extend `BatchSyncResponseSchema` with optional `cacheUpdates` field (`upserted`, `voided`, `syncedAt`)
- [x] 1.4 Export new schemas and types from `packages/api-types/src/index.ts`
- [x] 1.5 Add contract tests for new schemas in `packages/api-types/src/contracts.spec.ts`
- [x] 1.6 Run `npm run build:api-types` and verify no type errors

## 2. Backend — Ticket Cache Endpoint

- [x] 2.1 Add `TicketCacheQueryPort` interface in `packages/backend/src/checkin/domain/ports/ticket-cache-query.port.ts` with `getFullCache(concertId)` and `getDeltaCache(concertId, since)` methods
- [x] 2.2 Implement `PrismaTicketCacheQueryAdapter` in `packages/backend/src/checkin/infrastructure/database/prisma-ticket-cache-query.adapter.ts` — queries `tickets` and `checkin_events` tables
- [x] 2.3 Create `GetTicketCacheUseCase` in `packages/backend/src/checkin/application/use-cases/get-ticket-cache.use-case.ts` — validates assignment ownership, routes to full or delta query
- [x] 2.4 Add `GET /checkin/ticket-cache` controller action in `packages/backend/src/checkin/adapters/http/checkin.controller.ts` with JWT guard + CHECKIN_STAFF role
- [x] 2.5 Register new port and use-case in `packages/backend/src/checkin/checkin.module.ts`
- [x] 2.6 Write unit tests for `GetTicketCacheUseCase` with fake port adapters

## 3. Backend — Extend Batch Sync with Cache Delta

- [x] 3.1 Extend `BatchSyncUseCase` in `packages/backend/src/checkin/application/use-cases/batch-sync.use-case.ts` to accept optional `since` and compute `cacheUpdates` AFTER processing events
- [x] 3.2 Update `POST /checkin/sync` controller to pass `since` from request body and include `cacheUpdates` in response
- [x] 3.3 Update response mapper in `packages/backend/src/checkin/adapters/http/checkin-contract.mapper.ts` for new response shape
- [x] 3.4 Update `BatchSyncUseCase` unit tests to cover `cacheUpdates` in response

## 4. Mobile — SQLite Ticket Cache Table

- [x] 4.1 Add `ticket_cache` table DDL to `OfflineQueueBootstrap` SQLite migration in `apps/checkin-mobile/src/features/offline-queue/offline-queue-bootstrap.ts`
- [x] 4.2 Create `TicketCacheRepository` class in `apps/checkin-mobile/src/features/ticket-cache/ticket-cache.repository.ts` with methods: `replaceAll`, `applyDelta`, `lookup(hash)`, `clearForStaff(staffUserId)`
- [x] 4.3 Write unit tests for `TicketCacheRepository` using in-memory SQLite

## 5. Mobile — Cache Download Service

- [x] 5.1 Add `submitTicketCacheRequest` method to `CheckinMobileApiClient` interface and `HttpCheckinMobileApiClient` in `apps/checkin-mobile/src/api/`
- [x] 5.2 Create `CacheDownloadService` in `apps/checkin-mobile/src/features/ticket-cache/cache-download.service.ts` — calls `GET /checkin/ticket-cache`, writes to `TicketCacheRepository`, tracks `lastCacheSyncAt`
- [x] 5.3 Write unit tests for `CacheDownloadService` with fake API client and fake repository

## 6. Mobile — Offline Validation in ScanWorkflow

- [x] 6.1 Extend `ScanWorkflow` constructor to accept `TicketCacheRepository` as optional dependency in `apps/checkin-mobile/src/features/scanner/scan-workflow.ts`
- [x] 6.2 In `ScanWorkflow.submitDecodedPayload`, when offline and cache available: hash payload → lookup in `TicketCacheRepository` → return `accepted`/`duplicate`/`invalid` result; fall back to `enqueue()` when no cache
- [x] 6.3 On local `accepted`: mark hash as `checked_in` in `TicketCacheRepository` before enqueuing
- [x] 6.4 Update `ScanWorkflow` unit tests to cover offline cache validation paths (accepted, duplicate, invalid, fallback-to-queue)

## 7. Mobile — SyncService Cache Delta Merge

- [x] 7.1 Extend `SyncService` to accept `TicketCacheRepository` as optional dependency in `apps/checkin-mobile/src/features/offline-queue/sync-service.ts`
- [x] 7.2 After `applyResponse`, if `BatchSyncResponse` contains `cacheUpdates`, call `TicketCacheRepository.applyDelta(staffUserId, cacheUpdates)`
- [x] 7.3 Pass `lastCacheSyncAt` as `since` in every `BatchSyncRequest` when available
- [x] 7.4 Update `SyncService` unit tests to cover cache delta merge path

## 8. Mobile — Assignment Selection + Cache Download Trigger

- [x] 8.1 In `App.tsx`, after assignment is selected and device is online, call `CacheDownloadService.download(assignment, session)`
- [x] 8.2 Add `cacheStatus` state: `idle` | `downloading` | `ready` | `unavailable`; block scanner until `ready` or `unavailable` (degraded mode)
- [x] 8.3 Show "Downloading ticket cache…" indicator while `downloading`; show warning badge when `unavailable` (offline at assignment time, using fallback queue mode)
- [x] 8.4 On logout, call `TicketCacheRepository.clearForStaff(staffUserId)`

## 10. Offline Detection & Request Resilience

- [x] 10.1 **(root cause)** Fix `NetInfoNetworkMonitor` to import `@react-native-community/netinfo` via a static literal specifier so Metro bundles it; add `.catch` on both `.then` chains so init failure is logged instead of leaving `online` permanently `true`
- [x] 10.2 Wrap every `fetch()` in `HttpCheckinMobileApiClient.request()` with a 5-second `Promise.race` timeout (defense-in-depth) — fires `ApiTransportError` reliably even when React Native ignores `AbortController.signal`
- [x] 10.3 In `ScanWorkflow.submitDecodedPayload`, after transport-error fallback: if `ticketCache` exists call `validateOffline()` (cache lookup → `accepted`/`duplicate`/`invalid`); otherwise fall back to `enqueue()` (`queued`)
- [x] 10.4 Wrap `ScanWorkflow.validateOffline()` body in try/catch so a hashing/SQLite failure resolves to `recoverable-error` instead of rejecting — the workflow must never leave the UI in `submitting`
- [x] 10.5 Add a `.catch` to the `App.tsx` scan submission handler that sets a `recoverable-error` state, as a final safety net

## 11. Cache Robustness Fixes (Found via Exploration)

- [x] 11.1 In `App.tsx`, update the `restoreStartupSession` completion block to call `triggerCacheDownload` when auto-routing to the scanner.
- [x] 11.2 In `SyncService.run()`, remove the early return when `pending.length === 0`, ensuring `submitBatchSync` is called to fetch `cacheUpdates` even with an empty queue. Wait or delay at the end of the loop if queue is empty to enforce the 30s background sync interval.
- [x] 11.3 In `App.tsx`, set up a 30s polling interval to call `syncService.trigger()` when authenticated, to drive the background cache sync.
- [x] 11.4 In `TicketCacheRepository`, implement `hasCache(staffUserId, concertId)` to check if the cache is populated.
- [x] 11.5 In `ScanWorkflow.validateOffline()`, call `hasCache` before lookup. If false, bypass cache validation and fall back to `enqueue()` (queue mode).

## 9. Verification

- [x] 9.1 Run `npm run build && npm run lint && npm run test` — all pass
- [x] 9.2 Manual test: select assignment online → verify cache downloads → toggle airplane mode → scan valid ticket → see `accepted` immediately
- [x] 9.3 Manual test: scan same ticket again offline → see `duplicate`
- [x] 9.4 Manual test: scan unknown QR offline → see `invalid`
- [x] 9.5 Manual test: restore network → `SyncService` syncs → `SyncStatusPanel` shows accepted count
- [x] 9.6 Manual test: select assignment while offline → see degraded mode warning → scan → see `queued`
