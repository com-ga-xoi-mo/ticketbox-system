## Context

TicketBox already defines AI Artist Bio as an accepted target capability. The blueprint expects organizers to upload PDF artist profiles or press kits, process them asynchronously, call an AI provider through `AiBioGeneratorPort`, keep a deterministic local fallback, and publish the approved bio to public concert detail.

Current repo context:

- The backend is a NestJS modular monolith with clean/hexagonal module boundaries.
- `apps/api` imports backend modules through `@ticketbox/backend`.
- `apps/worker` imports `BackendWorkerModule` and already hosts queue processors.
- Prisma already contains `assets`, `concerts`, and `artist_bios` tables, including `AssetKind.PRESS_KIT` and `ArtistBioStatus` values.
- `AuthorizeConcertManagementUseCase` already exists for organizer ownership checks.
- Public concert detail currently comes from the concert-management read model and does not yet expose a published artist bio.
- The blueprint uses the term `artist_bio_jobs` for processing state, but this repo already has an `artist_bios` table that can serve as the durable workflow record.

This change should implement the AI bio vertical without redesigning concert catalog, identity, queue foundation, or general asset handling beyond the integration points needed for press kits.

## Goals / Non-Goals

**Goals:**

- Provide organizer/admin APIs for PDF press kit upload, artist bio job status, retry, review, approval, and publication.
- Validate uploaded files by content type, extension, configured size limit, and basic PDF signature before storing them.
- Store press kit files through an `ObjectStoragePort` and persist metadata in `assets`.
- Create or update an `artist_bios` record linked to the concert, press kit asset, requesting user, processing status, provider, generated text, error state, and retry state.
- Use `artist_bios` as the single durable workflow source of truth for this change, with BullMQ jobs acting only as transient async triggers.
- Process `artist_bio.requested` jobs in the worker with PDF extraction, text cleanup, provider generation, and status transitions.
- Implement `AiBioGeneratorPort` with a GeminiAI-compatible adapter and deterministic local fallback.
- Reuse identity/access ownership authorization for organizer actions.
- Add published bio data to public concert detail only after organizer approval.
- Cover the behavior with focused unit, repository, controller, worker, and public detail tests.

**Non-Goals:**

- Requiring real Gemini credentials for local development, tests, grading, or demo.
- Supporting DOCX, images, URLs, ZIP files, or non-PDF press kits.
- Redesigning the public concert detail page or catalog UI beyond consuming the published bio field.
- Introducing a separate AI microservice.
- Creating a separate `artist_bio_jobs` table in Wave 3.
- Implementing unrelated AI features such as chat, recommendation, translation, or image generation.
- Reworking existing auth, concert ownership, or worker foundation behavior outside the integration needed here.

## Decisions

### Decision 1: Add an `ai-artist-bio` backend module with clean ports

Implement a dedicated module under `packages/backend/src/ai-artist-bio` and register it from both the API runtime and worker runtime.

Application use cases:

- `RequestArtistBioUseCase`: authorize organizer ownership, validate upload metadata, store asset, create processing record, enqueue job.
- `GetArtistBioJobUseCase`: return status and generated/review data for an owned concert.
- `RetryArtistBioJobUseCase`: authorize ownership, reset retryable failed jobs, enqueue processing.
- `PublishArtistBioUseCase`: authorize ownership, approve generated bio, set published fields.
- `RejectArtistBioUseCase` or equivalent replacement flow: keep the failed/rejected result from being public and allow a new upload.

Ports:

- `ArtistBioRepositoryPort`
- `ObjectStoragePort`
- `PdfTextExtractorPort`
- `AiBioGeneratorPort`
- `ArtistBioQueuePort`
- Optional `ClockPort` for deterministic tests.

Rationale: this matches existing clean module patterns and keeps PDF parsing, storage, queueing, AI provider calls, and persistence testable without controllers or external SDKs.

Alternatives considered:

- Put all logic into concert-management: faster initially, but it mixes admin catalog operations with AI processing and worker behavior.
- Put all logic into worker processors: makes upload/review APIs thin but hides authorization and job state rules in infrastructure code.

