## Context

The `GET /admin/concerts/:concertId/guest-list/imports/:batchId/report` endpoint currently throws a generic `Error('Guest-list report is not available')` when `batch.reportStorageKey` is null. NestJS maps unrecognized errors to HTTP 500. This occurs for batches with status `FAILED`, `PENDING`, or `PROCESSING` — all legitimate states where no report file exists yet (or ever will). The 500 response misleads clients into thinking the server is broken.

## Goals / Non-Goals

**Goals:**
- Return HTTP 422 with a structured JSON body when a report is requested for a non-completed batch.
- Include the batch status in the error response so the client can display an appropriate message.
- Follow the existing domain error pattern used throughout the codebase (custom error classes in `domain/errors.ts`).

**Non-Goals:**
- Changing the report generation logic or batch processing pipeline.
- Adding retry or auto-recovery behavior for failed batches.
- Modifying the batch list or batch detail endpoints (only the `/report` sub-resource is affected).

## Decisions

### Decision 1: Use a dedicated domain error class

Create `GuestListBatchNotCompletedError` extending `Error`, carrying `batchStatus` and `batchId` as properties. This follows the existing pattern in `guest-list-import/domain/errors.ts` where each error type has its own class (`GuestListBatchNotFoundError`, `GuestListBatchBusyError`, etc.).

Alternative considered: Reuse generic `Error` with a specific message string and parse the message in the controller. Rejected because string-matching is fragile and inconsistent with the codebase's error handling patterns.

### Decision 2: Check status before reportStorageKey

In the use case, check `batch.status` against a set of reportable statuses (`COMPLETED`, `COMPLETED_WITH_ERRORS`) before checking `reportStorageKey`. This gives a semantically correct error: "the batch hasn't completed" vs. "the report file is missing" (which could indicate data corruption for a completed batch).

### Decision 3: Map to HTTP 422 in the controller with try/catch

Catch `GuestListBatchNotCompletedError` in the controller's `report()` method and throw NestJS `UnprocessableEntityException` with a structured body. HTTP 422 (Unprocessable Entity) is appropriate because the request is syntactically valid but semantically unprocessable — the batch hasn't reached a state where a report exists.

Alternative considered: Use a NestJS Exception Filter. Rejected because this is a single-endpoint fix and a filter would be over-engineering for one error type.

## Risks / Trade-offs

- **[Low risk] Existing clients may expect 500** → Any client currently handling 500 for this case will now receive 422. This is a strictly better response and unlikely to break anything since 500 is typically treated as "retry later."
