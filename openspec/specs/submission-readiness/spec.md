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


