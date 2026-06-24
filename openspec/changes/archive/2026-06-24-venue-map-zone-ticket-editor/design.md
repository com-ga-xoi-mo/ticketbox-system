## Context

`separate-admin-organizer-features` splits the web portal into role-prefixed admin and organizer feature paths and intentionally keeps ticket-type and seating-map editor surfaces deferred. Backend write routes already exist for both roles under `/admin/concerts/:id` and `/organizer/concerts/:id`: seating-map SVG upload, seating-zone upsert, ticket-type create/update/archive, and N:N ticket-type-to-zone mapping. The missing backend piece is read-only authoring state so the web editor can load existing SVG metadata, zones, ticket types, and mappings on page load.

The requested UI is a role-prefixed "Venue Maps" workflow for admins and organizers. The editor must follow the Stitch "Ticket Mapping" design from "TicketBox Admin Portal Design" as the layout source, but adapt it to the current Midnight Venue application style and existing shared primitives. This proposal phase does not have a Stitch connector/tool available in the workspace, so implementation must use that design source when building the UI.

## Goals / Non-Goals

**Goals:**

- Add read-only backend use-cases and controller routes for current seating map, seating zones, and ticket types with mapped zones.
- Preserve existing backend write behavior, validation, authorization, DRAFT lifecycle restrictions, and database schema.
- Add ADMIN and ORGANIZER "Venue Maps" sidebar entries with role-prefixed list and editor routes.
- Build a shared, role-neutral venue-map editor component set while keeping admin and organizer API/hooks in role folders with fixed base paths.
- Render the sanitized SVG from `GET /assets/:id`, support interactive zone selection/highlighting, and show zone/ticket mapping states.
- Enforce frontend read-only mode for non-DRAFT concerts with a clear banner.
- Use VND (`priceVnd`) and the full ticket type field set required by the backend.

**Non-Goals:**

- Changing purchase/audience booking flows.
- Changing authorization semantics, concert lifecycle rules, backend write validations, schema, or DB migrations.
- Editing artifacts from `separate-admin-organizer-features`.
- Splitting the Vite app, shell layout, shared UI primitives, or auth layer.

## Decisions

1. Add a read use-case layer for authoring state.

   Create read-only use-cases such as `GetSeatingMapUseCase`, `ListSeatingZonesUseCase`, and `ListTicketTypesWithZoneMappingsUseCase`. They will authorize through the same ownership/admin override rules as the existing write use-cases, then read via existing repository methods where possible: `ConcertWriteRepositoryPort.findConcertById`, `SeatingZoneRepositoryPort.findByConcertId`, `ConcertWriteRepositoryPort.findTicketTypesByConcertId`, and `TicketTypeZoneRepositoryPort.findByTicketTypeId`.

   Rationale: this avoids adding write behavior or schema changes and keeps authorization centralized in application logic. The alternative was to let controllers compose repositories directly, but that would duplicate ownership checks and make tests weaker.

2. Keep write endpoints unchanged and add only GET routes.

   Admin routes:
   - `GET /admin/concerts/:id/seating-map`
   - `GET /admin/concerts/:id/seating-zones`
   - `GET /admin/concerts/:id/ticket-types`

   Organizer routes:
   - `GET /organizer/concerts/:id/seating-map`
   - `GET /organizer/concerts/:id/seating-zones`
   - `GET /organizer/concerts/:id/ticket-types`

   Rationale: the frontend can load editor state without changing established write endpoints. The ticket-types read response includes `mappedZones` per type so the client does not need to stitch mapping calls per ticket type.

3. Use role-specific frontend API/hooks with shared editor components.

   Add role feature APIs/hooks under `features/admin` and `features/organizer` using fixed base paths. Put reusable editor components and pure helpers in the shared concert area introduced by the previous change. Shared components must receive data, mutation handlers, and pending/error state through props; they must not import admin or organizer hooks.

   Rationale: this follows the dependency direction fixed in `separate-admin-organizer-features` and prevents shared UI from calling the wrong role endpoint.

