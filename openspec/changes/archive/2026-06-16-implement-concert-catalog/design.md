## Context

The accepted TicketBox blueprint defines a NestJS modular monolith with explicit bounded contexts and clean/hexagonal module boundaries. Member 2 owns Concert, Admin, Catalog work; this change is the first public catalog slice from `docs/team-change-plan.md`.

Current state:

- PostgreSQL/Prisma schema already contains concerts, assets, seating zones, ticket types, and ticket-to-zone mappings.
- Seed data is expected to contain Vietnamese sample concerts required by `blueprint/specs/submission-readiness.md`.
- Identity and admin authorization work is separate; public catalog endpoints do not require authentication.
- Redis cache-aside and short-TTL availability caching are required by the blueprint, but are assigned to `implement-concert-caching`.

## Goals / Non-Goals

**Goals:**

- Implement public read APIs for upcoming published concert list and concert detail.
- Return enough detail data for a customer UI to render poster metadata, seating map metadata, seating zones, ticket types, sale windows, ticket-to-zone mappings, and availability.
- Calculate availability as a read-only snapshot from PostgreSQL fields:

```text
availableQuantity = max(totalQuantity - reservedQuantity - soldQuantity, 0)
```

- Create the Concert Management module following the existing backend layering:

```text
domain -> application/use-cases -> adapters/http -> infrastructure/database
```

- Provide a minimal read-only list/detail demo surface if no customer web app exists, scoped to verifying backend catalog data.
- Add focused tests and demo evidence for seeded catalog browsing.

**Non-Goals:**

- Organizer/admin concert writes, ticket type configuration writes, publish/cancel workflows, and admin UI.
- SVG upload, sanitization, object storage, or seating map authoring.
- Redis caching, cache invalidation, rate limiting, or live availability pushes.
- Checkout, inventory reservation, order lifecycle, payment, QR tickets, or no-oversell enforcement.
- Prisma schema changes unless implementation discovers a missing field that blocks the accepted blueprint contract.

## Decisions

### Decision 1: Add a dedicated Concert Management backend module

Create `packages/backend/src/concert-management` and register it with the API app module. The module will expose public catalog use cases and adapters while keeping Prisma-specific queries in infrastructure.

Rationale:

- Matches `blueprint/design.md` bounded-context guidance.
- Keeps catalog read behavior separate from identity and future admin write behavior.
- Gives later changes (`implement-concert-admin-management`, `implement-seating-map-assets`, `implement-concert-caching`) a clear module to extend.

Alternative considered:

- Put catalog controllers directly in the API app or platform module. This is faster but violates the blueprint dependency rule and makes later admin/caching work harder to isolate.

### Decision 2: Use public read endpoints with stable, UI-oriented response shapes

Proposed endpoints:

```text
GET /concerts
GET /concerts/:slug
GET /concerts/:slug/availability
```

`GET /concerts` returns only upcoming published concerts, ordered by `startsAt` ascending. Summary fields include `id`, `slug`, `title`, `artistName`, `venueName`, `city`, `startsAt`, `endsAt`, poster metadata, and aggregate availability summary.

`GET /concerts/:slug` returns the full public detail for a published upcoming concert:

- concert metadata
- poster asset metadata
- seating map asset metadata
- seating zones with `id`, `svgElementId`, `label`, `color`, `displayOrder`, `status`
- ticket types with `id`, `code`, `name`, `description`, `priceVnd`, optional `totalQuantity`, `availableQuantity`, `maxPerUser`, `saleStartsAt`, `saleEndsAt`, `status`, and no public exposure of internal `reservedQuantity` or `soldQuantity` counters
- ticket-to-zone mappings as either `zoneIds` on ticket types or an explicit mapping array

`GET /concerts/:slug/availability` returns a compact snapshot keyed by ticket type and optionally zone.

Rationale:

- The blueprint requires the frontend to have enough data to render zone selection and ticket display.
- A separate availability endpoint gives `implement-concert-caching` a natural boundary for short-TTL cache integration later.

Alternative considered:

- Return only normalized raw database rows. This would push catalog assembly into the frontend and make tests less aligned with the accepted public catalog requirement.

### Decision 3: Filter strictly to public, upcoming concerts

Public endpoints include only concerts where:

```text
status = PUBLISHED
startsAt >= now
```

Detail lookups by slug return not found for draft, cancelled, ended, or past concerts.

Rationale:

- Matches `concert-management` public catalog wording: upcoming published concerts.
- Prevents accidental exposure of organizer drafts before admin management exists.

Alternative considered:

- Show ended concerts as archive entries. This can be added later but is not part of the current target spec.

### Decision 4: Keep availability read-only and database-backed for this change

Availability is calculated from each ticket type row using `totalQuantity`, `reservedQuantity`, and `soldQuantity`. The value is clamped at zero defensively, but no reservation or correction logic runs here.

Rationale:

- PostgreSQL is the source of truth in the blueprint.
- Final correctness belongs to Member 3 reservation transactions, not public display.
- `reservedQuantity` and `soldQuantity` are internal inventory counters, so public responses expose only the derived `availableQuantity` and any intentionally public capacity fields.
- Redis snapshot caching is intentionally left to `implement-concert-caching`.

Alternative considered:

- Add Redis availability snapshots now. This would mix two planned changes and create invalidation responsibilities before reservation/payment changes exist.

### Decision 5: Use a minimal read-only demo surface if no frontend app exists

If there is no customer web app scaffold, the implementation should add the smallest maintainable demo surface that can show list/detail data from the API. It is for backend verification and demo evidence only; it should not become a marketing page, a complete customer web app, or a checkout UI.

Rationale:

- `docs/team-change-plan.md` includes customer UI list/detail in the Member 2 catalog scope.
- `blueprint/specs/submission-readiness.md` requires demo evidence reviewers can see.
- Larger customer web flows will be implemented by later ticketing, order, and payment changes.

Alternative considered:

- Backend-only implementation. This would satisfy part of the catalog contract but leave the Member 2 deliverable without a visible way to verify list/detail data.

## Risks / Trade-offs

- [Risk] Public availability can be stale or briefly inconsistent with checkout reality. -> Mitigation: label it as a snapshot, compute from source-of-truth fields for now, and leave final enforcement to reservation transactions.
- [Risk] The minimal demo UI may expand into full customer, checkout, or admin scope. -> Mitigation: keep it to read-only list/detail browsing and ticket/zone display only.
- [Risk] Response shape may conflict with future caching. -> Mitigation: keep the availability endpoint separate and avoid embedding cache-specific metadata in the core domain models.
- [Risk] Future seating map upload may change asset metadata. -> Mitigation: treat seating map content/storage as an asset reference in this change and rely on existing seed data.
