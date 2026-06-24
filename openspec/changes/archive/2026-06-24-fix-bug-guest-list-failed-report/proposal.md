## Why

The `GET /admin/concerts/:concertId/guest-list/imports/:batchId/report` endpoint returns HTTP 500 when the batch has status `FAILED` (e.g., invalid CSV headers). This happens because the use case throws a generic `Error` when `reportStorageKey` is null, and NestJS cannot map it to a proper HTTP status. The endpoint should return HTTP 422 with a structured response indicating the batch did not complete successfully.

## What Changes

- Add a new domain error class `GuestListBatchNotCompletedError` that carries the batch status and a descriptive message.
- Update `GetGuestListBatchesUseCase.report()` to check batch status before accessing `reportStorageKey`. If status is `FAILED`, `PENDING`, or `PROCESSING`, throw `GuestListBatchNotCompletedError`.
- Update `AdminGuestListController.report()` to catch `GuestListBatchNotCompletedError` and return HTTP 422 with a structured JSON response (`{ error: "BATCH_NOT_COMPLETED", status: "<batch-status>", message: "..." }`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a bug fix that changes error handling behavior, not spec-level requirements.

## Impact

- `packages/backend/src/guest-list-import/domain/errors.ts` — new error class
- `packages/backend/src/guest-list-import/application/use-cases/get-guest-list-batches.use-case.ts` — status check before report retrieval
- `packages/backend/src/guest-list-import/adapters/http/admin-guest-list.controller.ts` — error-to-HTTP mapping
- No API schema changes (same endpoint, different error response)
- No database changes
