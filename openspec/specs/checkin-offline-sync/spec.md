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
