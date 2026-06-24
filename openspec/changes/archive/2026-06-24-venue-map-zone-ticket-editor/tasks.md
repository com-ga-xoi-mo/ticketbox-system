## 1. Dependency And Structure

- [x] 1.1 Confirm `separate-admin-organizer-features` has been applied so `features/admin`, `features/organizer`, `features/concerts-shared`, and role-prefixed routes exist.
- [x] 1.2 Do not edit artifacts under `openspec/changes/separate-admin-organizer-features`; implement this change through this change's code edits and delta specs only.
- [x] 1.3 Identify the Stitch "Ticket Mapping" screen in "TicketBox Admin Portal Design" before building the editor UI and record any unavailable design details in implementation notes.

## 2. Backend Read Use-Cases

- [x] 2.1 Add read-only application use-cases for seating-map metadata, seating zones, and ticket types with mapped zones.
- [x] 2.2 Reuse existing authorization behavior so admin reads allow any concert and organizer reads require ownership.
- [x] 2.3 Read seating map asset metadata and `svgElementIds` without changing upload or storage behavior.
- [x] 2.4 Read seating zones through `SeatingZoneRepositoryPort.findByConcertId`.
- [x] 2.5 Read ticket types through `ConcertWriteRepositoryPort.findTicketTypesByConcertId` and attach each type's `mappedZones` through `TicketTypeZoneRepositoryPort.findByTicketTypeId`.
- [x] 2.6 Return safe empty seating-map metadata when an authorized concert has no seating map asset.

## 3. Backend Routes And Tests

- [x] 3.1 Add admin GET routes for `/admin/concerts/:id/seating-map`, `/admin/concerts/:id/seating-zones`, and `/admin/concerts/:id/ticket-types`.
- [x] 3.2 Add organizer GET routes for `/organizer/concerts/:id/seating-map`, `/organizer/concerts/:id/seating-zones`, and `/organizer/concerts/:id/ticket-types`.
- [x] 3.3 Map responses to the specified authoring shapes, including `mappedZones` on each ticket type.
- [x] 3.4 Add use-case tests for successful admin reads, successful organizer-owned reads, organizer forbidden reads, and concert-not-found reads.
- [x] 3.5 Add controller tests for the six GET routes and their authorization/error mapping.
- [x] 3.6 Run targeted backend tests for the new use-cases/controllers, then run the project backend test command used by this repo.

## 4. Frontend API And State

- [x] 4.1 Add role-specific Venue Maps API modules and hooks under `apps/web/src/features/admin` and `apps/web/src/features/organizer` with fixed `/admin/concerts` and `/organizer/concerts` base paths.
- [x] 4.2 Add typed frontend models for seating-map metadata, seating zones, ticket types, mapped zones, and editor state in the shared concert area.
- [x] 4.3 Add query keys for role-specific venue-map list/editor data, preserving organizer session isolation where user-scoped data is cached.
- [x] 4.4 Implement upload, seating-zone save, ticket-type create/update/archive, and zone-mapping mutations through role-specific hooks.
- [x] 4.5 Ensure shared editor components receive data, handlers, pending state, and read-only state through props and never import admin or organizer hooks.

## 5. Frontend Shared Editor UI

- [x] 5.1 Build shared Venue Maps list components using existing `shared/ui` primitives and Midnight Venue styling. Each concert row SHALL show event info (title, artist, venue/city, schedule), a status badge, the ticket-type count from `ticketTypesCount`, and seating-map status from `seatingMapConfigured` + `seatingZonesCount`, sourced from the existing role concert list endpoint (no new backend field; metric is ticket-type count, not summed quantity). Rows SHALL be selectable to open the editor.
- [x] 5.2 Build shared editor layout based on the Stitch "Ticket Mapping" screen, adapted to glass panels, dense controls, VND labels, and technical monospace labels.
- [x] 5.3 Implement SVG asset loading from `GET /assets/:id` and inline sanitized SVG rendering for path-level hover/click interaction.
- [x] 5.4 Implement two-way highlight between SVG elements and zone list rows.
- [x] 5.5 Implement seating-zone creation/editing UI with `svgElementId`, `label`, optional `color`, `displayOrder`, and optional `status`.
- [x] 5.6 Implement ticket type create/edit/archive UI with `code`, `name`, `description`, `priceVnd`, `totalQuantity`, `saleStartsAt`, `saleEndsAt`, and `maxPerUser`.
- [x] 5.7 Implement N:N zone mapping UI so one ticket type can map to multiple zones and one zone can be mapped by multiple ticket types.
- [x] 5.8 Add validation, warning, and empty states for missing SVG, missing zones, missing ticket types, unmapped zones, ticket types without zones, and zones referencing missing SVG element ids.
- [x] 5.9 Show the exact re-upload warning: `Upload map mới sẽ vô hiệu hoá các zone/mapping hiện có`.
- [x] 5.10 Disable all write controls for non-DRAFT concerts and show a read-only explanation banner.

## 6. Role Pages, Routes, And Navigation

- [x] 6.1 Add admin Venue Maps list and editor pages at `/admin/venue-maps` and `/admin/venue-maps/:id`.
- [x] 6.2 Add organizer Venue Maps list and editor pages at `/organizer/venue-maps` and `/organizer/venue-maps/:id`.
- [x] 6.3 Wire admin routes through ADMIN-only `ProtectedRoute` and organizer routes through ORGANIZER-only `ProtectedRoute`.
- [x] 6.4 Update `sidebar-config.ts` so ADMIN and ORGANIZER both see Venue Maps with role-prefixed paths.
- [x] 6.5 Add navigation from concert context to the matching role-specific Venue Maps editor without embedding the full editor inside the metadata edit route.
- [x] 6.6 Update route-access, sidebar, and query/api tests to cover the new Venue Maps paths and endpoints.

## 7. Verification

- [x] 7.1 Run backend tests covering the three GET read use-cases/endpoints for admin and organizer, including forbidden and not-found cases.
- [x] 7.2 Run `npm --workspace @ticketbox/web run verify` and fix typecheck or test failures.
- [x] 7.3 Run a DRAFT smoke test: upload SVG, create a zone from a path, create a VND ticket type, map zones, reload, and confirm all authoring state is restored.
- [x] 7.4 Run a PUBLISHED smoke test and confirm the editor displays existing state in read-only mode with the explanatory banner.
- [x] 7.5 Search `apps/web/src` to confirm no duplicate shared UI primitives were created for buttons, dialogs, tabs, tables, inputs, textareas, badges, or pagination.
