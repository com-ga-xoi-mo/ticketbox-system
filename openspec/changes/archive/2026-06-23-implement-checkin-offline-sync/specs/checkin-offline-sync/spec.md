## ADDED Requirements

### Requirement: Mobile offline scan queue persistence

The mobile check-in app SHALL persist offline scan events in a local SQLite database that survives app restart, using a port/adapter pattern for testability.

#### Scenario: Offline scan is enqueued with safe account-owned context

- **WHEN** the scan workflow is offline and staff scans a QR ticket with a selected assignment
- **THEN** the app SHALL hash the decoded QR payload as lowercase SHA-256 hexadecimal and store the scan event with `localId`, `staffUserId`, `deviceId`, `scannedAt` ISO timestamp, `qrPayloadHash`, `assignmentId`, `concertId`, optional `gate`, and sync status set to `pending`, without persisting or logging the raw QR payload

#### Scenario: Offline queue survives app restart

- **WHEN** the app is closed and reopened before network returns
- **THEN** all previously enqueued pending scan events SHALL remain available in the offline queue

#### Scenario: Enqueue returns a queued confirmation

- **WHEN** a scan event is successfully enqueued offline
- **THEN** the scan workflow SHALL return a `queued` result with the `localId` and a human-readable message

#### Scenario: Local event identifier survives process lifecycle safely

- **WHEN** the app creates a new queued scan before or after app restart, including scans created in the same millisecond
- **THEN** it SHALL generate a collision-resistant UUID `localId` independent of device clock and in-memory counters and SHALL persist that value unchanged for server idempotency

#### Scenario: Queue adapter implements an account-scoped OfflineScanQueue port

- **WHEN** the offline scan queue is compiled or tested
- **THEN** the SQLite adapter SHALL implement account-scoped pending reads, counts, and clearing so the current staff user cannot read, sync, or clear another staff user's events

#### Scenario: Logout preserves pending scans

- **WHEN** a staff user logs out with pending offline scans
- **THEN** the app SHALL retain those scans and SHALL make them eligible for sync only after the same `staffUserId` authenticates again

### Requirement: Network-aware scan workflow mode

The scan workflow SHALL detect network connectivity and route scans to the API when online or to the local offline queue when offline.

#### Scenario: Online mode submits to API

- **WHEN** the device has network connectivity and staff scans a QR ticket
- **THEN** the scan workflow SHALL submit the scan to the check-in API and return the API result

#### Scenario: Retryable online failure falls back to the queue

- **WHEN** an online scan fails because of a network error, timeout, HTTP 5xx response, or unparseable successful response with unknown commit status
- **THEN** the scan workflow SHALL enqueue the scan once for later sync and return `queued` only after local persistence succeeds

#### Scenario: Authorization failure is not queued

- **WHEN** an online scan returns HTTP `401` or `403`
- **THEN** the app SHALL expose the authentication or authorization failure and SHALL NOT convert it into a queued scan

#### Scenario: Offline mode enqueues locally

- **WHEN** the device has no network connectivity and staff scans a QR ticket
- **THEN** the scan workflow SHALL enqueue the scan in the offline queue and return a `queued` result

#### Scenario: Mode indicator reflects connectivity

- **WHEN** network connectivity changes
- **THEN** the scan workflow SHALL expose a reactive `mode` property set to `online` or `offline`

#### Scenario: Network monitor uses port abstraction

- **WHEN** the scan workflow or sync service detects connectivity
- **THEN** it SHALL consume a `NetworkMonitor` port interface, not a concrete platform API

### Requirement: Mobile batch sync service

The mobile app SHALL provide a sync service that sends pending offline scan events to the server in a batch, processes per-event results, and retries on failure with exponential backoff.

#### Scenario: Sync reads a bounded current-user chunk

- **WHEN** a sync cycle starts
- **THEN** the sync service SHALL read at most 100 `pending` events owned by the authenticated `staffUserId`, submit that chunk, and continue sequentially until no eligible pending events remain

#### Scenario: Sync sends batch to server

- **WHEN** pending events are available
- **THEN** the sync service SHALL send them as a `BatchSyncRequest` to `POST /checkin/sync` via the `CheckinApiClient`

#### Scenario: Sync processes per-event results

- **WHEN** the server returns a `BatchSyncResponse`
- **THEN** the sync service SHALL mark each event as `synced` or `failed` based on its individual result status

#### Scenario: Accepted and duplicate events are marked synced

- **WHEN** the server returns `accepted` or `duplicate` for an event
- **THEN** the sync service SHALL mark that event as `synced` in the offline queue

