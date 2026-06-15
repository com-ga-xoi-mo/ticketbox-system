## ADDED Requirements

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
