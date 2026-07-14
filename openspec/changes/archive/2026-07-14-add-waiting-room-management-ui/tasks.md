## 1. Shared API error/status support

- [x] 1.1 Add a backward-compatible exported `ApiError extends Error` with `status` and safe message handling in `apps/web/src/shared/api/client.ts`, preserving the existing 401 token-clear callback and all request method signatures. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 1.2 Extend `apps/web/src/shared/api/client.spec.ts` for status preservation, safe non-JSON errors, existing 401 behavior, and compatibility of GET/PUT/PATCH failures. Verify: `npx vitest run apps/web/src/shared/api/client.spec.ts`.

## 2. Backend organizer ownership authorization

- [x] 2.1 Change `packages/backend/src/virtual-waiting-room/application/use-cases/get-waiting-room-config.use-case.ts`, `configure-waiting-room.use-case.ts`, and `set-waiting-room-override.use-case.ts` to accept actor context and explicit admin override intent, and invoke the existing `AuthorizeConcertManagementUseCase` before configuration access. Verify: `npx tsc -p apps/api/tsconfig.app.json --noEmit`.
- [x] 2.2 Ensure all three management operations establish target concert existence, including the admin-override path, using the waiting-room repository capability or an existing concert lookup without duplicating ownership policy. Verify: `npx tsc -p apps/api/tsconfig.app.json --noEmit`.
- [x] 2.3 Update `packages/backend/src/virtual-waiting-room/adapters/http/organizer-waiting-room.controller.ts` to pass `AuthenticatedUser` actor data for GET, PUT, and PATCH; keep the shared endpoint and role guard, and map `ForbiddenConcertOwnershipError` to 403, `ConcertNotFoundError`/`WaitingRoomConcertNotFoundError` to 404, consistent with `concert-error.mapper.ts`, while retaining 400 for invalid config. Verify: `npx tsc -p apps/api/tsconfig.app.json --noEmit`.
- [x] 2.4 Confirm `packages/backend/src/virtual-waiting-room/virtual-waiting-room.module.ts` resolves the exported authorization use case from its existing `AuthModule` import and make only the wiring changes actually required. Verify: `npx tsc -p apps/api/tsconfig.app.json --noEmit`.

## 3. Backend ownership and controller tests

- [x] 3.1 Add focused application tests under `packages/backend/src/virtual-waiting-room/application/use-cases/` proving owner organizer access, non-owner rejection before repository reads/writes, admin override, missing target handling, and unchanged invalid-config validation for GET/PUT/PATCH use cases. Verify: `npx vitest run packages/backend/src/virtual-waiting-room/application/use-cases`.
- [x] 3.2 Add `packages/backend/src/virtual-waiting-room/adapters/http/organizer-waiting-room.controller.spec.ts` covering authenticated actor forwarding, shared-role behavior, 200 responses, 403 forbidden-ownership mapping, 404 not-found mapping, 400 invalid config, and response shape. Verify: `npx vitest run packages/backend/src/virtual-waiting-room/adapters/http/organizer-waiting-room.controller.spec.ts`.
- [x] 3.3 Run the existing waiting-room unit suite to confirm queue, admission, Redis, SSE, and worker behavior did not change. Verify: `npx vitest run packages/backend/src/virtual-waiting-room`.

## 4. Shared waiting-room API functions and contract parsing

- [x] 4.1 Create `apps/web/src/features/concerts-shared/waiting-room/waiting-room.api.ts` with GET, PUT, and PATCH functions using the existing shared client and the exact `/organizer/waiting-room/:concertId` endpoint family for both roles. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 4.2 Validate request payloads with `ConfigureWaitingRoomRequestSchema` or `SetWaitingRoomOverrideRequestSchema`, parse every successful response with `WaitingRoomConfigResponseSchema`, and classify only typed HTTP 404 as no config. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/waiting-room.api.spec.ts`.
- [x] 4.3 Add API tests for valid GET/PUT/PATCH, response-schema failure, expected 404, non-404 propagation, and exact override bodies without real network access. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/waiting-room.api.spec.ts`.

## 5. Query keys, hooks, and mutation cache behavior

- [x] 5.1 Add waiting-room query-key helpers and hooks under `apps/web/src/features/concerts-shared/waiting-room/`, scoping keys by authenticated role, JWT subject, and concert ID. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 5.2 Implement query behavior for 200, no-config 404, retryable failures, and enabled-by-concert-ID mounting; implement PUT/PATCH mutations that prevent duplicate requests and update only the matching scoped cache. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room`.
- [x] 5.3 Test that admin, different organizers, and different concert IDs cannot reuse the same waiting-room query entry and that mutation success does not invalidate unrelated role/concert data. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room`.

## 6. Form state normalization and validation

- [x] 6.1 Create `apps/web/src/features/concerts-shared/waiting-room/waiting-room-form.ts` with the disabled defaults `false/false/NONE/500/600/500/100/60`, string-editable numeric draft fields, persisted-to-draft mapping, and normalized dirty comparison. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 6.2 Implement normalization that rejects empty strings, NaN, Infinity, decimals, and values below contract minima before `ConfigureWaitingRoomRequestSchema.safeParse`, then apply `activateThreshold > deactivateThreshold` with field-level Vietnamese errors. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/waiting-room-form.spec.ts`.
- [x] 6.3 Add form tests for valid boundaries, every invalid numeric class, threshold equality/order, default-disabled state, dirty-state comparison, and the non-blocking `< 10` concurrency warning. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/waiting-room-form.spec.ts`.

