## MODIFIED Requirements

### Requirement: Scheduled CSV guest list import

The system SHALL discover sponsor VIP guest-list CSV files on a configured schedule through a `GuestListFileSourcePort`, SHALL process each discovered file through a retryable worker job, and SHALL NOT require a sponsor API. An authorized Admin upload or trigger MAY be available as a fallback, but scheduled discovery SHALL remain independently operable.

#### Scenario: Valid scheduled CSV import completes

- **WHEN** scheduled discovery finds a valid guest-list CSV for a concert
- **THEN** the system SHALL create one checksum-identified batch, enqueue `guest_list.import_requested`, import its valid rows, and record a completed outcome

#### Scenario: Full cron expression controls discovery

- **WHEN** discovery is configured with an interval, fixed-minute, or fixed-hour five-field cron expression
- **THEN** the worker SHALL run discovery only when the complete expression is due, SHALL keep reconciliation independently operable, and SHALL NOT derive the schedule from the minute field alone

#### Scenario: Invalid cron semantics fail configuration

- **WHEN** discovery cron has the expected textual shape but contains an out-of-range minute or hour, a zero step, or another expression rejected by the scheduler parser
- **THEN** environment validation SHALL reject startup before the worker schedules discovery, and runtime cron evaluation failures SHALL remain inside logged scheduler error handling

#### Scenario: Missing file is isolated

- **WHEN** a scheduled discovery run finds no file for one configured source
- **THEN** the system SHALL record the condition and SHALL continue discovery and processing for other sources without interrupting other features

#### Scenario: Scheduled file is routed to an explicit concert

- **WHEN** the local source discovers a regular CSV at `<inbox>/<concertId>/<file>.csv`
- **THEN** it SHALL validate the directory as a concert UUID, verify that concert exists, keep the resolved path inside the configured inbox root, and claim the file only for that concert without inferring concert identity from the filename or CSV rows

#### Scenario: Invalid inbox candidate is isolated

- **WHEN** discovery encounters an invalid concert directory, symlink, path escape, unsupported file, or unreadable candidate
- **THEN** the system SHALL record and skip that candidate while continuing discovery for other concert directories

#### Scenario: Manual fallback does not replace scheduling

- **WHEN** an authorized Admin manually uploads a file or triggers discovery
- **THEN** the system SHALL use the same claim and processing workflow without disabling or bypassing scheduled discovery

#### Scenario: Worker exhausts retries

- **WHEN** processing continues to fail through the configured retry limit
- **THEN** the worker SHALL mark the canonical batch failed with failure information and SHALL leave other batches processable

#### Scenario: Pending batch is repaired after enqueue failure

- **WHEN** the canonical batch was committed but its earlier BullMQ enqueue attempt failed
- **THEN** rediscovery, an Admin retry, or scheduled reconciliation SHALL ensure the same deterministic job exists for that non-terminal batch without creating a second batch or logical job

#### Scenario: Failed deterministic job is repaired

- **WHEN** a recoverable non-terminal batch has a deterministic BullMQ job retained in `failed`, or an inconsistent `completed` job, after retry or coordination exhaustion
- **THEN** scheduled reconciliation SHALL restore one runnable deterministic job for the same batch and SHALL NOT leave the batch stranded merely because the stale job record exists

#### Scenario: Processing coordination remains retryable

- **WHEN** a batch cannot run because an earlier same-concert batch is non-terminal or another worker holds an active processing lease
- **THEN** the system SHALL preserve the batch as recoverable, SHALL NOT classify the coordination outcome as a terminal import failure, and SHALL allow reconciliation to retry it later

### Requirement: CSV validation and partial failure handling

The system SHALL validate file size, content type, UTF-8 encoding, row limit, required headers, and row data; SHALL preserve row-numbered outcomes; and SHALL distinguish immutable batch evidence from the current active guest list.

#### Scenario: Invalid rows are skipped

- **WHEN** a header-valid CSV contains rows with missing or invalid required data
- **THEN** the system SHALL record each row number and reason, skip active-data mutation for those rows, continue importing valid rows, and finish with accurate completed-with-errors counts

#### Scenario: Invalid header fails atomically

- **WHEN** a CSV has missing, unknown, or duplicate required headers
- **THEN** the system SHALL fail the batch before modifying any active guest entry

#### Scenario: Invalid file envelope fails

- **WHEN** a file exceeds configured size or row limits or has an unsupported content type or encoding
- **THEN** the system SHALL fail the batch with a reportable reason and SHALL NOT modify the active guest list

#### Scenario: Buffered parsing remains bounded

- **WHEN** the initial local adapter receives a CSV within its configured byte limit
- **THEN** whole-file parsing MAY be used, but the implementation and artifacts SHALL describe it as byte-bounded buffered parsing, SHALL reject malformed record width, and SHALL NOT claim an unimplemented streaming parser

#### Scenario: Historical report remains stable

- **WHEN** a later batch updates a guest previously mentioned by an earlier batch
- **THEN** the earlier batch report SHALL retain its original row outcomes while the active guest projection reflects the latest valid change

#### Scenario: Retry after partial progress is idempotent

- **WHEN** a worker attempt commits some row evidence and projection changes before failing and the same batch is retried
- **THEN** replay SHALL reuse the canonical `(batchId, rowNumber)` evidence rows, SHALL NOT duplicate active mutations or report counts, and SHALL recompute terminal counters from persisted evidence

#### Scenario: Replay preserves the original row disposition

