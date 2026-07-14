## Context

The guest-list module already owns scheduled local-inbox discovery, source storage, checksum-idempotent claims, BullMQ delivery, replay-safe row evidence, terminal reports, Admin management endpoints, and assignment-authorized VIP lookup. The accepted implementation explicitly excluded full Admin web and check-in mobile UI, leaving a gap between proven backend behavior and the workflows available to operators and gate staff.

The current Admin controller accepts a local class-validator DTO and returns an internal `GuestListBatchRecord`. That record contains storage and lease fields but omits several persisted counters and timestamps needed by a management screen. The mobile app consumes shared contracts for login, assignments, QR scanning, sync, and ticket cache, but does not expose the already-shared VIP lookup contract through its API client or navigation. This change spans `packages/api-types`, the guest-list HTTP adapter/read model, `apps/web`, `apps/checkin-mobile`, and submission evidence, while keeping the database and worker pipeline stable.

## Goals / Non-Goals

**Goals:**

- Make the existing Admin upload, batch inspection, and report workflow usable from a concert-scoped web page.
- Define strict shared wire schemas and safe public response mappers for every Admin guest-list management payload used by the web client.
- Make the existing VIP lookup endpoint usable from the check-in mobile app with the exact selected assignment.
- Preserve runtime validation across backend, web, and mobile consumers and provide automated plus manual end-to-end evidence.
- Keep scheduled inbox discovery independently operable and invisible as a manual per-concert UI action.

**Non-Goals:**

- Granting guest-list management to ORGANIZER or changing existing Admin authorization scope.
- Replacing JSON Base64 upload with multipart upload, changing CSV grammar, or changing the 5 MiB default limit.
- Changing Prisma models, import ordering, checksum idempotency, BullMQ repair, storage, scheduler, or worker processing semantics.
- Adding offline VIP lookup, VIP data to the ticket cache, VIP requests to the offline queue, or VIP admission/check-in recording.
- Issuing paid tickets or QR credentials to guest-list entries or changing `POST /checkin/scan`.
- Exposing `POST /admin/concerts/:concertId/guest-list/discover` in the web or mobile UI.

## Decisions

### 1. Define shared wire schemas and map internal records at the HTTP boundary

`@ticketbox/api-types` will own strict Zod schemas and inferred types for upload requests, canonical request outcomes, public batch summaries, report summaries, report rows, and the structured `BATCH_NOT_COMPLETED` error. The backend controller will parse requests and map application/domain results into these schemas before returning them. Web and mobile clients will validate successful responses at runtime rather than trusting ad hoc TypeScript interfaces.

The public batch representation includes identity, source name, checksum, import sequence, status, processing attempt, counters, failure details, and lifecycle timestamps. It deliberately excludes asset IDs, uploader internals, storage keys, content storage metadata, lease ownership/expiry, and queue state. Repository/application read models may be extended with already-persisted fields, but inner layers will not import the shared HTTP package.

Returning `GuestListBatchRecord` directly was rejected because it couples clients to worker/storage coordination and still does not provide the UI summary fields. Defining web-only response types was rejected because it would repeat the contract drift that `packages/api-types` exists to prevent.

### 2. Preserve the existing bounded JSON Base64 upload contract

The Admin web client will validate a selected `.csv` as non-empty and at most 5 MiB, normalize an empty browser MIME type to `text/csv`, encode the bytes as Base64, and submit the existing JSON shape. The backend remains authoritative for byte size, content type, UTF-8, header, row, and domain validation. A source-controlled template uses the canonical `guest_name,email,phone,external_ref,action` header.

Multipart upload would reduce Base64 overhead and match some existing asset endpoints, but it would widen this integration change and invalidate the established fallback API. The 5 MiB bounded source fits within the existing Base64 DTO and API JSON body limits, so preserving compatibility is the lower-risk choice.

### 3. Use a concert-scoped Admin route without a global navigation item or discovery control

The web feature lives under `apps/web/src/features/admin/guest-list/` and is mounted at `/admin/concerts/:id/guest-list` behind the existing ADMIN `ProtectedRoute`. Admin concert management provides the entry point for a selected concert. The page is not added to the global sidebar because a concert ID is required, and ORGANIZER routes remain unchanged.

The UI will not invoke or present manual discovery. Scheduled discovery continues in the worker through `GUEST_LIST_DISCOVERY_CRON`, while the page's explicit upload is the operational/demo fallback. A per-concert discover button was rejected because the current endpoint invokes global inbox discovery despite its concert-scoped URL and because the worker already supplies the required automation.

### 4. Poll only while a batch is non-terminal