### Decision 2: Use `artist_bios` as the durable workflow table

The existing schema already has `ArtistBio` with `concertId`, `pressKitAssetId`, `requestedById`, `reviewedById`, `status`, `sourceText`, `generatedBio`, `publishedBio`, `provider`, `errorMessage`, and timestamps. This change should reuse that table as the durable workflow source of truth.

Team mapping:

```text
artist_bios          = durable workflow record and source of truth
artist_bio.requested = transient BullMQ job trigger
artist_bio_jobs      = blueprint concept, not a separate Wave 3 table
```

Add migration fields only if absent after implementation review:

- `retry_count`
- `max_attempts`
- `last_attempted_at`
- `next_retry_at`
- optional structured `metadata` for extractor/provider diagnostics

Rationale: the table already models most of the workflow. Using it avoids duplicate sources of truth where one table tracks job status and another tracks generated/public bio state. Adding only retry metadata keeps the change narrow and still satisfies the blueprint requirement for durable processing state.

Alternatives considered:

- Create a separate `artist_bio_jobs` table: useful for detailed job history, but heavier than needed for this Wave 3 implementation and likely to duplicate `artist_bios.status`, `errorMessage`, provider, generated text, and publication fields.
- Add a future `artist_bio_attempts` table: appropriate later if the team needs full per-attempt audit history or provider payload history, but outside this change.
- Store job state only in BullMQ: loses durable status, retry, and grading/demo evidence.

### Decision 3: Store press kits through object storage plus `assets`

The upload endpoint validates the PDF and stores the binary through `ObjectStoragePort`, then persists an `Asset` row:

- `kind = PRESS_KIT`
- `status = ACTIVE` for accepted files
- `contentType = application/pdf`
- `sizeBytes`
- `checksum`
- `originalName`
- `uploadedById`
- storage metadata needed by the object-storage adapter

Validation should reject:

- missing file
- non-PDF content type or extension
- file size over configured limit
- empty file
- file not beginning with a valid PDF signature

Rationale: object storage is the blueprint boundary for uploaded binary assets; the database stores metadata and relationships only.

Alternatives considered:

- Store PDFs in PostgreSQL: simpler locally, but conflicts with the blueprint and bloats transactional storage.
- Trust MIME type only: unsafe because clients can spoof content type.

### Decision 4: Use asynchronous processing with a direct fallback boundary

`RequestArtistBioUseCase` should enqueue an `artist_bio.requested` job through `ArtistBioQueuePort`. If BullMQ exists, the adapter publishes to the configured queue. If queue foundation is unavailable in a local test, use cases and processors remain directly invocable through in-memory adapters.

Worker processor flow:

1. Load the durable `artist_bios` workflow record and press kit asset metadata.
2. Mark status `PROCESSING`, increment retry count, and clear stale error state.
3. Read the PDF from object storage.
4. Extract text with `PdfTextExtractorPort`.
5. Normalize whitespace, remove repeated headers/footers where practical, bound length for provider input, and reject effectively empty text.
6. Call `AiBioGeneratorPort`.
7. Persist `READY_FOR_REVIEW`, `sourceText`, `generatedBio`, `provider`, and timestamps.
8. On retryable failure, persist `FAILED`, `errorMessage`, retry metadata, and let manual retry or queue retry re-enqueue.

Rationale: external calls and PDF parsing should not block request/response APIs, but the core processor remains testable without a live queue.

Alternatives considered:

- Synchronous generation during upload: simpler flow, but API requests become slow and fragile.
- Scheduled polling only: workable, but less direct than enqueueing the specific upload job.

### Decision 5: Use provider selection with deterministic fallback

`AiBioGeneratorPort` should have:

- `GeminiArtistBioGeneratorAdapter` for configured environments.
- `DeterministicArtistBioGeneratorAdapter` for local development, tests, and grading.
- `ArtistBioGeneratorProvider` or config factory that selects Gemini only when required config is present and AI mode is set accordingly; otherwise it selects deterministic fallback.

