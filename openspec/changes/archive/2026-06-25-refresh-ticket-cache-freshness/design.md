## Context

The local ticket cache (`ticket_cache` SQLite table) is the offline source of truth for
scan evaluation. It is populated by `CacheDownloadService.download(assignment, session)`,
called once from `App.tsx` (`triggerCacheDownload`) on assignment select / restore.

`download` always issues a **full** request (no `since`) and stores via `replaceAll`,
even though:
- the backend `GET /checkin/ticket-cache` accepts `since` and returns a delta
  (`upserted` + `voided`) when present,
- `TicketCacheRepository.applyDelta` already applies that delta,
- `CacheDownloadService` already records `_lastCacheSyncAt` from the response.

So the plumbing for incremental refresh exists but is never exercised, and nothing
re-triggers a download after the first one. The 30s timer in `App.tsx` only triggers
batch **sync**, not cache refresh.

## Goals / Non-Goals

**Goals:**
- Keep the local cache fresh while online via incremental delta refresh.
- Refresh on a recurring interval and immediately on reconnect.
- Single-flight; failures preserve the existing cache.

**Non-Goals:**
- No change to offline scan evaluation, queue, batch sync, or backend.
- Not eliminating staleness during the offline period itself (accepted trade-off).
- No new backend endpoint or contract (delta endpoint already exists).

## Decisions

**1. `download` chooses full vs delta from `lastCacheSyncAt`.**
First refresh for an assignment (no recorded timestamp, or a different concert) → full
`replaceAll`. Subsequent refreshes pass `since = lastCacheSyncAt` → `applyDelta`. The
service already branches on whether the response has `entries` (full) vs
`upserted`/`voided` (delta); we add the `since` argument to the request and only reset
`lastCacheSyncAt` when the concert changes. *Alternative:* always full — rejected:
wasteful for a 5k+ ticket concert and slower, defeating frequent refresh.

**2. Recurring refresh + reconnect refresh driven from `App.tsx`.**
Add a refresh trigger that runs while `route === 'scanner'`, authenticated, and `online`,
on an interval (e.g. ~20–30s), and once on each `online` false→true transition (reuse the
existing `NetworkMonitor` subscription already wired for the sync panel). This mirrors the
existing sync timer pattern. *Alternative:* push/websocket — out of scope and heavier.

**3. Single-flight in `CacheDownloadService`.**
Guard with an in-flight promise so overlapping timer/reconnect triggers don't issue
concurrent downloads; a refresh requested during an active one is skipped (or joins).
Status stays `ready` on success, `unavailable` only when there is no usable cache.

**4. Failures are non-destructive.**
A failed delta/full refresh must not wipe the existing cache. `applyDelta` is additive;
a failed full refresh must not run the `replaceAll` DELETE unless the new full set is in
hand (apply inside the same transaction, which `replaceAll` already does — only commit on
success).

**5. Pure decision helper for testability.**
Extract `shouldRefreshCache({ route, authenticated, online, downloading })` (and the
full-vs-delta choice) into a pure function with Vitest tests; the timer/effect and Paper
UI stay thin and untested, consistent with existing helpers.

## Risks / Trade-offs

- **[Battery / data from frequent polling]** A short interval polls the server often. →
  Mitigation: deltas are small (only changes since last sync); interval tunable; only
  runs on the scanner screen while online.
- **[Offline-period staleness remains]** Tickets created/voided while offline can't be
  known until reconnect. → Accepted and documented; this change minimizes the window.
- **[Clock/`since` boundary]** Using server `syncedAt` as the next `since` avoids client
  clock skew; ensure the boundary is inclusive-safe so no change is skipped (delta query
  uses `gte: since`, which may re-send a row already applied — harmless via INSERT OR
  REPLACE).

## Migration Plan

Client-only, additive. No data migration. Rollback = revert the service + `App.tsx`
changes; the one-time full download behavior returns. No backend or contract change.
