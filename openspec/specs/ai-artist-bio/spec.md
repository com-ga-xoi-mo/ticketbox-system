# ai-artist-bio Specification

## Purpose

Define how TicketBox validates PDF artist press kits, processes them through an AI bio generation workflow, stores durable processing state, and publishes only organizer-approved artist bios to public concert detail.

## Requirements

### Requirement: Press kit PDF validation and storage
The system SHALL validate organizer press kit uploads before storage and SHALL persist accepted PDF files through the project asset/object-storage abstraction.

#### Scenario: Organizer uploads valid PDF press kit for owned concert
- **WHEN** an authenticated organizer uploads a PDF press kit for a concert they own
- **THEN** the system SHALL store the file through object storage, create an active `PRESS_KIT` asset record, create or update an artist bio processing record, and enqueue artist bio processing

#### Scenario: Organizer upload for another organizer's concert is rejected
- **WHEN** an authenticated organizer uploads a PDF press kit for a concert they do not own
- **THEN** the system SHALL reject the upload before storing the file or creating a processing job

#### Scenario: Non-PDF press kit upload is rejected
- **WHEN** an organizer uploads a file whose content type, extension, or file signature does not match an allowed PDF
- **THEN** the system SHALL reject the upload and SHALL NOT store the file as an active press kit asset

#### Scenario: Oversized press kit upload is rejected
- **WHEN** an organizer uploads a PDF larger than the configured artist bio press kit limit
- **THEN** the system SHALL reject the upload and return a validation error identifying the file size limit

### Requirement: Durable artist bio processing job state
The system SHALL persist artist bio processing state so organizers can inspect status, failure reasons, generated output, provider metadata, and retry state. The durable workflow source of truth SHALL be the artist bio record; queue jobs SHALL be transient processing triggers and SHALL NOT be the only source of workflow state.

#### Scenario: Processing job is created from upload
- **WHEN** a valid press kit upload is accepted
- **THEN** the system SHALL persist an artist bio record linked to the concert, press kit asset, requesting user, initial processing status, and retry metadata

#### Scenario: Artist bio record is the durable workflow source
- **WHEN** the system needs to show current artist bio processing status, retry state, generated output, or publication state
- **THEN** the system SHALL read that durable workflow state from the artist bio record rather than relying on transient queue job state

#### Scenario: Separate artist bio jobs table is not required
- **WHEN** this Wave 3 change is implemented
- **THEN** the system SHALL NOT require a separate `artist_bio_jobs` table to satisfy artist bio upload, processing, retry, review, and publication behavior

#### Scenario: Worker starts processing job
- **WHEN** the worker claims an artist bio job
- **THEN** the system SHALL mark the job as processing, increment retry state, and clear stale retryable error details before extracting PDF text

#### Scenario: Processing failure is durable
- **WHEN** PDF extraction or AI generation fails
- **THEN** the system SHALL mark the job as failed with an error reason, provider or extractor context where available, and retry state visible to the organizer

#### Scenario: Organizer retries failed job
- **WHEN** an organizer retries a failed artist bio job for a concert they own
- **THEN** the system SHALL reset the job for processing and enqueue it without requiring a new PDF upload

### Requirement: PDF text extraction and cleanup
The system SHALL parse accepted PDF press kits with a standards-aware text extraction implementation, then clean the extracted page text before AI generation. It SHALL NOT treat raw PDF bytes, PDF object metadata, or compressed content streams as artist text.

#### Scenario: Readable PDF is normalized
- **WHEN** the worker extracts text from a readable PDF
- **THEN** the system SHALL normalize whitespace, remove unusable empty content, bound the provider input to the configured maximum length, and pass the cleaned text to the AI bio generator

#### Scenario: Common compressed PDF produces meaningful source text
- **WHEN** the worker processes a valid text-based PDF produced by a standard PDF generator
- **THEN** it SHALL extract readable page text before cleanup and AI generation
- **AND** the generated biography SHALL be based on the press-kit narrative rather than producer, author, title, timestamps, PDF object syntax, or encoded stream data

#### Scenario: Empty extracted text fails clearly
- **WHEN** PDF extraction produces no usable text after cleanup
- **THEN** the system SHALL fail the job with an error reason explaining that the PDF did not contain usable text

#### Scenario: Malformed or textless PDF does not generate a bio
- **WHEN** the parser cannot read the PDF or it yields no usable text after cleanup
- **THEN** the system SHALL transition the job to `FAILED`
- **AND** it SHALL NOT create a ready-for-review bio from metadata or raw PDF bytes

