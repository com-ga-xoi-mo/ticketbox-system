## Context

The current offline scan workflow blindly queues every scan and returns `queued` — staff cannot distinguish valid, duplicate, or invalid tickets without a network connection. Venue Wi-Fi at concerts is unreliable. Staff need real scan feedback even offline.

The system already has:
- `expo-sqlite` for the offline scan queue (SQLite on device)
- `POST /checkin/sync` batch sync endpoint with per-event results
- `qrTokenHash` stored on tickets in PostgreSQL (SHA-256 of QR payload)
- `ScanWorkflow` with an offline detection branch
- `SyncService` with background sync and network-reconnect trigger

This change adds a local ticket hash cache to the mobile app, fed by a new backend endpoint, so offline validation is purely a local SQLite lookup.

## Goals / Non-Goals

**Goals:**
- Staff see `accepted` / `duplicate` / `invalid` immediately when offline
- Cache stays fresh via background delta sync whenever online
- A single `POST /checkin/sync` round-trip both pushes scan results and returns cache delta (bidirectional)
- No new native modules — `expo-sqlite` is already installed

**Non-Goals:**
- Full duplicate prevention across two simultaneously-offline devices (conflict is detected on sync, not prevented offline — accepted trade-off, same as current design)
- Replacing online scan flow — online path is unchanged
- Encrypting the local SQLite cache (out of scope; hash-only storage is already a mitigation)
- Ticket-type or gate-level filtering within a concert (cache is per concert, not per ticket type)

## Decisions

### D1: Cache stores only `qrTokenHash`, not full ticket data

**Decision:** `ticket_cache` table stores `(qr_token_hash, concert_id, status, cached_at)`. No ticket number, attendee name, or order data.

**Rationale:** Hashes are already the server-side validation key. Full ticket data would increase cache size, add PII risk, and require schema changes. A hash lookup answers all three questions (valid / checked-in / unknown) without extra data.

**Alternative rejected:** Store full ticket records — rejected because of PII exposure on a lost device and unnecessary data transfer.

---

### D2: Bidirectional sync — server processes events BEFORE computing delta

**Decision:** `POST /checkin/sync` request adds optional `since` (ISO timestamp). Response adds `cacheUpdates` computed AFTER processing the submitted events.

**Rationale:** If delta were computed before applying events, the returned cache would not reflect the scans just submitted, creating a race window. Ordering guarantees cache consistency within a single round-trip.

**Alternative rejected:** Separate `GET /checkin/ticket-cache` poll on a timer — two round-trips, race condition between sending results and receiving cache, more complex client state machine.

---

### D3: Full download on first sync, delta on subsequent syncs

**Decision:** If `since` is omitted (or cache is empty), server returns the full hash list. If `since` is provided, server returns only changed records since that timestamp.

**Rationale:** First load must bootstrap the entire cache. Delta on subsequent syncs keeps bandwidth low (~KB per cycle vs ~MB per full load). `since = lastSyncAt` stored locally after every successful sync.

**Alternative rejected:** Always full sync — too heavy (10–20 MB per device per event for large concerts), unnecessary after initial load.

---

### D4: Cache download is mandatory before offline scanning is allowed

**Decision:** After assignment selection, app triggers full cache download. Scanner shows a "Downloading ticket cache…" state and blocks scanning until at least one successful sync has completed. If offline at assignment time, show warning and allow scanning only in degraded mode (falls back to current `queued` behavior).

**Rationale:** Permitting offline scanning without any cache would produce `invalid` for all tickets, which is worse than `queued`. A one-time mandatory sync on assignment is a safe UX gate.

---

### D5: All HTTP requests have a 5-second timeout (defense-in-depth)

**Decision:** Every `fetch()` call in `HttpCheckinMobileApiClient` is wrapped with a 5-second timeout. On timeout the error is re-thrown as `ApiTransportError`, which the scan workflow treats as a retryable failure and falls back to cache validation (or the queue).

