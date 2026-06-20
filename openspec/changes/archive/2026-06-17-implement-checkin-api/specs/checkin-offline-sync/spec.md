## ADDED Requirements

### Requirement: Online check-in API contract
The system SHALL expose an authenticated `POST /checkin/scan` backend endpoint for online QR ticket scans.

#### Scenario: Staff submits online scan request
- **WHEN** an authenticated `CHECKIN_STAFF` user submits `assignmentId`, `concertId`, optional `gate`, `qrPayload`, `scannedAt`, and `deviceId` to `POST /checkin/scan`
- **THEN** the system SHALL process the scan and return a structured result containing `status`, `message`, and ticket/check-in metadata when available

#### Scenario: Missing or invalid token is rejected
- **WHEN** a request to `POST /checkin/scan` has no valid bearer token
- **THEN** the system SHALL reject the request with an HTTP authorization error and SHALL NOT accept a check-in

#### Scenario: Non-staff user is rejected
- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `POST /checkin/scan`
- **THEN** the system SHALL reject the request with an HTTP authorization error and SHALL NOT accept a check-in

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
The system SHALL return stable mobile-facing online scan result values independent of internal database enum names.

#### Scenario: Accepted result includes check-in metadata
- **WHEN** a scan is accepted
- **THEN** the response SHALL include `status` set to `accepted`, the checked-in ticket identifier, and the accepted check-in timestamp

#### Scenario: Rejected result includes clear reason
- **WHEN** a scan is rejected because the ticket is duplicate, invalid, for the wrong concert, unauthorized, or staff is unassigned
- **THEN** the scan response SHALL include one of `duplicate`, `invalid`, or `unassigned`, a human-readable message, and a `reasonCode` when a more specific cause is needed

#### Scenario: Authorization error remains contract-compatible
- **WHEN** the backend rejects a scan request with HTTP `401` or `403`
- **THEN** the backend response SHALL use a stable authorization error shape that later mobile/offline work can map to its local `unauthorized` result state without this change modifying React Native app code