### Requirement: Shared artist-bio HTTP success contracts
The system SHALL define framework-independent Zod contracts in `@ticketbox/api-types` for artist-bio upload requests, artist-bio responses, and every `ArtistBioStatus` value. The package root SHALL export each runtime schema and inferred type, and the package SHALL be built before web consumers compile or test against it.

#### Scenario: Consumer imports artist-bio contracts
- **WHEN** a web consumer imports from `@ticketbox/api-types`
- **THEN** it SHALL receive `UploadArtistBioPressKitRequestSchema`, `ArtistBioResponseSchema`, `ArtistBioStatusSchema`, and their inferred types from the package root

#### Scenario: Response contract mirrors the HTTP response
- **WHEN** `ArtistBioResponseSchema` parses a backend response
- **THEN** it SHALL validate all artist-bio response identifiers, status, generated/publication fields, retry metadata, and timestamps
- **AND** it SHALL accept nullable fields only where the HTTP response can emit `null`

#### Scenario: Shared package is built before web use
- **WHEN** the web app builds or runs tests that import artist-bio contracts
- **THEN** the root workflow SHALL build `@ticketbox/api-types` first and resolve the package through its compiled root output

### Requirement: Stable artist-bio HTTP error semantics
The artist-bio HTTP adapter SHALL return expected artist-bio failures as a JSON envelope containing `statusCode`, `code`, and `message`. The web client SHALL preserve those fields in a typed error for feature-level handling.

#### Scenario: Invalid press kit returns a stable code
- **WHEN** the artist-bio upload is rejected because the filename, MIME type, content, signature, or size is invalid
- **THEN** the API SHALL return HTTP 400 with code `INVALID_PRESS_KIT`

#### Scenario: Invalid workflow transition returns a stable code
- **WHEN** retry, publish, or reject is attempted from an invalid artist-bio status
- **THEN** the API SHALL return HTTP 409 with code `ARTIST_BIO_STATUS_TRANSITION`

#### Scenario: Missing job is distinct from missing concert
- **WHEN** an authorized manager fetches an existing concert that has no artist-bio record
- **THEN** the API SHALL return HTTP 404 with code `ARTIST_BIO_NOT_FOUND`
- **AND WHEN** the concert itself does not exist
- **THEN** the API SHALL return HTTP 404 with code `CONCERT_NOT_FOUND`

### Requirement: Role-aware artist-bio API client
The web app SHALL provide a role-explicit artist-bio client exposing upload, fetch, retry, publish, and reject operations. The client SHALL validate successful responses with `ArtistBioResponseSchema` and SHALL not read React context directly.

#### Scenario: Organizer invokes artist-bio operations
- **WHEN** an organizer invokes an artist-bio operation for a concert they manage
- **THEN** the client SHALL use `/organizer/concerts/:concertId/artist-bio` and its matching action path

#### Scenario: Admin invokes artist-bio operations
- **WHEN** an admin invokes an artist-bio operation
- **THEN** the client SHALL use `/admin/concerts/:concertId/artist-bio` and its matching action path

#### Scenario: Missing artist-bio job becomes an empty result
- **WHEN** the client receives HTTP 404 with code `ARTIST_BIO_NOT_FOUND` from the artist-bio GET operation
- **THEN** it SHALL return a no-job result
- **AND WHEN** it receives another error or 404 code
- **THEN** it SHALL preserve the error for the caller

### Requirement: Active artist-bio jobs are polled
The web app SHALL use a session- and role-scoped TanStack Query key for an artist-bio record and SHALL poll every 5 seconds only while the durable record is queued or processing.

#### Scenario: Queued or processing job is polled
- **WHEN** the artist-bio query returns status `DRAFT` or `PROCESSING`
- **THEN** the hook SHALL refetch every 5 seconds

#### Scenario: Polling stops after processing
- **WHEN** the status changes to `READY_FOR_REVIEW`, `PUBLISHED`, `FAILED`, or `REJECTED`
- **THEN** the hook SHALL stop interval refetching
- **AND** it SHALL not refetch at an interval while the browser tab is in the background

### Requirement: Concert-management artist-bio panel
The web app SHALL render a Vietnamese “Tiểu sử nghệ sĩ (AI)” panel in organizer and admin concert management for the selected concert. The panel SHALL render controls and content according to the durable artist-bio status.

#### Scenario: No job or rejected job
- **WHEN** no artist-bio record exists or the record status is `REJECTED`
- **THEN** the panel SHALL show a PDF press-kit upload/recreate action

#### Scenario: Active job is queued or processing
- **WHEN** the record status is `DRAFT`
- **THEN** the panel SHALL show “Đang xếp hàng tạo tiểu sử…” without duplicate actions
- **AND WHEN** the record status is `PROCESSING`
- **THEN** the panel SHALL show a spinner and “Đang tạo tiểu sử…”

