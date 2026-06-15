## Why

Member 2 needs the first Concert Management implementation slice so audience users can browse seeded, published concerts before checkout, admin management, seating upload, and caching work begin. This change turns the accepted blueprint and `concert-management` target spec into a reviewable public catalog deliverable that can be tested and demonstrated independently.

## What Changes

- Add a Concert Management backend module for public catalog reads using the existing NestJS modular monolith and clean/hexagonal dependency rule from `blueprint/design.md`.
- Add public APIs for upcoming published concert list, concert detail, and read-only availability snapshots.
- Return catalog data required by `blueprint/specs/concert.md`: poster metadata, seating map metadata, seating zones with SVG element IDs, ticket types, prices, sale windows, ticket-to-zone mappings, and availability values.
- Calculate availability from PostgreSQL source-of-truth fields already present on `TicketType`: `totalQuantity - reservedQuantity - soldQuantity`.
- Add a read-only catalog demo surface if no customer web app exists yet, keeping it minimal and scoped to backend verification rather than a complete frontend application.
- Add focused tests for list/detail filtering, detail shape, availability calculation, zone-to-ticket mapping, and seeded demo data behavior.
- Document demo evidence for the public catalog flow using the sample concert seed data.

Out of scope for this change:

- Organizer/admin create, update, publish, cancel, ticket type write APIs, and admin UI; these belong to `implement-concert-admin-management`.
- SVG upload, sanitization, object storage, and seating map asset ingestion; these belong to `implement-seating-map-assets`.
- Redis cache-aside, short-TTL availability cache, and invalidation; these belong to `implement-concert-caching`.
- Checkout, inventory reservation transactions, order lifecycle, payment, and QR ticket issuance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `concert-management`: Refine the public concert catalog requirement with implementation-level scenarios for published/upcoming filtering, read-only availability calculation, and ticket-to-zone response mapping.

## Impact

- Affected backend code: new `packages/backend/src/concert-management` bounded-context module, public HTTP adapters, application use cases, domain read models, and Prisma query adapter.
- Affected app composition: register the Concert Management module in the API application module.
- Affected frontend/demo code: add or extend a minimal read-only catalog demo surface only if a customer web app/demo surface is absent; full customer web flows remain future work.
- Affected tests: unit tests for use cases/mappers and API or integration tests for public catalog behavior against seeded Prisma data.
- Affected docs/evidence: update demo or README evidence enough to show public catalog list/detail working with seed concerts.
- No breaking API or database changes are expected; the current Prisma schema already contains concerts, assets, seating zones, ticket types, and ticket-to-zone mappings.