#### Scenario: Invalid, conflict, and unassigned events are marked failed

- **WHEN** the server returns `invalid`, `conflict`, or `unassigned` for an event
- **THEN** the sync service SHALL mark that event as terminal `failed` with the server-provided reason and SHALL NOT include it in automatic retry batches

#### Scenario: Network failure during sync retries with exponential backoff

- **WHEN** the batch sync POST fails due to a network error
- **THEN** the sync service SHALL retry with exponential backoff (base 1s, max 30s, with jitter) and SHALL NOT mark any events as synced or failed

#### Scenario: Server failure during sync remains retryable

- **WHEN** the batch sync POST returns HTTP 5xx
- **THEN** the sync service SHALL preserve unconfirmed events as `pending` and apply the same bounded backoff policy

#### Scenario: Expired authentication pauses sync

- **WHEN** the batch sync POST returns HTTP `401`
- **THEN** the sync service SHALL stop automatic retries, preserve pending events, expose `authentication-required`, and resume only after authentication succeeds

#### Scenario: Forbidden sync is not retried

- **WHEN** the batch sync POST returns HTTP `403`
- **THEN** the sync service SHALL stop retries, preserve pending events, and expose a non-retryable authorization error

#### Scenario: Sync execution is single-flight

- **WHEN** automatic and manual sync triggers occur while a sync cycle is already running
- **THEN** the sync service SHALL join or reuse the active cycle and SHALL NOT submit overlapping batches

#### Scenario: Internal sync failure stops retrying

- **WHEN** queue persistence, local database access, response correlation, or another internal invariant fails during sync
- **THEN** the sync service SHALL enter local `error`, stop automatic retry for that run, preserve unconfirmed pending rows, and expose a retry action only after the underlying problem is resolved

#### Scenario: Only explicit retryable failures use backoff

- **WHEN** sync classifies a failure for retry
- **THEN** that failure SHALL be a transport/timeout error, HTTP 5xx response, or unparseable successful response with unknown commit status rather than an arbitrary exception

#### Scenario: Auto-sync on connectivity restore

- **WHEN** network connectivity is restored after being offline
- **THEN** the sync service SHALL automatically start a sync cycle if there are pending events

#### Scenario: Manual sync trigger

- **WHEN** staff triggers sync manually from the UI
- **THEN** the sync service SHALL start a sync cycle regardless of the auto-sync schedule

### Requirement: Sync status UI

The mobile app SHALL display sync status information including pending count, last sync timestamp, in-progress indicator, and per-event results.

#### Scenario: Pending queue badge shows unsynced count

- **WHEN** there are unsynced events in the offline queue
- **THEN** the app SHALL display a badge or counter showing the number of pending events

#### Scenario: Sync progress is visible

- **WHEN** a sync cycle is in progress
- **THEN** the app SHALL show a sync-in-progress indicator

#### Scenario: Last sync results are displayed

- **WHEN** a sync cycle completes
- **THEN** the app SHALL show the timestamp of the last sync attempt and counts per result status (accepted, duplicate, invalid, conflict, unassigned)

#### Scenario: Failed events show reasons

- **WHEN** events have failed status after sync
- **THEN** the app SHALL display each failed event with its failure reason

#### Scenario: Retry action for failed sync

- **WHEN** a sync cycle fails due to network error
- **THEN** the app SHALL provide a retry action to re-attempt sync

#### Scenario: Staff can clear synced events

- **WHEN** staff chooses to clear synced events
- **THEN** the app SHALL remove all events with `synced` status from the offline queue

### Requirement: Batch sync API contract

The `@ticketbox/api-types` package SHALL provide Zod schemas for `BatchSyncRequest` and `BatchSyncResponse` following the same validation strategy as the online scan contract.

#### Scenario: BatchSyncRequest validates a bounded array of offline events

- **WHEN** a batch sync request is validated by the shared schema
- **THEN** the schema SHALL allow at most 100 objects and require each object to contain `localId` (trimmed, 1-160), `assignmentId` (UUID), `concertId` (UUID), optional `gate` (trimmed, non-empty, max 120), `qrPayloadHash` (lowercase 64-character SHA-256 hexadecimal), `scannedAt` (ISO datetime with offset), and `deviceId` (trimmed, 1-160)

#### Scenario: Request local identifiers are unique

- **WHEN** a batch request repeats a `localId` within the same array
- **THEN** `BatchSyncRequestSchema` SHALL reject the complete request before backend processing

#### Scenario: BatchSyncResponse validates per-event results

