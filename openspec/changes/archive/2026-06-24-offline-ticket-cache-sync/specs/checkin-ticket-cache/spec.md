## ADDED Requirements

### Requirement: Ticket cache endpoint

The backend SHALL expose `GET /checkin/ticket-cache` for authenticated `CHECKIN_STAFF` users to download QR token hashes for their assigned concert, enabling offline ticket validation on the mobile device.

#### Scenario: Full cache download on first call

- **WHEN** an authenticated `CHECKIN_STAFF` user calls `GET /checkin/ticket-cache?assignmentId=<id>&concertId=<id>` without a `since` parameter
- **THEN** the system SHALL verify the assignment is ACTIVE and belongs to the authenticated user, then return all `qrTokenHash` values for tickets with status `ISSUED` or `CHECKED_IN` for that concert, along with each hash's current status (`valid` for ISSUED, `checked_in` for CHECKED_IN) and a `syncedAt` timestamp

#### Scenario: Delta cache on subsequent calls

- **WHEN** an authenticated `CHECKIN_STAFF` user calls `GET /checkin/ticket-cache?assignmentId=<id>&concertId=<id>&since=<ISO datetime>`
- **THEN** the system SHALL return only records that changed since the `since` timestamp: `upserted` containing hashes whose status changed (new ISSUED tickets, tickets that became CHECKED_IN), and `voided` containing hashes of tickets that became VOIDED or REFUNDED since `since`

#### Scenario: Empty delta when nothing changed

- **WHEN** `GET /checkin/ticket-cache` is called with a `since` timestamp and no tickets changed since that time
- **THEN** the system SHALL return `{ upserted: [], voided: [], syncedAt: <now> }` with HTTP 200

#### Scenario: Invalid or revoked assignment is rejected

- **WHEN** the `assignmentId` does not exist, does not belong to the authenticated staff user, or has status `REVOKED`
- **THEN** the system SHALL return HTTP 403 and SHALL NOT return any ticket hashes

#### Scenario: Concert mismatch is rejected

- **WHEN** the `concertId` in the request does not match the concert of the provided `assignmentId`
- **THEN** the system SHALL return HTTP 400 and SHALL NOT return any ticket hashes

#### Scenario: Missing token is rejected

- **WHEN** `GET /checkin/ticket-cache` is called without a valid JWT bearer token
- **THEN** the system SHALL return HTTP 401

#### Scenario: Non-staff role is rejected

- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls `GET /checkin/ticket-cache`
- **THEN** the system SHALL return HTTP 403

### Requirement: Ticket cache architecture boundary

The ticket cache query SHALL be implemented as a Checkin application query behind a Checkin-owned read port. Ticket and checkin-event table projections SHALL be confined to Checkin infrastructure.

#### Scenario: Checkin inner layers remain independent

- **WHEN** the ticket cache query is compiled or checked by dependency-boundary tests
- **THEN** Checkin application and domain code SHALL NOT import Prisma, Identity repository implementations, or Concert Management domain types
