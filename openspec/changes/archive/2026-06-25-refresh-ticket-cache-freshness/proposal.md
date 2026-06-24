## Why

Offline gate check-in relies on a local ticket cache (the staff device's snapshot of
valid/checked-in ticket hashes for the concert). Today that cache is downloaded **once**,
in full, when the staff selects an assignment, and is never refreshed afterward. The
delta endpoint (`GET /checkin/ticket-cache?since=…`) and the local `applyDelta` path
already exist but are unused — `CacheDownloadService.download` never passes `since`, and
nothing re-triggers a download.

Consequence: any ticket issued or voided **after** the one-time snapshot is missing from
the local cache, so when the device goes offline those tickets are mis-evaluated (a
newly issued valid ticket is rejected as `invalid`). Offline scanning is an accepted
trade-off, but the local data must be kept **as fresh as possible while online** so the
miss window shrinks to only what changes during the actual offline period.

## What Changes

- Make `CacheDownloadService` perform an **incremental delta refresh** using the stored
  `lastCacheSyncAt` as `since` (full download only for the first sync of an assignment),
  applying `upserted`/`voided` to the local cache.
- **Periodically refresh** the ticket cache while the device is online, authenticated,
  and on the scanner — and refresh **immediately on connectivity restore** — so the local
  snapshot tracks the server up to the moment connectivity drops.
- Keep a single in-flight refresh (no overlapping downloads) and leave existing offline
  evaluation, scan workflow, queue, and sync untouched.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `checkin-offline-sync`: add a requirement that the mobile ticket cache is kept fresh
  while online via incremental (delta) refresh on a recurring schedule and on
  reconnect, not only a one-time full download.

## Impact

- **Code**: `apps/checkin-mobile/src/features/ticket-cache/cache-download.service.ts`
  (delta refresh via `since`, single-flight), `apps/checkin-mobile/App.tsx` (recurring
  refresh timer + refresh-on-reconnect, reusing the existing `NetworkMonitor`). A pure
  helper for the refresh decision is added with tests.
- **Backend / contracts**: none — the `since` delta endpoint and Zod contracts already
  exist; this only starts using them from the client.
- **Behavior preserved**: scan workflow, offline queue, batch sync, and the offline
  evaluation logic are unchanged; only cache freshness improves.
- **Trade-off (accepted)**: tickets created/voided **during** an offline period still
  cannot be reflected until reconnect — this change minimizes, not eliminates, staleness.
