## Why

The current concert data model stores `ticket_types.zone` as a free-form string, which is not expressive enough for organizer-uploaded SVG seating maps. Each concert can define its own ticket type names and SVG element IDs, so the system needs an explicit mapping between uploaded SVG zones and ticket types before catalog/admin implementation begins.

## What Changes

- Add explicit seating-zone modeling for uploaded SVG seating maps.
- Add a many-to-many mapping between ticket types and seating zones so one ticket type can cover multiple SVG areas and multiple ticket types can share one area when needed.
- Keep `concerts.seating_map_asset_id` as the pointer to the uploaded SVG asset.
- Deprecate `ticket_types.zone` as the source of truth for SVG mapping in favor of `seating_zones` and `ticket_type_zones`.
- Clarify that organizers can create arbitrary ticket type codes and names per concert; SVIP, VIP, GA, CAT1, and CAT2 are seed examples, not hard-coded system values.
- Clarify status enums, database constraints, indexes, and catalog detail response shape for interactive seating maps.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `concert-management`: refine public concert detail, organizer ticket configuration, and seating map behavior to include explicit SVG seating zones and ticket-to-zone mappings.

## Impact

- Database design: adds `seating_zones` and `ticket_type_zones`; deprecates `ticket_types.zone` as a string mapping field.
- Admin workflow: after uploading a seating-map SVG, organizers define seating zones from SVG element IDs and map ticket types to those zones.
- Public catalog API: concert detail responses include seating map asset information, seating zones, ticket types, availability, and ticket-to-zone mapping.
- Frontend: customer concert detail can render the uploaded SVG, color zones from database metadata, and show ticket information when a zone is selected.
- Team coordination: Member 1 must include the refined schema in migrations/seed data, Member 2 owns catalog/admin behavior, and Member 3 must continue using `ticket_types` as the inventory source of truth.