4. Route Venue Maps as a separate workflow.

   Add list routes `/admin/venue-maps` and `/organizer/venue-maps` that show concerts available to that role and navigate to `/admin/venue-maps/:id` or `/organizer/venue-maps/:id`. The editor loads the concert detail plus seating-map authoring state. The existing concert detail/edit routes can link to the Venue Maps editor, but do not need to embed the full editor.

   Rationale: the editor is complex enough to deserve a dedicated screen and global sidebar entry. This also explicitly overrides the previous "no global Seating Map item" constraint through this change's delta spec.

5. Make read-only state a UI mode, not a hidden route.

   The editor is reachable for all visible concert statuses, but write controls are disabled unless `concert.status === 'DRAFT'`. For non-DRAFT concerts, show a banner explaining that venue map, zone, ticket type, and mapping edits are locked because the concert is no longer a draft.

   Rationale: users can inspect published configuration without accidental writes. The backend remains the final enforcement point for writes.

6. SVG interaction is driven by backend-extracted element IDs.

   The client fetches SVG text from `GET /assets/:id`, renders the sanitized SVG inline for interaction, and limits selectable elements to IDs returned by `GET .../seating-map`. Hover/click highlights selected SVG elements and the corresponding zone rows. Missing/invalid zone references are shown as validation warnings instead of crashing.

   Rationale: inline rendering is needed for path-level selection. The backend sanitizer remains required; frontend rendering must still avoid executing scripts or trusting arbitrary SVG behavior.

7. UI implementation follows existing design system and requested Stitch source.

   Use the Stitch "Ticket Mapping" layout as the source for information architecture, section order, labels, and interaction patterns. Implement it with Tailwind and existing `shared/ui` primitives (`Button`, `Dialog`, `Tabs`, `Table`, `Input`, `Textarea`, `Badge`, `Pagination`, `cn`) plus shadcn/Radix patterns where appropriate. Preserve the current Midnight Venue visual language: glass panels, dense operational controls, VND currency, and JetBrains Mono for technical labels.

## Risks / Trade-offs

- [Risk] Read endpoints may duplicate write authorization incorrectly -> Mitigation: route through application use-cases that reuse the same authorize-concert-management path and test admin, organizer-owned, organizer-forbidden, and not-found cases.
- [Risk] Ticket type mapping reads can become N+1 -> Mitigation: acceptable for first implementation using existing `findByTicketTypeId`; if needed, add a repository batch method without changing the response contract.
- [Risk] Inline SVG rendering can introduce XSS or event-handler execution -> Mitigation: rely on backend sanitized assets, strip/ignore scripts and event attributes client-side where practical, and select only backend-extracted element IDs.
- [Risk] Re-uploading SVG invalidates zone/mapping state -> Mitigation: show an explicit destructive warning before upload: "Upload map mới sẽ vô hiệu hoá các zone/mapping hiện có".
- [Risk] Role-specific editor pages can drift -> Mitigation: keep editor UI shared and inject role-specific API handlers from admin/organizer pages.

## Migration Plan

1. Implement backend read use-cases and response mapping for seating map, zones, and ticket types with mapped zones.
2. Add admin and organizer GET controller routes and tests.
3. Add frontend role-specific Venue Maps APIs/hooks and query keys.
4. Build shared editor components and pure helpers for SVG rendering, zone state, ticket type forms, and mapping state.
5. Add admin and organizer Venue Maps list/editor pages and role-prefixed routes.
6. Update sidebar config and route-access tests.
7. Run backend tests, `npm --workspace @ticketbox/web run verify`, and smoke-test DRAFT editing plus PUBLISHED read-only mode.

Rollback is a frontend/backend code revert of the new read routes and Venue Maps UI. No data migration rollback is required.

## Open Questions

- The Stitch design source is referenced by name but is not available as a local file or connector in this session; implementation needs access to the project before final UI build.