- **WHEN** a retry encounters an existing evidence row previously committed as `IMPORTED`, `UPDATED`, `CANCELLED`, `INVALID`, `DUPLICATE`, or `CONFLICT` by the same batch and row number
- **THEN** the system SHALL return that evidence unchanged and SHALL NOT repeat the active guest mutation or reinterpret the row disposition

### Requirement: Idempotent guest entry upsert

The system SHALL compute a deterministic SHA-256 checksum before processing, SHALL enforce one canonical batch per concert and checksum in PostgreSQL, and SHALL maintain at most one active concert-scoped guest for each non-null normalized email, normalized phone, or external reference.

#### Scenario: Duplicate row in one file is detected

- **WHEN** the same normalized natural identifier appears more than once in one CSV
- **THEN** the system SHALL apply at most the first valid occurrence and SHALL count later occurrences as duplicate row outcomes

#### Scenario: Same file is re-imported

- **WHEN** the same CSV bytes are requested again for the same concert
- **THEN** the system SHALL return an idempotent-duplicate outcome referencing the canonical batch, SHALL NOT create duplicate active entries or a second logical job, and SHALL still ensure a deterministic job exists when the canonical batch remains recoverable and non-terminal

#### Scenario: Concurrent requests claim one batch

- **WHEN** concurrent requests submit the same checksum for the same concert
- **THEN** the database SHALL permit one canonical batch and every request SHALL resolve to that batch without duplicate processing

#### Scenario: Different files for one concert preserve claim order

- **WHEN** different-checksum batches for the same concert are claimed close together or processed by multiple workers
- **THEN** the system SHALL assign a monotonic concert-scoped import sequence and SHALL complete row application in that sequence so a later claim cannot be overtaken by an earlier claim

#### Scenario: Different concerts remain parallel

- **WHEN** import batches belong to different concerts
- **THEN** per-concert ordering SHALL NOT prevent those concerts from processing concurrently

#### Scenario: Guest repeats across changed files

- **WHEN** a later file has a different checksum but identifies an existing guest for the same concert
- **THEN** the system SHALL update or reactivate that guest instead of creating another active entry

#### Scenario: Natural identifiers conflict

- **WHEN** supplied email, phone, or external reference values resolve to different existing guests in the same concert
- **THEN** the system SHALL record a row-level conflict and SHALL NOT merge or mutate those guests

#### Scenario: Concurrent natural identifier claim is translated after rollback

- **WHEN** a PostgreSQL uniqueness violation shows that another transaction claimed the same concert-scoped normalized identifier while a row was being applied
- **THEN** the failed mutation transaction SHALL roll back before further queries, and the system SHALL persist one `CONFLICT` row outcome in a fresh transaction without mutating or merging the winning guest

#### Scenario: Same identifier is allowed in another concert

- **WHEN** the same normalized guest identifier appears in files for different concerts
- **THEN** the system SHALL treat the concert guest records independently

#### Scenario: Absent guest remains active

- **WHEN** an active guest is absent from a later imported file
- **THEN** the system SHALL preserve that guest's active state

#### Scenario: Explicit cancellation is applied

- **WHEN** a valid `CANCEL` row unambiguously identifies one existing guest in the concert
- **THEN** the system SHALL mark that guest cancelled, retain the audit row, and exclude the guest from active lookup

#### Scenario: Ambiguous cancellation is rejected

- **WHEN** a `CANCEL` row has no matching guest or its identifiers resolve to different guests
- **THEN** the system SHALL record a row-level error and SHALL NOT cancel any guest

### Requirement: VIP guest lookup

The system SHALL allow CHECKIN_STAFF to search active VIP guests by normalized email, normalized phone, or external reference only when the staff member has an active assignment for the same concert and relevant gate. The lookup SHALL use a runtime-validated `@ticketbox/api-types` request and response contract and SHALL remain separate from QR scanning.

#### Scenario: Active VIP guest is found

- **WHEN** assigned CHECKIN_STAFF submits a valid lookup for an active guest at the assigned concert and gate
- **THEN** the system SHALL return the matching active guest through the shared response contract

#### Scenario: Cancelled or unknown guest is not found

- **WHEN** assigned CHECKIN_STAFF searches for a cancelled or unknown identifier
- **THEN** the system SHALL return a not-found result without exposing an inactive guest as valid

#### Scenario: Staff assignment is missing

- **WHEN** CHECKIN_STAFF requests lookup without an active assignment for the same concert and relevant gate
- **THEN** the system SHALL reject the request without returning guest data

#### Scenario: Shared request validation is authoritative

- **WHEN** a VIP lookup body violates the strict shared Zod request schema, including UUID, trimming, bounds, or unknown-field rules
- **THEN** the endpoint SHALL reject it as a bad request before executing assignment or guest lookup

#### Scenario: Unexpected VIP lookup failure is not disguised

- **WHEN** VIP lookup encounters an unexpected repository, mapper, or infrastructure failure rather than a known authorization-domain error
- **THEN** the endpoint SHALL preserve server-error handling and SHALL NOT return the assignment-specific forbidden response

#### Scenario: Selected assignment must match exactly

- **WHEN** CHECKIN_STAFF supplies an assignment ID that is missing, revoked, belongs to another staff user, concert, or gate, even though the caller has some other valid assignment
- **THEN** the system SHALL reject the lookup and SHALL NOT use the caller's other assignment to authorize the client-supplied assignment ID

#### Scenario: QR scan behavior is unchanged

- **WHEN** VIP lookup is introduced
- **THEN** `POST /checkin/scan` SHALL retain its existing QR-ticket behavior and SHALL NOT accept guest-list lookup requests

## ADDED Requirements

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
