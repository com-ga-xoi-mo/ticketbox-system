## 1. Shared Guest-List API Contracts

- [x] 1.1 Add strict Zod schemas and inferred types under `packages/api-types` for Admin upload requests, canonical `CREATED`/`IDEMPOTENT_DUPLICATE` outcomes, guest-list statuses, and safe public batch summaries.
- [x] 1.2 Add shared report summary, immutable row-evidence, and `BATCH_NOT_COMPLETED` error schemas with the existing CSV action/disposition values and timestamp serialization rules.
- [x] 1.3 Export all guest-list management schemas and types from the `@ticketbox/api-types` root without adding framework, Prisma, backend, web, or mobile dependencies.
- [x] 1.4 Add contract tests for valid variants, strict unknown-field rejection, Base64/content-type/name bounds, nullable report fields, non-reportable statuses, and rejection of internal storage/lease keys.
- [x] 1.5 Build `@ticketbox/api-types` and run API-boundary verification before modifying its backend, web, and mobile consumers.

## 2. Safe Admin Guest-List HTTP Boundary

- [x] 2.1 Extend the guest-list batch application/read model and Prisma mapping with the already-persisted counters plus started/completed timestamps needed by the public response, without changing the Prisma schema or worker mutation semantics.
- [x] 2.2 Replace the local Admin upload DTO parsing path with a shared-schema HTTP pipe or equivalent boundary validation while preserving the existing JSON Base64 endpoint and Admin rate-limit policy.
- [x] 2.3 Implement centralized public batch, request-outcome, report, and structured-error mappers that validate against shared schemas and omit asset/uploader internals, storage keys, content storage metadata, lease fields, and queue state.
- [x] 2.4 Apply the public mappers to Admin upload, list, detail, and report endpoints while retaining HTTP 422 for non-reportable batches and existing ADMIN-only authorization.
- [x] 2.5 Add controller and mapper tests covering upload validation, created/idempotent outcomes, counters/timestamps, safe-field allowlisting, completed reports, structured non-completed errors, and unexpected-error preservation.
- [x] 2.6 Add or update backend integration/E2E assertions that audience and ORGANIZER roles cannot request, inspect, or retrieve Admin guest-list resources.

## 3. Admin Web Guest-List Management

- [x] 3.1 Create `apps/web/src/features/admin/guest-list/` API functions and TanStack Query hooks that parse upload, list/detail, report, and structured error payloads through the shared schemas.
- [x] 3.2 Implement and unit-test browser file helpers for `.csv` extension, non-empty and 5 MiB bounds, supported/empty MIME normalization, byte-preserving Base64 conversion, and safe JSON report download.
- [x] 3.3 Add `apps/web/public/templates/guest-list-template.csv` with the canonical `guest_name,email,phone,external_ref,action` header and valid illustrative rows.
- [x] 3.4 Build the concert-scoped Admin guest-list page shell with concert context, loading/empty/error states, upload form, template action, and CREATED versus IDEMPOTENT_DUPLICATE feedback using existing UI primitives and Vietnamese copy.
- [x] 3.5 Build the newest-first batch list with status badges, lifecycle timestamps, processing attempt, all summary counters, and failed-batch code/message presentation.
- [x] 3.6 Configure approximately two-second query polling only while a visible batch is PENDING or PROCESSING, stop it for terminal-only history/inactive pages, and invalidate the canonical list after upload.
- [x] 3.7 Build the report detail/dialog with validated summary and row evidence, terminal-status gating, JSON download, and no report request/action for pending, processing, or failed batches.
- [x] 3.8 Register `/admin/concerts/:id/guest-list` behind an ADMIN `ProtectedRoute` and add a concert-management entry action without adding a global sidebar item, ORGANIZER route, or manual discovery control.
- [x] 3.9 Add web tests for role gating, navigation, file validation/MIME fallback, Base64 upload, duplicate feedback, polling start/stop, failed-batch behavior, report rendering/download, and absence of a discover action.
- [x] 3.10 Run the web typecheck/test verification and resolve only regressions caused by the guest-list feature.