## 7. Shared WaitingRoomConfigSection

- [x] 7.1 Build `apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.tsx` with enabled/auto toggles, draft override segmented control, five numeric inputs with units, field errors, low-concurrency warning, explicit save, isolated loading/error/retry states, and success/error feedback. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 7.2 Keep the component form-safe: render no nested `<form>`, set every action button to `type="button"`, prevent Enter in waiting-room number fields from submitting the concert parent, and keep failure state local. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.
- [x] 7.3 Apply accessible labels, checked/pressed or radio semantics, `aria-describedby` field errors, keyboard focus states, and textual loading/error/warning/status cues that do not rely on color alone. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.

## 8. Persisted status panel and quick overrides

- [x] 8.1 Add the persisted-only `Cấu hình đã lưu và chế độ vận hành` panel and exact badge mapping for no-config/disabled, FORCE_ON, FORCE_OFF, automatic, and enabled-manual-waiting modes; show `updatedAt` when present and `Có thay đổi chưa lưu` for draft divergence. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.
- [x] 8.2 Add immediate `Bật ngay`, `Tắt ngay`, and `Trả về tự động` PATCH actions; disable all three when config is absent, persisted `enabled` is false, or a PATCH is pending, with the required explanatory copy. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.
- [x] 8.3 On PATCH success replace the persisted snapshot and synchronize only draft `manualOverride`, preserving all other unsaved draft fields; on failure preserve both snapshots and show a safe error. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.

## 9. Admin concert edit integration

- [x] 9.1 Wrap the shared component in the existing local `FormSection` with `hourglass_top` and `Phòng chờ ảo` in `apps/web/src/features/admin/concerts/ConcertEditPage.tsx`; do not add a route, tab, or admin-specific waiting-room API. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 9.2 Add or extend an admin edit-page integration test proving the section receives the loaded concert ID and waiting-room actions do not trigger the parent concert save handler. Verify: `npx vitest run apps/web/src/features/admin/concerts`.

## 10. Organizer concert edit integration

- [x] 10.1 Wrap the same shared component in the existing local `FormSection` in `apps/web/src/features/organizer/concerts/ConcertEditPage.tsx`; do not copy API, hook, validation, or rendered control logic into the organizer feature. Verify: `npm --workspace @ticketbox/web run typecheck`.
- [x] 10.2 Add or extend an organizer edit-page integration test proving the section receives the owned loaded concert ID, uses the shared endpoint, and does not trigger parent concert save. Verify: `npx vitest run apps/web/src/features/organizer/concerts`.

## 11. Frontend component and regression tests

- [x] 11.1 Complete `WaitingRoomConfigSection.spec.tsx` coverage for GET 200, GET 404 without PUT, non-404 retry, response parse failure, loading, valid save, validation failures, failed-save draft preservation, and duplicate-submit prevention. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.
- [x] 11.2 Cover segmented-draft behavior, quick-action prerequisites and all three payloads, pending-state locking, unrelated-draft preservation after PATCH, exact badge mapping, non-runtime wording, and accessible keyboard semantics. Verify: `npx vitest run apps/web/src/features/concerts-shared/waiting-room/WaitingRoomConfigSection.spec.tsx`.
- [x] 11.3 Run the complete web test suite to detect regressions in existing concert edit, API client, location picker, artist, banner, SEO, and query behavior. Verify: `npm --workspace @ticketbox/web run test`.

## 12. Typecheck, build, and end-to-end verification

- [x] 12.1 Build shared contracts before dependent checks even though their wire shapes are unchanged. Verify: `npm run build:api-types`.
- [x] 12.2 Typecheck the API composition after ownership input/wiring changes. Verify: `npx tsc -p apps/api/tsconfig.app.json --noEmit`.
- [x] 12.3 Typecheck, test, and production-build the management web app sequentially. Verify: `npm --workspace @ticketbox/web run typecheck && npm --workspace @ticketbox/web run test && npm --workspace @ticketbox/web run build`.
- [x] 12.4 Run repository unit tests and report unrelated pre-existing failures separately. Verify: `npm test` (run; PostgreSQL-dependent suites could not connect to localhost:5432, and E2E composition also exposed an existing gifting import resolution failure).
- [ ] 12.5 With PostgreSQL test infrastructure available, cover owner organizer, non-owner organizer, admin override, missing concert, first save, repeat save, and immediate override through HTTP; do not require real Redis for configuration-only assertions. Verify: `npm run test:e2e`.

## 13. Documentation and manual verification

- [x] 13.1 Update `virtual-waiting-room-admin-handoff.md` or add a focused note under `docs/manual-tests/` documenting the shipped edit-page location, default-disabled first-save behavior, quick-action prerequisites, persisted-mode limitation, and owner/admin authorization. Verify: `rg -n "Phòng chờ ảo|Cấu hình đã lưu|Bật và lưu" virtual-waiting-room-admin-handoff.md docs/manual-tests`.
- [x] 13.2 Manually verify both role edit pages: no-config load performs no write; first valid save creates config; invalid thresholds stay local; quick FORCE_ON/FORCE_OFF/NONE update persisted mode; unsaved numeric edits survive PATCH; organizer cannot access another owner's concert config; and audience checkout behavior remains unchanged. Verify: record results in the documentation from task 13.1.
- [x] 13.3 Re-run OpenSpec validation after any implementation-driven artifact correction. Verify: `openspec validate --changes "add-waiting-room-management-ui"`.
