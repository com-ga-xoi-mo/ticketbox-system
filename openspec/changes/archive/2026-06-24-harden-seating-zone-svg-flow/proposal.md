## Why

The seating-zone and seating-map SVG upload flow has several data-integrity and security gaps that allow invalid zone configurations, orphaned data after SVG re-upload, and potential XSS through SVG injection. These must be fixed before the feature leaves internal testing — once concerts are published and tickets are sold, corrupted zone data would break the public catalog and ticket-purchase flow.

## What Changes

- **Endpoint semantics fix**: Change the bulk seating-zone endpoint from `PUT` to `PATCH` to match its actual merge/upsert behavior (zones not in the payload are preserved, not deleted). Update both organizer and admin controllers.
- **SVG element ID validation**: When uploading an SVG, parse and extract all element IDs into `Asset.metadata.svgElementIds`. When upserting zones via PATCH, require that (a) the concert already has a seating map asset and (b) every `svgElementId` in the request exists in the stored ID set. New domain errors for missing map and invalid element IDs.
- **Zone reset on SVG re-upload**: When a new SVG replaces an existing one, delete all `SeatingZone` rows for that concert within the same transaction. `TicketTypeZone` rows are cleaned up automatically via `onDelete: Cascade`. `TicketType` rows are preserved. Document that organizers must re-create zones and re-map ticket types after replacing an SVG.
- **Allowlist SVG sanitizer**: Replace the regex denylist `SvgSafetyValidator` with an allowlist-based sanitizer that strips everything except safe SVG tags and attributes, while preserving `id` attributes needed for zone mapping. Store the sanitized SVG instead of the raw upload.
- **Draft-only guard**: Restrict SVG upload and zone PATCH operations to concerts in `DRAFT` status. After publish/cancel/end, these setup endpoints return an explicit error.

## Capabilities

### New Capabilities
- `seating-zone-svg-hardening`: Backend hardening of the seating zone ↔ SVG flow — element ID validation, zone reset on re-upload, allowlist SVG sanitizer, draft-only guard, and PATCH endpoint semantics fix.

### Modified Capabilities
- `concert-management`: Add requirements for draft-only guard on seating map upload and zone upsert; require SVG element ID validation; specify zone reset behavior on SVG re-upload; change zone upsert endpoint method from PUT to PATCH.

## Impact

- **Backend code** (`packages/backend/src/concert-management`): Use cases, repositories, controllers, DTOs, error mapper, module wiring, SVG safety validator — all within the existing concert-management module.
- **Prisma schema**: No migration needed — `Asset.metadata` (Json?) already exists for storing extracted SVG element IDs.
- **API contract**: HTTP method change from `PUT` to `PATCH` on the seating-zones endpoint (both organizer and admin routes). This is a **BREAKING** change for any existing API consumers.
- **Behavioral change**: Re-uploading SVG now deletes all zones and their ticket-type mappings. This is a **BREAKING** change for workflows that rely on zones surviving a map replacement.
- **No frontend changes** in this change — UI updates will be handled in a separate change.
