# submission-readiness Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Local runnable environment
The project SHALL provide a README and local runtime instructions sufficient for graders to run the system without asking the team.

#### Scenario: Grader starts project locally
- **WHEN** a grader follows the README setup instructions
- **THEN** the customer web, admin web, check-in app, backend API, database, Redis, and worker SHALL start successfully

### Requirement: Seed data
The project SHALL provide seed data for required Vietnamese concert examples with ticket types, prices, quantities, sale windows, per-user limits, and seating zones.

#### Scenario: Seed data is loaded
- **WHEN** the database seed script runs
- **THEN** the system SHALL contain Anh Trai Say Hi, Anh Trai Vuot Ngan Chong Gai, Em Xinh Say Hi, and Chi Dep Dap Gio Re Song sample concerts

### Requirement: Final blueprint packaging
The project SHALL export or mirror OpenSpec proposal, design, and specs into the course-required blueprint format.

#### Scenario: Blueprint folder is prepared
- **WHEN** the team prepares the submission
- **THEN** the Drive blueprint artifact SHALL contain proposal, design, and feature specs matching the implemented system

### Requirement: Team implementation roadmap
The project SHALL maintain an official 5-week implementation roadmap in `docs/roadmap.md`.

#### Scenario: Roadmap is available
- **WHEN** the team reviews project planning documents
- **THEN** `docs/roadmap.md` SHALL describe the 5-week implementation phases and submission milestones

### Requirement: Demo video evidence
The project SHALL include a screen-recorded demo that shows the required business features and technical mechanisms.

#### Scenario: Demo covers critical mechanisms
- **WHEN** reviewers watch the demo video
- **THEN** the video SHALL show ticket purchase, QR issuance, no oversell under concurrency, per-user limit, payment failure handling, cache/rate-limit behavior, offline check-in sync, CSV import, and AI artist bio generation

### Requirement: Member 3 technical evidence is runnable
The project SHALL provide reviewer-facing commands or documentation for running Member 3 hardening evidence around ticket purchase, payment reliability, and rate limiting.

#### Scenario: Hardening evidence command is documented
- **WHEN** a reviewer inspects the project test documentation or hardening evidence script
- **THEN** it SHALL identify commands for no-oversell, per-user limit, payment idempotency, duplicate callback, circuit breaker, and rate-limit tests

#### Scenario: Hardening evidence output maps to required mechanisms
- **WHEN** the team runs the documented hardening commands
- **THEN** the output SHALL make it clear which required mechanism each test group proves
- **AND** failures SHALL identify the affected mechanism rather than requiring manual log inspection

#### Scenario: Evidence remains scoped to implemented backend mechanisms
- **WHEN** hardening evidence is prepared for final submission
- **THEN** it SHALL focus on backend ticketing, payment, and platform-protection mechanisms owned by Member 3
- **AND** it SHALL NOT claim completion of unrelated frontend, offline sync, reminder, or reconciliation features

### Requirement: Repeatable database migrations
The project SHALL provide repeatable database migration commands that create the TicketBox PostgreSQL schema from an empty local database.

#### Scenario: Developer applies database migrations
- **WHEN** a developer starts the local PostgreSQL service and runs the documented migration command
- **THEN** the database SHALL contain the base TicketBox schema required for users, roles, concerts, seating zones, ticket types, orders, payments, tickets, check-in, notifications, guest list imports, and AI artist bios

#### Scenario: Migration command is safe for a fresh checkout
- **WHEN** a developer follows the documented setup steps on a fresh checkout
- **THEN** the migration command SHALL complete without requiring manual SQL edits

### Requirement: Deterministic database seed
The project SHALL provide an idempotent seed command that loads demo users, roles, sample concerts, ticket types, sale windows, per-user limits, seating zones, and ticket-to-zone mappings.

#### Scenario: Seed command loads required concerts
- **WHEN** the database seed command runs successfully
- **THEN** the system SHALL contain Anh Trai Say Hi, Anh Trai Vuot Ngan Chong Gai, Em Xinh Say Hi, and Chi Dep Dap Gio Re Song sample concerts with ticket types and seating zones

#### Scenario: Seed command can run more than once
- **WHEN** the database seed command runs twice against the same local database
- **THEN** the second run SHALL NOT create duplicate demo users, roles, concerts, ticket types, seating zones, or ticket-to-zone mappings



### Requirement: Seed demo artists and concert links
The seed script SHALL create demo Artist records and link them to existing sample concerts via ConcertArtist records, providing development and submission evidence for the artist domain.

#### Scenario: Seed creates demo artists
- **WHEN** the seed script runs in a development or test environment
- **THEN** the system SHALL create Artist records for demo artists matching existing sample concert `artistName` values such as "Anh Trai Say Hi", with slugs, display names, and ACTIVE status

#### Scenario: Seed links demo artists to sample concerts
- **WHEN** the seed script creates demo artists
- **THEN** the system SHALL create ConcertArtist records linking each demo artist to the corresponding sample concert(s) where the `artistName` matches

#### Scenario: Seed is idempotent
- **WHEN** the seed script runs more than once
- **THEN** the system SHALL not create duplicate Artist or ConcertArtist records, using upsert or existence checks

#### Scenario: Seed does not modify existing concert artistName
- **WHEN** the seed script links demo artists to sample concerts
- **THEN** the system SHALL NOT modify the existing `Concert.artistName` values on those concerts