The fallback output should be stable for the same cleaned input and include a concise Vietnamese-friendly artist bio suitable for demo data, without network calls.

Rationale: the assignment requires an AI adapter, but grading must not fail because a real API key is missing.

Alternatives considered:

- Stub that returns a fixed string: deterministic, but too weak to demonstrate extracted text is used.
- Require Gemini for every run: higher realism, but creates external dependency and credential risk.

### Decision 6: Publish through explicit organizer approval

Generated bios are not public until an organizer approves them. Approval sets `status = PUBLISHED`, `publishedBio`, `reviewedById`, and `publishedAt`. Public concert detail returns only the latest published bio for the requested concert.

Draft, processing, failed, and ready-for-review bios remain visible only through protected organizer/admin endpoints.

Rationale: AI output needs human review and the concert-management public API must not leak unapproved generated text or processing errors.

Alternatives considered:

- Auto-publish on successful generation: fewer steps, but weaker safety for AI-generated content.
- Store published text only on `concerts.artist_bio`: simpler reads, but current schema already models artist bio review state separately. If denormalization becomes necessary, update it explicitly as part of publication while keeping `artist_bios` as audit source.

### Decision 7: Integrate with concert-management read model narrowly

Extend public concert detail types, repository mapping, and controller response to include an optional `artistBio` or `publishedArtistBio` field. The query should include only the latest `ArtistBioStatus.PUBLISHED` record for the concert.

Rationale: this satisfies the accepted concert detail integration while avoiding UI/catalog redesign.

Alternatives considered:

- Separate public endpoint for artist bio: avoids touching concert-management, but the accepted requirement says the public concert detail page includes the approved bio.

## Risks / Trade-offs

- [Risk] PDF extraction quality varies across PDFs. -> Mitigation: use a bounded extractor port, clean text defensively, persist failed status with reason, and allow retry/replacement.
- [Risk] AI provider network or credential failure blocks generation. -> Mitigation: provider selection falls back deterministically unless configured to require Gemini.
- [Risk] Queue setup may not be ready in every branch. -> Mitigation: keep `ArtistBioQueuePort` isolated and make processors directly testable with in-memory adapters.
- [Risk] Large PDFs can consume memory or slow workers. -> Mitigation: enforce size limits before storage and bound extracted text before provider calls.
- [Risk] Public catalog accidentally exposes unapproved text. -> Mitigation: public read model filters strictly to `PUBLISHED` records and tests cover non-public statuses.
- [Risk] Team members reintroduce `artist_bio_jobs` as a second source of truth. -> Mitigation: keep `artist_bios` as the documented workflow table, treat BullMQ jobs as transient triggers, and add tests around persisted status transitions.
- [Risk] Existing schema may not have all retry metadata. -> Mitigation: add a small migration for retry fields only after verifying current Prisma models.

## Migration Plan

1. Add or update Prisma migration for missing artist bio retry metadata on `artist_bios`, keeping existing `artist_bios` and `assets` records compatible and avoiding a new `artist_bio_jobs` table.
2. Add backend ports, domain types, repository, storage adapter, PDF extractor, AI generator adapters, queue adapter, and use cases.
3. Register the AI Artist Bio module in `BackendCoreModule` for HTTP APIs and in `BackendWorkerModule` for processors.
4. Extend concert-management public detail read model to include the latest published artist bio.
5. Add tests and sample fixtures for valid PDF, invalid file, fallback generation, failed provider, retry, approval, and public visibility.

Rollback:

- Remove module registration and API routes.
- Revert the migration if no production data exists; otherwise leave added nullable retry columns in place because they are backward compatible.
- Public concert detail remains functional because the artist bio field is optional.

## Open Questions

- Exact maximum PDF size should be read from config during implementation; default to a small grading-friendly limit such as 5 MB unless project config already defines asset upload limits.
- Decide whether approval should update only `artist_bios.publishedBio` or also denormalize onto a concert field if the current public read model benefits from it. Either way, `artist_bios` remains the workflow source of truth.
