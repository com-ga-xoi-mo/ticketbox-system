## Why

Member 4 / Wave 3 needs to turn the accepted AI Artist Bio target spec into an implementation-ready slice. Organizers must be able to upload PDF press kits, generate a concise artist bio through a provider boundary, review the result, and publish it to the public concert detail page without requiring real external AI credentials for local grading.

## What Changes

- Add an `ai-artist-bio` backend capability slice for organizer PDF upload, file validation, asset persistence, processing job creation, worker execution, generated bio review, retry, and approval.
- Store press kit PDFs through the existing asset/object-storage abstraction using `AssetKind.PRESS_KIT`, content type checks, size limits, checksum metadata, and organizer ownership authorization.
- Process artist bio jobs asynchronously through the worker/BullMQ integration point when available, with a direct application boundary that remains testable with in-memory adapters.
- Extract text from PDF files, clean and bound the extracted text, then call `AiBioGeneratorPort`.
- Provide two AI adapters: a GeminiAI-compatible adapter for configured environments and a deterministic local fallback for development, tests, and grading without API keys.
- Persist job status, generated bio, provider name, error reason, retry state, requested/reviewed user IDs, and timestamps using the existing `artist_bios` data model, adding migration fields only where the current schema is insufficient.
- Treat the blueprint term `artist_bio_jobs` as the processing workflow concept for this repo, mapped to durable `artist_bios` rows plus transient BullMQ jobs; do not introduce a separate `artist_bio_jobs` table in this Wave 3 change.
- Expose organizer/admin endpoints for upload, job status, retry, review, approve/publish, and reject/replace flows.
- Include the approved/published artist bio in public concert detail responses through the concert-management integration.
- Keep non-PDF formats, production Gemini credential requirements, full catalog UI redesign, and unrelated AI features out of scope.

## Capabilities

### New Capabilities

- None. This change implements the accepted target capabilities rather than introducing a new feature area.

### Modified Capabilities

- `ai-artist-bio`: Clarify implementation-level behavior for upload limits, storage, `artist_bios` workflow persistence, transient queue jobs, retry state, provider fallback, review/approval, and failure handling.
- `concert-management`: Clarify that public concert detail includes only the approved/published artist bio and does not expose draft, failed, or review-only generated bios.

## Impact

- Backend modules under `packages/backend/src`, especially a new or expanded AI Artist Bio module, shared platform asset/object-storage ports, worker registration, and concert-management read models.
- Prisma schema and migrations only for missing retry count, status reason, provider metadata, or publication fields on the existing `artist_bios` table; no separate `artist_bio_jobs` table is expected for this change.
- API surface for organizer/admin artist bio upload, status, retry, review, and publish actions.
- Worker/BullMQ processors for `artist_bio.requested` jobs, with graceful fallback if the queue foundation is incomplete.
- Tests for ownership authorization, PDF validation, asset persistence, text extraction cleanup, provider fallback, job retries, approval publication, and public detail visibility.
