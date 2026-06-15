## Context

TicketBox already has a NestJS workspace, Docker Compose services for PostgreSQL and Redis, and a placeholder Prisma schema. The accepted blueprint says PostgreSQL is the source of truth for users, concerts, ticket inventory, orders, payments, tickets, check-in, notifications, guest list imports, and AI artist bios. It also says Redis is supporting infrastructure only, so paid ticket state and inventory correctness must be represented in PostgreSQL.

This Member 1 Wave 1 change owns the database baseline. Later changes for authentication, concert admin/catalog, order lifecycle, inventory reservation, payment, check-in, notifications, guest list import, and AI bios must be able to build on this schema without redefining core tables. The most important cross-team contracts are:

- `ticket_types` remains the inventory row that ticket purchase will lock with PostgreSQL row-level locks.
- `seating_zones` and `ticket_type_zones` represent SVG seating map element IDs and many-to-many ticket mappings.
- Seed data must include the required Vietnamese concert examples, users, roles, ticket types, sale windows, per-user limits, and seating zones.

## Goals / Non-Goals

**Goals:**

- Replace the placeholder Prisma schema with the initial TicketBox relational model.
- Add an initial Prisma migration that can create the schema on a clean PostgreSQL database.
- Add deterministic seed data for demo users and the required sample concerts.
- Add constraints and indexes that protect core invariants before application code exists.
- Provide verification commands so developers and graders can migrate, seed, and inspect local data.
- Keep the schema aligned with `blueprint/`, `openspec/specs/`, and the refined concert data model.

**Non-Goals:**

- Implement HTTP APIs, services, domain use cases, guards, or UI behavior.
- Implement checkout transactions, payment simulator callbacks, QR generation, notification delivery, CSV parsing, or AI calls.
- Store real uploaded files. Asset rows may point at seeded local/demo storage keys, but file upload behavior belongs to later changes.
- Perfectly optimize every index for production scale before query patterns are implemented.
- Add separate microservices or multiple databases.

## Decisions

### Decision 1: Use Prisma migrations as the database contract

The implementation will use Prisma because the repository already includes `prisma`, `@prisma/client`, and `prisma/schema.prisma`.

Implementation shape:

```text
prisma/schema.prisma
prisma/migrations/<timestamp>_init_ticketbox_schema/migration.sql
prisma/seed.ts
```

Package scripts should expose the common lifecycle:

```text
db:migrate
db:generate
db:seed
db:reset
db:studio
```

Rationale:

- The existing platform foundation already prepared Prisma.
- Prisma gives the team typed client access for NestJS modules.
- Migrations are inspectable SQL artifacts for review.

Alternatives considered:

- Raw SQL only: more explicit, but loses generated TypeScript client integration.
- TypeORM: common in NestJS, but would add another ORM after Prisma is already installed.

### Decision 2: Model users and roles now, but leave auth behavior for the auth change

Create `users`, `roles`, and `user_roles`.

Important fields:

- `users.email` unique
- `users.password_hash`
- `users.display_name`
- `users.status`
- timestamps
- `roles.code` unique for `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, and `ADMIN`
- `user_roles(user_id, role_id)` unique

Seed demo users:

- `audience@ticketbox.test`
- `organizer@ticketbox.test`
- `staff@ticketbox.test`
- `admin@ticketbox.test`

Rationale:

- Concert ownership, check-in assignment, and seeded demo flows need stable user IDs.
- Auth-specific token/session design stays out of this change.

Alternatives considered:

- Store a single enum role on `users`. Rejected because admin/staff/organizer combinations are plausible and RBAC specs mention roles as distinct assignments.

### Decision 3: Keep concert catalog data relational and seed-first

Create core catalog tables:

- `concerts`
- `assets`
- `seating_zones`
- `ticket_types`
- `ticket_type_zones`

Important constraints:

- `concerts.slug` unique
- `concerts.created_by` references `users`
- `concerts.seating_map_asset_id` references `assets`
- `ticket_types(concert_id, code)` unique
- `ticket_types.total_quantity >= 0`
- `ticket_types.reserved_quantity >= 0`
- `ticket_types.sold_quantity >= 0`
- `ticket_types.reserved_quantity + sold_quantity <= total_quantity`
- `ticket_types.max_per_user > 0`
- `ticket_types.sale_starts_at < sale_ends_at`
- `seating_zones(concert_id, svg_element_id)` unique
- `ticket_type_zones(ticket_type_id, seating_zone_id)` unique

The implementation should enforce same-concert mapping for `ticket_type_zones`. If Prisma cannot express the exact composite constraint cleanly, use raw SQL in the migration or enforce it with a database trigger/check plus seed tests.

Rationale:

- Public catalog, admin management, and purchase all need the same persisted model.
- `ticket_types` remains the lock target for inventory reservation.
- Seating map mapping must support arbitrary organizer-created ticket names and SVG element IDs.

Alternatives considered:

- Keep a `ticket_types.zone` string. Rejected because the refined blueprint replaced it with explicit zones and mappings.
- Put inventory on zones. Rejected because a ticket type can map to multiple zones and ticketing specs lock ticket type inventory.

### Decision 4: Include downstream baseline tables now to avoid later incompatible rewrites

Create thin but useful tables for later modules:

- `orders` and `order_items`
- `payments` and `payment_events`
- `tickets`
- `checkin_staff_assignments` and `checkin_events`
- `notifications` and `notification_attempts`
- `guest_list_batches` and `guest_list_entries`
- `artist_bios`
- `idempotency_records`

These tables should include primary keys, foreign keys, statuses, timestamps, unique keys, and important idempotency constraints, but later changes own the application behavior.

Important examples:

- `payments.provider_transaction_id` unique when present
- `tickets.qr_token_hash` unique
- accepted check-in events are unique per ticket
- `idempotency_records(user_id, operation, idempotency_key)` unique
- guest list entries are unique per batch on normalized email or external reference when available

Rationale:

- Later teams can implement features against stable table names.
- Payment, QR, and check-in correctness need database uniqueness, not only service code.

Alternatives considered:

- Create only users/concerts/ticket types. Rejected because follow-on Wave 1 and Wave 2 changes would each need disruptive schema additions for shared concepts.

### Decision 5: Seed deterministic demo data with fixed identifiers or unique keys

The seed script should be idempotent: running it multiple times must update or upsert by stable unique keys without creating duplicate demo records.

Required concerts:

- Anh Trai Say Hi
- Anh Trai Vuot Ngan Chong Gai
- Em Xinh Say Hi
- Chi Dep Dap Gio Re Song

Each concert should include:

- published status
- artist/title, venue, city, starts/ends time
- poster asset metadata
- seating map asset metadata
- seating zones with SVG element IDs, labels, colors, display order, and active status
- ticket types such as SVIP, VIP, GA, CAT1, CAT2, Diamond, Gold, Standing, or Couple as appropriate per concert
- prices in VND minor units or a clearly documented integer representation
- total quantity, reserved quantity `0`, sold quantity `0`
- sale windows that are active for local demo use
- max-per-user values, including small SVIP limits
- ticket-to-zone mappings

Rationale:

- Demo scenarios and tests need predictable data.
- The submission-readiness spec explicitly requires these sample concerts.

Alternatives considered:

- Randomized seed data. Rejected because it makes tests, demos, and team collaboration harder.

### Decision 6: Verify through migration and seed tests, not API tests

This change should include tests or scripts that verify:

- Prisma schema validates and client generation succeeds.
- Migration can apply to PostgreSQL.
- Seed script can run twice without duplicates.
- Required demo users, roles, concerts, ticket types, seating zones, and mappings exist.
- Critical uniqueness/constraint checks are covered with focused database tests where feasible.

Rationale:

- There are no feature APIs yet.
- The risk in this change is schema correctness and seed repeatability.

Alternatives considered:

- Defer all verification to later API tests. Rejected because later teams would discover database contract issues too late.

## Risks / Trade-offs

- [Risk] The schema may include tables before their owning feature modules exist. -> Mitigation: keep baseline fields minimal, use stable names from the blueprint, and let later changes add fields only when needed.
- [Risk] Prisma may not express every cross-table invariant directly. -> Mitigation: use raw SQL migrations for constraints, partial unique indexes, or triggers where PostgreSQL is the better tool.
- [Risk] Seed sale windows may become stale over time. -> Mitigation: seed relative dates from the current run or use far-future demo windows with clear comments.
- [Risk] Password hashes in seed data could be mistaken for production defaults. -> Mitigation: use `.test` accounts, document demo-only credentials, and keep local secrets out of source.
- [Risk] Overly strict constraints could block later implementation details. -> Mitigation: enforce only invariants already required by accepted specs, especially inventory bounds, uniqueness, and foreign key ownership.

## Migration Plan

1. Update `prisma/schema.prisma` with enums, models, relations, indexes, and mapped table names.
2. Generate the initial migration with Prisma and inspect the SQL for required PostgreSQL constraints.
3. Add raw SQL adjustments for partial unique indexes or cross-table invariants that Prisma cannot model.
4. Add `prisma/seed.ts` with idempotent upserts for roles, users, assets, concerts, zones, ticket types, and mappings.
5. Add package scripts for migrate/generate/seed/reset.
6. Run local PostgreSQL through Docker Compose.
7. Apply migrations, generate the Prisma client, run the seed script twice, and run verification tests.
8. Document local database setup and demo account credentials.

Rollback for local development is `db:reset` against the local PostgreSQL database. No production data migration is required for this course project baseline.

## Open Questions

- Should seed prices be stored as VND minor units with no decimal places, or as Prisma `Decimal` values? Current recommendation: integer VND amounts to avoid rounding and keep checkout calculations simple.
- Should seeded demo sale windows be fixed future dates or computed relative to seed time? Current recommendation: relative windows so the demo remains usable after the course date changes.
