## MODIFIED Requirements

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

#### Scenario: Backend maps internal result to wire response
- **WHEN** backend domain or application processing produces an online scan result
- **THEN** the backend HTTP adapter SHALL map internal dates, names, and enums into the shared response contract without exposing domain, Prisma, or persistence types

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to `POST /checkin/scan` has no valid bearer token
- **THEN** the system SHALL reject the request with HTTP `401` and SHALL NOT return an online scan business result or accept a check-in

#### Scenario: Non-staff user is rejected
- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `POST /checkin/scan`
- **THEN** the system SHALL reject the request with HTTP `403` and SHALL NOT return an online scan business result or accept a check-in

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

## ADDED Requirements

### Requirement: Checkin staff active assignment query
The Checkin bounded context SHALL expose `GET /checkin/assignments` for authenticated `CHECKIN_STAFF` users to list their own active concert and gate assignments using the shared assignment response contract.

#### Scenario: Staff lists own active assignments
- **WHEN** an authenticated `CHECKIN_STAFF` user calls `GET /checkin/assignments`
- **THEN** the system SHALL derive the staff identity from the verified JWT and return only that user's active assignments as a raw JSON array with assignment ID, concert ID, concert title, optional gate, optional start time, and `ACTIVE` status

#### Scenario: Empty assignment result preserves raw-array compatibility
- **WHEN** the authenticated staff user has no active assignments
- **THEN** `GET /checkin/assignments` SHALL return `[]` and SHALL NOT wrap the result in an envelope such as `{ assignments: [] }`

#### Scenario: Client cannot select another staff identity
- **WHEN** a caller requests active assignments
- **THEN** the endpoint SHALL NOT accept a client-supplied staff user ID and SHALL NOT return another staff member's assignments

#### Scenario: Missing or invalid token is rejected for assignment listing
- **WHEN** a request to `GET /checkin/assignments` has no valid bearer token
- **THEN** the system SHALL reject the request with HTTP `401` and SHALL NOT return assignment data

#### Scenario: Non-staff user is rejected for assignment listing
- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `GET /checkin/assignments`
- **THEN** the system SHALL reject the request with HTTP `403` and SHALL NOT change existing assignment authorization rules

#### Scenario: Assignment list does not authorize a later scan by itself
- **WHEN** staff submits an online scan after selecting an assignment returned by the list endpoint
- **THEN** the system SHALL still enforce current assignment ownership, active status, concert, and gate checks during scan processing

### Requirement: Checkin assignment read-model boundary
The staff assignment listing SHALL be implemented as a Checkin application query behind a Checkin-owned read port, with any assignment/concert table projection confined to Checkin infrastructure.

#### Scenario: Checkin inner layers remain independent
- **WHEN** the assignment-list query is compiled or checked by dependency-boundary tests
- **THEN** Checkin application/domain code SHALL NOT import Prisma, the Identity assignment repository implementation, or Concert Management domain/application types

#### Scenario: Existing bounded-context ownership is preserved
- **WHEN** the assignment read model includes concert title or start time
- **THEN** Identity SHALL continue to own role and assignment authorization/management, Concert Management SHALL continue to own concert business behavior, and the Checkin projection SHALL NOT relocate or expose those domain entities
