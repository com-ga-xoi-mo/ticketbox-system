## 1. Incremental delta refresh in the service

- [x] 1.1 Add `since` support to the cache request so `CacheDownloadService.download` passes `since = lastCacheSyncAt` when a timestamp exists, and omits it (full) on first load or when the concert changes
- [x] 1.2 Ensure full responses use `replaceAll` and delta responses use `applyDelta` (existing branch), and update `lastCacheSyncAt` from the server `syncedAt` after each successful refresh
- [x] 1.3 Make refresh single-flight (reuse/guard an in-flight promise) and keep failures non-destructive (do not clear the existing cache on error)

## 2. Pure refresh-decision helper

- [x] 2.1 Add `shouldRefreshCache({ route, authenticated, online, downloading })` (+ full-vs-delta choice) as a pure function
- [x] 2.2 Add Vitest tests: refresh only when scanner + authenticated + online + not already downloading; first load full, later delta

## 3. Recurring + reconnect refresh wiring

- [x] 3.1 In `App.tsx`, add a recurring refresh interval (~20–30s) that calls the cache refresh while on the scanner, authenticated, and online
- [x] 3.2 Trigger an immediate refresh on each offline→online transition (reuse the existing `NetworkMonitor` subscription)
- [x] 3.3 Confirm the existing one-time download-on-assignment-select still runs (now as the first full load) and `cacheStatus` reflects refresh state

## 4. Verification

- [x] 4.1 Run `npm run verify` (typecheck + vitest) in `apps/checkin-mobile`
- [x] 4.2 Manual device check: buy/void a ticket while staff is online → within one refresh interval the local cache reflects it → go offline → that ticket evaluates correctly