**Rationale:** React Native's `fetch` does not automatically reject on network loss — the promise hangs indefinitely. This is a **secondary safety net**: the primary defense is D7 (correct offline detection). Even with D7 fixed, a flaky/slow network or a request started just before disconnect could hang; the timeout guarantees the UI never stays stuck in `submitting`. 5 s is long enough for a slow LAN response but short enough to remain usable at the gate.

**Implementation:** `Promise.race([fetchPromise, timeoutPromise])` is used instead of relying solely on `AbortController.signal`, because React Native may silently ignore the abort signal. `controller.abort()` is still called on timeout as a best-effort cleanup. On timeout, `ApiTransportError` is thrown → `submitOnlineScan` returns `{ status: 'transport-error' }` → `ScanWorkflow` checks: if `ticketCache` is available, runs `validateOffline()` (returning `accepted`/`duplicate`/`invalid` from local cache); otherwise falls back to `enqueue()` (returning `queued`). Timeout is 5 s — long enough for a slow LAN API but short enough to feel responsive at the gate.

**Alternative rejected:** `AbortController.signal` alone — React Native may ignore it, leaving the fetch hanging despite the controller being aborted. OS/network-layer timeout — inconsistent across iOS/Android and may take 60–120 s.

---

### D6: Two-device offline conflict — accept and surface post-sync

**Decision:** No change to conflict detection logic. Two offline devices scanning the same ticket both see `accepted` locally. On sync, server's atomic claim picks the winner; the other gets `conflict` in `BatchSyncResponse`. `SyncService` marks it `failed` in the queue and surfaces it in `SyncStatusPanel`.

**Rationale:** Preventing offline-offline duplicate would require a distributed lock or gossip protocol between devices — far beyond scope. The `conflict` status already exists in the batch sync contract.

---

### D7: Network monitor must use a static import specifier (root-cause fix)

**Decision:** `NetInfoNetworkMonitor` loads `@react-native-community/netinfo` via a **static literal** dynamic import — `import('@react-native-community/netinfo')` — not via a variable (`const m = '...'; import(m)`). Both `.then` chains have a `.catch` that logs initialization failure.

**Rationale (the actual bug):** Metro collects the module dependency graph by **static analysis** of `import()`/`require()` calls and only bundles **literal** specifiers. When the argument was a variable, Metro silently dropped netinfo from the bundle, so at runtime `import(moduleName)` **rejected**. With no `.catch`, the rejection was swallowed and:
- `online` stayed permanently `true` → the app never detected offline → every scan took the online path and the `fetch` hung;
- `onStatusChange` never attached a listener → `SyncService` never auto-resumed on reconnect.

This — not the missing timeout — is why offline scanning didn't work. The timeout (D5) only masked it after a delay. Fixing the import makes offline detection immediate, so the scanner routes straight to `validateOffline()` and sync resumes the moment connectivity returns.

**Alternative rejected:** Keep the variable indirection and rely solely on the request timeout — leaves a 5 s hang on every offline scan and never fixes reconnect-triggered sync.

---

### D8: Scan submission must never leave the UI stuck in `submitting`

**Decision:** `ScanWorkflow.validateOffline()` wraps all of its `await`s (QR hashing, cache lookup/update, enqueue) in a try/catch that resolves to a `recoverable-error` state on failure — it never rejects. The `App.tsx` scan handler also attaches a `.catch` that sets a `recoverable-error` state. Together these guarantee `submitDecodedPayload` always settles on a terminal state.

**Rationale (observed bug):** The scanner UI sets `submitting` synchronously, then awaits the workflow promise and renders the resolved state. Two real-world conditions left it stuck:
1. **Cellular reachable, LAN API unreachable** — the phone keeps cellular data when WiFi is turned off, so the network monitor (correctly) reports "online", but a request to the LAN API host (`http://192.168.x.x:3000`) never resolves. Handled by the D5 5-second timeout.
2. **Unhandled rejection in the offline path** — `validateOffline` awaited `qrHasher`/`ticketCache` without a try/catch, and the `App.tsx` handler had a `.then` but no `.catch`. Any rejection (e.g. `expo-crypto` load failure, SQLite error) bubbled up unhandled, leaving the UI permanently on "Submitting scan…".

