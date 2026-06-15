## Context

The accepted TicketBox blueprint currently models concert seating with `concerts.seating_map_asset_id` and a free-form `ticket_types.zone` string. That is enough for a fixed demo with SVIP/VIP/GA zones, but it does not describe how organizer-uploaded SVG element IDs are mapped to arbitrary ticket types.

In the real workflow, each concert can define its own ticket type names, prices, and zone labels. The uploaded SVG may use element IDs such as `gold-area`, `red-zone`, or `standing-section`, which do not necessarily match ticket type codes such as `SVIP` or `VIP`.

This change refines the data architecture before implementation so Member 1 can create migrations and Member 2 can build catalog/admin behavior against a stable model.

## Goals / Non-Goals

**Goals:**

- Preserve `concerts.seating_map_asset_id` as the pointer to the uploaded SVG asset.
- Add explicit `seating_zones` records for SVG elements that represent selectable seating areas.
- Add `ticket_type_zones` so ticket types can map to one or more seating zones.
- Allow organizer-created ticket type names and codes per concert without hard-coding SVIP/VIP/GA.
- Define status enums, constraints, indexes, and catalog response shape needed for implementation.
- Keep `ticket_types` as the inventory source of truth for `total_quantity`, `reserved_quantity`, `sold_quantity`, and `max_per_user`.

**Non-Goals:**

- This change does not add per-seat selection. TicketBox still sells by zone/ticket type, not by individual seat.
- This change does not implement migrations, API controllers, or UI.
- This change does not require SVG element IDs to match ticket type codes.
- This change does not replace the object storage abstraction for uploaded files.

## Decisions

### Decision 1: Keep `concerts.seating_map_asset_id` for the uploaded SVG file

`concerts.seating_map_asset_id` remains the link from a concert to its seating map asset.

```text
concerts.seating_map_asset_id -> assets.id -> storage_key -> seating-map.svg
```

Rationale:

- The field already expresses which SVG file belongs to the concert.
- The SVG file itself is a file asset, not a zone mapping.
- Keeping this field avoids mixing file ownership with semantic zone mapping.

Alternative considered:

- Store SVG content or SVG metadata directly on `concerts`. This was rejected because large files should remain in object storage and metadata belongs in `assets`.

### Decision 2: Add `seating_zones` for SVG element IDs

Add a `seating_zones` table:

```text
seating_zones(
  id pk,
  concert_id fk,
  svg_element_id,
  label,
  color,
  display_order,
  status,
  created_at,
  updated_at,
  unique(concert_id, svg_element_id)
)
```

Rationale:

- SVG element IDs are external designer-provided identifiers and should be captured explicitly.
- Admins can define the user-facing label and color for each selectable SVG area.
- Frontend can render the SVG, find elements by `svg_element_id`, and apply database-driven colors and interactions.

Alternative considered:

- Keep using `ticket_types.zone` as a string. This was rejected because it cannot reliably map arbitrary SVG element IDs to arbitrary organizer-created ticket types.

SVG handling rules:

- SVG parsing should run after upload so the admin UI can show available element IDs.
- The system should only persist selected SVG elements as `seating_zones`; it does not need to store every SVG element.
- SVG uploads MUST be sanitized or rejected when they contain unsafe content such as scripts, event handlers, `foreignObject`, external references, or unsupported file size/content type.
- Selectable SVG areas MUST have unique element IDs within the uploaded SVG.
- Zone color is optional. If `seating_zones.color` is empty, the frontend should use a default palette.

### Decision 3: Add `ticket_type_zones` for flexible ticket-to-zone mapping

Add a mapping table:

```text
ticket_type_zones(
  concert_id fk,
  ticket_type_id fk,
  seating_zone_id fk,
  primary key(ticket_type_id, seating_zone_id)
)
```

Rationale:

- One ticket type can cover multiple SVG zones, such as `CAT1` covering `cat1-left` and `cat1-right`.
- Multiple ticket types can share one zone, such as `VIP_EARLY` and `VIP_REGULAR` sharing `vip-zone`.
- The model does not assume ticket type names match SVG IDs.

Implementation rule:

- Application logic MUST ensure `ticket_types.concert_id` equals `seating_zones.concert_id` when creating mappings.
- The database model SHOULD make invalid cross-concert mappings difficult by storing `concert_id` on `ticket_type_zones` and using composite foreign keys or equivalent constraints when the chosen ORM/database migration tool supports them.

Alternative considered:

- Add `ticket_types.seating_zone_id`. This supports only one zone per ticket type and is less flexible for real seating maps.