## 4. Check-In Mobile Online VIP Lookup

- [x] 4.1 Extend the mobile API types and `CheckinMobileApiClient` with `lookupVipGuest`, shared request/response validation, timeout handling, and explicit authorization/request/service/transport/invalid-response outcomes.
- [x] 4.2 Add API client tests proving correct bearer authentication, exact request serialization, shared response parsing, found/not-found variants, 400/403/5xx mapping, timeout, transport failure, and invalid response handling.
- [x] 4.3 Implement a focused VIP lookup state/controller that derives assignment ID, concert ID, and available gate from the current selected assignment and accepts only lookup type plus value from the form.
- [x] 4.4 Build `VipLookupScreen` with email/phone/external-reference selection, validation, loading, found, not-found, authorization, validation, service, and retryable network states using the existing React Native Paper theme.
- [x] 4.5 Add a third `VIP` bottom tab and integrate the screen into the authenticated selected-assignment flow without changing scan submission, ticket cache initialization, offline scan queue, or sync controls.
- [x] 4.6 Connect the existing network monitor so offline state disables submission with an online-required explanation and never enqueues or caches a VIP request.
- [x] 4.7 Add state/component/navigation tests for selected-assignment derivation, all result states, offline disabling, tab behavior, and QR scan/sync regression invariants.
- [x] 4.8 Run the check-in mobile verification and resolve only regressions caused by VIP lookup integration.

## 5. End-to-End Evidence and Documentation

- [x] 5.1 Add a database/Redis-backed HTTP flow that authenticates an ADMIN, uploads a valid CSV, processes the canonical job/use case to a terminal batch, retrieves a reconciled report, and lets exactly assigned CHECKIN_STAFF find the imported active VIP.
- [x] 5.2 Extend E2E coverage for same-file idempotent re-upload, unauthorized audience/ORGANIZER access, invalid-header atomic failure, completed-with-errors row evidence, cancelled/unknown VIP not-found, and wrong-assignment rejection.
- [x] 5.3 Keep scheduled inbox discovery evidence separate by testing/documenting `<inbox>/<concertId>/*.csv` worker discovery without requiring or adding a manual UI discovery action.
- [x] 5.4 Update README guest-list instructions with the Admin route, CSV template, upload/batch/report workflow, automatic scheduled worker behavior, mobile online-only lookup, and explicit non-goals.
- [x] 5.5 Correct stale guest-list evidence paths in `docs/submission-validation.md` and add an honest manual checklist for upload, processing, row errors, idempotent re-upload, scheduled inbox discovery, and assigned-staff mobile lookup.

## 6. Final Verification

- [x] 6.1 Run `npm run build:api-types` and `npm run verify:api-boundaries` with the new public contracts and consumers.
- [x] 6.2 Run the focused guest-list contract/backend/web/mobile tests plus `npm run verify:web` and `npm run verify:checkin-mobile`.
- [x] 6.3 Start required local dependencies and run `npm test` and `npm run test:e2e`, recording exact pass/fail evidence and not claiming blocked infrastructure steps as passed.
- [x] 6.4 Run `npm run lint`, `npm run format:check`, `git diff --check`, and strict OpenSpec validation; resolve change-caused failures before marking implementation complete.

## 7. Admin Report UI Remediation

- [x] 7.1 Add a safe `reportAvailable` flag to the shared public batch contract and backend mapper so terminal legacy/test batches without a report do not expose a broken action.
- [x] 7.2 Render report inspection in the existing accessible dialog primitive so opening a report is immediately visible regardless of history length and supports explicit close behavior.
- [x] 7.3 Give the batch history deterministic column widths, wrapped checksum/failure content, compact counters, and horizontal overflow so text never overlaps adjacent columns.
- [x] 7.4 Add regression tests for report availability, modal open/close, unavailable-report action suppression, and table layout; then run focused contract/backend/web verification, lint/format checks, and strict OpenSpec validation.
