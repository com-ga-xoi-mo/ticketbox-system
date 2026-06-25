## Why

The web portal intentionally deferred ticket-type and seating-map authoring while concert management was split into admin and organizer feature paths. This change completes that authoring workflow so admins and organizers can configure a concert's SVG venue map, seating zones, ticket types, and N:N ticket-to-zone mappings from the role-prefixed portal.

## What Changes

- Add read-only backend endpoints for both admin and organizer concert scopes:
  - `GET .../seating-map` returns `{ assetId, svgElementIds }`
  - `GET .../seating-zones` returns saved seating zones
  - `GET .../ticket-types` returns ticket types with mapped zones
- Reuse existing backend write behavior for SVG upload, seating-zone upsert, ticket-type create/update/archive, and ticket-to-zone mapping; do not change schema, authorization model, lifecycle rules, or purchase behavior.
- Add a role-prefixed "Venue Maps" sidebar item for ADMIN and ORGANIZER, with list routes such as `/admin/venue-maps` and `/organizer/venue-maps` for selecting a concert.
- Add role-prefixed venue-map editor routes for a selected concert, using the folder structure introduced by `separate-admin-organizer-features`.
- Build a shared, role-neutral seating-map editor component surface under the concert shared frontend area while keeping admin and organizer API/hooks in role folders with fixed base paths.
- Use the Stitch "Ticket Mapping" design from "TicketBox Admin Portal Design" as the source layout and adapt it to this app's Midnight Venue design system, VND pricing, existing `shared/ui` primitives, shadcn/Radix patterns, and Tailwind.
- Enforce DRAFT-only editing in the frontend: non-DRAFT concerts render the editor read-only with an explanatory banner.
- Support SVG rendering from `GET /assets/:id`, hover/click zone selection, two-way highlighting between SVG and zone list, VND ticket type forms, N:N mapping, re-upload warning, empty states, and validation states.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `concert-management`: Add read-only admin/organizer endpoints that expose existing seating map, seating zones, ticket types, and zone mappings for authoring.
- `web-concert-management`: Add the role-prefixed Venue Maps list/editor workflow and replace the deferred seating-map authoring behavior with a functional editor.
- `web-app-shell`: Add role-prefixed Venue Maps sidebar/navigation routes for both ADMIN and ORGANIZER, overriding the prior no-global-Seating-Map constraint through this change's delta spec.

## Impact

- Backend impact is limited to concert-management read use-cases, repository reads, controller routes, DTO/response mapping, and tests for admin/organizer authorization, ownership, and not-found cases.
- Frontend impact is limited to `apps/web/src` role feature folders, shared concert editor components/helpers, router, sidebar configuration, route access tests, and web verification.
- No database/schema migration, no audience purchase flow, no backend write-rule changes, and no modification to `separate-admin-organizer-features` artifacts are included.
- Verification includes backend tests for the 3 GET endpoints/use-cases, `npm --workspace @ticketbox/web run verify`, and manual smoke checks for DRAFT editing and PUBLISHED read-only behavior.
