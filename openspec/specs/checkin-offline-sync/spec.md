# checkin-offline-sync Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Online QR check-in
The system SHALL validate QR tickets online and record at most one accepted check-in per ticket.

#### Scenario: Valid ticket is checked in
- **WHEN** check-in staff scans a valid unused ticket for the correct concert
- **THEN** the system SHALL record an accepted check-in and mark the ticket as checked in

#### Scenario: Duplicate online scan is rejected
- **WHEN** check-in staff scans a ticket that was already accepted
- **THEN** the system SHALL reject the scan as duplicate

### Requirement: Offline scan queue
The check-in app SHALL allow staff to scan tickets without network connectivity and persist scan events locally until sync.

#### Scenario: Offline scan is stored locally
- **WHEN** the check-in app is offline and staff scans a QR ticket
- **THEN** the app SHALL store the scan event with device ID, timestamp, and QR payload hash

#### Scenario: Offline queue survives refresh
- **WHEN** the check-in app is refreshed before network returns
- **THEN** unsynced scan events SHALL remain available for later sync

### Requirement: Batch sync and conflict handling
The system SHALL sync offline scan events in batches and return a per-event result.

#### Scenario: Offline scan sync succeeds
- **WHEN** network connectivity returns and the app syncs a locally stored valid scan
- **THEN** the server SHALL accept the event if the ticket has not already been checked in

#### Scenario: Offline duplicate conflict is reported
- **WHEN** an offline scan syncs after the same ticket was already accepted elsewhere
- **THEN** the server SHALL reject the event with duplicate or conflict status

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
- **THEN** the system SHALL return a per-event rejected result without accepting the check-in

### Requirement: Online check-in API contract
The system SHALL expose an authenticated `POST /checkin/scan` backend endpoint whose request and successful response follow the canonical shared online scan schemas.

#### Scenario: Staff submits online scan request
- **WHEN** an authenticated `CHECKIN_STAFF` user submits `assignmentId`, `concertId`, optional `gate`, `qrPayload`, `scannedAt`, and required `deviceId` to `POST /checkin/scan`
- **THEN** the system SHALL validate and process the request and return a structured business result containing `status`, `message`, and ticket/check-in metadata when available

#### Scenario: Missing or invalid device identifier is rejected before processing
- **WHEN** an online scan request omits `deviceId`, provides a blank value after trimming, or provides a value longer than 160 characters
- **THEN** the backend SHALL reject the request with HTTP `400` before invoking check-in processing and SHALL NOT create or modify a ticket or check-in event

#### Scenario: Device identifier represents an app installation
- **WHEN** the mobile app constructs an online scan request
- **THEN** `deviceId` SHALL be a stable non-empty identifier for that app installation and SHALL NOT depend on a hardware serial number or replace JWT staff identity

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to `POST /checkin/scan` has no valid bearer token
- **THEN** the system SHALL reject the request with HTTP `401` and SHALL NOT return an online scan business result or accept a check-in

#### Scenario: Non-staff user is rejected
- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `POST /checkin/scan`
- **THEN** the system SHALL reject the request with HTTP `403` and SHALL NOT return an online scan business result or accept a check-in

### Requirement: Online QR ticket validation
The system SHALL validate the scanned QR payload against issued tickets before accepting an online check-in.

#### Scenario: QR payload matches issued ticket for requested concert
- **WHEN** assigned check-in staff scans a QR payload that resolves to an issued ticket for the requested concert
- **THEN** the system SHALL continue to duplicate-prevention checks before accepting the scan

#### Scenario: QR payload does not match a ticket
- **WHEN** assigned check-in staff scans a QR payload that does not resolve to an issued ticket
- **THEN** the system SHALL return `invalid` with `reasonCode` set to `INVALID_TICKET` and SHALL NOT mark any ticket as checked in

#### Scenario: QR payload belongs to another concert
- **WHEN** assigned check-in staff scans a valid ticket QR payload whose ticket belongs to a different concert than the requested `concertId`
- **THEN** the system SHALL return `invalid` with `reasonCode` set to `WRONG_CONCERT` and SHALL NOT mark the ticket as checked in

### Requirement: Online scan assignment authorization
The system SHALL require active check-in staff assignment for the requested assignment, concert, and gate before accepting an online scan.

#### Scenario: Assigned staff can scan for assigned concert
- **WHEN** authenticated `CHECKIN_STAFF` submits an `assignmentId` that belongs to them and matches the requested concert and gate
- **THEN** the system SHALL continue QR ticket validation and duplicate-prevention checks

#### Scenario: Unassigned staff cannot accept scan
- **WHEN** authenticated `CHECKIN_STAFF` has no active assignment for the requested concert or gate
- **THEN** the system SHALL return `unassigned` and SHALL NOT accept the check-in