### Requirement: Comprehensive requirement validation evidence
The project SHALL maintain a final validation matrix that maps each required course problem area to implementation locations, automated evidence, manual evidence, current status, and pass criteria. The matrix SHALL explicitly cover ticket contention/no-oversell, traffic spike protection, payment instability, duplicate payment prevention, offline check-in, one-way CSV guest-list import, per-user ticket limits, public catalog caching, notification delivery, AI artist bio, RBAC, local setup, seed data, and demo readiness.

#### Scenario: Validation matrix maps required problem areas
- **WHEN** the team prepares final submission evidence
- **THEN** the validation matrix SHALL list every required problem area from `docs/requirements.md`
- **AND** each row SHALL identify the related OpenSpec capability, code or test area, evidence type, expected pass criteria, and current status

#### Scenario: Missing coverage is recorded as a gap
- **WHEN** a required problem area lacks implementation, automated evidence, or reliable manual evidence
- **THEN** the validation matrix SHALL mark the item as a gap
- **AND** the matrix SHALL describe the recommended follow-up change instead of implying the requirement is complete

### Requirement: Automated submission evidence
The project SHALL provide deterministic automated evidence commands or test groups for backend and platform requirements that can be verified locally without third-party interactive steps.

#### Scenario: Automated evidence covers backend invariants
- **WHEN** the team runs the documented automated evidence commands
- **THEN** the output SHALL include evidence for no-oversell concurrency, per-user limit concurrency, payment initiation idempotency, duplicate provider callback dedupe, paid-order recovery, rate limiting, circuit breaker behavior, QR ticket issuance, notification/QR email invariants, catalog caching, RBAC boundaries, and guest-list import/report behavior

#### Scenario: Automated evidence avoids false provider claims
- **WHEN** simulator-based payment tests are included in automated evidence
- **THEN** the evidence report SHALL label them as deterministic simulator coverage
- **AND** it SHALL NOT claim that simulator-only tests prove real MoMo or VNPay sandbox payment completion

#### Scenario: Automated evidence remains deterministic
- **WHEN** evidence tests run in local development or CI-like execution
- **THEN** the tests SHALL avoid long sleeps, uncontrolled external network calls, and manual browser actions
- **AND** tests requiring PostgreSQL or Redis SHALL document the required Docker services

### Requirement: Manual submission evidence checklist
The project SHALL provide a manual checklist for required flows that cannot be reliably automated by local tests or AI execution.

#### Scenario: Manual provider payment checklist exists
- **WHEN** final payment evidence is prepared
- **THEN** the checklist SHALL include MoMo and VNPay sandbox setup, order creation, payment initiation, provider redirect, user completion or cancellation, return URL observation, IPN/public tunnel verification, order/payment status verification, and ticket issuance verification

#### Scenario: Manual external delivery checklist exists
- **WHEN** final notification evidence is prepared
- **THEN** the checklist SHALL include email delivery to an external inbox or Maildev fallback, purchase confirmation content, QR attachment or inline QR presence, and retry/failure behavior evidence

#### Scenario: Manual UI and device checklist exists
- **WHEN** final demo evidence is prepared
- **THEN** the checklist SHALL include audience web purchase flow, ticket wallet/QR display, organizer/admin management flow, check-in staff flow, offline/mobile sync flow if available, responsive frontend review, and known UX limitations

### Requirement: Submission evidence report
The project SHALL produce a reviewer-facing validation report summarizing automated pass/fail results, manual checklist status, known limitations, required environment variables, and setup prerequisites.

#### Scenario: Evidence report summarizes results
- **WHEN** the validation change is completed
- **THEN** the report SHALL summarize which evidence groups passed, failed, were not run, or require manual verification
- **AND** failures SHALL identify the requirement area affected rather than only showing raw test output

#### Scenario: Evidence report documents prerequisites
- **WHEN** a reviewer or teammate reads the validation report
- **THEN** it SHALL identify required local services, seed data, provider sandbox credentials, public tunnel requirements, and manual accounts needed to reproduce the evidence

### Requirement: Guest-list user-flow evidence

The project SHALL provide repeatable automated and manual evidence for Admin CSV upload through canonical processing/reporting and for assignment-authorized mobile VIP lookup while identifying scheduled inbox discovery as an independently operating worker flow.

#### Scenario: Automated guest-list UI evidence is runnable

- **WHEN** the documented focused and end-to-end guest-list commands are run with required local dependencies
- **THEN** they SHALL verify strict contracts, safe public mapping, client file validation, batch polling termination, report rendering, online mobile lookup, authorization, same-file idempotency, and invalid-header atomicity

#### Scenario: Manual demo covers the connected workflow

- **WHEN** the team follows the guest-list manual demo checklist
- **THEN** the evidence SHALL show an ADMIN uploading the canonical CSV template, observing processing and terminal counters, inspecting row errors, re-uploading idempotently, and assigned CHECKIN_STAFF finding the imported active guest on mobile

#### Scenario: Scheduled integration is demonstrated separately

- **WHEN** the team demonstrates the one-way sponsor integration requirement
- **THEN** it SHALL place a CSV under `data/guest-list-inbox/<concertId>/*.csv`, show the worker discovering it according to configuration, and SHALL NOT depend on a manual discovery button in the UI

#### Scenario: Missing end-to-end evidence is reported honestly

- **WHEN** PostgreSQL, Redis, worker, emulator/device, or another required dependency prevents a full evidence run
- **THEN** the submission report SHALL distinguish passing focused tests from the blocked manual or end-to-end step and SHALL NOT claim complete demo readiness
