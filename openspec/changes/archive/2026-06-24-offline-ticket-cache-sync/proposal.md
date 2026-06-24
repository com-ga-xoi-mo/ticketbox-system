## Why

When check-in staff loses network connectivity at the gate, the current app can only queue scans blindly — it cannot tell staff whether a ticket is valid, already used, or fake. This means staff must either halt the queue or let people through without validation, creating both operational disruption and fraud risk. Solving this now is critical as concerts scale to multiple gates with unreliable venue Wi-Fi.

## What Changes

- **New backend endpoint** `GET /checkin/ticket-cache` — returns all valid QR token hashes for a concert (full on first call, delta on subsequent calls using `since` timestamp). Protected by JWT + `CHECKIN_STAFF` + valid assignment.
- **Extended `POST /checkin/sync` response** — after processing local scan events, server computes and returns a `cacheUpdates` delta so a single round-trip both pushes results and refreshes the local cache.
- **New mobile SQLite table `ticket_cache`** — stores `qr_token_hash`, `concert_id`, `status` (`valid` | `checked_in`), `cached_at` per staff-assigned concert.
- **Offline validation in `ScanWorkflow`** — when offline, hash the QR payload and look it up in local cache: `not found → invalid`, `checked_in → duplicate`, `valid → accepted locally + mark checked_in + enqueue for sync`.
- **Cache download phase** — after selecting an assignment (while online), app triggers a full cache download before allowing scanning.
- **Background delta sync** — `SyncService` merges `cacheUpdates` from every sync response into the local cache (voided tickets deleted, checked-in updated, new tickets inserted).

## Capabilities

### New Capabilities

- `checkin-ticket-cache`: Backend endpoint and mobile SQLite cache for pre-downloading valid ticket hashes per concert, enabling offline QR validation without server round-trips.

### Modified Capabilities

- `checkin-offline-sync`: Extends the batch sync response contract to include `cacheUpdates` (delta of ticket status changes since last sync). The request also gains an optional `since` timestamp for delta computation.
- `checkin-mobile-app`: Mobile scan workflow gains offline validation path (local cache lookup) and a cache download phase after assignment selection. `ScanWorkflow` no longer blindly queues when offline — it returns real `accepted`/`duplicate`/`invalid` results using the local cache.
- `shared-api-contracts`: New Zod schemas for `TicketCacheResponse` (full and delta) and extended `BatchSyncRequest`/`BatchSyncResponse` with `since` and `cacheUpdates` fields.

## Impact

- **Backend:** New controller + use-case + repository method in `checkin` bounded context. Extension of `batch-sync` use-case to compute and return delta cache after processing events.
- **Mobile:** New SQLite table (migration via `expo-sqlite`), new `TicketCacheRepository`, new `CacheDownloadService`, changes to `ScanWorkflow` offline branch, changes to `SyncService` to merge cache updates.
- **`@ticketbox/api-types`:** New `TicketCacheResponseSchema`, extended `BatchSyncRequestSchema` (add `since?`) and `BatchSyncResponseSchema` (add `cacheUpdates?`).
- **No breaking changes to existing online scan flow** — all changes are additive or in the offline branch only.
- **Dependencies:** `expo-sqlite` already present. No new native modules required.
