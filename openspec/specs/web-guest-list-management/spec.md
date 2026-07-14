# web-guest-list-management Specification

## Purpose

Defines the concert-scoped Admin web workflow for uploading VIP guest-list CSV files, monitoring canonical import batches, and inspecting available row-level reports.

## Requirements

### Requirement: Concert-scoped Admin guest-list route

The Admin web portal SHALL provide an ADMIN-only guest-list management route at `/admin/concerts/:id/guest-list`, SHALL expose its entry point from Admin concert management for the selected concert, and SHALL NOT add a global or ORGANIZER guest-list navigation item.

#### Scenario: Admin opens guest-list management

- **WHEN** an authenticated ADMIN activates the guest-list action for a managed concert
- **THEN** the web portal SHALL navigate to that concert's guest-list page and load its canonical import batches

#### Scenario: Unauthorized role opens the route directly

- **WHEN** an ORGANIZER or unauthenticated actor navigates directly to an Admin guest-list URL
- **THEN** the existing role-gated route boundary SHALL deny access without rendering import data

#### Scenario: Manual discovery remains absent

- **WHEN** the Admin guest-list page renders its available actions
- **THEN** it SHALL offer explicit CSV upload but SHALL NOT expose a manual inbox discovery control

### Requirement: Bounded CSV upload experience

The Admin guest-list page SHALL accept a non-empty `.csv` file no larger than 5 MiB, SHALL normalize an empty browser MIME type to `text/csv`, SHALL submit the existing JSON Base64 request contract, and SHALL keep backend validation authoritative.

#### Scenario: Admin uploads a browser-selected CSV

- **WHEN** an ADMIN selects a valid bounded CSV and submits it for the route's concert
- **THEN** the client SHALL encode the original bytes as Base64, submit the shared upload request, and display whether a new canonical batch was created or an idempotent duplicate was resolved

#### Scenario: Browser provides no CSV MIME type

- **WHEN** a valid `.csv` file has an empty browser MIME type
- **THEN** the client SHALL submit `text/csv` while preserving the original file name and bytes

#### Scenario: Client rejects an invalid file envelope

- **WHEN** the selected file is empty, exceeds 5 MiB, or does not have the `.csv` extension
- **THEN** the page SHALL show an actionable validation error and SHALL NOT submit an upload request

#### Scenario: Admin downloads the canonical template

- **WHEN** an ADMIN requests the guest-list template
- **THEN** the portal SHALL download a source-controlled CSV whose header is `guest_name,email,phone,external_ref,action`

### Requirement: Canonical batch monitoring

The Admin guest-list page SHALL present newest-first canonical batches with lifecycle status, counters, failure details, and timestamps and SHALL poll only while at least one displayed batch is non-terminal.

#### Scenario: Non-terminal batch is monitored

- **WHEN** the loaded list contains a `PENDING` or `PROCESSING` batch
- **THEN** the client SHALL periodically refresh the list at an approximately two-second interval until the batch becomes terminal or the page is no longer active

#### Scenario: Terminal history stops polling

- **WHEN** all displayed batches are `COMPLETED`, `COMPLETED_WITH_ERRORS`, or `FAILED`
- **THEN** automatic polling SHALL stop while manual query invalidation and later uploads remain able to refresh the list

#### Scenario: Failed batch is explained

- **WHEN** a batch reaches `FAILED`
- **THEN** the page SHALL render its failure code and message without attempting to fetch a completed report

#### Scenario: Repeated upload resolves canonical history

- **WHEN** upload returns `IDEMPOTENT_DUPLICATE`
- **THEN** the page SHALL identify the returned canonical batch and SHALL NOT display a second logical import

#### Scenario: Dense history remains readable

- **WHEN** a batch contains all counters, lifecycle timestamps, a long checksum, or a batch failure message
- **THEN** the history SHALL keep columns visually separated and SHALL use bounded wrapping or horizontal overflow instead of overlapping adjacent content

### Requirement: Import report inspection

The Admin guest-list page SHALL allow reports only for `COMPLETED` and `COMPLETED_WITH_ERRORS` batches, SHALL display reconciled summary counts and immutable row evidence, and SHALL support downloading the validated report as JSON.

#### Scenario: Completed report is displayed

- **WHEN** an ADMIN opens the available report for a completed or completed-with-errors batch
- **THEN** the page SHALL open an immediately visible modal and show its summary and row number, action, guest fields, disposition, reason code, and reason message from the shared report contract

#### Scenario: Report JSON is downloaded

- **WHEN** an ADMIN downloads an already loaded valid report
- **THEN** the browser SHALL save the same validated report payload as JSON without requesting a new server-side export format

#### Scenario: Non-reportable batch has no report action

- **WHEN** a batch is pending, processing, or failed
- **THEN** the page SHALL not offer or automatically issue its report request

#### Scenario: Terminal legacy batch has no stored report

- **WHEN** a completed or completed-with-errors batch has no stored report
- **THEN** the safe public batch SHALL indicate that the report is unavailable and the page SHALL not offer a broken report action
