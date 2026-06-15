## ADDED Requirements

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