TanStack Query owns batch list/detail/report requests. The list query refetches on an approximately two-second interval only while at least one visible batch is `PENDING` or `PROCESSING`; it stops when all batches are `COMPLETED`, `COMPLETED_WITH_ERRORS`, or `FAILED`. Upload success immediately seeds or invalidates the canonical batch list, including `IDEMPOTENT_DUPLICATE` responses.

WebSockets or server-sent events were rejected because this low-volume operational screen does not justify a new realtime channel. Unconditional polling was rejected because terminal history does not change and would waste requests.

### 5. Treat reports and batch failures as different resources

Completed and completed-with-errors batches can load a runtime-validated report and render its summary plus immutable row evidence. The browser may download the same validated payload as JSON without a new backend download format. Failed, pending, and processing batches never trigger the report request; the page renders batch failure data, while a direct non-reportable request continues to receive the shared HTTP 422 `BATCH_NOT_COMPLETED` response.

The safe public batch also exposes a derived `reportAvailable` boolean without exposing the report storage key. This lets the UI suppress report actions for legacy, seeded, or test-created terminal rows that predate canonical report persistence. Report inspection uses the existing accessible modal primitive so the result is visible immediately even when the history contains many batches.

Generating a CSV report or treating a failed batch as a row report was rejected because the existing worker persists JSON reports only after header-valid processing and intentionally has no report asset for an atomically failed file.

### 6. Add an online-only VIP tab bound to the selected assignment

The mobile API client adds `lookupVipGuest(accessToken, request)` and validates the response using the existing VIP schemas. A third `VIP` tab renders a lookup form only after an assignment is selected and always derives `assignmentId`, `concertId`, and gate context from that selected assignment. The user supplies only lookup type and value. The screen represents found, not-found, authorization, validation, service, and transport outcomes explicitly.

When the existing network monitor reports offline, submission is disabled with an explanatory state. VIP lookups are never queued and never touch the ticket cache or scan workflow. Caching guest identities was rejected because the accepted backend scope explicitly excludes offline VIP lookup and because guest cancellation must be observed from the authoritative online projection.

### 7. Deliver and verify in dependency order

Implementation proceeds through shared contracts, backend public mapping, Admin web, mobile VIP lookup, and finally end-to-end/manual evidence. The shared package is rebuilt before each consumer. Focused tests cover pure adapters and UI state; database-backed HTTP evidence covers upload, processing, report reconciliation, idempotent re-upload, authorization, invalid-header atomicity, and exact-assignment VIP lookup.

## Risks / Trade-offs

- **[Risk] Base64 adds roughly one-third payload overhead and duplicates file bytes in browser memory.** → Keep the existing 5 MiB client limit, use a bounded conversion helper, and retain backend size validation as authoritative.
- **[Risk] Browser CSV MIME values vary or may be empty.** → Accept the documented CSV MIME set, normalize an empty value to `text/csv`, and test the fallback while preserving backend rejection of unsupported types.
- **[Risk] Public mapping can drift from persisted batch/report fields.** → Centralize mappers beside the HTTP adapter, validate mapped payloads with shared schemas, and add field-allowlist tests proving internal keys are absent.
- **[Risk] Polling can continue after navigation or terminal completion.** → Derive the interval from query data, let TanStack Query cancel inactive observers, and test terminal stop behavior.
- **[Risk] A stale selected assignment could authorize the wrong lookup request.** → Derive all assignment context at submission time and rely on the backend's exact-assignment validation; never accept user-entered assignment/concert IDs.
- **[Risk] Full E2E evidence depends on PostgreSQL, Redis, and an active worker path.** → Use root dependency scripts, deterministic fixtures/job IDs, bounded polling, and focused lower-level tests when infrastructure is unavailable while reporting the missing E2E evidence honestly.

## Migration Plan

1. Add and build shared schemas without removing the existing VIP exports.
2. Add safe backend mappers and enrich read results from fields already present in PostgreSQL; keep endpoint paths and upload semantics compatible.
3. Add the protected Admin route, concert entry point, template, and polling/report UI.
4. Add the mobile client method, online state model, VIP screen, and third tab without changing scan/sync storage.
5. Run focused and repository-wide verification, then update README and submission evidence.

No database migration or data backfill is planned. Rollback removes the two UI surfaces and new public adapters/contracts; the pre-existing endpoints and scheduled worker remain independently usable.

## Open Questions

- Future ORGANIZER access and concert-ownership rules are deferred to a separate authorization change.
- Recording VIP admission or supporting offline VIP lookup would require a new domain/API design and is intentionally deferred.