- **WHEN** a batch sync response is validated by the shared schema
- **THEN** the schema SHALL require an array of objects, each with `localId` (string), `status` discriminated as `accepted`, `duplicate`, `invalid`, `conflict`, or `unassigned`, and `message` (string)

#### Scenario: Accepted sync result includes check-in metadata

- **WHEN** a sync event result has `status` set to `accepted`
- **THEN** the result SHALL include `ticketId` (UUID) and `checkedInAt` (ISO datetime)

#### Scenario: Conflict sync result includes conflict reason

- **WHEN** a sync event result has `status` set to `conflict`
- **THEN** the result SHALL include `conflictReason` (string) describing why the ticket was already accepted

#### Scenario: Invalid sync result includes reason code

- **WHEN** a sync event result has `status` set to `invalid`
- **THEN** the result SHALL include `reasonCode` set to `INVALID_TICKET`, `WRONG_CONCERT`, or `TICKET_NOT_ISSUED`

#### Scenario: Unassigned sync result includes reason code

- **WHEN** a sync event result has `status` set to `unassigned`
- **THEN** the result SHALL include `reasonCode` set to `REVOKED_ASSIGNMENT` or `ASSIGNMENT_MISMATCH`

#### Scenario: Empty request array is valid

- **WHEN** a batch sync request contains an empty array
- **THEN** the schema SHALL accept it and the server SHALL return an empty result array

#### Scenario: Oversized batch is rejected

- **WHEN** a batch sync request contains more than 100 events
- **THEN** the shared schema and backend HTTP adapter SHALL reject it with HTTP `400` before invoking the use case

### Requirement: Backend batch sync endpoint

The backend SHALL expose `POST /checkin/sync` for authenticated `CHECKIN_STAFF` users to submit offline scan events and receive per-event results.

#### Scenario: Authenticated staff submits batch sync

- **WHEN** an authenticated `CHECKIN_STAFF` user sends a valid `BatchSyncRequest` to `POST /checkin/sync`
- **THEN** the system SHALL process each event independently and return a `BatchSyncResponse` with one result per submitted event

#### Scenario: Missing or invalid token is rejected

- **WHEN** a request to `POST /checkin/sync` has no valid bearer token
- **THEN** the system SHALL reject the request with HTTP `401`

#### Scenario: Non-staff user is rejected

- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `POST /checkin/sync`
- **THEN** the system SHALL reject the request with HTTP `403`

#### Scenario: One invalid event does not block others

- **WHEN** a batch contains both valid and invalid events
- **THEN** the system SHALL process each event independently and return individual results for every event

#### Scenario: Unexpected infrastructure failure is not a business result

- **WHEN** processing encounters an unexpected database or infrastructure failure
- **THEN** the endpoint SHALL return an HTTP 5xx failure instead of mapping it to `invalid`, `conflict`, or `unassigned`, and the client SHALL leave every event without a confirmed response pending

### Requirement: Backend batch sync validation

The backend batch sync use case SHALL apply the same validation pipeline as the online scan for each offline event: assignment authorization, QR hash lookup, ticket lookup, concert match, and duplicate detection.

#### Scenario: Valid offline event is accepted

- **WHEN** an offline event has a valid unused ticket for the correct concert and the staff has an active assignment
- **THEN** the system SHALL atomically claim the still-issued ticket, record one accepted check-in with `source` set to `OFFLINE_SYNC`, set `offlineEventId` to the request `localId`, and return `accepted`

#### Scenario: Unassigned staff event is rejected per-event

- **WHEN** an offline event is submitted by staff without an active assignment for that concert
- **THEN** the system SHALL return `unassigned` for that event with the appropriate reason code

#### Scenario: Invalid QR is rejected per-event

- **WHEN** an offline event contains a QR payload that does not resolve to an issued ticket
- **THEN** the system SHALL return `invalid` with `reasonCode` set to `INVALID_TICKET`

#### Scenario: Wrong concert is rejected per-event

- **WHEN** an offline event contains a ticket that belongs to a different concert
- **THEN** the system SHALL return `invalid` with `reasonCode` set to `WRONG_CONCERT`

#### Scenario: Offline event preserves device timestamps

- **WHEN** an offline event is accepted
- **THEN** the system SHALL record `occurredAt` from the device-reported `scannedAt` and set `syncedAt` to the server processing timestamp

#### Scenario: Concurrent acceptance has one winner

- **WHEN** online and/or offline requests concurrently submit the same unused ticket
- **THEN** one transactional conditional ticket claim SHALL accept at most one request, all other requests SHALL return duplicate or conflict, and the system SHALL contain at most one accepted event for the ticket

