## ADDED Requirements

### Requirement: Runtime-validated Admin guest-list HTTP boundary

The system SHALL validate Admin guest-list management requests and successful responses through `@ticketbox/api-types`, SHALL expose a purpose-built public batch/report representation, and SHALL keep backend domain and infrastructure details outside the HTTP contract.

#### Scenario: Admin upload request uses the shared schema

- **WHEN** an ADMIN submits a guest-list upload request
- **THEN** the HTTP boundary SHALL reject unknown, malformed, oversized-contract, or missing fields before invoking the import claim use case and SHALL pass valid Base64 bytes through the existing claim workflow

#### Scenario: Upload returns a canonical request outcome

- **WHEN** a valid upload creates a batch or resolves an existing same-checksum batch
- **THEN** the endpoint SHALL return a shared-schema response containing `CREATED` or `IDEMPOTENT_DUPLICATE` and the corresponding safe public batch

#### Scenario: Batch management exposes safe lifecycle data

- **WHEN** an authorized Admin lists or retrieves guest-list batches
- **THEN** each response SHALL include public identity, source name, checksum, import sequence, status, processing attempt, counters, failure details, and lifecycle timestamps and SHALL exclude storage paths, storage keys, processing leases, and queue internals

#### Scenario: Completed report matches the shared report contract

- **WHEN** an authorized Admin retrieves a completed or completed-with-errors report
- **THEN** the HTTP response SHALL validate against the shared summary and row-evidence schema without exposing its storage key

#### Scenario: Non-completed report error matches the shared contract

- **WHEN** an authorized Admin retrieves a report for a failed, pending, or processing batch
- **THEN** the endpoint SHALL return HTTP 422 with the shared `BATCH_NOT_COMPLETED` error code, current batch status, and descriptive message

#### Scenario: Scheduled discovery remains independent

- **WHEN** the Admin web client is unavailable or never invokes manual discovery
- **THEN** the configured worker SHALL continue scheduled inbox discovery and reconciliation with the existing import semantics
