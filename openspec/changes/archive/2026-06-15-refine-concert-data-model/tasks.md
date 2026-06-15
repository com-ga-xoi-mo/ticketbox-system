This archived change is documentation/spec/design only. It intentionally does
not implement database migrations, API handlers, UI screens, seed data, or
automated tests. Future implementation changes should use this change and the
updated blueprint as the foundation.

## 1. OpenSpec Change Documents

- [x] 1.1 Create `proposal.md` explaining why `ticket_types.zone` is not enough for concert-specific seating maps.
- [x] 1.2 Create `design.md` describing `seating_zones`, `ticket_type_zones`, SVG safety rules, constraints, indexes, and status values.
- [x] 1.3 Create a concert-management spec delta for seating map uploads, seating zones, and ticket-to-zone mappings.
- [x] 1.4 Create this `tasks.md` as a documentation-only handoff checklist.

## 2. Archive and Main Specs

- [x] 2.1 Archive `refine-concert-data-model`.
- [x] 2.2 Sync the accepted behavior into `openspec/specs/concert-management/spec.md`.
- [x] 2.3 Confirm the change is no longer active after archive.
- [x] 2.4 Run OpenSpec validation after the archive.

## 3. Blueprint Sync

- [x] 3.1 Update `blueprint/specs/concert.md` so the blueprint includes the refined concert/catalog behavior.
- [x] 3.2 Update `blueprint/design.md` with the refined database design.
- [x] 3.3 Document that `concerts.seating_map_asset_id` points to the uploaded SVG asset metadata.
- [x] 3.4 Document that `seating_zones.svg_element_id` maps database zones to selectable SVG element IDs.
- [x] 3.5 Document that `ticket_type_zones` maps arbitrary concert ticket types to one or more seating zones.

## 4. Project Docs Sync

- [x] 4.1 Update `docs/concert-data-model-change-proposal.md` for team review and implementation planning.
- [x] 4.2 Update `docs/easy-architecture-guide.md` so the current data model is easier to understand.
- [x] 4.3 Keep the docs focused on foundation design, not code implementation.

## 5. Future Implementation Handoff

- [x] 5.1 Leave migration implementation for a later implementation change.
- [x] 5.2 Leave admin upload/mapping UI implementation for a later implementation change.
- [x] 5.3 Leave public catalog API implementation for a later implementation change.
- [x] 5.4 Leave automated test implementation for a later implementation change.