Hardening the offline path and the UI handler removes the stuck state regardless of which underlying step fails.

**Alternative rejected:** Rely only on the request timeout — does not cover failures inside the offline validation path (hashing/SQLite), which occur after the network step.

---

### D9: Explicit Cache Existence Check for Fallback

**Decision:** `TicketCacheRepository` exposes a `hasCache(staffUserId, concertId)` method that checks if ANY tickets exist in the cache. `ScanWorkflow.validateOffline()` checks this first. If `hasCache` is false, it falls back to the queue (returns `queued`). If `hasCache` is true, a `null` lookup safely returns `invalid`.

**Rationale (observed bug):** Previously, the fallback to queue only happened if the `TicketCacheRepository` instance was null. But `App.tsx` always injects the instance, even if the initial cache download failed. As a result, the app searched an empty cache, found nothing, and rejected all legitimate offline tickets as `invalid` instead of gracefully degrading to `queued`.

---

### D10: Auto-Restore Must Trigger Cache Download

**Decision:** When `App.tsx` restores a session via `restoreStartupSession` and routes directly to the `scanner` screen, it MUST call `triggerCacheDownload` for the automatically selected assignment.

**Rationale (observed bug):** If a staff member closed the app and reopened it, the app automatically loaded their previous session and jumped straight to the scanner screen. However, because the user didn't manually click an assignment, the cache download was bypassed. The local SQLite database remained completely empty, leading to `invalid` responses for all offline scans.

---

### D11: Decoupled Upstream and Downstream Sync

**Decision:** `SyncService.run()` must fetch `cacheUpdates` via `submitBatchSync` even when the offline queue is empty (`pending.length === 0`).

**Rationale (observed bug):** The sync loop previously aborted early if there were no pending offline scans to upload. This meant a staff member with a perfectly stable network connection, but who hadn't scanned any tickets offline, would never receive cache updates from the server. Decoupling upstream (pushing scans) from downstream (pulling cache updates) ensures the background sync actually refreshes the cache every 30 seconds as intended.

## Risks / Trade-offs

**[Cache stale during long offline window]** → Staff MUST sync before opening the gate (UI enforces this). Background delta sync every 30 s when online keeps the window small. Accepted risk for offline duration > last sync interval.

**[Two devices offline scanning same ticket]** → Both see `accepted` locally. Detected as `conflict` on sync. Mitigation: minimize simultaneous offline duration; supervisor reviews `conflict` report after event.

**[Lost/stolen device exposes hash list]** → Attacker learns which hashes exist but cannot forge a QR that matches a hash without the original payload. Risk is low; mitigated by remote session invalidation (JWT expiry) which prevents sync on a stolen device.

**[Initial full cache download on slow venue Wi-Fi]** → For 10 k tickets ≈ 400 KB JSON. Acceptable. Staff should download before entering the venue.

**[expo-sqlite migration]** → Adding `ticket_cache` table requires a migration. `OfflineQueueBootstrap` already handles SQLite migrations; extend it with the new table DDL.

## Migration Plan

1. Deploy backend changes first (`GET /checkin/ticket-cache`, extended `POST /checkin/sync` response).
2. Response extension is additive — old mobile clients ignore unknown fields; no breaking change.
3. Ship mobile update: new cache table, download phase, offline validation branch.
4. No database migration on the PostgreSQL side — queries read existing `tickets` and `checkin_events` tables.
5. Rollback: revert mobile to previous version; backend endpoint can stay (unused by old clients).

## Open Questions

- Should `ticket_cache` be cleared on logout? (Recommendation: yes — scoped to `staffUserId` like the offline queue, clear on logout to avoid stale data for the next staff member on the same device.)
- What is the max batch size for the full cache download? (Recommendation: no pagination for now; revisit if any concert exceeds 50 k tickets.)
