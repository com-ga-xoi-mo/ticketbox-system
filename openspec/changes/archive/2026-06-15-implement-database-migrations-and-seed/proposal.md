## Why

TicketBox needs its database contract in place before identity, concert catalog, ticket purchase, and demo flows can be implemented safely. This change turns the accepted blueprint data model into Prisma migrations and deterministic seed data for Member 1 Wave 1.

## What Changes

- Add Prisma migration setup for the TicketBox PostgreSQL schema.
- Define the base schema for users, roles, concerts, assets, seating zones, ticket types, ticket-to-zone mappings, orders, order items, payments, tickets, check-in assignments/events, notifications, guest list imports, and AI artist bios where needed by later waves.
- Preserve `ticket_types` as the inventory source of truth with `total_quantity`, `reserved_quantity`, `sold_quantity`, sale windows, status, and `max_per_user`.
- Add explicit `seating_zones` and `ticket_type_zones` tables so uploaded seating map SVG element IDs can map to arbitrary ticket types per concert.
- Add constraints and indexes needed for unique emails, role assignments, concert slugs, ticket type codes per concert, seating zone SVG IDs per concert, idempotency keys, provider payment references, QR token hashes, and check-in duplicate protection.
- Add seed users for audience, organizer, check-in staff, and admin demo accounts.
- Add seed sample concerts for Anh Trai Say Hi, Anh Trai Vuot Ngan Chong Gai, Em Xinh Say Hi, and Chi Dep Dap Gio Re Song with ticket types, prices, capacities, per-user limits, sale windows, seating zones, and ticket-to-zone mappings.
- Add local commands/documentation hooks so the database can be migrated and seeded during setup and verified by the team.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `submission-readiness`: add implementation readiness requirements for repeatable database migrations and deterministic demo seed data.

The database schema implements accepted target behavior already defined in `concert-management` and `ticket-purchase`; this change only adds readiness requirements for how the database is migrated and seeded locally.

## Impact

- Affected code: `prisma/schema.prisma`, Prisma migrations, seed scripts, package scripts, database-related tests, and setup documentation.
- Affected systems: local PostgreSQL database used by the NestJS API and worker.
- Affected dependencies: existing Prisma CLI/client setup and PostgreSQL connection configuration.
- Follow-on changes for authentication, concert catalog/admin, inventory reservation, payment, check-in, guest list import, notifications, and AI bios will build on this schema.