#### Scenario: Device time does not choose the winner

- **WHEN** competing offline events have different device-reported `scannedAt` values
- **THEN** the first successful server-side conditional ticket claim SHALL win and `scannedAt` SHALL remain audit metadata only

### Requirement: Offline sync conflict detection

The backend SHALL distinguish between duplicate re-sync from the same device and conflict from a different device for tickets already accepted.

#### Scenario: Same device new event returns duplicate

- **WHEN** a new offline event with a different `localId` arrives for a ticket already accepted by the same `deviceId`
- **THEN** the system SHALL return `duplicate` for that event

#### Scenario: Different device conflict returns conflict

- **WHEN** an offline event arrives for a ticket already accepted by a different device (online or offline)
- **THEN** the system SHALL return `conflict` with `conflictReason` indicating that another device accepted the ticket

#### Scenario: Exact event replay returns the stored outcome

- **WHEN** the same authenticated staff user submits the same offline event (`deviceId` + `offlineEventId`) more than once
- **THEN** the system SHALL return the deterministic previously stored outcome and SHALL NOT create a second `checkin_events` row

#### Scenario: Another staff user cannot replay an owned event

- **WHEN** a different authenticated staff user submits an existing `deviceId` + `offlineEventId` pair
- **THEN** the system SHALL NOT disclose the stored outcome, SHALL NOT transfer ownership, and SHALL NOT create a second `checkin_events` row

#### Scenario: Concurrent or replayed non-accepted outcome is deterministic and not a 5xx

- **WHEN** an offline event with an existing `(deviceId, offlineEventId)` non-accepted outcome is processed again concurrently or after its idempotency lookup, such that the outcome write encounters the unique constraint
- **THEN** the system SHALL resolve the duplicate write to the same deterministic stored business result, SHALL NOT create a second `checkin_events` row, and SHALL NOT return an HTTP 5xx for the known duplicate; only genuine infrastructure failures SHALL surface as HTTP 5xx

## MODIFIED Requirements

### Requirement: Offline scan queue

The check-in app SHALL allow staff to scan tickets without network connectivity and persist scan events locally until sync.

#### Scenario: Offline scan is stored locally

- **WHEN** the check-in app is offline and staff scans a QR ticket
- **THEN** the app SHALL store the scan event in a local SQLite database with staff account ID, device ID, timestamp, SHA-256 QR payload hash, assignment context, and a client-generated local identifier, without storing the raw QR payload

#### Scenario: Offline queue survives refresh

- **WHEN** the check-in app is refreshed before network returns
- **THEN** unsynced scan events SHALL remain available in the SQLite queue for later sync

### Requirement: Batch sync and conflict handling

The system SHALL sync offline scan events in batches and return a per-event result.

#### Scenario: Offline scan sync succeeds

- **WHEN** network connectivity returns and the app syncs a locally stored valid scan via `POST /checkin/sync`
- **THEN** the server SHALL accept the event if the ticket has not already been checked in, record it with `source` set to `OFFLINE_SYNC`, and return `accepted` with check-in metadata

#### Scenario: Offline duplicate conflict is reported

- **WHEN** an offline scan syncs after the same ticket was already accepted elsewhere
- **THEN** the server SHALL reject the event with `duplicate` status (same device) or `conflict` status (different device) including a `conflictReason`

### Requirement: Assigned staff required for check-in acceptance

The system SHALL require an authenticated check-in staff user with an active assignment for the ticket's concert before accepting online check-in or offline sync events.

#### Scenario: Assigned staff online scan can be accepted

- **WHEN** assigned check-in staff scans a valid unused ticket for their assigned concert
- **THEN** the system SHALL continue ticket validation, with final acceptance governed by online check-in validation rules

#### Scenario: Unassigned staff online scan is rejected

- **WHEN** check-in staff scans a ticket for a concert where they have no active assignment
- **THEN** the system SHALL reject the scan as unauthorized or `UNASSIGNED_STAFF`

#### Scenario: Assigned staff offline sync can be accepted

- **WHEN** assigned check-in staff syncs an offline event for their assigned concert
- **THEN** the system SHALL continue offline conflict validation, with final acceptance governed by offline sync conflict rules

#### Scenario: Unassigned staff offline sync is rejected per event

- **WHEN** check-in staff syncs an offline event for a concert where they have no active assignment
- **THEN** the system SHALL return a per-event rejected result with `unassigned` status without accepting the check-in
