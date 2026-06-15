## Why

The public concert catalog (`implement-concert-catalog`) is complete and archived. Audience users can now browse seeded, published concerts. However, no organizer or admin can create, update, publish, cancel, or configure ticket types for concerts through protected APIs. This change delivers the write-side of Concert Management so the platform has a full concert lifecycle from creation to publication to cancellation, and organizers can configure rich ticket type structures that later drive purchase and inventory.

## What Changes

- Add protected organizer APIs for create, update, publish, and cancel concert.
- Add protected organizer APIs for create, update, and archive ticket types per concert (code, name, description, price, quantity, sale window, maxPerUser, status); archiving sets `status = ARCHIVED` and is only allowed when no sold or reserved tickets exist for that type.
- Enforce ownership: organizer may only manage concerts they created; admin may manage any concert through an admin-authorized route.
- Add server-side validation: negative price, invalid quantity, invalid sale window start/end order, duplicate ticket type code within the same concert.
- Add a minimal admin verification surface (`.http` request file) to demonstrate admin override behavior where a full admin web UI does not yet exist.
- Add authorization tests, validation tests, duplicate-code rejection tests, and publish/cancel state-transition tests.

Out of scope for this change:

- SVG seating map upload and sanitization — belongs to `implement-seating-map-assets`.
- Redis caching and availability invalidation on writes — belongs to `implement-concert-caching`.
- Checkout, inventory reservation, order lifecycle, QR ticket issuance.
- Full admin web application UI beyond a minimal verification surface.

## Capabilities

### New Capabilities

None. All scenarios are covered by the existing `concert-management` target spec.

### Modified Capabilities

- `concert-management`: Add implementation-level scenarios for organizer create/update/publish/cancel, ticket type write operations, ownership enforcement (organizer-scoped vs admin-override), and validation rules for price, quantity, sale window, and duplicate ticket type code.

## Impact

- Affected backend code: extend `packages/backend/src/concert-management` with admin/organizer write use cases, HTTP adapters, domain commands, and Prisma write adapter.
- Affected auth/guards: reuse JWT guard and RBAC role guards from `implement-auth-rbac` and `implement-admin-access-control`; add ownership guard for organizer routes.
- Affected validation: class-validator pipes for concert create/update and ticket type create/update DTOs.
- Affected tests: authorization unit tests, validation unit tests, duplicate-code rejection integration tests, publish/cancel state-transition tests.
- Affected docs/evidence: `.http` request file demonstrating organizer and admin flows; update README with admin API usage.
- No breaking API changes to existing public catalog endpoints.
