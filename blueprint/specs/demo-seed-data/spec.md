## Purpose
Define deterministic demo seed data behavior so local development, demos, and downstream feature testing can start from a realistic, repeatable TicketBox dataset.

## Requirements

### Requirement: Idempotent deterministic seed

The database seed SHALL be safe to run repeatedly without creating duplicate rows, using
stable deterministic identifiers for all seeded entities so that re-running the seed or a
`prisma migrate reset` converges to the same dataset.

#### Scenario: Re-running the seed does not duplicate data

- **WHEN** the seed is executed two or more times against the same database
- **THEN** the resulting row counts for each seeded entity SHALL be the same as after a single run (upsert by stable id/key, no duplicates)

#### Scenario: Seed runs after a reset

- **WHEN** `prisma migrate reset` re-applies migrations and runs the seed
- **THEN** the seed SHALL populate the full dataset without error

### Requirement: Scannable seeded tickets

Seeded issued tickets SHALL carry a QR token hash computed identically to the live ticket
issuing flow, so a seeded ticket's QR can be validated at check-in without any manual
purchase.

#### Scenario: Seeded ticket QR hash matches the issuing computation

- **WHEN** the seed creates an issued ticket
- **THEN** its stored `qrTokenHash` SHALL equal `hashPayload(createPayload(ticketFields))` using the same `QrTicketTokenService` and `QR_TOKEN_SECRET` as the issuing use-case

#### Scenario: Seeded ticket is accepted at online check-in

- **WHEN** assigned check-in staff scans the QR payload of a seeded, not-yet-checked-in ticket for the correct concert
- **THEN** the check-in SHALL resolve the ticket and accept it (same as a normally issued ticket)

### Requirement: Realistic transactional dataset

The seed SHALL populate transactional and derived data across the core purchase and
check-in flows with a realistic distribution of statuses, so downstream features are
exercisable without manual setup.

#### Scenario: Orders span multiple statuses

- **WHEN** the seed completes
- **THEN** the database SHALL contain orders in `PAID`, `PENDING_PAYMENT`, and `CANCELLED` states, with `PAID` orders having issued tickets and matching `Payment` records

#### Scenario: Some tickets are already checked in

- **WHEN** the seed completes
- **THEN** a portion of issued tickets SHALL have `CHECKED_IN` status with corresponding check-in events, leaving others issued so both accept and duplicate paths are testable

#### Scenario: Notifications exist for seeded activity

- **WHEN** the seed completes
- **THEN** the database SHALL contain in-app and email notifications (purchase confirmation and reminders) for seeded users, with a mix of read and unread

#### Scenario: Ticket-type availability stays consistent

- **WHEN** the seed creates orders and tickets
- **THEN** each ticket type's reserved/sold counts SHALL remain consistent with the seeded orders so availability is not corrupted

### Requirement: Feature-coverage seed breadth

The seed SHALL include data for the newer product areas and span the catalog across time
so feature-specific flows can be demonstrated.

#### Scenario: Concerts span past, ongoing, and upcoming

- **WHEN** the seed completes
- **THEN** concerts SHALL include at least one already-ended, one near-term, and several upcoming, so the concert-end assignment filter and listings are exercisable

#### Scenario: Marketplace categories have seeded events

- **WHEN** the seed completes
- **THEN** the catalog SHALL include 5 additional music events plus at least 5 events each for workshop, sport, movie, theatre, and voucher categories, each carrying the appropriate `eventType`

#### Scenario: New-feature entities are present

- **WHEN** the seed completes
- **THEN** the database SHALL contain promotions (active and expired), favorite concerts / artist follows, support and refund requests with status history, artist bios, and a guest-list batch with entries

#### Scenario: Check-in staff has assignments across concerts and gates

- **WHEN** the seed completes
- **THEN** at least one staff user SHALL have multiple active assignments (different concerts/gates) so multi-assignment selection and ordering are exercisable
