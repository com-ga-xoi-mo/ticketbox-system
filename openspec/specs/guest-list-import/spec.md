# guest-list-import Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Scheduled CSV guest list import
The system SHALL import sponsor VIP guest lists from scheduled CSV files without requiring a sponsor API.

#### Scenario: Valid CSV import completes
- **WHEN** a valid guest list CSV is available for a concert
- **THEN** the worker SHALL import valid guest entries and record a completed import batch

#### Scenario: Missing file is reported
- **WHEN** the scheduled import runs and no file is available
- **THEN** the system SHALL record the condition without interrupting other system features

### Requirement: CSV validation and partial failure handling
The system SHALL validate CSV headers and rows and SHALL isolate invalid rows from valid rows.

#### Scenario: Invalid rows are skipped
- **WHEN** a CSV contains rows with missing required fields
- **THEN** the system SHALL skip those rows, record row-level errors, and continue importing valid rows

#### Scenario: Bad header fails batch
- **WHEN** a CSV has an invalid header format
- **THEN** the system SHALL fail the import batch without modifying the active guest list

### Requirement: Idempotent guest entry upsert
The system SHALL handle duplicate guest rows and repeated file imports without creating duplicate guest list entries.

#### Scenario: Duplicate row is detected
- **WHEN** the same guest appears multiple times in one CSV
- **THEN** the system SHALL create or update at most one active guest entry and count duplicates in the import report

#### Scenario: Same file is re-imported
- **WHEN** a CSV with the same checksum is imported again
- **THEN** the system SHALL treat it as an idempotent repeated import and SHALL not duplicate entries

### Requirement: VIP guest lookup
The system SHALL allow authorized check-in staff to validate active VIP guest list entries at the VIP gate.

#### Scenario: VIP guest is found
- **WHEN** staff searches by normalized email, phone, or external reference for an active guest
- **THEN** the system SHALL return the matching guest entry for the concert