#### Scenario: Revoked assignment is rejected
- **WHEN** authenticated `CHECKIN_STAFF` only has a revoked assignment for the requested concert or gate
- **THEN** the system SHALL return `unassigned` with `reasonCode` set to `REVOKED_ASSIGNMENT` and SHALL NOT accept the check-in

#### Scenario: Assignment context does not match request
- **WHEN** authenticated `CHECKIN_STAFF` submits an `assignmentId` that does not belong to them or does not match the requested concert or gate
- **THEN** the system SHALL return `unassigned` with `reasonCode` set to `ASSIGNMENT_MISMATCH` and SHALL NOT accept the check-in

### Requirement: Online accepted check-in persistence
The system SHALL record an accepted online check-in exactly once per ticket.

#### Scenario: Valid unused ticket is accepted
- **WHEN** assigned check-in staff scans a valid unused issued ticket for the requested concert
- **THEN** the system SHALL create an accepted online check-in event, mark the ticket as checked in, and return `accepted`

#### Scenario: Already checked-in ticket is duplicate
- **WHEN** assigned check-in staff scans a ticket that already has an accepted check-in
- **THEN** the system SHALL return `duplicate` and SHALL NOT create another accepted check-in event for that ticket

#### Scenario: Concurrent scans accept ticket once
- **WHEN** two online scan requests concurrently submit the same valid unused ticket
- **THEN** the system SHALL accept at most one request and SHALL return `duplicate` for the other request without creating a second accepted check-in event

### Requirement: Online scan result model
The system SHALL return stable mobile-facing online scan business result values independent of internal database enum names, backend domain types, HTTP authorization failures, and mobile transport or UI state.

#### Scenario: Accepted result includes check-in metadata
- **WHEN** a scan is accepted
- **THEN** the response SHALL include `status` set to `accepted`, `message`, the checked-in `ticketId`, and `checkedInAt` as an ISO-8601 wire-format string

#### Scenario: Incomplete accepted result is contract-invalid
- **WHEN** an online scan payload has `status` set to `accepted` but omits `ticketId` or `checkedInAt`
- **THEN** the payload SHALL fail the shared online scan response schema instead of being treated as a valid accepted result

#### Scenario: Accepted persistence result supplies response invariants
- **WHEN** the accepted check-in transaction completes successfully
- **THEN** the backend persistence/application result SHALL already contain the accepted `ticketId` and `checkedInAt` before the HTTP response mapper runs

#### Scenario: Scan response mapping does not add a post-commit failure stage
- **WHEN** the backend maps a completed online scan result to the shared wire response
- **THEN** it SHALL use a deterministic side-effect-free mapper whose variants are validated by contract tests, and SHALL NOT add runtime response-schema parsing after the accepted check-in transaction has committed

#### Scenario: Duplicate result remains distinct
- **WHEN** an authenticated assigned-staff scan is rejected because the ticket was already accepted
- **THEN** the successful HTTP response SHALL include `status` set to `duplicate` and a human-readable `message`, with ticket/check-in metadata included only when available

#### Scenario: Invalid result includes an invalid-ticket reason
- **WHEN** a scan is rejected because the QR is invalid, belongs to another concert, or resolves to a ticket that cannot be issued
- **THEN** the successful HTTP response SHALL include `status` set to `invalid`, a human-readable `message`, and `reasonCode` set to `INVALID_TICKET`, `WRONG_CONCERT`, or `TICKET_NOT_ISSUED`

#### Scenario: Unassigned result includes an assignment reason
- **WHEN** a scan is rejected because the selected assignment is revoked, missing, or does not match the staff, concert, or gate
- **THEN** the successful HTTP response SHALL include `status` set to `unassigned`, a human-readable `message`, and `reasonCode` set to `REVOKED_ASSIGNMENT` or `ASSIGNMENT_MISMATCH`

#### Scenario: Authorization error maps outside business result
- **WHEN** the backend rejects a scan request with HTTP `401` or `403`
- **THEN** the mobile client SHALL classify the failure by HTTP status before success-schema parsing and MAY map it to local `unauthorized`; the authorization error body SHALL remain outside `@ticketbox/api-types`, and `unauthorized` SHALL NOT become an online scan business status

#### Scenario: Transport and UI states are not API results
- **WHEN** the mobile client experiences network failure, service unavailability, loading, submitting, debounce, or camera state
- **THEN** those states SHALL remain mobile-local and SHALL NOT appear in the shared online scan response schema

#### Scenario: Backend and mobile validate one response contract
- **WHEN** backend and mobile compatibility tests exercise `POST /checkin/scan`
- **THEN** the backend response mapper and mobile response parser SHALL both conform to the same `@ticketbox/api-types` schema