#### Scenario: Bio is ready for review
- **WHEN** the record status is `READY_FOR_REVIEW`
- **THEN** the panel SHALL preview `generatedBio` and show “Duyệt & công khai” and “Từ chối” actions

#### Scenario: Bio is published
- **WHEN** the record status is `PUBLISHED`
- **THEN** the panel SHALL show `publishedBio`, a badge labeled “Đã công khai”, and an action to upload a new press kit

#### Scenario: Job failed
- **WHEN** the record status is `FAILED`
- **THEN** the panel SHALL show `errorMessage`, retry count, maximum attempts, and `nextRetryAt` when available
- **AND** it SHALL enable retry only when attempts remain and `nextRetryAt` has passed or is absent

### Requirement: Client-side PDF validation and localized artist-bio errors
The web app SHALL validate a press-kit file before encoding or sending it. It SHALL map known artist-bio API failures to safe Vietnamese messages without exposing raw server details as the primary UI copy.

#### Scenario: Invalid PDF is rejected locally
- **WHEN** a selected file is not a `.pdf`, has the wrong MIME type, is empty, lacks the `%PDF-` signature, or exceeds 5 MiB
- **THEN** the client SHALL reject it without making an API request and SHALL display a Vietnamese invalid-file message

#### Scenario: Known API failures are mapped
- **WHEN** the API returns `INVALID_PRESS_KIT`, `ARTIST_BIO_STATUS_TRANSITION`, or HTTP 403
- **THEN** the panel SHALL display the corresponding safe Vietnamese validation, transition, or permission message

### Requirement: Artist-bio verification
The implementation SHALL include automated tests for shared contracts, backend error mapping and PDF extraction, web error transport, PDF validation, all artist-bio API operations, active-state polling, and every artist-bio panel state.

#### Scenario: Client, hook, and component tests cover workflow boundaries
- **WHEN** the artist-bio test suites run
- **THEN** they SHALL verify role-specific endpoints, base64 upload payloads, response parsing, coded no-job normalization, session-scoped keys, active polling, polling stop conditions, localized errors, retry availability, and the complete panel state matrix

#### Scenario: Backend tests guard PDF extraction quality
- **WHEN** artist-bio backend tests run
- **THEN** they SHALL use a text-based compressed PDF fixture and verify extracted narrative text excludes metadata and encoded stream fragments
- **AND** they SHALL verify malformed or textless PDFs fail without generating a bio

### Requirement: AI bio provider selection
The system SHALL generate artist bios through `AiBioGeneratorPort` and SHALL support both a GeminiAI-compatible adapter and a deterministic local fallback.

#### Scenario: Gemini provider is used when configured
- **WHEN** the AI provider mode and credentials are configured for Gemini-compatible generation
- **THEN** the worker SHALL call the Gemini-compatible adapter through `AiBioGeneratorPort` and persist the provider name with the generated result

#### Scenario: Deterministic fallback is used without credentials
- **WHEN** no external AI credentials are configured for local development, tests, or grading
- **THEN** the worker SHALL use the deterministic local fallback through `AiBioGeneratorPort` and produce stable output without making a network call

#### Scenario: AI provider failure does not publish a bio
- **WHEN** the configured AI adapter fails while generating a bio
- **THEN** the system SHALL mark the job as failed and SHALL NOT publish any generated or partial bio to the public concert detail

### Requirement: Organizer review and publication
The system SHALL require organizer review before a generated artist bio becomes public.

#### Scenario: Generated bio becomes ready for review
- **WHEN** PDF extraction and AI generation succeed
- **THEN** the system SHALL persist the generated bio and mark the artist bio record as ready for organizer review

#### Scenario: Organizer approves generated bio
- **WHEN** an organizer approves a ready-for-review generated bio for a concert they own
- **THEN** the system SHALL mark the bio as published, persist the public bio text, reviewer, and publication timestamp

#### Scenario: Organizer rejects generated bio
- **WHEN** an organizer rejects a ready-for-review generated bio for a concert they own
- **THEN** the system SHALL mark the bio as rejected, keeping it for historical record without publishing it

#### Scenario: Organizer cannot approve another organizer's bio
- **WHEN** an organizer attempts to approve an artist bio for a concert they do not own
- **THEN** the system SHALL reject the action and SHALL NOT publish the bio

#### Scenario: Failed bio cannot be published
- **WHEN** an organizer attempts to publish a failed or processing artist bio job
- **THEN** the system SHALL reject the action with a status transition error
