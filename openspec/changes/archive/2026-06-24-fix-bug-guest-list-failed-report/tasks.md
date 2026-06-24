## 1. Domain Error

- [x] 1.1 Add `GuestListBatchNotCompletedError` class to `packages/backend/src/guest-list-import/domain/errors.ts` with `batchId` and `batchStatus` properties

## 2. Use Case

- [x] 2.1 Update `GetGuestListBatchesUseCase.report()` in `packages/backend/src/guest-list-import/application/use-cases/get-guest-list-batches.use-case.ts` to check `batch.status` against reportable statuses (`COMPLETED`, `COMPLETED_WITH_ERRORS`) before accessing `reportStorageKey`; throw `GuestListBatchNotCompletedError` for `FAILED`, `PENDING`, or `PROCESSING`
- [x] 2.2 Add unit tests for the report method: verify `GuestListBatchNotCompletedError` is thrown for each non-completed status and verify existing behavior for completed batches

## 3. Controller

- [x] 3.1 Update `AdminGuestListController.report()` in `packages/backend/src/guest-list-import/adapters/http/admin-guest-list.controller.ts` to catch `GuestListBatchNotCompletedError` and throw `UnprocessableEntityException` with structured body `{ error: "BATCH_NOT_COMPLETED", status: "<batch-status>", message: "..." }`
- [x] 3.2 Add unit test for the controller report endpoint: verify HTTP 422 is returned when `GuestListBatchNotCompletedError` is thrown

## 4. Verification

- [x] 4.1 Run full test suite and confirm all existing tests still pass
- [x] 4.2 Run the guest-list module tests specifically to confirm the new behavior
