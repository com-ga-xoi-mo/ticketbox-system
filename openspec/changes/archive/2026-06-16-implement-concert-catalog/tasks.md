## 1. Backend Module Structure

- [x] 1.1 Create `packages/backend/src/concert-management` with domain, application, adapters/http, and infrastructure/database folders following the existing identity/platform style.
- [x] 1.2 Define catalog read models or DTO-facing types for concert summary, concert detail, asset metadata, seating zones, ticket types, ticket-zone mappings, and availability snapshots.
- [x] 1.3 Add a `ConcertManagementModule` and export/import it through `packages/backend/src/index.ts` and `apps/api/src/app.module.ts`.

## 2. Catalog Application Use Cases

- [x] 2.1 Implement a use case for listing upcoming published concerts ordered by `startsAt` ascending.
- [x] 2.2 Implement a use case for loading a published upcoming concert detail by slug and returning not found for draft, cancelled, ended, or past concerts.
- [x] 2.3 Implement a use case for loading compact availability snapshots by concert slug.
- [x] 2.4 Implement availability calculation as `max(totalQuantity - reservedQuantity - soldQuantity, 0)` without creating orders, reservations, or cache records.
- [x] 2.5 Add mapping logic that keeps ticket-to-zone mappings scoped to the requested concert.

## 3. Prisma Query Adapter

- [x] 3.1 Implement a Prisma-backed catalog repository/query adapter that reads concerts with poster asset, seating map asset, seating zones, ticket types, and ticket type zones.
- [x] 3.2 Ensure list queries filter `status = PUBLISHED` and `startsAt >= now`.
- [x] 3.3 Ensure detail and availability queries return not found for non-public concerts.
- [x] 3.4 Avoid Prisma model leakage into application/domain types by mapping infrastructure records before returning them.

## 4. Public HTTP API

- [x] 4.1 Add a public catalog controller for `GET /concerts`.
- [x] 4.2 Add a public catalog controller action for `GET /concerts/:slug`.
- [x] 4.3 Add a public catalog controller action for `GET /concerts/:slug/availability`.
- [x] 4.4 Add response DTOs or serializers with stable public fields for poster metadata, seating map metadata, zones, ticket types, ticket-to-zone mappings, and availability; do not expose internal `reservedQuantity` or `soldQuantity` counters.
- [x] 4.5 Ensure controllers delegate to use cases and do not contain filtering, availability, or mapping logic.

## 5. Read-Only Catalog Demo Surface

- [x] 5.1 Check whether a customer web app exists; if it does not, add the smallest static or workspace demo surface needed to call the catalog APIs for backend verification.
- [x] 5.2 Implement a public concert list view showing seeded upcoming published concerts with artist, venue, schedule, poster metadata, and availability summary.
- [x] 5.3 Implement a concert detail view showing ticket types, prices, sale windows, seating zones, ticket-to-zone mappings, and availability.
- [x] 5.4 Keep the demo surface read-only and exclude full customer web flows, checkout, login, admin management, and seating map upload features.

## 6. Tests

- [x] 6.1 Add use-case unit tests for published/upcoming filtering and not-found behavior for draft, cancelled, ended, and past concerts.
- [x] 6.2 Add unit tests for availability calculation, including sold-out and defensive clamp-to-zero cases.
- [x] 6.3 Add tests for detail response mapping of seating zones, SVG element IDs, ticket types, and same-concert ticket-to-zone mappings.
- [x] 6.4 Add API or integration tests for `GET /concerts`, `GET /concerts/:slug`, and `GET /concerts/:slug/availability`.
- [x] 6.5 Add or update seed-data verification so the public catalog can demonstrate Anh Trai Say Hi, Anh Trai Vuot Ngan Chong Gai, Em Xinh Say Hi, and Chi Dep Dap Gio Re Song when they are published/upcoming.

## 7. Documentation and Demo Evidence

- [x] 7.1 Document the catalog endpoints and example responses in the README or project docs.
- [x] 7.2 Add demo evidence steps showing how to seed the database, start the API, open the catalog list/detail, and verify availability values.
- [x] 7.3 Note the boundary that Redis catalog caching and availability invalidation are deferred to `implement-concert-caching`.
- [x] 7.4 Run `npm run lint`, `npm run test`, and relevant database/API verification commands; record any remaining failures with reasons.
