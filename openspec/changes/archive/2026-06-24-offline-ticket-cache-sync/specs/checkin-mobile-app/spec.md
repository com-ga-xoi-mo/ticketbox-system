## MODIFIED Requirements

### Requirement: QR scan UI foundation

The mobile app SHALL provide a QR scan UI foundation that can accept decoded QR payloads, prevent duplicate local submissions while one scan is in flight, validate successful API responses using the shared online scan contract, and render clear local scan result states. When offline and a local ticket cache is available, the scan workflow SHALL validate QR payloads against the local cache and return `accepted`, `duplicate`, or `invalid` results immediately without queuing.

#### Scenario: Scanner opens with selected assignment

- **WHEN** staff opens the scanner with an active selected assignment
- **THEN** the app SHALL show the scanner-ready state for that assignment

#### Scenario: Offline scan validated against local cache — accepted

- **WHEN** the scan workflow is offline, a local ticket cache exists for the concert, and the decoded QR payload hashes to a `valid` entry in the cache
- **THEN** the app SHALL return `accepted` immediately, update the local cache entry to `checked_in`, and enqueue the scan for later sync

#### Scenario: Offline scan validated against local cache — duplicate

- **WHEN** the scan workflow is offline, a local ticket cache exists for the concert, and the decoded QR payload hashes to a `checked_in` entry in the cache
- **THEN** the app SHALL return `duplicate` immediately without enqueuing the scan

#### Scenario: Offline scan validated against local cache — invalid

- **WHEN** the scan workflow is offline, a local ticket cache exists for the concert, and the decoded QR payload hash is not found in the local cache
- **THEN** the app SHALL return `invalid` with reason code `INVALID_TICKET` immediately without enqueuing the scan

#### Scenario: Offline scan falls back to queue when no cache available

- **WHEN** the scan workflow is offline and no local ticket cache exists for the current concert (cache was never downloaded)
- **THEN** the app SHALL enqueue the scan and return `queued`, preserving the existing offline queue behavior

#### Scenario: Online scan request times out — falls back to cache then queue

- **WHEN** the scan workflow is online, an API request is in flight, and no response is received within 5 seconds
- **THEN** the app SHALL abort the request, treat the result as a retryable transport failure, and — if a local ticket cache is available — validate offline against the cache (returning `accepted`, `duplicate`, or `invalid`); if no cache is available, fall back to the offline queue (returning `queued`)

#### Scenario: Reachable cellular but unreachable LAN API — falls back via timeout

- **WHEN** the device reports connectivity (e.g. cellular) so the network monitor considers it online, but the configured API host is on an unreachable network (e.g. a LAN IP while on cellular) and the request never completes
- **THEN** the 5-second request timeout SHALL fire, the scan SHALL be validated against the local cache (or queued if no cache), and the UI SHALL NOT remain in the submitting state

#### Scenario: Scan submission never leaves the UI stuck

- **WHEN** any step of a scan submission fails or rejects (network timeout, QR hashing failure, local cache/SQLite error)
- **THEN** the scan workflow SHALL resolve to a terminal state (`result` or `recoverable-error`) and SHALL NOT leave the UI in the `submitting` state; the app SHALL surface the error to the user

#### Scenario: Decoded QR starts online submission

- **WHEN** the scanner receives a decoded QR payload while online and no scan submission is in flight
- **THEN** the app SHALL create a shared online scan request containing the selected assignment, concert context, QR payload, device ID, and scan timestamp

#### Scenario: Business scan result is displayed

- **WHEN** the check-in API returns a valid `accepted`, `duplicate`, `invalid`, or `unassigned` business response
- **THEN** the app SHALL map it to the corresponding local result presentation

### Requirement: Staff assignment loading

The mobile app SHALL load the authenticated check-in staff user's active assignments as a raw JSON array from `GET /checkin/assignments` after login or session restore, validate that array using the shared assignment contract, require a selected active assignment before online scan submission, and trigger a ticket cache download for the selected assignment while online.

#### Scenario: Assignments load successfully

- **WHEN** an authenticated check-in staff session is available
- **THEN** the app SHALL request and validate the staff user's active concert or gate assignments as a raw array using the authenticated API client

#### Scenario: Assignment is selected and cache download triggers

- **WHEN** staff selects an active assignment and the device is online
- **THEN** the app SHALL immediately trigger a full ticket cache download for that assignment's concert and SHALL NOT allow offline-validated scanning until at least one successful cache download completes

#### Scenario: Assignment selected while offline — degraded mode

- **WHEN** staff selects an active assignment and the device is offline
- **THEN** the app SHALL enter degraded offline mode: if a previous cache exists for that concert it SHALL be used for validation; if no cache exists, scans SHALL fall back to the `queued` behavior with a visible warning

#### Scenario: No active assignments blocks scanning

- **WHEN** the assignment API returns the raw array `[]`
- **THEN** the app SHALL show an empty-assignment state and SHALL NOT allow online scan submission

### Requirement: Reliable offline network detection

The mobile app SHALL detect loss and restoration of network connectivity at runtime via the platform network monitor, so the scan workflow can switch to offline cache validation immediately and the sync service can resume on reconnect. The network monitor dependency MUST be bundled reliably (imported by a static module specifier) and any failure to initialize it MUST be surfaced, not silently treated as "online".

#### Scenario: Network monitor module is bundled and initializes

- **WHEN** the app starts and constructs the platform network monitor
- **THEN** the network module SHALL be loaded via a static (literal) import specifier so the bundler includes it, and the monitor SHALL report the current connectivity state

#### Scenario: Going offline is detected immediately

- **WHEN** the device loses connectivity while the scanner is open
- **THEN** the network monitor SHALL update its status to offline and notify subscribers, so a subsequent scan is validated against the local cache without attempting a hanging network request

#### Scenario: Network monitor initialization failure is surfaced

- **WHEN** the platform network module fails to load
- **THEN** the app SHALL log the failure and SHALL NOT silently leave the monitor permanently reporting "online"

### Requirement: Mobile ticket cache storage

The mobile app SHALL maintain a local SQLite table `ticket_cache` scoped to the authenticated staff user and selected concert, persisting QR token hashes and their check-in status to enable offline validation.

#### Scenario: Cache is populated on full download

- **WHEN** the cache download completes successfully with a full response (no `since`)
- **THEN** the app SHALL replace the local `ticket_cache` for that concert with all returned hashes and statuses, and record `lastCacheSyncAt`

#### Scenario: Cache is updated on delta sync

- **WHEN** `SyncService` receives a `cacheUpdates` field in a `BatchSyncResponse`
- **THEN** the app SHALL upsert all `upserted` entries into `ticket_cache` and delete all `voided` entries, then update `lastCacheSyncAt`

#### Scenario: Cache is cleared on logout

- **WHEN** staff logs out
- **THEN** the app SHALL delete all `ticket_cache` rows scoped to that staff user's ID

#### Scenario: Cache bootstrap failure is visible

- **WHEN** the SQLite migration to add `ticket_cache` fails on startup
- **THEN** the app SHALL surface a recoverable error with a retry action and SHALL NOT silently skip cache functionality
