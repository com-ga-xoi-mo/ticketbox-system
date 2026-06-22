## MODIFIED Requirements

### Requirement: Check-in API integration boundary

The mobile app SHALL route auth, profile, assignment, online scan, and batch sync operations through typed API client interfaces that consume `@ticketbox/api-types`, while mobile session storage, transport mapping, offline queue persistence, and feature/UI states remain local.

#### Scenario: Authenticated requests include bearer token

- **WHEN** the profile, assignment, online scan, or batch sync client sends an authenticated request
- **THEN** the request SHALL include the current JWT access token as a bearer token

#### Scenario: Online scan endpoint is unavailable

- **WHEN** an online scan attempt fails with a network error, timeout, HTTP 5xx response, or unparseable successful response with unknown commit status
- **THEN** the app SHALL persist the scan once in the current staff user's offline queue, return `queued` only after persistence succeeds, and SHALL NOT mark the ticket as accepted locally

#### Scenario: Online authorization failure remains explicit

- **WHEN** the online scan endpoint returns HTTP `401` or `403`
- **THEN** the app SHALL expose a local authentication or authorization state and SHALL NOT enqueue the scan

#### Scenario: Online request failure is not queued

- **WHEN** the online scan endpoint returns another HTTP 4xx response such as request validation failure
- **THEN** the mobile client SHALL preserve a non-retryable request-error classification, the scan workflow SHALL display that failure, and the app SHALL NOT enqueue the scan

#### Scenario: Fake client verifies isolated workflow only

- **WHEN** mobile tests inject a fake check-in API client
- **THEN** those tests SHALL verify isolated mobile workflow behavior but SHALL NOT be treated as proof of backend/mobile contract compatibility

#### Scenario: Offline sync is implemented

- **WHEN** this change is complete
- **THEN** the app SHALL claim offline scan queue, batch sync, and conflict resolution as implemented

#### Scenario: QR payload validation stays server-side

- **WHEN** the mobile scanner decodes a QR payload
- **THEN** the app SHALL send the payload to the check-in API when online or SHA-256 hash it for offline persistence and sync, without locally deciding ticket validity, concert match, duplicate status, or staff assignment authorization

#### Scenario: Batch sync client extends API boundary

- **WHEN** the mobile sync service submits a batch sync request
- **THEN** it SHALL use the `CheckinApiClient` interface extended with a `submitBatchSync` method that consumes `BatchSyncRequest` and returns `BatchSyncResponse` from `@ticketbox/api-types`

#### Scenario: Offline queue is scoped to the authenticated staff account

- **WHEN** the app reads, counts, syncs, or clears offline events
- **THEN** it SHALL operate only on events whose local `staffUserId` equals the authenticated profile ID, while backend authorization remains derived exclusively from the bearer token

#### Scenario: Offline infrastructure bootstrap failure is visible

- **WHEN** the mobile app cannot open or migrate the offline SQLite database
- **THEN** it SHALL enter a recoverable error state with a retry action and SHALL NOT remain indefinitely in `initializing` or claim that offline queueing is available
