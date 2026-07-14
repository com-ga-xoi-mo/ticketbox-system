## Why

TicketBox already imports sponsor VIP CSV files and exposes protected Admin and CHECKIN_STAFF endpoints, but neither the Admin web portal nor the check-in mobile app can complete those workflows. Adding shared, safe wire contracts and focused user interfaces closes the operational and demo gap without changing the scheduled inbox integration or import semantics.

## What Changes

- Add framework-independent `@ticketbox/api-types` schemas for Admin guest-list upload, canonical request outcomes, public batch summaries, reports, row evidence, and structured non-reportable-batch errors.
- Shape Admin guest-list HTTP responses through explicit public mappers so the UI receives counters and lifecycle timestamps without storage paths, processing leases, or queue internals.
- Add a concert-scoped, ADMIN-only web route at `/admin/concerts/:id/guest-list` for CSV validation/upload, batch polling, terminal summaries, row-level reports, JSON report download, and a source-controlled CSV template.
- Add an online-only VIP lookup tab to the check-in mobile app using the selected assignment and the existing shared VIP lookup contract, while keeping QR scanning, ticket cache, and offline scan sync unchanged.
- Add contract, backend, web, mobile, and database-backed HTTP evidence for upload through processing/reporting and assigned-staff VIP lookup, plus a manual demo checklist.
- Keep scheduled discovery under `GUEST_LIST_DISCOVERY_CRON` independently operable and do not expose the manual discovery endpoint in either UI.

## Capabilities

### New Capabilities

- `web-guest-list-management`: Concert-scoped Admin UI for CSV upload, canonical batch monitoring, report inspection, template download, and role-gated navigation.

### Modified Capabilities

- `guest-list-import`: Require runtime-validated Admin management contracts and safe public batch/report representations while preserving the existing worker, idempotency, validation, and VIP lookup semantics.
- `shared-api-contracts`: Extend the canonical public contract package with Admin guest-list management request, response, report, and structured error schemas.
- `checkin-mobile-app`: Add an online-only, assignment-bound VIP lookup surface separate from QR scanning, ticket cache, and offline synchronization.
- `submission-readiness`: Add repeatable automated and manual evidence for the Admin upload-to-report flow and the mobile VIP lookup flow.

## Impact

- **Shared contracts:** `packages/api-types` gains guest-list management schemas, inferred types, exports, and compatibility tests and must continue to be built before consumers.
- **Backend API:** `packages/backend/src/guest-list-import/adapters/http/` gains shared validation and public response mapping; the existing database schema, worker, queue, scheduler, storage, and import application logic remain unchanged unless implementation reveals a contract-only read-model gap.
- **Admin web:** `apps/web` gains a new concert-scoped feature, protected route, concert-management entry point, query polling, report presentation, and static CSV template; ORGANIZER access remains out of scope.
- **Check-in mobile:** `apps/checkin-mobile` gains a VIP client boundary, tab, online form, and result/error states; offline VIP lookup and VIP admission recording remain out of scope.
- **Evidence and docs:** focused unit/integration/E2E coverage, README guidance, and submission-validation steps are updated without using the ignored legacy CSV under `data/guest-list-storage`.