### Decision 4: Deprecate `ticket_types.zone` as the source of truth

`ticket_types.zone` should not be used as the canonical mapping field after this change. Implementations may keep it temporarily for backward compatibility or display, but the authoritative mapping is:

```text
ticket_types <-> ticket_type_zones <-> seating_zones
```

Rationale:

- Free-form strings are easy to mistype.
- They cannot represent many-to-many mapping.
- They do not enforce concert-local consistency.

### Decision 5: Keep inventory on `ticket_types`

Inventory fields remain on `ticket_types`:

```text
total_quantity
reserved_quantity
sold_quantity
max_per_user
sale_starts_at
sale_ends_at
status
version
```

Rationale:

- Ticket purchase and oversell prevention already depend on locking `ticket_types`.
- Seating zones describe UI map areas, not inventory ownership.
- Keeping inventory on ticket types preserves the ticket purchase architecture.

Constraints:

```text
total_quantity >= 0
reserved_quantity >= 0
sold_quantity >= 0
sold_quantity + reserved_quantity <= total_quantity
price_amount >= 0
max_per_user > 0
sale_starts_at < sale_ends_at
unique(concert_id, code)
```

### Decision 6: Clarify status enums and indexes

Concert status:

```text
DRAFT
PUBLISHED
CANCELLED
COMPLETED
```

Ticket type status:

```text
DRAFT
ON_SALE
PAUSED
SOLD_OUT
CANCELLED
```

Seating zone status:

```text
ACTIVE
HIDDEN
DISABLED
```

Recommended indexes:

```text
concerts(slug) unique
concerts(status, starts_at)
concerts(created_by)
ticket_types(concert_id)
ticket_types(concert_id, code) unique
ticket_types(concert_id, status)
seating_zones(concert_id)
seating_zones(concert_id, svg_element_id) unique
ticket_type_zones(ticket_type_id)
ticket_type_zones(seating_zone_id)
ticket_type_zones(concert_id)
assets(owner_type, owner_id)
assets(kind)
assets(checksum)
```

### Decision 7: Define catalog detail response around SVG mapping

The public concert detail API should return enough data for the frontend to render an interactive SVG:

```json
{
  "seatingMapUrl": "/storage/concerts/show-1/seating.svg",
  "zones": [
    {
      "id": "zone-1",
      "svgElementId": "gold-area",
      "label": "Khu gần sân khấu",
      "color": "#FFD700"
    }
  ],
  "ticketTypes": [
    {
      "id": "ticket-type-1",
      "code": "SVIP",
      "name": "Super VIP",
      "priceAmount": 5000000,
      "availableQuantity": 120,
      "zoneIds": ["zone-1"]
    }
  ]
}
```

Frontend behavior:

```text
Load SVG -> find elements by svgElementId -> apply zone color -> map clicked zone to ticket types.
```

## Risks / Trade-offs

- [Risk] Adds two tables and one join path to the catalog model. -> Mitigation: the added complexity is local to concert catalog/admin and avoids ambiguous string mapping.
- [Risk] Uploaded SVG files may not contain usable element IDs. -> Mitigation: admin upload validation should warn when selectable elements have no IDs, and the mapping UI should only allow mapped elements with IDs.
- [Risk] Admins may map ticket types to seating zones from another concert. -> Mitigation: enforce same-concert validation in application logic and tests.
- [Risk] Blueprint and existing docs may still mention `ticket_types.zone`. -> Mitigation: after this change is accepted, sync OpenSpec specs and update `blueprint/design.md` plus submission docs.
- [Risk] Per-seat selection could be confused with zone selection. -> Mitigation: explicitly document that this model supports zone-based selling only.

## Migration Plan

This change is currently design/spec only. When implementation begins:

1. Add `seating_zones` migration.
2. Add `ticket_type_zones` migration.
3. Keep `ticket_types.zone` temporarily if existing seed data depends on it.
4. Backfill seed seating zones and mappings for SVIP, VIP, GA, CAT1, and CAT2.
5. Update admin ticket type configuration to map ticket types to seating zones.
6. Update public concert detail to return `zones` and `zoneIds`.
7. After code no longer reads `ticket_types.zone`, remove or ignore the deprecated column.

Rollback strategy:

- Keep the original `ticket_types.zone` string until the new mapping is fully used.
- If the new mapping fails during implementation, admin/catalog can temporarily fall back to non-interactive ticket type display.

## Open Questions

- None. Current decisions: parse SVG after upload, persist only organizer-selected SVG elements as seating zones, and allow frontend default colors when a zone color is not configured.
