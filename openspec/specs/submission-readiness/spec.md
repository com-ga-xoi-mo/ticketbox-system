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
