## MODIFIED Requirements

### Requirement: Persistent import batch and report management

The system SHALL persist each canonical import batch with source asset, checksum, lifecycle status, counts, timestamps, failure details, and report information, and SHALL allow authorized Admin users to request imports, inspect batches, and retrieve their reports.

#### Scenario: Completed batch report is accurate

- **WHEN** a batch reaches a terminal outcome
- **THEN** its report SHALL reconcile total, imported, updated, cancelled, invalid, duplicate, and conflict row counts with the persisted row evidence

#### Scenario: Admin requests an import

- **WHEN** an authenticated authorized Admin submits a valid CSV for a manageable concert
- **THEN** the system SHALL create or resolve the canonical batch and return its request outcome

#### Scenario: Unauthorized import management is rejected

- **WHEN** a non-Admin or an Admin outside the permitted concert scope requests or inspects an import or report
- **THEN** the system SHALL reject access without revealing report contents

#### Scenario: Report for non-completed batch returns structured error

- **WHEN** an Admin requests the report for a batch with status FAILED, PENDING, or PROCESSING
- **THEN** the system SHALL return HTTP 422 with a structured response containing the error code, batch status, and a descriptive message instead of an internal server error
