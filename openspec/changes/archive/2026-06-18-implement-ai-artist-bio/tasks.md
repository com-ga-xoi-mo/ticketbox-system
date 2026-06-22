## 1. Data Model and Configuration

- [x] 1.1 Inspect `prisma/schema.prisma` and current migrations for `Asset`, `ArtistBio`, `AssetKind.PRESS_KIT`, and `ArtistBioStatus` coverage.
- [x] 1.2 Confirm `artist_bios` is the durable workflow source of truth and document that blueprint `artist_bio_jobs` maps to `artist_bios` plus transient BullMQ jobs in this repo.
- [x] 1.3 Add a Prisma migration only for missing artist bio retry metadata on `artist_bios`, such as retry count, max attempts, last attempted time, next retry time, or structured processing metadata; do not create a separate `artist_bio_jobs` table.
- [x] 1.4 Regenerate Prisma client and update schema tests so the artist bio and asset enums/fields are exported.
- [x] 1.5 Add configuration for press kit PDF size limit, AI provider mode, Gemini-compatible endpoint/model/key, deterministic fallback mode, and artist bio input length limit.

## 2. AI Artist Bio Module Structure

- [x] 2.1 Create `packages/backend/src/ai-artist-bio` with module, domain types, errors, ports, application use cases, infrastructure adapters, HTTP adapters, queue adapters, and testing helpers following existing backend module conventions.
- [x] 2.2 Define `ArtistBioRepositoryPort` around `artist_bios` as the workflow table for creating jobs, loading jobs by concert, claiming processing jobs, persisting success/failure, retrying failed jobs, and publishing approved bios.
- [x] 2.3 Define `ObjectStoragePort` or reuse an existing storage boundary for writing and reading press kit PDF files by storage key.
- [x] 2.4 Define `PdfTextExtractorPort`, `AiBioGeneratorPort`, and `ArtistBioQueuePort` with in-memory test adapters.
- [x] 2.5 Register the module in `BackendCoreModule` for HTTP use cases and export worker providers needed by `BackendWorkerModule`.

## 3. Upload and Job Creation API

- [x] 3.1 Add protected organizer/admin endpoint for uploading a PDF press kit for a concert.
- [x] 3.2 Reuse `AuthorizeConcertManagementUseCase` so only the concert owner or an explicitly allowed admin override can upload for the concert.
- [x] 3.3 Validate file presence, extension, content type, basic PDF signature, non-empty content, and configured size limit before storage.
- [x] 3.4 Store accepted PDFs through object storage and persist an active `PRESS_KIT` asset with checksum, original name, content type, size, uploader, and storage key.
- [x] 3.5 Create or replace the `artist_bios` workflow record linked to concert, asset, requester, initial status, and retry metadata.
- [x] 3.6 Enqueue an `artist_bio.requested` job through `ArtistBioQueuePort` and return the created job status to the organizer.

## 4. Worker Processing

- [x] 4.1 Add BullMQ job constants and processor wiring for `artist_bio.requested` as a transient processing trigger while keeping the processor directly invocable in unit tests.
- [x] 4.2 Implement job claim/start behavior that updates the `artist_bios` workflow record to `PROCESSING`, increments retry state, and clears stale retryable error details.
- [x] 4.3 Implement object-storage read and PDF text extraction through `PdfTextExtractorPort`.
- [x] 4.4 Implement text cleanup that normalizes whitespace, removes unusable empty content, bounds provider input length, and produces a clear failure when no usable text remains.
- [x] 4.5 Implement successful processing transition to `READY_FOR_REVIEW` with source text, generated bio, provider name, and timestamps.
- [x] 4.6 Implement failure transition to `FAILED` with durable error reason, provider/extractor context where available, and retry metadata.

## 5. AI Provider Adapters

- [x] 5.1 Implement deterministic local fallback adapter that generates stable output from the cleaned PDF text without network calls.
- [x] 5.2 Implement GeminiAI-compatible adapter behind `AiBioGeneratorPort` using configured model, endpoint/key, timeout, and response parsing.
- [x] 5.3 Implement provider selection so local development, tests, and grading use fallback unless Gemini mode and credentials are explicitly configured.
- [x] 5.4 Add adapter tests for deterministic output, provider selection, provider failure handling, and no-network fallback behavior.

## 6. Review, Retry, and Publication API

- [x] 6.1 Add protected organizer/admin endpoint to fetch artist bio job status and generated review text for a concert.
- [x] 6.2 Add protected organizer/admin endpoint to retry a failed artist bio job without requiring a new PDF upload.
- [x] 6.3 Add protected organizer/admin endpoint to approve and publish a `READY_FOR_REVIEW` artist bio.
- [x] 6.4 Add protected organizer/admin endpoint or replacement path to reject an unwanted generated bio and keep it non-public.
- [x] 6.5 Enforce ownership authorization on status, retry, approve, publish, and reject actions.
- [x] 6.6 Reject invalid status transitions, including publishing failed, draft, or processing jobs.

## 7. Public Concert Detail Integration

- [x] 7.1 Extend concert-management domain response types with optional published artist bio text.
- [x] 7.2 Update the public concert detail repository query to include only the latest `PUBLISHED` artist bio for the concert.
- [x] 7.3 Ensure draft, processing, failed, and ready-for-review bios are never exposed in public concert detail responses.
- [x] 7.4 Update public concert detail controller/e2e expectations to allow missing/null artist bio when no approved bio exists.

## 8. Tests and Evidence

- [x] 8.1 Add use-case unit tests for upload authorization, valid PDF job creation, non-PDF rejection, oversized rejection, and storage failure behavior.
- [x] 8.2 Add repository tests proving `artist_bios` stores artist bio status transitions, retry metadata, failure persistence, and publication fields as the durable workflow source of truth.
- [x] 8.3 Add worker tests for PDF extraction success, empty extraction failure, AI provider failure, deterministic fallback success, and retry-safe processing.
- [x] 8.4 Add controller or e2e tests for organizer upload, status, retry, publish, non-owner rejection, and invalid transition rejection.
- [x] 8.5 Add public concert detail test showing published bio is visible and unapproved generated text is hidden.
- [x] 8.6 Add or update demo seed/sample fixture with a small valid PDF press kit if the current demo data does not already include one.

## 9. Verification

- [x] 9.1 Run focused unit tests for `ai-artist-bio`, affected concert-management read model tests, and identity authorization integration tests.
- [x] 9.2 Run affected e2e tests for artist bio endpoints and public concert detail.
- [x] 9.3 Run lint/typecheck for touched backend, worker, Prisma, and tests.
- [x] 9.4 Run `openspec.cmd validate implement-ai-artist-bio --strict` and fix any proposal/spec/task validation errors.
- [x] 9.5 Update README or demo notes only if new local environment variables or sample PDF steps are required for graders.
