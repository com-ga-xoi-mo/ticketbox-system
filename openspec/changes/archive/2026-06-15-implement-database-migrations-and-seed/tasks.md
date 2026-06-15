## 1. Schema Modeling

- [x] 1.1 Replace the placeholder Prisma schema with TicketBox enums for user, concert, asset, ticket type, order, payment, ticket, check-in, notification, guest list, and artist bio statuses.
- [x] 1.2 Add user and RBAC models for `users`, `roles`, and `user_roles` with unique email, unique role code, timestamps, and status fields.
- [x] 1.3 Add catalog models for `concerts`, `assets`, `seating_zones`, `ticket_types`, and `ticket_type_zones` with the relationships described in `design.md`.
- [x] 1.4 Add ticket purchase baseline models for `orders`, `order_items`, `payments`, `payment_events`, `tickets`, and `idempotency_records`.
- [x] 1.5 Add operational baseline models for `checkin_staff_assignments`, `checkin_events`, `notifications`, `notification_attempts`, `guest_list_batches`, `guest_list_entries`, and `artist_bios`.
- [x] 1.6 Add Prisma indexes and unique constraints for emails, roles, concert slugs, ticket type codes per concert, seating zone SVG IDs per concert, QR token hashes, provider payment references, idempotency keys, and join tables.

## 2. Migration Setup

- [x] 2.1 Generate the initial Prisma migration for the full TicketBox schema.
- [x] 2.2 Inspect and adjust generated SQL for PostgreSQL constraints that protect inventory quantities, sale windows, and positive ticket limits.
- [x] 2.3 Add raw SQL migration support for partial unique indexes or same-concert ticket-to-zone invariants when Prisma cannot represent them directly.
- [x] 2.4 Add package scripts for `db:migrate`, `db:generate`, `db:seed`, `db:reset`, and `db:studio`.
- [x] 2.5 Verify the migration applies cleanly against the local Docker Compose PostgreSQL database from an empty schema.

## 3. Seed Data

- [x] 3.1 Create an idempotent Prisma seed script that upserts roles for `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, and `ADMIN`.
- [x] 3.2 Seed demo users for audience, organizer, check-in staff, and admin accounts with documented demo-only password hashes.
- [x] 3.3 Seed poster and seating map asset metadata for the required sample concerts.
- [x] 3.4 Seed Anh Trai Say Hi, Anh Trai Vuot Ngan Chong Gai, Em Xinh Say Hi, and Chi Dep Dap Gio Re Song as published sample concerts owned by the organizer demo user.
- [x] 3.5 Seed seating zones with SVG element IDs, labels, colors, display order, and active status for each sample concert.
- [x] 3.6 Seed ticket types with VND prices, capacities, active sale windows, max-per-user values, zero reserved/sold counts, and active status.
- [x] 3.7 Seed ticket-to-zone mappings for every sample ticket type and verify all mappings reference zones from the same concert.
- [x] 3.8 Ensure running the seed command twice does not duplicate demo users, roles, concerts, ticket types, seating zones, or mappings.

## 4. Verification

- [x] 4.1 Add or update tests/scripts that run Prisma schema validation and client generation.
- [x] 4.2 Add a database seed verification test that confirms all required concerts, roles, users, ticket types, seating zones, and mappings exist.
- [x] 4.3 Add focused database tests or verification queries for critical uniqueness constraints and inventory bounds.
- [x] 4.4 Run `npm run lint`, `npm run test`, Prisma generation, migration, and seed commands locally.
- [x] 4.5 Capture any required manual verification commands in the change notes or README updates.

## 5. Documentation

- [x] 5.1 Update setup documentation with database migration, reset, seed, and Prisma Studio commands.
- [x] 5.2 Document demo account emails and passwords as local-only credentials.
- [x] 5.3 Document the seed concert names, ticket type examples, and seating zone mapping purpose for downstream team members.
- [x] 5.4 Update `docs/roadmap.md` checkboxes related to database migration tooling and seed data when implementation is complete.
