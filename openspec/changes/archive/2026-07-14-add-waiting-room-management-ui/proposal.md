## Why

TicketBox already has the Virtual Waiting Room backend and audience checkout flow, but admins and organizers have no web surface for configuring or operating it. The existing management endpoints also stop at role checks and do not enforce organizer ownership, so exposing them in the web app requires a shared management UI and backend authorization hardening together.

## What Changes

- Add a shared `Phòng chờ ảo` section to the existing admin and organizer concert edit pages; do not add a route or tab.
- Load, validate, and save the full per-concert waiting-room configuration through the existing `GET` and `PUT /organizer/waiting-room/:concertId` endpoints, using the existing shared Zod contracts.
- Provide immediate `FORCE_ON`, `FORCE_OFF`, and `NONE` override actions through the existing `PATCH /organizer/waiting-room/:concertId/override` endpoint while preserving unrelated unsaved draft fields.
- Treat a valid concert with no config as an unsaved, disabled local default; do not create configuration until the operator explicitly saves, and do not enable quick overrides until a persisted enabled config exists.
- Distinguish persisted configuration from unsaved draft state, show deterministic mode badges without claiming to expose Redis runtime activity, and add field-level integer/cross-field validation plus a non-blocking low-concurrency warning.
- Preserve HTTP status in the web API client through a backward-compatible typed error so the feature can distinguish an expected 404 from other failures without duplicating bearer-token handling.
- Reuse the existing concert-management authorization use case so organizers can manage only owned concerts, admins can manage any concert, and invalid or unauthorized targets fail safely for waiting-room GET, PUT, and PATCH.
- Add focused backend and frontend tests, accessibility coverage, regression verification, and manual verification notes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-concert-management`: Add the shared admin/organizer waiting-room configuration section, its loading/draft/persisted states, validation, immediate override actions, accessible interaction, and cache isolation requirements.
- `virtual-waiting-room`: Refine per-concert configuration management so organizer ownership is enforced, admin override remains allowed, and invalid targets cannot fall through to persistence errors.

The existing `identity-access` ownership requirements already define the required organizer/admin policy, so this change conforms to that capability without changing it.

## Impact

- **Web app:** `apps/web/src/features/concerts-shared/`, both role-specific `ConcertEditPage.tsx` files, and `apps/web/src/shared/api/client.ts` plus focused tests.
- **Backend:** waiting-room controller/use-case inputs, safe error mapping, module wiring, and tests under `packages/backend/src/virtual-waiting-room/`; reuse `AuthorizeConcertManagementUseCase` from identity.
- **Contracts:** reuse the existing waiting-room request/response schemas from `@ticketbox/api-types`; no new HTTP endpoint or payload shape is required.
- **Persistence/runtime:** no Prisma migration, Redis change, queue change, admission-token change, SSE change, or checkout-flow change.
- **Compatibility:** existing audience behavior and existing admin/organizer concert editing remain intact; waiting rooms still default to disabled and no config is created merely by opening an edit page.
